/* =========================================================================
 * coach.js — practical in-gym intelligence:
 *   - progressionSuggestion()  double-progression ("add weight / beat reps")
 *   - platesPerSide()          barbell plate math
 *   - warmupSets()             ramp-up sets for a working weight
 *   - strengthRatio()          e1RM as a multiple of bodyweight
 * Pure functions, no state, easy to tweak.
 * ========================================================================= */

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export function increment(unit) { return unit === "lb" ? 5 : 2.5; }

export function roundToIncrement(w, unit) {
  const inc = increment(unit);
  return Math.round((Number(w) || 0) / inc) * inc;
}

export function parseTopReps(range) {
  const nums = String(range || "").match(/\d+/g);
  if (!nums) return null;
  return Math.max(...nums.map(Number));
}
export function parseBottomReps(range) {
  const nums = String(range || "").match(/\d+/g);
  if (!nums) return null;
  return Math.min(...nums.map(Number));
}

/**
 * Double progression. Given the most-recent completed entry for a lift and the
 * target rep range, recommend the next step.
 * lastEntry: { sets:[{weight,reps,done}] } | null
 * returns { type:'add'|'reps'|'base'|'hold', text, deltaWeight?, target? }
 */
export function progressionSuggestion(lastEntry, repRange, unit) {
  const top = parseTopReps(repRange);
  if (!lastEntry) return { type: "base", text: "No history — today sets your baseline." };
  const sets = (lastEntry.sets || []).filter((s) => (Number(s.reps) || 0) > 0);
  if (!sets.length) return { type: "base", text: "Log this to start tracking progress." };

  const weights = sets.map((s) => Number(s.weight) || 0);
  const topW = Math.max(...weights);
  const minReps = Math.min(...sets.map((s) => Number(s.reps) || 0));
  const allHitTop = top ? sets.every((s) => (Number(s.reps) || 0) >= top) : false;
  const inc = increment(unit);

  if (allHitTop) {
    return { type: "add", deltaWeight: inc, target: topW + inc,
      text: `Add ${inc}${unit} → ${topW + inc}${unit}. You cleared ${top}+ on every set.` };
  }
  if (topW > 0) {
    return { type: "reps", target: topW,
      text: `Stay at ${topW}${unit}, beat ${minReps} rep${minReps === 1 ? "" : "s"}${top ? ` (aim ${top})` : ""}.` };
  }
  return { type: "base", text: "Log this to start tracking progress." };
}

/**
 * Plates needed PER SIDE to reach `target` with a given bar + plate set.
 * returns { ok, perSide, items:[{plate,count}], leftover }
 */
export function platesPerSide(target, bar, plates) {
  const t = Number(target) || 0;
  const b = Number(bar) || 0;
  const perSide = (t - b) / 2;
  if (perSide < 0) return { ok: false, perSide, items: [], leftover: 0, under: true };
  let rem = perSide;
  const items = [];
  for (const p of [...plates].sort((a, c) => c - a)) {
    const count = Math.floor(rem / p + 1e-9);
    if (count > 0) { items.push({ plate: p, count }); rem -= count * p; }
  }
  rem = Math.round(rem * 1000) / 1000;
  return { ok: rem <= 1e-6, perSide: Math.round(perSide * 100) / 100, items, leftover: rem };
}

/** Warm-up ramp toward a working weight. */
export function warmupSets(workWeight, bar, unit) {
  const w = Number(workWeight) || 0;
  const b = Number(bar) || 0;
  if (w <= b + increment(unit)) return []; // too light to need warmups
  const steps = [
    { pct: 0.4, reps: 8 },
    { pct: 0.6, reps: 5 },
    { pct: 0.8, reps: 3 }
  ];
  const out = [];
  let prev = -1;
  for (const s of steps) {
    let wt = roundToIncrement(Math.max(b, w * s.pct), unit);
    if (wt >= w) continue;
    if (wt <= b) wt = b; // empty bar
    if (wt === prev) continue;
    prev = wt;
    out.push({ weight: wt, reps: s.reps, pct: Math.round(s.pct * 100) });
  }
  return out;
}

/** e1RM as a multiple of bodyweight + a soft tier label. */
export function strengthRatio(e1rm, bodyweight) {
  const bw = Number(bodyweight) || 0;
  if (bw <= 0 || !e1rm) return null;
  const ratio = e1rm / bw;
  let tier = "Novice";
  if (ratio >= 2) tier = "Elite";
  else if (ratio >= 1.5) tier = "Advanced";
  else if (ratio >= 1) tier = "Intermediate";
  return { ratio: Math.round(ratio * 100) / 100, tier };
}
