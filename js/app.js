/* =========================================================================
 * app.js  —  Main controller: state, router, views, logging flow.
 *   "THE SYSTEM" — your personal gym gate.
 * ========================================================================= */

import { getDay } from "./program.js";
import * as store from "./store.js";
import { lineChart, barChart, calendarHeatmap } from "./charts.js";
import { exportXLSX, exportCSV, exportJSON, readJSONFile } from "./exporter.js";
import * as K from "./knowledge.js";
import * as fx from "./fx.js";
import * as coach from "./coach.js";
import * as ach from "./achievements.js";

/* ------------------------------- state ----------------------------------- */
const state = {
  view: "home",
  program: null,
  sessions: [],
  settings: { unit: "kg", restSeconds: 120, lastStatsExercise: null, reduceMotion: false, sound: true, hunterName: "", barWeight: 20, onboarded: false, achievementsSeen: [] },
  current: null, // session being logged
  stats: null,
  openLearn: new Set(), // exIds with the "Learn" panel expanded
  _pendingBW: null
};

let saveTimer = null;
let restTimer = null;
let restTipTimer = null;

/* Accent colours per workout type (used for particle bursts). */
function tagColors(tag) {
  const t = (tag || "").toLowerCase();
  if (t === "pull") return ["#8b5cf6", "#a855f7", "#e879f9", "#c4b5fd"];
  if (t === "legs") return ["#2dd4bf", "#34d399", "#5eead4", "#fbbf24"];
  return ["#38bdf8", "#22d3ee", "#7dd3fc", "#a855f7"];
}

/* ------------------------------ tiny helpers ----------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : round(n, 1) + "");

function toast(msg, kind = "") {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.className = "show " + kind;
  t.textContent = msg;
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = ""), 2600);
}

function modal(html) {
  let m = $("#modal");
  if (!m) { m = document.createElement("div"); m.id = "modal"; document.body.appendChild(m); }
  m.innerHTML = `<div class="modal-scrim" data-action="close-modal"></div><div class="modal-card system-frame">${html}</div>`;
  m.classList.add("open");
  return m;
}
function closeModal() { const m = $("#modal"); if (m) m.classList.remove("open"); }

/* --------------------------- domain helpers ------------------------------ */
function completedSessions() { return state.sessions.filter((s) => s.completedAt); }

function firstTrainingDay(program) {
  for (const id of program.rotation) if (id !== "rest" && program.days.some((d) => d.id === id)) return id;
  return program.days[0].id;
}
function nextTrainingDayId(program, fromId) {
  const rot = program.rotation;
  let idx = rot.indexOf(fromId);
  if (idx < 0) idx = 0;
  for (let k = 1; k <= rot.length; k++) {
    const cand = rot[(idx + k) % rot.length];
    if (cand !== "rest" && program.days.some((d) => d.id === cand)) return cand;
  }
  return firstTrainingDay(program);
}
function suggestedDayId() {
  const done = completedSessions();
  if (!done.length) return firstTrainingDay(state.program);
  return nextTrainingDayId(state.program, done[done.length - 1].dayId);
}
function restDueNext() {
  const done = completedSessions();
  if (!done.length) return false;
  const rot = state.program.rotation;
  const idx = rot.indexOf(done[done.length - 1].dayId);
  return idx >= 0 && rot[(idx + 1) % rot.length] === "rest";
}

/** Best (by e1RM) set of an exercise in the most recent completed session. */
function lastPerformance(exName) {
  const done = completedSessions();
  for (let i = done.length - 1; i >= 0; i--) {
    let best = null;
    for (const entry of done[i].entries || []) {
      if (entry.name !== exName) continue;
      for (const set of entry.sets || []) {
        if ((Number(set.reps) || 0) <= 0) continue;
        if (!best || store.e1rm(set.weight, set.reps) > store.e1rm(best.weight, best.reps)) best = set;
      }
    }
    if (best) return { ...best, date: done[i].date };
  }
  return null;
}

/** Full most-recent completed entry (all sets) for a lift — for progression. */
function lastSessionEntry(exName) {
  const done = completedSessions();
  for (let i = done.length - 1; i >= 0; i--) {
    const entry = (done[i].entries || []).find((e) => e.name === exName && (e.sets || []).some((s) => Number(s.reps) > 0));
    if (entry) return entry;
  }
  return null;
}

function latestBodyweight() {
  const done = completedSessions();
  for (let i = done.length - 1; i >= 0; i--) { const v = Number(done[i].bodyweight); if (v > 0) return v; }
  return 0;
}
function defaultBodyweight() {
  if (state._pendingBW) { const p = state._pendingBW; state._pendingBW = null; return String(p); }
  const b = latestBodyweight(); return b > 0 ? String(b) : "";
}

function newSessionFromDay(dayId) {
  const day = getDay(state.program, dayId);
  const entries = day.exercises.map((ex) => {
    const last = lastPerformance(ex.name);
    const sets = [];
    for (let i = 0; i < (ex.sets || 3); i++) {
      sets.push({ weight: last ? String(last.weight ?? "") : "", reps: "", done: false });
    }
    return {
      exId: ex.id, name: ex.name, muscle: ex.muscle || "", note: ex.note || "",
      targetSets: ex.sets, targetReps: ex.reps, alts: ex.alts || [], sets
    };
  });
  return {
    id: store.uid(), date: store.todayISO(), dayId: day.id, dayName: day.name, tag: day.tag,
    entries, note: "", bodyweight: defaultBodyweight(), startedAt: Date.now(), completedAt: null, createdAt: Date.now()
  };
}

/* ------------------------------ persistence ------------------------------ */
function persistCurrent(immediate = false) {
  if (!state.current) return;
  const run = () => { store.saveSession(state.current).then(() => { const i = $("#saveState"); if (i) { i.textContent = "✓ saved"; i.classList.add("ok"); } }); };
  clearTimeout(saveTimer);
  if (immediate) run(); else saveTimer = setTimeout(run, 400);
}

async function refreshSessions() { state.sessions = await store.getAllSessions(); state.stats = store.computeStats(state.sessions); }

/* ================================ INIT ================================== */
async function init() {
  state.program = await store.getProgram();
  state.settings = Object.assign(state.settings, (await store.getSetting("settings", {})) || {});
  document.body.classList.toggle("reduce-motion", !!state.settings.reduceMotion);
  fx.setSound(state.settings.sound !== false);
  await refreshSessions();

  // Existing users (already have logs) skip onboarding, and their already-earned
  // titles are marked seen so we don't retroactively celebrate them.
  if (!Array.isArray(state.settings.achievementsSeen)) state.settings.achievementsSeen = [];
  if (!state.settings.onboarded && state.sessions.length > 0) state.settings.onboarded = true;
  if (state.settings.achievementsSeen.length === 0 && state.sessions.length > 0) {
    state.settings.achievementsSeen = ach.unlockedIds(state.sessions, state.stats);
  }
  await saveSettings();

  store.requestPersistence();
  registerSW();
  bindShell();
  state.animateNext = true;
  render();
  if (!state.settings.onboarded) showOnboarding();
}

function bindShell() {
  $("#nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nav]");
    if (!b) return;
    navigate(b.dataset.nav);
  });
  document.body.addEventListener("click", (e) => {
    if (e.target.closest("[data-action='close-modal']")) closeModal();
  });
}

function navigate(view) {
  // leaving an in-progress log keeps it saved; just switch
  state.view = view;
  state.animateNext = true;
  render();
  window.scrollTo(0, 0);
}

/* =============================== RENDER ================================= */
function render() {
  // the active-logging "session" view lights up the Log tab
  $$("#nav [data-nav]").forEach((b) => b.classList.toggle("active", b.dataset.nav === state.view || (state.view === "session" && b.dataset.nav === "log")));
  const view = $("#view");
  if (state.view === "home") view.innerHTML = renderHome();
  else if (state.view === "log") view.innerHTML = renderLog();
  else if (state.view === "session") view.innerHTML = renderSession();
  else if (state.view === "stats") view.innerHTML = renderStats();
  else if (state.view === "data") view.innerHTML = renderData();
  bindView();
}

/* ------------------------------ Hunter panel ----------------------------- */
function hunterPanel() {
  const s = state.stats;
  const pct = s.xpLevelSpan > 0 ? Math.min(100, (s.xpIntoLevel / s.xpLevelSpan) * 100) : 0;
  return `
  <section class="panel system-frame hunter">
    <div class="hunter-top">
      <div class="rank-badge ${s.rank.cls}"><span>${esc(s.rank.letter)}</span></div>
      <div class="hunter-id">
        <div class="hunter-label">${esc(state.settings.hunterName || "HUNTER")} · ${esc(s.rank.title)}</div>
        <div class="hunter-level">LEVEL <b>${s.level}</b></div>
        <div class="xp-row">
          <div class="xp-bar"><i style="width:${pct}%" data-pct="${pct}"></i></div>
          <div class="xp-text">${fmt(s.xpIntoLevel)} / ${fmt(s.xpLevelSpan)} XP</div>
        </div>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-tile"><div class="stat-num">${s.sessionCount}</div><div class="stat-cap">Gates Cleared</div></div>
      <div class="stat-tile"><div class="stat-num">${s.streak}<span class="flame">▲</span></div><div class="stat-cap">Streak</div></div>
      <div class="stat-tile"><div class="stat-num">${fmt(s.totalVolume)}</div><div class="stat-cap">Total Volume</div></div>
      <div class="stat-tile"><div class="stat-num">${s.prTimeline.length}</div><div class="stat-cap">Records</div></div>
    </div>
  </section>`;
}

/* -------------------------------- HOME ----------------------------------- */
function renderHome() {
  const inProgress = state.sessions.find((s) => !s.completedAt && (s.entries || []).some((e) => (e.sets || []).some((x) => x.done || Number(x.reps) > 0)));
  const dayId = suggestedDayId();
  const day = getDay(state.program, dayId);
  const tagCls = "tag-" + (day.tag || "push").toLowerCase();
  const recent = completedSessions().slice(-5).reverse();
  const neuro = K.neuroOfDay(store.todayISO());
  const achAll = ach.evaluate(state.sessions, state.stats);
  const got = achAll.filter((a) => a.unlocked);

  return `
  ${hunterPanel()}

  ${inProgress ? `
  <section class="panel resume-banner" data-action="resume" data-id="${inProgress.id}">
    <div><div class="resume-k">WORKOUT IN PROGRESS</div><div class="resume-v">${esc(inProgress.dayName)} · ${esc(inProgress.date)}</div></div>
    <button class="btn btn-ghost">Resume ▸</button>
  </section>` : ""}

  <section class="panel quest system-frame ${tagCls}">
    <div class="quest-head">
      <span class="quest-eyebrow">${restDueNext() ? "☾ REST DAY DUE — OR PUSH ON" : "⚔ TODAY'S QUEST"}</span>
      <span class="quest-tag ${tagCls}">${esc(day.tag)}</span>
    </div>
    <h2 class="quest-title">${esc(day.name)}</h2>
    <p class="quest-focus">${esc(day.focus || "")}</p>
    <div class="quest-meta">${day.exercises.length} exercises · ${day.exercises.reduce((a, e) => a + (e.sets || 0), 0)} working sets</div>
    <div class="quest-actions">
      <button class="btn btn-primary btn-lg" data-action="start" data-day="${day.id}">⟡ Enter the Gate</button>
      <button class="btn btn-ghost" data-action="pick-day">Change</button>
    </div>
  </section>

  <section class="panel ach-strip" data-action="go-stats">
    <div class="ach-strip-h"><span>⬡ TITLES</span><b>${got.length}/${achAll.length}</b></div>
    <div class="ach-icons">${got.length ? got.slice(-8).reverse().map((a) => `<span class="ach-ico">${a.icon}</span>`).join("") : '<span class="ach-none">Clear gates to earn titles →</span>'}</div>
  </section>

  <section class="panel neuro-card">
    <div class="neuro-k">◆ NEURO INSIGHT · ${esc(neuro.tag)}</div>
    <div class="neuro-t">${esc(neuro.text)}</div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Recent Gates</h3></div>
    ${recent.length ? `<ul class="session-list">${recent.map(sessionRow).join("")}</ul>`
      : `<div class="empty">No gates cleared yet. Enter your first one above.</div>`}
  </section>`;
}

function sessionRow(s) {
  let sets = 0;
  (s.entries || []).forEach((e) => (e.sets || []).forEach((x) => { if (Number(x.reps) > 0) sets++; }));
  const tagCls = "tag-" + (s.tag || "push").toLowerCase();
  return `<li class="session-item" data-action="open-session" data-id="${s.id}">
    <span class="si-tag ${tagCls}">${esc((s.tag || "")[0] || "·")}</span>
    <span class="si-main"><b>${esc(s.dayName)}</b><small>${esc(s.date)}${s.mood ? " · " + moodEmoji(s.mood) : ""}</small></span>
    <span class="si-meta">${sets} sets<small>${fmt(store.sessionVolume(s))} vol</small></span>
  </li>`;
}

/* ------------------------------ LOG (history) ---------------------------- */
function renderLog() {
  const inProgress = state.sessions.find((s) => !s.completedAt && (s.entries || []).some((e) => (e.sets || []).some((x) => x.done || Number(x.reps) > 0)));
  const done = completedSessions().slice().reverse(); // newest first
  const dayId = suggestedDayId();
  const day = getDay(state.program, dayId);

  // group sessions by "Month YYYY"
  const groups = {};
  for (const s of done) { const k = monthLabel(s.date); (groups[k] = groups[k] || []).push(s); }

  return `
  <section class="panel log-top system-frame">
    <div class="quest-eyebrow">TRAINING LOG</div>
    <h2 class="quest-title">Your Gates</h2>
    <div class="log-top-stats">${done.length} logged · ${fmt(state.stats.totalVolume)} total volume · streak ${state.stats.streak}</div>
    ${inProgress
      ? `<button class="btn btn-primary btn-lg block" data-action="resume" data-id="${inProgress.id}">▸ Resume ${esc(inProgress.dayName)}</button>`
      : `<button class="btn btn-primary btn-lg block" data-action="start" data-day="${day.id}">⟡ Start ${esc(day.name)}</button>`}
  </section>

  ${done.length
    ? Object.keys(groups).map((k) => `
      <section class="panel">
        <div class="panel-h"><h3>${esc(k)}</h3><span class="muted-sm">${groups[k].length}</span></div>
        <ul class="session-list">${groups[k].map(sessionRow).join("")}</ul>
      </section>`).join("")
    : `<section class="panel empty-hero"><h2>No workouts logged yet</h2><p>Tap Start above to log your first gate. Every set you record is saved here forever (on this device).</p></section>`}`;
}

function monthLabel(iso) {
  const [y, m] = iso.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[+m - 1]} ${y}`;
}
function moodEmoji(k) { return { Pumped: "🔥", Strong: "💪", Tough: "😮‍💨", Flat: "😐" }[k] || ""; }

/* ------------------------- SESSION (active logging) ---------------------- */
function renderSession() {
  const cur = state.current;
  if (!cur) {
    return `<section class="panel empty-hero"><h2>No active quest</h2><p>Start one from the System or Log tab.</p>
      <button class="btn btn-primary" data-action="go-home">◂ Back to System</button></section>`;
  }
  const tagCls = "tag-" + (cur.tag || "push").toLowerCase();
  let doneSets = 0, totalSets = 0;
  cur.entries.forEach((e) => e.sets.forEach((x) => { totalSets++; if (x.done) doneSets++; }));
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  return `
  <section class="panel log-head system-frame ${tagCls}">
    <button class="btn btn-ghost btn-sm back" data-action="go-home">◂</button>
    <div class="log-head-main">
      <div class="quest-eyebrow">ACTIVE GATE · <span id="saveState">${esc(cur.date)}</span></div>
      <h2 class="quest-title">${esc(cur.dayName)}</h2>
    </div>
    <div class="log-progress"><div class="log-progress-bar"><i style="width:${pct}%"></i></div><span>${doneSets}/${totalSets}</span></div>
  </section>

  <div class="ex-list">
    ${cur.entries.map((entry, ei) => exerciseCard(entry, ei)).join("")}
  </div>

  <section class="panel finish-panel">
    <label class="field"><span>Session note</span>
      <input id="sessNote" type="text" placeholder="How did it feel?" value="${esc(cur.note || "")}" data-role="sess-note"></label>
    <label class="field"><span>Bodyweight (${esc(state.settings.unit)})</span>
      <input id="bw" type="text" inputmode="decimal" placeholder="optional" value="${esc(cur.bodyweight || "")}" data-role="bw"></label>
    <button class="btn btn-primary btn-lg block" data-action="finish">✓ Complete Quest</button>
    <button class="btn btn-ghost block" data-action="discard">Discard this session</button>
  </section>`;
}

function exerciseCard(entry, ei) {
  const last = lastPerformance(entry.name);
  const step = state.settings.unit === "lb" ? 5 : 2.5;
  const info = K.getInfo(entry.name, entry.muscle);
  const open = state.openLearn.has(entry.exId);
  const sugg = coach.progressionSuggestion(lastSessionEntry(entry.name), entry.targetReps, state.settings.unit);
  return `
  <section class="panel ex-card">
    <div class="ex-head">
      <div class="ex-title">
        <b>${esc(entry.name)}</b>
        <small>${esc(entry.muscle)} · target ${entry.targetSets}×${esc(entry.targetReps)}</small>
      </div>
      <div class="ex-actions">
        <button class="icon-btn ${open ? "on" : ""}" data-action="learn" data-ex="${ei}" aria-label="Learn about this exercise">${open ? "▲" : "ⓘ"}</button>
        <button class="btn btn-ghost btn-sm" data-action="swap" data-ex="${ei}">⇄</button>
      </div>
    </div>
    ${entry.note ? `<div class="ex-note">${esc(entry.note)}</div>` : ""}
    <div class="ex-learn ${open ? "open" : ""}">
      <div class="learn-row"><span class="learn-k">WORKS</span><span>${esc(info.primary)}${info.secondary && info.secondary !== "—" ? ' · <em>' + esc(info.secondary) + "</em>" : ""}</span></div>
      <div class="learn-row"><span class="learn-k">CUES</span><ul class="learn-cues">${info.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
      <div class="learn-row"><span class="learn-k">AVOID</span><span>${esc(info.mistake)}</span></div>
      <div class="learn-row"><span class="learn-k">FOCUS</span><span class="learn-focus">${esc(info.focus)}</span></div>
      <div class="learn-why">${esc(info.why)}</div>
    </div>
    <div class="ex-last">${last ? `Last: <b>${esc(last.weight)}${esc(state.settings.unit)} × ${esc(last.reps)}</b> · best e1RM ${fmt(store.e1rm(last.weight, last.reps))}` : "No history yet — set the baseline."}</div>
    <div class="ex-coach">
      <div class="coach-tip ${sugg.type === "add" ? "up" : ""}">${sugg.type === "add" ? "▲ " : "→ "}${esc(sugg.text)}</div>
      <div class="coach-btns">
        <button class="chip-btn" data-action="plates" data-ex="${ei}">⚖ Plates</button>
        <button class="chip-btn" data-action="warmup" data-ex="${ei}">🔥 Warm-up</button>
      </div>
    </div>
    <div class="set-table">
      <div class="set-row set-row-head"><span>SET</span><span>WEIGHT (${esc(state.settings.unit)})</span><span>REPS</span><span>✓</span></div>
      ${entry.sets.map((set, si) => setRow(entry, ei, set, si, step)).join("")}
    </div>
    <div class="set-tools">
      <button class="btn btn-ghost btn-sm" data-action="del-set" data-ex="${ei}">− set</button>
      <button class="btn btn-ghost btn-sm" data-action="add-set" data-ex="${ei}">+ set</button>
    </div>
  </section>`;
}

function setRow(entry, ei, set, si, step) {
  return `
  <div class="set-row ${set.done ? "done" : ""}">
    <span class="set-no">${si + 1}</span>
    <span class="num-field">
      <button class="step" data-action="step" data-ex="${ei}" data-set="${si}" data-field="weight" data-delta="${-step}">−</button>
      <input inputmode="decimal" data-role="set" data-ex="${ei}" data-set="${si}" data-field="weight" value="${esc(set.weight)}" placeholder="0">
      <button class="step" data-action="step" data-ex="${ei}" data-set="${si}" data-field="weight" data-delta="${step}">+</button>
    </span>
    <span class="num-field">
      <button class="step" data-action="step" data-ex="${ei}" data-set="${si}" data-field="reps" data-delta="-1">−</button>
      <input inputmode="numeric" data-role="set" data-ex="${ei}" data-set="${si}" data-field="reps" value="${esc(set.reps)}" placeholder="0">
      <button class="step" data-action="step" data-ex="${ei}" data-set="${si}" data-field="reps" data-delta="1">+</button>
    </span>
    <button class="chk ${set.done ? "on" : ""}" data-action="toggle-done" data-ex="${ei}" data-set="${si}">✓</button>
  </div>`;
}

/* ------------------------------- STATS ----------------------------------- */
function renderStats() {
  const done = completedSessions();
  if (!done.length) {
    return `${hunterPanel()}<section class="panel empty-hero"><h2>No data yet</h2><p>Clear a few gates and your analytics awaken here.</p></section>`;
  }

  const trained = {};
  done.forEach((s) => (s.entries || []).forEach((e) => (e.sets || []).forEach((x) => { if (Number(x.reps) > 0) trained[e.name] = (trained[e.name] || 0) + 1; })));
  const names = Object.keys(trained).sort((a, b) => trained[b] - trained[a]);
  let sel = state.settings.lastStatsExercise;
  if (!sel || !names.includes(sel)) sel = names[0];

  const prRows = Object.entries(state.stats.bestByExercise)
    .map(([name, v]) => ({ name, e1rm: v.e1rm, date: v.date }))
    .sort((a, b) => b.e1rm - a.e1rm).slice(0, 12);

  const hasBW = done.some((s) => Number(s.bodyweight) > 0);
  const bw = latestBodyweight();
  const bigLifts = ["Back Squat", "Barbell Bench Press", "Deadlift", "Overhead Press"];
  const standards = bw > 0 ? bigLifts.map((n) => {
    const best = state.stats.bestByExercise[n]?.e1rm; if (!best) return null;
    const r = coach.strengthRatio(best, bw); return r ? { name: n, ...r } : null;
  }).filter(Boolean) : [];

  const achList = ach.evaluate(state.sessions, state.stats);
  const u = esc(state.settings.unit);

  return `
  ${hunterPanel()}

  <section class="panel" id="achSection">
    <div class="panel-h"><h3>⬡ Titles</h3><span class="muted-sm">${achList.filter((a) => a.unlocked).length}/${achList.length}</span></div>
    <div class="ach-grid">${achList.map(achCard).join("")}</div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Training Calendar</h3></div>
    <div id="chartCal" class="chart"></div>
    <div class="chart-cap">Each square is a day · brighter = more volume · last 18 weeks</div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Strength Progression</h3></div>
    <select id="exSelect" class="select">${names.map((n) => `<option ${n === sel ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
    <div id="chartE1RM" class="chart"></div>
    <div class="chart-cap">Estimated 1RM over time · diamond marks your record</div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Volume per Gate</h3></div>
    <div id="chartVol" class="chart"></div>
    <div class="chart-cap">Total ${u}·reps per session (last 20)</div>
  </section>

  ${hasBW ? `<section class="panel">
    <div class="panel-h"><h3>Bodyweight</h3></div>
    <div id="chartBW" class="chart"></div>
    <div class="chart-cap">Logged at the end of a session</div>
  </section>` : ""}

  <section class="panel">
    <div class="panel-h"><h3>Volume by Muscle</h3></div>
    <div id="chartMuscle" class="chart"></div>
    <div class="chart-cap">Where your work is going (all time)</div>
  </section>

  ${standards.length ? `<section class="panel">
    <div class="panel-h"><h3>Strength Standards</h3></div>
    <ul class="std-list">${standards.map((s) => `<li><span class="std-name">${esc(s.name)}</span><span class="std-ratio">${s.ratio}× <small>BW</small></span><span class="std-tier tier-${s.tier.toLowerCase()}">${s.tier}</span></li>`).join("")}</ul>
    <div class="chart-cap">Estimated 1RM ÷ bodyweight (${bw}${u})</div>
  </section>` : ""}

  <section class="panel">
    <div class="panel-h"><h3>⬡ Record Board</h3></div>
    <ul class="pr-list">
      ${prRows.map((p) => `<li><span class="pr-name">${esc(p.name)}</span><span class="pr-val">${fmt(p.e1rm)} ${u}</span><small>${esc(p.date)}</small></li>`).join("")}
    </ul>
  </section>`;
}

function achCard(a) {
  const prog = !a.unlocked && a.progress;
  return `<div class="ach-card ${a.unlocked ? "got" : "locked"}" title="${esc(a.desc)}">
    <div class="ach-ic">${a.icon}</div>
    <div class="ach-name">${esc(a.name)}</div>
    ${a.unlocked ? `<div class="ach-desc">${esc(a.desc)}</div>`
      : prog ? `<div class="ach-prog"><i style="width:${a.progress.pct}%"></i></div><div class="ach-desc">${fmt(a.progress.cur)}/${fmt(a.progress.goal)}</div>`
      : `<div class="ach-desc">${esc(a.desc)}</div>`}
  </div>`;
}

function drawStatsCharts(selName) {
  const done = completedSessions();

  // training calendar
  const dayMap = {};
  done.forEach((s) => { dayMap[s.date] = (dayMap[s.date] || 0) + store.sessionVolume(s); });
  const cc = $("#chartCal");
  if (cc) calendarHeatmap(cc, dayMap, { weeks: 18 });

  const hist = store.exerciseHistory(state.sessions, selName).map((h) => ({
    x: h.date, y: round(h.e1rm, 1), label: h.topSet ? `${h.topSet.weight}${state.settings.unit}×${h.topSet.reps}` : ""
  }));
  const e1 = $("#chartE1RM");
  if (e1) lineChart(e1, hist, { yUnit: " " + state.settings.unit, title: selName + " estimated 1RM" });

  const vol = done.slice(-20).map((s) => ({ x: s.date, y: round(store.sessionVolume(s)), label: s.dayName }));
  const cv = $("#chartVol");
  if (cv) lineChart(cv, vol, { yUnit: "", title: "Volume per session", highlightMax: false });

  const bwSeries = done.filter((s) => Number(s.bodyweight) > 0).map((s) => ({ x: s.date, y: Number(s.bodyweight) }));
  const cbw = $("#chartBW");
  if (cbw) lineChart(cbw, bwSeries, { yUnit: " " + state.settings.unit, title: "Bodyweight", highlightMax: false });

  const byMuscle = {};
  done.forEach((s) => (s.entries || []).forEach((e) => {
    let v = 0; (e.sets || []).forEach((x) => (v += store.setVolume(x)));
    const m = e.muscle || "Other"; byMuscle[m] = (byMuscle[m] || 0) + v;
  }));
  const bars = Object.entries(byMuscle).map(([label, value]) => ({ label, value: round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);
  const cm = $("#chartMuscle");
  if (cm) barChart(cm, bars, { unit: "", title: "Volume by muscle" });
}

/* -------------------------------- DATA ----------------------------------- */
function renderData() {
  const u = state.settings.unit;
  return `
  <section class="panel">
    <div class="panel-h"><h3>Export & Backup</h3></div>
    <p class="muted-p">Your data lives only on this phone. Export regularly as a backup.</p>
    <div class="btn-col">
      <button class="btn btn-primary block" data-action="xlsx">⬇ Export Excel (.xlsx)</button>
      <button class="btn btn-ghost block" data-action="csv">⬇ Export CSV</button>
      <button class="btn btn-ghost block" data-action="json">⬇ Backup (JSON)</button>
      <label class="btn btn-ghost block file-btn">↥ Restore from backup
        <input type="file" id="importFile" accept="application/json,.json" hidden></label>
    </div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Settings</h3></div>
    <div class="row-between">
      <span>Units</span>
      <div class="seg">
        <button class="seg-btn ${u === "kg" ? "on" : ""}" data-action="unit" data-u="kg">kg</button>
        <button class="seg-btn ${u === "lb" ? "on" : ""}" data-action="unit" data-u="lb">lb</button>
      </div>
    </div>
    <label class="field"><span>Rest timer (seconds)</span>
      <input type="text" inputmode="numeric" id="restSecs" value="${esc(state.settings.restSeconds)}" data-role="rest-secs"></label>
    <label class="field"><span>Hunter name</span>
      <input type="text" id="hName" value="${esc(state.settings.hunterName || "")}" placeholder="HUNTER" data-role="hname"></label>
    <label class="field"><span>Barbell weight (${u}) — for the plate calculator</span>
      <input type="text" inputmode="decimal" id="barW" value="${esc(state.settings.barWeight)}" data-role="barw"></label>
    <div class="row-between">
      <span>Celebration sound</span>
      <div class="seg">
        <button class="seg-btn ${state.settings.sound !== false ? "on" : ""}" data-action="sound" data-v="on">On</button>
        <button class="seg-btn ${state.settings.sound === false ? "on" : ""}" data-action="sound" data-v="off">Off</button>
      </div>
    </div>
    <div class="row-between">
      <span>Animations &amp; effects</span>
      <div class="seg">
        <button class="seg-btn ${!state.settings.reduceMotion ? "on" : ""}" data-action="toggle-fx" data-v="off">Full</button>
        <button class="seg-btn ${state.settings.reduceMotion ? "on" : ""}" data-action="toggle-fx" data-v="on">Reduced</button>
      </div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-h"><h3>Program</h3><button class="btn btn-ghost btn-sm" data-action="reset-program">Reset to default</button></div>
    <p class="muted-p">Edit exercises, sets, reps and alternates. Changes apply to future sessions.</p>
    <div class="prog-edit">
      ${state.program.days.map((d, di) => `
        <details class="prog-day">
          <summary><span class="quest-tag tag-${(d.tag || "").toLowerCase()}">${esc(d.tag)}</span> ${esc(d.name)} <small>${d.exercises.length} ex</small></summary>
          ${d.exercises.map((ex, xi) => progExerciseEditor(di, xi, ex)).join("")}
          <button class="btn btn-ghost btn-sm" data-action="add-ex" data-day="${di}">+ add exercise</button>
        </details>`).join("")}
    </div>
  </section>

  <section class="panel danger">
    <div class="panel-h"><h3>Danger Zone</h3></div>
    <div id="storageInfo" class="muted-p">Checking storage…</div>
    <button class="btn btn-danger block" data-action="wipe">Erase all workout data</button>
  </section>

  <div class="credit">THE SYSTEM · v2 · all data stored locally on-device</div>`;
}

function progExerciseEditor(di, xi, ex) {
  return `
  <div class="prog-ex" data-day="${di}" data-ex="${xi}">
    <input class="pe-name" data-role="pe" data-f="name" value="${esc(ex.name)}" placeholder="Exercise name">
    <div class="pe-grid">
      <label>Sets<input data-role="pe" data-f="sets" inputmode="numeric" value="${esc(ex.sets)}"></label>
      <label>Reps<input data-role="pe" data-f="reps" value="${esc(ex.reps)}"></label>
      <label>Muscle<input data-role="pe" data-f="muscle" value="${esc(ex.muscle || "")}"></label>
    </div>
    <label class="pe-full">Cue<input data-role="pe" data-f="note" value="${esc(ex.note || "")}"></label>
    <label class="pe-full">Alternates (comma-separated)<input data-role="pe" data-f="alts" value="${esc((ex.alts || []).join(", "))}"></label>
    <button class="btn btn-ghost btn-sm" data-action="del-ex" data-day="${di}" data-ex="${xi}">remove exercise</button>
  </div>`;
}

/* ============================ VIEW BINDINGS ============================= */
function bindView() {
  const view = $("#view");

  // Delegated clicks
  view.onclick = (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const a = b.dataset.action;
    const actions = {
      "go-home": () => navigate("home"),
      "go-stats": () => navigate("stats"),
      start: () => startSession(b.dataset.day),
      resume: () => resumeSession(b.dataset.id),
      "open-session": () => openSession(b.dataset.id),
      "pick-day": pickDay,
      step: () => stepField(+b.dataset.ex, +b.dataset.set, b.dataset.field, +b.dataset.delta),
      "toggle-done": () => toggleDone(+b.dataset.ex, +b.dataset.set, b),
      learn: () => toggleLearn(+b.dataset.ex),
      plates: () => openPlates(+b.dataset.ex),
      warmup: () => openWarmup(+b.dataset.ex),
      "add-set": () => addSet(+b.dataset.ex),
      "del-set": () => delSet(+b.dataset.ex),
      swap: () => swapExercise(+b.dataset.ex),
      finish: finishSession,
      discard: discardSession,
      xlsx: () => doExport("xlsx"),
      csv: () => doExport("csv"),
      json: () => doExport("json"),
      unit: () => setUnit(b.dataset.u),
      "reset-program": resetProgram,
      "add-ex": () => addProgExercise(+b.dataset.day),
      "del-ex": () => delProgExercise(+b.dataset.day, +b.dataset.ex),
      "toggle-fx": () => setReduceMotion(b.dataset.v === "on"),
      sound: () => setSoundSetting(b.dataset.v === "on"),
      wipe: wipeData
    };
    if (actions[a]) { e.preventDefault(); actions[a](); }
  };

  // Delegated input (live state updates)
  view.oninput = (e) => {
    const t = e.target;
    if (t.dataset.role === "set") {
      const entry = state.current.entries[+t.dataset.ex];
      entry.sets[+t.dataset.set][t.dataset.field] = t.value;
      persistCurrent();
    } else if (t.dataset.role === "sess-note") { state.current.note = t.value; persistCurrent(); }
    else if (t.dataset.role === "bw") { state.current.bodyweight = t.value; persistCurrent(); }
    else if (t.dataset.role === "rest-secs") { state.settings.restSeconds = Math.max(15, +t.value || 120); saveSettings(); }
    else if (t.dataset.role === "hname") { state.settings.hunterName = t.value; saveSettings(); }
    else if (t.dataset.role === "barw") { state.settings.barWeight = Math.max(0, parseFloat(t.value) || 0); saveSettings(); }
    else if (t.dataset.role === "pe") { editProgram(t); }
  };

  if (state.view === "stats") {
    const sel = $("#exSelect");
    if (sel) {
      sel.onchange = () => { state.settings.lastStatsExercise = sel.value; saveSettings(); drawStatsCharts(sel.value); };
      drawStatsCharts(sel.value);
    }
  }
  if (state.view === "data") {
    const f = $("#importFile");
    if (f) f.onchange = () => importBackup(f.files[0]);
    showStorageInfo();
  }

  if (state.animateNext) { animateIn(); state.animateNext = false; }
}

/* Entrance polish — only on view changes, not on in-place re-renders. */
function animateIn() {
  if (fx.reducedMotion()) return;
  $$("#view .xp-bar i[data-pct]").forEach((el) => {
    const p = el.dataset.pct; el.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = p + "%"; }));
  });
  $$("#view > .panel, #view .ex-card").forEach((el, i) => {
    el.style.animationDelay = Math.min(i, 9) * 45 + "ms";
    el.classList.add("rise-in");
  });
}

/* ============================ LOG ACTIONS ============================== */
async function startSession(dayId) {
  state.current = newSessionFromDay(dayId);
  await store.saveSession(state.current);
  navigate("session");
}
async function resumeSession(id) { state.current = await store.getSession(id); navigate("session"); }
async function openSession(id) { state.current = await store.getSession(id); navigate("session"); toast("Editing past session"); }

function pickDay() {
  const items = state.program.days.map((d) => `<button class="pick-item tag-${(d.tag || "").toLowerCase()}" data-action="start" data-day="${d.id}">
    <span class="quest-tag tag-${(d.tag || "").toLowerCase()}">${esc(d.tag)}</span>
    <span><b>${esc(d.name)}</b><small>${esc(d.focus || "")}</small></span></button>`).join("");
  const m = modal(`<div class="modal-h"><h3>Choose a Gate</h3><button class="x" data-action="close-modal">✕</button></div><div class="pick-list">${items}</div>`);
  m.querySelector(".pick-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]"); if (!b) return;
    closeModal(); startSession(b.dataset.day);
  });
}

function stepField(ei, si, field, delta) {
  const set = state.current.entries[ei].sets[si];
  let v = parseFloat(set[field]) || 0;
  v = Math.max(0, round(v + delta, 2));
  set[field] = String(v);
  // update just the input, avoid full re-render (keeps keyboard/scroll)
  const inp = $(`#view input[data-role='set'][data-ex='${ei}'][data-set='${si}'][data-field='${field}']`);
  if (inp) inp.value = set[field];
  persistCurrent();
}

function toggleDone(ei, si, btnEl) {
  const set = state.current.entries[ei].sets[si];
  const turningOn = !set.done;
  set.done = turningOn;
  let cx = null, cy = null;
  if (turningOn && btnEl) { const r = btnEl.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  persistCurrent(true);
  render();
  if (turningOn) {
    const entry = state.current.entries[ei];
    if (cx != null) fx.burst(cx, cy, { count: 18, power: 6, colors: tagColors(state.current.tag) });
    fx.haptic(25);
    startRest(entry ? entry.name : "");
  }
}

function toggleLearn(ei) {
  const entry = state.current.entries[ei];
  if (!entry) return;
  if (state.openLearn.has(entry.exId)) state.openLearn.delete(entry.exId);
  else state.openLearn.add(entry.exId);
  render();
}

function addSet(ei) {
  const sets = state.current.entries[ei].sets;
  const last = sets[sets.length - 1];
  sets.push({ weight: last ? last.weight : "", reps: "", done: false });
  persistCurrent(true); render();
}
function delSet(ei) {
  const sets = state.current.entries[ei].sets;
  if (sets.length > 1) sets.pop();
  persistCurrent(true); render();
}

function swapExercise(ei) {
  const entry = state.current.entries[ei];
  const options = [entry.name, ...(entry.alts || [])];
  // allow a fully custom name too
  const items = options.map((n) => `<button class="pick-item" data-name="${esc(n)}"><span><b>${esc(n)}</b>${n === entry.name ? '<small>current</small>' : "<small>alternate</small>"}</span></button>`).join("");
  const m = modal(`<div class="modal-h"><h3>Swap exercise</h3><button class="x" data-action="close-modal">✕</button></div>
    <div class="pick-list">${items}</div>
    <label class="field"><span>Or type a custom exercise</span><input id="customSwap" placeholder="e.g. Smith Machine Press"></label>
    <button class="btn btn-primary block" id="customSwapBtn">Use custom</button>`);
  m.querySelector(".pick-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-name]"); if (!b) return;
    applySwap(ei, b.dataset.name);
  });
  m.querySelector("#customSwapBtn").addEventListener("click", () => {
    const v = m.querySelector("#customSwap").value.trim();
    if (v) applySwap(ei, v);
  });
}
function applySwap(ei, name) {
  const entry = state.current.entries[ei];
  if (name !== entry.name) {
    // moving to a new exercise: pull its last performance for placeholders
    entry.name = name;
    const last = lastPerformance(name);
    entry.sets.forEach((s) => { if (!s.done && !s.reps) s.weight = last ? String(last.weight ?? "") : ""; });
  }
  closeModal(); persistCurrent(true); render();
}

function startRest(exName) {
  const secs = Math.max(5, +state.settings.restSeconds || 120);
  let remaining = secs;
  clearInterval(restTimer); clearInterval(restTipTimer);
  let bar = $("#restbar");
  if (!bar) { bar = document.createElement("div"); bar.id = "restbar"; document.body.appendChild(bar); }

  // Rotating tips during rest: an effort reward, a neuro insight, and the
  // current lift's mind-muscle focus cue.
  const tips = [{ k: "EFFORT", t: K.pickEncourage() }];
  const n = K.pickNeuro(); tips.push({ k: n.tag.toUpperCase(), t: n.text });
  const info = exName ? K.getInfo(exName) : null;
  if (info) tips.push({ k: "FOCUS", t: info.focus });
  let ti = 0;

  bar.className = "show";
  bar.innerHTML = `
    <div class="rest-row">
      <button class="rest-btn" data-r="-15">−15</button>
      <div class="rest-mid"><b class="rest-secs">${remaining}s</b><span>REST</span></div>
      <button class="rest-btn" data-r="skip">done</button>
    </div>
    <div class="rest-tip"></div>`;
  const tipEl = bar.querySelector(".rest-tip");
  const secsEl = bar.querySelector(".rest-secs");
  const paintTip = () => { const tp = tips[ti % tips.length]; tipEl.innerHTML = `<b>${esc(tp.k)}</b> ${esc(tp.t)}`; };
  paintTip();
  restTipTimer = setInterval(() => { ti++; paintTip(); }, 5000);

  bar.onclick = (e) => {
    const r = e.target.closest("[data-r]"); if (!r) return;
    if (r.dataset.r === "skip") remaining = 0;
    else remaining = Math.max(0, remaining + parseInt(r.dataset.r, 10));
    if (remaining <= 0) endRest(); else secsEl.textContent = remaining + "s";
  };
  restTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) { endRest(); fx.haptic([120, 50, 120]); }
    else if (secsEl) secsEl.textContent = remaining + "s";
  }, 1000);
}
function endRest() { clearInterval(restTimer); clearInterval(restTipTimer); const bar = $("#restbar"); if (bar) bar.className = ""; }

async function finishSession() {
  const cur = state.current;
  const logged = (cur.entries || []).some((e) => (e.sets || []).some((x) => Number(x.reps) > 0));
  if (!logged) { toast("Log at least one set first", "warn"); return; }

  const all = await store.getAllSessions();
  const others = all.filter((s) => s.id !== cur.id);
  const before = store.computeStats(others);

  cur.completedAt = cur.completedAt || Date.now();
  await store.saveSession(cur);

  const after = store.computeStats(others.concat(cur));

  // PRs earned this session
  const prs = [];
  const seenNames = new Set();
  for (const entry of cur.entries) {
    if (seenNames.has(entry.name)) continue;
    const est = store.sessionBestE1RM(cur, entry.name);
    if (est <= 0) continue;
    const prev = before.bestByExercise[entry.name]?.e1rm || 0;
    if (est > prev + 0.01) { prs.push({ name: entry.name, e1rm: est }); seenNames.add(entry.name); }
  }

  // newly unlocked titles
  const nowIds = ach.unlockedIds(others.concat(cur), after);
  const seenAch = new Set(state.settings.achievementsSeen || []);
  const newAch = ach.ACHIEVEMENTS.filter((a) => nowIds.includes(a.id) && !seenAch.has(a.id));
  state.settings.achievementsSeen = nowIds;
  await saveSettings();

  endRest();
  await refreshSessions();
  state.current = null;

  const leveled = after.level > before.level;
  const xpGain = after.totalXP - before.totalXP;
  showQuestComplete({ xpGain, prs, leveled, level: after.level, rank: after.rank, before, session: cur, newAch });
}

function showQuestComplete({ xpGain, prs, leveled, level, rank, before, session, newAch }) {
  // muscle recap for the "wired in today" section
  const byMuscle = {};
  let setCount = 0;
  (session.entries || []).forEach((e) => {
    let v = 0, did = false;
    (e.sets || []).forEach((x) => { if (Number(x.reps) > 0) { v += store.setVolume(x); setCount++; did = true; } });
    if (did) { const m = e.muscle || "Other"; byMuscle[m] = (byMuscle[m] || 0) + v; }
  });
  const muscles = Object.keys(byMuscle).sort((a, b) => byMuscle[b] - byMuscle[a]).slice(0, 6);
  const vol = store.sessionVolume(session);
  const neuro = K.pickNeuro();
  const achHtml = (newAch && newAch.length) ? `<div class="qc-ach"><div class="qc-section">⬡ TITLE${newAch.length > 1 ? "S" : ""} UNLOCKED</div>${newAch.map((a) => `<div class="qc-achrow"><span class="qc-achic">${a.icon}</span><div class="qc-achtxt"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></div>`).join("")}</div>` : "";

  const prHtml = prs.length
    ? `<div class="qc-prs"><div class="qc-section">⬡ NEW RECORDS</div>${prs.map((p, i) => `<div class="qc-pr" style="animation-delay:${i * 90}ms"><span>${esc(p.name)}</span><b>${fmt(p.e1rm)} ${esc(state.settings.unit)}</b></div>`).join("")}</div>`
    : "";
  const lvlHtml = leveled
    ? `<div class="qc-levelup"><div class="qc-arise">⟡ LEVEL UP ⟡</div><div class="qc-lvl">Lv ${before.level} → <b>${level}</b></div><div class="qc-rank ${rank.cls}">${esc(rank.title)}</div></div>`
    : "";

  modal(`
    <div class="qc">
      <div class="qc-banner">QUEST COMPLETE</div>
      ${lvlHtml}
      <div class="qc-xp">+<span id="qcXp">0</span> <span class="qc-xp-u">XP</span></div>
      <div class="qc-stats"><span>${setCount} set${setCount === 1 ? "" : "s"}</span><span>${fmt(vol)} volume</span></div>
      ${prHtml}
      ${muscles.length ? `<div class="qc-recap"><div class="qc-section">◆ WIRED IN TODAY</div><div class="qc-muscles">${muscles.map((m) => `<span>${esc(m)}</span>`).join("")}</div></div>` : ""}
      ${achHtml}
      <div class="qc-neuro"><b>${esc(neuro.tag)}</b> ${esc(neuro.text)}</div>
      <div class="qc-reflect">
        <div class="qc-section">HOW DID IT FEEL?</div>
        <div class="qc-mood">
          ${[["🔥", "Pumped"], ["💪", "Strong"], ["😮‍💨", "Tough"], ["😐", "Flat"]].map(([e, k]) => `<button class="mood-btn ${session.mood === k ? "on" : ""}" data-mood="${k}">${e}<small>${k}</small></button>`).join("")}
        </div>
      </div>
      <button class="btn btn-primary block btn-lg" id="qcDone">Return to System</button>
    </div>`);

  fx.countUp($("#qcXp"), xpGain, { dur: 1100 });
  if (leveled) { fx.flash("rgba(168,85,247,.42)"); fx.celebrate({ count: 90 }); fx.haptic([120, 60, 120, 60, 180]); fx.chime("levelup"); }
  else { fx.celebrate({ count: 42, colors: tagColors(session.tag) }); fx.haptic(60); if (prs.length || (newAch && newAch.length)) fx.chime("pr"); }

  const m = $("#modal");
  m.querySelectorAll(".mood-btn").forEach((btn) => btn.addEventListener("click", async () => {
    m.querySelectorAll(".mood-btn").forEach((x) => x.classList.remove("on"));
    btn.classList.add("on");
    session.mood = btn.dataset.mood;
    await store.saveSession(session);
    await refreshSessions();
    fx.haptic(20);
  }));
  $("#qcDone").addEventListener("click", () => { closeModal(); navigate("home"); });
}

async function discardSession() {
  if (!confirm("Discard this session? Logged sets will be lost.")) return;
  if (state.current) await store.deleteSession(state.current.id);
  state.current = null;
  await refreshSessions();
  navigate("home");
}

/* ============================ DATA ACTIONS ============================= */
async function doExport(kind) {
  try {
    toast("Preparing " + kind.toUpperCase() + "…");
    const sessions = await store.getAllSessions();
    let res;
    if (kind === "xlsx") res = await exportXLSX(sessions, state.settings.unit);
    else if (kind === "csv") res = await exportCSV(sessions, state.settings.unit);
    else res = await exportJSON(sessions, state.program, state.settings);
    if (res === "cancelled") return;
    toast(res === "shared" ? "Shared ✓" : "Downloaded ✓", "ok");
  } catch (e) {
    toast("Export failed: " + e.message, "warn");
  }
}

async function importBackup(file) {
  if (!file) return;
  try {
    const data = await readJSONFile(file);
    if (!confirm(`Restore ${data.sessions.length} sessions? This REPLACES current data.`)) return;
    await store.replaceAllSessions(data.sessions);
    if (data.program) await store.saveProgram(data.program);
    if (data.settings) { state.settings = Object.assign(state.settings, data.settings); await saveSettings(); }
    state.program = await store.getProgram();
    await refreshSessions();
    toast("Restored ✓", "ok");
    navigate("home");
  } catch (e) { toast("Import failed: " + e.message, "warn"); }
}

async function setUnit(u) {
  if (u === state.settings.unit) return;
  state.settings.unit = u;
  state.settings.barWeight = u === "lb" ? 45 : 20;
  await saveSettings();
  toast("Units set to " + u + " (existing numbers keep their value)");
  render();
}

async function saveSettings() { await store.setSetting("settings", state.settings); }

async function setReduceMotion(on) {
  state.settings.reduceMotion = !!on;
  document.body.classList.toggle("reduce-motion", !!on);
  await saveSettings();
  toast(on ? "Reduced motion on" : "Full effects on", "ok");
  render();
}

async function setSoundSetting(on) {
  state.settings.sound = !!on;
  fx.setSound(!!on);
  await saveSettings();
  if (on) fx.chime("ding");
  render();
}

/* --------------------------- onboarding (first run) ---------------------- */
function showOnboarding() {
  const m = modal(`
    <div class="onb">
      <div class="qc-banner">⟡ AWAKENING ⟡</div>
      <p class="onb-lead">Welcome, Hunter. The System tracks every rep, teaches you the lifts, and levels you up as you train. Everything stays on this device — no account, no cloud.</p>
      <label class="field"><span>Your hunter name</span><input id="onbName" placeholder="HUNTER" value="${esc(state.settings.hunterName || "")}"></label>
      <div class="row-between"><span>Units</span><div class="seg">
        <button class="seg-btn on" id="onbKg">kg</button><button class="seg-btn" id="onbLb">lb</button></div></div>
      <label class="field"><span>Bodyweight (optional)</span><input id="onbBW" inputmode="decimal" placeholder="e.g. 78"></label>
      <button class="btn btn-primary btn-lg block" id="onbGo">Enter the System</button>
    </div>`);
  let unit = "kg";
  const kg = m.querySelector("#onbKg"), lb = m.querySelector("#onbLb");
  kg.onclick = () => { unit = "kg"; kg.classList.add("on"); lb.classList.remove("on"); };
  lb.onclick = () => { unit = "lb"; lb.classList.add("on"); kg.classList.remove("on"); };
  m.querySelector("#onbGo").onclick = async () => {
    state.settings.hunterName = m.querySelector("#onbName").value.trim();
    state.settings.unit = unit;
    state.settings.barWeight = unit === "lb" ? 45 : 20;
    const bw = m.querySelector("#onbBW").value.trim();
    state._pendingBW = bw ? parseFloat(bw) : null;
    state.settings.onboarded = true;
    await saveSettings();
    closeModal();
    fx.chime("levelup");
    render();
  };
}

/* ---------------------- plate & warm-up calculators ---------------------- */
function barFor(unit) { return Number(state.settings.barWeight) || (unit === "lb" ? 45 : 20); }

function openPlates(ei) {
  const entry = state.current.entries[ei];
  const unit = state.settings.unit;
  const bar = barFor(unit);
  const plates = unit === "lb" ? coach.PLATES_LB : coach.PLATES_KG;
  const firstW = (entry.sets.find((s) => Number(s.weight) > 0) || entry.sets[0] || {}).weight || "";
  const m = modal(`<div class="modal-h"><h3>⚖ Plate Calculator</h3><button class="x" data-action="close-modal">✕</button></div>
    <label class="field"><span>Target weight (${esc(unit)}) · bar ${bar}${esc(unit)}</span>
      <input id="plW" inputmode="decimal" value="${esc(firstW)}" placeholder="e.g. 100"></label>
    <div id="plOut" class="plate-out"></div>`);
  const out = m.querySelector("#plOut");
  const inp = m.querySelector("#plW");
  const paint = () => { out.innerHTML = platesHTML(coach.platesPerSide(parseFloat(inp.value) || 0, bar, plates), unit, bar); };
  inp.addEventListener("input", paint);
  paint();
}

function platesHTML(res, unit, bar) {
  if (res.under) return `<div class="plate-note">That's below the empty bar (${bar}${esc(unit)}).</div>`;
  if (!res.items.length) return `<div class="plate-note">Just the empty bar — ${bar}${esc(unit)}.</div>`;
  const chips = res.items.map((it) => `<span class="plate-chip"><b>${it.count}</b> × ${it.plate}</span>`).join("");
  return `<div class="plate-side">Load per side:</div><div class="plate-chips">${chips}</div>${res.ok ? "" : `<div class="plate-note">+${res.leftover}${esc(unit)} can't be matched with standard plates.</div>`}`;
}

function openWarmup(ei) {
  const entry = state.current.entries[ei];
  const unit = state.settings.unit;
  const bar = barFor(unit);
  const work = Number((entry.sets.find((s) => Number(s.weight) > 0) || entry.sets[0] || {}).weight || 0);
  const sets = coach.warmupSets(work, bar, unit);
  const body = work <= 0 ? `<div class="plate-note">Enter your working weight first, then tap Warm-up.</div>`
    : sets.length ? `<div class="warm-list">${sets.map((s, i) => `<div class="warm-row"><span>Warm-up ${i + 1}</span><b>${s.weight}${esc(unit)} × ${s.reps}</b><small>${s.pct}%</small></div>`).join("")}</div><div class="plate-note">Then your working sets at <b>${work}${esc(unit)}</b>. Keep warm-ups easy — they prime the nervous system, not fatigue it.</div>`
    : `<div class="plate-note">Light enough to start without a ramp — a set or two at the working weight is plenty.</div>`;
  modal(`<div class="modal-h"><h3>🔥 Warm-up · ${esc(entry.name)}</h3><button class="x" data-action="close-modal">✕</button></div>${body}`);
}

async function resetProgram() {
  if (!confirm("Reset program to the default PPL? Your logged history is kept.")) return;
  await store.resetProgram();
  state.program = await store.getProgram();
  toast("Program reset", "ok");
  render();
}

function editProgram(input) {
  const wrap = input.closest(".prog-ex");
  const di = +wrap.dataset.day, xi = +wrap.dataset.ex;
  const ex = state.program.days[di].exercises[xi];
  const f = input.dataset.f;
  if (f === "sets") ex.sets = Math.max(1, parseInt(input.value, 10) || 1);
  else if (f === "alts") ex.alts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
  else ex[f] = input.value;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveProgram(state.program), 500);
}

function addProgExercise(di) {
  state.program.days[di].exercises.push({ id: "x" + Date.now().toString(36), name: "New Exercise", muscle: "", sets: 3, reps: "8-12", note: "", alts: [] });
  store.saveProgram(state.program); render();
  // reopen that day
  const det = $$("#view .prog-day")[di]; if (det) det.open = true;
}
function delProgExercise(di, xi) {
  if (!confirm("Remove this exercise from the program?")) return;
  state.program.days[di].exercises.splice(xi, 1);
  store.saveProgram(state.program); render();
  const det = $$("#view .prog-day")[di]; if (det) det.open = true;
}

async function wipeData() {
  if (!confirm("Erase ALL workout data from this device? This cannot be undone.")) return;
  if (!confirm("Really erase everything? Export a backup first if unsure.")) return;
  await store.replaceAllSessions([]);
  state.current = null;
  await refreshSessions();
  toast("All data erased", "warn");
  navigate("home");
}

async function showStorageInfo() {
  const el = $("#storageInfo"); if (!el) return;
  const persisted = (navigator.storage && navigator.storage.persisted) ? await navigator.storage.persisted() : false;
  const est = await store.storageEstimate();
  const used = est && est.usage != null ? (est.usage / 1024 / 1024).toFixed(2) + " MB" : "?";
  el.innerHTML = `Storage: <b>${persisted ? "persistent ✓" : "best-effort"}</b> · ${used} used · ${completedSessions().length} sessions.<br>Tip: export a backup now and then — iOS can clear site data if unused for a long time.`;
}

/* ------------------------------ service worker --------------------------- */
function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}

/* -------------------------------- launch --------------------------------- */
init();
