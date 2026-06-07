import { useState } from "react";
import { ALL_FORMS, CHIBI, FormGlyph, HUMANS, PETS, findForm } from "../lib/characters.jsx";

const CATS = [["all", "全部"], ["human", "人物"], ["pet", "宠物"], ["chibi", "Q版"]];

// 抽屉形态:从右侧滑入,盖在当前页之上。点空白处或 × 关闭。
export default function Library({ formId, onUse, onClose }) {
  const [cat, setCat] = useState("all");
  const [pick, setPick] = useState(formId);
  const forms = cat === "all" ? ALL_FORMS : ALL_FORMS.filter((f) => f.kind === cat);
  const selected = findForm(pick);
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <header style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
          <b className="h-title" style={{ fontSize: 19 }}>形态素材库</b>
          <span className="hand" style={{ fontSize: 17, color: "var(--ink-soft)" }}>挑一个替你出场的小伙伴</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>{CATS.map(([k, label]) => <button key={k} className="chip" onClick={() => setCat(k)} style={{ cursor: "pointer", background: cat === k ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
          <button onClick={onClose} className="icon-btn" style={{ width: 36, height: 36 }} aria-label="关闭素材库">×</button>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 16 }}>
            {forms.map((f) => <button key={f.id} onClick={() => setPick(f.id)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink)" }}>
              <div className="sketch lib-card" style={{ height: 142, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", background: pick === f.id ? "var(--orange-pale)" : "#fff", borderColor: pick === f.id ? "var(--orange-deep)" : "var(--ink)" }}>
                <FormGlyph form={f} height={122} />
                {pick === f.id && <b style={{ position: "absolute", top: -8, right: -8, background: "var(--orange-deep)", color: "#fff", borderRadius: "50%", padding: 4 }}>✓</b>}
              </div>
              <div style={{ fontWeight: 700, marginTop: 7 }}>{f.name}</div>
            </button>)}
          </div>
        </main>
        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderTop: "2px solid rgba(59,51,46,.12)", background: "var(--paper-card)" }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>当前选中:<b style={{ color: "var(--ink)", marginLeft: 6 }}>{selected?.name}</b></span>
          <button className="btn-demi" style={{ padding: "9px 18px", fontSize: 15 }} onClick={() => onUse(pick)}>用「{selected?.name}」 →</button>
        </footer>
      </div>
    </div>
  );
}
