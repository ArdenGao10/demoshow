import { useState } from "react";
import { ALL_FORMS, CHIBI, FormGlyph, HUMANS, PETS, findForm } from "../lib/characters.jsx";

const CATS = [["all", "全部"], ["human", "人物"], ["pet", "宠物"], ["chibi", "Q版"]];

export default function Library({ formId, onUse, onBack }) {
  const [cat, setCat] = useState("all");
  const [pick, setPick] = useState(formId);
  const forms = cat === "all" ? ALL_FORMS : ALL_FORMS.filter((f) => f.kind === cat);
  const selected = findForm(pick);
  return (
    <div className="screen speckle" style={{ display: "flex", flexDirection: "column" }}>
      <header style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 18, padding: "8px 30px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
        <button onClick={onBack} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>←</button>
        <b className="h-title" style={{ fontSize: 19 }}>形态素材库</b>
        <span className="hand" style={{ fontSize: 18, color: "var(--ink-soft)" }}>挑一个替你出场的小伙伴</span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>{CATS.map(([k, label]) => <button key={k} className="chip" onClick={() => setCat(k)} style={{ cursor: "pointer", background: cat === k ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
        <button className="btn-demi" style={{ padding: "9px 18px", fontSize: 15 }} onClick={() => onUse(pick)}>用「{selected?.name}」 →</button>
      </header>
      <main style={{ flex: 1, overflowY: "auto", padding: "26px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(100px, 1fr))", gap: 18 }}>
          {forms.map((f) => <button key={f.id} onClick={() => setPick(f.id)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink)" }}><div className="sketch lib-card" style={{ height: 142, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", background: pick === f.id ? "var(--orange-pale)" : "#fff", borderColor: pick === f.id ? "var(--orange-deep)" : "var(--ink)" }}><FormGlyph form={f} height={122} />{pick === f.id && <b style={{ position: "absolute", top: -8, right: -8, background: "var(--orange-deep)", color: "#fff", borderRadius: "50%", padding: 4 }}>✓</b>}</div><div style={{ fontWeight: 700, marginTop: 7 }}>{f.name}</div></button>)}
        </div>
      </main>
    </div>
  );
}
