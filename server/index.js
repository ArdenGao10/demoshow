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

const SYSTEM = `你是「Demi」——一个替用户做演示讲解的 AI 助手。
你会收到一份演示文稿，逐页给出标题与正文文字。请为每一页写一句自然口语化的中文讲解词（口播稿），要求：
- 像真人站在台上讲话，不要念稿、不要书面腔；
- 每页 1~2 句，简洁顺口，承上启下；
- 紧扣该页内容，不要编造数据；
- 第一页要先用第一人称做个简短开场（用给定的讲解人名字自我介绍）；
- 严格按给定语气风格。
只输出 JSON，格式：{"scripts":[{"page":<页码数字,从1开始>,"line":"<这一页的讲解词>"}, ...]}，不要输出任何额外文字。`;

function buildUserPrompt({ presenterName, tone, slides }) {
  const toneMap = {
    轻松亲切: "轻松、亲切、像朋友聊天，可适度活泼",
    专业稳重: "专业、稳重、有条理，适合正式汇报",
    元气满满: "活力满满、热情、有感染力",
  };
  const toneDesc = toneMap[tone] || tone || "轻松亲切";
  const pages = slides
    .map(
      (s, i) =>
        `【第 ${i + 1} 页】标题：${s.title || "(无标题)"}\n内容：${(s.text || "(无文字)").slice(0, 800)}`
    )
    .join("\n\n");
  return `讲解人名字：${presenterName || "Demi"}
语气风格：${toneDesc}
共 ${slides.length} 页，逐页内容如下：

${pages}

请为全部 ${slides.length} 页各写一句讲解词，按页码顺序输出 JSON。`;
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

    const resp = await fetch(GLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserPrompt({ presenterName, tone, slides }) },
        ],
      }),
    });

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

function localDemoScripts({ presenterName, tone, slides }) {
  const mood = tone === "专业稳重" ? "我们来看" : tone === "元气满满" ? "一起看看" : "来看看";
  return slides.map((slide, index) => {
    const title = String(slide.title || `第 ${index + 1} 页`).trim();
    const text = String(slide.text || "").replace(/\s+/g, " ").trim();
    const detail = text && text !== title ? `，重点是${text.slice(0, 62)}` : "";
    const lead = index === 0 ? `大家好，我是${presenterName || "Demi"}。今天由我来为你讲解这份演示，先从「${title}」开始。` : `${mood}「${title}」${detail}。`;
    return { page: index + 1, line: lead };
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
