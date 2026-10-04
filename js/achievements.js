/* =========================================================================
 * achievements.js — "Titles" the Hunter unlocks. Pure evaluation from the
 * stats + session history. No storage here; app.js remembers which were seen.
 * Each title carries a `glyph` + `tier` used by icons.js badgeSVG().
 * ========================================================================= */

import { dateToNum, todayISO } from "./store.js";

/** Longest chain of completed sessions with <=3 day gaps (best streak ever). */
function maxStreak(completed) {
  if (!completed.length) return 0;
  const days = completed.map((s) => dateToNum(s.date)).sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] <= 3) run++; else run = 1;
    if (run > best) best = run;
  }
  return best;
}

function sessionsInLastDays(completed, n) {
  const today = dateToNum(todayISO());
  return completed.filter((s) => today - dateToNum(s.date) <= n).length;
}

/* id, name, desc, glyph, tier, test(ctx) -> bool, metric+goal (for progress) */
export const ACHIEVEMENTS = [
  { id: "first_gate", name: "First Gate", desc: "Complete your first workout.", glyph: "portal", tier: "t1", test: (c) => c.count >= 1, metric: "count", goal: 1 },
  { id: "gates_10", name: "Gate Hunter", desc: "Clear 10 gates.", glyph: "sword", tier: "t2", test: (c) => c.count >= 10, metric: "count", goal: 10 },
  { id: "gates_25", name: "Dungeon Regular", desc: "Clear 25 gates.", glyph: "tower", tier: "t2", test: (c) => c.count >= 25, metric: "count", goal: 25 },
  { id: "gates_50", name: "Gate Breaker", desc: "Clear 50 gates.", glyph: "burst", tier: "t3", test: (c) => c.count >= 50, metric: "count", goal: 50 },
  { id: "gates_100", name: "Monarch's Path", desc: "Clear 100 gates.", glyph: "crown", tier: "t5", test: (c) => c.count >= 100, metric: "count", goal: 100 },

  { id: "streak_3", name: "Momentum", desc: "3 sessions in a row (≤3 days apart).", glyph: "flame", tier: "t1", test: (c) => c.maxStreak >= 3, metric: "streak", goal: 3 },
  { id: "streak_7", name: "Unbroken", desc: "A 7-session streak.", glyph: "bolt", tier: "t3", test: (c) => c.maxStreak >= 7, metric: "streak", goal: 7 },
  { id: "streak_14", name: "Relentless", desc: "A 14-session streak.", glyph: "flame", tier: "t4", test: (c) => c.maxStreak >= 14, metric: "streak", goal: 14 },

  { id: "vol_100k", name: "Heavy Lifter", desc: "Move 100,000 total volume.", glyph: "dumbbell", tier: "t2", test: (c) => c.volume >= 1e5, metric: "volume", goal: 1e5 },
  { id: "vol_500k", name: "Mountain Mover", desc: "Move 500,000 total volume.", glyph: "mountain", tier: "t3", test: (c) => c.volume >= 5e5, metric: "volume", goal: 5e5 },
  { id: "vol_1m", name: "Million Club", desc: "Move 1,000,000 total volume.", glyph: "gem", tier: "t5", test: (c) => c.volume >= 1e6, metric: "volume", goal: 1e6 },

  { id: "pr_10", name: "Record Setter", desc: "Set 10 personal records.", glyph: "medal", tier: "t2", test: (c) => c.records >= 10, metric: "records", goal: 10 },
  { id: "pr_25", name: "Limit Breaker", desc: "Set 25 personal records.", glyph: "trophy", tier: "t4", test: (c) => c.records >= 25, metric: "records", goal: 25 },

  { id: "rank_c", name: "C-Rank Hunter", desc: "Reach Level 10.", glyph: "shield", tier: "t2", test: (c) => c.level >= 10, metric: "level", goal: 10 },
  { id: "rank_a", name: "A-Rank Hunter", desc: "Reach Level 35.", glyph: "shield", tier: "t3", test: (c) => c.level >= 35, metric: "level", goal: 35 },
  { id: "rank_s", name: "S-Rank Hunter", desc: "Reach Level 55.", glyph: "star", tier: "t5", test: (c) => c.level >= 55, metric: "level", goal: 55 },

  { id: "full_rotation", name: "Full Rotation", desc: "Train all 6 PPL days at least once.", glyph: "orbit", tier: "t3", test: (c) => c.dayTypes >= 6 },
  { id: "locked_in", name: "Locked In", desc: "12 workouts in 30 days.", glyph: "calendar", tier: "t2", test: (c) => c.last30 >= 12 },

  { id: "bw_bench", name: "Bodyweight Bench", desc: "Bench press ≥ your bodyweight.", glyph: "dumbbell", tier: "t3", test: (c) => c.bw > 0 && (c.best["Barbell Bench Press"] || 0) >= c.bw },
  { id: "bw_squat", name: "1.5× Squat", desc: "Squat ≥ 1.5× bodyweight.", glyph: "squat", tier: "t3", test: (c) => c.bw > 0 && (c.best["Back Squat"] || 0) >= 1.5 * c.bw },
  { id: "bw_dead", name: "2× Deadlift", desc: "Deadlift ≥ 2× bodyweight.", glyph: "link", tier: "t4", test: (c) => c.bw > 0 && (c.best["Deadlift"] || 0) >= 2 * c.bw }
];

function buildCtx(sessions, stats) {
  const completed = sessions.filter((s) => s.completedAt);
  const dayTypes = new Set(completed.map((s) => s.dayId)).size;
  let bw = 0;
  for (let i = completed.length - 1; i >= 0; i--) {
    const v = Number(completed[i].bodyweight);
    if (v > 0) { bw = v; break; }
  }
  const best = {};
  for (const name in stats.bestByExercise) best[name] = stats.bestByExercise[name].e1rm;
  return {
    count: stats.sessionCount,
    volume: stats.totalVolume,
    records: stats.prTimeline.length,
    level: stats.level,
    maxStreak: maxStreak(completed),
    dayTypes,
    last30: sessionsInLastDays(completed, 30),
    bw,
    best
  };
}

/** Returns [{...def, unlocked, progress}] in definition order. */
export function evaluate(sessions, stats) {
  const ctx = buildCtx(sessions, stats);
  return ACHIEVEMENTS.map((a) => {
    const unlocked = !!a.test(ctx);
    let progress = null;
    if (!unlocked && a.metric && a.goal) {
      const cur = { count: ctx.count, streak: ctx.maxStreak, volume: ctx.volume, records: ctx.records, level: ctx.level }[a.metric] || 0;
      progress = { cur, goal: a.goal, pct: Math.min(100, Math.round((cur / a.goal) * 100)) };
    }
    return { ...a, unlocked, progress };
  });
}

export function unlockedIds(sessions, stats) {
  return evaluate(sessions, stats).filter((a) => a.unlocked).map((a) => a.id);
}

export function byId(id) { return ACHIEVEMENTS.find((a) => a.id === id) || null; }
