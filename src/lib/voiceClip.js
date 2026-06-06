// voiceClip.js — fetches a narration clip from the cloud TTS proxy (/api/tts)
// and caches the resulting audio per (voice + text) so replaying a page never
// re-bills. Throws on failure so the caller can fall back to browser speech.

const cache = new Map(); // `${voice}::${text}` -> objectURL

export async function fetchClip(text, voice = "") {
  const key = `${voice}::${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

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
}
