# Demi

> 不用出镜的 AI 演示助手。用户上传自己的幻灯片，选择一个可爱的讲解角色，Demi 自动生成讲稿、开口讲解，并逐页自动播放。

这份 README 同时是产品说明和 AI 协作手册。任何接手本项目的 AI，请先完整阅读本文，再修改代码。

## 产品目标

Demi 要解决的问题是：很多人有完整的 PPT，但不想出镜、不擅长演讲，或者没有时间反复录制讲解。

用户只需要：

1. 登录或注册。
2. 选择一个讲解角色，默认角色是「尾尾」。
3. 上传 HTML 格式的幻灯片。
4. 选择讲解语气和角色位置。
5. 让 AI 生成逐页口播稿。
6. 点击一次播放，角色自动讲解、自动翻页，直到演示结束。

最终体验应该像“用户的 PPT 旁边有一个可爱的 AI 演讲者”，而不是把 PPT 改造成卡通页面。

## 核心产品原则

### 1. 幻灯片永远是主角

- 必须尽可能原样展示用户上传的 HTML 幻灯片。
- 不能为了放角色而大幅遮挡、裁剪或重做幻灯片。
- 手绘风格只属于 Demi 产品界面和角色，不应污染用户的幻灯片内容。

### 2. 点击一次就应自动完成演示

- 用户点击播放后，必须自动朗读当前页。
- 当前页讲完后，必须自动切换并朗读下一页。
- 只有用户主动暂停、退出或演示结束时，自动播放才停止。
- 上一页、下一页按钮用于手动干预，不是正常播放流程的必需操作。

### 3. 角色是有生命感的讲解搭子

- 默认角色是「尾尾」，对应 `formId: "h6"`。
- 讲话时应有轻微动作、表情变化和字幕同步。
- 语音应优先选择自然的中文音色，默认语速稍慢，避免机械念稿。
- 用户可以切换角色、音色、语速、字幕和舞台布局。

### 4. 不允许伪交互

- 看起来可以点击的按钮必须有真实行为。
- 未完成的功能应清楚标记为未完成，不要放一个无响应按钮冒充完成。
- 登录、注册、上传、生成、播放、暂停、翻页、退出都必须可以实际工作。

## 三种演示形态

三种形态来源于 `design/screens-variants.jsx`，用户可在创建页选择，也可在播放页切换。

| ID | 名称 | 行为 |
| --- | --- | --- |
| `corner` | 角落陪讲 | 幻灯片偏左，角色在右下角讲解 |
| `runway` | 舞台讲解 | 幻灯片居中，角色站在下方舞台 |
| `pip` | 画中画 | 幻灯片尽量放大，角色缩成圆形画中画 |

新增布局时必须继续遵守“幻灯片是主角”和“不遮挡主要内容”的原则。

## 主要用户流程

当前顶层状态机位于 `src/App.jsx`：

```text
Landing
  -> Login / Register
  -> Create
  -> Library
  -> Loading
  -> Play
```

### Landing

- 介绍产品价值。
- 登录、注册、开始制作、看例子、价格和帮助按钮必须可交互。
- 首页主角色使用尾尾。

### Login / Register

- 账号系统走 Supabase Auth（前端直连，配置 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 即启用）。
- 未配置 Supabase 时回落到本地演示登录（点击即进，用户只存 `localStorage`）。
- 服务端不保存任何用户数据。

### Create

- 选择角色。
- 从素材库选择更多角色。
- 上传 HTML 幻灯片或使用内置示例稿。
- 上传后必须立刻在右侧演示框显示第一页。
- 选择讲解语气和三种舞台布局。
- 点击生成后进入 Loading，再进入 Play。

### Play

- 展示上传的真实幻灯片。
- 使用生成的逐页讲稿和浏览器 Web Speech TTS。
- 点击播放后连续自动讲解和翻页。
- 支持暂停、上一页、下一页、字幕开关、语速、音色和舞台布局切换。

## 当前技术架构

### 前端

- React 18
- Vite
- 无路由库，使用 `src/App.jsx` 中的轻量状态机
- 手绘风格主要由 SVG 角色、CSS 变量和 `sketch` 样式实现
- 浏览器 Web Speech API 提供 TTS

### 服务端

- Express
- 智谱 GLM 代理接口（讲稿、导览、agent 决策、TTS）
- 花钱端点按 IP 限流（`RATE_LIMIT_PER_MIN`，默认 20/分钟）
- widget 跨域白名单（`WIDGET_ALLOWED_ORIGINS`，留空全开）
- TTS 音频缓存（内存 LRU + 磁盘，同一段讲稿只付费合成一次）

### 关键文件

| 文件 | 作用 |
| --- | --- |
| `src/App.jsx` | 顶层状态机和跨页面数据 |
| `src/screens/Create.jsx` | 上传、角色、语气、布局选择 |
| `src/screens/Play.jsx` | TTS、字幕、自动翻页和舞台布局 |
| `src/components/SlideFrame.jsx` | 在 iframe 中渲染用户幻灯片 |
| `src/lib/slides.js` | 解析 HTML 幻灯片 |
| `src/lib/tts.js` | Web Speech TTS 封装 |
| `src/lib/characters.jsx` | 人物、宠物、Q 版角色素材库 |
| `src/lib/glm.js` | 前端 GLM 请求客户端 |
| `server/index.js` | GLM 代理、TTS、限流/CORS 接线、本地讲稿兜底 |
| `server/lib/` | 限流器、Origin 白名单、TTS 缓存（均有单测） |
| `public/demi-widget.js` | 可嵌入第三方网站的导览 widget（canonical 源） |
| `scripts/release-widget.mjs` | 生成版本化 widget 副本 + SRI（`npm run build` 自动跑） |
| `design/` | 原始设计稿和三种播放形态参考 |

## HTML 幻灯片约定

优先识别以下元素作为独立页面：

```text
[data-slide]
section.slide
.slide
section
.page
```

如果没有匹配项，则将整个 `<body>` 当作单页。

上传后，解析器会保存完整 HTML 文档，并给每一页添加内部标记。播放时通过 iframe 只展示当前页。

推荐上传自包含 HTML：

- CSS 和图片尽量内嵌。
- 不要依赖上传文件旁边的本地资源目录。
- 远程资源必须允许浏览器正常访问。
- 如果修改解析逻辑，必须同时验证单页 HTML、多页 `<section>` 和多页 `.slide`。

## AI 讲稿与语音

### 配置 GLM

复制环境变量文件：

```bash
cp .env.example .env
```

填写：

```env
ZHIPU_API_KEY=你的智谱Key
GLM_MODEL=glm-4-flash
PORT=8787
RATE_LIMIT_PER_MIN=20
WIDGET_ALLOWED_ORIGINS=
```

配置 Key 后，服务端会请求智谱 GLM 生成逐页讲稿。

未配置 Key 时，服务端会使用本地演示讲稿，保证完整流程仍可运行。这个本地兜底只用于演示，不代表最终讲稿质量。

### 语音目标

- 优先选择自然、增强或高质量中文音色。
- 默认语速为 `0.9x`。
- 口播稿必须口语化、简短、承上启下，不能只是机械复述页面文字。
- 浏览器 TTS 的自然度受操作系统音色影响。未来可以接入云端高质量 TTS，但不能把密钥暴露给前端。

## 登录注册说明

账号系统完全走 Supabase Auth：前端用 `@supabase/supabase-js` 直连，服务端不保存用户。
在 `.env` 配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 即启用真账号；
未配置时回落到本地演示登录（点击即进，仅存 `localStorage`）。

旧的 `/api/auth/*` 本地 JSON 账号系统已删除（它在 Vercel serverless 上本来就无法持久化）。

## 防刷与缓存

所有会消耗智谱余额的端点（`/api/generate`、`/api/tts`、`/api/generate-tour`、`/api/plan-tour`、`/api/agent-step`）：

- 按来源 IP 限流，`RATE_LIMIT_PER_MIN` 控制（默认 20/分钟），超限返回 429 + `Retry-After`。
- widget 跨域端点支持 `WIDGET_ALLOWED_ORIGINS` 白名单（逗号分隔 Origin）；留空全开方便试用，**正式商用必须收紧到客户域名**。
- `/api/tts` 带两层缓存（内存 LRU + 磁盘 `TTS_CACHE_DIR`，默认系统临时目录）：同一段（模型+音色+文本）只付费合成一次，响应头 `X-Demi-Cache: hit|miss` 可观察。

## Widget 版本化

`public/demi-widget.js` 是 canonical 源，头部 `DEMI_WIDGET_VERSION` 是当前版本号。
`scripts/release-widget.mjs`（`npm run build` 自动执行）会：

1. 生成 `public/demi-widget@<version>.js` 版本化副本（客户嵌入用，永不原地变更）；
2. 计算 sha384 SRI 写入 `src/widget-meta.json`，Create 页的嵌入片段会带上 `integrity` + `crossorigin`。

修改 widget 行为时必须升 `DEMI_WIDGET_VERSION`，旧版本副本由 release 脚本自动清理（已发布给客户的版本如需长期保留，部署平台侧应保留历史构建）。

## 本地运行

安装依赖：

```bash
npm install
```

同时启动前端和 API：

```bash
npm run dev
```

默认地址：

```text
前端：http://localhost:5173
API：http://localhost:8787
```

构建：

```bash
npm run build
```

## AI 修改规则

所有后续 AI 必须遵守：

1. 修改前先阅读相关现有代码和 `design/` 中的参考文件。
2. 不要删除或覆盖用户已有设计资产。
3. 不要把 GLM Key、登录密钥或其他秘密放进前端。
4. 不要把真实用户数据提交到 Git。
5. 不要把可点击 UI 留成无响应装饰。
6. 不要破坏上传后即时预览和播放时原样展示幻灯片。
7. 不要破坏点击一次播放后的自动连续翻页。
8. 默认角色保持尾尾，除非用户明确要求修改。
9. 新功能必须融入现有手绘视觉系统，不要突然换成普通后台管理界面。
10. 修改完成后必须运行 `npm run build`，涉及服务端时还要检查对应 API。

## 每次修改后的验收清单

至少验证以下流程：

- [ ] `npm test` 通过。
- [ ] 首页按钮可以交互。
- [ ] 可以登录（Supabase 已配置时注册/登录真账号；未配置时演示登录可进入）。
- [ ] 刷新后可以恢复登录状态。
- [ ] 默认角色是尾尾。
- [ ] 可以进入角色素材库并更换角色。
- [ ] 上传 HTML 后第一页立即出现在预览框。
- [ ] 内置示例稿可以正常预览。
- [ ] 三种演示形态可以选择并正确展示。
- [ ] 可以生成逐页讲稿。
- [ ] 点击一次播放后会自动朗读和自动翻页。
- [ ] 暂停、上一页、下一页、字幕、语速和音色可用。
- [ ] 用户幻灯片没有被角色严重遮挡。
- [ ] `npm run build` 通过。

## 当前已知限制与后续重点

- HTML 上传最适合自包含文件，依赖本地外部资源的 HTML 可能无法完整显示。
- 云端 TTS（cogtts）需要智谱余额；无余额/未配置时回退浏览器 Web Speech，音质依赖用户设备。
- 限流是单实例内存版，Vercel 多实例下不精确；按客户计量需要后续的 site key 系统。
- 当前没有保存用户演示项目（讲稿/导览配置），刷新创建页后内容会丢失——托管分享链接是下一个迭代重点。
- 还需要补充前端组件测试、错误边界、上传文件安全检查。

如果需求与本文冲突，以用户最新的明确要求为准，并在完成修改后同步更新 README。
