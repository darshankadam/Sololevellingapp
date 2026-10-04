/* =========================================================================
 * fx.js — tiny, dependency-free animation helpers (offline-safe).
 *   burst()    particle burst on a canvas overlay
 *   countUp()  animate a number in a DOM node
 *   haptic()   guarded vibration
 *   flash()    quick full-screen color flash (level-up)
 * Everything respects reduced motion (OS setting OR body.reduce-motion).
 * ========================================================================= */

export function reducedMotion() {
  try {
    if (document.body.classList.contains("reduce-motion")) return true;
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export const PALETTE = ["#38bdf8", "#22d3ee", "#8b5cf6", "#a855f7", "#e879f9", "#fbbf24"];

let canvas = null, ctx = null, dpr = 1, raf = 0;
let particles = [];

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "fxcanvas";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize, { passive: true });
}
function resize() {
  if (!canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  raf = 0;
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  let alive = 0;
  for (const p of particles) {
    if (p.life <= 0) continue;
    alive++;
    p.life--;
    p.vy += p.gravity;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
    }
    ctx.restore();
  }
  if (alive > 0) raf = requestAnimationFrame(loop);
  else {
    particles = [];
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/**
 * Particle burst at screen coords (clientX/clientY).
 * opts: { count, colors, power, spread(rad), gravity, up(bias), size }
 */
export function burst(x, y, opts = {}) {
  if (reducedMotion()) return;
  ensureCanvas();
  const count = opts.count || 26;
  const colors = opts.colors || PALETTE;
  const power = opts.power || 7;
  const gravity = opts.gravity != null ? opts.gravity : 0.22;
  const up = opts.up != null ? opts.up : 1.6; // upward bias
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = power * (0.4 + Math.random() * 0.9);
    particles.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - up,
      gravity,
      life: 42 + Math.random() * 28,
      maxLife: 70,
      size: (opts.size || 7) * (0.6 + Math.random() * 0.8),
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      shape: Math.random() < 0.4 ? "circle" : "rect"
    });
  }
  // keep the array bounded
  if (particles.length > 400) particles = particles.slice(-400);
  if (!raf) raf = requestAnimationFrame(loop);
}

/** Big celebration from the top-center raining down. */
export function celebrate(opts = {}) {
  if (reducedMotion()) return;
  const w = window.innerWidth;
  const n = opts.count || 70;
  ensureCanvas();
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      burst(Math.random() * w, -10, { count: 2, power: 3, up: -2, gravity: 0.28, colors: opts.colors });
    }, Math.random() * 500);
  }
}

/** Count a number up (or down) inside an element. */
export function countUp(el, to, opts = {}) {
  if (!el) return;
  const dur = opts.dur || 900;
  const dec = opts.decimals || 0;
  const prefix = opts.prefix || "";
  const suffix = opts.suffix || "";
  const from = opts.from != null ? opts.from : 0;
  if (reducedMotion()) { el.textContent = prefix + to.toFixed(dec) + suffix; return; }
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * eased;
    el.textContent = prefix + val.toFixed(dec) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function haptic(pattern) {
  try {
    if (!reducedMotion() && navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

/** Quick full-screen tint flash (e.g. on level up). */
export function flash(color = "rgba(139,92,246,.35)", ms = 500) {
  if (reducedMotion()) return;
  const d = document.createElement("div");
  d.className = "fx-flash";
  d.style.background = `radial-gradient(circle at 50% 45%, ${color}, transparent 70%)`;
  document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add("on"));
  setTimeout(() => { d.classList.remove("on"); setTimeout(() => d.remove(), 400); }, ms);
}
