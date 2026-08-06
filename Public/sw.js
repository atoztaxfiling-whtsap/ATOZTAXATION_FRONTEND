const CACHE_NAME = "atoz-v1";
const PRECACHE = ["/", "/index.html", "/icon-192.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("/api/") || e.request.url.includes("/chat/")) return;
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(e.request, cl)); } return r; }).catch(() => caches.match("/"))));
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
