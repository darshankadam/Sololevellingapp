/* Service worker — offline app shell.
 * Bump CACHE whenever you change app files so phones pick up the update. */
const CACHE = "sls-gym-v1";
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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App navigations -> serve the shell (works offline / standalone)
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then((r) => r || fetch(req).catch(() => caches.match("./"))));
    return;
  }

  // Same-origin: cache-first, then network (and cache it)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((r) =>
        r ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => r)
      )
    );
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
