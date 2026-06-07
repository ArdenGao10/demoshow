// voiceClip.js — fetches a narration clip from the cloud TTS proxy (/api/tts)
// and caches the resulting audio per (voice + text) so replaying a page never
// re-bills. Throws on failure so the caller can fall back to browser speech.

const cache = new Map();    // `${voice}::${text}` -> objectURL (成功后落地)
const inFlight = new Map(); // `${voice}::${text}` -> Promise<objectURL> (合并并发请求)

export async function fetchClip(text, voice = "") {
  const key = `${voice}::${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // 防止预拉和正式取声同时对同一句各发一次,后端 cogtts 是要计费/限流的。
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) {
      let msg = `语音合成失败 (${res.status})`;
      try {
        const j = await res.json();
        msg = j.error || msg;
      } catch {
        /* ignore */
      }
      const err = new Error(msg);
      err.status = res.status; // 402 ≈ 余额不足/限流（可回退）
      throw err;
    }
    const url = URL.createObjectURL(await res.blob());
    cache.set(key, url);
    return url;
  })();

  inFlight.set(key, promise);
  // 不管成功失败都从 in-flight 表里挪掉,失败的下次再试。
  promise.finally(() => inFlight.delete(key));
  return promise;
}
