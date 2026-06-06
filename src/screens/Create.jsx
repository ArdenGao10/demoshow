import { useEffect, useRef, useState } from "react";
import { FormGlyph, HUMANS, PETS, CHIBI, findForm } from "../lib/characters.jsx";
import { parseDeckHtml, SAMPLE_DECK_HTML } from "../lib/slides.js";
import SlideFrame from "../components/SlideFrame.jsx";
import { start as demiStart, stop as demiStop } from "../lib/demiWidget.js";
import { formFrames } from "../lib/charFrames.jsx";

const PICKS = [HUMANS[5], HUMANS[3], HUMANS[1], PETS[0], CHIBI[0]];
const LAYOUTS = [
  ["corner", "角落陪讲", "小人待在右下角，不挡内容"],
  ["runway", "舞台讲解", "幻灯片居中，小人在下方舞台"],
  ["pip", "画中画", "幻灯片最大，小人缩成圆形徽章"],
];

export default function Create({ formId, tone, layout, error, onPickForm, onPickTone, onPickLayout, onOpenLibrary, onGenerate, onBack }) {
  const inputRef = useRef(null);
  const [deck, setDeck] = useState(null);
  const [reading, setReading] = useState(false);
  const [mode, setMode] = useState("ppt"); // ppt | embed
  const form = findForm(formId);

  const loadFile = async (file) => {
    if (!file) return;
    setReading(true);
    try {
      const parsed = parseDeckHtml(await file.text(), file.name);
      if (!parsed.slides.length) throw new Error("没有识别到幻灯片页面");
      setDeck(parsed);
    } catch (err) {
      window.alert(err.message || "HTML 读取失败");
    } finally { setReading(false); }
  };
  const useSample = () => setDeck(parseDeckHtml(SAMPLE_DECK_HTML, "northwind-demo.html"));
  const clearDeck = () => { setDeck(null); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className="screen speckle" style={{ display: "flex", flexDirection: "column" }}>
      <header style={{ height: 60, flex: "0 0 60px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: "2px solid rgba(59,51,46,.12)" }}>
        <button onClick={onBack} style={linkButton}><span style={{ fontSize: 22 }}>←</span><span className="h-title">新建演示</span></button>
        <div style={{ display: "flex", gap: 8 }}>
          {[["ppt", "上传 PPT 帮你讲"], ["embed", "嵌入网站帮你讲"]].map(([id, label]) => (
            <button key={id} onClick={() => { demiStop(); setMode(id); }} className="sketch r2" style={{ cursor: "pointer", padding: "8px 16px", fontWeight: 700, background: mode === id ? "var(--orange-pale)" : "#fff", borderColor: mode === id ? "var(--orange-deep)" : "var(--ink)" }}>{label}</button>
          ))}
        </div>
        <span className="hand" style={{ fontSize: 19, color: "var(--ink-soft)" }}>草稿已保存 ✓</span>
      </header>
      {mode === "embed" ? (
        <EmbedPanel form={form} formId={formId} onPickForm={onPickForm} onOpenLibrary={onOpenLibrary} />
      ) : (
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "440px 1fr", minHeight: 0 }}>
        <aside style={{ padding: "24px 30px", overflowY: "auto", borderRight: "2px solid rgba(59,51,46,.12)" }}>
          <Step title="① 选一个形态" hint="她会用这个样子替你出场" action={<button style={textButton} onClick={onOpenLibrary}>逛素材库 →</button>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
              {PICKS.map((f) => <button key={f.id} onClick={() => onPickForm(f.id)} className="sketch" style={{ height: 78, padding: 2, cursor: "pointer", position: "relative", background: f.id === formId ? "var(--orange-pale)" : "#fff", borderColor: f.id === formId ? "var(--orange-deep)" : "var(--ink)" }}><FormGlyph form={f} height={68} />{f.id === formId && <b style={check}>✓</b>}</button>)}
              <button className="sketch-dash" onClick={onOpenLibrary} style={{ background: "transparent", cursor: "pointer", color: "var(--ink-soft)" }}>+<br /><small>更多</small></button>
            </div>
          </Step>
          <Step title="② 上传 HTML 幻灯片" hint="支持含多个 section / .slide 的 HTML">
            <input ref={inputRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
            {!deck ? (
              <>
                <div className="sketch-dash" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files?.[0]); }} style={{ padding: 18, textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 26 }}>⬆</div><b>{reading ? "正在读取…" : "拖到这里，或点击上传"}</b>
                </div>
                <button style={{ ...textButton, marginTop: 10 }} onClick={useSample}>没有文件？使用内置示例稿 →</button>
              </>
            ) : (() => {
              const m = deck.method || "";
              const how = m.startsWith("selector") ? `按 ${m.replace("selector ", "")} 切分`
                : m.startsWith("auto-split") ? "自动切分"
                : "整页（未识别到分页）";
              const lonely = deck.slides.length <= 1;
              return <div className="sketch r2" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: lonely ? "#FBE7DE" : undefined }}>
                <span><b>{deck.name}</b><br /><small style={{ color: "var(--ink-soft)" }}>{deck.slides.length} 页 · {how} · 已上传 {lonely ? "!" : "✓"}</small>{lonely && <><br /><small style={{ color: "#b5651d" }}>只识别到 1 页——若实为多页，建议用 section / .slide / .page 组织</small></>}</span>
                <button className="chip" onClick={clearDeck} title="删除并重新上传" style={{ cursor: "pointer", flexShrink: 0, color: "#b5651d", borderColor: "#b5651d" }}>🗑 删除</button>
              </div>;
            })()}
          </Step>
          <Step title="③ 讲解语气">
            <div style={{ display: "flex", gap: 8 }}>{["轻松亲切", "专业稳重", "元气满满"].map((t) => <button key={t} className="chip" onClick={() => onPickTone(t)} style={{ cursor: "pointer", background: tone === t ? "var(--orange-pale)" : "#fff", borderColor: tone === t ? "var(--orange-deep)" : "var(--ink)" }}>{t}</button>)}</div>
          </Step>
          <Step title="④ 选择演示形态" hint="来自 design 里的三种播放布局">
            <div style={{ display: "grid", gap: 8 }}>{LAYOUTS.map(([id, name, desc]) => <button key={id} onClick={() => onPickLayout(id)} className="sketch r2" style={{ cursor: "pointer", padding: "9px 12px", textAlign: "left", background: layout === id ? "var(--orange-pale)" : "#fff", borderColor: layout === id ? "var(--orange-deep)" : "var(--ink)" }}><b>{name}</b><small style={{ display: "block", color: "var(--ink-soft)", marginTop: 2 }}>{desc}</small></button>)}</div>
          </Step>
          {error && <div style={{ color: "#a33", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn-demi" disabled={!deck} onClick={() => onGenerate(deck)} style={{ width: "100%", justifyContent: "center", opacity: deck ? 1 : .45 }}>✨ 生成讲解 →</button>
        </aside>
        <section style={{ position: "relative", background: "var(--paper-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30 }}>
          <div className="hand" style={{ position: "absolute", top: 20, left: 28, fontSize: 21, color: "var(--ink-soft)" }}>舞台预览 · 你的幻灯片是主角 ↓</div>
          <div className="sketch" style={{ padding: 14, background: "#fff", width: "min(70vw, 650px)", position: "relative" }}>
            {deck ? <SlideFrame deck={deck} slide={deck.slides[0]} /> : <div style={{ aspectRatio: "16/9", background: "#fff", display: "grid", placeItems: "center", color: "var(--ink-soft)" }}>上传后在这里预览</div>}
            <PreviewPresenter form={form} layout={layout} />
          </div>
          <div className="hand" style={{ marginTop: 16, fontSize: 20, color: "var(--orange-deep)" }}>由「{form?.name}」出场 · 待在角落，不挡内容</div>
        </section>
      </div>
      )}
    </div>
  );
}

// 嵌入网站模式：左侧填导览词 + 生成嵌入代码，右侧示例网站可「本页试讲」。
const SAMPLE_SITES = [
  { selector: "#dm-hero", hint: "首屏标题" },
  { selector: "#dm-cta", hint: "行动按钮" },
  { selector: "#dm-feat1", hint: "功能点一" },
  { selector: "#dm-feat2", hint: "功能点二" },
  { selector: "#dm-board", hint: "排行榜" },
];
const DEFAULT_LINES = [
  "大家好，我是 Demi！先带你逛一圈这个网站。",
  "看到这个按钮了吗？点它就能直接开始，不用注册。",
  "第一个亮点在这儿——一句话就能讲清它好在哪。",
  "这是第二个亮点，配合前面用起来更顺手。",
  "最后看看这块，想了解更多随时点开。",
].join("\n");

function EmbedPanel({ form, formId, onPickForm, onOpenLibrary }) {
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);

  // 离开嵌入页面（切 Tab / 返回 / 退出）时，确保小人停下、闭嘴。
  useEffect(() => () => demiStop(), []);

  const lineArr = lines.split("\n").map((s) => s.trim()).filter(Boolean);
  const steps = lineArr.map((line, i) => ({ selector: SAMPLE_SITES[i % SAMPLE_SITES.length].selector, line }));

  const snippet = `<script src="https://your-cdn/demi-widget.js"></script>
<script>
  DemiTour.start([
${lineArr.map((l, i) => `    { selector: "#换成你的元素${i + 1}", line: ${JSON.stringify(l)} },`).join("\n")}
  ], { auto: true, name: ${JSON.stringify(form?.name || "Demi")} });
<\/script>`;

  const tryHere = () => {
    setPlaying(true);
    demiStart(steps, { auto: true, frames: formFrames(form), onDone: () => setPlaying(false) });
  };
  const copy = () => {
    navigator.clipboard?.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
  };

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "440px 1fr", minHeight: 0 }}>
      <aside style={{ padding: "24px 30px", overflowY: "auto", borderRight: "2px solid rgba(59,51,46,.12)" }}>
        <Step title="① 选一个形态" hint="她会用这个样子出现在你的网站上" action={<button style={textButton} onClick={onOpenLibrary}>逛素材库 →</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
            {PICKS.map((f) => <button key={f.id} onClick={() => onPickForm(f.id)} className="sketch" style={{ height: 78, padding: 2, cursor: "pointer", position: "relative", background: f.id === formId ? "var(--orange-pale)" : "#fff", borderColor: f.id === formId ? "var(--orange-deep)" : "var(--ink)" }}><FormGlyph form={f} height={68} />{f.id === formId && <b style={check}>✓</b>}</button>)}
            <button className="sketch-dash" onClick={onOpenLibrary} style={{ background: "transparent", cursor: "pointer", color: "var(--ink-soft)" }}>+<br /><small>更多</small></button>
          </div>
        </Step>
        <Step title="② 写好导览词" hint="一行一句，小人会一站一站走过去讲（先用示例网站试讲）">
          <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={7} className="sketch r2" style={{ width: "100%", resize: "vertical", padding: "10px 12px", font: "14px/1.6 inherit", color: "var(--ink)", background: "#fff" }} />
          <button className="btn-demi" disabled={!lineArr.length} onClick={tryHere} style={{ width: "100%", justifyContent: "center", marginTop: 12, opacity: lineArr.length ? 1 : .45 }}>{playing ? "▶ 试讲中…（右侧观看）" : "▶ 在示例网站里试讲一遍"}</button>
        </Step>
        <Step title="③ 拿到嵌入代码" hint="粘到你自己网站的 HTML 里，把 selector 换成你的真实元素即可">
          <pre className="sketch r2" style={{ margin: 0, padding: "12px 14px", background: "#2b2622", color: "#f3e9d8", fontSize: 12, lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre" }}>{snippet}</pre>
          <button style={{ ...textButton, marginTop: 10 }} onClick={copy}>{copied ? "已复制 ✓" : "复制嵌入代码"}</button>
        </Step>
      </aside>
      <section style={{ position: "relative", background: "var(--paper-2)", overflowY: "auto", padding: 30 }}>
        <div className="hand" style={{ fontSize: 21, color: "var(--ink-soft)", marginBottom: 14 }}>示例网站预览 · 点左侧「试讲」看小人走起来 ↓</div>
        <SampleSite />
      </section>
    </div>
  );
}

// 一个假的「示例网站」，给「本页试讲」当舞台。
function SampleSite() {
  const card = { background: "#fff", border: "2px solid var(--ink)", borderRadius: 14, padding: 18 };
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 18 }}>
      <div id="dm-hero" style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 30, fontWeight: 800 }}>星跳兔 🐰✨</div>
        <div style={{ color: "#7a6f64", marginTop: 6 }}>点一下就跳，看你能跳多高</div>
        <button id="dm-cta" style={{ marginTop: 22, padding: "14px 36px", fontSize: 18, fontWeight: 700, color: "#fff", background: "var(--orange)", border: "2.5px solid var(--ink)", borderRadius: 40, cursor: "pointer" }}>开始游戏</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div id="dm-feat1" style={card}><b>① 轻点起跳</b><div style={{ fontSize: 13, color: "#7a6f64", marginTop: 4 }}>点屏幕，小兔往上蹦一格。</div></div>
        <div id="dm-feat2" style={card}><b>② 踩星加分</b><div style={{ fontSize: 13, color: "#7a6f64", marginTop: 4 }}>连踩星星，分数翻倍。</div></div>
      </div>
      <div id="dm-board" style={card}>
        <b>本周高手</b>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 2px", borderBottom: "1px dashed #d8cdbd" }}><span>🥇 跳跳虎</span><span>12,840</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 2px" }}><span>🥈 星之子</span><span>11,209</span></div>
      </div>
    </div>
  );
}

function PreviewPresenter({ form, layout }) {
  const style = layout === "pip"
    ? { position: "absolute", right: 12, bottom: 8, width: 110, textAlign: "center" }
    : layout === "runway"
      ? { position: "absolute", right: "50%", transform: "translateX(50%)", bottom: -72, width: 130, textAlign: "center" }
      : { position: "absolute", right: 8, bottom: 4, width: 130, textAlign: "center" };
  return <div style={style}><FormGlyph form={form} height={layout === "pip" ? 92 : 100} /><div className="ground-oval" style={{ width: 96, height: 16, margin: "-12px auto 0" }} /></div>;
}

function Step({ title, hint, action, children }) {
  return <section style={{ marginBottom: 25 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b className="h-title">{title}</b>{action}</div>{hint && <div className="hand" style={{ fontSize: 18, color: "var(--ink-soft)", margin: "4px 0 12px" }}>{hint}</div>}{children}</section>;
}
const linkButton = { border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, color: "var(--ink)" };
const textButton = { border: 0, background: "transparent", color: "var(--orange-deep)", fontWeight: 700, cursor: "pointer", padding: 0 };
const check = { position: "absolute", top: -8, right: -8, background: "var(--orange-deep)", color: "#fff", width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--ink)" };
