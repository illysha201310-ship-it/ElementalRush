// Офлайн-кэш: сначала сеть (игроки всегда получают свежую версию), без интернета — сохранённая копия.
const CACHE = "stihii-v0.4";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.png", "icon-192.png", "icon-512.png", "js/data.js?v=0.4", "js/content.js?v=0.4", "js/core.js?v=0.4", "js/art.js?v=0.4", "js/game.js?v=0.4", "js/isaac.js?v=0.4", "js/dungeon.js?v=0.4", "js/ui.js?v=0.4"];
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
