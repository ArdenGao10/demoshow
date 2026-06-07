// 手绘风格的小图标 SVG —— 用来替换原本的苹果 emoji。
// 都走 #sketch 滤镜,跟整站的"抖动笔触"保持一致。
const INK = "#3B332E";

function wrap(size, viewBox, children) {
  return (
    <svg width={size} height={size} viewBox={viewBox} style={{ verticalAlign: "middle", display: "inline-block" }} aria-hidden="true">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">{children}</g>
    </svg>
  );
}

export function Sparkle({ size = 16, color = "currentColor" }) {
  return wrap(size, "0 0 22 22", (
    <g>
      <path d="M11 2 L12.3 8.7 L19 10 L12.3 11.3 L11 18 L9.7 11.3 L3 10 L9.7 8.7 Z" fill={color} stroke={color} strokeWidth="1.4"/>
      <path d="M17 3 L17.6 5 L19.5 5.6 L17.6 6.2 L17 8.2 L16.4 6.2 L14.5 5.6 L16.4 5 Z" fill={color} stroke={color} strokeWidth="1"/>
      <path d="M4 14 L4.5 15.5 L6 16 L4.5 16.5 L4 18 L3.5 16.5 L2 16 L3.5 15.5 Z" fill={color} stroke={color} strokeWidth="1"/>
    </g>
  ));
}

export function Warn({ size = 16, color = "currentColor" }) {
  return wrap(size, "0 0 22 22", (
    <g stroke={color} strokeWidth="2" fill="none">
      <path d="M11 3 L20 18.5 L2 18.5 Z"/>
      <line x1="11" y1="8.5" x2="11" y2="13"/>
      <circle cx="11" cy="15.7" r="0.9" fill={color}/>
    </g>
  ));
}

export function Trash({ size = 16, color = "currentColor" }) {
  return wrap(size, "0 0 22 22", (
    <g stroke={color} strokeWidth="1.9" fill="none">
      <path d="M3.5 6.2 L18.5 6.2"/>
      <path d="M8.4 6.2 Q8.4 3.4 11 3.4 Q13.6 3.4 13.6 6.2"/>
      <path d="M5 6.4 L6.2 18.5 L15.8 18.5 L17 6.4"/>
      <path d="M8.7 9.5 L8.9 15.5"/>
      <path d="M13.3 9.5 L13.1 15.5"/>
    </g>
  ));
}

export function Rabbit({ size = 22, color = INK }) {
  return wrap(size, "0 0 26 28", (
    <g stroke={color} strokeWidth="1.7" fill="#FBF3E4">
      <path d="M8 9 Q6 4 7.2 1.5 Q8.5 4.5 9.5 9"/>
      <path d="M18 9 Q20 4 18.8 1.5 Q17.5 4.5 16.5 9"/>
      <ellipse cx="13" cy="17" rx="8" ry="7.5"/>
      <circle cx="10" cy="16" r="1" fill={color} stroke="none"/>
      <circle cx="16" cy="16" r="1" fill={color} stroke="none"/>
      <ellipse cx="13" cy="19.2" rx="1.6" ry="1.1" fill="#D2703A" stroke={color} strokeWidth="1.2"/>
      <path d="M10 21.4 Q13 23.5 16 21.4" fill="none"/>
    </g>
  ));
}

export function Medal({ size = 18, rank = 1 }) {
  const gold = "#E0B14A";
  const silver = "#C2C2C2";
  const color = rank === 1 ? gold : silver;
  return wrap(size, "0 0 22 22", (
    <g strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 2 L10 10" stroke={INK} fill="none"/>
      <path d="M16 2 L12 10" stroke={INK} fill="none"/>
      <circle cx="11" cy="14.5" r="6.2" fill={color} stroke={INK}/>
      <text x="11" y="17.4" textAnchor="middle" fontSize="6" fontWeight="800" fill={INK} stroke="none" style={{ fontFamily: "inherit" }}>{rank}</text>
    </g>
  ));
}

export function ArrowUp({ size = 22, color = "currentColor" }) {
  return wrap(size, "0 0 24 24", (
    <g stroke={color} strokeWidth="2.2" fill="none">
      <line x1="12" y1="20" x2="12" y2="5"/>
      <path d="M5 11 L12 4 L19 11"/>
    </g>
  ));
}
