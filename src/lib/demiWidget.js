// demiWidget.js — 产品内可 import 的「悬浮讲解小人」运行时（ESM 版）。
// 与根目录可外发的 demi-widget.js 同一套逻辑；这里导出给功能页「本页试讲」预览用。
import { fetchClip } from "./voiceClip.js";
const INK = "#3B332E", PAPER = "#FBF3E4";
const C = { accent: "#E8915B", blush: "#F3B58C", shoe: "#C9702F" };

function injectOnce() {
  if (document.getElementById("demi-widget-style")) return;
  const css = document.createElement("style");
  css.id = "demi-widget-style";
  css.textContent = `
    #demi-char{position:fixed;left:0;top:0;z-index:2147483600;width:96px;
      transition:transform .9s cubic-bezier(.45,.05,.35,1);pointer-events:none;
      display:flex;flex-direction:column;align-items:center;}
    #demi-char.walking #demi-svg{animation:demiBob .32s linear infinite;}
    #demi-char #demi-svg{transition:transform .25s ease;transform-origin:bottom center;}
    #demi-char.flip #demi-svg{transform:scaleX(-1);}
    #demi-char.flip.walking #demi-svg{animation:demiBobFlip .32s linear infinite;}
    @keyframes demiBob{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-4px) rotate(1.5deg)}}
    @keyframes demiBobFlip{0%,100%{transform:scaleX(-1) translateY(0) rotate(1.5deg)}50%{transform:scaleX(-1) translateY(-4px) rotate(-1.5deg)}}
    #demi-bubble{max-width:min(78vw,560px);width:max-content;margin-bottom:6px;background:#3B332E;color:#fff;
      font:14px/1.5 -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
      padding:8px 16px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);text-align:center;
      opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;position:relative;}
    #demi-bubble.show{opacity:1;transform:translateY(0);}
    #demi-bubble:after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-7px;
      border:7px solid transparent;border-top-color:#3B332E;border-bottom:0;}
    #demi-ring{position:fixed;z-index:2147483590;pointer-events:none;border:3px dashed ${C.accent};
      border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.04);opacity:0;
      transition:all .5s cubic-bezier(.45,.05,.35,1);}
    #demi-ring.show{opacity:1;}
    #demi-bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);
      z-index:2147483610;display:flex;align-items:center;gap:8px;background:#FBF3E4;
      border:2.5px solid #3B332E;border-radius:30px;padding:7px 12px;box-shadow:0 10px 30px rgba(0,0,0,.2);
      font:13px -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#3B332E;}
    #demi-bar button{cursor:pointer;border:2px solid #3B332E;background:#fff;color:#3B332E;
      width:34px;height:34px;border-radius:50%;font-size:14px;line-height:1;
      display:flex;align-items:center;justify-content:center;}
    #demi-bar button.big{width:40px;height:40px;background:${C.accent};color:#fff;border-color:#3B332E;}
    #demi-bar button.rate{width:auto;padding:0 12px;border-radius:18px;font-weight:700;}
    #demi-bar button:disabled{opacity:.35;cursor:default;}
    #demi-bar .step{min-width:42px;text-align:center;font-weight:600;}
    #demi-play.hint{animation:demiPlayPulse 1.4s ease-in-out infinite;}
    @keyframes demiPlayPulse{
      0%,100%{box-shadow:0 0 0 0 rgba(232,145,91,.7);transform:scale(1);}
      50%{box-shadow:0 0 0 14px rgba(232,145,91,0);transform:scale(1.08);}
    }
    #demi-play-hint{
      position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);
      white-space:nowrap;font:600 13px -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
      color:#3B332E;background:#FBF3E4;border:2.4px solid #3B332E;border-radius:18px;
      padding:7px 14px;box-shadow:0 5px 14px rgba(0,0,0,.18);pointer-events:none;
      animation:demiHintBob 1.1s ease-in-out infinite;
    }
    #demi-play-hint:after{
      content:"";position:absolute;left:50%;bottom:-9px;margin-left:-7px;
      border:7px solid transparent;border-top-color:#3B332E;border-bottom:0;
    }
    #demi-play-hint:before{
      content:"";position:absolute;left:50%;bottom:-6px;margin-left:-5px;
      border:5px solid transparent;border-top-color:#FBF3E4;border-bottom:0;z-index:1;
    }
    @keyframes demiHintBob{
      0%,100%{transform:translateX(-50%) translateY(0);}
      50%{transform:translateX(-50%) translateY(-5px);}
    }
  `;
  document.head.appendChild(css);
}

function face(expr) {
  const eyes = `<circle cx="67" cy="47" r="4" fill="${INK}"/><circle cx="86" cy="47" r="4" fill="${INK}"/>
    <circle cx="68.4" cy="45.6" r="1.2" fill="#fff"/><circle cx="87.4" cy="45.6" r="1.2" fill="#fff"/>`;
  const blush = `<ellipse cx="58" cy="57" rx="6.5" ry="4.4" fill="${C.blush}" opacity=".7"/>
    <ellipse cx="93" cy="57" rx="6.5" ry="4.4" fill="${C.blush}" opacity=".7"/>`;
  const mouth = expr === "talk"
    ? `<ellipse cx="76.5" cy="63" rx="4.6" ry="6" fill="${INK}"/>`
    : `<path d="M68 61 q8.5 7 17 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  return blush + eyes + mouth;
}
function headBody() {
  return `
    <path d="M75 80 C99 80 101 112 99 130 C97 150 88 161 75 161 C62 161 53 150 51 130 C49 112 51 80 75 80 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="76" cy="48" r="33" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    <path d="M76 16 q10 -7 6 -15 q-1 7 -6 10" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M54 81 q22 13 44 0" stroke="${C.accent}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M95 82 q7 9 3 19" stroke="${C.accent}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
}
const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="3.4"/>`;
const shoe = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="11" ry="6.5" fill="${C.shoe}" stroke="${INK}" stroke-width="3"/></g>`;

function svg(pose, expr) {
  let limbs;
  if (pose === "point") {
    limbs = `
      <path d="M67 159 L62 184" stroke="${INK}" stroke-width="4"/>
      <path d="M85 159 L90 184" stroke="${INK}" stroke-width="4"/>
      ${shoe(59, 187, -8)}${shoe(93, 187, 8)}
      <path d="M53 100 C45 114 44 124 47 132" stroke="${INK}" stroke-width="4"/>
      <path d="M97 96 L128 66" stroke="${INK}" stroke-width="4"/>
      ${headBody()}${hand(47, 134)}
      <circle cx="130" cy="64" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="3.4"/>
      <path d="M132 60 l7 -7" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
  } else {
    limbs = `
      <path d="M67 159 L63 184" stroke="${INK}" stroke-width="4"/>
      <path d="M85 159 L89 184" stroke="${INK}" stroke-width="4"/>
      ${shoe(60, 187, -7)}${shoe(92, 187, 7)}
      <path d="M53 100 C45 114 44 124 47 132" stroke="${INK}" stroke-width="4"/>
      <path d="M99 100 C107 114 108 124 105 132" stroke="${INK}" stroke-width="4"/>
      ${headBody()}${hand(47, 134)}${hand(105, 134)}`;
  }
  return `<svg id="demi-svg" width="96" viewBox="0 0 160 210" fill="none">
    <defs><filter id="demiSketch" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>
    <g filter="url(#demiSketch)" stroke-linecap="round" stroke-linejoin="round">${limbs}${face(expr)}</g>
  </svg>`;
}

let voice = null;
function loadVoice() {
  const pick = () => {
    const vs = window.speechSynthesis?.getVoices() || [];
    voice = vs.find((v) => /^zh|cmn/i.test(v.lang)) || vs.find((v) => /中文|chinese/i.test(v.name)) || null;
  };
  pick();
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pick;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2]; // 倍速可选（变速不变调）
let charEl, bubbleEl, ringEl, svgWrap, barEl, stepLabel, btnPlay, btnRate, audioEl;
let steps = [], idx = -1, auto = false, mouthTimer = null, onDone = null, reqId = 0;
let rate = 1.25, frames = null; // 默认 1.25×，讲得不那么慢；frames=自定义形象的两帧

function buildDom() {
  injectOnce();
  charEl = document.createElement("div");
  charEl.id = "demi-char";
  bubbleEl = document.createElement("div");
  bubbleEl.id = "demi-bubble";
  svgWrap = document.createElement("div");
  setPose("idle", "smile"); // 用自定义形象 / 内置 Demi 初始化
  charEl.appendChild(bubbleEl);
  charEl.appendChild(svgWrap);
  document.body.appendChild(charEl);
  audioEl = new Audio(); // 云端配音用

  ringEl = document.createElement("div");
  ringEl.id = "demi-ring";
  document.body.appendChild(ringEl);

  barEl = document.createElement("div");
  barEl.id = "demi-bar";
  barEl.innerHTML = `
    <button id="demi-prev" title="上一站">◀</button>
    <button id="demi-play" class="big" title="播放/暂停">▶</button>
    <button id="demi-next" title="下一站">▶</button>
    <span class="step" id="demi-step">0/0</span>
    <button id="demi-rate" class="rate" title="讲解倍速">${rate}×</button>
    <button id="demi-close" title="结束">✕</button>`;
  document.body.appendChild(barEl);
  stepLabel = barEl.querySelector("#demi-step");
  btnPlay = barEl.querySelector("#demi-play");
  btnRate = barEl.querySelector("#demi-rate");
  btnPlay.style.position = "relative"; // 让 #demi-play-hint 能挂在它头顶
  barEl.querySelector("#demi-prev").onclick = () => { auto = false; clearPlayHint(); go(idx - 1); };
  barEl.querySelector("#demi-next").onclick = () => { auto = false; clearPlayHint(); go(idx + 1); };
  barEl.querySelector("#demi-close").onclick = stop;
  btnPlay.onclick = togglePlay;
  btnRate.onclick = cycleRate;
}

function showPlayHint() {
  if (!btnPlay) return;
  btnPlay.classList.add("hint");
  if (btnPlay.querySelector("#demi-play-hint")) return;
  const h = document.createElement("div");
  h.id = "demi-play-hint";
  h.textContent = "点这里开始 ↓";
  btnPlay.appendChild(h);
}
function clearPlayHint() {
  if (!btnPlay) return;
  btnPlay.classList.remove("hint");
  btnPlay.querySelector("#demi-play-hint")?.remove();
}

// 切换倍速；正在播的云端音频立即变速（保持音调）。
function cycleRate() {
  rate = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
  if (btnRate) btnRate.textContent = `${rate}×`;
  if (audioEl) { audioEl.preservesPitch = true; audioEl.playbackRate = rate; }
}

// 设置当前形象姿态：有自定义形象就用它的两帧；否则用内置 Demi。
function setPose(pose, expr) {
  if (!svgWrap) return;
  const open = expr === "talk" || expr === "wow";
  if (frames) {
    svgWrap.innerHTML = open ? frames.talk : frames.idle;
    const s = svgWrap.querySelector("svg");
    if (s) s.id = "demi-svg"; // 让 bob/flip 动画作用到它
  } else {
    svgWrap.innerHTML = svg(pose, expr);
  }
}
function startMouth() {
  stopMouth();
  let open = false;
  mouthTimer = setInterval(() => { open = !open; setPose("point", open ? "talk" : "smile"); }, 170);
}
function stopMouth() { if (mouthTimer) { clearInterval(mouthTimer); mouthTimer = null; } }

// 先彻底停掉正在播的声音（云端音频 + 浏览器语音），避免叠音。
function silence() {
  try { window.speechSynthesis.cancel(); } catch (e) {}
  if (audioEl) { audioEl.onended = audioEl.onerror = null; audioEl.pause(); }
}

// 优先用智谱云端配音（质朴自然，与 PPT 模式同一把声音）；失败自动回退浏览器语音。
// 关键：嘴型只在「声音真正开始」时才动，避免嘴动了声音还没出来。
function speak(text, then) {
  const my = ++reqId;
  silence();
  let done = false;
  const finish = () => { if (done || my !== reqId) return; done = true; stopMouth(); setPose("point", "smile"); then && then(); };
  const browserFallback = () => {
    if (my !== reqId) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; u.rate = rate; u.pitch = 1;
    if (voice) u.voice = voice;
    u.onstart = () => { if (my === reqId) startMouth(); }; // 声音起来才张嘴
    u.onend = finish; u.onerror = finish;
    window.speechSynthesis.speak(u);
  };
  fetchClip(text).then((url) => {
    if (my !== reqId) return; // 期间已翻站/停止
    audioEl.onended = finish;
    audioEl.onerror = () => { if (my === reqId && audioEl.error) browserFallback(); };
    audioEl.onplaying = () => { if (my === reqId) startMouth(); }; // 解码出声才张嘴 → 音画同步
    audioEl.src = url;
    audioEl.preservesPitch = true;
    audioEl.playbackRate = rate;
    audioEl.play().catch(browserFallback);
  }).catch(browserFallback); // 没起服务器 / 无 TTS 余额 → 浏览器语音
}

function moveTo(el, then) {
  const rect = el.getBoundingClientRect();
  const charW = 96, charH = 150;
  let x, flip;
  if (rect.left - charW - 12 > 8) { x = rect.left - charW - 12; flip = false; }
  else { x = Math.min(rect.right + 12, window.innerWidth - charW - 8); flip = true; }
  let y = rect.top + rect.height / 2 - charH * 0.62;
  y = Math.max(8, Math.min(y, window.innerHeight - charH - 8));

  charEl.classList.add("walking");
  charEl.classList.toggle("flip", flip);
  setPose("idle", "smile");
  charEl.style.transform = `translate(${x}px, ${y}px)`;

  ringEl.style.left = rect.left - 6 + "px";
  ringEl.style.top = rect.top - 6 + "px";
  ringEl.style.width = rect.width + 12 + "px";
  ringEl.style.height = rect.height + 12 + "px";
  ringEl.classList.add("show");

  setTimeout(() => { charEl.classList.remove("walking"); setPose("point", "smile"); then && then(); }, 950);
}

function go(i) {
  if (!charEl || i < 0 || i >= steps.length) return;
  idx = i;
  stepLabel.textContent = `${idx + 1}/${steps.length}`;
  bubbleEl.classList.remove("show");
  const step = steps[idx];
  const el = document.querySelector(step.selector);
  if (!el) { if (auto && idx < steps.length - 1) go(idx + 1); return; }
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    moveTo(el, () => {
      bubbleEl.textContent = step.line;
      bubbleEl.classList.add("show");
      speak(step.line, () => {
        if (auto && idx < steps.length - 1) setTimeout(() => go(idx + 1), 350);
        else if (idx >= steps.length - 1) { auto = false; if (btnPlay) btnPlay.textContent = "▶"; onDone && onDone(); }
      });
    });
  }, 420);
}

function pauseSpeech() {
  if (audioEl && !audioEl.paused) audioEl.pause();
  try { window.speechSynthesis.pause(); } catch (e) {}
  stopMouth();
}

function togglePlay() {
  if (auto) { auto = false; if (btnPlay) btnPlay.textContent = "▶"; pauseSpeech(); return; }
  clearPlayHint();
  auto = true; btnPlay.textContent = "❚❚";
  if (idx < 0) { go(0); return; }
  // 续播：云端音频没放完就接着放；否则恢复/重讲当前站。
  if (audioEl && audioEl.src && audioEl.paused && audioEl.currentTime > 0 && (!audioEl.duration || audioEl.currentTime < audioEl.duration)) {
    startMouth(); audioEl.play().catch(() => go(idx));
  } else {
    try { window.speechSynthesis.resume(); } catch (e) {}
    if (!window.speechSynthesis.speaking && (!audioEl || audioEl.paused)) go(idx);
    else startMouth();
  }
}

// 切走 / 切到别的标签页 / 最小化时，立刻闭嘴，别在后台继续讲。
function onVisibility() {
  if (document.hidden && charEl) { auto = false; if (btnPlay) btnPlay.textContent = "▶"; pauseSpeech(); }
}

export function start(tourSteps, opts = {}) {
  steps = Array.isArray(tourSteps) ? tourSteps : [];
  auto = opts.auto !== false;
  onDone = opts.onDone || null;
  frames = opts.frames || null; // 自定义形象（如尾尾）的两帧；不传则用内置 Demi
  if (opts.rate && SPEEDS.includes(opts.rate)) rate = opts.rate;
  if (opts.accent) C.accent = opts.accent;
  loadVoice();
  if (charEl) stop();
  buildDom();
  document.addEventListener("visibilitychange", onVisibility);
  charEl.style.transform = `translate(${window.innerWidth - 130}px, ${window.innerHeight - 200}px)`;
  if (auto) {
    if (btnPlay) btnPlay.textContent = "❚❚";
    setTimeout(() => go(0), 300);
  } else {
    // 不自动开讲——给播放按钮挂个引导,等用户自己点。
    setTimeout(showPlayHint, 500);
  }
}

export function stop() {
  auto = false;
  reqId++; // 作废进行中的取声请求
  silence();
  stopMouth();
  document.removeEventListener("visibilitychange", onVisibility);
  [charEl, ringEl, barEl].forEach((n) => n && n.remove());
  charEl = ringEl = barEl = audioEl = null;
  idx = -1;
}

export const demiTour = { start, stop };
