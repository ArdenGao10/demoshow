import { useEffect, useRef, useState } from "react";
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
    const id = setInterval(() => setElapsed(Date.now() - t0), 80);
    return () => clearInterval(id);
  }, []);

  // 渐进 + 渐缓：用 1 - e^(-t/τ) 形状，前快后慢，但永远不到 100%，避免"卡在 100% 却还没切走"。
  const progress = 1 - Math.exp(-elapsed / (totalMs * 0.5));
  const pct = Math.min(0.96, progress);
  // 把总进度均分到每一步：当前在做的步骤会显示自己的小进度条。
  const stepSize = 1 / STEPS.length;
  const stepIndex = Math.min(STEPS.length - 1, Math.floor(pct / stepSize));

  return <div className="screen speckle" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", top: 26, left: 30 }}><Brand /></div>
    <div className="bob"><FormGlyph form={form} height={220} /></div><div className="ground-oval" style={{ width: 150, height: 22, marginTop: -20 }} />
    <h1 className="h-title" style={{ margin: "24px 0 6px" }}>{form?.name} 正在读你的幻灯片…</h1>
    <p className="hand" style={{ fontSize: 23, color: "var(--orange-deep)", margin: "0 0 24px" }}>马上就好，先帮你把开场练顺~</p>
    <div className="sketch" style={{ padding: "18px 26px", width: 420 }}>
      {STEPS.map((label, i) => {
        const localPct = Math.max(0, Math.min(1, (pct - i * stepSize) / stepSize));
        const state = i < stepIndex ? "done" : i === stepIndex ? "doing" : "todo";
        const labelColor = state === "done" ? "var(--sage)" : state === "doing" ? "var(--orange-deep)" : "var(--ink-soft)";
        return <div key={i} style={{ padding: "6px 0", opacity: state === "todo" ? .5 : 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 18, display: "inline-flex", justifyContent: "center", color: labelColor, fontWeight: 700 }}>
              {state === "done" ? "✓" : state === "doing" ? <span className="loading-spinner" /> : "○"}
            </span>
            <span style={{ fontWeight: 600, flex: 1 }}>{label(n)}</span>
            <span style={{ fontSize: 13, color: "var(--ink-soft)", minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(localPct * 100)}%
            </span>
          </div>
          <div style={{ height: 6, border: "1.5px solid var(--ink)", borderRadius: 12, overflow: "hidden", marginTop: 4, marginLeft: 28, background: "var(--paper-2)" }}>
            <div
              className={state === "doing" ? "loading-bar-active" : ""}
              style={{
                width: `${Math.round(localPct * 100)}%`,
                height: "100%",
                background: state === "doing" ? undefined : state === "done" ? "var(--sage)" : "var(--orange)",
                transition: "width .2s ease-out",
              }}
            />
          </div>
        </div>;
      })}
      <WalkPath form={form} pct={pct} stepIndex={stepIndex} />
    </div>
    <BlackCat style={{ height: 52, position: "absolute", bottom: 46, right: 150 }} /><GrassTuft style={{ height: 32, position: "absolute", bottom: 44, left: 170 }} />
  </div>;
}

// 顶替原本的横向进度条:画一条手绘小路,小人随进度从左走到右,终点立着一面小旗。
// 进度信息仍在,但视觉上跟上面四条小进度条不重复——它讲的是"走到了哪儿",而不是"填了多少"。
// 小人用 .walk-step 急促节奏的走路动画(替代慢慢飘的 .bob),每完成一步(stepIndex 增加)
// 切到 .walk-cheer 跳一下表示开心,800ms 后再恢复走路。
function WalkPath({ form, pct, stepIndex }) {
  const [cheer, setCheer] = useState(false);
  const prevStep = useRef(stepIndex);
  useEffect(() => {
    if (stepIndex > prevStep.current) {
      setCheer(true);
      const id = setTimeout(() => setCheer(false), 820);
      prevStep.current = stepIndex;
      return () => clearTimeout(id);
    }
    prevStep.current = stepIndex;
  }, [stepIndex]);

  // 小路在容器内的有效区间:左留 4%、右留 16%(给小旗 + 小人不超出)。
  const left = 4 + pct * 80; // 4% → 84%
  return (
    <div style={{ position: "relative", height: 64, marginTop: 16 }}>
      <svg width="100%" height="64" viewBox="0 0 400 64" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <g filter="url(#sketch)" strokeLinecap="round" fill="none">
          {/* 主路:一条带轻微起伏的手绘线 */}
          <path d="M14 44 Q90 40 170 44 T336 44" stroke="var(--ink)" strokeWidth="2.6" />
          {/* 虚线小石子作前进刻度 */}
          <path d="M14 44 Q90 40 170 44 T336 44" stroke="var(--ink-soft)" strokeWidth="2" strokeDasharray="3 9" opacity=".6" />
          {/* 沿路三小撮草丛点缀 */}
          <path d="M92 44 q-3 -7 -1 -10 q3 -1 4 4 q3 -6 6 -4 q1 5 -2 10" stroke="var(--sage)" strokeWidth="1.8" />
          <path d="M196 44 q-3 -8 0 -11 q3 0 4 5 q3 -6 6 -4 q1 5 -2 10" stroke="var(--sage)" strokeWidth="1.8" />
          {/* 终点:旗杆 + 三角旗,旗子用橙色填充 */}
          <line x1="348" y1="14" x2="348" y2="50" stroke="var(--ink)" strokeWidth="2.4" />
          <path d="M348 16 L378 22 L348 30 Z" fill="var(--orange)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: `${left}%`,
          bottom: 20,
          transform: "translateX(-50%)",
          transition: "left .35s cubic-bezier(.4,.0,.4,1)",
        }}
      >
        <div className={cheer ? "walk-cheer" : "walk-step"}>
          <FormGlyph form={form} height={48} />
        </div>
      </div>
    </div>
  );
}
