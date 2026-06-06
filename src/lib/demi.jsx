// demi.jsx — Demi character kit (ES module port of the mockup).
// Round head + soft "bean" body + stubby limbs. Every stroke runs through the
// #sketch displacement filter for an inky, hand-drawn wobble.

const INK = "#3B332E";
const PAPER = "#FBF3E4";

export const DEMI_PRESETS = {
  classic: { name: "Demi", accent: "#E8915B", blush: "#F3B58C", shoe: "#C9702F" },
  mint: { name: "Sage", accent: "#8FB089", blush: "#B6D2AE", shoe: "#5E8758" },
  blue: { name: "Blu", accent: "#7FA0C0", blush: "#AEC8DE", shoe: "#557699" },
  rose: { name: "Rosa", accent: "#D98AA0", blush: "#EEB6C5", shoe: "#B65C76" },
};

// Global SVG filters — render once near the app root.
export function SketchDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="sketch" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sketchSoft" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

function Hand({ x, y, r = 6 }) {
  return <circle cx={x} cy={y} r={r} fill={PAPER} stroke={INK} strokeWidth="3.4" />;
}
function Shoe({ x, y, rot = 0, color = INK }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx="11" ry="6.5" fill={color} stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Face({ blush, expression = "smile" }) {
  return (
    <g>
      <ellipse cx="58" cy="57" rx="6.5" ry="4.4" fill={blush} opacity="0.7" />
      <ellipse cx="93" cy="57" rx="6.5" ry="4.4" fill={blush} opacity="0.7" />
      {expression === "wink" ? (
        <>
          <circle cx="67" cy="47" r="3.9" fill={INK} />
          <path d="M81 47 q4.5 -4.5 9 0" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      ) : expression === "wow" ? (
        <>
          <circle cx="67" cy="47" r="4.6" fill={INK} />
          <circle cx="86" cy="47" r="4.6" fill={INK} />
        </>
      ) : expression === "happy" ? (
        <>
          <path d="M63 47 q4.5 -5 9 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M81 47 q4.5 -5 9 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="67" cy="47" r="4" fill={INK} />
          <circle cx="86" cy="47" r="4" fill={INK} />
          <circle cx="68.4" cy="45.6" r="1.2" fill="#fff" />
          <circle cx="87.4" cy="45.6" r="1.2" fill="#fff" />
        </>
      )}
      {expression === "happy" ? (
        <path d="M68 60 q8.5 9 17 0 q-8.5 4 -17 0Z" fill={INK} />
      ) : expression === "wow" ? (
        <ellipse cx="76.5" cy="63" rx="4.6" ry="6" fill={INK} />
      ) : expression === "think" ? (
        <path d="M70 64 q7 -3 14 1" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M68 61 q8.5 7 17 0" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

function HeadBody({ accent }) {
  return (
    <>
      <path
        d="M75 80 C99 80 101 112 99 130 C97 150 88 161 75 161 C62 161 53 150 51 130 C49 112 51 80 75 80 Z"
        fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round"
      />
      <circle cx="76" cy="48" r="33" fill={PAPER} stroke={INK} strokeWidth="4" />
      <path d="M76 16 q10 -7 6 -15 q-1 7 -6 10" fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M54 81 q22 13 44 0" stroke={accent} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M95 82 q7 9 3 19" stroke={accent} strokeWidth="9" fill="none" strokeLinecap="round" />
    </>
  );
}

export function DemiWave({ preset = "classic", className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={style} viewBox="0 0 150 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M67 159 L62 184" stroke={INK} strokeWidth="4" />
        <path d="M85 159 L90 184" stroke={INK} strokeWidth="4" />
        <Shoe x={59} y={187} rot={-8} color={p.shoe} />
        <Shoe x={93} y={187} rot={8} color={p.shoe} />
        <path d="M53 100 C45 114 44 124 47 132" stroke={INK} strokeWidth="4" />
        <path d="M97 98 C112 88 118 72 115 58" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={47} y={134} />
        <Hand x={114} y={55} />
        <Face blush={p.blush} expression="happy" />
        <path d="M124 50 q6 -3 9 -9" stroke={p.accent} strokeWidth="3" />
        <path d="M128 60 q8 -2 13 -6" stroke={p.accent} strokeWidth="3" />
      </g>
    </svg>
  );
}

export function DemiIdle({ preset = "classic", expression = "smile", className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={style} viewBox="0 0 150 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M67 159 L63 184" stroke={INK} strokeWidth="4" />
        <path d="M85 159 L89 184" stroke={INK} strokeWidth="4" />
        <Shoe x={60} y={187} rot={-7} color={p.shoe} />
        <Shoe x={92} y={187} rot={7} color={p.shoe} />
        <path d="M53 100 C45 114 44 124 47 132" stroke={INK} strokeWidth="4" />
        <path d="M99 100 C107 114 108 124 105 132" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={47} y={134} />
        <Hand x={105} y={134} />
        <Face blush={p.blush} expression={expression} />
      </g>
    </svg>
  );
}

export function DemiThink({ preset = "classic", className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={style} viewBox="0 0 175 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M67 159 L63 184" stroke={INK} strokeWidth="4" />
        <path d="M85 159 L89 184" stroke={INK} strokeWidth="4" />
        <Shoe x={60} y={187} rot={-7} color={p.shoe} />
        <Shoe x={92} y={187} rot={7} color={p.shoe} />
        <path d="M53 100 C45 114 44 124 47 132" stroke={INK} strokeWidth="4" />
        <path d="M98 102 C104 88 96 76 89 70" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={47} y={134} />
        <Hand x={88} y={68} r={6.5} />
        <Face blush={p.blush} expression="think" />
        <circle cx="122" cy="40" r="4.2" fill={p.accent} />
        <circle cx="138" cy="27" r="6.4" fill={p.accent} />
        <circle cx="158" cy="12" r="8.6" fill={p.accent} opacity="0.85" />
      </g>
    </svg>
  );
}

export function DemiPoint({ preset = "classic", flip = false, className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={{ ...style, transform: flip ? "scaleX(-1)" : "none" }} viewBox="0 0 160 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M67 159 L62 184" stroke={INK} strokeWidth="4" />
        <path d="M85 159 L90 184" stroke={INK} strokeWidth="4" />
        <Shoe x={59} y={187} rot={-8} color={p.shoe} />
        <Shoe x={93} y={187} rot={8} color={p.shoe} />
        <path d="M53 100 C45 114 44 124 47 132" stroke={INK} strokeWidth="4" />
        <path d="M97 96 L128 66" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={47} y={134} />
        <g filter="url(#sketch)">
          <circle cx="130" cy="64" r="6" fill={PAPER} stroke={INK} strokeWidth="3.4" />
          <path d="M132 60 l7 -7" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        </g>
        <Face blush={p.blush} expression="happy" />
      </g>
    </svg>
  );
}

export function DemiWalk({ preset = "classic", flip = false, className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={{ ...style, transform: flip ? "scaleX(-1)" : "none" }} viewBox="0 0 150 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 159 L56 183" stroke={INK} strokeWidth="4" />
        <path d="M82 159 L98 180" stroke={INK} strokeWidth="4" />
        <Shoe x={52} y={186} rot={-14} color={p.shoe} />
        <Shoe x={102} y={182} rot={10} color={p.shoe} />
        <path d="M53 100 C46 112 46 120 50 128" stroke={INK} strokeWidth="4" />
        <path d="M99 100 C106 110 108 120 106 128" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={50} y={130} />
        <Hand x={106} y={130} />
        <Face blush={p.blush} expression="smile" />
      </g>
    </svg>
  );
}

export function DemiPeek({ preset = "classic", className = "", style = {} }) {
  const p = DEMI_PRESETS[preset];
  return (
    <svg className={className} style={style} viewBox="0 0 150 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M67 159 L63 184" stroke={INK} strokeWidth="4" />
        <path d="M85 159 L89 184" stroke={INK} strokeWidth="4" />
        <Shoe x={60} y={187} rot={-7} color={p.shoe} />
        <Shoe x={92} y={187} rot={7} color={p.shoe} />
        <path d="M53 100 C45 114 44 124 47 132" stroke={INK} strokeWidth="4" />
        <path d="M99 100 C107 114 108 124 105 132" stroke={INK} strokeWidth="4" />
        <HeadBody accent={p.accent} />
        <Hand x={47} y={134} />
        <Hand x={105} y={134} />
        <Face blush={p.blush} expression="wow" />
      </g>
    </svg>
  );
}

export function BlackCat({ className = "", style = {}, flip = false }) {
  return (
    <svg className={className} style={{ ...style, transform: flip ? "scaleX(-1)" : "none" }} viewBox="0 0 120 80" fill="none">
      <g filter="url(#sketchSoft)">
        <path d="M22 64 q4 -30 30 -30 q26 0 30 30 z" fill={INK} />
        <circle cx="86" cy="44" r="16" fill={INK} />
        <path d="M74 32 l-3 -13 l12 7 z" fill={INK} />
        <path d="M98 32 l3 -13 l-12 7 z" fill={INK} />
        <path d="M22 60 q-18 -4 -14 -22 q2 -8 8 -8" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M80 43 q3 -3 6 0" stroke="#FBF3E4" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M90 43 q3 -3 6 0" stroke="#FBF3E4" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M84 49 l4 3 l-4 3" stroke="#FBF3E4" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function GrassTuft({ className = "", style = {}, color = "#8FAE6B" }) {
  return (
    <svg className={className} style={style} viewBox="0 0 60 40" fill="none">
      <g filter="url(#sketchSoft)" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M14 38 q-3 -22 -8 -28" />
        <path d="M22 38 q0 -26 -1 -32" />
        <path d="M30 38 q3 -24 10 -30" />
        <path d="M38 38 q1 -20 8 -24" />
      </g>
    </svg>
  );
}

export function WoodFloor({ className = "", style = {}, width = 600, height = 70, wood = "var(--wood)", woodDeep = "var(--wood-deep)" }) {
  return (
    <svg className={className} style={style} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" fill="none">
      <g filter="url(#sketchSoft)">
        <rect x="2" y="8" width={width - 4} height={height - 12} rx="10" fill={wood} stroke={INK} strokeWidth="3.5" />
        <path d={`M${width * 0.22} 12 V${height - 8}`} stroke={woodDeep} strokeWidth="2.4" />
        <path d={`M${width * 0.5} 12 V${height - 8}`} stroke={woodDeep} strokeWidth="2.4" />
        <path d={`M${width * 0.74} 12 V${height - 8}`} stroke={woodDeep} strokeWidth="2.4" />
        <path d={`M${width * 0.1} ${height * 0.5} h26`} stroke={woodDeep} strokeWidth="2" opacity="0.6" />
        <path d={`M${width * 0.6} ${height * 0.42} h30`} stroke={woodDeep} strokeWidth="2" opacity="0.6" />
      </g>
    </svg>
  );
}
