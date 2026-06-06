import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { slideSrcDoc, slideIsolationCss, SLIDE_W, SLIDE_H } from "../lib/slides.js";

// Renders one uploaded slide faithfully inside a sandboxed iframe, laid out at a
// fixed logical size (1280×720) and scaled to fill the container. The container
// keeps a 16:9 box so the user's slide is always the hero, untouched.
//
// Page switching: the iframe's srcDoc contains the WHOLE deck and reveals one
// slide via isolation CSS. Re-deriving srcDoc per page would reload the entire
// document on every ⏭ — the visible stutter on page change. Instead we key the
// srcDoc on the DECK and, when the page changes, swap only the #demi-active
// <style> inside the already-loaded iframe. No reload → instant transitions.
// (Decks without fullHtml/marker fall back to the per-slide srcDoc swap.)
export default function SlideFrame({ deck, slide }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const [scale, setScale] = useState(1);

  const live = !!(deck?.fullHtml && slide?.marker); // can we switch without reloading?

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / SLIDE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // In live mode, srcDoc depends only on the deck — the same loaded document is
  // reused across pages. In fallback mode it depends on the slide (old behavior).
  const srcDoc = useMemo(
    () => (deck && slide ? slideSrcDoc(deck, slide) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck, live ? null : slide]
  );

  // Live page switch: replace the #demi-active style's text inside the iframe so
  // the browser just re-applies CSS (instant) instead of reloading the document.
  useLayoutEffect(() => {
    if (!live) return;
    const apply = () => {
      const doc = frameRef.current?.contentDocument;
      const styleEl = doc?.getElementById("demi-active");
      if (!styleEl) return false;
      const css = slideIsolationCss(slide.marker);
      if (styleEl.textContent !== css) styleEl.textContent = css;
      return true;
    };
    // The iframe may not have parsed yet on first mount — retry on load.
    if (!apply()) {
      const f = frameRef.current;
      if (f) {
        const onLoad = () => apply();
        f.addEventListener("load", onLoad, { once: true });
        return () => f.removeEventListener("load", onLoad);
      }
    }
  }, [live, slide?.marker]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 6, background: "#fff" }}>
      <iframe
        ref={frameRef}
        title="slide"
        srcDoc={srcDoc}
        scrolling="no"
        sandbox="allow-scripts allow-same-origin"
        style={{
          position: "absolute", top: 0, left: 0, border: "none",
          width: SLIDE_W, height: SLIDE_H,
          transform: `scale(${scale})`, transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
