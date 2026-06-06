// characters.jsx — Demi 形态素材库 (ES module port).
// Parametric hand-drawn character: shared bean body + swappable hair / face /
// outfit, plus dedicated pet & chibi characters. All strokes use the global
// #sketch filter defined by <SketchDefs/> in demi.jsx.

const CINK = "#3B332E";
const CPAPER = "#FBF3E4";

export const HAIR = { brown: "#6B4F36", black: "#2E2A26", blonde: "#CDA75E", auburn: "#9C5A3C", grey: "#A59B8F", pink: "#D98AA0", mint: "#7FA98C" };

function CFace({ expr = "smile", blush = "#F3B58C", lashes = false, glasses = false, beard = false, mustache = false }) {
  return (
    <g>
      <ellipse cx="58" cy="57" rx="6.5" ry="4.4" fill={blush} opacity="0.7" />
      <ellipse cx="93" cy="57" rx="6.5" ry="4.4" fill={blush} opacity="0.7" />
      {beard && <path d="M52 52 C54 78 66 90 76 90 C86 90 98 78 100 52 C92 64 84 68 76 68 C68 68 60 64 52 52 Z" fill={beard === true ? "#5A4632" : beard} opacity="0.95" />}
      {expr === "happy" ? (
        <>
          <path d="M62 48 q5 -5.5 10 0" stroke={CINK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M81 48 q5 -5.5 10 0" stroke={CINK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : expr === "wink" ? (
        <>
          <circle cx="67" cy="47" r="4" fill={CINK} />
          <path d="M82 47 q4.5 -4.5 9 0" stroke={CINK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      ) : expr === "wow" ? (
        <>
          <circle cx="67" cy="46" r="4.6" fill={CINK} />
          <circle cx="86" cy="46" r="4.6" fill={CINK} />
        </>
      ) : (
        <>
          <circle cx="67" cy="47" r="4" fill={CINK} />
          <circle cx="86" cy="47" r="4" fill={CINK} />
          <circle cx="68.4" cy="45.6" r="1.2" fill="#fff" />
          <circle cx="87.4" cy="45.6" r="1.2" fill="#fff" />
        </>
      )}
      {lashes && (
        <>
          <path d="M62 44 l-3 -3 M71 44 l1 -3" stroke={CINK} strokeWidth="2" strokeLinecap="round" />
          <path d="M91 44 l3 -3 M82 44 l-1 -3" stroke={CINK} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {glasses && (
        <g stroke={CINK} strokeWidth="2.6" fill="none">
          <circle cx="67" cy="47" r="9" /><circle cx="86" cy="47" r="9" />
          <path d="M76 45 q0.5 1.6 1 0" />
          <path d="M58 45 l-7 -2 M95 45 l7 -2" strokeLinecap="round" />
        </g>
      )}
      {mustache && <path d="M64 64 q12 6 24 0 q-12 10 -24 0 Z" fill={mustache === true ? "#5A4632" : mustache} />}
      {!mustache &&
        (expr === "wow" ? (
          <ellipse cx="76.5" cy="63" rx="4.6" ry="6" fill={CINK} />
        ) : expr === "happy" ? (
          <path d="M68 60 q8.5 9 17 0 q-8.5 4 -17 0Z" fill={CINK} />
        ) : (
          <path d="M68 61 q8.5 7 17 0" stroke={CINK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        ))}
    </g>
  );
}

function Hair({ style, color = HAIR.brown }) {
  const f = { fill: color, stroke: CINK, strokeWidth: 3.2, strokeLinejoin: "round" };
  switch (style) {
    case "tuft":
      return <path d="M76 16 q10 -7 6 -15 q-1 7 -6 10" {...f} />;
    case "short":
      return <path d="M43 50 C44 18 60 12 76 12 C92 12 108 18 109 50 C100 33 90 28 76 28 C62 28 52 33 43 50 Z" {...f} />;
    case "side":
      return <path d="M43 52 C43 16 62 12 76 12 C95 12 109 18 109 50 C101 35 96 32 88 31 C92 24 84 22 70 24 C58 26 50 36 43 52 Z" {...f} />;
    case "spiky":
      return <path d="M44 48 L48 24 L58 40 L64 18 L74 38 L82 18 L90 40 L99 26 L108 50 C98 34 88 29 76 29 C64 29 54 34 44 48 Z" {...f} />;
    case "bob":
      return <path d="M40 50 C40 14 62 10 76 10 C90 10 112 14 112 50 C112 66 108 74 106 80 L100 80 C103 64 100 44 100 44 C92 32 86 30 76 30 C66 30 60 32 52 44 C52 44 49 64 52 80 L46 80 C44 74 40 66 40 50 Z" {...f} />;
    case "long":
      return <path d="M38 54 C38 14 62 9 76 9 C90 9 114 14 114 54 C114 84 110 110 107 120 L98 120 C103 96 101 60 100 46 C92 33 86 31 76 31 C66 31 60 33 52 46 C51 60 49 96 54 120 L45 120 C42 110 38 84 38 54 Z" {...f} />;
    case "pony":
      return <g><path d="M43 50 C44 18 60 12 76 12 C92 12 108 18 109 50 C100 33 90 28 76 28 C62 28 52 33 43 50 Z" {...f} /><path d="M106 34 C124 38 130 60 124 84 C122 94 116 100 110 100 C118 86 116 64 104 50 Z" {...f} /></g>;
    case "bun":
      return <g><circle cx="76" cy="12" r="11" {...f} /><path d="M45 48 C46 22 60 16 76 16 C92 16 106 22 107 48 C99 34 90 30 76 30 C62 30 53 34 45 48 Z" {...f} /></g>;
    case "cap":
      return <g><path d="M44 40 C46 18 62 14 76 14 C92 14 106 20 108 40 C108 44 107 47 106 47 L46 47 C45 47 44 44 44 40 Z" fill={color} stroke={CINK} strokeWidth="3.2" strokeLinejoin="round" /><path d="M106 47 q24 2 26 8 q-22 3 -28 -2 Z" fill={color} stroke={CINK} strokeWidth="3.2" strokeLinejoin="round" /></g>;
    case "beanie":
      return <g><path d="M44 44 C45 20 60 14 76 14 C92 14 107 20 108 44 Z" {...f} /><rect x="42" y="42" width="68" height="9" rx="4" fill={color} stroke={CINK} strokeWidth="3" /><circle cx="76" cy="9" r="4.5" fill={color} stroke={CINK} strokeWidth="3" /></g>;
    default:
      return null;
  }
}

function OutfitDetail({ kind, accent }) {
  const W = "#FFFFFF", ink = CINK;
  switch (kind) {
    case "stripes":
      return <g stroke={W} strokeWidth="4.6" fill="none" strokeLinecap="round" opacity="0.92"><path d="M58 110 Q76 117 94 110" /><path d="M57 126 Q76 133 95 126" /><path d="M57 142 Q76 148 95 142" /></g>;
    case "tie":
      return <g strokeLinejoin="round"><path d="M68 88 L76 98 L84 88" fill={W} stroke={ink} strokeWidth="2.6" /><path d="M76 98 l-4 7 l4 24 l4 -24 Z" fill={ink} stroke={ink} strokeWidth="2" /></g>;
    case "bow":
      return <g strokeLinejoin="round"><path d="M76 94 l-11 -6 v13 Z M76 94 l11 -6 v13 Z" fill={W} stroke={ink} strokeWidth="2.4" /><circle cx="76" cy="94" r="3.2" fill={ink} /></g>;
    case "collar":
      return <g fill="none" strokeLinejoin="round" strokeLinecap="round"><path d="M68 88 L76 98 L84 88" stroke={W} strokeWidth="3.6" /><path d="M76 98 v15" stroke={W} strokeWidth="3" /><circle cx="76" cy="106" r="1.7" fill={ink} /><circle cx="76" cy="114" r="1.7" fill={ink} /></g>;
    case "hoodie":
      return <g strokeLinejoin="round" strokeLinecap="round"><path d="M60 90 Q76 104 92 90 Q90 100 76 105 Q62 100 60 90 Z" fill={accent} stroke={ink} strokeWidth="3" /><path d="M71 102 v15 M81 102 v15" stroke={W} strokeWidth="3" fill="none" /><circle cx="71" cy="118" r="2.2" fill={W} stroke={ink} strokeWidth="1.5" /><circle cx="81" cy="118" r="2.2" fill={W} stroke={ink} strokeWidth="1.5" /><path d="M63 130 H89 V140 Q76 146 63 140 Z" fill="none" stroke={ink} strokeWidth="2.4" opacity="0.5" /></g>;
    case "overalls":
      return <g strokeLinejoin="round" strokeLinecap="round"><path d="M66 96 L68 86" stroke={accent} strokeWidth="6" /><path d="M86 96 L84 86" stroke={accent} strokeWidth="6" /><circle cx="68" cy="96" r="2.4" fill={W} stroke={ink} strokeWidth="1.4" /><circle cx="84" cy="96" r="2.4" fill={W} stroke={ink} strokeWidth="1.4" /><rect x="65" y="106" width="22" height="18" rx="3" fill="none" stroke={W} strokeWidth="2.8" /></g>;
    case "scarf":
      return <g strokeLinejoin="round"><path d="M61 87 Q76 97 91 87 Q94 93 90 97 Q76 107 62 97 Q58 93 61 87 Z" fill={CPAPER} stroke={ink} strokeWidth="3" /><path d="M85 97 q6 9 3 20 l-8 -2 q2 -10 -2 -16 Z" fill={CPAPER} stroke={ink} strokeWidth="3" /></g>;
    default:
      return null;
  }
}

function Torso({ outfit = "tee", accent = "#E8915B" }) {
  const isDress = outfit === "dress";
  const tee = "M58 96 C57 89 61 86 68 86 C71 90 81 90 84 86 C91 86 95 89 94 96 L96 150 Q76 159 56 150 Z";
  const dress = "M58 96 C57 89 61 86 68 86 C71 90 81 90 84 86 C91 86 95 89 94 96 L107 157 Q76 170 45 157 Z";
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M58 95 Q47 96 48 108 Q54 112 61 104 Z" fill={accent} stroke={CINK} strokeWidth="3.2" />
      <path d="M94 95 Q105 96 104 108 Q98 112 91 104 Z" fill={accent} stroke={CINK} strokeWidth="3.2" />
      <path d={isDress ? dress : tee} fill={accent} stroke={CINK} strokeWidth="4" />
      <path d="M68 87 C71 92 81 92 84 87" fill="none" stroke={CINK} strokeWidth="2.4" opacity="0.45" />
      <OutfitDetail kind={outfit} accent={accent} />
    </g>
  );
}

// Arms by pose — gives each little person some life instead of one stiff stance.
// Coordinates share the body built in <Character/> (shoulders ~ y50/102, hands
// drawn as paper circles at the wrist). Left = character's right on screen.
function PoseArms({ pose = "idle", accent = "#E8915B" }) {
  const A = { stroke: CINK, strokeWidth: 4, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const hand = (x, y) => <circle cx={x} cy={y} r="6" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />;
  switch (pose) {
    case "wave": // right arm raised, waving hello
      return (
        <g>
          <path d="M50 108 C44 118 45 127 48 134" {...A} />{hand(48, 136)}
          <path d="M102 106 C114 96 120 74 117 58" {...A} />{hand(117, 55)}
          <path d="M124 50 q6 -3 9 -9 M128 60 q8 -2 13 -6" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "cheer": // both arms up — celebratory
      return (
        <g>
          <path d="M50 106 C40 94 36 74 39 58" {...A} />{hand(38, 55)}
          <path d="M102 106 C112 94 116 74 113 58" {...A} />{hand(114, 55)}
        </g>
      );
    case "hip": // one hand on hip, other relaxed — confident
      return (
        <g>
          <path d="M50 108 C40 116 40 130 52 132 C58 132 60 126 58 120" {...A} />{hand(54, 118)}
          <path d="M102 108 C107 118 107 127 104 134" {...A} />{hand(104, 136)}
        </g>
      );
    case "present": // gesturing outward to the slide — explaining
      return (
        <g>
          <path d="M50 108 C45 118 45 127 48 134" {...A} />{hand(48, 136)}
          <path d="M102 104 L130 92" {...A} />{hand(132, 91)}
          <path d="M133 88 l7 -5" stroke={CINK} strokeWidth="3.4" strokeLinecap="round" />
        </g>
      );
    case "think": // hand to chin — thoughtful
      return (
        <g>
          <path d="M50 108 C45 118 45 127 48 134" {...A} />{hand(48, 136)}
          <path d="M102 104 C104 92 92 82 84 78" {...A} />{hand(83, 76)}
        </g>
      );
    default: // idle — relaxed arms slightly out
      return (
        <g>
          <path d="M50 108 C44 118 44 128 47 135" {...A} />{hand(47, 137)}
          <path d="M102 108 C108 118 108 128 105 135" {...A} />{hand(105, 137)}
        </g>
      );
  }
}

// Legs by pose — a tiny stance change reads as motion.
function PoseLegs({ pose = "idle", shoe = "#C9702F" }) {
  const L = { stroke: CINK, strokeWidth: 4, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const foot = (x, y, rot = 0) => <ellipse cx={x} cy={y} rx="11" ry="6.5" fill={shoe} stroke={CINK} strokeWidth="3" transform={`rotate(${rot} ${x} ${y})`} />;
  if (pose === "wave" || pose === "cheer") // slight step out
    return (
      <g>
        <path d="M69 150 L62 184" {...L} /><path d="M83 150 L92 182" {...L} />
        {foot(60, 187, -10)}{foot(95, 185, 12)}
      </g>
    );
  return (
    <g>
      <path d="M69 150 L65 184" {...L} /><path d="M83 150 L87 184" {...L} />
      {foot(62, 187)}{foot(90, 187)}
    </g>
  );
}

export function Character({ spec = {}, className = "", style = {} }) {
  const { accent = "#E8915B", hair = "short", hairColor = HAIR.brown, outfit = "scarf",
    expr = "smile", blush = "#F3B58C", lashes = false, glasses = false, beard = false, mustache = false,
    shoe = "#C9702F", pose = "idle" } = spec;
  return (
    <svg className={className} style={style} viewBox="0 0 152 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <PoseLegs pose={pose} shoe={shoe} />
        <Torso outfit={outfit} accent={accent} />
        <PoseArms pose={pose} accent={accent} />
        <circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" />
        <CFace expr={expr} blush={blush} lashes={lashes} glasses={glasses} beard={beard} mustache={mustache} />
        <Hair style={hair} color={hairColor} />
      </g>
    </svg>
  );
}

function AnimalHead({ animal, accent }) {
  const ear = { fill: CPAPER, stroke: CINK, strokeWidth: 4, strokeLinejoin: "round" };
  const dark = "#3B332E";
  switch (animal) {
    case "cat":
      return <g><path d="M52 26 L48 6 L66 18 Z" {...ear} /><path d="M100 26 L104 6 L86 18 Z" {...ear} /><circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="67" cy="47" r="4" fill={CINK} /><circle cx="86" cy="47" r="4" fill={CINK} /><path d="M73 56 q3 3 6 0 Z" fill={accent} stroke={CINK} strokeWidth="2" /><path d="M76 58 v3 M76 61 q-4 3 -8 1 M76 61 q4 3 8 1" stroke={CINK} strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M44 50 l-14 -3 M44 56 l-14 2 M108 50 l14 -3 M108 56 l14 2" stroke={CINK} strokeWidth="2" strokeLinecap="round" /></g>;
    case "dog":
      return <g><path d="M48 30 C36 34 34 56 42 70 C50 64 50 46 54 38 Z" {...ear} /><path d="M104 30 C116 34 118 56 110 70 C102 64 102 46 98 38 Z" {...ear} /><circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="67" cy="46" r="4" fill={CINK} /><circle cx="86" cy="46" r="4" fill={CINK} /><ellipse cx="76" cy="58" rx="7" ry="5.2" fill={CINK} /><path d="M76 63 v6 M76 69 q-5 3 -9 0 M76 69 q5 3 9 0" stroke={CINK} strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M76 71 q6 6 11 3" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" /></g>;
    case "bunny":
      return <g><path d="M62 22 C58 -2 50 -4 50 18 C50 30 56 34 62 30 Z" {...ear} /><path d="M90 22 C94 -2 102 -4 102 18 C102 30 96 34 90 30 Z" {...ear} /><path d="M58 20 C56 6 52 6 53 18" stroke={accent} strokeWidth="3" fill="none" /><path d="M94 20 C96 6 100 6 99 18" stroke={accent} strokeWidth="3" fill="none" /><circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="67" cy="47" r="4" fill={CINK} /><circle cx="86" cy="47" r="4" fill={CINK} /><path d="M73 55 q3 2.5 6 0 Z" fill={accent} stroke={CINK} strokeWidth="2" /><path d="M76 57 v4" stroke={CINK} strokeWidth="2.4" strokeLinecap="round" /><path d="M72 61 h3 v5 M80 61 h-3 v5" stroke={CINK} strokeWidth="2" fill="none" /></g>;
    case "bear":
      return <g><circle cx="52" cy="22" r="11" {...ear} /><circle cx="100" cy="22" r="11" {...ear} /><circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="67" cy="45" r="4" fill={CINK} /><circle cx="86" cy="45" r="4" fill={CINK} /><ellipse cx="76" cy="60" rx="14" ry="11" fill="#F3E4CD" stroke={CINK} strokeWidth="2.6" /><ellipse cx="76" cy="55" rx="5" ry="3.6" fill={CINK} /><path d="M76 59 v4 M76 63 q-4 3 -7 1 M76 63 q4 3 7 1" stroke={CINK} strokeWidth="2.2" fill="none" strokeLinecap="round" /></g>;
    case "panda":
      return <g><circle cx="52" cy="22" r="11" fill={dark} stroke={CINK} strokeWidth="3" /><circle cx="100" cy="22" r="11" fill={dark} stroke={CINK} strokeWidth="3" /><circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" /><ellipse cx="66" cy="48" rx="8" ry="10" fill={dark} transform="rotate(-18 66 48)" /><ellipse cx="87" cy="48" rx="8" ry="10" fill={dark} transform="rotate(18 87 48)" /><circle cx="66" cy="48" r="3.2" fill="#fff" /><circle cx="87" cy="48" r="3.2" fill="#fff" /><ellipse cx="76" cy="60" rx="5" ry="3.6" fill={CINK} /><path d="M76 64 v3 M76 67 q-4 3 -7 1 M76 67 q4 3 7 1" stroke={CINK} strokeWidth="2.2" fill="none" strokeLinecap="round" /></g>;
    case "frog":
      return <g><circle cx="60" cy="24" r="13" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="92" cy="24" r="13" fill={CPAPER} stroke={CINK} strokeWidth="4" /><circle cx="60" cy="24" r="4.5" fill={CINK} /><circle cx="92" cy="24" r="4.5" fill={CINK} /><path d="M44 44 C44 30 60 30 76 30 C92 30 108 30 108 44 C108 60 96 72 76 72 C56 72 44 60 44 44 Z" fill={CPAPER} stroke={CINK} strokeWidth="4" /><path d="M52 54 q24 16 48 0" stroke={CINK} strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="70" cy="46" r="1.8" fill={CINK} /><circle cx="82" cy="46" r="1.8" fill={CINK} /></g>;
    default:
      return <circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" />;
  }
}

// ---- pets: real four-legged animals (no clothes, no shoes, natural poses) ---
// Each pet is a full-body creature drawn in the same inky hand-drawn style.
// `expr` lets the player animate the face (e.g. open mouth while "talking").

function PetEyes({ x1 = 64, x2 = 88, y = 92, r = 4.2, expr = "smile" }) {
  if (expr === "happy")
    return (
      <g stroke={CINK} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={`M${x1 - 5} ${y} q5 -5 10 0`} />
        <path d={`M${x2 - 5} ${y} q5 -5 10 0`} />
      </g>
    );
  return (
    <g>
      <circle cx={x1} cy={y} r={r} fill={CINK} />
      <circle cx={x2} cy={y} r={r} fill={CINK} />
      <circle cx={x1 + 1.4} cy={y - 1.4} r="1.3" fill="#fff" />
      <circle cx={x2 + 1.4} cy={y - 1.4} r="1.3" fill="#fff" />
    </g>
  );
}

// mouth helper — small natural muzzle; opens to an "o" when talking (expr=wow)
function PetMouth({ cx = 76, y = 104, accent = "#E8915B", expr = "smile" }) {
  if (expr === "wow") return <ellipse cx={cx} cy={y + 2} rx="4.4" ry="5.4" fill="#7A3B33" />;
  return (
    <g stroke={CINK} strokeWidth="2.4" fill="none" strokeLinecap="round">
      <path d={`M${cx} ${y} v4`} />
      <path d={`M${cx} ${y + 4} q-5 4 -9 1`} />
      <path d={`M${cx} ${y + 4} q5 4 9 1`} />
    </g>
  );
}

function PetBody({ animal = "cat", accent = "#E8915B", expr = "smile" }) {
  const ear = { fill: CPAPER, stroke: CINK, strokeWidth: 4, strokeLinejoin: "round" };
  const fur = { fill: CPAPER, stroke: CINK, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" };
  const leg = { stroke: CINK, strokeWidth: 4, fill: CPAPER, strokeLinejoin: "round" };
  const dark = "#3B332E";

  switch (animal) {
    // Sitting cat — curled tail, upright triangular ears, tucked front paws.
    case "cat":
      return (
        <g>
          {/* tail curling around the right side */}
          <path d="M132 150 C152 150 150 120 134 120 C126 120 124 130 128 134" fill="none" stroke={CINK} strokeWidth="8" strokeLinecap="round" />
          <path d="M132 150 C152 150 150 120 134 120 C126 120 124 130 128 134" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" opacity="0.5" />
          {/* haunch + body */}
          <path d="M50 168 C40 120 60 96 76 96 C92 96 112 120 102 168 Z" {...fur} />
          {/* front legs + paws */}
          <path d="M66 150 L66 170" {...leg} /><path d="M86 150 L86 170" {...leg} />
          <ellipse cx="66" cy="172" rx="9" ry="5" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          <ellipse cx="86" cy="172" rx="9" ry="5" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          {/* ears */}
          <path d="M54 72 L48 44 L70 60 Z" {...ear} /><path d="M98 72 L104 44 L82 60 Z" {...ear} />
          <path d="M56 68 L53 53 L64 61 Z" fill={accent} opacity="0.6" /><path d="M96 68 L99 53 L88 61 Z" fill={accent} opacity="0.6" />
          {/* head */}
          <circle cx="76" cy="84" r="34" fill={CPAPER} stroke={CINK} strokeWidth="4" />
          <PetEyes y="84" expr={expr} />
          <path d="M73 92 q3 3 6 0 Z" fill={accent} stroke={CINK} strokeWidth="2" />
          <PetMouth y="98" accent={accent} expr={expr} />
          {/* whiskers */}
          <path d="M42 88 l-15 -3 M42 94 l-15 3 M110 88 l15 -3 M110 94 l15 3" stroke={CINK} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    // Standing dog on four legs — floppy ears, wagging tail.
    case "dog":
      return (
        <g>
          <path d="M118 140 C134 130 138 112 130 104" fill="none" stroke={CINK} strokeWidth="7" strokeLinecap="round" />
          {/* body */}
          <path d="M44 150 C40 122 58 112 76 112 C96 112 116 122 112 150 C112 162 104 166 96 162 C100 150 96 142 76 142 C56 142 52 150 56 162 C48 166 44 162 44 150 Z" {...fur} />
          {/* four legs */}
          <path d="M56 154 v18" {...leg} /><path d="M70 156 v17" {...leg} /><path d="M84 156 v17" {...leg} /><path d="M98 154 v18" {...leg} />
          <ellipse cx="56" cy="174" rx="7" ry="4" fill={CPAPER} stroke={CINK} strokeWidth="3" /><ellipse cx="98" cy="174" rx="7" ry="4" fill={CPAPER} stroke={CINK} strokeWidth="3" />
          {/* floppy ears */}
          <path d="M50 78 C36 82 34 108 44 120 C52 112 50 92 56 84 Z" {...ear} />
          <path d="M102 78 C116 82 118 108 108 120 C100 112 102 92 96 84 Z" {...ear} />
          {/* head */}
          <circle cx="76" cy="86" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" />
          <PetEyes y="84" expr={expr} />
          <ellipse cx="76" cy="96" rx="7" ry="5.2" fill={CINK} />
          <PetMouth y="101" accent={accent} expr={expr} />
          <path d="M76 103 q7 6 12 3" stroke={accent} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        </g>
      );
    // Sitting bunny — tall ears, round body, little front paws, puff tail.
    case "bunny":
      return (
        <g>
          <circle cx="118" cy="158" r="9" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          {/* body */}
          <path d="M52 166 C44 126 62 110 76 110 C90 110 108 126 100 166 Z" {...fur} />
          {/* front paws */}
          <ellipse cx="68" cy="166" rx="8" ry="6" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          <ellipse cx="84" cy="166" rx="8" ry="6" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          {/* tall ears */}
          <path d="M64 64 C58 18 48 16 48 50 C48 66 56 70 64 64 Z" {...ear} />
          <path d="M88 64 C94 18 104 16 104 50 C104 66 96 70 88 64 Z" {...ear} />
          <path d="M60 60 C56 30 52 30 53 52" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
          <path d="M92 60 C96 30 100 30 99 52" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
          {/* head */}
          <circle cx="76" cy="86" r="32" fill={CPAPER} stroke={CINK} strokeWidth="4" />
          <PetEyes y="84" expr={expr} />
          <path d="M73 92 q3 2.5 6 0 Z" fill={accent} stroke={CINK} strokeWidth="2" />
          <PetMouth y="96" accent={accent} expr={expr} />
          {/* buck teeth */}
          {expr !== "wow" && <path d="M72 102 h3 v5 M80 102 h-3 v5" stroke={CINK} strokeWidth="2" fill="none" />}
        </g>
      );
    // Sitting bear — chunky round body, small ears, cream snout.
    case "bear":
      return (
        <g>
          <path d="M48 170 C38 128 58 108 76 108 C94 108 114 128 104 170 Z" {...fur} />
          <ellipse cx="64" cy="170" rx="11" ry="6" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          <ellipse cx="88" cy="170" rx="11" ry="6" fill={CPAPER} stroke={CINK} strokeWidth="3.4" />
          {/* paw pads */}
          <ellipse cx="64" cy="168" rx="4" ry="2.6" fill={accent} opacity="0.5" /><ellipse cx="88" cy="168" rx="4" ry="2.6" fill={accent} opacity="0.5" />
          <circle cx="52" cy="60" r="12" {...ear} /><circle cx="100" cy="60" r="12" {...ear} />
          <circle cx="52" cy="60" r="5" fill={accent} opacity="0.45" /><circle cx="100" cy="60" r="5" fill={accent} opacity="0.45" />
          <circle cx="76" cy="86" r="34" fill={CPAPER} stroke={CINK} strokeWidth="4" />
          <PetEyes y="82" expr={expr} />
          <ellipse cx="76" cy="98" rx="15" ry="12" fill="#F3E4CD" stroke={CINK} strokeWidth="2.6" />
          <ellipse cx="76" cy="93" rx="5" ry="3.6" fill={CINK} />
          <PetMouth y="98" accent={accent} expr={expr} />
        </g>
      );
    // Sitting panda — like bear but black ears/limbs + eye patches.
    case "panda":
      return (
        <g>
          <path d="M48 170 C38 128 58 108 76 108 C94 108 114 128 104 170 Z" {...fur} />
          {/* black arms hugging */}
          <path d="M58 120 C46 130 44 150 52 168 L66 168 C60 150 62 134 70 126 Z" fill={dark} stroke={CINK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M94 120 C106 130 108 150 100 168 L86 168 C92 150 90 134 82 126 Z" fill={dark} stroke={CINK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="52" cy="60" r="12" fill={dark} stroke={CINK} strokeWidth="3" /><circle cx="100" cy="60" r="12" fill={dark} stroke={CINK} strokeWidth="3" />
          <circle cx="76" cy="86" r="34" fill={CPAPER} stroke={CINK} strokeWidth="4" />
          <ellipse cx="64" cy="84" rx="9" ry="11" fill={dark} transform="rotate(-18 64 84)" />
          <ellipse cx="88" cy="84" rx="9" ry="11" fill={dark} transform="rotate(18 88 84)" />
          {expr === "happy"
            ? <g stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"><path d="M60 84 q4 -4 8 0" /><path d="M84 84 q4 -4 8 0" /></g>
            : <><circle cx="64" cy="85" r="3.4" fill="#fff" /><circle cx="88" cy="85" r="3.4" fill="#fff" /></>}
          <ellipse cx="76" cy="98" rx="5" ry="3.6" fill={CINK} />
          <PetMouth y="102" accent={accent} expr={expr} />
        </g>
      );
    // Squatting frog — wide body, splayed legs, big top eyes.
    case "frog":
      return (
        <g>
          {/* back legs splayed */}
          <path d="M44 150 C30 156 28 170 40 172 C46 173 50 166 52 160" fill={accent} stroke={CINK} strokeWidth="3.6" strokeLinejoin="round" />
          <path d="M108 150 C122 156 124 170 112 172 C106 173 102 166 100 160" fill={accent} stroke={CINK} strokeWidth="3.6" strokeLinejoin="round" />
          {/* body */}
          <path d="M40 150 C40 116 58 104 76 104 C94 104 112 116 112 150 C112 166 96 172 76 172 C56 172 40 166 40 150 Z" fill={accent} stroke={CINK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M52 150 q24 14 48 0" stroke={CINK} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* front feet */}
          <path d="M58 170 l-5 6 M64 172 l-2 7 M70 172 l1 7" stroke={CINK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M94 170 l5 6 M88 172 l2 7 M82 172 l-1 7" stroke={CINK} strokeWidth="2.6" strokeLinecap="round" />
          {/* bulging eyes on top */}
          <circle cx="58" cy="92" r="15" fill={accent} stroke={CINK} strokeWidth="4" />
          <circle cx="94" cy="92" r="15" fill={accent} stroke={CINK} strokeWidth="4" />
          {expr === "happy"
            ? <g stroke={CINK} strokeWidth="3" fill="none" strokeLinecap="round"><path d="M53 92 q5 -5 10 0" /><path d="M89 92 q5 -5 10 0" /></g>
            : <><circle cx="58" cy="93" r="5" fill={CINK} /><circle cx="94" cy="93" r="5" fill={CINK} /><circle cx="60" cy="91" r="1.6" fill="#fff" /><circle cx="96" cy="91" r="1.6" fill="#fff" /></>}
          {/* wide smile */}
          {expr === "wow"
            ? <ellipse cx="76" cy="126" rx="9" ry="7" fill="#5E7A3A" />
            : <path d="M54 122 q22 18 44 0" stroke={CINK} strokeWidth="3.4" fill="none" strokeLinecap="round" />}
          <circle cx="64" cy="120" r="2.4" fill={CINK} opacity="0.4" /><circle cx="88" cy="120" r="2.4" fill={CINK} opacity="0.4" />
        </g>
      );
    default:
      return <circle cx="76" cy="100" r="34" fill={CPAPER} stroke={CINK} strokeWidth="4" />;
  }
}

export function PetChar({ animal = "cat", accent = "#E8915B", expr = "smile", className = "", style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 152 200" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <PetBody animal={animal} accent={accent} expr={expr} />
      </g>
    </svg>
  );
}

function ChibiTorso({ accent }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M62 121 Q53 122 54 132 Q59 135 64 129 Z" fill={accent} stroke={CINK} strokeWidth="2.8" />
      <path d="M90 121 Q99 122 98 132 Q93 135 88 129 Z" fill={accent} stroke={CINK} strokeWidth="2.8" />
      <path d="M62 122 C61 117 64 115 68 115 C70 118 82 118 84 115 C88 115 91 117 90 122 L92 150 Q76 158 60 150 Z" fill={accent} stroke={CINK} strokeWidth="3.6" />
      <path d="M68 116 C70 120 82 120 84 116" fill="none" stroke={CINK} strokeWidth="2.2" opacity="0.45" />
    </g>
  );
}

export function ChibiChar({ spec = {}, className = "", style = {} }) {
  const { accent = "#E8915B", hair = "short", hairColor = HAIR.brown, expr = "happy", blush = "#F3B58C", lashes = false, glasses = false, shoe = "#C9702F", animal = null } = spec;
  return (
    <svg className={className} style={style} viewBox="0 0 152 210" fill="none">
      <g filter="url(#sketch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 150 L67 172" stroke={CINK} strokeWidth="4" /><path d="M82 150 L85 172" stroke={CINK} strokeWidth="4" />
        <ellipse cx="64" cy="175" rx="9" ry="5.5" fill={shoe} stroke={CINK} strokeWidth="3" />
        <ellipse cx="88" cy="175" rx="9" ry="5.5" fill={shoe} stroke={CINK} strokeWidth="3" />
        <path d="M58 130 C53 137 52 144 55 150" stroke={CINK} strokeWidth="4" fill="none" />
        <path d="M94 130 C99 137 100 144 97 150" stroke={CINK} strokeWidth="4" fill="none" />
        <ChibiTorso accent={accent} />
        <circle cx="55" cy="151" r="5.5" fill={CPAPER} stroke={CINK} strokeWidth="3.2" />
        <circle cx="97" cy="151" r="5.5" fill={CPAPER} stroke={CINK} strokeWidth="3.2" />
        <g transform="translate(0 22) translate(76 48) scale(1.34) translate(-76 -48)">
          {animal ? <AnimalHead animal={animal} accent={accent} /> : (
            <g>
              <circle cx="76" cy="48" r="33" fill={CPAPER} stroke={CINK} strokeWidth="4" />
              <CFace expr={expr} blush={blush} lashes={lashes} glasses={glasses} />
              <Hair style={hair} color={hairColor} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

// ---- form library data ----------------------------------------------------
export const HUMANS = [
  { id: "h1", name: "小橙", kind: "human", spec: { hair: "short", hairColor: HAIR.brown, outfit: "scarf", accent: "#E8915B", pose: "wave", expr: "happy" } },
  { id: "h2", name: "阿哲", kind: "human", spec: { hair: "side", hairColor: HAIR.black, outfit: "tie", accent: "#7FA0C0", pose: "hip" } },
  { id: "h3", name: "阿刺", kind: "human", spec: { hair: "spiky", hairColor: HAIR.auburn, outfit: "overalls", accent: "#8FB089", pose: "cheer", expr: "happy" } },
  { id: "h4", name: "波波", kind: "human", spec: { hair: "bob", hairColor: HAIR.black, outfit: "dress", accent: "#D98AA0", lashes: true, expr: "happy", pose: "present" } },
  { id: "h5", name: "小缎", kind: "human", spec: { hair: "long", hairColor: HAIR.brown, outfit: "stripes", accent: "#E8915B", lashes: true, pose: "wave", expr: "wink" } },
  { id: "h6", name: "尾尾", kind: "human", spec: { hair: "pony", hairColor: HAIR.auburn, outfit: "hoodie", accent: "#7FA98C", lashes: true, pose: "present", expr: "happy" } },
  { id: "h7", name: "团团", kind: "human", spec: { hair: "bun", hairColor: HAIR.black, outfit: "bow", accent: "#D2703A", lashes: true, expr: "happy", pose: "cheer" } },
  { id: "h8", name: "帽帽", kind: "human", spec: { hair: "cap", hairColor: "#C98A4E", outfit: "collar", accent: "#7FA0C0", pose: "hip" } },
  { id: "h9", name: "毛豆", kind: "human", spec: { hair: "beanie", hairColor: HAIR.mint, outfit: "scarf", accent: "#C98A4E", pose: "think" } },
  { id: "h10", name: "博士", kind: "human", spec: { hair: "short", hairColor: HAIR.grey, outfit: "tie", accent: "#8FB089", glasses: true, pose: "present" } },
  { id: "h11", name: "老胡", kind: "human", spec: { hair: "side", hairColor: HAIR.brown, outfit: "hoodie", accent: "#D2703A", beard: true, pose: "hip" } },
  { id: "h12", name: "金妮", kind: "human", spec: { hair: "long", hairColor: HAIR.blonde, outfit: "dress", accent: "#7FA0C0", lashes: true, expr: "wink", pose: "wave" } },
];
// 全局默认出场形象：尾尾
export const DEFAULT_FORM_ID = "h6";
export const PETS = [
  { id: "p1", name: "喵喵", kind: "pet", animal: "cat", accent: "#E8915B" },
  { id: "p2", name: "汪汪", kind: "pet", animal: "dog", accent: "#C98A4E" },
  { id: "p3", name: "兔兔", kind: "pet", animal: "bunny", accent: "#D98AA0" },
  { id: "p4", name: "熊仔", kind: "pet", animal: "bear", accent: "#9C7B58" },
  { id: "p5", name: "胖达", kind: "pet", animal: "panda", accent: "#7FA0C0" },
  { id: "p6", name: "呱呱", kind: "pet", animal: "frog", accent: "#8FB089" },
];
export const CHIBI = [
  { id: "q1", name: "Q团团", kind: "chibi", spec: { hair: "bun", hairColor: HAIR.black, accent: "#D98AA0", lashes: true } },
  { id: "q2", name: "Q阿刺", kind: "chibi", spec: { hair: "spiky", hairColor: HAIR.auburn, accent: "#8FB089" } },
  { id: "q3", name: "Q长发", kind: "chibi", spec: { hair: "long", hairColor: HAIR.blonde, accent: "#7FA0C0", lashes: true } },
  { id: "q4", name: "Q喵喵", kind: "chibi", spec: { animal: "cat", accent: "#E8915B" } },
  { id: "q5", name: "Q兔兔", kind: "chibi", spec: { animal: "bunny", accent: "#D98AA0" } },
];

export const ALL_FORMS = [...HUMANS, ...PETS, ...CHIBI];
export function findForm(id) {
  return ALL_FORMS.find((f) => f.id === id);
}

// Render any library entry (human / pet / chibi). `expr` overrides expression
// (used by the player to animate the mouth while talking).
export function FormGlyph({ form, expr, className = "", style = {}, height }) {
  const st = height ? { ...style, height } : style;
  if (!form) return null;
  if (form.kind === "pet") return <PetChar animal={form.animal} accent={form.accent} expr={expr || "smile"} className={className} style={st} />;
  const spec = expr ? { ...form.spec, expr } : form.spec;
  if (form.kind === "chibi") return <ChibiChar spec={spec} className={className} style={st} />;
  return <Character spec={spec} className={className} style={st} />;
}
