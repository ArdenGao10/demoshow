import { useEffect, useState } from "react";
import { FormGlyph, HUMANS, PETS, CHIBI } from "../lib/characters.jsx";
import { BlackCat, GrassTuft, WoodFloor } from "../lib/demi.jsx";
import { loadVoices, pickVoice } from "../lib/tts.js";
import PaletteDots from "../components/PaletteDots.jsx";

const PICKS = [HUMANS[3], HUMANS[1], PETS[0], CHIBI[0], HUMANS[9]];

export default function Landing({ user, onStart, onDemo, onLibrary, onLogin, onLogout }) {
  const [info, setInfo] = useState("");
  return (
    <div className="screen speckle">
      <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
        <Brand />
        <div style={{ display: "flex", alignItems: "center", gap: 24, color: "var(--ink-soft)", fontWeight: 600 }}>
          <button style={navButton} onClick={() => setInfo("how")}>指南</button><button style={navButton} onClick={() => setInfo("settings")}>设置</button>
          {user ? <><span>你好，{user.name}</span><button className="btn-ghost" style={{ padding: "8px 18px" }} onClick={onLogout}>退出</button></> : <button className="btn-ghost" style={{ padding: "8px 18px" }} onClick={onLogin}>登录 / 注册</button>}
        </div>
      </header>
      <main style={{ height: "calc(100% - 64px)", display: "grid", gridTemplateColumns: "1.05fr 1fr", alignItems: "center" }}>
        <section style={{ padding: "0 20px 56px 64px", zIndex: 1 }}>
          <div className="chip" style={{ marginBottom: 22 }}>✦ 不用出镜的 AI 演示助手</div>
          <h1 className="h-hero" style={{ fontSize: 62, lineHeight: 1.02, margin: "0 0 14px" }}>
            Demi does<br />your demo.
            <svg width="300" height="20" style={{ display: "block" }}><path d="M6 12 Q150 2 292 10" stroke="var(--orange)" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
          </h1>
          <p style={{ fontSize: 22, fontWeight: 600, margin: "16px 0 8px" }}>She pitches so you don't have to.</p>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", maxWidth: 440, lineHeight: 1.65, margin: "0 0 28px" }}>
            选一个讲解搭子，传上你的 HTML 幻灯片——或者把她嵌进你自己的网站。她替你写讲稿、开口讲解，你不用出镜，也不用紧张。
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button className="btn-demi" onClick={onStart}>开始制作 →</button>
            <button className="btn-ghost" onClick={onDemo}>▶ 看 Demi 怎么讲</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30 }}>
            <span className="hand" style={{ fontSize: 19, color: "var(--orange-deep)" }}>选一个形态出场 →</span>
            {PICKS.map((form) => <button aria-label={`在素材库选择 ${form.name}`} title={`${form.name} · 去素材库挑`} onClick={onLibrary} key={form.id} className="demi-pick" style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", display: "flex", alignItems: "flex-end" }}><FormGlyph form={form} height={76} /></button>)}
          </div>
        </section>
        <section style={{ position: "relative", height: "100%" }}>
          <div className="sketch alt" style={{ position: "absolute", right: 90, top: 70, width: 230, height: 145, transform: "rotate(-5deg)", padding: 16 }}>
            <div style={{ height: 12, width: "60%", background: "var(--paper-2)", borderRadius: 8, marginBottom: 12 }} />
            <div style={{ height: 8, width: "86%", background: "var(--paper-2)", borderRadius: 8, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 58 }}><i style={{ flex: 1, height: "45%", background: "var(--orange-pale)" }} /><i style={{ flex: 1, height: "75%", background: "var(--orange)" }} /><i style={{ flex: 1, height: "100%", background: "var(--orange-deep)" }} /></div>
          </div>
          <div className="tag" style={{ top: 90, right: 24, transform: "rotate(-8deg)" }}>hi! 我来帮你讲 Demo~</div>
          <FormGlyph form={HUMANS[5]} className="sway" style={{ height: 290, position: "absolute", left: 86, bottom: 96, zIndex: 2 }} />
          <WoodFloor width={520} height={62} style={{ width: 520, position: "absolute", left: 0, bottom: 56 }} />
          <BlackCat style={{ height: 56, position: "absolute", right: 70, bottom: 70 }} />
          <GrassTuft style={{ height: 38, position: "absolute", left: 36, bottom: 92 }} />
        </section>
      </main>
      {info && <div onClick={() => setInfo("")} style={{ position: "absolute", inset: 0, background: "#3b332e66", zIndex: 10, display: "grid", placeItems: "center" }}><div onClick={(e) => e.stopPropagation()} className="sketch" style={{ width: 480, padding: 28, position: "relative" }}><button onClick={() => setInfo("")} className="icon-btn" style={{ position: "absolute", right: 14, top: 14, width: 32, height: 32 }}>×</button>{info === "how" ? <>
        <h2 className="h-title">两种讲法，任选其一</h2>
        <p><b>① 上传 PPT 帮你讲</b>：传上 HTML 幻灯片，AI 生成逐页讲稿，点一次播放就自动朗读、连续翻页。</p>
        <p><b>② 嵌入网站帮你讲</b>：写好导览词、拿一段嵌入代码贴进你自己的网站，小人就能走到每个区块旁边指着讲解。</p>
        <button className="btn-demi" onClick={() => { setInfo(""); onStart(); }}>开始制作 →</button>
      </> : <SettingsPanel onDone={() => setInfo("")} />}</div></div>}
    </div>
  );
}

function SettingsPanel({ onDone }) {
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState(() => localStorage.getItem("demi_voice_name") || "");
  const [aiVoice, setAiVoice] = useState(() => localStorage.getItem("demi_ai_voice") !== "0");

  useEffect(() => {
    loadVoices().then((all) => {
      const chinese = all.filter((v) => /^zh|cmn/i.test(v.lang) || /中文|chinese|普通话/i.test(v.name));
      const available = chinese.length ? chinese : all;
      setVoices(available);
      // 没存过偏好就把推荐音色记下来,Play 直接用。
      if (!voiceName) {
        const preferred = pickVoice(available);
        if (preferred) { setVoiceName(preferred.name); localStorage.setItem("demi_voice_name", preferred.name); }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPickVoice = (e) => { const n = e.target.value; setVoiceName(n); localStorage.setItem("demi_voice_name", n); };
  const onToggleAi = () => { const v = !aiVoice; setAiVoice(v); localStorage.setItem("demi_ai_voice", v ? "1" : "0"); };

  return <>
    <h2 className="h-title">设置</h2>
    <div style={{ margin: "14px 0 8px" }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>主页配色</div>
      <PaletteDots />
    </div>
    <div style={{ margin: "18px 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>AI 配音</div>
        <button className="chip" onClick={onToggleAi} style={{ cursor: "pointer", background: aiVoice ? "var(--orange-pale)" : "#fff", borderColor: aiVoice ? "var(--orange-deep)" : "var(--ink)" }}>{aiVoice ? "已开启" : "已关闭"}</button>
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>开启时讲解使用智谱云端自然语音；不可用时自动回退到浏览器音色。</div>
    </div>
    <div style={{ margin: "18px 0 8px" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>浏览器回退音色</div>
      <select className="field" value={voiceName} onChange={onPickVoice} style={{ width: "100%", padding: "8px 12px", fontSize: 14 }}>
        {voices.length ? voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>) : <option value="">系统中文音色（加载中…）</option>}
      </select>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>AI 配音不可用时,用这把音色继续讲。</div>
    </div>
    <button className="btn-ghost" onClick={onDone} style={{ marginTop: 12 }}>完成</button>
  </>;
}
const navButton = { border: 0, background: "transparent", color: "var(--ink-soft)", fontWeight: 700, cursor: "pointer" };

export function Brand() {
  return <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 23 }}><span style={{ color: "var(--orange-deep)" }}>✦</span>Demi</div>;
}
