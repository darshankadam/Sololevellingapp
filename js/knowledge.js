/* =========================================================================
 * knowledge.js — Coaching + motivation content.
 *   - EXERCISE_INFO : per-exercise teaching (muscles, cues, mistake, why, focus)
 *   - NEURO_NOTES   : short, accurate neuroplasticity-based motivation
 *   - ENCOURAGE     : micro-rewards shown when you complete a set
 *   - getInfo()/pickNeuro()/pickEncourage() with sensible fallbacks
 * Content is intentionally plain data so it's easy to edit on mobile.
 * ========================================================================= */

export const EXERCISE_INFO = {
  "Barbell Bench Press": {
    primary: "Chest (pectoralis major)", secondary: "Front delts, triceps",
    cues: ["Pin your shoulder blades back and down, slight arch", "Lower to mid-chest, elbows tucked to ~45°, then press up and slightly back"],
    mistake: "Flaring elbows to 90° and bouncing the bar off the chest.",
    why: "The most overloadable chest press — your anchor for upper-body pushing strength.",
    focus: "Feel the stretch across your chest at the bottom, then squeeze it to drive the bar."
  },
  "Overhead Press": {
    primary: "Shoulders (front/side delts)", secondary: "Triceps, upper chest",
    cues: ["Brace abs and glutes hard, ribs down", "Press the bar in a straight line, moving your head 'through the window' at lockout"],
    mistake: "Leaning back and turning it into an incline press.",
    why: "Builds pressing power and capped, 3D shoulders.",
    focus: "Drive the bar up with your delts; finish with biceps by the ears."
  },
  "Incline Dumbbell Press": {
    primary: "Upper chest", secondary: "Front delts, triceps",
    cues: ["Set the bench 30-45°", "Lower under control for a deep stretch, press without clanking the dumbbells"],
    mistake: "Too steep a bench — it becomes a shoulder press.",
    why: "Targets the upper chest that barbell flat work under-trains.",
    focus: "Think about pushing the dumbbells together with your upper chest."
  },
  "Lateral Raise": {
    primary: "Side delts", secondary: "Traps",
    cues: ["Lead with the elbows, pour-the-jug tilt", "Raise to shoulder height, slow 2-3s negative"],
    mistake: "Swinging with momentum and shrugging the traps.",
    why: "The key move for shoulder width — the illusion of a smaller waist.",
    focus: "Imagine your hands are irrelevant; lift from the side delt."
  },
  "Triceps Pushdown": {
    primary: "Triceps", secondary: "—",
    cues: ["Elbows pinned to your sides", "Full lockout, control the weight back up"],
    mistake: "Elbows drifting forward so the shoulders take over.",
    why: "Safe, high-rep triceps volume for the whole arm.",
    focus: "Keep tension on the triceps the entire rep — no rest at the top."
  },
  "Overhead Triceps Extension": {
    primary: "Triceps (long head)", secondary: "—",
    cues: ["Keep elbows narrow and pointed up", "Get a deep stretch behind your head"],
    mistake: "Letting elbows flare wide and shortening the range.",
    why: "The overhead position loads the long head that pushdowns miss.",
    focus: "Feel the stretch down the back of the arm at the bottom."
  },
  "Weighted Pull-Up": {
    primary: "Lats", secondary: "Biceps, mid-back",
    cues: ["Start from a dead hang, shoulders set", "Drive elbows down to your ribs, chest to the bar"],
    mistake: "Half-reps and kipping with momentum.",
    why: "The gold-standard vertical pull for lat width and relative strength.",
    focus: "Pull with your elbows, not your hands — picture the lats initiating."
  },
  "Barbell Row": {
    primary: "Mid-back (lats, rhomboids)", secondary: "Rear delts, biceps",
    cues: ["Hinge to ~45°, neutral spine, brace", "Pull to the lower ribs, squeeze, control down"],
    mistake: "Using the lower back to heave the weight up.",
    why: "Builds back thickness and bracing strength.",
    focus: "Lead with the elbows and pinch your shoulder blades at the top."
  },
  "Seated Cable Row": {
    primary: "Mid-back", secondary: "Lats, biceps, rear delts",
    cues: ["Tall chest, slight lean, don't round", "Pull to the navel, squeeze 1s"],
    mistake: "Rowing with the whole torso instead of the back.",
    why: "Constant-tension rowing that's easy to progress.",
    focus: "Drive the elbows back and down; feel the mid-back contract."
  },
  "Face Pull": {
    primary: "Rear delts", secondary: "Rotator cuff, traps",
    cues: ["Set the cable at face height", "Pull to your forehead, high elbows, rotate knuckles back"],
    mistake: "Going too heavy and turning it into a row.",
    why: "Builds rear delts and bulletproofs the shoulders for pressing.",
    focus: "Feel the rear delts and the space between the shoulder blades."
  },
  "Barbell Curl": {
    primary: "Biceps", secondary: "Forearms",
    cues: ["Elbows fixed at your sides", "Curl up, hard squeeze, slow negative"],
    mistake: "Swinging the hips to cheat the weight up.",
    why: "The classic overloadable biceps builder.",
    focus: "Keep the tension on the biceps — don't rest at the bottom."
  },
  "Hammer Curl": {
    primary: "Brachialis / biceps", secondary: "Forearms",
    cues: ["Neutral (palms-in) grip", "Curl without swinging, control down"],
    mistake: "Rushing the negative and using momentum.",
    why: "The brachialis pushes the biceps up, adding arm thickness and width.",
    focus: "Feel the outer arm and forearm working."
  },
  "Back Squat": {
    primary: "Quads, glutes", secondary: "Adductors, core, lower back",
    cues: ["Brace 360° before you unrack", "Sit down and slightly back, knees tracking toes, to depth"],
    mistake: "Knees caving in or heels rising.",
    why: "The king of lower-body strength and total-body stimulus.",
    focus: "Drive the floor away through mid-foot; stand up tall and strong."
  },
  "Romanian Deadlift": {
    primary: "Hamstrings, glutes", secondary: "Lower back, grip",
    cues: ["Soft knees, push the hips back", "Lower the bar along your legs until you feel a deep hamstring stretch"],
    mistake: "Rounding the back or squatting it down.",
    why: "Best hamstring/glute builder and posterior-chain insurance.",
    focus: "Feel the hamstrings load and stretch; drive the hips forward to finish."
  },
  "Leg Press": {
    primary: "Quads, glutes", secondary: "Hamstrings",
    cues: ["Feet shoulder-width, full-foot contact", "Lower deep without the lower back rounding off the pad"],
    mistake: "Locking the knees hard or going too shallow.",
    why: "Lets you overload the legs with less spinal fatigue than squats.",
    focus: "Push through the whole foot; feel the quads under deep tension."
  },
  "Leg Extension": {
    primary: "Quads", secondary: "—",
    cues: ["Pause and squeeze at the top", "Control the negative all the way down"],
    mistake: "Using momentum and cutting the range short.",
    why: "Isolates the quads — great for the teardrop and knee resilience.",
    focus: "Squeeze the quads hard at lockout for a full second."
  },
  "Seated Leg Curl": {
    primary: "Hamstrings", secondary: "Calves",
    cues: ["Curl fully, squeeze the hamstrings", "Slow release, keep tension"],
    mistake: "Letting the hips lift off the seat.",
    why: "The seated angle puts hamstrings in a lengthened, high-growth position.",
    focus: "Pull your heels toward your glutes with the hamstrings."
  },
  "Standing Calf Raise": {
    primary: "Calves (gastrocnemius)", secondary: "—",
    cues: ["Full stretch at the bottom", "Rise onto the big toe, pause at the top"],
    mistake: "Bouncing with tiny reps.",
    why: "Stubborn muscle — needs full range and a real stretch to grow.",
    focus: "Pause 1s stretched and 1s contracted on every rep."
  },
  "Incline Barbell Press": {
    primary: "Upper chest", secondary: "Front delts, triceps",
    cues: ["Bench ~30°, shoulder blades set", "Lower to the upper chest, press up and back"],
    mistake: "Too steep, or bar drifting toward the neck.",
    why: "Overloadable upper-chest press for a fuller look.",
    focus: "Push from the clavicular (upper) chest."
  },
  "Flat Dumbbell Press": {
    primary: "Chest", secondary: "Front delts, triceps",
    cues: ["Deep stretch at the bottom", "Press the dumbbells over the chest, not the face"],
    mistake: "Letting elbows flare or dumbbells drift apart.",
    why: "Greater range than the barbell for a bigger chest stretch.",
    focus: "Stretch the chest, then squeeze the dumbbells together."
  },
  "Seated Dumbbell Shoulder Press": {
    primary: "Shoulders", secondary: "Triceps, upper chest",
    cues: ["Brace against the bench, ribs down", "Press up without clanking, stop short of a hard lockout"],
    mistake: "Over-arching the back.",
    why: "Deltoid growth with a natural, joint-friendly path.",
    focus: "Keep continuous tension on the delts."
  },
  "Cable Lateral Raise": {
    primary: "Side delts", secondary: "—",
    cues: ["Cable from the low pulley behind you", "Lead with the elbow, smooth arc to shoulder height"],
    mistake: "Jerking the stack up with the traps.",
    why: "Constant tension through the whole range — superb for width.",
    focus: "Feel the side delt burn with no rest between reps."
  },
  "Cable Fly": {
    primary: "Chest", secondary: "Front delts",
    cues: ["Slight forward lean, soft elbows", "Hug the arms together, big squeeze, control the stretch"],
    mistake: "Pressing instead of flying (bending the elbows too much).",
    why: "Isolates the chest with a strong stretch and peak contraction.",
    focus: "Imagine hugging a tree; squeeze the chest at the midline."
  },
  "Lat Pulldown": {
    primary: "Lats", secondary: "Biceps, mid-back",
    cues: ["Slightly lean back, chest up", "Pull the bar to the upper chest, elbows down and in"],
    mistake: "Pulling behind the neck or using body swing.",
    why: "Builds lat width and grooves the pull-up pattern.",
    focus: "Drive the elbows toward your hips with the lats."
  },
  "Chest-Supported Row": {
    primary: "Mid-back", secondary: "Lats, rear delts, biceps",
    cues: ["Chest on the pad removes cheating", "Row to the ribs, squeeze the shoulder blades"],
    mistake: "Letting the chest leave the pad to heave.",
    why: "Strict back thickness with zero lower-back strain.",
    focus: "Pure back — pull with the elbows and pinch at the top."
  },
  "Straight-Arm Pulldown": {
    primary: "Lats", secondary: "Long-head triceps, core",
    cues: ["Nearly straight arms, slight bend", "Sweep the bar to your thighs, feel the lats"],
    mistake: "Bending the elbows and making it a pushdown.",
    why: "Isolates the lats and teaches the mind-muscle connection.",
    focus: "Pull from the armpits; feel the lats shorten."
  },
  "Reverse Pec Deck": {
    primary: "Rear delts", secondary: "Mid-traps, rhomboids",
    cues: ["Light weight, strict form", "Open the arms wide, squeeze the rear delts"],
    mistake: "Going heavy and recruiting the whole back.",
    why: "Rear delts balance the shoulders and improve posture.",
    focus: "Lead with the pinkies/elbows; feel only the rear delts."
  },
  "Incline Dumbbell Curl": {
    primary: "Biceps (long head)", secondary: "Forearms",
    cues: ["Lie back on an incline, arms hanging", "Curl without swinging, big stretch at the bottom"],
    mistake: "Letting the elbows drift forward.",
    why: "The stretched position hits the long head for the biceps peak.",
    focus: "Keep the upper arms back; feel the stretch, then squeeze."
  },
  "Rope Hammer Curl": {
    primary: "Brachialis / biceps", secondary: "Forearms",
    cues: ["Neutral rope grip, elbows pinned", "Curl and pull the rope apart at the top"],
    mistake: "Using the shoulders to swing.",
    why: "Builds arm thickness with constant cable tension.",
    focus: "Squeeze the outer arm; spread the rope at the top."
  },
  "Deadlift": {
    primary: "Posterior chain (glutes, hams, back)", secondary: "Traps, core, grip",
    cues: ["Bar over mid-foot, brace, chest up", "Push the floor away, keep the bar close, lock hips and knees together"],
    mistake: "Rounding the lower back or yanking the bar.",
    why: "The ultimate full-body strength and resilience builder.",
    focus: "Drive through your heels; think 'leg press the floor,' not 'lift with the back'."
  },
  "Hack Squat": {
    primary: "Quads", secondary: "Glutes",
    cues: ["Shoulders under the pads, brace", "Descend deep and controlled, drive through the whole foot"],
    mistake: "Quarter-reps with huge weight.",
    why: "Loads the quads hard with a stable, back-friendly path.",
    focus: "Keep the tension in the quads the whole way down and up."
  },
  "Lying Leg Curl": {
    primary: "Hamstrings", secondary: "Calves",
    cues: ["Hips pressed into the pad", "Curl fully, point toes to bias the hamstrings, slow negative"],
    mistake: "Hips popping up to help.",
    why: "Trains the knee-flexion role of the hamstrings for balance and size.",
    focus: "Pull the heels to the glutes; squeeze at the top."
  },
  "Bulgarian Split Squat": {
    primary: "Quads, glutes", secondary: "Adductors, core (balance)",
    cues: ["Rear foot elevated, most weight on the front leg", "Drop straight down, torso lean biases glutes"],
    mistake: "Pushing off the back foot or short reps.",
    why: "Single-leg strength that fixes imbalances and builds the glutes.",
    focus: "Drive through the front heel; feel the glute and quad of that leg."
  },
  "Hip Thrust": {
    primary: "Glutes", secondary: "Hamstrings",
    cues: ["Upper back on the bench, chin tucked", "Drive hips up to full lockout, squeeze glutes 1s"],
    mistake: "Over-arching the lower back instead of locking the hips.",
    why: "The most direct, overloadable glute builder.",
    focus: "Finish every rep with a hard glute squeeze at the top."
  },
  "Seated Calf Raise": {
    primary: "Calves (soleus)", secondary: "—",
    cues: ["Knees bent 90° to target the soleus", "Full stretch down, pause up"],
    mistake: "Half reps and no stretch.",
    why: "The soleus drives lower-leg thickness and only grows with bent-knee work.",
    focus: "Slow tempo, full stretch and squeeze each rep."
  }
};

/* Fallback so every exercise shows something useful. */
export function getInfo(name, muscle) {
  if (EXERCISE_INFO[name]) return EXERCISE_INFO[name];
  return {
    primary: muscle || "Target muscle",
    secondary: "Supporting muscles",
    cues: ["Control the weight through a full range of motion", "Keep tension on the target muscle — no bouncing or swinging"],
    mistake: "Using momentum and cutting the range short.",
    why: "Progressively loading this movement drives strength and growth.",
    focus: "Focus your attention on the working muscle — it fires harder when you do."
  };
}

/* ---------------- Neuroplasticity-based motivation (accurate) ------------- */
export const NEURO_NOTES = [
  { tag: "Myelin", text: "Every focused rep lays down myelin — insulation that makes the movement faster and more automatic. Practice literally rewires you." },
  { tag: "Dopamine", text: "Your brain releases dopamine for effort, not just results. Celebrating that you showed up trains you to crave the work." },
  { tag: "Adaptation", text: "Muscles adapt to your hardest set, not the easy ones. The struggle is the signal that tells your body to grow." },
  { tag: "Mental Rehearsal", text: "Imagining a lift fires many of the same neurons as doing it. Visualize the set before you start." },
  { tag: "Focus", text: "Attention amplifies activation — concentrate on the working muscle and it contracts harder. This is the mind-muscle connection, and it's real." },
  { tag: "Recovery", text: "Sleep is when today's training gets wired in. Growth happens in recovery, not only in the gym." },
  { tag: "Consistency", text: "Consistency beats intensity for building habits. Repeated cues carve durable neural pathways — showing up is the skill." },
  { tag: "Growth Mindset", text: "Treating effort as the point keeps your brain in learning mode, where it adapts fastest." },
  { tag: "Neural First", text: "Early strength gains are mostly your nervous system learning to recruit muscle. Your brain gets strong before your body catches up." },
  { tag: "Novelty", text: "Novelty spikes dopamine. Swapping in a fresh variation can re-engage focus when motivation dips." },
  { tag: "Error = Learning", text: "A missed rep isn't failure — error signals are exactly what the brain uses to recalibrate and improve next time." },
  { tag: "Spacing", text: "Spacing your training across the week consolidates skill better than cramming. Your PPL rotation is built for this." },
  { tag: "Tempo", text: "Slowing the lowering phase increases time under tension and sharpens motor control — more signal per rep." },
  { tag: "Breath", text: "A hard brace and controlled breath steady the nervous system, letting you express more strength safely." },
  { tag: "Compounding", text: "Small overloads compound. 2.5kg a week is 130kg a year of added capacity — invisible daily, undeniable over time." },
  { tag: "Identity", text: "Each session votes for the person you're becoming. Repetition turns 'I work out' into 'I'm someone who trains.'" },
  { tag: "Stress + Rest", text: "Adaptation = stress + recovery. Train hard, then let the System rebuild you stronger. Both halves matter." },
  { tag: "Attention", text: "What you rehearse, you reinforce. Rehearse good form and you wire good form." },
  { tag: "Momentum", text: "Starting is the hardest neural step; once moving, dopamine and norepinephrine keep you going. Just begin the first set." },
  { tag: "Progress Signals", text: "Tracking your numbers gives the brain a clear reward signal. Seeing the line go up is fuel — that's why you log every set." },
  { tag: "Mind-Muscle", text: "Lifting with intent — feeling the muscle, not just moving the weight — measurably increases activation. Quality of attention is training." },
  { tag: "Patience", text: "Neural pathways strengthen with repetition, not with any single session. Trust the reps; the wiring is happening." },
  { tag: "Reframe", text: "Reframe fatigue as adaptation in progress. The same sensation, labeled 'I'm getting stronger,' changes how your brain responds." },
  { tag: "Arise", text: "You don't rise to the level of your motivation; you fall to the level of your systems. The System has you — just log the next set." }
];

/* Short micro-rewards shown when a set is completed (variable reward). */
export const ENCOURAGE = [
  "Rep logged. Pathway reinforced.",
  "Myelin +1.",
  "The System acknowledges your effort.",
  "That set counts. Keep stacking.",
  "Stronger than last week.",
  "Signal sent. Adaptation incoming.",
  "Locked in.",
  "One more brick in the wall.",
  "Effort registered. Dopamine earned.",
  "Clean rep. Wiring it in.",
  "Arise.",
  "Tension held. Growth triggered."
];

let _neuroIdx = Math.floor(Math.random() * NEURO_NOTES.length);
export function pickNeuro(sequential = true) {
  if (sequential) {
    _neuroIdx = (_neuroIdx + 1) % NEURO_NOTES.length;
    return NEURO_NOTES[_neuroIdx];
  }
  return NEURO_NOTES[Math.floor(Math.random() * NEURO_NOTES.length)];
}

/** A stable "insight of the day" so Home is consistent within a day. */
export function neuroOfDay(dateISO) {
  let h = 0;
  const s = dateISO || "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return NEURO_NOTES[h % NEURO_NOTES.length];
}

export function pickEncourage() {
  return ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
}
