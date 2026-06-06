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
      #demi-bubble{max-width:260px;margin-bottom:6px;background:#3B332E;color:#fff;
        font:14px/1.55 -apple-system,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
        padding:9px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);
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
      #demi-bar button:disabled{opacity:.35;cursor:default;}
      #demi-bar .step{min-width:42px;text-align:center;font-weight:600;}
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
  let charEl, bubbleEl, ringEl, svgWrap, barEl, stepLabel, btnPlay;
  let steps = [], idx = -1, auto = false, mouthTimer = null, name = "Demi";

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
      <button id="demi-close" title="结束">✕</button>`;
    document.body.appendChild(barEl);
    stepLabel = barEl.querySelector("#demi-step");
    btnPlay = barEl.querySelector("#demi-play");
    barEl.querySelector("#demi-prev").onclick = () => { auto = false; go(idx - 1); };
    barEl.querySelector("#demi-next").onclick = () => { auto = false; go(idx + 1); };
    barEl.querySelector("#demi-close").onclick = stop;
    btnPlay.onclick = togglePlay;
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
    u.lang = "zh-CN"; u.rate = 1; u.pitch = 1;
    if (voice) u.voice = voice;
    let done = false;
    const finish = () => { if (done) return; done = true; stopMouth(); setPose("point", "smile"); onend && onend(); };
    u.onend = finish; u.onerror = finish;
    startMouth();
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

  function go(i) {
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
      moveTo(el, () => {
        bubbleEl.textContent = step.line;
        bubbleEl.classList.add("show");
        speak(step.line, () => {
          if (auto && idx < steps.length - 1) setTimeout(() => go(idx + 1), 350);
          else if (idx >= steps.length - 1) { auto = false; btnPlay.textContent = "▶"; }
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

  // ---- 公开 API ----
  window.DemiTour = {
    start(tourSteps, opts) {
      opts = opts || {};
      steps = Array.isArray(tourSteps) ? tourSteps : [];
      auto = opts.auto !== false;
      name = opts.name || "Demi";
      if (opts.accent) C.accent = opts.accent;
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
  };
})();
