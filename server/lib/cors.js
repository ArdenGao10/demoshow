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
