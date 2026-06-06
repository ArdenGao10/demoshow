import { FormGlyph } from "../lib/characters.jsx";
import { BlackCat, GrassTuft } from "../lib/demi.jsx";
import { Brand } from "./Landing.jsx";

export default function Loading({ form, deck }) {
  return <div className="screen speckle" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", top: 26, left: 30 }}><Brand /></div>
    <div className="bob"><FormGlyph form={form} height={220} /></div><div className="ground-oval" style={{ width: 150, height: 22, marginTop: -20 }} />
    <h1 className="h-title" style={{ margin: "24px 0 6px" }}>{form?.name} 正在读你的幻灯片…</h1>
    <p className="hand" style={{ fontSize: 23, color: "var(--orange-deep)", margin: "0 0 24px" }}>马上就好，先帮你把开场练顺~</p>
    <div className="sketch" style={{ padding: "18px 26px", width: 390 }}>
      {["读完 " + (deck?.slides.length || 0) + " 页幻灯片", "弄懂每一页的重点", "写一份顺口的讲稿", "练一遍语气和停顿"].map((t, i) => <div key={t} style={{ display: "flex", gap: 12, padding: "8px 0", opacity: i < 3 ? 1 : .45 }}><b style={{ color: i < 2 ? "var(--sage)" : "var(--orange-deep)" }}>{i < 2 ? "✓" : i === 2 ? "◌" : "○"}</b><span style={{ fontWeight: 600 }}>{t}</span></div>)}
      <div style={{ height: 12, border: "2px solid var(--ink)", borderRadius: 20, overflow: "hidden", marginTop: 12 }}><div style={{ width: "68%", height: "100%", background: "var(--orange)" }} /></div>
    </div>
    <BlackCat style={{ height: 52, position: "absolute", bottom: 46, right: 150 }} /><GrassTuft style={{ height: 32, position: "absolute", bottom: 44, left: 170 }} />
  </div>;
}
