/* =========================================================================
 * anim.js — original, dependency-free animated form demos.
 *
 * Blueprint-style: a schematic figure holds good posture while the loaded
 * limb / implement animates through the range of motion (SMIL, loops).
 * One demo per MOVEMENT PATTERN; every exercise + alternate maps to a pattern.
 * reduced === true renders a static start pose (respects reduced motion).
 *
 * These are teaching schematics, not anatomical video — paired with the
 * written cues in the Learn panel they show the path + key positions.
 * ========================================================================= */

const VB = 'viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet"';
const FIG = 'fill="none" stroke="var(--accent)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"';
const IMP = 'stroke="var(--pr)" stroke-width="4" stroke-linecap="round"';
const GRID = 'stroke="var(--grid)" stroke-width="2"';
const ROM = 'fill="none" stroke="var(--accent2)" stroke-width="1.6" stroke-dasharray="3 4" opacity=".55"';

/* SMIL helpers -------------------------------------------------------------- */
const EASE = 'calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"';
function rot(deg, cx, cy, dur, r) {
  return r ? "" : `<animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="${dur}s" repeatCount="indefinite" ${EASE} values="0 ${cx} ${cy}; ${deg} ${cx} ${cy}; 0 ${cx} ${cy}"/>`;
}
function tran(dx, dy, dur, r) {
  return r ? "" : `<animateTransform attributeName="transform" attributeType="XML" type="translate" dur="${dur}s" repeatCount="indefinite" ${EASE} values="0 0; ${dx} ${dy}; 0 0"/>`;
}
function head(x, y) { return `<circle cx="${x}" cy="${y}" r="7" ${FIG}/>`; }
function joint(x, y) { return `<circle cx="${x}" cy="${y}" r="2.6" fill="var(--accent)"/>`; }
function barH(hx, hy) { return `<line x1="${hx - 13}" y1="${hy}" x2="${hx + 13}" y2="${hy}" ${IMP}/><rect x="${hx - 15}" y="${hy - 5}" width="3.2" height="10" rx="1.4" fill="var(--pr)"/><rect x="${hx + 12}" y="${hy - 5}" width="3.2" height="10" rx="1.4" fill="var(--pr)"/>`; }
function dbV(hx, hy) { return `<line x1="${hx}" y1="${hy - 7}" x2="${hx}" y2="${hy + 7}" ${IMP}/>`; }
function ground(y) { return `<line x1="10" y1="${y}" x2="110" y2="${y}" ${GRID}/>`; }
function wrap(inner) { return `<svg class="ex-anim" ${VB} aria-hidden="true">${inner}</svg>`; }

/* --------------------------------------------------------- patterns -------- */
const P = {
  // Standing overhead press (side)
  ohp(r) {
    const sx = 60, sy = 44;
    return wrap(`${ground(108)}
      ${head(60, 24)}<line x1="60" y1="31" x2="60" y2="70" ${FIG}/>
      <line x1="60" y1="70" x2="52" y2="108" ${FIG}/><line x1="60" y1="70" x2="68" y2="108" ${FIG}/>
      <path d="M78 46 A26 26 0 0 1 60 18" ${ROM}/>
      <g>${rot(-60, sx, sy, 3, r)}<line x1="${sx}" y1="${sy}" x2="80" y2="46" ${FIG}/>${joint(sx, sy)}${barH(80, 46)}</g>`);
  },
  // Flat barbell/DB press (lying)
  bench(r) {
    const sx = 60, sy = 66;
    return wrap(`${ground(112)}<rect x="26" y="68" width="66" height="7" rx="3" ${GRID} fill="var(--surface-solid)"/>
      <line x1="40" y1="60" x2="40" y2="68" ${GRID}/><line x1="88" y1="60" x2="88" y2="68" ${GRID}/>
      ${head(34, 60)}<line x1="40" y1="64" x2="78" y2="66" ${FIG}/><line x1="78" y1="66" x2="92" y2="92" ${FIG}/>
      <path d="M44 42 A20 20 0 0 1 72 46" ${ROM}/>
      <g>${rot(34, sx, sy, 3, r)}<line x1="${sx}" y1="${sy}" x2="${sx}" y2="40" ${FIG}/>${joint(sx, sy)}${barH(sx, 40)}</g>`);
  },
  // Incline press (reclined)
  incline(r) {
    const sx = 58, sy = 62;
    return wrap(`${ground(112)}<line x1="30" y1="96" x2="86" y2="54" ${GRID}/>
      ${head(40, 54)}<line x1="46" y1="58" x2="74" y2="78" ${FIG}/><line x1="74" y1="78" x2="92" y2="96" ${FIG}/>
      <path d="M46 40 A22 22 0 0 1 74 44" ${ROM}/>
      <g>${rot(38, sx, sy, 3, r)}<line x1="${sx}" y1="${sy}" x2="60" y2="38" ${FIG}/>${joint(sx, sy)}${barH(60, 38)}</g>`);
  },
  // Bent-over / cable row (side, hinged)
  row(r) {
    const sx = 66, sy = 50;
    return wrap(`${ground(108)}
      ${head(34, 46)}<line x1="40" y1="48" x2="78" y2="56" ${FIG}/>
      <line x1="78" y1="56" x2="74" y2="108" ${FIG}/><line x1="78" y1="56" x2="86" y2="108" ${FIG}/>
      <path d="M70 86 A26 26 0 0 1 60 56" ${ROM}/>
      <g>${rot(-46, sx, sy, 2.8, r)}<line x1="${sx}" y1="${sy}" x2="70" y2="86" ${FIG}/>${joint(sx, sy)}${dbV(70, 86)}</g>`);
  },
  // Lat pulldown / pull-up (side, pull down)
  pulldown(r) {
    const sx = 60, sy = 46;
    return wrap(`${ground(112)}
      ${head(60, 30)}<line x1="60" y1="37" x2="60" y2="74" ${FIG}/>
      <line x1="60" y1="74" x2="52" y2="110" ${FIG}/><line x1="60" y1="74" x2="68" y2="110" ${FIG}/>
      <path d="M76 20 A24 24 0 0 0 80 50" ${ROM}/>
      <g>${rot(58, sx, sy, 2.8, r)}<line x1="${sx}" y1="${sy}" x2="80" y2="22" ${FIG}/>${joint(sx, sy)}${barH(80, 22)}</g>`);
  },
  // Biceps curl (side, forearm at elbow)
  curl(r) {
    const ex = 58, ey = 66;
    return wrap(`${ground(110)}
      ${head(60, 24)}<line x1="60" y1="31" x2="60" y2="72" ${FIG}/>
      <line x1="60" y1="72" x2="52" y2="108" ${FIG}/><line x1="60" y1="72" x2="68" y2="108" ${FIG}/>
      <line x1="58" y1="40" x2="${ex}" y2="${ey}" ${FIG}/>
      <path d="M58 92 A26 26 0 0 1 80 60" ${ROM}/>
      <g>${rot(-125, ex, ey, 2.6, r)}<line x1="${ex}" y1="${ey}" x2="58" y2="92" ${FIG}/>${joint(ex, ey)}${dbV(58, 92)}</g>`);
  },
  // Triceps pushdown (side, forearm extends down)
  pushdown(r) {
    const ex = 60, ey = 60;
    return wrap(`${ground(110)}
      ${head(60, 24)}<line x1="60" y1="31" x2="60" y2="72" ${FIG}/>
      <line x1="60" y1="72" x2="52" y2="108" ${FIG}/><line x1="60" y1="72" x2="68" y2="108" ${FIG}/>
      <line x1="60" y1="42" x2="${ex}" y2="${ey}" ${FIG}/>
      <path d="M66 70 A20 20 0 0 1 64 92" ${ROM}/>
      <g>${rot(70, ex, ey, 2.4, r)}<line x1="${ex}" y1="${ey}" x2="66" y2="74" ${FIG}/>${joint(ex, ey)}<line x1="54" y1="74" x2="78" y2="74" ${IMP}/></g>`);
  },
  // Overhead triceps extension / skullcrusher (side)
  overheadext(r) {
    const ex = 60, ey = 40;
    return wrap(`${ground(110)}
      ${head(60, 24)}<line x1="60" y1="31" x2="60" y2="72" ${FIG}/>
      <line x1="60" y1="72" x2="52" y2="108" ${FIG}/><line x1="60" y1="72" x2="68" y2="108" ${FIG}/>
      <line x1="58" y1="46" x2="${ex}" y2="${ey}" ${FIG}/>
      <path d="M44 34 A18 18 0 0 1 60 18" ${ROM}/>
      <g>${rot(70, ex, ey, 2.6, r)}<line x1="${ex}" y1="${ey}" x2="46" y2="34" ${FIG}/>${joint(ex, ey)}${dbV(46, 34)}</g>`);
  },
  // Cable fly / pec deck (front, arms arc together)
  fly(r) {
    const ls = 48, rs = 72, sy = 46;
    return wrap(`${ground(112)}
      ${head(60, 26)}<line x1="60" y1="33" x2="60" y2="74" ${FIG}/>
      <line x1="60" y1="74" x2="50" y2="110" ${FIG}/><line x1="60" y1="74" x2="70" y2="110" ${FIG}/>
      <path d="M30 60 A30 30 0 0 1 52 44" ${ROM}/><path d="M90 60 A30 30 0 0 0 68 44" ${ROM}/>
      <g>${rot(40, ls, sy, 3, r)}<line x1="${ls}" y1="${sy}" x2="30" y2="60" ${FIG}/>${joint(ls, sy)}${dbV(30, 60)}</g>
      <g>${rot(-40, rs, sy, 3, r)}<line x1="${rs}" y1="${sy}" x2="90" y2="60" ${FIG}/>${joint(rs, sy)}${dbV(90, 60)}</g>`);
  },
  // Lateral raise (front, arms up to sides)
  lateralraise(r) {
    const ls = 48, rs = 72, sy = 46;
    return wrap(`${ground(112)}
      ${head(60, 26)}<line x1="60" y1="33" x2="60" y2="74" ${FIG}/>
      <line x1="60" y1="74" x2="50" y2="110" ${FIG}/><line x1="60" y1="74" x2="70" y2="110" ${FIG}/>
      <path d="M40 78 A34 34 0 0 1 28 50" ${ROM}/><path d="M80 78 A34 34 0 0 0 92 50" ${ROM}/>
      <g>${rot(-78, ls, sy, 3, r)}<line x1="${ls}" y1="${sy}" x2="40" y2="78" ${FIG}/>${joint(ls, sy)}${dbV(40, 78)}</g>
      <g>${rot(78, rs, sy, 3, r)}<line x1="${rs}" y1="${sy}" x2="80" y2="78" ${FIG}/>${joint(rs, sy)}${dbV(80, 78)}</g>`);
  },
  // Rear delt / face pull (front, hinged, arms out & back)
  reardelt(r) {
    const ls = 48, rs = 72, sy = 50;
    return wrap(`${ground(112)}
      ${head(60, 30)}<line x1="60" y1="37" x2="60" y2="72" ${FIG}/>
      <line x1="60" y1="72" x2="50" y2="108" ${FIG}/><line x1="60" y1="72" x2="70" y2="108" ${FIG}/>
      <path d="M44 72 A28 28 0 0 1 30 52" ${ROM}/><path d="M76 72 A28 28 0 0 0 90 52" ${ROM}/>
      <g>${rot(-62, ls, sy, 3, r)}<line x1="${ls}" y1="${sy}" x2="44" y2="72" ${FIG}/>${joint(ls, sy)}${dbV(44, 72)}</g>
      <g>${rot(62, rs, sy, 3, r)}<line x1="${rs}" y1="${sy}" x2="76" y2="72" ${FIG}/>${joint(rs, sy)}${dbV(76, 72)}</g>`);
  },
  // Squat (side, 2-link leg lowers)
  squat(r) {
    // ankle (54,104) -> knee (54,78) -> hip (60,54); bar on back
    const inner = `<line x1="54" y1="104" x2="54" y2="78" ${FIG}/>
      <g>${rot(-46, 54, 78, 3, r)}
        <line x1="54" y1="78" x2="60" y2="54" ${FIG}/>${joint(54, 78)}
        <g>${rot(46, 60, 54, 3, r)}
          ${head(60, 26)}<line x1="60" y1="33" x2="60" y2="54" ${FIG}/>${joint(60, 54)}
          <line x1="46" y1="40" x2="74" y2="40" ${IMP}/>
        </g>
      </g>`;
    return wrap(`${ground(104)}<path d="M84 56 A30 30 0 0 1 84 86" ${ROM}/>${joint(54, 104)}${inner}`);
  },
  // Leg press (side, legs extend against platform)
  legpress(r) {
    const inner = `<g>${rot(40, 44, 70, 3, r)}
      <line x1="44" y1="70" x2="78" y2="62" ${FIG}/>${joint(44, 70)}
      <g>${rot(-60, 78, 62, 3, r)}<line x1="78" y1="62" x2="78" y2="36" ${FIG}/>${joint(78, 62)}<rect x="66" y="26" width="24" height="7" rx="2" fill="var(--pr)"/></g>
    </g>`;
    return wrap(`${ground(100)}<line x1="18" y1="92" x2="60" y2="70" ${GRID}/>${head(30, 72)}<line x1="36" y1="74" x2="46" y2="72" ${FIG}/>${inner}`);
  },
  // Hinge: RDL / deadlift / good morning (side, torso hinges, bar down legs)
  hinge(r) {
    const hx = 62, hy = 58;
    return wrap(`${ground(108)}${joint(hx, hy)}
      <line x1="${hx}" y1="${hy}" x2="58" y2="104" ${FIG}/><line x1="${hx}" y1="${hy}" x2="66" y2="104" ${FIG}/>
      <path d="M62 92 A34 34 0 0 1 86 40" ${ROM}/>
      <g>${rot(62, hx, hy, 3, r)}
        <line x1="${hx}" y1="${hy}" x2="${hx}" y2="22" ${FIG}/>${head(hx, 18)}
        <line x1="${hx}" y1="34" x2="${hx + 2}" y2="58" ${FIG}/>${barH(hx + 2, 58)}
      </g>`);
  },
  // Hip thrust / glute bridge (side, hips rise)
  hipthrust(r) {
    return wrap(`${ground(108)}<rect x="18" y="58" width="22" height="7" rx="3" ${GRID} fill="var(--surface-solid)"/>
      ${head(26, 52)}
      <g>${tran(0, -18, 2.8, r)}
        <line x1="32" y1="58" x2="70" y2="78" ${FIG}/>${joint(70, 78)}
        <line x1="70" y1="78" x2="92" y2="78" ${FIG}/>
        <line x1="58" y1="74" x2="82" y2="74" ${IMP}/>
      </g>
      <line x1="92" y1="78" x2="92" y2="104" ${FIG}/>
      <path d="M100 76 L100 60" ${ROM}/>`);
  },
  // Leg extension (side seated, shin extends)
  legext(r) {
    const kx = 66, ky = 64;
    return wrap(`${ground(108)}<rect x="26" y="62" width="40" height="7" rx="3" ${GRID} fill="var(--surface-solid)"/>
      ${head(32, 46)}<line x1="36" y1="52" x2="40" y2="64" ${FIG}/><line x1="40" y1="64" x2="${kx}" y2="${ky}" ${FIG}/>
      <path d="M70 92 A26 26 0 0 1 92 70" ${ROM}/>
      <g>${rot(-78, kx, ky, 2.6, r)}<line x1="${kx}" y1="${ky}" x2="70" y2="92" ${FIG}/>${joint(kx, ky)}<circle cx="70" cy="92" r="4" fill="var(--pr)"/></g>`);
  },
  // Leg curl (side lying, shin curls up)
  legcurl(r) {
    const kx = 72, ky = 80;
    return wrap(`${ground(108)}<rect x="24" y="78" width="52" height="7" rx="3" ${GRID} fill="var(--surface-solid)"/>
      ${head(28, 72)}<line x1="34" y1="78" x2="${kx}" y2="${ky}" ${FIG}/>
      <path d="M92 80 A22 22 0 0 1 80 58" ${ROM}/>
      <g>${rot(-88, kx, ky, 2.6, r)}<line x1="${kx}" y1="${ky}" x2="92" y2="80" ${FIG}/>${joint(kx, ky)}<circle cx="92" cy="80" r="4" fill="var(--pr)"/></g>`);
  },
  // Calf raise (side, rise on toes)
  calf(r) {
    return wrap(`${ground(104)}<path d="M96 96 L96 82" ${ROM}/>
      <g>${tran(0, -12, 2, r)}
        ${head(60, 30)}<line x1="60" y1="37" x2="60" y2="74" ${FIG}/>
        <line x1="60" y1="74" x2="56" y2="96" ${FIG}/><line x1="60" y1="74" x2="64" y2="96" ${FIG}/>
        <line x1="44" y1="40" x2="76" y2="40" ${IMP}/>
      </g>
      <line x1="52" y1="104" x2="68" y2="104" ${FIG}/>`);
  },
  // Lunge / split squat (side, front leg lowers)
  lunge(r) {
    const inner = `<line x1="50" y1="104" x2="50" y2="80" ${FIG}/>
      <g>${rot(-40, 50, 80, 3, r)}
        <line x1="50" y1="80" x2="58" y2="56" ${FIG}/>${joint(50, 80)}
        <g>${rot(40, 58, 56, 3, r)}${head(58, 28)}<line x1="58" y1="35" x2="58" y2="56" ${FIG}/>${joint(58, 56)}</g>
      </g>
      <line x1="60" y1="60" x2="86" y2="100" ${FIG}/>`;
    return wrap(`${ground(104)}<path d="M80 60 A26 26 0 0 1 80 86" ${ROM}/>${joint(50, 104)}${inner}`);
  },
  // Generic fallback: a bar travelling up and down beside a figure
  generic(r) {
    return wrap(`${ground(110)}
      ${head(42, 30)}<line x1="42" y1="37" x2="42" y2="74" ${FIG}/>
      <line x1="42" y1="74" x2="36" y2="108" ${FIG}/><line x1="42" y1="74" x2="48" y2="108" ${FIG}/>
      <path d="M78 36 L78 78" ${ROM}/>
      <g>${tran(0, 40, 3, r)}${barH(78, 40)}</g>`);
  }
};
P.straightarm = P.pulldown;
P.pullover = P.fly;

/* --------------------------------------------------- name -> pattern ------- */
function keyFor(name) {
  const n = (name || "").toLowerCase();
  const has = (...w) => w.some((x) => n.includes(x));
  if (has("lat pulldown", "pulldown") && has("straight")) return "pulldown";
  if (has("pull-up", "pull up", "pullup", "pulldown", "chin")) return "pulldown";
  if (has("pullover")) return "fly";
  if (has("face pull", "rear delt", "reverse pec", "reverse cable fly", "reverse fly")) return "reardelt";
  if (has("lateral raise", "lateral", "side delt")) return "lateralraise";
  if (has("fly", "pec deck")) return "fly";
  if (has("row")) return "row";
  if (has("pushdown", "press-down", "pressdown", "triceps push")) return "pushdown";
  if (has("overhead", "skullcrush", "skull crush", "triceps extension", "dip")) {
    if (has("overhead press", "shoulder press", "military")) return "ohp";
    return "overheadext";
  }
  if (has("curl")) return "curl";
  if (has("incline") && has("press", "bench")) return "incline";
  if (has("overhead press", "shoulder press", "military", "arnold", "push press")) return "ohp";
  if (has("bench", "chest press", "flat ", "floor press", "machine chest", "close-grip")) return "bench";
  if (has("hip thrust", "glute bridge", "bridge", "pull-through", "pull through")) return "hipthrust";
  if (has("leg press")) return "legpress";
  if (has("leg extension", "leg ext", "sissy")) return "legext";
  if (has("leg curl", "nordic", "ham curl", "hamstring curl")) return "legcurl";
  if (has("calf", "calves")) return "calf";
  if (has("lunge", "split squat", "step-up", "step up", "bulgarian")) return "lunge";
  if (has("deadlift", "rdl", "romanian", "good morning", "hinge")) return "hinge";
  if (has("squat", "hack", "goblet")) return "squat";
  if (has("press")) return "ohp";
  return "generic";
}

export function patternName(name) { return keyFor(name); }
export function animSVG(name, reduced = false) {
  const k = keyFor(name);
  return (P[k] || P.generic)(reduced);
}
