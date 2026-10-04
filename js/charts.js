/* =========================================================================
 * charts.js  —  Dependency-free, theme-aware SVG charts.
 *
 * All charts are SINGLE-SERIES (one measure), so colour is used only for the
 * one series; identity never rides on colour alone. PRs get a diamond marker
 * + direct label (shape, not just colour) as secondary encoding. Every chart
 * ships a hover/touch tooltip. Grid + axes are recessive.
 * ========================================================================= */

const SVGNS = "http://www.w3.org/2000/svg";

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function el(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function niceMax(v) {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return Math.round(n * 10) / 10 + "";
}

function shortDate(iso) {
  const [, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${+d} ${months[+m - 1]}`;
}

function makeTooltip(container) {
  let tip = container.querySelector(".chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.setAttribute("role", "status");
    container.appendChild(tip);
  }
  return tip;
}

function emptyState(container, msg) {
  container.innerHTML = `<div class="chart-empty">${msg}</div>`;
}

/* ------------------------------------------------------------------ line -- */
/**
 * points: [{ x: 'YYYY-MM-DD', y: Number, label?: String }]
 * opts:   { yUnit, title, highlightMax }
 */
export function lineChart(container, points, opts = {}) {
  container.classList.add("chart-wrap");
  container.innerHTML = "";
  if (!points || points.length === 0) {
    emptyState(container, opts.empty || "No data yet — log a few sessions.");
    return;
  }

  const accent = cssVar("--accent", "#38bdf8");
  const pr = cssVar("--pr", "#a78bfa");
  const grid = cssVar("--grid", "rgba(120,160,220,.16)");
  const muted = cssVar("--muted", "#7f93b8");

  const W = 340, H = 190;
  const padL = 34, padR = 14, padT = 16, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const ys = points.map((p) => p.y);
  const yMin = 0;
  const yMax = niceMax(Math.max(...ys) * 1.08);
  const n = points.length;
  const xAt = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", preserveAspectRatio: "none", "aria-label": opts.title || "line chart" }, container);

  // gradient fill
  const defs = el("defs", {}, svg);
  const grad = el("linearGradient", { id: "areaGrad", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
  el("stop", { offset: "0%", "stop-color": accent, "stop-opacity": "0.35" }, grad);
  el("stop", { offset: "100%", "stop-color": accent, "stop-opacity": "0" }, grad);

  // y grid + labels
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = yMin + (t / ticks) * (yMax - yMin);
    const y = yAt(v);
    el("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: grid, "stroke-width": "1" }, svg);
    const tx = el("text", { x: padL - 5, y: y + 3, "text-anchor": "end", class: "chart-axis" }, svg);
    tx.textContent = fmt(v);
  }

  // x labels (first, middle, last)
  const xi = n === 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  for (const i of xi) {
    const tx = el("text", { x: xAt(i), y: H - 8, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle", class: "chart-axis" }, svg);
    tx.textContent = shortDate(points[i].x);
  }

  // area + line
  let dLine = "";
  points.forEach((p, i) => (dLine += (i ? "L" : "M") + xAt(i) + " " + yAt(p.y)));
  const dArea = dLine + `L${xAt(n - 1)} ${yAt(yMin)} L${xAt(0)} ${yAt(yMin)} Z`;
  el("path", { d: dArea, fill: "url(#areaGrad)" }, svg);
  el("path", { d: dLine, fill: "none", stroke: accent, "stroke-width": "2", "stroke-linejoin": "round", "stroke-linecap": "round", filter: "drop-shadow(0 0 4px " + accent + ")" }, svg);

  // vertices
  points.forEach((p, i) => el("circle", { cx: xAt(i), cy: yAt(p.y), r: "2.4", fill: accent }, svg));

  // highlight max (PR / current best) with a diamond + label — shape, not colour alone
  if (opts.highlightMax !== false) {
    let mi = 0;
    points.forEach((p, i) => { if (p.y > points[mi].y) mi = i; });
    const mx = xAt(mi), my = yAt(points[mi].y);
    const s = 5;
    el("path", { d: `M${mx} ${my - s} L${mx + s} ${my} L${mx} ${my + s} L${mx - s} ${my} Z`, fill: pr, stroke: "#0a0e17", "stroke-width": "1.5", filter: "drop-shadow(0 0 5px " + pr + ")" }, svg);
    const lbl = el("text", { x: mx, y: my - 9, "text-anchor": mi === n - 1 ? "end" : "middle", class: "chart-pr-label" }, svg);
    lbl.textContent = "PR " + fmt(points[mi].y) + (opts.yUnit || "");
  }

  // crosshair + interaction
  const cross = el("line", { x1: 0, y1: padT, x2: 0, y2: padT + plotH, stroke: accent, "stroke-width": "1", "stroke-dasharray": "3 3", opacity: "0" }, svg);
  const dot = el("circle", { r: "4.5", fill: accent, stroke: "#06101f", "stroke-width": "2", opacity: "0" }, svg);
  const hit = el("rect", { x: padL, y: padT, width: plotW, height: plotH, fill: "transparent" }, svg);
  const tip = makeTooltip(container);

  function toLocal(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function move(evt) {
    const loc = toLocal(evt);
    let i = 0;
    if (n > 1) i = Math.round(((loc.x - padL) / plotW) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    const p = points[i];
    cross.setAttribute("x1", xAt(i)); cross.setAttribute("x2", xAt(i)); cross.setAttribute("opacity", "1");
    dot.setAttribute("cx", xAt(i)); dot.setAttribute("cy", yAt(p.y)); dot.setAttribute("opacity", "1");
    const scr = svg.getScreenCTM();
    const sp = svg.createSVGPoint(); sp.x = xAt(i); sp.y = yAt(p.y);
    const px = sp.matrixTransform(scr);
    const cr = container.getBoundingClientRect();
    tip.style.opacity = "1";
    tip.innerHTML = `<b>${fmt(p.y)}${opts.yUnit || ""}</b><span>${shortDate(p.x)}</span>${p.label ? `<em>${p.label}</em>` : ""}`;
    const tw = tip.offsetWidth || 90;
    let left = px.x - cr.left - tw / 2;
    left = Math.max(2, Math.min(cr.width - tw - 2, left));
    tip.style.left = left + "px";
    tip.style.top = (px.y - cr.top - 44) + "px";
  }
  function leave() { cross.setAttribute("opacity", "0"); dot.setAttribute("opacity", "0"); tip.style.opacity = "0"; }
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerdown", move);
  hit.addEventListener("pointerleave", leave);
}

/* ------------------------------------------------------------------- bars -- */
/**
 * bars: [{ label, value, sub? }]  — horizontal bars, good for categories.
 */
export function barChart(container, bars, opts = {}) {
  container.classList.add("chart-wrap");
  container.innerHTML = "";
  if (!bars || bars.length === 0) {
    emptyState(container, opts.empty || "No data yet.");
    return;
  }
  const accent = cssVar("--accent", "#38bdf8");
  const grid = cssVar("--grid", "rgba(120,160,220,.16)");

  const rowH = 30, gap = 10, padL = 4, padR = 10, padT = 6;
  const labelW = opts.labelW || 104;
  const W = 340;
  const H = padT * 2 + bars.length * rowH + (bars.length - 1) * gap;
  const barMax = W - labelW - padR - padL;
  const vMax = niceMax(Math.max(...bars.map((b) => b.value)));

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", "aria-label": opts.title || "bar chart" }, container);
  const tip = makeTooltip(container);

  bars.forEach((b, i) => {
    const y = padT + i * (rowH + gap);
    const w = vMax > 0 ? (b.value / vMax) * barMax : 0;

    const label = el("text", { x: padL, y: y + rowH / 2 + 4, class: "chart-barlabel" }, svg);
    label.textContent = b.label;

    // track
    el("rect", { x: labelW, y: y + 4, width: barMax, height: rowH - 8, rx: "5", fill: grid, opacity: ".5" }, svg);
    // value bar (rounded end)
    const rect = el("rect", { x: labelW, y: y + 4, width: Math.max(2, w), height: rowH - 8, rx: "5", fill: accent, opacity: ".9", filter: "drop-shadow(0 0 4px " + accent + ")" }, svg);
    rect.style.cursor = "pointer";

    const vt = el("text", { x: labelW + Math.max(2, w) + 6, y: y + rowH / 2 + 4, class: "chart-axis" }, svg);
    vt.textContent = fmt(b.value) + (opts.unit || "");

    rect.addEventListener("pointerenter", (evt) => {
      const cr = container.getBoundingClientRect();
      tip.style.opacity = "1";
      tip.innerHTML = `<b>${b.label}</b><span>${fmt(b.value)}${opts.unit || ""}${b.sub ? " · " + b.sub : ""}</span>`;
      tip.style.left = Math.min(cr.width - 120, Math.max(2, evt.clientX - cr.left - 40)) + "px";
      tip.style.top = (evt.clientY - cr.top - 42) + "px";
    });
    rect.addEventListener("pointerleave", () => (tip.style.opacity = "0"));
  });
}

/* --------------------------------------------------- calendar heatmap ----- */
/**
 * dataMap: { 'YYYY-MM-DD': value }  — a GitHub-style training calendar.
 * Sequential single hue (accent), light->dark by intensity. Hover tooltip.
 */
export function calendarHeatmap(container, dataMap, opts = {}) {
  container.classList.add("chart-wrap");
  container.innerHTML = "";
  const weeks = opts.weeks || 18;
  const cell = 14, gap = 3, topPad = 16, leftPad = 2;
  const W = leftPad + weeks * (cell + gap);
  const H = topPad + 7 * (cell + gap);
  const accent = cssVar("--accent", "#38bdf8");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(today); start.setDate(start.getDate() - dow - (weeks - 1) * 7);
  const iso = (d) => { const off = d.getTimezoneOffset(); return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10); };

  let max = 0;
  for (const k in dataMap) max = Math.max(max, dataMap[k]);

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", "aria-label": "training calendar" }, container);
  const tip = makeTooltip(container);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const colors = ["rgba(130,140,230,.08)", "rgba(56,189,248,.28)", "rgba(56,189,248,.5)", "rgba(56,189,248,.76)", accent];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    for (let r = 0; r < 7; r++) {
      const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
      if (d > today) continue;
      const key = iso(d);
      const val = dataMap[key] || 0;
      const q = max > 0 ? val / max : 0;
      const bucket = val <= 0 ? 0 : q < 0.25 ? 1 : q < 0.5 ? 2 : q < 0.75 ? 3 : 4;
      const x = leftPad + w * (cell + gap), y = topPad + r * (cell + gap);
      const rect = el("rect", { x, y, width: cell, height: cell, rx: 3, fill: colors[bucket] }, svg);
      if (bucket === 4) rect.setAttribute("filter", `drop-shadow(0 0 3px ${accent})`);
      if (r === 0) { const m = d.getMonth(); if (m !== lastMonth) { lastMonth = m; const t = el("text", { x, y: 11, class: "chart-axis" }, svg); t.textContent = months[m]; } }
      rect.addEventListener("pointerenter", (ev) => {
        const cr = container.getBoundingClientRect();
        tip.style.opacity = "1";
        tip.innerHTML = `<b>${val > 0 ? fmt(val) + " vol" : "rest"}</b><span>${key}</span>`;
        tip.style.left = Math.min(cr.width - 100, Math.max(2, ev.clientX - cr.left - 40)) + "px";
        tip.style.top = (ev.clientY - cr.top - 44) + "px";
      });
      rect.addEventListener("pointerleave", () => (tip.style.opacity = "0"));
    }
  }
}
