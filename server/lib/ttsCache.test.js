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
    const d = cacheKey({ model: "cogtts", voice: "tongtong", text: "你好呀" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("createTtsCache", () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "demi-tts-test-"));
  });

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

  it("磁盘目录不可写时静默降级为仅内存", async () => {
    const cache = createTtsCache({ dir: "/dev/null/impossible" });
    await cache.put("k1", Buffer.from("audio-1"));
    expect((await cache.get("k1")).toString()).toBe("audio-1");
  });
});
