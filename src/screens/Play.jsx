import { useCallback, useEffect, useRef, useState } from "react";
import { FormGlyph } from "../lib/characters.jsx";
import { BlackCat, GrassTuft, WoodFloor } from "../lib/demi.jsx";
import SlideFrame from "../components/SlideFrame.jsx";
import { cancel, loadVoices, pause, pickVoice, resume, speak } from "../lib/tts.js";

const SPEEDS = [0.9, 1, 1.15];
const LAYOUT_LABELS = { corner: "角落", runway: "舞台", pip: "画中画" };

export default function Play({ form, deck, scripts, layout: initialLayout, onExit }) {
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chars, setChars] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [rate, setRate] = useState(0.9);
  const [subtitles, setSubtitles] = useState(true);
  const [layout, setLayout] = useState(initialLayout || "corner");
  const autoRef = useRef(false);
  const startedPageRef = useRef(-1);
  const line = scripts?.[page]?.line || deck?.slides[page]?.text || "";
  const count = deck?.slides.length || 0;
  const voice = voices[voiceIndex] || null;

  useEffect(() => {
    loadVoices().then((all) => {
      const chinese = all.filter((v) => /^zh|cmn/i.test(v.lang) || /中文|chinese|普通话/i.test(v.name));
      const available = chinese.length ? chinese : all;
      const preferred = pickVoice(available);
      setVoices(available);
      setVoiceIndex(Math.max(0, available.indexOf(preferred)));
    });
    return cancel;
  }, []);

  const narrate = useCallback(() => {
    if (!line) return;
    startedPageRef.current = page;
    setPlaying(true);
    setChars(0);
    speak(line, {
      voice,
      rate,
      pitch: 1.04,
      onBoundary: ({ charIndex }) => setChars(Math.max(1, charIndex)),
      onEnd: () => {
        setChars(line.length);
        setPlaying(false);
        if (autoRef.current && page < count - 1) {
          setTimeout(() => setPage((p) => p + 1), 650);
        } else if (page === count - 1) {
          autoRef.current = false;
        }
      },
    });
  }, [line, voice, rate, page, count]);

  useEffect(() => {
    if (autoRef.current && startedPageRef.current !== page) {
      const id = setTimeout(narrate, 350);
      return () => clearTimeout(id);
    }
  }, [page, narrate]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setChars((c) => Math.min(line.length, c + 1)), Math.max(30, 58 / rate));
    return () => clearInterval(id);
  }, [playing, line, rate]);

  const go = (next) => {
    autoRef.current = false;
    cancel();
    setPlaying(false);
    setChars(0);
    setPage(Math.max(0, Math.min(count - 1, next)));
  };

  const toggle = () => {
    if (playing) {
      pause();
      autoRef.current = false;
      setPlaying(false);
      return;
    }
    if (chars > 0 && chars < line.length) {
      autoRef.current = true;
      resume();
      setPlaying(true);
      return;
    }
    if (page === count - 1 && chars >= line.length) {
      startedPageRef.current = -1;
      setPage(0);
      setChars(0);
      autoRef.current = true;
      return;
    }
    autoRef.current = true;
    narrate();
  };

  const switchVoice = (e) => {
    const wasPlaying = playing;
    cancel();
    setPlaying(false);
    setVoiceIndex(Number(e.target.value));
    if (wasPlaying) {
      startedPageRef.current = -1;
      autoRef.current = true;
    }
  };

  const positions = layoutStyles(layout);
  return <div className="screen" style={{ display: "flex", flexDirection: "column", background: layout === "pip" ? "#2b2622" : "var(--paper)" }}>
    <header style={{ height: 52, flex: "0 0 52px", display: "flex", alignItems: "center", gap: 12, padding: "0 18px", borderBottom: "2px solid rgba(59,51,46,.12)", background: "var(--paper)" }}>
      <b><span style={{ color: "var(--orange-deep)" }}>✦ Demi</span><span style={{ color: "var(--ink-soft)" }}> · {deck?.name} · {form?.name}</span></b>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>{Object.entries(LAYOUT_LABELS).map(([id, label]) => <button key={id} className="chip" onClick={() => setLayout(id)} style={{ cursor: "pointer", background: layout === id ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
      <select className="field" aria-label="讲解音色" value={voiceIndex} onChange={switchVoice} style={{ width: 150, padding: "6px 10px", fontSize: 12 }}>
        {voices.length ? voices.map((v, i) => <option key={`${v.name}-${i}`} value={i}>{v.name}</option>) : <option>系统中文音色</option>}
      </select>
      <button className="btn-ghost" style={{ padding: "5px 14px", fontSize: 13 }} onClick={() => { cancel(); onExit(); }}>退出</button>
    </header>
    <main className="speckle" style={{ flex: 1, position: "relative", background: layout === "pip" ? "#2b2622" : "var(--paper-2)", overflow: "hidden", minHeight: 0 }}>
      <div className="chip" style={{ position: "absolute", left: 24, top: 20, zIndex: 6, background: layout === "pip" ? "rgba(255,255,255,.92)" : "#fff" }}>第 {String(page + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} 页</div>

      {/* runway: full-width wood floor behind the presenter */}
      {layout === "runway" && <WoodFloor width={1280} height={56} style={{ width: "100%", position: "absolute", left: 0, bottom: 18, zIndex: 1 }} />}
      {layout === "runway" && <BlackCat style={{ height: 46, position: "absolute", left: 150, bottom: 28, zIndex: 1 }} />}
      {layout === "runway" && <GrassTuft style={{ height: 28, position: "absolute", left: 296, bottom: 42, zIndex: 1 }} />}

      {/* the slide — pip nests its subtitle inside the slide's bottom edge */}
      <div className={layout === "pip" ? "" : "sketch"} style={positions.slide}>
        <div style={{ position: "relative" }}>
          <SlideFrame deck={deck} slide={deck.slides[page]} />
          {layout === "pip" && subtitles && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: "5%", display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 4 }}>
              <div style={{ maxWidth: "78%", background: "rgba(59,51,46,.9)", color: "#fff", fontSize: 15, lineHeight: 1.5, padding: "8px 18px", borderRadius: 20 }}>{line.slice(0, chars || line.length)}{playing && <span style={{ color: "var(--orange)" }}>▍</span>}</div>
            </div>
          )}
        </div>
      </div>

      {/* corner / runway subtitle (runway = hand-drawn speech bubble) */}
      {layout !== "pip" && subtitles && (
        layout === "runway"
          ? <div className="sketch r2" style={positions.subtitle}>
              <span style={{ fontSize: 16.5, lineHeight: 1.45 }}><b style={{ color: "var(--orange-deep)", marginRight: 8 }}>{form?.name}:</b><span style={{ color: "var(--ink)" }}>{line.slice(0, chars || line.length)}</span>{playing && <span style={{ color: "var(--orange)" }}>▍</span>}</span>
              <svg width="40" height="26" style={{ position: "absolute", right: 34, bottom: -22 }} aria-hidden="true"><path d="M4 2 Q20 22 36 4" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="2.6" /></svg>
            </div>
          : <div className="sketch r2" style={positions.subtitle}><b style={{ color: "var(--orange)", marginRight: 12 }}>{form?.name}</b><span style={{ color: "#fff", fontSize: 17, lineHeight: 1.5 }}>{line.slice(0, chars || line.length)}{playing && <span style={{ color: "var(--orange)" }}>▍</span>}</span></div>
      )}

      <PresenterStage form={form} playing={playing} layout={layout} style={positions.presenter} />
    </main>
    <footer style={{ height: 76, flex: "0 0 76px", display: "flex", alignItems: "center", gap: 14, padding: "0 26px", borderTop: "2.4px solid var(--ink)", background: "var(--paper-card)" }}>
      <button className="icon-btn" disabled={page === 0} onClick={() => go(page - 1)}>⏮</button>
      <button className="icon-btn big" onClick={toggle}>{playing ? "❚❚" : "▶"}</button>
      <button className="icon-btn" disabled={page === count - 1} onClick={() => go(page + 1)}>⏭</button>
      <div style={{ flex: 1, height: 12, border: "2px solid var(--ink)", borderRadius: 20, overflow: "hidden" }}><div style={{ width: `${((page + chars / Math.max(1, line.length)) / count) * 100}%`, height: "100%", background: "var(--orange)" }} /></div>
      <button className="chip" onClick={() => setSubtitles((v) => !v)} style={{ cursor: "pointer", background: subtitles ? "var(--orange-pale)" : "#fff" }}>字幕 {subtitles ? "开" : "关"}</button>
      <button className="chip" onClick={() => setRate((r) => SPEEDS[(SPEEDS.indexOf(r) + 1) % SPEEDS.length])} style={{ cursor: "pointer" }}>{rate}×</button>
    </footer>
  </div>;
}

function PresenterStage({ form, playing, layout, style }) {
  const glyph = <FormGlyph form={form} expr={playing ? "wow" : "smile"} className={playing ? "talk" : ""} height={layout === "pip" ? 120 : 155} />;

  // C · 极简画中画 — circular PiP badge bottom-right + "在这儿 ↘" hint above.
  if (layout === "pip") return (
    <>
      <div className="hand" style={{ position: "absolute", right: 40, bottom: 168, fontSize: 17, color: "var(--orange)", transform: "rotate(-4deg)", zIndex: 4 }}>{form?.name} 在这儿 ↘</div>
      <div style={style}>
        <div className="ground-oval" style={{ position: "absolute", bottom: 14, width: 90, height: 14 }} />
        <div className="sway" style={{ position: "relative", zIndex: 2, marginBottom: 6 }}>{glyph}</div>
      </div>
    </>
  );

  // B · 通栏地面 — presenter stands directly on the shared full-width floor.
  if (layout === "runway") return (
    <div style={style}>
      <div className="sway" style={{ height: 152, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>{glyph}</div>
    </div>
  );

  // A · 角落小台 — presenter on its own little wood platform with a grass tuft.
  return (
    <div style={style}>
      <div className="hand" style={{ color: "var(--orange-deep)", fontSize: 18 }}>{playing ? "正在讲这一页…" : "点 ▶ 后会自动连播~"}</div>
      <div className="sway" style={{ height: 165, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>{glyph}<GrassTuft style={{ position: "absolute", height: 25, left: 20, bottom: 4 }} /></div>
      <WoodFloor width={220} height={38} style={{ width: 220, marginTop: -8 }} />
    </div>
  );
}

function layoutStyles(layout) {
  // B · 通栏地面：幻灯片居中，全宽木地面，角色站右侧地面，字幕为手绘气泡。
  if (layout === "runway") return {
    slide: { position: "absolute", left: "50%", top: "5%", transform: "translateX(-50%)", padding: 12, width: "min(64%, 760px)", background: "#fff", zIndex: 2 },
    subtitle: { position: "absolute", right: 232, bottom: 150, width: "min(34%, 360px)", padding: "14px 20px", background: "var(--paper-card)", zIndex: 3 },
    presenter: { position: "absolute", right: 110, bottom: 26, width: 170, textAlign: "center", zIndex: 2 },
  };
  // C · 极简画中画：深底，幻灯片放到最大，字幕嵌入幻灯片内，角色圆形画中画。
  if (layout === "pip") return {
    slide: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(86%, 1000px)", background: "#fff", boxShadow: "0 14px 40px rgba(0,0,0,.35)", borderRadius: 8, overflow: "hidden" },
    subtitle: null, // pip 字幕渲染在幻灯片内部（见 main）
    presenter: { position: "absolute", right: 46, bottom: 26, width: 138, height: 138, borderRadius: "50%", background: "var(--paper)", border: "3px solid var(--ink)", boxShadow: "0 8px 22px rgba(0,0,0,.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", zIndex: 4 },
  };
  // A · 角落小台：幻灯片偏左，角色在右下角小台上，字幕深色条。
  return {
    slide: { position: "absolute", left: "44%", top: "5%", transform: "translateX(-50%)", padding: 12, width: "min(63%, 820px)", background: "#fff", zIndex: 2 },
    subtitle: { position: "absolute", left: "44%", bottom: 38, transform: "translateX(-50%)", width: "min(64%, 760px)", padding: "12px 20px", background: "rgba(59,51,46,.93)", zIndex: 3 },
    presenter: { position: "absolute", right: 32, bottom: 20, width: 240, textAlign: "center", zIndex: 2 },
  };
}
