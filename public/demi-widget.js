// demi-widget.js — 一行 <script> 即可嵌入任意页面的「悬浮讲解小人」。
// 零依赖、纯原生。小人会走到指定元素旁、指着它、用浏览器语音开口讲解。
//
// 用法：
//   <script src="./demi-widget.js"></script>
//   <script>
//     DemiTour.start([
//       { selector: "#hero",  line: "大家好，我是 Demi，先看这块……" },
//       { selector: "#play",  line: "点这里就能直接开玩。" },
//     ], { auto: true, name: "Demi" });
//   </script>
(function () {
  "use strict";
  const INK = "#3B332E", PAPER = "#FBF3E4";
  const C = { accent: "#E8915B", blush: "#F3B58C", shoe: "#C9702F" };

  // ---- AI 后端地址:优先看 script tag 上的 data-api-base 覆写,然后从 widget 自己的 src 推
  //      (用户从 demoshow 域名加载 widget 时同源就直接命中),最后默认指向 demoshow 部署 URL。
  const DEFAULT_API_BASE = "https://demoshow-alpha.vercel.app";
  function detectApiBase() {
    try {
      const me = document.currentScript
        || Array.from(document.scripts).reverse().find(s => /demi-widget(\.\w+)?\.js/.test(s.src || ""));
      if (me) {
        const override = me.getAttribute && me.getAttribute("data-api-base");
        if (override) return String(override).replace(/\/$/, "");
        if (me.src) {
          const origin = new URL(me.src).origin;
          // widget 自托管在用户站点上时,那个域名没有 /api,直接走默认后端
          if (/demoshow/.test(origin) || /vercel\.app$/.test(origin)) return origin;
        }
      }
    } catch (e) {}
    return DEFAULT_API_BASE;
  }
  const API_BASE = detectApiBase();

  // ---- 一次性注入样式 + 手绘抖动滤镜 ----
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
        opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;
        position:relative;}
      #demi-bubble.show{opacity:1;transform:translateY(0);}
      #demi-bubble:after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-7px;
        border:7px solid transparent;border-top-color:#3B332E;border-bottom:0;}
      #demi-ring{position:fixed;z-index:2147483590;pointer-events:none;border:3px dashed ${C.accent};
        border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.04);opacity:0;
        transition:all .5s cubic-bezier(.45,.05,.35,1);}
      #demi-ring.show{opacity:1;}
      #demi-bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);
        z-index:2147483610;display:flex;align-items:center;gap:8px;background:#FBF3E4;
        border:2.5px solid #3B332E;border-radius:30px;padding:7px 12px;
        box-shadow:0 10px 30px rgba(0,0,0,.2);
        font:13px -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#3B332E;}
      #demi-bar button{cursor:pointer;border:2px solid #3B332E;background:#fff;color:#3B332E;
        width:34px;height:34px;border-radius:50%;font-size:14px;line-height:1;
        display:flex;align-items:center;justify-content:center;}
      #demi-bar button.big{width:40px;height:40px;background:${C.accent};color:#fff;border-color:#3B332E;}
      #demi-bar button.rate{width:auto;padding:0 12px;border-radius:18px;font-weight:700;}
      #demi-bar button:disabled{opacity:.35;cursor:default;}
      #demi-bar .step{min-width:42px;text-align:center;font-weight:600;}

      #demi-edit-hover{position:fixed;z-index:2147483640;pointer-events:none;
        border:3px dashed ${C.accent};border-radius:8px;display:none;
        background:rgba(232,145,91,.08);transition:all .12s;}
      #demi-edit-panel{position:fixed;right:18px;top:18px;bottom:80px;width:360px;
        z-index:2147483645;display:flex;flex-direction:column;background:#FBF3E4;
        border:2.5px solid #3B332E;border-radius:18px;box-shadow:0 14px 38px rgba(0,0,0,.22);
        font:13px/1.55 -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#3B332E;}
      #demi-edit-panel .head{display:flex;align-items:center;gap:8px;padding:12px 14px;
        border-bottom:2px solid rgba(59,51,46,.14);}
      #demi-edit-panel .head b{flex:1;font-size:15px;color:${C.accent};}
      #demi-edit-panel .head button{cursor:pointer;border:2px solid #3B332E;background:#fff;color:#3B332E;
        padding:5px 10px;border-radius:14px;font-weight:600;font-size:12px;}
      #demi-edit-panel .head button.primary{background:${C.accent};color:#fff;}
      #demi-edit-panel .tip{padding:10px 14px;background:#fff8e8;color:#7a6f64;font-size:12px;
        border-bottom:1px dashed rgba(59,51,46,.18);}
      #demi-edit-list{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
      #demi-edit-list .empty{color:#9c8f80;text-align:center;padding:30px 10px;font-size:13px;}
      #demi-edit-list .stop{background:#fff;border:2px solid #3B332E;border-radius:10px;padding:8px 10px;
        display:flex;flex-direction:column;gap:6px;}
      #demi-edit-list .stop .row1{display:flex;align-items:center;gap:6px;font-size:11px;color:#7a6f64;}
      #demi-edit-list .stop .row1 .num{display:inline-flex;align-items:center;justify-content:center;
        width:18px;height:18px;border-radius:50%;background:${C.accent};color:#fff;font-weight:700;font-size:11px;flex-shrink:0;}
      #demi-edit-list .stop .row1 code{flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
        font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3B332E;}
      #demi-edit-list .stop .row1 .del{cursor:pointer;border:0;background:transparent;color:#b5651d;font-weight:700;font-size:14px;padding:0 4px;}
      #demi-edit-list .stop .row1 .act{cursor:pointer;border:1.5px solid #d8cdbd;background:#fff;color:#7a6f64;
        border-radius:10px;padding:1px 7px;font-size:11px;flex-shrink:0;font-weight:600;}
      #demi-edit-list .stop .row1 .act.on{background:${C.accent};color:#fff;border-color:${INK};}
      #demi-edit-list .stop textarea{width:100%;resize:vertical;min-height:42px;border:1.5px solid #d8cdbd;border-radius:6px;
        padding:6px 8px;font:13px/1.45 inherit;color:#3B332E;background:#fdf8ed;}
      #demi-edit-list .stop textarea:focus{outline:none;border-color:${C.accent};}
      #demi-edit-panel .foot{padding:10px 12px;border-top:2px solid rgba(59,51,46,.14);display:flex;flex-direction:column;gap:6px;}
      #demi-edit-panel .foot button{cursor:pointer;border:2px solid #3B332E;border-radius:14px;
        padding:8px 12px;font-weight:700;font-size:13px;background:#fff;color:#3B332E;}
      #demi-edit-panel .foot button.primary{background:${C.accent};color:#fff;}
      #demi-edit-panel .foot button:disabled{opacity:.4;cursor:default;}
      #demi-edit-snippet{margin:0;padding:10px 12px;background:#2b2622;color:#f3e9d8;font-size:11px;line-height:1.5;
        border-radius:10px;max-height:180px;overflow:auto;white-space:pre;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
      .demi-edit-armed *{cursor:crosshair !important;}
    `;
    document.head.appendChild(css);
  }

  // ---- 角色 SVG ----
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

  // pose: "idle" | "point"，expr: "smile" | "talk"
  function svg(pose, expr) {
    const common = `stroke-linecap="round" stroke-linejoin="round"`;
    let limbs;
    if (pose === "point") {
      limbs = `
        <path d="M67 159 L62 184" stroke="${INK}" stroke-width="4"/>
        <path d="M85 159 L90 184" stroke="${INK}" stroke-width="4"/>
        ${shoe(59,187,-8)}${shoe(93,187,8)}
        <path d="M53 100 C45 114 44 124 47 132" stroke="${INK}" stroke-width="4"/>
        <path d="M97 96 L128 66" stroke="${INK}" stroke-width="4"/>
        ${headBody()}
        ${hand(47,134)}
        <circle cx="130" cy="64" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="3.4"/>
        <path d="M132 60 l7 -7" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    } else {
      limbs = `
        <path d="M67 159 L63 184" stroke="${INK}" stroke-width="4"/>
        <path d="M85 159 L89 184" stroke="${INK}" stroke-width="4"/>
        ${shoe(60,187,-7)}${shoe(92,187,7)}
        <path d="M53 100 C45 114 44 124 47 132" stroke="${INK}" stroke-width="4"/>
        <path d="M99 100 C107 114 108 124 105 132" stroke="${INK}" stroke-width="4"/>
        ${headBody()}
        ${hand(47,134)}${hand(105,134)}`;
    }
    return `<svg id="demi-svg" width="96" viewBox="0 0 160 210" fill="none">
      <defs><filter id="demiSketch" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
      </filter></defs>
      <g filter="url(#demiSketch)" ${common}>${limbs}${face(expr)}</g>
    </svg>`;
  }

  // ---- 语音 ----
  let voice = null;
  function loadVoice() {
    const pick = () => {
      const vs = speechSynthesis.getVoices() || [];
      voice = vs.find(v => /^zh|cmn/i.test(v.lang)) || vs.find(v => /中文|chinese/i.test(v.name)) || null;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;
  }

  // ---- 状态 ----
  const SPEEDS = [1, 1.25, 1.5, 1.75, 2]; // 倍速可选
  let charEl, bubbleEl, ringEl, svgWrap, barEl, stepLabel, btnPlay, btnRate;
  let steps = [], idx = -1, auto = false, mouthTimer = null, name = "Demi", rate = 1.25, onDoneCb = null;

  function buildDom() {
    injectOnce();
    charEl = document.createElement("div");
    charEl.id = "demi-char";
    bubbleEl = document.createElement("div");
    bubbleEl.id = "demi-bubble";
    svgWrap = document.createElement("div");
    svgWrap.innerHTML = svg("idle", "smile");
    charEl.appendChild(bubbleEl);
    charEl.appendChild(svgWrap);
    document.body.appendChild(charEl);

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
    barEl.querySelector("#demi-prev").onclick = () => { auto = false; go(idx - 1); };
    barEl.querySelector("#demi-next").onclick = () => { auto = false; go(idx + 1); };
    barEl.querySelector("#demi-close").onclick = stop;
    btnPlay.onclick = togglePlay;
    btnRate.onclick = cycleRate;
  }

  function cycleRate() {
    rate = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    if (btnRate) btnRate.textContent = `${rate}×`;
  }

  function setPose(pose, expr) { svgWrap.innerHTML = svg(pose, expr); }

  function startMouth() {
    stopMouth();
    let open = false;
    mouthTimer = setInterval(() => { open = !open; setPose("point", open ? "talk" : "smile"); }, 170);
  }
  function stopMouth() { if (mouthTimer) { clearInterval(mouthTimer); mouthTimer = null; } }

  function speak(text, onend) {
    try { speechSynthesis.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; u.rate = rate; u.pitch = 1; // 倍速：讲得快一点
    if (voice) u.voice = voice;
    let done = false;
    const finish = () => { if (done) return; done = true; stopMouth(); setPose("point", "smile"); onend && onend(); };
    u.onstart = () => startMouth(); // 声音起来才张嘴 → 音画同步
    u.onend = finish; u.onerror = finish;
    speechSynthesis.speak(u);
  }

  // 把小人移动到目标元素旁边，朝向它，指着它
  function moveTo(el, then) {
    const rect = el.getBoundingClientRect();
    const charW = 96, charH = 150;
    let x, flip;
    // 默认站元素左侧、朝右指；左边放不下就站右侧、翻转朝左指
    if (rect.left - charW - 12 > 8) { x = rect.left - charW - 12; flip = false; }
    else { x = Math.min(rect.right + 12, window.innerWidth - charW - 8); flip = true; }
    let y = rect.top + rect.height / 2 - charH * 0.62;
    y = Math.max(8, Math.min(y, window.innerHeight - charH - 8));

    charEl.classList.add("walking");
    charEl.classList.toggle("flip", flip);
    setPose("idle", "smile");
    charEl.style.transform = `translate(${x}px, ${y}px)`;

    // 高亮目标
    ringEl.style.left = rect.left - 6 + "px";
    ringEl.style.top = rect.top - 6 + "px";
    ringEl.style.width = rect.width + 12 + "px";
    ringEl.style.height = rect.height + 12 + "px";
    ringEl.classList.add("show");

    setTimeout(() => { charEl.classList.remove("walking"); setPose("point", "smile"); then && then(); }, 950);
  }

  // 等下一站的 selector 在 DOM 里出现(被点击触发了路由/弹窗后),最多等 4s
  function waitForSelector(sel, timeout, cb) {
    if (!sel) { cb(); return; }
    const t0 = Date.now();
    const tick = () => {
      if (!charEl) return; // tour stopped externally
      if (document.querySelector(sel)) { cb(); return; }
      if (Date.now() - t0 > timeout) { cb(); return; }
      setTimeout(tick, 120);
    };
    tick();
  }

  function go(i) {
    if (!charEl) return;
    if (i < 0 || i >= steps.length) return;
    idx = i;
    stepLabel.textContent = `${idx + 1}/${steps.length}`;
    bubbleEl.classList.remove("show");
    const step = steps[idx];
    const el = document.querySelector(step.selector);
    if (!el) { // 找不到元素就跳过这一站
      if (auto && idx < steps.length - 1) go(idx + 1);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (!charEl) return;
      moveTo(el, () => {
        bubbleEl.textContent = step.line;
        bubbleEl.classList.add("show");
        speak(step.line, () => {
          // 讲完了。看这一站要不要替用户点一下,再决定怎么进下一站
          const isLast = idx >= steps.length - 1;
          if (isLast) {
            // 最后一站:如果挂了 click 动作,讲完点一下再收尾
            if (step.action === "click") { try { el.click(); } catch (e) {} }
            auto = false;
            btnPlay.textContent = "▶";
            if (typeof onDoneCb === "function") { const cb = onDoneCb; onDoneCb = null; setTimeout(cb, 200); }
            return;
          }
          if (!auto) return;
          const nextSel = steps[idx + 1] && steps[idx + 1].selector;
          if (step.action === "click") {
            try { el.click(); } catch (e) {}
            // 等下一站元素在新页面/弹窗里出现再走过去,免得扑空
            waitForSelector(nextSel, 4000, () => setTimeout(() => go(idx + 1), 350));
          } else {
            setTimeout(() => go(idx + 1), 350);
          }
        });
      });
    }, 420); // 等滚动落定后再取坐标
  }

  function togglePlay() {
    if (auto) { auto = false; btnPlay.textContent = "▶"; pauseSpeech(); return; }
    auto = true; btnPlay.textContent = "❚❚";
    if (idx < 0) go(0);
    else { try { speechSynthesis.resume(); } catch (e) {} if (!speechSynthesis.speaking) go(idx); }
  }

  function pauseSpeech() { try { speechSynthesis.pause(); } catch (e) {} stopMouth(); }
  // 切走 / 切标签页 / 最小化时，立刻闭嘴，不在后台继续讲。
  function onVisibility() {
    if (document.hidden && charEl) { auto = false; if (btnPlay) btnPlay.textContent = "▶"; pauseSpeech(); }
  }

  function stop() {
    auto = false;
    try { speechSynthesis.cancel(); } catch (e) {}
    stopMouth();
    document.removeEventListener("visibilitychange", onVisibility);
    [charEl, ringEl, barEl].forEach(n => n && n.remove());
    charEl = null;
  }

  // ---- 编辑模式：在自己网站上点元素 → 自动生成嵌入代码 ----
  // 跳过 widget 自身注入的 DOM；浏览器/网站根节点也跳过
  function isOwnNode(el) {
    return !el || el === document.body || el === document.documentElement
      || (el.id && /^demi-/.test(el.id))
      || (el.closest && el.closest('#demi-edit-panel,#demi-char,#demi-bar,#demi-ring,#demi-edit-hover'));
  }

  // 生成尽量稳定的 CSS selector：优先 #id、data-* 属性，再 fallback 到结构路径
  function genSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id && /^[A-Za-z_-][\w-]*$/.test(el.id)) return `#${el.id}`;
    for (const attr of ["data-testid", "data-id", "data-tour", "data-name"]) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (v) return `[${attr}="${cssEscape(v)}"]`;
    }
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 6) {
      let part = cur.tagName.toLowerCase();
      const cls = cur.classList && [...cur.classList].filter(c => !/^demi-/.test(c) && /^[A-Za-z_-][\w-]*$/.test(c));
      if (cls && cls.length) part += "." + cls.slice(0, 2).join(".");
      const parent = cur.parentElement;
      if (parent) {
        const sib = [...parent.children].filter(c => c.tagName === cur.tagName);
        if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
      }
      parts.unshift(part);
      if (parent && parent.id && /^[A-Za-z_-][\w-]*$/.test(parent.id)) {
        parts.unshift(`#${parent.id}`);
        break;
      }
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  function cssEscape(s) { return String(s).replace(/(["\\])/g, "\\$1"); }

  // ---- URL 触发的「讲解链接」编解码 ----
  // tour 数据 base64-url 进 URL hash → 任何人点这个链接,小人就开始讲;直接访问域名 → 什么都没有。
  function utf8ToB64Url(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64UrlToUtf8(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function parsePlayHash() {
    const m = (typeof location !== "undefined" ? location.hash || "" : "").match(/^#demi-play=(.+)$/);
    if (!m) return null;
    try {
      const obj = JSON.parse(b64UrlToUtf8(m[1]));
      if (obj && Array.isArray(obj.steps) && obj.steps.length) return obj;
    } catch (e) {}
    return null;
  }
  function encodePlayLink(targetUrl, steps, opts) {
    opts = opts || {};
    const payload = { steps };
    if (opts.name) payload.name = opts.name;
    if (opts.rate) payload.rate = opts.rate;
    let u;
    try { u = new URL(targetUrl, typeof location !== "undefined" ? location.href : "http://example.com"); }
    catch (e) { return ""; }
    u.hash = "";
    return u.toString() + "#demi-play=" + utf8ToB64Url(JSON.stringify(payload));
  }

  let edit = null; // { steps: [{selector, line, label}], hoverRing, panel, listEl, name, prevHandler }
  function startEdit(opts) {
    opts = opts || {};
    if (edit) stopEdit();
    // 如果页面已经调了 start() 在自动放 tour,先停掉,免得跟编辑面板抢屏幕
    stop();
    injectOnce();
    loadVoice();
    edit = {
      steps: [],
      name: opts.name || "Demi",
      armed: true,
      lastHover: null,
    };
    // 尝试从草稿恢复
    try {
      const saved = JSON.parse(localStorage.getItem("demi-tour-draft") || "null");
      if (saved && Array.isArray(saved.steps)) {
        edit.steps = saved.steps.filter(s => s && s.selector);
        if (saved.name) edit.name = saved.name;
      }
    } catch (e) {}
    if (Array.isArray(opts.initialSteps) && opts.initialSteps.length) edit.steps = opts.initialSteps.slice();

    buildEditPanel();
    document.documentElement.classList.add("demi-edit-armed");
    document.addEventListener("mousemove", onEditHover, true);
    document.addEventListener("click", onEditPick, true);
    document.addEventListener("keydown", onEditKey, true);
    window.addEventListener("scroll", refreshHoverRing, true);
    window.addEventListener("resize", refreshHoverRing);
  }

  function stopEdit() {
    if (!edit) return;
    saveDraft();
    document.documentElement.classList.remove("demi-edit-armed");
    document.removeEventListener("mousemove", onEditHover, true);
    document.removeEventListener("click", onEditPick, true);
    document.removeEventListener("keydown", onEditKey, true);
    window.removeEventListener("scroll", refreshHoverRing, true);
    window.removeEventListener("resize", refreshHoverRing);
    const panel = document.getElementById("demi-edit-panel");
    const hr = document.getElementById("demi-edit-hover");
    if (panel) panel.remove();
    if (hr) hr.remove();
    edit = null;
  }

  function buildEditPanel() {
    const hr = document.createElement("div");
    hr.id = "demi-edit-hover";
    document.body.appendChild(hr);

    const panel = document.createElement("div");
    panel.id = "demi-edit-panel";
    panel.innerHTML = `
      <div class="head">
        <b>✦ 编辑导览</b>
        <button id="demi-ed-browse" title="切换:点元素加站 / 浏览页面(操作你的游戏)">🎯 点元素加站</button>
        <button id="demi-ed-preview" title="预览整段导览">▶ 预览</button>
        <button id="demi-ed-close" title="退出编辑模式">✕</button>
      </div>
      <div class="tip" id="demi-ed-tip">点元素 = 加一站。需要点游戏按钮换场景? 右上切到「🖱 浏览」。</div>
      <div id="demi-edit-list"></div>
      <div class="foot">
        <button id="demi-ed-ai" class="primary">✨ AI 帮我写讲解词</button>
        <button id="demi-ed-link">🔗 复制讲解链接</button>
        <button id="demi-ed-export">📋 高级:复制嵌入代码(访客自动播)</button>
        <pre id="demi-ed-snippet" style="display:none"></pre>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector("#demi-ed-close").onclick = () => {
      stopEdit();
      if (location.hash === "#demi-edit") {
        history.replaceState(null, "", location.pathname + location.search);
      }
    };
    panel.querySelector("#demi-ed-preview").onclick = previewEdit;
    panel.querySelector("#demi-ed-export").onclick = exportEditSnippet;
    panel.querySelector("#demi-ed-link").onclick = exportPlayLink;
    panel.querySelector("#demi-ed-ai").onclick = aiWriteLines;
    panel.querySelector("#demi-ed-browse").onclick = toggleBrowseMode;
    renderEditList();
  }

  function renderEditList() {
    const list = document.getElementById("demi-edit-list");
    if (!list) return;
    if (!edit.steps.length) {
      list.innerHTML = `<div class="empty">还没有添加站点。<br/>把鼠标移到页面上 → 点一下元素就加一站。</div>`;
      return;
    }
    list.innerHTML = "";
    edit.steps.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "stop";
      const actOn = s.action === "click";
      row.innerHTML = `
        <div class="row1">
          <span class="num">${i + 1}</span>
          <code title="${escapeAttr(s.selector)}">${escapeHtml(s.selector)}</code>
          <button class="act ${actOn ? "on" : ""}" data-i="${i}" title="开:讲完后让 Demi 点一下这个元素,再去下一站">✋ 讲完点一下</button>
          <button class="del" data-i="${i}" title="删除这一站">✕</button>
        </div>
        <textarea data-i="${i}" placeholder="这里写讲解词……">${escapeHtml(s.line || "")}</textarea>`;
      list.appendChild(row);
    });
    list.querySelectorAll("textarea").forEach(t => {
      t.addEventListener("input", e => {
        const i = +e.target.dataset.i;
        edit.steps[i].line = e.target.value;
        saveDraft();
      });
    });
    list.querySelectorAll(".del").forEach(b => {
      b.onclick = e => {
        const i = +e.currentTarget.dataset.i;
        edit.steps.splice(i, 1);
        saveDraft();
        renderEditList();
      };
    });
    list.querySelectorAll(".act").forEach(b => {
      b.onclick = e => {
        const i = +e.currentTarget.dataset.i;
        edit.steps[i].action = edit.steps[i].action === "click" ? undefined : "click";
        saveDraft();
        renderEditList();
      };
    });
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  function toggleBrowseMode() {
    if (!edit) return;
    edit.browse = !edit.browse;
    document.documentElement.classList.toggle("demi-edit-armed", !edit.browse);
    const btn = document.getElementById("demi-ed-browse");
    if (btn) btn.textContent = edit.browse ? "🖱 浏览中,点回 🎯" : "🎯 点元素加站";
    const hr = document.getElementById("demi-edit-hover");
    if (hr && edit.browse) hr.style.display = "none";
    const tip = document.getElementById("demi-ed-tip");
    if (tip) tip.textContent = edit.browse
      ? "现在点击会照常传给你的游戏。换好场景再切回 🎯,继续点元素加站。"
      : "点元素 = 加一站。需要点游戏按钮换场景? 右上切到「🖱 浏览」。";
  }

  function onEditHover(e) {
    if (!edit) return;
    if (edit.browse) return; // 浏览模式不画 hover 框
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || isOwnNode(t)) {
      const hr = document.getElementById("demi-edit-hover");
      if (hr) hr.style.display = "none";
      edit.lastHover = null;
      return;
    }
    edit.lastHover = t;
    paintHoverRing(t);
  }
  function paintHoverRing(t) {
    const hr = document.getElementById("demi-edit-hover");
    if (!hr || !t) return;
    const r = t.getBoundingClientRect();
    hr.style.display = "block";
    hr.style.left = (r.left - 4) + "px";
    hr.style.top = (r.top - 4) + "px";
    hr.style.width = (r.width + 8) + "px";
    hr.style.height = (r.height + 8) + "px";
  }
  function refreshHoverRing() { if (edit && edit.lastHover) paintHoverRing(edit.lastHover); }

  function onEditPick(e) {
    if (!edit) return;
    const t = e.target;
    // 编辑面板内部的点击照常处理，不抓
    if (t.closest && t.closest("#demi-edit-panel")) return;
    if (isOwnNode(t)) return;
    // 浏览模式:点击照常传给游戏,不加站
    if (edit.browse) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = genSelector(t);
    if (!sel) return;
    // 同 selector 已存在就高亮它，不重复添加
    const dup = edit.steps.findIndex(s => s.selector === sel);
    if (dup >= 0) {
      const ta = document.querySelector(`#demi-edit-list textarea[data-i="${dup}"]`);
      if (ta) ta.focus();
      return;
    }
    edit.steps.push({ selector: sel, line: "" });
    saveDraft();
    renderEditList();
    // 自动滚到新加的这一站、聚焦输入框
    setTimeout(() => {
      const ta = document.querySelector(`#demi-edit-list textarea[data-i="${edit.steps.length - 1}"]`);
      if (ta) { ta.scrollIntoView({ block: "nearest" }); ta.focus(); }
    }, 30);
  }
  function onEditKey(e) {
    if (e.key === "Escape" && edit) stopEdit();
  }
  function saveDraft() {
    if (!edit) return;
    try { localStorage.setItem("demi-tour-draft", JSON.stringify({ steps: edit.steps, name: edit.name })); }
    catch (e) {}
  }

  function previewEdit() {
    if (!edit) return;
    const valid = edit.steps.filter(s => s.selector && s.line && s.line.trim());
    if (!valid.length) { flashTip("先给至少一站写上讲解词"); return; }
    const saved = { steps: edit.steps.slice(), name: edit.name };
    stopEdit();
    window.DemiTour.start(valid, {
      auto: true, name: saved.name, _force: true, onDone: () => {
        // 预览完回到编辑模式
        startEdit({ name: saved.name, initialSteps: saved.steps });
      }
    });
  }
  function flashTip(msg) {
    const tip = document.getElementById("demi-ed-tip");
    if (!tip) return;
    const orig = tip.textContent, origBg = tip.style.background;
    tip.textContent = msg;
    tip.style.background = "#FBE7DE";
    setTimeout(() => { tip.textContent = orig; tip.style.background = origBg; }, 1800);
  }

  // 给一个元素猜个"角色",AI 用来理解这是页面上的什么
  function describeRole(el) {
    if (!el || el.nodeType !== 1) return "区块";
    const t = el.tagName;
    if (t === "BUTTON") return "按钮";
    if (t === "A") return "链接";
    if (/^H[1-6]$/.test(t)) return "标题";
    if (t === "IMG") return "图片";
    if (t === "INPUT") return el.type === "submit" ? "提交按钮" : "输入框";
    if (t === "FORM") return "表单";
    if (t === "NAV") return "导航栏";
    if (t === "HEADER") return "页眉";
    if (t === "FOOTER") return "页脚";
    if (t === "LI") return "列表项";
    const role = el.getAttribute && el.getAttribute("role");
    if (role === "button") return "按钮";
    const cls = (el.className && typeof el.className === "string" ? el.className : "").toLowerCase();
    if (/\bcard\b/.test(cls)) return "卡片";
    if (/\bhero\b|\bbanner\b/.test(cls)) return "首屏横幅";
    if (/\bcta\b/.test(cls)) return "行动按钮";
    if (/\bfeature\b/.test(cls)) return "功能介绍";
    if (/\bnav\b|\bmenu\b/.test(cls)) return "导航";
    return "区块";
  }
  // 抽元素显示的文字(不要 widget 自己注入的内容)
  function elementText(el) {
    if (!el) return "";
    const t = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 240);
  }

  async function aiWriteLines() {
    if (!edit) return;
    const validIdx = edit.steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.selector && document.querySelector(s.selector));
    if (!validIdx.length) { flashTip("还没有可用站点(或选中的元素不存在了)"); return; }

    const btn = document.getElementById("demi-ed-ai");
    const origText = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "✨ 正在请 AI 写…"; }
    flashTip("AI 正在写讲解词,可能要几秒钟…");

    const stops = validIdx.map(({ s }) => {
      const el = document.querySelector(s.selector);
      return { selector: s.selector, role: describeRole(el), text: elementText(el) };
    });

    try {
      const resp = await fetch(API_BASE + "/api/generate-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: edit.name, tone: "轻松亲切", stops }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || `AI 调用失败 (${resp.status})`);
      }
      const data = await resp.json();
      const lines = Array.isArray(data.lines) ? data.lines : [];
      // 只覆盖空的讲解词,已经手填过的保留
      validIdx.forEach(({ i }, k) => {
        const line = (lines[k] || "").trim();
        if (!line) return;
        if (!edit.steps[i].line || !edit.steps[i].line.trim()) edit.steps[i].line = line;
      });
      saveDraft();
      renderEditList();
      flashTip(data.warning ? `AI 写好啦(${data.warning})` : "AI 写好啦,可以再手动改改 ✓");
    } catch (e) {
      flashTip(`AI 写词失败:${e.message || e}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  }

  // ---- AI 自动玩一遍游戏(降级版):看一眼初始页面 → 一次性规划全条路 → 自动开播 ----
  function collectVisibleInteractables() {
    const selSet = "button, a, [role='button'], [onclick], h1, h2, h3, [data-tour], .card, [data-card]";
    const seen = new Set();
    const out = [];
    document.querySelectorAll(selSet).forEach(el => {
      if (!el || isOwnNode(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 14 || rect.height < 14) return;
      // 视口里或刚出视口附近的元素才算"看见"
      if (rect.top > window.innerHeight * 2.5 || rect.bottom < -200) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.1) return;
      const sel = genSelector(el);
      if (!sel || seen.has(sel)) return;
      seen.add(sel);
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
      if (!text && el.tagName !== "IMG" && el.tagName !== "BUTTON") return;
      out.push({
        tag: el.tagName.toLowerCase(),
        text,
        selector: sel,
        role: describeRole(el),
      });
      if (out.length >= 30) return;
    });
    return out.slice(0, 30);
  }

  function showAutoToast(text) {
    let el = document.getElementById("demi-auto-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "demi-auto-toast";
      el.style.cssText = "position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;"
        + "background:#FBF3E4;border:2.5px solid #3B332E;border-radius:18px;padding:12px 22px;"
        + "font:14px/1.5 -apple-system,system-ui,'PingFang SC',sans-serif;color:#3B332E;"
        + "box-shadow:0 14px 38px rgba(0,0,0,.22);max-width:80vw;";
      document.body.appendChild(el);
    }
    el.textContent = text;
  }
  function hideAutoToast() {
    const el = document.getElementById("demi-auto-toast");
    if (el) el.remove();
  }

  let autoRunning = false;
  async function planAndRunAuto(opts) {
    if (autoRunning) return;
    autoRunning = true;
    opts = opts || {};
    if (edit) stopEdit();
    showAutoToast("✦ Demi 正在看你的页面…");
    try {
      const visible = collectVisibleInteractables();
      if (!visible.length) throw new Error("页面上没找到可交互的元素");
      const resp = await fetch(API_BASE + "/api/plan-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: opts.name || "Demi",
          tone: opts.tone || "轻松亲切",
          pageTitle: document.title || "",
          visible,
        }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || `规划失败 (${resp.status})`);
      }
      const data = await resp.json();
      const steps = (data.steps || []).filter(s => s.selector && s.line && document.querySelector(s.selector));
      if (!steps.length) throw new Error("AI 没规划出有效路径");
      hideAutoToast();
      showAutoToast("✦ 规划好了, " + steps.length + " 站, 开讲!");
      setTimeout(hideAutoToast, 1800);
      window.DemiTour.start(steps, { auto: true, name: opts.name || "Demi", _force: true });
    } catch (e) {
      console.error("[Demi auto]", e);
      hideAutoToast();
      showAutoToast("Demi 跑不起来:" + (e.message || e));
      setTimeout(hideAutoToast, 5000);
    } finally {
      autoRunning = false;
    }
  }

  function exportPlayLink() {
    if (!edit) return;
    const valid = edit.steps.filter(s => s.selector && s.line && s.line.trim());
    if (!valid.length) { flashTip("还没有可生成的站点"); return; }
    // 用当前页面的网址当目标(去掉 #demi-edit)
    const targetUrl = location.origin + location.pathname + location.search;
    const link = encodePlayLink(targetUrl, valid.map(s => {
      const out = { selector: s.selector, line: s.line.trim() };
      if (s.action === "click") out.action = "click";
      return out;
    }), { name: edit.name });
    const box = document.getElementById("demi-ed-snippet");
    if (box) { box.textContent = link; box.style.display = "block"; }
    try {
      navigator.clipboard.writeText(link).then(() => flashTip("已复制 ✓ 把这个链接分享出去就能播,直接访问网址什么都没有"));
    } catch (e) { flashTip("链接生成完成,手动选中复制即可"); }
  }

  function exportEditSnippet() {
    if (!edit) return;
    const valid = edit.steps.filter(s => s.selector && s.line && s.line.trim());
    if (!valid.length) { flashTip("还没有可导出的站点"); return; }
    const widgetUrl = (location.origin || "") + "/demi-widget.js";
    const stepsLines = valid.map(s => {
      const parts = [`selector: ${JSON.stringify(s.selector)}`, `line: ${JSON.stringify(s.line.trim())}`];
      if (s.action === "click") parts.push(`action: "click"`);
      return `    { ${parts.join(", ")} },`;
    }).join("\n");
    const snippet = `<!-- Demi 导览 - 粘到 </body> 之前 -->
<script src="${widgetUrl}"></script>
<script>
  window.addEventListener("load", function () {
    DemiTour.start([
${stepsLines}
    ], { auto: true, name: ${JSON.stringify(edit.name)} });
  });
<\/script>`;
    const box = document.getElementById("demi-ed-snippet");
    if (box) { box.textContent = snippet; box.style.display = "block"; }
    try {
      navigator.clipboard.writeText(snippet).then(() => flashTip("已复制 ✓ 把上面这段贴到你 HTML 的 </body> 前"));
    } catch (e) { flashTip("生成完成，手动选中复制即可"); }
  }

  // ---- 公开 API ----
  window.DemiTour = {
    start(tourSteps, opts) {
      opts = opts || {};
      // 编辑模式优先:#demi-edit 进来时不让页面自带的 start() 抢镜
      if (!opts._force && (edit || (typeof location !== "undefined" && location.hash === "#demi-edit"))) {
        // hash 命中但 startEdit 还没来得及跑 → 把 edit 标记成 pending,等会儿 autoEditIfHash 真正起来
        if (!edit && typeof location !== "undefined" && location.hash === "#demi-edit") {
          setTimeout(autoEditIfHash, 0);
        }
        return;
      }
      // 链接触发的 tour 优先:页面自带的 start() 不抢
      if (!opts._force && typeof location !== "undefined" && /^#demi-play=/.test(location.hash)) {
        setTimeout(autoPlayIfHash, 0);
        return;
      }
      steps = Array.isArray(tourSteps) ? tourSteps : [];
      auto = opts.auto !== false;
      name = opts.name || "Demi";
      if (opts.rate && SPEEDS.includes(opts.rate)) rate = opts.rate;
      if (opts.accent) C.accent = opts.accent;
      onDoneCb = typeof opts.onDone === "function" ? opts.onDone : null;
      loadVoice();
      if (charEl) stop();
      buildDom();
      document.addEventListener("visibilitychange", onVisibility);
      // 起手先把小人放屏幕右下，再走向第一站
      charEl.style.transform = `translate(${window.innerWidth - 130}px, ${window.innerHeight - 200}px)`;
      setTimeout(() => go(0), 300);
    },
    next() { auto = false; go(idx + 1); },
    prev() { auto = false; go(idx - 1); },
    goto(i) { auto = false; go(i); },
    stop,
    edit: startEdit,
    stopEdit,
    encodeLink: encodePlayLink,
    autoRun: planAndRunAuto,
  };

  // 访问 yoursite.com#demi-edit 直接进入编辑模式
  function autoEditIfHash() {
    if (typeof location !== "undefined" && location.hash === "#demi-edit") {
      startEdit();
    }
  }
  // 访问 yoursite.com#demi-play=<base64> 自动播放编码进 URL 的 tour
  function autoPlayIfHash() {
    if (edit) return; // 编辑模式优先
    const tour = parsePlayHash();
    if (!tour) return;
    // 等 DOM body 就绪再 start
    const launch = () => window.DemiTour.start(tour.steps, {
      auto: true,
      name: tour.name || "Demi",
      rate: tour.rate,
      _force: true,
    });
    if (document.body) setTimeout(launch, 60);
    else window.addEventListener("DOMContentLoaded", () => setTimeout(launch, 60));
  }
  // 访问 yoursite.com#demi-auto:AI 看页面 → 规划 → 自动开讲。访客也能用,无需手动配。
  function autoAutoIfHash() {
    if (typeof location === "undefined" || location.hash !== "#demi-auto") return;
    if (edit) return;
    // 等页面挂载完(React 这种延迟渲染的也能等到)
    const kick = () => setTimeout(() => planAndRunAuto({}), 600);
    if (document.body) kick();
    else window.addEventListener("DOMContentLoaded", kick);
  }
  function autoOnHash() { autoEditIfHash(); autoPlayIfHash(); autoAutoIfHash(); }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(autoOnHash, 0);
  } else {
    window.addEventListener("DOMContentLoaded", autoOnHash);
  }
  window.addEventListener("hashchange", () => {
    if (location.hash === "#demi-edit" && !edit) startEdit();
    else if (location.hash !== "#demi-edit" && edit) stopEdit();
    else if (/^#demi-play=/.test(location.hash)) autoPlayIfHash();
    else if (location.hash === "#demi-auto") autoAutoIfHash();
  });
})();
