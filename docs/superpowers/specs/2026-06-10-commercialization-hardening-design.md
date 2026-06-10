# Demi 商业化加固 — 设计文档

日期:2026-06-10
状态:用户已在对话中批准方向("尽你所能的开始做吧"),本文档落实细节。

## 背景与目标

Demi 要从 demo 走向可收钱的产品,当前最紧迫的四件事(按对话中与用户确认的优先级):

1. **防刷保护**:`/api/tts`、`/api/generate`、`/api/generate-tour`、`/api/plan-tour`、`/api/agent-step` 现在对所有来源开放(CORS `*`)、无限流。后端地址硬编码在公开 widget 里,任何人可以刷爆智谱余额(TTS 按量付费,用户刚遇到额度耗尽)。
2. **TTS 音频缓存**:同一段讲稿每次播放都重新付费合成,慢且烧钱。
3. **账号系统整合**:服务端 `/api/auth/*` + `users.json` 已是死代码(前端全部走 Supabase 或本地演示登录),且在 Vercel serverless 上本来就不能持久化。删除。
4. **Widget 版本化 + SRI**:客户把 `<script>` 嵌进生产网站后,每次更新 widget 都在动客户的生产环境;无版本固定、无完整性校验是嵌入信任的硬伤。

明确**不做**(后续迭代):托管分享链接(需要先定数据库表结构)、计费、统计面板、PDF 支持。

## 方案

### 1. 防刷保护

新模块 `server/lib/rateLimit.js`:

- `createRateLimiter({ windowMs, max, now })` → `(key) => { ok, retryAfterSec }`。
- 内存滑动窗口(数组时间戳),带定期清扫防内存涨。Vercel 上每实例独立——不完美但能挡住朴素脚本刷量;真正按客户计量留给后续 site key 系统。
- 注入式时钟 `now` 便于测试。

新模块 `server/lib/cors.js`:

- `createOriginCheck(allowedOrigins)`:`allowedOrigins` 来自环境变量 `WIDGET_ALLOWED_ORIGINS`(逗号分隔;`*` 或留空 = 全部放行,保持现状不破坏已部署的 widget)。
- 校验通过则回显该 Origin(不再无脑 `*`),便于以后配 allowlist 后真正生效。

接入 `server/index.js`:

- 限流应用于 5 个花钱端点,按 IP(`x-forwarded-for` 第一跳,Vercel 标准)。
- 默认 `RATE_LIMIT_PER_MIN=20`(每 IP 每分钟),环境变量可调,超限返回 429 + `Retry-After`。
- TTS 文本上限保持 1000 字符;`/api/generate` 的 slides 数量加上限(60 页)防超大 payload。

### 2. TTS 音频缓存

新模块 `server/lib/ttsCache.js`:

- key = `sha256(model | voice | text)` 截短。
- 两层:内存 LRU(默认 60 条,Map 按插入序淘汰)+ 磁盘(`TTS_CACHE_DIR`,默认 `os.tmpdir()/demi-tts-cache`,Vercel 上即 `/tmp`,温实例可复用)。
- `get(key)` / `put(key, buffer)`,磁盘写失败静默降级为只用内存。
- 存的是裁剪后的 wav(`trimSilenceAndTone` 之后),命中时直接回吐。
- 响应头 `X-Demi-Cache: hit|miss` 便于观察。

### 3. 删除死代码账号系统

- 删 `server/index.js` 中:`/api/auth/register|login|me` 三个路由、`hashPassword`/`publicUser`/`authResponse`/`verifyToken`/`readUsers`/`writeUsers`、`USERS_FILE`、`TOKEN_SECRET`。
- 前端无任何调用(已验证:`src/` 中只有 Supabase auth)。`App.jsx` 里 `localStorage.removeItem("demi_token")` 是旧残留,顺手删。
- README、`.env.example` 同步:删 `TOKEN_SECRET`,账号一节改为 Supabase 说明。

### 4. Widget 版本化 + SRI

- `public/demi-widget.js` 头部加 `var DEMI_WIDGET_VERSION = "0.2.0"`,并挂到 `window.DemiTour.version`。
- 新脚本 `scripts/release-widget.mjs`:读 canonical 文件 → 生成 `public/demi-widget@<version>.js`(入库,保证 dev/prod 都可访问)→ 计算 sha384 SRI → 写 `src/widget-meta.json`(`{ version, file, integrity }`)。
- `npm run build` 前置执行该脚本(`prebuild`),保证 dist 里始终有版本化文件。
- [Create.jsx](../../src/screens/Create.jsx) 嵌入片段改用 `src/widget-meta.json`:版本化 URL + `integrity` + `crossorigin="anonymous"`。
- widget 自身编辑面板生成的 snippet:用它自己被加载时的 `src`(已有 detect 逻辑),不引入构建产物依赖。
- `vercel.json` 给 `/demi-widget*.js` 加 `Access-Control-Allow-Origin: *` 响应头(SRI 跨域校验必需)。

### 5. 测试基建

- devDependency 加 `vitest`,`npm test` = `vitest run`。
- 单测覆盖新增纯逻辑:`rateLimit`(窗口滑动、恢复、独立 key)、`ttsCache`(key 稳定性、LRU 淘汰、磁盘回读)、`cors`(allowlist 解析与匹配)。
- 服务端现有逻辑(GLM 解析等)不在本次重构范围。

## 错误处理

- 限流超限:429 JSON `{ error: "请求太频繁,请稍后再试" }` + `Retry-After`;前端 TTS 已有"失败回退浏览器语音"路径,自然兼容。
- 缓存磁盘 IO 失败:捕获并降级,绝不影响合成主流程。
- Origin 不在白名单:CORS 头不下发,浏览器侧拦截;服务端不额外 403(避免误伤同源调用)。

## 验收

- `npm test` 全绿;`npm run build` 通过。
- 手动:本地起服务,`/api/tts` 同一文本第二次返回 `X-Demi-Cache: hit`;快速连发超过限额返回 429;注册/登录路由已不存在(404);`public/demi-widget@0.2.0.js` 存在且片段含 integrity。
