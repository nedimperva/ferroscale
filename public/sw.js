const CACHE_NAME = "ferroscale-v2.2.0-ds2026.03.3";
const OFFLINE_FALLBACK_URL = "/offline.html";
const APP_SHELL_URLS = [
  "/",
  "/en",
  "/bs",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
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
      .then(() => self.clients.claim()),
  );
});

// Allow the page to trigger an immediate SW activation (used by update banner).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background Sync for contact form
const CONTACT_QUEUE_STORE = "contact-queue";

async function openContactQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ferroscale-offline", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CONTACT_QUEUE_STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueContact(body) {
  const db = await openContactQueue();
  const tx = db.transaction(CONTACT_QUEUE_STORE, "readwrite");
  tx.objectStore(CONTACT_QUEUE_STORE).add({ body, timestamp: Date.now() });
  return new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
}

async function replayContactQueue() {
  const db = await openContactQueue();
  const tx = db.transaction(CONTACT_QUEUE_STORE, "readonly");
  const store = tx.objectStore(CONTACT_QUEUE_STORE);
  const all = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  for (const entry of all) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.body),
      });
      if (res.ok) {
        const delTx = db.transaction(CONTACT_QUEUE_STORE, "readwrite");
        delTx.objectStore(CONTACT_QUEUE_STORE).delete(entry.id);
      }
    } catch {
      /* still offline, will retry later */
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "contact-sync") {
    event.waitUntil(replayContactQueue());
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

  // Background Sync: queue failed POST /api/contact and replay when online
  if (request.method === "POST" && url.pathname === "/api/contact") {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const body = await request.json();
        await enqueueContact(body);
        if (self.registration.sync) {
          await self.registration.sync.register("contact-sync");
        }
        return new Response(JSON.stringify({ ok: true, queued: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    return;
  }

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
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(request)) ||
            (await cache.match(url.pathname.startsWith("/bs") ? "/bs" : "/en")) ||
            (await cache.match("/")) ||
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
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      return cached || networkPromise || new Response("Offline", { status: 503, statusText: "Offline" });
    }),
  );
});
