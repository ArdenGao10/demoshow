import { useEffect, useRef, useState } from "react";
import { ALL_FORMS, CHIBI, FormGlyph, HUMANS, PETS, findForm } from "../lib/characters.jsx";

const CATS = [["all", "全部"], ["human", "人物"], ["pet", "宠物"], ["chibi", "Q版"]];

// 按角色 id 显式映射到一种"性格小动作"。理念:动作贴名字 ——
//   兔子蹦三下、猫咪歪头蹭、狗狗摇尾巴、青蛙猛跳、博士/老胡老派鞠躬、阿刺甩头、毛豆/Q团团小弹跳……
const REACTION_BY_ID = {
  // 宠物 —— 跟动物本性走
  p1: "catSway",   q4: "catSway",
  p2: "dogWag",
  p3: "hop3",      q5: "hop3",
  p4: "bearLumber",
  p5: "bearLumber",
  p6: "frogLeap",
  // 人物 —— 跟名字/造型的暗示走
  h3: "headBang",  q2: "headBang",  // 阿刺/Q阿刺:刺头甩头
  h5: "spin360",                     // 小缎:丝滑转
  h7: "spin360",                     // 团团:滚一圈
  h10: "bow",                        // 博士
  h11: "bow",                        // 老胡
  h4: "hop3",                        // 波波
  h9: "hop3",                        // 毛豆
  q3: "spin360",                     // Q长发
};
function reactionFor(form) {
  return REACTION_BY_ID[form.id] || "wave"; // 其余统一招手 + 小跳
}

// 抽屉形态:从右侧滑入,盖在当前页之上。点空白处或 × 关闭。
export default function Library({ formId, onUse, onClose }) {
  const [cat, setCat] = useState("all");
  const [pick, setPick] = useState(formId);
  const [reacting, setReacting] = useState({}); // { formId: animationName }
  const [party, setParty] = useState(false);    // 派对模式:每张卡乱起跳
  const reactTimers = useRef({});
  const forms = cat === "all" ? ALL_FORMS : ALL_FORMS.filter((f) => f.kind === cat);
  const selected = findForm(pick);

  useEffect(() => () => { Object.values(reactTimers.current).forEach(clearTimeout); }, []);

  const clickCard = (f) => {
    setPick(f.id);
    // 先清掉旧动画 state、下一帧再写入,React 才会重启 CSS animation。
    setReacting((r) => { const c = { ...r }; delete c[f.id]; return c; });
    if (reactTimers.current[f.id]) clearTimeout(reactTimers.current[f.id]);
    requestAnimationFrame(() => {
      const r = reactionFor(f);
      setReacting((prev) => ({ ...prev, [f.id]: r }));
      // 不同动作时长不同 —— 跳跃类长些、转圈短些。
      const dur = r === "frogLeap" ? 1100 : r === "hop3" ? 1100 : r === "spin360" ? 850 : r === "bow" ? 950 : 900;
      reactTimers.current[f.id] = setTimeout(() => {
        setReacting((prev) => { const c = { ...prev }; delete c[f.id]; return c; });
        delete reactTimers.current[f.id];
      }, dur);
    });
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <header style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
          <b className="h-title" style={{ fontSize: 19 }}>形态素材库</b>
          <span className="hand" style={{ fontSize: 17, color: "var(--ink-soft)" }}>挑一个替你出场的小伙伴</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>{CATS.map(([k, label]) => <button key={k} className="chip" onClick={() => setCat(k)} style={{ cursor: "pointer", background: cat === k ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
          <button onClick={() => setParty((p) => !p)} className="chip" title="让所有小人从框里跳出来" style={{ cursor: "pointer", background: party ? "var(--orange)" : "#fff", color: party ? "#fff" : "var(--ink)", borderColor: party ? "var(--orange-deep)" : "var(--ink)" }}>{party ? "停下" : "派对!"}</button>
          <button onClick={onClose} className="icon-btn" style={{ width: 36, height: 36 }} aria-label="关闭素材库">×</button>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 16 }}>
            {forms.map((f, i) => {
              // 派对模式下每个卡片用同一个 keyframes 但错峰起跳,看着像一锅乱炖。
              const partyDelay = ((i * 137) % 11) * 0.07; // 0~0.7s 之间分布
              const inner = party
                ? "char-party-pop"
                : reacting[f.id] ? `char-react-${reacting[f.id]}` : "";
              return <button key={f.id} onClick={() => clickCard(f)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink)" }}>
                <div className="sketch lib-card" style={{ height: 142, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", background: pick === f.id ? "var(--orange-pale)" : "#fff", borderColor: pick === f.id ? "var(--orange-deep)" : "var(--ink)", overflow: "visible" }}>
                  <div className={inner} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: "100%", "--party-delay": `${partyDelay}s` }}>
                    <FormGlyph form={f} height={122} />
                  </div>
                  {pick === f.id && <b style={{ position: "absolute", top: -8, right: -8, background: "var(--orange-deep)", color: "#fff", borderRadius: "50%", padding: 4, zIndex: 2 }}>✓</b>}
                </div>
                <div style={{ fontWeight: 700, marginTop: 7 }}>{f.name}</div>
              </button>;
            })}
          </div>
        </main>
        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderTop: "2px solid rgba(59,51,46,.12)", background: "var(--paper-card)" }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>当前选中:<b style={{ color: "var(--ink)", marginLeft: 6 }}>{selected?.name}</b> · 点小人看 TA 的小情绪 ✨</span>
          <button className="btn-demi" style={{ padding: "9px 18px", fontSize: 15 }} onClick={() => onUse(pick)}>用「{selected?.name}」 →</button>
        </footer>
      </div>
    </div>
  );
}
