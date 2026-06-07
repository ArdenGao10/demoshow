import { useEffect } from "react";
import { FormGlyph, HUMANS, PETS, CHIBI, findForm, DEFAULT_FORM_ID } from "../lib/characters.jsx";
import { formFrames } from "../lib/charFrames.jsx";
import { start as demiStart, stop as demiStop } from "../lib/demiWidget.js";
import { Sparkle, ArrowUp } from "../lib/icons.jsx";

// 纯演示界面：进来只看不改，Demi 自动走一遍「制作界面」的各个区域，
// 一步步告诉用户这里怎么传、那里怎么切换、最后怎么生成讲解。
const PICKS = [HUMANS[3], HUMANS[1], PETS[0], CHIBI[0], HUMANS[9]];

const TOUR = [
  { selector: "#demo-form", line: "欢迎来看演示！我是 Demi。先看这儿——制作时第一步，挑一个出场形态，我就用这个样子替你讲。" },
  { selector: "#demo-tabs", line: "这里是两种玩法：一种是上传 PPT 帮你讲，另一种是把我嵌进你自己的网站帮你讲，点一下就能切换。" },
  { selector: "#demo-upload", line: "用 PPT 模式的话，把你的 HTML 幻灯片拖到这个框里就行，我会自动识别每一页。" },
  { selector: "#demo-embed", line: "如果选嵌入网站，你只要写好导览词、复制这段嵌入代码贴到自己网站，我就能走到每个区块旁边指着讲。" },
  { selector: "#demo-tone", line: "再挑个讲解语气，轻松亲切、专业稳重，还是元气满满，随你。" },
  { selector: "#demo-generate", line: "最后点这里「生成讲解」，我就开口讲了。整个过程你不用出镜、不用录音。要不要自己上手做一个？" },
];

export default function Demo({ onBack, onStart }) {
  useEffect(() => {
    const frames = formFrames(findForm(DEFAULT_FORM_ID)); // 尾尾
    // 默认不自动开讲：让用户自己点底部播放按钮,小人和讲解同时启动,体验更可控。
    const t = setTimeout(() => demiStart(TOUR, { auto: false, frames }), 500);
    return () => { clearTimeout(t); demiStop(); };
  }, []);

  const card = { background: "#fff", border: "2px solid var(--ink)", borderRadius: 14, padding: 18 };
  const tabStyle = (active) => ({ padding: "9px 18px", fontWeight: 700, borderRadius: 30, border: "2.4px solid var(--ink)", background: active ? "var(--orange-pale)" : "#fff", borderColor: active ? "var(--orange-deep)" : "var(--ink)" });

  return (
    <div className="screen speckle" style={{ display: "flex", flexDirection: "column" }}>
      <header style={{ height: 60, flex: "0 0 60px", display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
        <button onClick={onBack} style={{ border: 0, background: "transparent", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--ink)" }}><span style={{ fontSize: 22 }}>←</span><span className="h-title">返回主页</span></button>
        <span className="chip" style={{ background: "var(--orange-pale)", borderColor: "var(--orange-deep)" }}>演示模式 · 只看不改</span>
        <span className="hand" style={{ fontSize: 18, color: "var(--ink-soft)" }}>跟着 Demi 走一遍，看她怎么讲、每步怎么操作</span>
        <button className="btn-demi" style={{ marginLeft: "auto", padding: "9px 18px", fontSize: 15 }} onClick={onStart}>我也要做一个 →</button>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 30 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 20 }}>
          <div className="hand" style={{ fontSize: 21, color: "var(--ink-soft)" }}>这是「制作界面」的样子 · Demi 会一站一站带你看 ↓</div>

          <section id="demo-form" style={card}>
            <b className="h-title">① 选一个形态</b>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {PICKS.map((f) => <div key={f.id} className="sketch" style={{ height: 84, width: 72, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "#fff" }}><FormGlyph form={f} height={74} /></div>)}
            </div>
          </section>

          <section id="demo-tabs" style={{ ...card, display: "flex", gap: 12, alignItems: "center" }}>
            <b className="h-title" style={{ marginRight: 6 }}>② 选玩法</b>
            <span style={tabStyle(true)}>上传 PPT 帮你讲</span>
            <span style={tabStyle(false)}>嵌入网站帮你讲</span>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <section id="demo-upload" className="sketch-dash" style={{ padding: 22, textAlign: "center", background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><ArrowUp size={26} color="var(--ink-soft)" /></div>
              <b>拖 HTML 幻灯片到这里</b>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>上传 PPT 模式</div>
            </section>
            <section id="demo-embed" style={card}>
              <b>嵌入代码</b>
              <pre style={{ margin: "8px 0 0", padding: "10px 12px", background: "#2b2622", color: "#f3e9d8", fontSize: 11.5, lineHeight: 1.5, borderRadius: 8, overflow: "hidden" }}>{'<script src="demi-widget.js">\n</script>\nDemiTour.start([...])'}</pre>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>嵌入网站模式</div>
            </section>
          </div>

          <section id="demo-tone" style={{ ...card, display: "flex", gap: 10, alignItems: "center" }}>
            <b className="h-title" style={{ marginRight: 6 }}>③ 讲解语气</b>
            {["轻松亲切", "专业稳重", "元气满满"].map((t, i) => <span key={t} className="chip" style={{ background: i === 0 ? "var(--orange-pale)" : "#fff", borderColor: i === 0 ? "var(--orange-deep)" : "var(--ink)" }}>{t}</span>)}
          </section>

          <button id="demo-generate" className="btn-demi" style={{ justifyContent: "center", pointerEvents: "none" }}><Sparkle size={18} color="#fff" /> 生成讲解 →</button>
        </div>
      </main>
    </div>
  );
}
