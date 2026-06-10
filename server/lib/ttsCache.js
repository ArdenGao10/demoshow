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
        remember(key, buf); // 触摸一下,保持热度
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
      } catch {
        /* 磁盘失败,仅内存 */
      }
    },
  };
}
