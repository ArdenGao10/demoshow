// 生成版本化 widget 副本 + SRI,供嵌入片段引用。npm run build 自动执行(prebuild)。
// 版本号取自 public/demi-widget.js 里的 DEMI_WIDGET_VERSION。
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
// 清掉旧版本副本,避免 public/ 越积越多(canonical 的 demi-widget.js 永远保留)
for (const f of fs.readdirSync("public")) {
  if (/^demi-widget@.+\.js$/.test(f) && f !== file) fs.unlinkSync(`public/${f}`);
}
console.log(`[widget] public/${file}`);
console.log(`[widget] integrity: ${integrity}`);
