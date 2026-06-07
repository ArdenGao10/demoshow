import { useCallback, useEffect, useRef, useState } from "react";
import { FormGlyph } from "../lib/characters.jsx";
import { BlackCat, GrassTuft, WoodFloor } from "../lib/demi.jsx";
import SlideFrame from "../components/SlideFrame.jsx";
import { cancel, loadVoices, pause, pickVoice, resume, speak } from "../lib/tts.js";
import { fetchClip } from "../lib/voiceClip.js";

// 1×～2× 倍速可调；1× 为云端自然语音的原始语速。
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const LAYOUT_LABELS = { corner: "角落", runway: "舞台", pip: "画中画" };

export default function Play({ form, deck, scripts, layout: initialLayout, onExit }) {
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chars, setChars] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [subtitles, setSubtitles] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [preparing, setPreparing] = useState(false); // 已点播放、正在取/合成云端语音（声音还没到位）
  const [layout, setLayout] = useState(initialLayout || "corner");
  const [aiVoice, setAiVoice] = useState(() => localStorage.getItem("demi_ai_voice") !== "0"); // 默认开;由主页设置统一管理
  const [voiceErr, setVoiceErr] = useState("");
  const autoRef = useRef(false);
  const startedPageRef = useRef(-1);
  const audioRef = useRef(null);        // 云端配音用的 <audio>
  const engineRef = useRef("browser"); // 当前在播的引擎：cloud | browser
  const reqIdRef = useRef(0);          // 作废过期的异步取声请求（翻页/切换时自增）
  const lineAt = (i) => scripts?.[i]?.line || deck?.slides[i]?.text || "";
  const line = lineAt(page);
  const count = deck?.slides.length || 0;
  const voice = voices[voiceIndex] || null;

  useEffect(() => {
    loadVoices().then((all) => {
      const chinese = all.filter((v) => /^zh|cmn/i.test(v.lang) || /中文|chinese|普通话/i.test(v.name));
      const available = chinese.length ? chinese : all;
      const savedName = localStorage.getItem("demi_voice_name");
      const saved = savedName ? available.find((v) => v.name === savedName) : null;
      const preferred = saved || pickVoice(available);
      setVoices(available);
      setVoiceIndex(Math.max(0, available.indexOf(preferred)));
    });
    audioRef.current = new Audio();
    return () => { stopAudio(); cancel(); };
  }, []);

  // 配音错误提示 6 秒自动消失（绝大多数错误是单次抖动，没必要整场挂着）。
  useEffect(() => {
    if (!voiceErr) return;
    const id = setTimeout(() => setVoiceErr(""), 6000);
    return () => clearTimeout(id);
  }, [voiceErr]);

  const stopAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.onended = a.ontimeupdate = a.onerror = null;
    a.pause();
  };

  // 倍速实时生效：拖动/点按改变 rate 时，正在播的云端音频立刻变速（变速不变调）。
  useEffect(() => {
    const a = audioRef.current;
    if (a) { a.preservesPitch = true; a.playbackRate = rate; }
  }, [rate]);

  const narrate = useCallback(async () => {
    startedPageRef.current = page;
    const myReq = ++reqIdRef.current;
    // 先彻底停掉上一段（云端音频 + 浏览器语音），避免叠音/“滴滴”杂音。
    cancel();
    stopAudio();
    if (!line) {
      // 空白页：别卡住自动连播，直接跳下一页。
      if (autoRef.current && page < count - 1) setTimeout(() => setPage((p) => p + 1), 120);
      return;
    }
    setChars(0);
    // 注意：先别 setPlaying(true)。嘴巴动画/进度条都由 playing 驱动，
    // 而云端音频还要 await fetchClip 合成/取声，这中间若已开口就会“嘴动+进度走、声音没到”。
    // 改为：拿到音频、真正 play() 的那一刻才进入“说话中”。

    const onEnd = () => {
      setChars(line.length);
      setPlaying(false);
      if (autoRef.current && page < count - 1) {
        setTimeout(() => setPage((p) => p + 1), 180);
      } else if (page === count - 1) {
        autoRef.current = false;
      }
    };
    const playBrowser = () => {
      engineRef.current = "browser";
      setPreparing(false);
      setPlaying(true); // 浏览器语音没有可靠的就绪事件，开口即视为说话中
      speak(line, {
        voice,
        rate,
        pitch: 1,
        onBoundary: ({ charIndex }) => setChars(Math.max(1, charIndex)),
        onEnd,
      });
    };

    if (aiVoice) {
      try {
        setPreparing(true); // 取/合成期间给个“准备中”反馈，但不开口、不走进度
        const url = await fetchClip(line); // 已预取的页会命中缓存，几乎瞬时返回
        if (myReq !== reqIdRef.current) return; // 期间用户已翻页/切换，丢弃这次结果
        setVoiceErr("");
        engineRef.current = "cloud";
        cancel(); // 双保险：确保此刻没有浏览器语音在响
        const a = audioRef.current;
        a.pause();
        a.onended = onEnd;
        a.ontimeupdate = () => { if (a.duration) setChars(Math.round(line.length * (a.currentTime / a.duration))); };
        // 只有真正的媒体解码错误才回退，避免换源时的伪 error 触发叠音。
        a.onerror = () => { if (myReq === reqIdRef.current && a.error) playBrowser(); };
        a.src = url;
        a.preservesPitch = true;
        a.playbackRate = rate;
        await a.play(); // 解析即代表音频已开始出声
        if (myReq !== reqIdRef.current) { a.pause(); return; } // 等待期间又翻页了
        setPreparing(false);
        setPlaying(true); // 声音真正到位，这一刻才开口 + 走进度，三者同步
        return;
      } catch (e) {
        if (myReq !== reqIdRef.current) return;
        setVoiceErr(e?.status === 402 ? "智谱语音配额不足，已用浏览器语音（充值后自动恢复）" : "AI 配音暂不可用，已用浏览器语音");
        // 落到下面的浏览器语音兜底
      }
    }
    playBrowser();
  }, [line, voice, rate, page, count, aiVoice]);

  useEffect(() => {
    if (autoRef.current && startedPageRef.current !== page) {
      const id = setTimeout(narrate, 120);
      return () => clearTimeout(id);
    }
  }, [page, narrate]);

  // 预取下一页的云端音频，翻页时就能立刻开口，不用等合成。
  useEffect(() => {
    if (!aiVoice || page + 1 >= count) return;
    const next = lineAt(page + 1);
    if (next) fetchClip(next).catch(() => {});
  }, [page, aiVoice, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // 浏览器语音没有可靠的时间轴，用定时器估算进度；云端配音改由 <audio> 的 timeupdate 驱动。
    if (!playing || engineRef.current !== "browser") return;
    const id = setInterval(() => setChars((c) => Math.min(line.length, c + 1)), Math.max(30, 58 / rate));
    return () => clearInterval(id);
  }, [playing, line, rate]);

  // Flap the mouth open/closed while speaking so the character reads as talking.
  useEffect(() => {
    if (!playing) { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen((m) => !m), 170);
    return () => clearInterval(id);
  }, [playing]);

  const go = (next) => {
    autoRef.current = false;
    reqIdRef.current++; // 作废进行中的取声请求
    cancel();
    stopAudio();
    setPreparing(false);
    setPlaying(false);
    setChars(0);
    setPage(Math.max(0, Math.min(count - 1, next)));
  };

  const toggle = () => {
    // 正在取/合成云端语音：再点一次当作取消，避免重复发起。
    if (preparing && !playing) {
      reqIdRef.current++;
      stopAudio();
      autoRef.current = false;
      setPreparing(false);
      return;
    }
    if (playing) {
      if (engineRef.current === "cloud") audioRef.current?.pause();
      else pause();
      autoRef.current = false;
      setPlaying(false);
      return;
    }
    if (chars > 0 && chars < line.length) {
      autoRef.current = true;
      setPlaying(true);
      if (engineRef.current === "cloud") audioRef.current?.play().catch(() => {});
      else resume();
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

  const positions = layoutStyles(layout);
  return <div className="screen" style={{ display: "flex", flexDirection: "column", background: layout === "pip" ? "#2b2622" : "var(--paper)" }}>
    <header style={{ height: 52, flex: "0 0 52px", display: "flex", alignItems: "center", gap: 12, padding: "0 18px", borderBottom: "2px solid rgba(59,51,46,.12)", background: "var(--paper)" }}>
      <b><span style={{ color: "var(--orange-deep)" }}>✦ Demi</span><span style={{ color: "var(--ink-soft)" }}> · {deck?.name} · {form?.name}</span></b>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>{Object.entries(LAYOUT_LABELS).map(([id, label]) => <button key={id} className="chip" onClick={() => setLayout(id)} style={{ cursor: "pointer", background: layout === id ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
      <button className="btn-ghost" style={{ padding: "5px 14px", fontSize: 13 }} onClick={() => { cancel(); stopAudio(); onExit(); }}>退出</button>
    </header>
    <main className="speckle" style={{ flex: 1, position: "relative", background: layout === "pip" ? "#2b2622" : "var(--paper-2)", overflow: "hidden", minHeight: 0 }}>
      <div className="chip" style={{ position: "absolute", left: 24, top: 20, zIndex: 6, background: layout === "pip" ? "rgba(255,255,255,.92)" : "#fff" }}>第 {String(page + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} 页</div>
      {voiceErr && <div className="chip" style={{ position: "absolute", right: 24, top: 20, zIndex: 6, maxWidth: 320, background: "#FBE7DE", color: "#b5651d", whiteSpace: "normal", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ flex: 1 }}>{voiceErr}</span><button onClick={() => setVoiceErr("")} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#b5651d", fontWeight: 700, padding: 0, lineHeight: 1 }} aria-label="关闭">×</button></div>}

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
              <div style={{ maxWidth: "78%", background: "rgba(59,51,46,.9)", color: "#fff", fontSize: 15, lineHeight: 1.5, padding: "8px 18px", borderRadius: 20 }}>{line}</div>
            </div>
          )}
        </div>
      </div>

      {/* corner / runway subtitle (runway = hand-drawn speech bubble) */}
      {layout !== "pip" && subtitles && (
        layout === "runway"
          ? <div className="sketch r2" style={positions.subtitle}>
              <span style={{ fontSize: 16.5, lineHeight: 1.45 }}><b style={{ color: "var(--orange-deep)", marginRight: 8 }}>{form?.name}:</b><span style={{ color: "var(--ink)" }}>{line}</span></span>
              <svg width="40" height="26" style={{ position: "absolute", right: 34, bottom: -22 }} aria-hidden="true"><path d="M4 2 Q20 22 36 4" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="2.6" /></svg>
            </div>
          : <div className="sketch r2" style={positions.subtitle}><b style={{ color: "var(--orange)", marginRight: 12 }}>{form?.name}</b><span style={{ color: "#fff", fontSize: 17, lineHeight: 1.5 }}>{line}</span></div>
      )}

      <PresenterStage form={form} playing={playing} preparing={preparing} mouthOpen={mouthOpen} layout={layout} style={positions.presenter} />
    </main>
    <footer style={{ height: 76, flex: "0 0 76px", display: "flex", alignItems: "center", gap: 14, padding: "0 26px", borderTop: "2.4px solid var(--ink)", background: "var(--paper-card)" }}>
      <button className="icon-btn" disabled={page === 0} onClick={() => go(page - 1)}>⏮</button>
      <button className="icon-btn big" onClick={toggle} title={preparing && !playing ? "正在准备语音，点一下可取消" : undefined}>{playing ? "❚❚" : preparing ? "···" : "▶"}</button>
      <button className="icon-btn" disabled={page === count - 1} onClick={() => go(page + 1)}>⏭</button>
      <div style={{ flex: 1, height: 12, border: "2px solid var(--ink)", borderRadius: 20, overflow: "hidden" }}><div style={{ width: `${((page + chars / Math.max(1, line.length)) / count) * 100}%`, height: "100%", background: "var(--orange)" }} /></div>
      <button className="chip" onClick={() => setSubtitles((v) => !v)} style={{ cursor: "pointer", background: subtitles ? "var(--orange-pale)" : "#fff" }}>字幕 {subtitles ? "开" : "关"}</button>
      <button className="chip" onClick={() => setRate((r) => SPEEDS[(SPEEDS.indexOf(r) + 1) % SPEEDS.length])} style={{ cursor: "pointer" }}>{rate}×</button>
    </footer>
  </div>;
}

function PresenterStage({ form, playing, preparing, mouthOpen, layout, style }) {
  // Animate the mouth while speaking (open/closed) instead of a frozen "wow".
  const expr = playing ? (mouthOpen ? "wow" : "happy") : "smile";
  const glyph = <FormGlyph form={form} expr={expr} className={playing ? "talk" : ""} height={layout === "pip" ? 120 : 155} />;

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

  // B · 通栏地面 — presenter paces slowly back and forth on the shared floor while talking.
  if (layout === "runway") return (
    <div style={style}>
      <div className={playing ? "demi-pace" : "sway"} style={{ height: 152, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>{glyph}</div>
    </div>
  );

  // A · 角落小台 — presenter on its own little wood platform with a grass tuft.
  return (
    <div style={style}>
      <div className="hand" style={{ color: "var(--orange-deep)", fontSize: 18 }}>{playing ? "正在讲这一页…" : preparing ? "正在准备语音…" : "点 ▶ 后会自动连播~"}</div>
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
    presenter: { position: "absolute", right: 46, bottom: 22, width: 150, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 4 },
  };
  // A · 角落小台：幻灯片偏左，角色在右下角小台上，字幕深色条。
  return {
    slide: { position: "absolute", left: "44%", top: "5%", transform: "translateX(-50%)", padding: 12, width: "min(63%, 820px)", background: "#fff", zIndex: 2 },
    subtitle: { position: "absolute", left: "44%", bottom: 38, transform: "translateX(-50%)", width: "min(64%, 760px)", padding: "12px 20px", background: "rgba(59,51,46,.93)", zIndex: 3 },
    presenter: { position: "absolute", right: 32, bottom: 20, width: 240, textAlign: "center", zIndex: 2 },
  };
}
