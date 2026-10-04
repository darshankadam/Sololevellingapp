/* =========================================================================
 * program.js  —  The default PPL training program (Jeff Nippard-style).
 *
 * THIS IS THE FILE YOU EDIT to change exercises, sets, reps or alternates.
 * It is safe to edit on mobile with Claude Code. Structure:
 *
 *   day = {
 *     id:        stable short id (don't reuse across days)
 *     name:      display name  ("Push 1")
 *     tag:       "PUSH" | "PULL" | "LEGS"  (used for colour accents)
 *     focus:     one-line emphasis shown under the title
 *     exercises: [ exercise, ... ]
 *   }
 *
 *   exercise = {
 *     id:        stable short id, unique within the day
 *     name:      display name (this is the key used for progress tracking —
 *                if you swap to an alternate, that alternate gets its own
 *                progress history, which is correct: a DB press PR != a
 *                barbell press PR)
 *     muscle:    primary muscle (free text, used for grouping in stats)
 *     sets:      prescribed number of working sets
 *     reps:      target rep range string ("5-8")
 *     note:      coaching cue / RPE guidance
 *     alts:      array of alternate exercise names you can swap to
 *   }
 *
 * ROTATION is the order the "Today's Quest" card advances through. "rest"
 * is a recovery day. Edit to taste — e.g. add a second "rest" at the end.
 * ========================================================================= */

export const PROGRAM_VERSION = 1;

export const ROTATION = ["push1", "pull1", "legs1", "rest", "push2", "pull2", "legs2"];

export const DEFAULT_PROGRAM = {
  version: PROGRAM_VERSION,
  rotation: ROTATION,
  days: [
    /* ----------------------------- PUSH 1 ----------------------------- */
    {
      id: "push1",
      name: "Push 1",
      tag: "PUSH",
      focus: "Heavy chest & shoulder strength",
      exercises: [
        { id: "p1a", name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "5-8", note: "Main lift. RPE 8. Add weight when you hit the top of the range.", alts: ["Dumbbell Bench Press", "Machine Chest Press", "Smith Machine Bench"] },
        { id: "p1b", name: "Overhead Press", muscle: "Shoulders", sets: 3, reps: "6-8", note: "Standing barbell. Brace hard, no leg drive.", alts: ["Seated Dumbbell Press", "Machine Shoulder Press", "Push Press"] },
        { id: "p1c", name: "Incline Dumbbell Press", muscle: "Upper Chest", sets: 3, reps: "8-10", note: "30-45° bench. Controlled stretch at the bottom.", alts: ["Incline Barbell Press", "Incline Machine Press"] },
        { id: "p1d", name: "Lateral Raise", muscle: "Side Delts", sets: 3, reps: "12-15", note: "Lead with the elbows, slow negative.", alts: ["Cable Lateral Raise", "Machine Lateral Raise"] },
        { id: "p1e", name: "Triceps Pushdown", muscle: "Triceps", sets: 3, reps: "10-12", note: "Rope or bar. Full lockout.", alts: ["Overhead Cable Extension", "Dips"] },
        { id: "p1f", name: "Overhead Triceps Extension", muscle: "Triceps", sets: 2, reps: "12-15", note: "Deep stretch on the long head.", alts: ["Skullcrusher", "Close-Grip Bench Press"] }
      ]
    },

    /* ----------------------------- PULL 1 ----------------------------- */
    {
      id: "pull1",
      name: "Pull 1",
      tag: "PULL",
      focus: "Heavy back strength & biceps",
      exercises: [
        { id: "l1a", name: "Weighted Pull-Up", muscle: "Lats", sets: 4, reps: "6-10", note: "Add weight when bodyweight gets easy. Full stretch.", alts: ["Lat Pulldown", "Assisted Pull-Up"] },
        { id: "l1b", name: "Barbell Row", muscle: "Mid Back", sets: 4, reps: "6-10", note: "Pendlay or bent-over. Keep the torso angle fixed.", alts: ["Chest-Supported Row", "T-Bar Row", "Dumbbell Row"] },
        { id: "l1c", name: "Seated Cable Row", muscle: "Mid Back", sets: 3, reps: "10-12", note: "Squeeze and hold 1s at the back.", alts: ["Machine Row", "Chest-Supported Row"] },
        { id: "l1d", name: "Face Pull", muscle: "Rear Delts", sets: 3, reps: "15-20", note: "High elbows, pull to the forehead.", alts: ["Reverse Pec Deck", "Rear Delt Dumbbell Fly"] },
        { id: "l1e", name: "Barbell Curl", muscle: "Biceps", sets: 3, reps: "8-12", note: "EZ or straight bar. No swinging.", alts: ["Dumbbell Curl", "Cable Curl"] },
        { id: "l1f", name: "Hammer Curl", muscle: "Biceps / Brachialis", sets: 2, reps: "10-15", note: "Neutral grip for thickness.", alts: ["Rope Hammer Curl", "Incline Dumbbell Curl"] }
      ]
    },

    /* ----------------------------- LEGS 1 ----------------------------- */
    {
      id: "legs1",
      name: "Legs 1",
      tag: "LEGS",
      focus: "Quad-dominant strength",
      exercises: [
        { id: "g1a", name: "Back Squat", muscle: "Quads", sets: 4, reps: "5-8", note: "Main lift. RPE 8. Depth to parallel or below.", alts: ["Front Squat", "Hack Squat", "Smith Machine Squat"] },
        { id: "g1b", name: "Romanian Deadlift", muscle: "Hamstrings", sets: 3, reps: "8-10", note: "Hinge, soft knees, feel the hamstring stretch.", alts: ["Good Morning", "Dumbbell RDL"] },
        { id: "g1c", name: "Leg Press", muscle: "Quads", sets: 3, reps: "10-12", note: "Feet lower for more quad.", alts: ["Hack Squat", "Bulgarian Split Squat"] },
        { id: "g1d", name: "Leg Extension", muscle: "Quads", sets: 3, reps: "12-15", note: "Pause and squeeze at the top.", alts: ["Sissy Squat", "Goblet Squat"] },
        { id: "g1e", name: "Seated Leg Curl", muscle: "Hamstrings", sets: 3, reps: "10-12", note: "Full range, control the negative.", alts: ["Lying Leg Curl", "Nordic Curl"] },
        { id: "g1f", name: "Standing Calf Raise", muscle: "Calves", sets: 4, reps: "10-15", note: "Pause at the bottom stretch.", alts: ["Seated Calf Raise", "Leg Press Calf Raise"] }
      ]
    },

    /* ----------------------------- PUSH 2 ----------------------------- */
    {
      id: "push2",
      name: "Push 2",
      tag: "PUSH",
      focus: "Hypertrophy — incline & volume",
      exercises: [
        { id: "p2a", name: "Incline Barbell Press", muscle: "Upper Chest", sets: 4, reps: "8-10", note: "Main lift today. RPE 8-9.", alts: ["Incline Dumbbell Press", "Incline Smith Press"] },
        { id: "p2b", name: "Flat Dumbbell Press", muscle: "Chest", sets: 3, reps: "10-12", note: "Deep stretch, dumbbells track over the chest.", alts: ["Machine Chest Press", "Flat Barbell Bench"] },
        { id: "p2c", name: "Seated Dumbbell Shoulder Press", muscle: "Shoulders", sets: 3, reps: "10-12", note: "Don't lock out hard — keep tension.", alts: ["Machine Shoulder Press", "Arnold Press"] },
        { id: "p2d", name: "Cable Lateral Raise", muscle: "Side Delts", sets: 4, reps: "12-20", note: "Constant tension, high volume.", alts: ["Dumbbell Lateral Raise", "Machine Lateral Raise"] },
        { id: "p2e", name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12-15", note: "Big squeeze, stretch at the back.", alts: ["Pec Deck", "Dumbbell Fly"] },
        { id: "p2f", name: "Triceps Pushdown", muscle: "Triceps", sets: 3, reps: "12-15", note: "Chase the pump.", alts: ["Overhead Cable Extension", "Skullcrusher"] }
      ]
    },

    /* ----------------------------- PULL 2 ----------------------------- */
    {
      id: "pull2",
      name: "Pull 2",
      tag: "PULL",
      focus: "Hypertrophy — width & rear delts",
      exercises: [
        { id: "l2a", name: "Lat Pulldown", muscle: "Lats", sets: 4, reps: "10-12", note: "Wide grip, drive elbows down.", alts: ["Pull-Up", "Assisted Pull-Up"] },
        { id: "l2b", name: "Chest-Supported Row", muscle: "Mid Back", sets: 4, reps: "10-12", note: "No momentum, strict.", alts: ["Seated Cable Row", "Machine Row"] },
        { id: "l2c", name: "Straight-Arm Pulldown", muscle: "Lats", sets: 3, reps: "12-15", note: "Isolate the lats, slight bend in elbows.", alts: ["Dumbbell Pullover", "Cable Pullover"] },
        { id: "l2d", name: "Reverse Pec Deck", muscle: "Rear Delts", sets: 3, reps: "15-20", note: "Rear delt focus, light and strict.", alts: ["Face Pull", "Reverse Cable Fly"] },
        { id: "l2e", name: "Incline Dumbbell Curl", muscle: "Biceps", sets: 3, reps: "10-12", note: "Stretch-focused, arms behind the body.", alts: ["Preacher Curl", "Cable Curl"] },
        { id: "l2f", name: "Rope Hammer Curl", muscle: "Biceps / Brachialis", sets: 3, reps: "12-15", note: "Neutral grip, controlled.", alts: ["Dumbbell Hammer Curl", "Reverse Curl"] }
      ]
    },

    /* ----------------------------- LEGS 2 ----------------------------- */
    {
      id: "legs2",
      name: "Legs 2",
      tag: "LEGS",
      focus: "Hamstring & glute-dominant",
      exercises: [
        { id: "g2a", name: "Deadlift", muscle: "Posterior Chain", sets: 3, reps: "4-6", note: "Main lift. RPE 8. Reset each rep.", alts: ["Trap Bar Deadlift", "Romanian Deadlift"] },
        { id: "g2b", name: "Hack Squat", muscle: "Quads", sets: 3, reps: "8-10", note: "Deep, controlled. Keep it honest.", alts: ["Front Squat", "Leg Press"] },
        { id: "g2c", name: "Lying Leg Curl", muscle: "Hamstrings", sets: 4, reps: "10-12", note: "Point toes to shift load onto hamstrings.", alts: ["Seated Leg Curl", "Nordic Curl"] },
        { id: "g2d", name: "Bulgarian Split Squat", muscle: "Quads / Glutes", sets: 3, reps: "10-12", note: "Per leg. Lean slightly forward for glutes.", alts: ["Walking Lunge", "Reverse Lunge"] },
        { id: "g2e", name: "Hip Thrust", muscle: "Glutes", sets: 3, reps: "10-12", note: "Full lockout, squeeze 1s at the top.", alts: ["Glute Bridge", "Cable Pull-Through"] },
        { id: "g2f", name: "Seated Calf Raise", muscle: "Calves", sets: 4, reps: "12-20", note: "Soleus focus, slow tempo.", alts: ["Standing Calf Raise", "Leg Press Calf Raise"] }
      ]
    }
  ]
};

/* Convenience lookups ----------------------------------------------------- */
export function getDay(program, dayId) {
  return program.days.find((d) => d.id === dayId) || null;
}

export function dayAfter(program, dayId) {
  const rot = program.rotation || ROTATION;
  const i = rot.indexOf(dayId);
  const next = rot[(i + 1) % rot.length];
  return next;
}

/* Every unique exercise name across the program + its alternates. Used to
 * populate the exercise picker in the Stats screen. */
export function allExerciseNames(program) {
  const set = new Set();
  for (const day of program.days) {
    for (const ex of day.exercises) {
      set.add(ex.name);
      (ex.alts || []).forEach((a) => set.add(a));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
