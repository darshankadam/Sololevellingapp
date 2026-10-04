# THE SYSTEM — Solo Leveling Gym Tracker

A local, offline workout tracker for the **Push / Pull / Legs ×2** split
(Push 1 · Pull 1 · Legs 1 · rest · Push 2 · Pull 2 · Legs 2), styled like the
Solo Leveling "System" window. Log reps and weights, watch your Hunter rank
climb, see progression charts, and export everything to Excel.

- **No login, no account, no server.** All data lives in your phone's browser
  storage (IndexedDB) and never leaves the device.
- **Installs to your Home Screen** as a fullscreen app (PWA).
- **Works offline** after the first load.
- **Exports to Excel / CSV / JSON** any time.
- **Fully editable** program — change exercises, sets, reps and alternates in
  the app or in `js/program.js`.

**Coaching built in**
- **Progressive-overload suggestions** per lift (double progression: add weight
  when you clear the top of the rep range, else beat your reps).
- **Learn panel** on every exercise — muscles worked, form cues, the common
  mistake, a mind-muscle focus cue, and why it matters.
- **Plate calculator** and **warm-up ramp** generator, and **strength
  standards** (your estimated 1RM as a bodyweight multiple).

**Motivation & progress**
- **Hunter levels & ranks** (E → MONARCH), XP, streaks, and **21 unlockable
  Titles**.
- **Neuroplasticity insights** surfaced on Home, during rest, and after a
  workout — accurate, science-based, not fluff.
- **Analytics:** estimated-1RM progression, volume per session, volume by
  muscle, bodyweight trend, and a **training-calendar heatmap**.
- **Cinematic "Quest Complete"** with level-ups, new records, muscle recap,
  title unlocks, a mood reflection, animations and optional sound — all with a
  **Reduced-motion / Sound** toggle in Settings.

---

## 1. Put it on your iPhone (one-time setup)

The app is hosted free on **GitHub Pages** from this repo.

### a) Turn on GitHub Pages
1. Open this repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **`master`**, folder: **`/ (root)`** → **Save**.
4. Wait ~1 minute. The page will show your live URL:
   **https://darshankadam.github.io/Sololevellingapp/**

> Pages needs the repo to be **public** on the free plan. That's fine here —
> the repo only contains app code. Your workout data is never in the repo; it
> stays on your phone.

### b) Add to Home Screen (iPhone 13, Safari)
1. Open **https://darshankadam.github.io/Sololevellingapp/** in **Safari**.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch it from the new **THE SYSTEM** icon. It opens fullscreen, like a
   native app.

---

## 2. Using it

- **System tab** — your Hunter status (rank, level, XP, streak) and *Today's
  Quest* (the next workout in the rotation). Tap **Enter the Gate** to start,
  or **Change** to pick any day.
- **Log** — tap in weight and reps per set (steppers or type), hit **✓** to
  mark a set done (starts the rest timer). **⇄ Swap** switches an exercise to
  an alternate (or a custom one). Everything **autosaves**. Tap **Complete
  Quest** to finish — you'll see XP gained and any new records.
- **Stats** — estimated-1RM progression per exercise, volume per session,
  volume by muscle, and your record board.
- **Data** — export to Excel/CSV, back up/restore JSON, switch kg/lb, edit the
  program, and see storage status.

### XP, levels and ranks
XP comes from sets, volume, completing sessions, and hitting PRs. Ranks:
**E → D → C → B → A → S → MONARCH**.

---

## 3. Back up your data (important)

Your data is on-device only. iOS *can* clear a web app's storage if it goes
unused for a long time, so **export a backup now and then**:

- **Data → Backup (JSON)** gives a full backup you can restore later
  (**Data → Restore from backup**).
- **Data → Export Excel** gives a spreadsheet (`Workout Log`, `Sessions`,
  `PRs` sheets) for your own analysis.

On iPhone, export opens the share sheet → **Save to Files** or send it to
yourself.

---

## 4. Updating the app (via mobile Claude Code)

Ask Claude Code to edit the files in this repo and push to `master`. GitHub
Pages redeploys automatically in under a minute; reopen the app to get the
update (the service worker refreshes the cache).

- To change your **program** (exercises/sets/reps/alternates): edit
  `js/program.js`, or just edit it live in the **Data → Program** screen.
- When you change app files, bump the `CACHE` version string in `sw.js` so
  phones pick up the new version.

---

## 5. Project structure

```
index.html              App shell + PWA meta
manifest.webmanifest    Install metadata (name, icons, standalone)
sw.js                   Service worker (offline cache — bump CACHE on changes)
css/styles.css          Solo Leveling "System" theme + animations
js/program.js           ★ Your PPL program (edit this to change workouts)
js/store.js             IndexedDB + XP/level/rank/PR engine
js/coach.js             Progression, plate calc, warm-up, strength standards
js/achievements.js      Title/achievement definitions + evaluation
js/knowledge.js         Exercise coaching + neuroplasticity insight library
js/charts.js            SVG charts (progression, volume, bodyweight, calendar)
js/fx.js                Particle/sound/animation engine
js/exporter.js          Excel / CSV / JSON export + import
js/app.js               Controller: views, logging, onboarding, wiring
vendor/xlsx.full.min.js SheetJS (bundled, for offline Excel export)
icons/                  App icons
```

All data stays on your device. Train hard, Hunter. ⟡
