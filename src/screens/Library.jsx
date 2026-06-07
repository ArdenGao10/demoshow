import { useEffect, useRef, useState } from "react";
import { ALL_FORMS, CHIBI, FormGlyph, HUMANS, PETS, findForm } from "../lib/characters.jsx";

const CATS = [["all", "全部"], ["human", "人物"], ["pet", "宠物"], ["chibi", "Q版"]];
// 五种"性格档案":每个 form 按 id 哈希到固定一种,所以每次点同一只小人,反应都一样,像有脾气。
const REACTIONS = ["jump", "spin", "wiggle", "wave", "shimmy"];
function reactionFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return REACTIONS[h % REACTIONS.length];
}

// 抽屉形态:从右侧滑入,盖在当前页之上。点空白处或 × 关闭。
export default function Library({ formId, onUse, onClose }) {
  const [cat, setCat] = useState("all");
  const [pick, setPick] = useState(formId);
  const [reacting, setReacting] = useState({}); // { formId: animationName }
  const [party, setParty] = useState(false);    // "派对"按钮:全员同时摇摆
  const reactTimers = useRef({});
  const forms = cat === "all" ? ALL_FORMS : ALL_FORMS.filter((f) => f.kind === cat);
  const selected = findForm(pick);

  // 卸载时清掉所有挂在 timeout 的 reaction 状态。
  useEffect(() => () => { Object.values(reactTimers.current).forEach(clearTimeout); }, []);

  const clickCard = (f) => {
    setPick(f.id);
    // 重新触发动画:先清掉旧的、下一帧再写入新的,react 才会重启 CSS animation。
    setReacting((r) => { const c = { ...r }; delete c[f.id]; return c; });
    if (reactTimers.current[f.id]) clearTimeout(reactTimers.current[f.id]);
    requestAnimationFrame(() => {
      const r = reactionFor(f.id);
      setReacting((prev) => ({ ...prev, [f.id]: r }));
      reactTimers.current[f.id] = setTimeout(() => {
        setReacting((prev) => { const c = { ...prev }; delete c[f.id]; return c; });
        delete reactTimers.current[f.id];
      }, 900);
    });
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <header style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
          <b className="h-title" style={{ fontSize: 19 }}>形态素材库</b>
          <span className="hand" style={{ fontSize: 17, color: "var(--ink-soft)" }}>挑一个替你出场的小伙伴</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>{CATS.map(([k, label]) => <button key={k} className="chip" onClick={() => setCat(k)} style={{ cursor: "pointer", background: cat === k ? "var(--orange-pale)" : "#fff" }}>{label}</button>)}</div>
          <button onClick={() => setParty((p) => !p)} className="chip" title="让所有小人跳起来" style={{ cursor: "pointer", background: party ? "var(--orange)" : "#fff", color: party ? "#fff" : "var(--ink)", borderColor: party ? "var(--orange-deep)" : "var(--ink)" }}>{party ? "停下" : "派对!"}</button>
          <button onClick={onClose} className="icon-btn" style={{ width: 36, height: 36 }} aria-label="关闭素材库">×</button>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "22px 26px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 16 }}>
            {forms.map((f) => {
              const cls = party ? "char-party" : (reacting[f.id] ? `char-react-${reacting[f.id]}` : "");
              return <button key={f.id} onClick={() => clickCard(f)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink)" }}>
                <div className="sketch lib-card" style={{ height: 142, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", background: pick === f.id ? "var(--orange-pale)" : "#fff", borderColor: pick === f.id ? "var(--orange-deep)" : "var(--ink)" }}>
                  <div className={cls} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: "100%" }}>
                    <FormGlyph form={f} height={122} />
                  </div>
                  {pick === f.id && <b style={{ position: "absolute", top: -8, right: -8, background: "var(--orange-deep)", color: "#fff", borderRadius: "50%", padding: 4 }}>✓</b>}
                </div>
                <div style={{ fontWeight: 700, marginTop: 7 }}>{f.name}</div>
              </button>;
            })}
          </div>
          <FollowPet />
        </main>
        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderTop: "2px solid rgba(59,51,46,.12)", background: "var(--paper-card)" }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>当前选中:<b style={{ color: "var(--ink)", marginLeft: 6 }}>{selected?.name}</b> · 点小人会看到他们的小情绪 ✨</span>
          <button className="btn-demi" style={{ padding: "9px 18px", fontSize: 15 }} onClick={() => onUse(pick)}>用「{selected?.name}」 →</button>
        </footer>
      </div>
    </div>
  );
}

// 跟着鼠标懒洋洋追的小宠 —— 用 ref + 直接改 style,避开每帧 setState 的开销。
// 用 mousemove 监听 main 区域,所以滚动 / 切分类不会丢失目标。
function FollowPet() {
  const ref = useRef(null);
  useEffect(() => {
    const pet = ref.current;
    if (!pet) return;
    const main = pet.parentElement; // <main>
    if (!main) return;
    const onMove = (e) => {
      const rect = main.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + main.scrollTop;
      pet.style.left = x + "px";
      pet.style.top = y + "px";
      pet.style.opacity = 1;
    };
    const onLeave = () => { pet.style.opacity = 0.45; }; // 鼠标移走时不彻底消失,让它待在最后看到的地方
    main.addEventListener("mousemove", onMove);
    main.addEventListener("mouseleave", onLeave);
    return () => { main.removeEventListener("mousemove", onMove); main.removeEventListener("mouseleave", onLeave); };
  }, []);
  // PETS[0] 是黑猫尾尾;改成 CHIBI[0] 是小小 Demi,看个人喜好。这里用宠物更"宠物感"。
  const pet = PETS[0] || CHIBI[0] || HUMANS[0];
  return (
    <div ref={ref} className="lib-pet" style={{ left: -100, top: -100, opacity: 0.45 }} aria-hidden="true">
      <div><FormGlyph form={pet} height={42} /></div>
    </div>
  );
}
