# Demi 商业化加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给花钱的 AI 端点加限流与 CORS 白名单、TTS 结果缓存、删除死代码账号系统、widget 版本化+SRI,并建立 vitest 测试基建。

**Architecture:** 把可测试的纯逻辑抽到 `server/lib/`(限流器、Origin 校验、TTS 缓存),`server/index.js` 只做接线;widget 版本化用一个独立 release 脚本生成版本化副本 + meta JSON,前端嵌入片段读 meta。

**Tech Stack:** Node/Express、vitest、Vite/React(现有栈,不新增运行时依赖)。

Spec: `docs/superpowers/specs/2026-06-10-commercialization-hardening-design.md`

---

### Task 1: vitest 测试基建

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** `npm install -D vitest`
- [ ] **Step 2:** `package.json` 的 scripts 加 `"test": "vitest run"`
- [ ] **Step 3:** 运行 `npm test`,预期输出 "No test files found"(此时还没有测试,属正常)
- [ ] **Step 4:** Commit: `chore: 加 vitest 测试基建`

### Task 2: 限流器模块(TDD)

**Files:**
- Create: `server/lib/rateLimit.js`
- Test: `server/lib/rateLimit.test.js`

- [ ] **Step 1: 写失败测试** `server/lib/rateLimit.test.js`

```js
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimit.js";

function fakeClock(start = 0) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

describe("createRateLimiter", () => {
  it("窗口内放行到 max 次,然后拒绝", () => {
    const now = fakeClock();
    const check = createRateLimiter({ windowMs: 60000, max: 3, now });
    expect(check("a").ok).toBe(true);
    expect(check("a").ok).toBe(true);
    expect(check("a").ok).toBe(true);
    const r = check("a");
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("窗口滑过后恢复放行", () => {
    const now = fakeClock();
    const check = createRateLimiter({ windowMs: 60000, max: 2, now });
    check("a"); check("a");
    expect(check("a").ok).toBe(false);
    now.advance(61000);
    expect(check("a").ok).toBe(true);
  });

  it("不同 key 互不影响", () => {
    const now = fakeClock();
    const check = createRateLimiter({ windowMs: 60000, max: 1, now });
    expect(check("a").ok).toBe(true);
    expect(check("b").ok).toBe(true);
    expect(check("a").ok).toBe(false);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL(模块不存在)
- [ ] **Step 3: 实现** `server/lib/rateLimit.js`

```js
// 内存滑动窗口限流器。Vercel 上每实例独立 —— 挡得住朴素脚本刷量,
// 精确到客户的计量留给后续 site key 系统。
export function createRateLimiter({ windowMs = 60000, max = 20, now = Date.now } = {}) {
  const hits = new Map(); // key -> 窗口内的请求时间戳数组
  let lastSweep = now();
  function sweep(t) {
    // 定期清掉整体过期的 key,防止 Map 无限增长
    if (t - lastSweep < windowMs) return;
    lastSweep = t;
    for (const [k, arr] of hits) {
      const fresh = arr.filter((ts) => t - ts < windowMs);
      if (fresh.length) hits.set(k, fresh);
      else hits.delete(k);
    }
  }
  return function check(key) {
    const t = now();
    sweep(t);
    const arr = (hits.get(key) || []).filter((ts) => t - ts < windowMs);
    if (arr.length >= max) {
      hits.set(key, arr);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((arr[0] + windowMs - t) / 1000)) };
    }
    arr.push(t);
    hits.set(key, arr);
    return { ok: true, remaining: max - arr.length };
  };
}
```

- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** Commit: `feat: 花钱端点限流器(滑动窗口,内存版)`

### Task 3: Origin 白名单模块(TDD)

**Files:**
- Create: `server/lib/cors.js`
- Test: `server/lib/cors.test.js`

- [ ] **Step 1: 写失败测试** `server/lib/cors.test.js`

```js
import { describe, it, expect } from "vitest";
import { createOriginCheck } from "./cors.js";

describe("createOriginCheck", () => {
  it("留空 = 全部放行", () => {
    const ok = createOriginCheck("");
    expect(ok("https://anything.com")).toBe(true);
  });
  it("* = 全部放行", () => {
    const ok = createOriginCheck("*");
    expect(ok("https://anything.com")).toBe(true);
  });
  it("白名单精确匹配,大小写/尾斜杠不敏感", () => {
    const ok = createOriginCheck("https://a.com, https://B.com/");
    expect(ok("https://a.com")).toBe(true);
    expect(ok("https://b.com")).toBe(true);
    expect(ok("https://evil.com")).toBe(false);
  });
  it("无 Origin 头(同源/服务端调用)放行", () => {
    const ok = createOriginCheck("https://a.com");
    expect(ok("")).toBe(true);
    expect(ok(undefined)).toBe(true);
  });
});
```

- [ ] **Step 2:** `npm test` → 新文件 FAIL
- [ ] **Step 3: 实现** `server/lib/cors.js`

```js
// WIDGET_ALLOWED_ORIGINS 解析与匹配。
// 留空或包含 "*" = 全部放行(兼容已部署的 widget);否则只放白名单内的 Origin。
export function createOriginCheck(raw) {
  const items = String(raw || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, "").toLowerCase())
    .filter(Boolean);
  const all = !items.length || items.includes("*");
  const set = new Set(items);
  return function originAllowed(origin) {
    if (!origin) return true; // 同源或服务端调用没有 Origin 头
    if (all) return true;
    return set.has(String(origin).replace(/\/$/, "").toLowerCase());
  };
}
```

- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** Commit: `feat: widget 跨域白名单(WIDGET_ALLOWED_ORIGINS)`

### Task 4: TTS 缓存模块(TDD)

**Files:**
- Create: `server/lib/ttsCache.js`
- Test: `server/lib/ttsCache.test.js`

- [ ] **Step 1: 写失败测试** `server/lib/ttsCache.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cacheKey, createTtsCache } from "./ttsCache.js";

describe("cacheKey", () => {
  it("同输入同 key,不同输入不同 key", () => {
    const a = cacheKey({ model: "cogtts", voice: "tongtong", text: "你好" });
    const b = cacheKey({ model: "cogtts", voice: "tongtong", text: "你好" });
    const c = cacheKey({ model: "cogtts", voice: "xiaochen", text: "你好" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("createTtsCache", () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "demi-tts-test-")); });

  it("put 后 get 命中", async () => {
    const cache = createTtsCache({ dir });
    await cache.put("k1", Buffer.from("audio-1"));
    expect((await cache.get("k1")).toString()).toBe("audio-1");
  });

  it("未知 key 返回 null", async () => {
    const cache = createTtsCache({ dir });
    expect(await cache.get("nope")).toBe(null);
  });

  it("内存淘汰后还能从磁盘读回", async () => {
    const cache = createTtsCache({ dir, maxMemoryEntries: 1 });
    await cache.put("k1", Buffer.from("audio-1"));
    await cache.put("k2", Buffer.from("audio-2")); // k1 被挤出内存
    expect((await cache.get("k1")).toString()).toBe("audio-1"); // 磁盘兜底
  });
});
```

- [ ] **Step 2:** `npm test` → 新文件 FAIL
- [ ] **Step 3: 实现** `server/lib/ttsCache.js`

```js
// TTS 结果缓存:同一段(模型+音色+文本)只付费合成一次。
// 两层:内存 LRU + 磁盘(默认系统临时目录;Vercel 上即 /tmp,温实例可复用)。
// 磁盘 IO 失败一律静默降级,绝不影响合成主流程。
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function cacheKey({ model, voice, text }) {
  return crypto.createHash("sha256").update(`${model}\n${voice}\n${text}`).digest("hex").slice(0, 32);
}

export function createTtsCache({ dir, maxMemoryEntries = 60 } = {}) {
  const root = dir || path.join(os.tmpdir(), "demi-tts-cache");
  const mem = new Map(); // 插入序即 LRU 序
  function remember(key, buf) {
    if (mem.has(key)) mem.delete(key);
    mem.set(key, buf);
    while (mem.size > maxMemoryEntries) mem.delete(mem.keys().next().value);
  }
  return {
    async get(key) {
      if (mem.has(key)) {
        const buf = mem.get(key);
        remember(key, buf);
        return buf;
      }
      try {
        const buf = await fs.readFile(path.join(root, `${key}.wav`));
        remember(key, buf);
        return buf;
      } catch {
        return null;
      }
    },
    async put(key, buf) {
      remember(key, buf);
      try {
        await fs.mkdir(root, { recursive: true });
        await fs.writeFile(path.join(root, `${key}.wav`), buf);
      } catch { /* 磁盘失败,仅内存 */ }
    },
  };
}
```

- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** Commit: `feat: TTS 音频缓存(内存 LRU + 磁盘)`

### Task 5: 接线进 server/index.js + 删除死代码账号系统

**Files:**
- Modify: `server/index.js`
- Modify: `.env.example`

- [ ] **Step 1:** 删除 `/api/auth/register`、`/api/auth/login`、`/api/auth/me` 路由及 `hashPassword`、`publicUser`、`authResponse`、`verifyToken`、`readUsers`、`writeUsers`、`USERS_FILE`、`TOKEN_SECRET`;`crypto`/`fs`/`path`/`fileURLToPath` import 若不再使用一并删。
- [ ] **Step 2:** 头部接线:

```js
import { createRateLimiter } from "./lib/rateLimit.js";
import { createOriginCheck } from "./lib/cors.js";
import { cacheKey, createTtsCache } from "./lib/ttsCache.js";

const originAllowed = createOriginCheck(process.env.WIDGET_ALLOWED_ORIGINS);
const rateCheck = createRateLimiter({ windowMs: 60000, max: Number(process.env.RATE_LIMIT_PER_MIN) || 20 });
const ttsCache = createTtsCache({ dir: process.env.TTS_CACHE_DIR });
const CROSS_ORIGIN_PATHS = new Set(["/api/generate-tour", "/api/plan-tour", "/api/agent-step", "/api/tts"]);
const PAID_PATHS = new Set(["/api/generate", "/api/generate-tour", "/api/plan-tour", "/api/agent-step", "/api/tts"]);
```

- [ ] **Step 3:** 重写 CORS 中间件(白名单命中回显 Origin + `Vary: Origin`;全开模式保持 `*`;不命中不下发头),后接限流中间件(POST + PAID_PATHS,按 `x-forwarded-for` 第一跳 IP,超限 429 + `Retry-After`)。
- [ ] **Step 4:** `/api/tts` 集成缓存:合成前查 `ttsCache.get`(命中 `X-Demi-Cache: hit` 直接回吐),裁剪后 `ttsCache.put` + `X-Demi-Cache: miss`。
- [ ] **Step 5:** `/api/generate` 加 `slides.length > 60` → 400。
- [ ] **Step 6:** `.env.example`:删 `TOKEN_SECRET`,加 `RATE_LIMIT_PER_MIN`、`WIDGET_ALLOWED_ORIGINS`、`TTS_CACHE_DIR` 注释说明。
- [ ] **Step 7:** 手动验证:`node server/index.js` 启动;`curl -s localhost:8787/api/health`;`curl -s -X POST localhost:8787/api/auth/login` → 404;连发 25 次 POST `/api/generate-tour` → 出现 429。
- [ ] **Step 8:** `npm test` 全绿。Commit: `feat: 限流+CORS 白名单+TTS 缓存接线,删除死代码账号系统`

### Task 6: Widget 版本化 + SRI

**Files:**
- Modify: `public/demi-widget.js`(版本常量 + DemiTour.version + 编辑面板 snippet 用自身 src)
- Create: `scripts/release-widget.mjs`
- Create(生成): `public/demi-widget@0.2.0.js`、`src/widget-meta.json`
- Modify: `package.json`(prebuild)、`src/screens/Create.jsx`(嵌入片段)、`vercel.json`(CORS/缓存头)

- [ ] **Step 1:** `public/demi-widget.js` IIFE 顶部加 `var DEMI_WIDGET_VERSION = "0.2.0";`,`window.DemiTour` 对象加 `version: DEMI_WIDGET_VERSION`。
- [ ] **Step 2:** 新建 `scripts/release-widget.mjs`:

```js
// 生成版本化 widget 副本 + SRI,供嵌入片段引用。npm run build 自动执行。
import fs from "node:fs";
import crypto from "node:crypto";

const src = fs.readFileSync("public/demi-widget.js", "utf8");
const m = src.match(/DEMI_WIDGET_VERSION\s*=\s*"([^"]+)"/);
if (!m) throw new Error("public/demi-widget.js 里找不到 DEMI_WIDGET_VERSION");
const version = m[1];
const file = `demi-widget@${version}.js`;
fs.writeFileSync(`public/${file}`, src);
const integrity = "sha384-" + crypto.createHash("sha384").update(src).digest("base64");
fs.writeFileSync("src/widget-meta.json", JSON.stringify({ version, file, integrity }, null, 2) + "\n");
for (const f of fs.readdirSync("public")) {
  if (/^demi-widget@.+\.js$/.test(f) && f !== file) fs.unlinkSync(`public/${f}`);
}
console.log(`[widget] ${file}\n[widget] integrity: ${integrity}`);
```

- [ ] **Step 3:** `package.json` scripts 加 `"prebuild": "node scripts/release-widget.mjs"`;手动跑一次 `node scripts/release-widget.mjs` 生成文件。
- [ ] **Step 4:** `src/screens/Create.jsx` 嵌入片段(170 行附近)改用 meta:

```js
import widgetMeta from "../widget-meta.json";
// ...
const widgetUrl = (typeof window !== "undefined" ? window.location.origin : "") + "/" + widgetMeta.file;
const sri = ` integrity="${widgetMeta.integrity}" crossorigin="anonymous"`;
const installer = `<script src="${widgetUrl}"${sri}></script>`;
```

(snippet 模板同样替换 src 行)
- [ ] **Step 5:** widget 编辑面板 snippet(`public/demi-widget.js` ~998 行):src 改为加载时实际的 `document.currentScript.src`(已有 detect 逻辑可复用),拿不到再退回 `demi-widget.js`。
- [ ] **Step 6:** `vercel.json` 的 routes 在 `"handle": "filesystem"` 前加:

```json
{ "src": "/demi-widget@.*\\.js", "headers": { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=31536000, immutable" }, "continue": true },
{ "src": "/demi-widget\\.js", "headers": { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" }, "continue": true }
```

- [ ] **Step 7:** `npm run build` 通过;确认 `dist/demi-widget@0.2.0.js` 存在。
- [ ] **Step 8:** Commit: `feat: widget 版本化发布(@0.2.0)+ SRI + 嵌入片段升级`

### Task 7: 文档同步

**Files:**
- Modify: `README.md`、`.env.example`(若 Task 5 未完成此项)

- [ ] **Step 1:** README:登录一节改为 Supabase 说明(删 `/api/auth/*`、`users.json`、`TOKEN_SECRET`);新增"防刷与缓存"环境变量说明;widget 版本化说明;验收清单加 `npm test`。
- [ ] **Step 2:** `npm run build` + `npm test` 最终验证。
- [ ] **Step 3:** Commit: `docs: README 同步账号/限流/缓存/widget 版本化变更`

## Self-Review

- Spec 覆盖:防刷(Task 2/3/5)、TTS 缓存(Task 4/5)、删账号(Task 5)、widget 版本化+SRI(Task 6)、测试基建(Task 1)、文档(Task 7)✓
- 无占位符;类型/函数名跨任务一致(`createRateLimiter`/`createOriginCheck`/`cacheKey`/`createTtsCache`)✓
