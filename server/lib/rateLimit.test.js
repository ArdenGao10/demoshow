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
    check("a");
    check("a");
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

  it("被拒绝的请求不占用窗口配额", () => {
    const now = fakeClock();
    const check = createRateLimiter({ windowMs: 60000, max: 1, now });
    check("a");
    check("a"); // 被拒
    now.advance(61000); // 第一次请求已滑出窗口
    expect(check("a").ok).toBe(true);
  });
});
