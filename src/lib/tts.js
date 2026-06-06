// tts.js — thin wrapper over the browser's Web Speech (SpeechSynthesis) API.
// Used to give Demi a real voice without any cloud TTS. Exposes voice picking,
// speak (with word/char boundary callbacks for subtitle sync), pause/resume,
// and cancel.

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export const ttsSupported = !!synth;

// Voices load asynchronously in most browsers — resolve once they're ready.
export function loadVoices() {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const ready = synth.getVoices();
    if (ready && ready.length) return resolve(ready);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish, { once: true });
    // Safari sometimes never fires the event — poll briefly as a fallback.
    setTimeout(finish, 1000);
  });
}

// Prefer a Chinese voice; fall back to the platform default.
export function pickVoice(voices, lang = "zh") {
  if (!voices || !voices.length) return null;
  const zh = voices.filter((v) => /^zh|cmn|Chinese/i.test(v.lang) || /chinese|中文|普通话/i.test(v.name));
  // favour mainland Mandarin if present
  const natural = zh.find((v) => /premium|natural|enhanced|tingting|meijia|xiaoxiao|yunxi/i.test(v.name));
  const cn = zh.find((v) => /zh[-_]?CN|cmn/i.test(v.lang));
  return natural || cn || zh[0] || voices.find((v) => v.default) || voices[0] || null;
}

let currentUtter = null;

// Speak `text`. Callbacks: onStart, onBoundary({charIndex}), onEnd, onError.
// Returns a cancel function. Boundary events drive subtitle reveal where the
// browser supports them.
export function speak(text, opts = {}) {
  if (!synth || !text) {
    opts.onEnd?.();
    return () => {};
  }
  cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (opts.voice) u.voice = opts.voice;
  u.lang = opts.voice?.lang || opts.lang || "zh-CN";
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  u.volume = opts.volume ?? 1;

  u.onstart = () => opts.onStart?.();
  u.onboundary = (e) => opts.onBoundary?.({ charIndex: e.charIndex ?? 0, name: e.name });
  u.onend = () => {
    if (currentUtter === u) currentUtter = null;
    opts.onEnd?.();
  };
  u.onerror = (e) => {
    if (currentUtter === u) currentUtter = null;
    // "interrupted" / "canceled" are expected when we navigate — don't treat as fatal.
    if (e.error === "interrupted" || e.error === "canceled") return;
    opts.onError?.(e);
    opts.onEnd?.();
  };

  currentUtter = u;
  // Chrome occasionally needs a resume kick if the engine was left paused.
  if (synth.paused) synth.resume();
  synth.speak(u);
  return () => cancel();
}

export function pause() {
  if (synth && synth.speaking && !synth.paused) synth.pause();
}
export function resume() {
  if (synth && synth.paused) synth.resume();
}
export function cancel() {
  currentUtter = null;
  if (synth) synth.cancel();
}
