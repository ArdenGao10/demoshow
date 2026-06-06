import { useState } from "react";
import { FormGlyph, HUMANS, PETS, CHIBI } from "../lib/characters.jsx";
import { BlackCat, GrassTuft, WoodFloor } from "../lib/demi.jsx";
import PaletteDots from "../components/PaletteDots.jsx";

const PICKS = [HUMANS[3], HUMANS[1], PETS[0], CHIBI[0], HUMANS[9]];

export default function Landing({ user, onStart, onLogin, onLogout }) {
  const [info, setInfo] = useState("");
  return (
    <div className="screen speckle">
      <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
        <Brand />
        <div style={{ display: "flex", alignItems: "center", gap: 24, color: "var(--ink-soft)", fontWeight: 600 }}>
          <button style={navButton} onClick={() => setInfo("how")}>怎么用</button><button style={navButton} onClick={onStart}>看例子</button><button style={navButton} onClick={() => setInfo("price")}>价格</button><PaletteDots compact />
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
          <p style={{ fontSize: 16, color: "var(--ink-soft)", maxWidth: 420, lineHeight: 1.65, margin: "0 0 28px" }}>
            选一个讲解搭子，传上你的 HTML 幻灯片。她替你写讲稿、开口讲解，你不用出镜，也不用紧张。
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button className="btn-demi" onClick={onStart}>开始制作 →</button>
            <button className="btn-ghost" onClick={onStart}>▶ 看 Demi 怎么讲</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30 }}>
            <span className="hand" style={{ fontSize: 19, color: "var(--orange-deep)" }}>选一个形态出场</span>
            {PICKS.map((form) => <button aria-label={`选择 ${form.name}`} onClick={onStart} key={form.id} style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", background: "#fff", border: "2.4px solid var(--ink)", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "pointer", padding: 0 }}><FormGlyph form={form} height={60} /></button>)}
          </div>
        </section>
        <section style={{ position: "relative", height: "100%" }}>
          <div className="sketch alt" style={{ position: "absolute", right: 90, top: 70, width: 230, height: 145, transform: "rotate(-5deg)", padding: 16 }}>
            <div style={{ height: 12, width: "60%", background: "var(--paper-2)", borderRadius: 8, marginBottom: 12 }} />
            <div style={{ height: 8, width: "86%", background: "var(--paper-2)", borderRadius: 8, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 58 }}><i style={{ flex: 1, height: "45%", background: "var(--orange-pale)" }} /><i style={{ flex: 1, height: "75%", background: "var(--orange)" }} /><i style={{ flex: 1, height: "100%", background: "var(--orange-deep)" }} /></div>
          </div>
          <div className="tag" style={{ top: 90, right: 24, transform: "rotate(-8deg)" }}>hi! 我先帮你练一遍~</div>
          <FormGlyph form={HUMANS[5]} className="sway" style={{ height: 290, position: "absolute", left: 86, bottom: 96, zIndex: 2 }} />
          <WoodFloor width={520} height={62} style={{ width: 520, position: "absolute", left: 0, bottom: 56 }} />
          <BlackCat style={{ height: 56, position: "absolute", right: 70, bottom: 70 }} />
          <GrassTuft style={{ height: 38, position: "absolute", left: 36, bottom: 92 }} />
        </section>
      </main>
      {info && <div onClick={() => setInfo("")} style={{ position: "absolute", inset: 0, background: "#3b332e66", zIndex: 10, display: "grid", placeItems: "center" }}><div onClick={(e) => e.stopPropagation()} className="sketch" style={{ width: 480, padding: 28, position: "relative" }}><button onClick={() => setInfo("")} className="icon-btn" style={{ position: "absolute", right: 14, top: 14, width: 32, height: 32 }}>×</button>{info === "how" ? <><h2 className="h-title">三步完成演示</h2><p>1. 选择尾尾或其他形态与舞台位置。</p><p>2. 上传 HTML 幻灯片，让 AI 生成逐页讲稿。</p><p>3. 点一次播放，自动朗读并连续翻页。</p></> : <><h2 className="h-title">演示版价格</h2><p><b>本地演示：免费</b></p><p>配置自己的智谱 GLM Key 后即可使用真实 AI 讲稿生成。</p></>}<button className="btn-demi" onClick={() => { setInfo(""); onStart(); }}>开始制作 →</button></div></div>}
    </div>
  );
}
const navButton = { border: 0, background: "transparent", color: "var(--ink-soft)", fontWeight: 700, cursor: "pointer" };

export function Brand() {
  return <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 23 }}><span style={{ color: "var(--orange-deep)" }}>✦</span>Demi</div>;
}
