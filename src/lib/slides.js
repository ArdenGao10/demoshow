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
        /* …then reveal just the current one, neutralizing all common hide tricks. */
        [data-demi-slide-id="${slide.marker}"]{
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
        }
      </style>`;

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

// A tiny built-in sample deck so the flow is demoable without a file on hand.
export const SAMPLE_DECK_HTML = `<!doctype html><html><head><style>
  .slide{width:1280px;height:720px;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;padding:80px 96px;background:#fff;}
  .slide.dark{background:#0F172A;color:#fff;display:flex;flex-direction:column;justify-content:center;}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:40px;font-weight:700;letter-spacing:1px;}
  .dot{width:22px;height:22px;background:#3B82F6;border-radius:4px;}
  h1{font-size:84px;font-weight:800;margin:0;line-height:1.05;}
  h2{font-size:52px;font-weight:700;margin:0 0 40px;}
  .kicker{font-size:20px;font-weight:600;color:#2563EB;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;}
  .sub{font-size:30px;color:#94A3B8;margin-top:24px;}
  .row{display:flex;gap:8%;align-items:flex-end;}
  .bars{display:flex;gap:24px;align-items:flex-end;height:240px;flex:1;}
  .bar{flex:1;border-radius:6px 6px 0 0;background:#BFDBFE;}
  .bar.hot{background:#2563EB;}
  .stat{flex:1;}
  .big{font-size:96px;font-weight:800;line-height:1;}
  .note{font-size:24px;color:#6B7280;margin-top:18px;}
  .item{display:flex;align-items:center;gap:32px;margin-bottom:34px;}
  .num{font-size:48px;font-weight:800;color:#BFDBFE;width:70px;}
  .it-t{font-size:36px;font-weight:700;}
  .it-d{font-size:22px;color:#6B7280;margin-top:6px;}
</style></head><body>
<section class="slide dark">
  <div class="brand"><span class="dot"></span>NORTHWIND</div>
  <h1>Q3 Review</h1>
  <p class="sub">Where we are, and where we're going.</p>
</section>
<section class="slide">
  <div class="kicker">Growth</div>
  <h2>We doubled active users in one quarter</h2>
  <div class="row">
    <div class="bars"><div class="bar" style="height:38%"></div><div class="bar" style="height:52%"></div><div class="bar" style="height:70%"></div><div class="bar hot" style="height:100%"></div></div>
    <div class="stat"><div class="big">2.1×</div><div class="note">monthly active users, Jun → Sep</div></div>
  </div>
</section>
<section class="slide">
  <div class="kicker">What's next · Q4</div>
  <h2>Three things we're shipping</h2>
  <div class="item"><div class="num">01</div><div><div class="it-t">Team workspaces</div><div class="it-d">让团队共用一个演示空间</div></div></div>
  <div class="item"><div class="num">02</div><div><div class="it-t">Voice library</div><div class="it-d">更多语气与音色可选</div></div></div>
  <div class="item"><div class="num">03</div><div><div class="it-t">Live Q&amp;A</div><div class="it-d">现场答观众提问</div></div></div>
</section>
</body></html>`;
