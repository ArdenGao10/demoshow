import { useEffect, useState } from "react";
import { FormGlyph } from "../lib/characters.jsx";
import { BlackCat, GrassTuft } from "../lib/demi.jsx";
import { Brand } from "./Landing.jsx";

const STEPS = [
  (n) => `读完 ${n} 页幻灯片`,
  () => "弄懂每一页的重点",
  () => "写一份顺口的讲稿",
  () => "练一遍语气和停顿",
];

export default function Loading({ form, deck }) {
  const n = deck?.slides.length || 0;
  // 按页数估算总时长：每页 ~1.5s + 4s 基础，最少 8s，最多 60s。
  // 这是体感时长，不是真实 GLM 时长——讲稿到了 App.jsx 会立刻切 route 到 play。
  const totalMs = Math.min(60000, Math.max(8000, 4000 + n * 1500));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 120);
    return () => clearInterval(id);
  }, []);

  // 渐进 + 渐缓：用 1 - e^(-t/τ) 形状，前快后慢，但永远不到 100%，避免"卡在 100% 却还没切走"。
  const progress = 1 - Math.exp(-elapsed / (totalMs * 0.5));
  const pct = Math.min(0.96, progress);
  // 按进度推进步骤完成度：4 步均匀分到 0~96%。
  const doneSteps = Math.floor(pct * STEPS.length);

  return <div className="screen speckle" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", top: 26, left: 30 }}><Brand /></div>
    <div className="bob"><FormGlyph form={form} height={220} /></div><div className="ground-oval" style={{ width: 150, height: 22, marginTop: -20 }} />
    <h1 className="h-title" style={{ margin: "24px 0 6px" }}>{form?.name} 正在读你的幻灯片…</h1>
    <p className="hand" style={{ fontSize: 23, color: "var(--orange-deep)", margin: "0 0 24px" }}>马上就好，先帮你把开场练顺~</p>
    <div className="sketch" style={{ padding: "18px 26px", width: 390 }}>
      {STEPS.map((label, i) => {
        const state = i < doneSteps ? "done" : i === doneSteps ? "doing" : "todo";
        return <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", opacity: state === "todo" ? .45 : 1 }}>
          <b style={{ color: state === "done" ? "var(--sage)" : state === "doing" ? "var(--orange-deep)" : "var(--ink-soft)" }}>{state === "done" ? "✓" : state === "doing" ? "◌" : "○"}</b>
          <span style={{ fontWeight: 600 }}>{label(n)}</span>
        </div>;
      })}
      <div style={{ height: 12, border: "2px solid var(--ink)", borderRadius: 20, overflow: "hidden", marginTop: 12 }}><div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: "var(--orange)", transition: "width .3s ease-out" }} /></div>
    </div>
    <BlackCat style={{ height: 52, position: "absolute", bottom: 46, right: 150 }} /><GrassTuft style={{ height: 32, position: "absolute", bottom: 44, left: 170 }} />
  </div>;
}
