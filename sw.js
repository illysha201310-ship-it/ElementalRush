// Офлайн-кэш: сначала сеть (игроки всегда получают свежую версию), без интернета — сохранённая копия.
const CACHE = "stihii-v0.2";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.png", "js/data.js?v=0.2", "js/core.js?v=0.2", "js/art.js?v=0.2", "js/game.js?v=0.2", "js/ui.js?v=0.2"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); });
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return r;
  }).catch(() => caches.match(e.request)));
});
