// slides.js — turn an uploaded "HTML PPT" into an array of renderable slides.
//
// The hard part is splitting an ARBITRARY uploaded HTML into pages. Decks in the
// wild differ wildly: some use [data-slide]/.slide/.page, some wrap pages in a
// single outer container with unusual class names (.section/.chapter/…), some
// nest pages deep (body > .container > N blocks), some render a fixed "chrome"
// shell (page counter + dots) as a sibling of the pages. A fixed selector list
// can't cover all of these, so after a fast explicit-selector path we fall back
// to a structural search that descends single-wrapper chains and picks the DOM
// level whose children best look like a set of pages.
//
// Why it matters: if we mis-split a 9-page deck into 1 "page", Demi's counter &
// progress read count=1 and freeze, while the deck's own in-iframe script keeps
// changing the visible content — exactly the "content moves, page number stuck"
// bug. Segmentation must therefore be robust, with a clear single-page fallback.

// Fast path: explicit, intentional slide markers (most purpose-built decks).
const EXPLICIT_SELECTORS = [
  "[data-slide]", "section.slide", ".slide", "[class*=slide]", "[class*=Slide]",
  ".page", "[class*=page]", "[class*=Page]",
];

// Tags that are never a page on their own.
const NON_PAGE_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT", "BR", "HR"]);

// Class-name hints for the deck's own chrome (counter / dots / progress / nav).
const CHROME_CLASS_RE = /(^|[-_ ])(dots?|progress|pager|pagination|page-?num|page-?count|indicator|nav|navigation|controls?|toolbar|footer-?bar|counter)([-_ ]|$)/i;

function isChromeNode(el) {
  // A small fixed/absolute UI bit (dots, page number, progress) — not a page.
  const cls = el.getAttribute?.("class") || "";
  const id = el.getAttribute?.("id") || "";
  if (CHROME_CLASS_RE.test(cls) || CHROME_CLASS_RE.test(id)) {
    const inline = (el.getAttribute?.("style") || "");
    if (/position\s*:\s*(fixed|absolute|sticky)/i.test(inline) || (el.textContent || "").replace(/\s+/g, "").length < 24) return true;
  }
  const inline = el.getAttribute?.("style") || "";
  if (/position\s*:\s*(fixed|sticky)/i.test(inline) && (el.textContent || "").replace(/\s+/g, "").length < 24) return true;
  return false;
}

// "Real" element children of a node — excludes script/style and obvious chrome.
function contentChildren(node) {
  return Array.from(node.children || []).filter((c) => !NON_PAGE_TAGS.has(c.tagName) && !isChromeNode(c));
}

// Tags that read as a "page-sized" block (vs inline headings/paragraphs that
// are just the content of ONE page). Used to avoid splitting a single slide's
// own <h1>/<p> into multiple "pages".
const PAGE_BLOCK_TAGS = new Set(["SECTION", "ARTICLE", "DIV", "MAIN", "LI"]);

// Score how well a node's children look like a set of pages (higher = better).
// Returns -1 when the children clearly are NOT a set of pages.
function scoreSplit(children) {
  const n = children.length;
  if (n < 2) return -1;
  // Pages are block-level containers. If most children are inline-ish tags
  // (h1/h2/p/span/img…), this is the content of one page, not many pages.
  const blockish = children.filter((c) => PAGE_BLOCK_TAGS.has(c.tagName)).length;
  if (blockish < Math.max(2, Math.ceil(n * 0.6))) return -1;
  // group by "role" = tagName + first class token; pages tend to be uniform.
  const roleCount = new Map();
  let withText = 0, breaks = 0;
  for (const c of children) {
    const cls = (c.getAttribute("class") || "").trim().split(/\s+/)[0] || "";
    const role = c.tagName + "." + cls;
    roleCount.set(role, (roleCount.get(role) || 0) + 1);
    if ((c.textContent || "").replace(/\s+/g, "").length > 12) withText++;
    const st = c.getAttribute("style") || "";
    if (/page-break-before|break-before/i.test(st)) breaks++;
  }
  const topRole = Math.max(...roleCount.values());
  const uniformity = topRole / n;                 // 1 = all same role
  const substance = withText / n;                 // fraction with real text
  if (substance < 0.5) return -1;                 // mostly empty → not pages
  // prefer: more pages (log), high uniformity, substantive children, page-breaks
  return Math.log2(n) * 2 + uniformity * 3 + substance * 2 + (breaks >= 2 ? 1.5 : 0);
}

// Structural search: from <body>, descend single-wrapper chains, and at each
// level evaluate splitting on its content children; keep the best-scoring level.
function structuralSplit(body) {
  let best = null, bestScore = 0;
  const visit = (node, depth) => {
    if (!node || depth > 6) return;
    const kids = contentChildren(node);
    const s = scoreSplit(kids);
    if (s > bestScore) { bestScore = s; best = kids; }
    // Descend: if there's effectively a single content child (a wrapper), go in.
    if (kids.length === 1) { visit(kids[0], depth + 1); return; }
    // Also descend into each child a little, in case pages are one level deeper
    // than a multi-child layout row (rare) — only when current split is weak.
    if (s < 4) for (const k of kids) visit(k, depth + 1);
  };
  visit(body, 0);
  return best && best.length >= 2 ? best : null;
}

// Decide the page nodes for a parsed document. Returns { nodes, method }.
function segmentSlides(doc) {
  const body = doc.body;
  if (!body) return { nodes: [], method: "none" };

  // 1) explicit slide markers — drop chrome (a fixed "page counter" can match
  //    [class*=page]) and tiny items (TOC links like .toc-page); require ≥2
  //    substantial pages. Also drop nodes nested inside another match.
  const substantial = (el) => (el.textContent || "").replace(/\s+/g, "").length >= 20;
  for (const sel of EXPLICIT_SELECTORS) {
    let found = Array.from(body.querySelectorAll(sel)).filter((el) => !isChromeNode(el));
    // remove matches that are descendants of another match (keep outermost)
    found = found.filter((el) => !found.some((o) => o !== el && o.contains(el)));
    const real = found.filter(substantial);
    if (real.length >= 2) return { nodes: real, method: `selector ${sel}` };
    if (found.length === 1) {
      const inner = structuralSplit(found[0]);
      if (inner) return { nodes: inner, method: "auto-split (inside wrapper)" };
      if (substantial(found[0])) return { nodes: found, method: `selector ${sel}` };
    }
  }
  // 2) bare <section> as pages (only if there are several)
  const sections = Array.from(body.querySelectorAll(":scope > section, :scope > * > section")).filter((el) => !isChromeNode(el));
  if (sections.length >= 2) return { nodes: sections, method: "selector section" };

  // 3) structural best-split-level search
  const split = structuralSplit(body);
  if (split) return { nodes: split, method: "auto-split (structural)" };

  // 4) single-page fallback — whole body is one slide
  return { nodes: [body], method: "single-page (no split found)" };
}

export function parseDeckHtml(htmlString, fileName = "演示文稿") {
  const doc = new DOMParser().parseFromString(htmlString, "text/html");

  const headStyles = Array.from(doc.querySelectorAll("style, link[rel='stylesheet'], meta[name='viewport']"))
    .map((el) => el.outerHTML)
    .join("\n");

  const { nodes, method } = segmentSlides(doc);

  // Tag the deck's own chrome (page counter / dots / progress) that sits as a
  // sibling of the pages or is fixed-positioned, so the isolation CSS can hide
  // it during playback — otherwise it shows a stuck "01/09" that conflicts with
  // Demi's own (authoritative) page counter. Only tag when we actually split
  // into multiple pages (a single-page deck has no competing chrome to hide).
  if (nodes.length >= 2) {
    const pageSet = new Set(nodes);
    const parents = new Set(nodes.map((n) => n.parentElement).filter(Boolean));
    for (const parent of parents) {
      for (const sib of Array.from(parent.children)) {
        if (pageSet.has(sib) || NON_PAGE_TAGS.has(sib.tagName)) continue;
        if (isChromeNode(sib)) sib.setAttribute("data-demi-chrome", "");
      }
    }
    // also any fixed/sticky chrome anywhere in the doc
    for (const el of Array.from(doc.body.querySelectorAll("[style]"))) {
      if (pageSet.has(el)) continue;
      const st = el.getAttribute("style") || "";
      if (/position\s*:\s*(fixed|sticky)/i.test(st) && (el.textContent || "").replace(/\s+/g, "").length < 24) {
        el.setAttribute("data-demi-chrome", "");
      }
    }
  }

  const bodyClass = doc.body?.getAttribute("class") || "";
  const bodyStyle = doc.body?.getAttribute("style") || "";

  const slides = nodes.map((n, i) => {
    const text = (n.textContent || "").replace(/\s+/g, " ").trim();
    const heading = n.querySelector?.("h1,h2,h3,[class*=title]");
    const title = (heading?.textContent || "").replace(/\s+/g, " ").trim() || `第 ${i + 1} 页`;
    const marker = `demi-slide-${i}`;
    n.setAttribute("data-demi-slide-id", marker);
    // Tag the ancestor chain so isolation CSS can also un-hide any wrapper the
    // deck collapsed (carousel containers, .reveal .slides, overflow clips…).
    let p = n.parentElement;
    while (p && p !== doc.body && p !== doc.documentElement) {
      p.setAttribute("data-demi-ancestor", "");
      p = p.parentElement;
    }
    return { index: i, marker, html: n.outerHTML, text, title };
  });

  return {
    name: fileName.replace(/\.[^.]+$/, ""),
    slides,
    method,
    headStyles,
    bodyClass,
    bodyStyle,
    fullHtml: "<!doctype html>\n" + doc.documentElement.outerHTML,
  };
}

// Build the srcdoc for one slide's iframe. Rendered at a fixed logical size
// (1280×720) and scaled to fit by the <SlideFrame/> component.
//
// Isolation is the tricky part: real HTML decks hide inactive slides in many
// different ways — display:none, opacity:0, visibility:hidden, an "active"
// class, or a carousel transform:translateX(...). We can't know which, so for
// the slide we want to show we force EVERY common hiding mechanism back to a
// visible/identity value (not just display). Otherwise pages after the first
// render blank. We keep these resets scoped to the slide-level element so the
// slide's own inner animations/layout are untouched.
// Per-slide reveal CSS. This is the ONLY part that changes between pages, so
// <SlideFrame/> injects it into an already-loaded iframe (id="demi-active")
// instead of reloading the whole document — page switches become instant.
export function slideIsolationCss(marker) {
  return `[data-demi-slide-id="${marker}"]{
          display:block!important;
          position:absolute!important;
          inset:0!important;
          left:0!important;top:0!important;right:auto!important;bottom:auto!important;
          width:1280px!important;
          height:720px!important;
          max-width:none!important;max-height:none!important;
          margin:0!important;
          opacity:1!important;
          visibility:visible!important;
          transform:none!important;
          translate:none!important;
          scale:none!important;
          rotate:none!important;
          filter:none!important;
          clip-path:none!important;
          z-index:1!important;
          pointer-events:auto!important;
          animation:none!important;
        }`;
}

export function slideSrcDoc(deck, slide) {
  if (deck.fullHtml && slide.marker) {
    const iso = `<style>
        html,body{margin:0!important;padding:0!important;width:1280px!important;height:720px!important;overflow:hidden!important;background:#fff;}
        /* Un-hide every wrapper between <body> and the active slide. */
        [data-demi-ancestor]{
          display:block!important;opacity:1!important;visibility:visible!important;
          transform:none!important;translate:none!important;scale:none!important;rotate:none!important;
          filter:none!important;clip-path:none!important;overflow:visible!important;
          position:static!important;width:auto!important;height:auto!important;
          max-width:none!important;max-height:none!important;margin:0!important;
        }
        /* Hard-hide every slide… */
        [data-demi-slide-id]{display:none!important;}
        /* Hide the deck's own stuck chrome (counter/dots/progress) — Demi's
           overlay is the authoritative page indicator. */
        [data-demi-chrome]{display:none!important;}
      </style>
      <!-- …then reveal just the current one. Swapped LIVE on page change by
           <SlideFrame/> (no document reload), so keep it in its own element. -->
      <style id="demi-active">${slideIsolationCss(slide.marker)}</style>`;

    // Many decks build their page counter / dots / progress at RUNTIME via their
    // own JS (e.g. document.createElement('div').className='dot'), so we can't
    // tag them at parse time. This script runs inside the iframe AFTER the deck's
    // scripts and hides positioned chrome that's stuck on the deck's own (frozen)
    // page index — Demi's overlay is the authoritative counter. Conservative:
    // only positioned, short-text elements whose class looks like pagination, or
    // a literal "NN / NN" counter. Never touches the slide nodes themselves.
    const chromeScript = `<script>(function(){
      var RE=/(^|[-_ ])(dots?|nav|pager|paginat|indicator|page-?nav|slide-?nav|deck-?nav|progress-?dots?|page-?num|page-?count|pagenum|count|counter)([-_ 0-9]|$)/i;
      function key(el){var c=el.className;var cn=(c&&c.baseVal!==undefined)?c.baseVal:(typeof c==='string'?c:(el.getAttribute&&el.getAttribute('class'))||'');return cn+' '+(el.id||'');}
      function hide(el){try{el.style.setProperty('display','none','important');}catch(e){}}
      function sweep(){try{
        var all=document.body?document.body.querySelectorAll('*'):[];
        for(var i=0;i<all.length;i++){var el=all[i];
          if(el.hasAttribute&&el.hasAttribute('data-demi-slide-id'))continue;
          if(el.querySelector&&el.querySelector('[data-demi-slide-id]'))continue;
          var st=window.getComputedStyle(el),p=st.position;
          if(p!=='fixed'&&p!=='absolute'&&p!=='sticky')continue;
          var txt=(el.textContent||'').replace(/\\s+/g,'');
          if(RE.test(key(el))&&txt.length<60){hide(el);continue;}
          if(el.children.length<=3&&/^0?\\d{1,3}\\s*\\/\\s*0?\\d{1,3}$/.test((el.textContent||'').trim()))hide(el);
        }
      }catch(e){}}
      function start(){sweep();setTimeout(sweep,80);setTimeout(sweep,300);setTimeout(sweep,900);
        try{new MutationObserver(sweep).observe(document.body||document.documentElement,{childList:true,subtree:true});}catch(e){}}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
    })();</scr` + `ipt>`;

    // Inject style before </head> (fallback <body>/start); chrome script before
    // </body> so it runs after the deck's own scripts.
    let out = deck.fullHtml;
    if (out.includes("</head>")) out = out.replace("</head>", iso + "</head>");
    else if (out.includes("<body")) out = out.replace(/<body[^>]*>/i, (m) => m + iso);
    else out = iso + out;
    if (out.includes("</body>")) out = out.replace("</body>", chromeScript + "</body>");
    else out = out + chromeScript;
    return out;
  }
  return `<!doctype html><html><head><meta charset="utf-8">
${deck.headStyles}
<style>
  html,body{margin:0;padding:0;width:1280px;height:720px;overflow:hidden;background:#fff;}
  *{box-sizing:border-box;}
  /* if a slide element is full-viewport, pin it to the frame */
  body > [data-slide], body > section, body > .slide, body > .page{
    width:1280px;height:720px;margin:0;
  }
</style>
</head><body class="${deck.bodyClass}" style="${deck.bodyStyle}">${slide.html}</body></html>`;
}

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

// 内置示例稿：一份手绘风的 Demi 介绍稿（与产品视觉统一），配套讲稿见 SAMPLE_SCRIPTS。
// 点「使用内置示例稿」即可直接体验"上传 HTML → 小人逐页讲"的完整流程。
const DEMI_FIGURE = `<svg class="demi" viewBox="0 0 152 200" fill="none" aria-hidden="true">
  <path d="M75 80 C99 80 101 112 99 130 C97 150 88 161 75 161 C62 161 53 150 51 130 C49 112 51 80 75 80 Z" fill="#FBF3E4" stroke="#3B332E" stroke-width="4" stroke-linejoin="round"/>
  <path d="M67 159 L63 184" stroke="#3B332E" stroke-width="4" stroke-linecap="round"/>
  <path d="M85 159 L89 184" stroke="#3B332E" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="61" cy="186" rx="10" ry="6" fill="#C9702F" stroke="#3B332E" stroke-width="3"/>
  <ellipse cx="91" cy="186" rx="10" ry="6" fill="#C9702F" stroke="#3B332E" stroke-width="3"/>
  <circle cx="76" cy="48" r="33" fill="#FBF3E4" stroke="#3B332E" stroke-width="4"/>
  <path d="M76 16 q10 -7 6 -15 q-1 7 -6 10" fill="#FBF3E4" stroke="#3B332E" stroke-width="4" stroke-linejoin="round"/>
  <path d="M54 81 q22 13 44 0" stroke="#E8915B" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M95 82 q7 9 3 19" stroke="#E8915B" stroke-width="9" fill="none" stroke-linecap="round"/>
  <ellipse cx="58" cy="57" rx="6.5" ry="4.4" fill="#F3B58C" opacity=".7"/>
  <ellipse cx="93" cy="57" rx="6.5" ry="4.4" fill="#F3B58C" opacity=".7"/>
  <circle cx="67" cy="47" r="4" fill="#3B332E"/><circle cx="86" cy="47" r="4" fill="#3B332E"/>
  <circle cx="68.4" cy="45.6" r="1.2" fill="#fff"/><circle cx="87.4" cy="45.6" r="1.2" fill="#fff"/>
  <path d="M68 61 q8.5 7 17 0" stroke="#3B332E" stroke-width="3.2" fill="none" stroke-linecap="round"/>
</svg>`;

export const SAMPLE_DECK_HTML = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Caveat:wght@600;700&family=Quicksand:wght@500;600;700&display=swap');
  :root{--paper:#FBF3E4;--paper2:#F5E8CF;--card:#FFFBF2;--ink:#3B332E;--soft:#7A6F63;--orange:#E8915B;--orange-deep:#D2703A;--sage:#8FAE6B;}
  *{box-sizing:border-box;}
  .slide{position:relative;width:1280px;height:720px;overflow:hidden;background:var(--paper);color:var(--ink);
    padding:74px 92px;font-family:'Quicksand',sans-serif;}
  .slide::before{content:"";position:absolute;inset:0;pointer-events:none;
    background-image:radial-gradient(#3B332E .6px,transparent .6px);background-size:22px 22px;opacity:.05;}
  .slide>*{position:relative;}
  h1{font-family:'Fredoka',sans-serif;font-weight:700;font-size:80px;line-height:1.04;margin:14px 0 0;letter-spacing:-.5px;}
  h2{font-family:'Fredoka',sans-serif;font-weight:700;font-size:52px;line-height:1.12;margin:0 0 26px;}
  .brand{display:flex;align-items:center;gap:11px;font-family:'Fredoka',sans-serif;font-weight:700;font-size:26px;color:var(--orange-deep);}
  .brand .sp{font-size:28px;}
  .kicker{display:inline-block;font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;color:#fff;
    background:var(--orange);padding:6px 18px;border-radius:30px;margin-bottom:20px;}
  .sub{font-size:30px;color:var(--soft);margin-top:20px;line-height:1.5;max-width:880px;}
  .lead{font-size:30px;line-height:1.55;max-width:1040px;}
  .lead b{color:var(--orange-deep);}
  .tag{font-family:'Caveat',cursive;font-weight:700;color:var(--orange-deep);font-size:34px;}
  .chips{display:flex;gap:14px;margin-top:30px;}
  .chip{font-weight:700;font-size:21px;border:2.4px solid var(--ink);border-radius:40px;padding:9px 20px;background:#fff;}
  .center{height:100%;display:flex;flex-direction:column;justify-content:center;}
  .cols{display:flex;gap:30px;margin-top:26px;}
  .col{flex:1;}
  .sk{border:2.6px solid var(--ink);background:var(--card);border-radius:255px 14px 225px 16px/16px 225px 18px 255px;}
  .sk.r2{border-radius:200px 18px 210px 14px/14px 205px 16px 215px;}
  .sk.alt{border-radius:18px 230px 16px 240px/235px 16px 245px 14px;}
  .card{padding:26px 28px;height:100%;}
  .card .em{font-size:40px;}
  .card h3{font-family:'Fredoka',sans-serif;font-size:30px;margin:8px 0 8px;}
  .card p{font-size:21px;color:var(--soft);line-height:1.5;margin:0;}
  .badge{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;
    background:var(--orange);color:#fff;font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;border:2.4px solid var(--ink);}
  .steps{display:flex;gap:18px;margin-top:34px;}
  .step{flex:1;padding:22px;}
  .step .n{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;
    background:var(--sage);color:#fff;font-family:'Fredoka',sans-serif;font-weight:700;font-size:23px;border:2.4px solid var(--ink);margin-bottom:12px;}
  .step h4{font-family:'Fredoka',sans-serif;font-size:25px;margin:0 0 6px;}
  .step p{font-size:18px;color:var(--soft);margin:0;line-height:1.45;}
  .opts{font-size:31px;line-height:2;margin-top:14px;}
  .opts .b{font-family:'Fredoka',sans-serif;font-weight:600;color:var(--orange-deep);margin-right:14px;}
  .two{display:flex;gap:40px;align-items:center;margin-top:24px;}
  .two .txt{flex:1.04;}
  .two .art{flex:1;display:flex;justify-content:center;}
  .demi{height:150px;}
  .demi.sm{height:96px;}
  .demi.lg{height:300px;}
  /* 截图位：把里面整块换成 <img class="shot"> 即可（替换说明见每页注释） */
  .shot{width:440px;height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:var(--paper2);border:3px dashed var(--orange-deep);color:#9A8C7C;
    border-radius:200px 18px 210px 14px/14px 205px 16px 215px;}
  .shot .ic{font-size:46px;}
  .shot .cap{font-family:'Fredoka',sans-serif;font-size:21px;font-weight:600;color:#8A7C6E;margin-top:8px;}
  .btn{display:inline-flex;align-items:center;gap:10px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:26px;
    background:var(--orange);color:#fff;border:2.6px solid var(--ink);padding:16px 34px;border-radius:140px 12px 150px 14px/14px 150px 12px 140px;box-shadow:4px 5px 0 var(--ink);margin-top:30px;}
  .foot{position:absolute;left:92px;bottom:44px;font-family:'Caveat',cursive;font-size:28px;color:#A99B8C;}
  /* 播放界面小样 */
  .mock{width:430px;height:300px;padding:18px;display:flex;flex-direction:column;position:relative;}
  .mock .scr{flex:1;border:2.2px solid var(--ink);border-radius:12px;background:#fff;padding:16px;}
  .mock .ln{height:13px;border-radius:8px;background:var(--paper2);margin-bottom:10px;}
  .mbars{display:flex;gap:12px;align-items:flex-end;height:90px;margin-top:14px;}
  .mbars b{flex:1;background:#F3C8A6;border-radius:6px 6px 0 0;}
  .mbars b.hot{background:var(--orange);}
  .mock .demi{position:absolute;right:14px;bottom:62px;height:104px;}
  .msub{margin-top:12px;background:var(--ink);color:#fff;font-size:16px;padding:7px 14px;border-radius:16px;width:max-content;}
  /* 网站小样 */
  .web{width:430px;height:300px;padding:0;overflow:hidden;display:flex;flex-direction:column;position:relative;}
  .web .bar{display:flex;gap:7px;padding:12px 14px;border-bottom:2.2px solid var(--ink);background:#fff;}
  .web .bar s{width:13px;height:13px;border-radius:50%;background:var(--paper2);}
  .web .body{flex:1;padding:18px;display:flex;flex-direction:column;gap:12px;}
  .web .sec{height:42px;border:2px solid var(--ink);border-radius:10px;background:#fff;}
  .web .sec.hl{background:var(--paper2);border-color:var(--orange-deep);border-style:dashed;}
  .web .demi{position:absolute;right:12px;bottom:84px;height:92px;}
</style></head><body>

<section class="slide">
  <div class="two" style="height:100%;margin:0">
    <div class="txt center" style="height:auto">
      <div class="brand"><span class="sp">✦</span> Demi</div>
      <h1>不用出镜的<br>AI 演示助手</h1>
      <p class="sub">选一个讲解搭子，传上你的内容，她替你写稿、开口讲解——你不用露脸，也不用紧张。</p>
      <div class="chips"><span class="chip">AI 写稿</span><span class="chip">自然语音</span><span class="chip">不用露脸</span></div>
    </div>
    <div class="art">${DEMI_FIGURE.replace('class="demi"', 'class="demi lg"')}</div>
  </div>
</section>

<section class="slide">
  <div class="kicker">为什么需要 Demi</div>
  <h2>内容做好了，却卡在“开口讲”这一步</h2>
  <div class="cols">
    <div class="col sk card"><div class="em">😶</div><h3>不想出镜</h3><p>录视频要露脸、要打光，还得重来好多遍。</p></div>
    <div class="col sk card r2"><div class="em">😵</div><h3>讲不顺</h3><p>对着 PPT，不知道每页该说什么、怎么承接。</p></div>
    <div class="col sk card alt"><div class="em">🔁</div><h3>改一次重录一次</h3><p>内容一改，整段讲解就得从头再来。</p></div>
  </div>
  <p class="lead" style="margin-top:30px">这些，交给一个<b>会写稿、会开口</b>的小人就好。</p>
</section>

<section class="slide">
  <div class="kicker">一句话介绍</div>
  <h2>我是你的 AI 讲解员</h2>
  <p class="lead">你给内容，我<b>自动写讲稿、用自然语音讲出来</b>，还配上动作和字幕。用法有两种：</p>
  <div class="cols">
    <div class="col sk card"><div class="badge">1</div><h3>上传 PPT 帮你讲</h3><p>传一份 HTML 幻灯片，逐页生成讲稿、点一次自动连播。</p></div>
    <div class="col sk card r2"><div class="badge">2</div><h3>嵌入网站帮你讲</h3><p>一段代码贴进你的网站，我走到每个区块旁边讲解。</p></div>
  </div>
</section>

<section class="slide">
  <div class="kicker">玩法一</div>
  <h2>上传 PPT，帮你逐页讲</h2>
  <div class="two">
    <div class="txt"><p class="lead">把 HTML 幻灯片拖进来，我自动认出每一页，写好口播稿，再用自然语音<b>逐页朗读、自动翻页</b>。角落、舞台、画中画三种布局随你切。</p>
      <div class="tag">↓ 大概就长这样</div></div>
    <div class="art"><div class="shot"><div class="ic">📷</div><div class="cap">放这里：上传后的播放界面截图</div>
      <!-- 把上面这个 <div class="shot">…</div> 整块换成：<img src="你的截图.png" class="shot" style="object-fit:cover"> --></div></div>
  </div>
</section>

<section class="slide">
  <div class="kicker">玩法二</div>
  <h2>嵌进你的网站，带着访客逛</h2>
  <div class="two">
    <div class="txt"><p class="lead">写好导览词、复制一段代码贴到你的网站，我就<b>走到每个区块旁边指着讲</b>，还能加速、暂停、上一站下一站，像个真人导览。</p>
      <div class="tag">↓ 我会走过去讲</div></div>
    <div class="art"><div class="shot"><div class="ic">📷</div><div class="cap">放这里：小人在网站上讲解的截图</div>
      <!-- 把上面这个 <div class="shot">…</div> 整块换成：<img src="你的截图.png" class="shot" style="object-fit:cover"> --></div></div>
  </div>
</section>

<section class="slide">
  <div class="kicker">它怎么工作</div>
  <h2>四步，从内容到“开口讲”</h2>
  <div class="steps">
    <div class="step sk"><div class="n">1</div><h4>选形态</h4><p>从素材库挑一个出场小人。</p></div>
    <div class="step sk r2"><div class="n">2</div><h4>给内容</h4><p>上传 HTML，或填导览词嵌入。</p></div>
    <div class="step sk alt"><div class="n">3</div><h4>AI 写稿</h4><p>逐页生成口播讲稿。</p></div>
    <div class="step sk r2"><div class="n">4</div><h4>开口讲</h4><p>自然语音 + 动效，自动连播。</p></div>
  </div>
  <p class="lead" style="margin-top:36px">全程<b>不用出镜、不用录音</b>，内容改了，重新生成就好。</p>
</section>

<section class="slide">
  <div class="center">
    <div class="brand"><span class="sp">✦</span> Demi</div>
    <h1 style="margin-top:18px">现在，<br>让我替你讲</h1>
    <p class="sub">选个形象，传上内容，剩下的交给我。</p>
    <div><span class="btn">选个形象，开始 →</span></div>
  </div>
  <div class="foot">不用出镜，也能讲得很好 ~</div>
</section>

</body></html>`;

// 内置示例稿配套讲稿：第一人称、口语化，逐页讲清楚。点示例稿即用，不必等 GLM 生成。
export const SAMPLE_SCRIPTS = [
  { page: 1, line: "大家好，我是 Demi！我是一个不用你出镜的 AI 演示助手。接下来这几页，就由我自己来给你讲讲，我到底能帮你做什么。" },
  { page: 2, line: "先说说为什么会有我。很多人内容明明做好了，却卡在开口讲这一步：要么不想出镜，要么对着 PPT 不知道每页说啥，要么内容一改就得重录。这些麻烦，交给我就行。" },
  { page: 3, line: "那我是什么呢？一句话，我是你的 AI 讲解员——你把内容给我，我自动写讲稿、用自然的声音讲出来，还会配上动作和字幕。用法有两种：上传 PPT，或者把我嵌进你的网站。" },
  { page: 4, line: "第一种最省事：你传一份 HTML 幻灯片，我会自动认出每一页，写好口播稿，然后逐页朗读、自动翻页。角落、舞台、画中画三种布局，随你切换。" },
  { page: 5, line: "第二种更有意思：写好导览词，复制一段代码贴到你自己的网站，我就能走到每个区块旁边，指着它讲给访客听，像个真人导览。" },
  { page: 6, line: "整个过程就四步：选一个出场形象，把内容给我，AI 自动生成讲稿，然后我就开口连着讲。全程不用你出镜、也不用录音，内容改了重新生成就好。" },
  { page: 7, line: "好啦，这就是我，Demi。选个形象、传上内容，剩下的交给我——不用出镜，也能讲得很好。来试试吧！" },
];
