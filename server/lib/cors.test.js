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
