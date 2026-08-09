const CACHE_NAME = "atoz-v3";
const PRECACHE = ["/", "/index.html", "/icon-192.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.url.includes("/api/") || req.url.includes("/chat/")) return;
  // Page navigations: network-first so a new deploy always loads fresh (no stale app)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => { const cl = r.clone(); caches.open(CACHE_NAME).then(c => c.put("/", cl)); return r; })
        .catch(() => caches.match("/").then(c => c || caches.match(req)))
    );
    return;
  }
  // Static assets (hashed filenames): cache-first is safe
  e.respondWith(caches.match(req).then(c => c || fetch(req).then(r => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(req, cl)); } return r; }).catch(() => caches.match("/"))));
});
self.addEventListener("push", e => {
  let d = { title: "ATOZ Taxation", body: "Naya message aaya", mobile: "" };
  try { if (e.data) d = e.data.json(); } catch { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title || "ATOZ Taxation", { body: d.body, icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [200,100,200], tag: d.mobile || "atoz", renotify: true, data: { mobile: d.mobile } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
    for (const c of cls) { if (c.url.includes(self.location.origin)) { c.focus(); if (e.notification.data?.mobile) c.postMessage({ type: "OPEN_CHAT", mobile: e.notification.data.mobile }); return; } }
    return self.clients.openWindow("/");
  }));
});
