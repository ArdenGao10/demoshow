import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { slideSrcDoc, SLIDE_W, SLIDE_H } from "../lib/slides.js";

// Renders one uploaded slide faithfully inside a sandboxed iframe, laid out at a
// fixed logical size (1280×720) and scaled to fill the container. The container
// keeps a 16:9 box so the user's slide is always the hero, untouched.
export default function SlideFrame({ deck, slide }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / SLIDE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const srcDoc = useMemo(() => (deck && slide ? slideSrcDoc(deck, slide) : ""), [deck, slide]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 6, background: "#fff" }}>
      <iframe
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
