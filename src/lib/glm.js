// glm.js — frontend client for the GLM proxy (server/index.js).
// Sends the parsed deck + presenter/tone, gets one narration line per page.

export async function generateScripts({ presenterName, tone, slides }) {
  const payload = {
    presenterName,
    tone,
    slides: slides.map((s) => ({ title: s.title, text: s.text })),
  };
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `生成失败 (${res.status})`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.scripts || [];
}
