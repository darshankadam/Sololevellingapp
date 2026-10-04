/* =========================================================================
 * exporter.js  —  Excel (.xlsx), CSV and JSON export + JSON import.
 *
 * Uses the vendored SheetJS build (window.XLSX, loaded in index.html) so it
 * works fully offline. On iOS it tries the native share-sheet first (so you
 * can "Save to Files" or AirDrop), then falls back to a normal download.
 * ========================================================================= */

import { e1rm, setVolume, sessionVolume, computeStats } from "./store.js";

function stamp() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function deliver(blob, filename) {
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
    // otherwise fall through to download
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

/* ----------------------- Build flat "long format" rows -------------------- */
function logRows(sessions, unit) {
  const rows = [];
  for (const s of sessions) {
    (s.entries || []).forEach((entry, ei) => {
      (entry.sets || []).forEach((set, si) => {
        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        if (reps === 0 && !set.done) return; // skip untouched / unperformed sets
        rows.push({
          Date: s.date,
          Day: s.dayName || s.dayId || "",
          Exercise: entry.name,
          Muscle: entry.muscle || "",
          SetNo: si + 1,
          Reps: reps,
          [`Weight_${unit}`]: weight,
          Volume: Math.round(setVolume(set)),
          Est1RM: Math.round(e1rm(weight, reps) * 10) / 10,
          Done: set.done ? "Y" : "",
          Note: entry.note || ""
        });
      });
    });
  }
  return rows;
}

/* ------------------------------- XLSX ------------------------------------- */
export async function exportXLSX(sessions, unit = "kg") {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error("Spreadsheet engine not loaded");
  const completed = sessions.filter((s) => s.completedAt || (s.entries && s.entries.length));
  const wb = XLSX.utils.book_new();

  // Sheet 1 — every set (the explorable, pivot-friendly sheet)
  const log = logRows(completed, unit);
  const wsLog = XLSX.utils.json_to_sheet(
    log.length ? log : [{ Date: "", Day: "", Exercise: "", Muscle: "", SetNo: "", Reps: "", [`Weight_${unit}`]: "", Volume: "", Est1RM: "", Done: "", Note: "" }]
  );
  wsLog["!cols"] = [{ wch: 11 }, { wch: 9 }, { wch: 26 }, { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 9 }, { wch: 8 }, { wch: 6 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsLog, "Workout Log");

  // Sheet 2 — session summary
  const sessRows = completed.map((s) => {
    let sets = 0;
    (s.entries || []).forEach((e) => (e.sets || []).forEach((x) => { if ((Number(x.reps) || 0) > 0) sets++; }));
    const dur = s.completedAt && s.startedAt ? Math.round((s.completedAt - s.startedAt) / 60000) : "";
    return {
      Date: s.date,
      Day: s.dayName || s.dayId,
      WorkingSets: sets,
      TotalVolume: Math.round(sessionVolume(s)),
      Duration_min: dur,
      Bodyweight: s.bodyweight || "",
      Note: s.note || ""
    };
  });
  const wsSess = XLSX.utils.json_to_sheet(sessRows.length ? sessRows : [{ Date: "", Day: "", WorkingSets: "", TotalVolume: "", Duration_min: "", Bodyweight: "", Note: "" }]);
  wsSess["!cols"] = [{ wch: 11 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSess, "Sessions");

  // Sheet 3 — PR board (best estimated 1RM per exercise)
  const stats = computeStats(completed);
  const prRows = Object.entries(stats.bestByExercise)
    .map(([name, v]) => ({ Exercise: name, Best_Est1RM: Math.round(v.e1rm * 10) / 10, Achieved: v.date }))
    .sort((a, b) => b.Best_Est1RM - a.Best_Est1RM);
  const wsPR = XLSX.utils.json_to_sheet(prRows.length ? prRows : [{ Exercise: "", Best_Est1RM: "", Achieved: "" }]);
  wsPR["!cols"] = [{ wch: 26 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsPR, "PRs");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return deliver(blob, `solo-leveling-gym_${stamp()}.xlsx`);
}

/* -------------------------------- CSV ------------------------------------- */
export async function exportCSV(sessions, unit = "kg") {
  const rows = logRows(sessions.filter((s) => s.completedAt || (s.entries && s.entries.length)), unit);
  const headers = rows.length ? Object.keys(rows[0]) : ["Date", "Day", "Exercise", "Muscle", "SetNo", "Reps", `Weight_${unit}`, "Volume", "Est1RM", "Done", "Note"];
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  return deliver(blob, `solo-leveling-gym_${stamp()}.csv`);
}

/* ------------------------------- JSON ------------------------------------- */
export async function exportJSON(sessions, program, settings) {
  const payload = {
    app: "solo-leveling-gym",
    schema: 1,
    exportedAt: new Date().toISOString(),
    settings: settings || {},
    program: program || null,
    sessions: sessions || []
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return deliver(blob, `solo-leveling-gym_backup_${stamp()}.json`);
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        if (!data || data.app !== "solo-leveling-gym" || !Array.isArray(data.sessions)) {
          throw new Error("Not a Solo Leveling Gym backup file.");
        }
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file);
  });
}
