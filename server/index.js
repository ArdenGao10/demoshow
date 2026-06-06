// server/index.js — tiny Express proxy for 智谱 GLM.
// Keeps ZHIPU_API_KEY server-side; the browser only ever talks to /api/generate.
import express from "express";
import dotenv from "dotenv";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const PORT = process.env.PORT || 8787;
const MODEL = process.env.GLM_MODEL || "glm-4-flash";
const API_KEY = process.env.ZHIPU_API_KEY;
const GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "data", "users.json");
const TOKEN_SECRET = process.env.TOKEN_SECRET || "demi-local-dev-secret";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const name = String(req.body?.name || "").trim() || email.split("@")[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "请输入有效邮箱" });
  if (password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });
  const users = await readUsers();
  if (users.some((u) => u.email === email)) return res.status(409).json({ error: "该邮箱已注册" });
  const salt = crypto.randomBytes(16).toString("hex");
  const user = { id: crypto.randomUUID(), email, name, salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString() };
  users.push(user);
  await writeUsers(users);
  res.status(201).json(authResponse(user));
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const users = await readUsers();
  const user = users.find((u) => u.email === email);
  if (!user || hashPassword(password, user.salt) !== user.passwordHash) return res.status(401).json({ error: "邮箱或密码不正确" });
  res.json(authResponse(user));
});

app.get("/api/auth/me", async (req, res) => {
  const payload = verifyToken(String(req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  if (!payload) return res.status(401).json({ error: "登录已过期" });
  const user = (await readUsers()).find((u) => u.id === payload.id);
  if (!user) return res.status(401).json({ error: "账号不存在" });
  res.json({ user: publicUser(user) });
});

function buildSystem(presenterName) {
  const name = presenterName || "Demi";
  return `你是「${name}」——站在台上为观众讲解这份演示的真人讲者，不是念稿的机器。
你会拿到这份演示的整体大纲，以及当前要讲的若干页（含标题与正文）。请为每一页写出"开口讲出来"的中文口播词。

讲解要求：
- 口语、自然，像真人对着观众说话；多用短句，可用"我们""你看""其实""所以""那"这类口头衔接；
- 不要复述标题原文、也不要把正文逐字念出来——用你自己的话把这页的重点讲清楚、讲生动；
- 每页 1~3 句，长短随内容：信息密的页讲细一点，过渡页一句带过；
- 页与页之间要自然承接（上一页的结尾顺势引到这一页），但别生硬地说"下面这一页""请看下一页"；
- 严格紧扣给定内容，绝不编造数据、产品名、结论；正文里没有的别瞎说；
- 第一页：用第一人称做一句温暖、有钩子的开场，并用名字自我介绍；最后一页：做一句收束或号召，给观众留个印象；
- 严格贴合给定的语气风格。

只输出 JSON：{"scripts":[{"page":数字(从1开始),"line":"讲解词"}, ...]}，不要任何多余文字，不要 markdown 代码块。`;
}

function buildUserPrompt({ presenterName, tone, slides }) {
  const toneMap = {
    轻松亲切: "轻松、亲切、像朋友聊天，可适度活泼，多一点温度",
    专业稳重: "专业、稳重、有条理，用词克制，适合正式汇报",
    元气满满: "活力满满、热情、有感染力，节奏明快",
  };
  const toneDesc = toneMap[tone] || tone || "轻松亲切";
  // A short outline up top gives the model the whole arc, so transitions and the
  // opening/closing read coherently instead of page-by-page in isolation.
  const outline = slides
    .map((s, i) => `${i + 1}. ${(s.title || "(无标题)").slice(0, 40)}`)
    .join("\n");
  const pages = slides
    .map(
      (s, i) =>
        `【第 ${i + 1} 页 / 共 ${slides.length} 页】\n标题：${s.title || "(无标题)"}\n正文：${(s.text || "(无文字)").slice(0, 900)}`
    )
    .join("\n\n");
  return `讲解人名字：${presenterName || "Demi"}
语气风格：${toneDesc}

【整份演示大纲】
${outline}

【逐页内容】
${pages}

请按这条线索，为全部 ${slides.length} 页各写讲解词；注意第 1 页开场、第 ${slides.length} 页收束、页间自然承接。按页码顺序输出 JSON。`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: !!API_KEY, model: MODEL });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { presenterName, tone, slides } = req.body || {};
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: "缺少 slides" });
    }
    if (!API_KEY) {
      return res.json({
        scripts: localDemoScripts({ presenterName, tone, slides }),
        model: "local-demo",
        warning: "未配置 ZHIPU_API_KEY，已使用本地演示讲稿。",
      });
    }

    // Abort if GLM hangs — never leave the user stuck on the loading screen.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GLM_TIMEOUT_MS) || 30000);
    let resp;
    try {
      resp = await fetch(GLM_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.8,
          top_p: 0.9,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystem(presenterName) },
            { role: "user", content: buildUserPrompt({ presenterName, tone, slides }) },
          ],
        }),
      });
    } catch (e) {
      const msg = e?.name === "AbortError" ? "GLM 调用超时，请重试" : `GLM 网络错误：${e.message}`;
      return res.status(504).json({ error: msg });
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: `GLM 调用失败 (${resp.status})`, detail });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const scripts = parseScripts(content, slides.length);
    return res.json({ scripts, model: MODEL });
  } catch (err) {
    console.error("[/api/generate]", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// GLM usually returns clean JSON, but be defensive about code fences / stray text.
function parseScripts(content, count) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  let arr = Array.isArray(parsed) ? parsed : parsed.scripts || parsed.pages || [];
  const byPage = new Map();
  for (const it of arr) {
    const page = Number(it.page ?? it.index ?? 0);
    const line = String(it.line ?? it.text ?? it.script ?? "").trim();
    if (line) byPage.set(page, line);
  }
  // normalise to one line per page in order
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push({ page: i, line: byPage.get(i) || arr[i - 1]?.line || "" });
  }
  return out;
}

// Local fallback used when no ZHIPU_API_KEY is set. Kept deliberately varied and
// spoken — not "来看看「标题」，重点是…" on every page — so the demo still feels
// like a person talking even without the model.
function localDemoScripts({ presenterName, tone, slides }) {
  const name = presenterName || "Demi";
  const total = slides.length;
  // tone-flavored connectors for the middle pages (cycled, not repeated verbatim)
  const conn = {
    专业稳重: ["我们先看", "接着看", "这里要说的是", "值得注意的是", "再往下"],
    元气满满: ["来看这页", "重点来啦", "你看", "这点特别赞", "接着冲"],
  }[tone] || ["来看看", "接着", "这一页想说的是", "顺带说一句", "再看这里"];

  const gistOf = (slide, title) => {
    const text = String(slide.text || "").replace(/\s+/g, " ").trim();
    if (!text || text === title) return "";
    // Prefer the first whole sentence when it's short enough; otherwise take a
    // ~46-char slice and back off to the last comma so we don't cut mid-phrase.
    const firstSentence = text.split(/(?<=[。！？!?])/)[0] || text;
    let g = firstSentence.length <= 58 ? firstSentence : text.slice(0, 46);
    if (g.length >= 44) {
      const k = Math.max(g.lastIndexOf("，"), g.lastIndexOf("、"), g.lastIndexOf(","));
      if (k > 22) g = g.slice(0, k);
    }
    return g.replace(/[，,。.!！?？；;、\s]+$/, "");
  };

  return slides.map((slide, i) => {
    const title = String(slide.title || `第 ${i + 1} 页`).trim();
    const gist = gistOf(slide, title);
    let line;
    if (i === 0) {
      line = `大家好，我是${name}，这份演示就由我来陪你讲。我们先从「${title}」说起${gist ? `——${gist}` : ""}。`;
    } else if (i === total - 1) {
      const close = tone === "元气满满" ? "就讲到这儿，谢谢你看到这里！" : tone === "专业稳重" ? "以上就是全部内容，谢谢。" : "好，这次就分享到这里，谢谢你的时间。";
      line = `最后这页，${gist || `说说「${title}」`}。${close}`;
    } else {
      const c = conn[Math.min(i, conn.length - 1)];
      line = gist ? `${c}「${title}」——${gist}。` : `${c}「${title}」这一块。`;
    }
    return { page: i + 1, line };
  });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}
function authResponse(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, exp: Date.now() + 7 * 864e5 })).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return { user: publicUser(user), token: `${payload}.${sig}` };
}
function verifyToken(token) {
  try {
    const [payload, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
async function readUsers() {
  try { return JSON.parse(await fs.readFile(USERS_FILE, "utf8")); } catch { return []; }
}
async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

app.listen(PORT, () => {
  console.log(`[demi] GLM proxy on http://localhost:${PORT}  model=${MODEL}  key=${API_KEY ? "✓" : "✗ (set ZHIPU_API_KEY in .env)"}`);
});
