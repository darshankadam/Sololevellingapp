/* Service worker — offline app shell.
 * Bump CACHE whenever you change app files so phones pick up the update. */
const CACHE = "sls-gym-v10";
const RUNTIME = "sls-gym-runtime";

const CORE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/program.js",
  "./js/store.js",
  "./js/charts.js",
  "./js/exporter.js",
  "./js/knowledge.js",
  "./js/fx.js",
  "./js/coach.js",
  "./js/achievements.js",
  "./js/icons.js",
  "./js/anim.js",
  "./vendor/xlsx.full.min.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(req));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navigations -> network-first, fall back to cached shell (offline)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    // Big immutable vendor files -> cache-first (never re-download)
    if (url.pathname.includes("/vendor/")) {
      e.respondWith(caches.match(req).then((r) => r || networkFirst(req)));
      return;
    }
    // App code/assets -> network-first so updates land immediately; cache is the offline fallback
    e.respondWith(networkFirst(req));
    return;
  }

  // Cross-origin (e.g. Google Fonts): stale-while-revalidate, best effort
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        try { const copy = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, copy)); } catch (_) {}
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
