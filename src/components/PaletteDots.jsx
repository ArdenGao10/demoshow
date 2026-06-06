import { useEffect, useState } from "react";

const PALETTES = [
  ["warm", "#E8915B"],
  ["woody", "#C98A4E"],
  ["cream", "#ECA77C"],
  ["clay", "#D2703A"],
];

// Tiny color-scheme switcher. Sets data-palette on <html>, persisted.
export default function PaletteDots({ compact = false }) {
  const [cur, setCur] = useState(() => localStorage.getItem("demi_palette") || "warm");
  useEffect(() => {
    document.documentElement.setAttribute("data-palette", cur);
    localStorage.setItem("demi_palette", cur);
  }, [cur]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {!compact && <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>配色</span>}
      {PALETTES.map(([k, c]) => (
        <button
          key={k}
          onClick={() => setCur(k)}
          title={k}
          aria-label={`配色 ${k}`}
          style={{
            width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer",
            border: cur === k ? "2.6px solid var(--ink)" : "2px solid rgba(59,51,46,.35)",
            outline: cur === k ? "2px solid var(--orange)" : "none", outlineOffset: 1,
          }}
        />
      ))}
    </div>
  );
}
