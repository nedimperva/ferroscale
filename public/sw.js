const CACHE_NAME = "ferroscale-v3.37.0-ds2026.09.5";
const OFFLINE_FALLBACK_URL = "/offline.html";
// Not "/": it is a locale redirect, and a cached redirect cannot answer a
// navigation (Safari rejects it outright).
const APP_SHELL_URLS = [
  "/en",
  "/bs",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/favicon-48.png",
  "/favicon.ico",
  OFFLINE_FALLBACK_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      // The offline contact queue this worker used to keep is gone (a queued
      // message carried a captcha that expired long before it was replayed).
      .then(() => {
        try {
          indexedDB.deleteDatabase("ferroscale-offline");
        } catch {
          /* not available in this context */
        }
      })
      .then(() => self.clients.claim()),
  );
});

// Allow the page to trigger an immediate SW activation (used by update banner).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSameOrigin(requestUrl) {
  return new URL(requestUrl).origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!isSameOrigin(request.url)) {
    return;
  }

  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // Always network APIs. If offline, fail fast rather than serving stale writes.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests: network first, then cached page, then offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only a real page is worth replaying offline — not an error, and
          // not a followed redirect, which a navigation cannot be answered with.
          if (response.ok && !response.redirected) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(request)) ||
            (await cache.match(url.pathname.startsWith("/bs") ? "/bs" : "/en")) ||
            (await cache.match(OFFLINE_FALLBACK_URL));
          if (cached) {
            return cached;
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }

      const networkResponse = await fetchPromise;
      return networkResponse || new Response("Offline", { status: 503, statusText: "Offline" });
    }),
  );
});
