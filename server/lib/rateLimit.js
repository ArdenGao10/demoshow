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
