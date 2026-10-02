// West Finance Trust service worker.
//
// Deliberately small, because this is a bank:
// - Pages are always fetched fresh from the network and are never cached, so
//   balances and account details are never shown from an old copy or left on
//   the device. With no connection, the offline page is shown instead.
// - Build files (/_next/static, content-hashed) and brand images are cached so
//   the app opens quickly.
// - Nothing that isn't a same-origin GET is touched (logins, forms, Supabase).
// - Push notifications from the server (src/lib/push/send.ts) are shown here.
//
// Bump VERSION when this file's caching rules change.

const VERSION = "v2";
const CACHE = `wft-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/app/icon-192.png", "/images/logo-light.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("wft-") && key !== CACHE).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network only, offline page as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Brand images and app icons: serve the cached copy, refresh it in the background.
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/app/")) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

// ------------------------------------------------------- push notifications

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "West Finance Trust";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/app/icon-192.png",
      badge: "/app/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/dashboard" },
    }),
  );
});

// Tapping a notification focuses the open app (or opens it) on the right page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) return open.navigate(target.href);
        return;
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
