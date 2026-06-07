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
const TTS_URL = "https://open.bigmodel.cn/api/paas/v4/audio/speech";
const TTS_MODEL = process.env.ZHIPU_TTS_MODEL || "cogtts";
const TTS_VOICE = process.env.ZHIPU_TTS_VOICE || "tongtong";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "data", "users.json");
const TOKEN_SECRET = process.env.TOKEN_SECRET || "demi-local-dev-secret";

const app = express();
app.use(express.json({ limit: "4mb" }));

// Widget 部署在用户自己的域名(比如 ardencosmic.com),要从那边跨域调 /api/generate-tour。
// 只对这个端点开放跨域,其他 /api 路径保持同源。
app.use((req, res, next) => {
  // widget 嵌在用户自己的域名(比如 ardencosmic.com)里,需要跨域调这几个端点
  if (req.path === "/api/generate-tour" || req.path === "/api/plan-tour"
      || req.path === "/api/agent-step" || req.path === "/api/tts") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
  }
  next();
});

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
- 每页 2~4 句、约 60~120 字（信息多的页可到 5 句），要把这页讲透，别用一句空话糊过去；
- 关键：先点出这页的核心词/要点（一两个关键概念），再展开说清楚"它是什么、为什么重要、对观众意味着什么"，让观众听完真的明白这页在讲什么；
- 若这页有多个要点（如列了 1)2)3)、多条特性/数据/步骤、多个名词概念），必须把它们逐个点名讲出来——例如"三大能力分别是 A、B、C"，再各补一句；绝不允许只说"它有三大能力""有几个特点"却不展开是哪几个；
- 反例（禁止这样写）："Demi 有什么厉害的地方呢？它主要有三大能力，听我慢慢道来。"——这是空话，没有把核心词讲出来；
- 页与页之间要自然承接（上一页的结尾顺势引到这一页），但别生硬地说"下面这一页""请看下一页"；
- 严格紧扣给定内容，绝不编造数据、产品名、结论；正文里没有的别瞎说；
- 第一页：用第一人称做一句温暖、有钩子的开场，并用名字自我介绍，再进入正题；最后一页：做一句收束或号召，给观众留个印象；
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
  res.json({ ok: true, hasKey: !!API_KEY, model: MODEL, ttsModel: TTS_MODEL, ttsVoice: TTS_VOICE });
});

// 文本转语音：调用智谱 cogtts，返回 wav 音频字节。
// 任何失败都用明确的状态码告诉前端，前端会自动回退到浏览器语音，绝不卡住播放。
app.post("/api/tts", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const voice = String(req.body?.voice || "").trim() || TTS_VOICE;
    if (!text) return res.status(400).json({ error: "缺少 text" });
    if (!API_KEY) return res.status(503).json({ error: "未配置 ZHIPU_API_KEY" });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.TTS_TIMEOUT_MS) || 30000);
    let resp;
    try {
      resp = await fetch(TTS_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        // cogtts 单次输入有长度上限；讲稿一句话足够，仍做个保险截断。
        body: JSON.stringify({ model: TTS_MODEL, input: text.slice(0, 1000), voice, response_format: "wav" }),
      });
    } catch (e) {
      const msg = e?.name === "AbortError" ? "语音合成超时" : `语音合成网络错误：${e.message}`;
      return res.status(504).json({ error: msg });
    } finally {
      clearTimeout(timer);
    }

    const ct = resp.headers.get("content-type") || "";
    // 出错时智谱返回 JSON（如余额不足 1113）；把它原样透出，便于前端提示+回退。
    if (!resp.ok || ct.includes("application/json")) {
      let detail = "";
      try { detail = await resp.text(); } catch { /* ignore */ }
      let msg = `语音合成失败 (${resp.status})`;
      try { msg = JSON.parse(detail)?.error?.message || msg; } catch { /* ignore */ }
      // 余额/限流用 402，方便前端区分“需要充值”这种可恢复情况。
      return res.status(resp.status === 429 ? 402 : 502).json({ error: msg, detail });
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    // cogtts 会在语音前固定加约 2 秒的“嘟嘟”导入音 + 句尾留白；裁掉它们，
    // 既消除杂音，也缩短页间停顿。解析失败时回退原始音频，绝不影响可用性。
    const trimmed = trimSilenceAndTone(buf);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    return res.send(trimmed);
  } catch (err) {
    console.error("[/api/tts]", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// 裁掉 16-bit PCM WAV 头部的导入音/静音与尾部静音，只保留真正的语音。
// 任何不符合预期的情况都直接返回原始 buffer（安全兜底）。
function trimSilenceAndTone(buf) {
  try {
    if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return buf;
    let off = 12, fmt = null, dataOff = -1, dataLen = 0;
    while (off + 8 <= buf.length) {
      const id = buf.toString("ascii", off, off + 4);
      const sz = buf.readUInt32LE(off + 4);
      if (id === "fmt ") {
        fmt = { channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
      } else if (id === "data") {
        dataOff = off + 8; dataLen = Math.min(sz, buf.length - dataOff); break;
      }
      off += 8 + sz + (sz & 1);
    }
    if (!fmt || dataOff < 0 || fmt.bits !== 16) return buf;
    const { channels, sampleRate } = fmt;
    const bytesPerFrame = 2 * channels;
    const frames = Math.floor(dataLen / bytesPerFrame);
    if (frames < sampleRate) return buf; // 太短就不动

    const win = Math.floor(sampleRate * 0.05); // 50ms 窗
    const rmsAt = (f) => {
      let s = 0, c = 0;
      for (let j = f; j < Math.min(f + win, frames); j++) { const v = buf.readInt16LE(dataOff + j * bytesPerFrame); s += v * v; c++; }
      return c ? Math.sqrt(s / c) / 32768 : 0;
    };
    let peak = 0;
    for (let f = 0; f + win < frames; f += win) peak = Math.max(peak, rmsAt(f));
    if (peak < 0.06) return buf; // 整体过轻，别误裁

    // 起点：第一处“持续 100ms 高于阈值”的窗（导入音 560Hz 能量低，会被排除）。
    const thr = Math.max(0.05, 0.18 * peak);
    let startF = 0;
    for (let f = 0; f + win * 2 < frames; f += win) {
      if (rmsAt(f) > thr && rmsAt(f + win) > thr) { startF = f; break; }
    }
    // 终点：最后一处高于较低阈值的窗 + 120ms 余白。
    const tailThr = Math.max(0.02, 0.08 * peak);
    let endF = frames;
    for (let f = frames - win; f > startF; f -= win) {
      if (rmsAt(f) > tailThr) { endF = Math.min(frames, f + win + Math.floor(sampleRate * 0.12)); break; }
    }
    // 起点回退 60ms 护一下首字辅音。
    startF = Math.max(0, startF - Math.floor(sampleRate * 0.06));
    // 没什么可裁就别动（避免无意义重打包）。
    if (startF < sampleRate * 0.2 && endF > frames - sampleRate * 0.2) return buf;
    if (endF <= startF) return buf;

    const pcm = buf.subarray(dataOff + startF * bytesPerFrame, dataOff + endF * bytesPerFrame);
    return buildWav(pcm, sampleRate, channels, 16);
  } catch {
    return buf;
  }
}

function buildWav(pcm, sampleRate, channels, bits) {
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

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
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GLM_TIMEOUT_MS) || 45000);
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
          temperature: 0.6, // 调低一点，讲稿更贴正文、把要点讲全，少跑题/少空话
          top_p: 0.9,
          max_tokens: 4096, // 讲稿变长后，给足额度避免被截断（尤其多页 deck）
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

// 给嵌入网站的导览自动写讲解词。
// 输入:每一站点的 selector + 元素本身的文字内容 + 角色(button/heading/...)
// 输出:每一站一句口语化的讲解词
function buildTourSystem(name) {
  return `你是「${name || "Demi"}」——一个温暖、不端着的真人讲解员。
观众正在浏览一个网页;你会拿到这一趟导览的所有站点,每一站告诉你它在页面上的角色(标题/按钮/卡片...)和它实际显示的文字。
请为每一站写一句"开口讲出来"的中文口播词。

要求:
- 一站一句,12~40 字最佳;避免书面长句,口语化、自然
- 第一站是开场,用名字简短自我介绍,温暖一点
- 中间几站点出"这是什么、有什么用",但不要逐字复述按钮/卡片上的原文
- 最后一站是收束,给一个鼓励或行动号召
- 整段读下来要顺,前后能衔接,但不要说"下面这一站""请看下一项"这种生硬话
- 不要编造没出现过的功能/数据,只能用我给你的内容

只输出 JSON:{"lines":["第一句","第二句",...]} ,长度严格等于站点数,不要多余文字,不要 markdown 代码块。`;
}

function buildTourUserPrompt({ name, tone, stops }) {
  const toneDesc = ({
    轻松亲切: "轻松、亲切、像朋友介绍",
    专业稳重: "专业、稳重,用词克制",
    元气满满: "活力满满、热情、有感染力",
  })[tone] || tone || "轻松亲切";
  const listing = stops.map((s, i) =>
    `【第 ${i + 1} 站 / 共 ${stops.length} 站】
角色:${s.role || "未知"}
显示文字:${(s.text || "(无)").slice(0, 240)}`
  ).join("\n\n");
  return `讲解人名字:${name || "Demi"}
语气风格:${toneDesc}

【站点清单(按访问顺序)】
${listing}

请为 ${stops.length} 站各写一句,按顺序输出 JSON。`;
}

app.post("/api/generate-tour", async (req, res) => {
  try {
    const { name, tone, stops } = req.body || {};
    if (!Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ error: "缺少 stops" });
    }
    if (stops.length > 20) {
      return res.status(400).json({ error: "stops 数量过多(上限 20)" });
    }
    if (!API_KEY) {
      // 没配 key 也得让用户看到东西,回退到一个本地占位讲稿
      const lines = stops.map((s, i) => {
        const txt = String(s.text || "").trim();
        if (i === 0) return `大家好,我是 ${name || "Demi"},先看这里:${txt.slice(0, 16) || "我们的开场"}。`;
        if (i === stops.length - 1) return `最后看看${txt.slice(0, 14) || "这块"}——欢迎来逛一逛!`;
        return `这块是${txt.slice(0, 18) || "我们的亮点"},简单看一下。`;
      });
      return res.json({ lines, model: "local-demo", warning: "未配置 ZHIPU_API_KEY,使用本地占位讲稿。" });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GLM_TIMEOUT_MS) || 45000);
    let resp;
    try {
      resp = await fetch(GLM_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildTourSystem(name) },
            { role: "user", content: buildTourUserPrompt({ name, tone, stops }) },
          ],
        }),
      });
    } catch (e) {
      const msg = e?.name === "AbortError" ? "GLM 调用超时,请重试" : `GLM 网络错误:${e.message}`;
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
    const lines = parseTourLines(content, stops.length);
    return res.json({ lines, model: MODEL });
  } catch (err) {
    console.error("[/api/generate-tour]", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

function parseTourLines(content, count) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  let arr = Array.isArray(parsed) ? parsed : parsed.lines || parsed.scripts || parsed.pages || [];
  const out = arr
    .map(it => String(it?.line ?? it?.text ?? (typeof it === "string" ? it : "")).trim())
    .filter(Boolean)
    .slice(0, count);
  while (out.length < count) out.push("");
  return out;
}

// AI 自动玩一遍游戏:看一眼初始页面,一次性规划整条导览路径。
function buildPlannerSystem(name) {
  return `你是「${name || "Demi"}」,一个温暖的真人讲解员,正在替访客**自动玩**一个网页。
我会把当前页面上所有能交互的元素(按钮/链接/卡片/标题)给你,请你从里面挑 4~6 个,规划一趟有故事感的导览。

每一站告诉我:走到哪个元素(selector 原样回传)、说什么(line,一句话 14~30 字,口语化)、要不要点它(action: "click" 表示讲完帮访客点一下,这样能切换到下一个场景;省略 action 表示只指着讲)。

规则:
- 第 1 站是开场:用名字简短自我介绍,点出这是什么产品/游戏
- 中间挑首屏标题、主 CTA、特色卡片、入口按钮里**最值得展示**的
- 至少 1 站设 action:"click"——好让导览能进入第二个场景(比如点了"开始"或"出门"会出现新画面)
- 最后一站是收束、号召
- 每站都要紧扣那个元素显示的真实文字,不要瞎编功能
- selector 严格使用我给你的那个字符串原样,不修改

只输出 JSON:{"steps":[{"selector":"...","line":"...","action":"click"}, ...]}
不要 markdown,不要多余文字。`;
}
function buildPlannerUser({ name, tone, pageTitle, visible }) {
  const toneDesc = ({ 轻松亲切: "轻松、亲切", 专业稳重: "专业、稳重", 元气满满: "活力满满、有感染力" })[tone] || "轻松亲切";
  const list = visible.map((v, i) =>
    `${i + 1}. [${v.role || v.tag}] "${String(v.text || "").slice(0, 80)}"  →  ${v.selector}`
  ).join("\n");
  return `讲解人:${name || "Demi"}
语气:${toneDesc}
页面标题:${pageTitle || "(无)"}

【页面上能交互的元素清单】
${list}

请挑 4~6 个,规划这一趟自动导览。`;
}

app.post("/api/plan-tour", async (req, res) => {
  try {
    const { name, tone, pageTitle, visible } = req.body || {};
    if (!Array.isArray(visible) || !visible.length) {
      return res.status(400).json({ error: "缺少 visible 元素清单" });
    }
    if (!API_KEY) {
      // 降级:取前 4 个
      const picked = visible.slice(0, 4);
      return res.json({
        steps: picked.map((v, i) => ({
          selector: v.selector,
          line: i === 0 ? `大家好,我是 ${name || "Demi"},先逛一逛。` : `这里是${(v.text || "亮点").slice(0, 18)}。`,
        })),
        model: "local-demo",
        warning: "未配置 ZHIPU_API_KEY,使用本地占位规划。",
      });
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GLM_TIMEOUT_MS) || 45000);
    let resp;
    try {
      resp = await fetch(GLM_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildPlannerSystem(name) },
            { role: "user", content: buildPlannerUser({ name, tone, pageTitle, visible }) },
          ],
        }),
      });
    } catch (e) {
      const msg = e?.name === "AbortError" ? "GLM 调用超时" : `GLM 网络错误:${e.message}`;
      return res.status(504).json({ error: msg });
    } finally { clearTimeout(timer); }
    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: `GLM 调用失败 (${resp.status})`, detail });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const steps = parsePlannedSteps(content, visible);
    return res.json({ steps, model: MODEL });
  } catch (err) {
    console.error("[/api/plan-tour]", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// 真·agent loop:每一轮 GLM 看当前画面 + 已经做过的事,只决定下一动作。
// 让 Demi 在用户点击了某个按钮、新场景出现以后,真的能"再讲一段"。
function buildAgentSystem(name) {
  return `你是「${name || "Demi"}」,一个温暖的真人讲解员,正在**带访客自动逛**一个网页。
访客没法自己操作,所有动作都靠你。每一轮我会告诉你:
- history:你已经讲过的每一句、点过的每个元素
- visible:当前画面上能交互的所有元素(每点一次画面会切换,visible 也会换)

你的任务:看着 history 和 visible,只决定**下一个动作**。

动作选项:
- "narrate":走到某个元素旁边,讲一句(不点击)
- "click":走到某个元素,讲一句,然后让我替访客点它,下一轮就会是新画面
- "done":已经讲透了,说一句收束话,结束导览

规则:
- 每句 line 14~32 字,口语化、自然衔接,不要复述按钮原文
- history 里出现过的 selector 不要再选(除非确实有必要再回去)
- 想进新场景就用 click;停留在当前画面就 narrate
- 第一轮通常是 narrate 首屏标题/横幅,做开场+自我介绍
- 至少要有 1 次 click,带访客进入新场景
- 5 轮以后开始考虑 done;最多 8 轮必须 done
- selector 必须从 visible 清单里原样选,不能自己编

只输出 JSON:{"action":"narrate|click|done","selector":"...","line":"..."}
done 不需要 selector。`;
}
function buildAgentUser({ name, tone, pageTitle, history, visible }) {
  const toneDesc = ({ 轻松亲切: "轻松、亲切", 专业稳重: "专业、稳重", 元气满满: "活力满满、有感染力" })[tone] || "轻松亲切";
  const hist = history.length
    ? history.map((h, i) => `${i + 1}. [${h.action}] ${h.selector || "-"}  「${(h.line || "").slice(0, 60)}」`).join("\n")
    : "(还没开始,这是第 1 轮)";
  const list = visible.map((v, i) =>
    `${i + 1}. [${v.role || v.tag}] "${String(v.text || "").slice(0, 80)}"  →  ${v.selector}`
  ).join("\n");
  return `讲解人:${name || "Demi"}
语气:${toneDesc}
页面标题:${pageTitle || "(无)"}

【你已经做过的事(history)】
${hist}

【当前画面能交互的元素(visible)】
${list}

请决定下一步。`;
}

app.post("/api/agent-step", async (req, res) => {
  try {
    const { name, tone, pageTitle, history, visible } = req.body || {};
    if (!Array.isArray(visible) || !visible.length) {
      return res.status(400).json({ error: "缺少 visible 元素清单" });
    }
    const hist = Array.isArray(history) ? history.slice(-10) : [];
    if (!API_KEY) {
      // 降级:看看 history 长度,前两轮挑没出现过的就 narrate,第 3 轮 click 第一个 button,第 4 轮 done
      const used = new Set(hist.map(h => h.selector).filter(Boolean));
      const fresh = visible.filter(v => !used.has(v.selector));
      if (hist.length >= 4 || !fresh.length) {
        return res.json({ action: "done", line: "今天就逛到这,欢迎自己上手玩一会!", model: "local-demo" });
      }
      const pick = fresh[0];
      const isClickable = pick.tag === "button" || pick.tag === "a" || pick.role === "按钮";
      return res.json({
        action: hist.length === 2 && isClickable ? "click" : "narrate",
        selector: pick.selector,
        line: hist.length === 0
          ? `大家好,我是 ${name || "Demi"},先看这块——${(pick.text || "").slice(0, 16)}。`
          : `这块是${(pick.text || "亮点").slice(0, 18)},很有意思。`,
        model: "local-demo",
        warning: "未配置 ZHIPU_API_KEY,使用本地占位决策。",
      });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GLM_TIMEOUT_MS) || 30000);
    let resp;
    try {
      resp = await fetch(GLM_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          top_p: 0.9,
          max_tokens: 400,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildAgentSystem(name) },
            { role: "user", content: buildAgentUser({ name, tone, pageTitle, history: hist, visible }) },
          ],
        }),
      });
    } catch (e) {
      const msg = e?.name === "AbortError" ? "GLM 调用超时" : `GLM 网络错误:${e.message}`;
      return res.status(504).json({ error: msg });
    } finally { clearTimeout(timer); }
    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: `GLM 调用失败 (${resp.status})`, detail });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const step = parseAgentStep(content, visible);
    return res.json({ ...step, model: MODEL });
  } catch (err) {
    console.error("[/api/agent-step]", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

function parseAgentStep(content, visible) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }
  const action = String(parsed?.action || "").toLowerCase();
  const line = String(parsed?.line || parsed?.text || "").trim();
  if (action === "done") return { action: "done", line: line || "今天就讲到这,欢迎自己上手玩一会!" };
  const selector = String(parsed?.selector || "").trim();
  const valid = new Set(visible.map(v => v.selector));
  // 防 AI 编造 selector
  if (!valid.has(selector)) {
    // 退而求其次:挑 visible 里第一个没在 history 里的(这里没 history,所以挑第 1 个)
    if (!visible.length) return { action: "done", line: line || "看完啦!" };
    return { action: action === "click" ? "click" : "narrate", selector: visible[0].selector, line: line || "这块挺有意思,简单看一下。" };
  }
  return {
    action: action === "click" ? "click" : "narrate",
    selector,
    line: line || "这块挺有意思,简单看一下。",
  };
}

function parsePlannedSteps(content, visible) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }
  const arr = Array.isArray(parsed) ? parsed : parsed.steps || parsed.scripts || [];
  const validSelectors = new Set(visible.map(v => v.selector));
  const out = [];
  for (const it of arr) {
    const selector = String(it?.selector || "").trim();
    const line = String(it?.line || it?.text || "").trim();
    if (!selector || !line) continue;
    if (!validSelectors.has(selector)) continue; // 防止 AI 编造 selector
    const step = { selector, line };
    if (it?.action === "click") step.action = "click";
    out.push(step);
    if (out.length >= 8) break;
  }
  return out;
}

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
  // Trust the page field only when it's a valid, non-duplicate index; everything
  // else goes into a positional queue. This way a garbled/duplicate page number
  // never copies one line onto several pages or leaves a silent gap.
  const byPage = new Map();
  const loose = [];
  for (const it of arr) {
    const line = String(it?.line ?? it?.text ?? it?.script ?? (typeof it === "string" ? it : "")).trim();
    if (!line) continue;
    const p = Number(it?.page ?? it?.index ?? NaN);
    if (Number.isInteger(p) && p >= 1 && p <= count && !byPage.has(p)) byPage.set(p, line);
    else loose.push(line);
  }
  const out = [];
  let li = 0;
  for (let i = 1; i <= count; i++) {
    out.push({ page: i, line: byPage.get(i) || loose[li++] || "" });
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[demi] GLM proxy on http://localhost:${PORT}  model=${MODEL}  key=${API_KEY ? "✓" : "✗ (set ZHIPU_API_KEY in .env)"}`);
  });
}

export default app;
