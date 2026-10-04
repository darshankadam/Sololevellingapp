/* =========================================================================
 * store.js  —  Local persistence (IndexedDB) + all derived "RPG" stats.
 *
 * Nothing here ever leaves the device. Two object stores:
 *   sessions : one record per logged workout (keyPath "id")
 *   kv       : key/value for settings + program overrides (keyPath "key")
 *
 * Stats (XP, level, rank, PRs, streak) are DERIVED from sessions by replay,
 * never stored as mutable counters — so they can't drift or corrupt.
 * ========================================================================= */

import { DEFAULT_PROGRAM, ROTATION } from "./program.js";

const DB_NAME = "sololeveling-gym";
const DB_VERSION = 1;
let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("sessions")) {
        const s = db.createObjectStore("sessions", { keyPath: "id" });
        s.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        let result;
        Promise.resolve(fn(store)).then((r) => (result = r));
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* --------------------------- Sessions CRUD ------------------------------- */

export async function getAllSessions() {
  const out = await tx("sessions", "readonly", (store) => reqAsPromise(store.getAll()));
  return (out || []).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0)));
}

export async function getSession(id) {
  return tx("sessions", "readonly", (store) => reqAsPromise(store.get(id)));
}

export async function saveSession(session) {
  session.updatedAt = Date.now();
  await tx("sessions", "readwrite", (store) => store.put(session));
  return session;
}

export async function deleteSession(id) {
  await tx("sessions", "readwrite", (store) => store.delete(id));
}

export async function replaceAllSessions(sessions) {
  await tx("sessions", "readwrite", (store) => {
    store.clear();
    for (const s of sessions) store.put(s);
  });
}

/* ------------------------------ Settings --------------------------------- */

export async function getSetting(key, fallback = null) {
  const row = await tx("kv", "readonly", (store) => reqAsPromise(store.get(key)));
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await tx("kv", "readwrite", (store) => store.put({ key, value }));
  return value;
}

/* ------------------------------ Program ---------------------------------- */
/* A user-edited program is stored under kv "program". Otherwise the default
 * from program.js is used. */

export async function getProgram() {
  const override = await getSetting("program", null);
  const p = override || structuredCloneSafe(DEFAULT_PROGRAM);
  if (!p.rotation) p.rotation = ROTATION;
  return p;
}

export async function saveProgram(program) {
  return setSetting("program", program);
}

export async function resetProgram() {
  await tx("kv", "readwrite", (store) => store.delete("program"));
}

function structuredCloneSafe(obj) {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

/* ============================ RPG STAT ENGINE ============================ */

/** Estimated 1-rep max (Epley). Returns 0 for bodyweight / empty sets. */
export function e1rm(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/** Volume (kg·reps) for one set. */
export function setVolume(set) {
  const w = Number(set.weight) || 0;
  const r = Number(set.reps) || 0;
  return w * r;
}

/** Total volume for a whole session. */
export function sessionVolume(session) {
  let v = 0;
  for (const entry of session.entries || []) {
    for (const s of entry.sets || []) v += setVolume(s);
  }
  return v;
}

/** Best (max) e1RM reached within a single session for one exercise name. */
export function sessionBestE1RM(session, exerciseName) {
  let best = 0;
  for (const entry of session.entries || []) {
    if (entry.name !== exerciseName) continue;
    for (const s of entry.sets || []) best = Math.max(best, e1rm(s.weight, s.reps));
  }
  return best;
}

/** How many sets in a session actually have reps logged. */
export function loggedSetCount(session) {
  let n = 0;
  for (const entry of session.entries || []) {
    for (const s of entry.sets || []) if ((Number(s.reps) || 0) > 0) n++;
  }
  return n;
}

/* ---- XP model (tune here) ---- */
const XP_PER_SET = 8;
const XP_PER_VOLUME = 1 / 50; // 1 XP per 50 kg·reps
const XP_SESSION_COMPLETE = 50;
const XP_PR = 100;

/** XP = f(cumulative training) + PR bonuses, computed by chronological replay. */
export function computeStats(sessions) {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.completedAt || 0) - (b.completedAt || 0)));

  let totalXP = 0;
  let totalVolume = 0;
  let totalSets = 0;
  const bestByExercise = {}; // name -> { e1rm, date, weight, reps }
  const prTimeline = []; // { name, e1rm, date }

  for (const s of completed) {
    totalXP += XP_SESSION_COMPLETE;
    totalVolume += sessionVolume(s);

    // Track running best e1RM per exercise to detect PRs in order.
    const seenThisSession = {};
    for (const entry of s.entries || []) {
      for (const set of entry.sets || []) {
        const reps = Number(set.reps) || 0;
        if (reps <= 0) continue;
        totalSets += 1;
        totalXP += XP_PER_SET + setVolume(set) * XP_PER_VOLUME;

        const est = e1rm(set.weight, set.reps);
        if (est <= 0) continue;
        const prev = bestByExercise[entry.name];
        const isNewBest = !prev || est > prev.e1rm + 0.01;
        // Only award one PR per exercise per session (the best of the day).
        if (isNewBest && (!seenThisSession[entry.name] || est > seenThisSession[entry.name])) {
          seenThisSession[entry.name] = est;
        }
      }
    }
    // Commit PRs for this session.
    for (const name in seenThisSession) {
      const est = seenThisSession[name];
      const prev = bestByExercise[name];
      if (!prev || est > prev.e1rm + 0.01) {
        totalXP += XP_PR;
        bestByExercise[name] = { e1rm: est, date: s.date };
        prTimeline.push({ name, e1rm: est, date: s.date });
      }
    }
  }

  totalXP = Math.round(totalXP);
  const level = levelFromXP(totalXP);
  const xpThis = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);
  const rank = rankForLevel(level);

  return {
    totalXP,
    level,
    rank,
    xpIntoLevel: totalXP - xpThis,
    xpLevelSpan: xpNext - xpThis,
    xpToNext: xpNext - totalXP,
    totalVolume,
    totalSets,
    sessionCount: completed.length,
    bestByExercise,
    prTimeline,
    streak: computeStreak(completed),
    lastSession: completed[completed.length - 1] || null
  };
}

/* XP needed to *reach* a level: 50 * L * (L-1)  (triangular curve). */
export function xpForLevel(level) {
  const L = Math.max(1, level);
  return 50 * L * (L - 1);
}
export function levelFromXP(xp) {
  const x = Math.max(0, xp);
  return Math.floor((1 + Math.sqrt(1 + 0.08 * x)) / 2);
}

/* Solo Leveling style hunter ranks. */
export function rankForLevel(level) {
  if (level >= 80) return { letter: "MONARCH", title: "Monarch", cls: "rank-monarch" };
  if (level >= 55) return { letter: "S", title: "S-Rank Hunter", cls: "rank-s" };
  if (level >= 35) return { letter: "A", title: "A-Rank Hunter", cls: "rank-a" };
  if (level >= 20) return { letter: "B", title: "B-Rank Hunter", cls: "rank-b" };
  if (level >= 10) return { letter: "C", title: "C-Rank Hunter", cls: "rank-c" };
  if (level >= 5) return { letter: "D", title: "D-Rank Hunter", cls: "rank-d" };
  return { letter: "E", title: "E-Rank Hunter", cls: "rank-e" };
}

/* The full rank ladder (min level to reach each). Mirrors rankForLevel. */
export const RANK_TIERS = [
  { letter: "E", title: "E-Rank Hunter", cls: "rank-e", min: 1, blurb: "Every Monarch started here." },
  { letter: "D", title: "D-Rank Hunter", cls: "rank-d", min: 5, blurb: "The habit is forming." },
  { letter: "C", title: "C-Rank Hunter", cls: "rank-c", min: 10, blurb: "Consistency is real now." },
  { letter: "B", title: "B-Rank Hunter", cls: "rank-b", min: 20, blurb: "Serious, dependable strength." },
  { letter: "A", title: "A-Rank Hunter", cls: "rank-a", min: 35, blurb: "Rarefied air. Few reach here." },
  { letter: "S", title: "S-Rank Hunter", cls: "rank-s", min: 55, blurb: "Elite. The top of the ladder." },
  { letter: "MONARCH", title: "Monarch", cls: "rank-monarch", min: 80, blurb: "Beyond rank. Arise." }
];

/* Streak tolerant of rest days: consecutive completed sessions where each is
 * within 3 days of the previous. Broken if the latest is >3 days ago. */
function computeStreak(completedAsc) {
  if (!completedAsc.length) return 0;
  const days = completedAsc.map((s) => dateToNum(s.date));
  const last = days[days.length - 1];
  const todayNum = dateToNum(todayISO());
  if (todayNum - last > 3) return 0;
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i] - days[i - 1] <= 3) streak++;
    else break;
  }
  return streak;
}

/* --------------------------- PR / history helpers ------------------------ */

/** Chronological e1RM series for one exercise: [{date, e1rm, topSet}]. */
export function exerciseHistory(sessions, exerciseName) {
  const out = [];
  const completed = sessions.filter((s) => s.completedAt);
  for (const s of completed) {
    let best = 0;
    let topSet = null;
    for (const entry of s.entries || []) {
      if (entry.name !== exerciseName) continue;
      for (const set of entry.sets || []) {
        const est = e1rm(set.weight, set.reps);
        if (est > best) {
          best = est;
          topSet = set;
        }
      }
    }
    if (best > 0) out.push({ date: s.date, e1rm: best, topSet });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* ------------------------------ Date utils ------------------------------- */

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function dateToNum(iso) {
  // days since epoch for the calendar date (timezone-safe enough for diffs)
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function uid() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/* Ask the browser to keep our storage (reduces iOS eviction risk). */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function storageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
  } catch {
    /* ignore */
  }
  return null;
}
