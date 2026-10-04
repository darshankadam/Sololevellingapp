/* =========================================================================
 * icons.js — crafted hex-badge icon system for Titles.
 *   badgeSVG(glyph, { tier, unlocked, size }) -> an <svg> string.
 * Monoline glyphs (0..24 coord space) sit inside a gem-cut hexagon whose
 * colour comes from the tier. Everything uses currentColor-free gradients
 * so it looks the same wherever it's dropped in.
 * ========================================================================= */

const HEX = "M24 3 42 13.5v21L24 45 6 34.5v-21Z";

const TIERS = {
  t1: ["#8295b8", "#aab8d8"], // steel
  t2: ["#22d3ee", "#38bdf8"], // cyan
  t3: ["#a855f7", "#8b5cf6"], // violet
  t4: ["#fbbf24", "#f59e0b"], // gold
  t5: ["#e879f9", "#fbbf24"]  // mythic
};
/* Each glyph is inner markup drawn in a 0..24 box (no fill; stroke inherited). */
const GLYPHS = {
  portal: `<path d="M5 21V11a7 7 0 0 1 14 0v10"/><path d="M12 21v-8"/><path d="M4 21h16"/>`,
  sword: `<path d="M12 3v11"/><path d="M8.5 14h7"/><path d="M12 14v6"/><path d="M9.5 11.5h5"/>`,
  tower: `<path d="M6 21V9h12v12"/><path d="M6 9V6h2v3M11 9V6h2v3M16 9V6h2v3"/><path d="M4 21h16"/><path d="M10.5 21v-5h3v5"/>`,
  burst: `<path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><path d="M6 6l3 3M18 6l-3 3M6 18l3-3M18 18l-3-3"/>`,
  crown: `<path d="M4 18h16"/><path d="M4 18 5.5 8l4.5 5 2-6 2 6 4.5-5L20 18Z"/>`,
  flame: `<path d="M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 .8-3.3 2-4.3 0 2 1 3 2.6 3 .4-3-2-4.7-1.6-8.7Z"/>`,
  bolt: `<path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z"/>`,
  dumbbell: `<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>`,
  mountain: `<path d="M3 20 9 9l4 6 2-3 6 8Z"/><path d="M7.4 14.6 9 11.9l1.6 2.7"/>`,
  gem: `<path d="M6 4h12l3 5-9 11L3 9Z"/><path d="M3 9h18M9 4 6 9l6 11M15 4l3 5-6 11"/>`,
  medal: `<path d="M9 3l3 5 3-5"/><circle cx="12" cy="15" r="5.2"/><path d="M12 12.6l1 2 2 .2-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 14.8l2-.2Z"/>`,
  trophy: `<path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 5H5a3 3 0 0 0 3 3.6M16 5h3a3 3 0 0 1-3 3.6"/><path d="M12 12v4M9 20h6M10.5 16h3l.5 4h-4Z"/>`,
  shield: `<path d="M12 3 19 6v5c0 4.2-3 8-7 9-4-1-7-4.8-7-9V6Z"/><path d="M9 12l2 2 4-4"/>`,
  star: `<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.4 1.4-6.3L3 9.5l6.4-.6Z"/>`,
  orbit: `<circle cx="12" cy="12" r="3.2"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-28 12 12)"/>`,
  calendar: `<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M8.5 14.5l2.2 2.2 4.3-4.3"/>`,
  squat: `<circle cx="12" cy="4.6" r="2.1"/><path d="M12 7v4l-3 4 1.6 5"/><path d="M12 11l3 4-1 5"/><path d="M6 20h12"/>`,
  link: `<rect x="3.5" y="9" width="10" height="6" rx="3"/><rect x="10.5" y="9" width="10" height="6" rx="3"/>`
};

export function glyphFor(name) { return GLYPHS[name] ? name : "star"; }

export function badgeSVG(glyph, opts = {}) {
  const tier = opts.tier || "t2";
  const unlocked = opts.unlocked !== false;
  const size = opts.size || 48;
  const g = GLYPHS[glyph] || GLYPHS.star;
  const [c1, c2] = unlocked ? (TIERS[tier] || TIERS.t2) : ["#46506e", "#5a688c"];
  const id = "b" + Math.random().toString(36).slice(2, 9);
  const stroke = `url(#${id}s)`;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" class="badge-svg ${unlocked ? "on" : "off"}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      ${unlocked ? `<filter id="${id}f" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.3" flood-color="${c2}" flood-opacity="0.85"/></filter>` : ""}
    </defs>
    <path d="${HEX}" fill="url(#${id}s)" opacity="${unlocked ? 0.16 : 0.08}"/>
    <path d="${HEX}" fill="none" stroke="url(#${id}s)" stroke-width="2" ${unlocked ? `filter="url(#${id}f)"` : ""}/>
    <g transform="translate(12 12)" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g}</g>
  </svg>`;
}
