/* Ayo Sudoku! service worker. Offline shell plus runtime caching. Made by ffrizzy. */

const VERSION = "ayo-sudoku-v1.0.5";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/theme.js",
  "/favicon.ico",
  "/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/og.png",
];
const NAVIGATION_TIMEOUT = 4000;
const KILL_CHECK_INTERVAL = 60 * 60 * 1000;
let killSwitchCheckedAt = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL).catch(() => undefined);
  await precacheAssets(cache);
}

/* index.html names the hashed bundle and stylesheet, which a static SHELL list cannot.
   Cache them during install so the very first offline visit works, not just the
   second one after the runtime cache has seen them. */
async function precacheAssets(cache) {
  try {
    const response = await fetch("/index.html", { cache: "reload" });
    if (!response.ok) return;
    const html = await response.text();
    const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
  } catch (error) {
    /* Installing offline: assets can still be picked up by the runtime cache. */
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
      await checkKillSwitch();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // The kill switch must be reachable long after install, not only on activate.
    event.waitUntil(checkKillSwitch());
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT);
    if (response && response.ok) {
      await cache.put("/index.html", response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match("/index.html")) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Ayo Sudoku!</title><body style=\"font-family:system-ui;padding:2rem\"><h1>Ayo Sudoku!</h1><p>You are offline and the game is not cached yet. Reconnect once to finish installing.</p></body>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || new Response("", { status: 504 });
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(ASSET_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response("", { status: 504 });
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/* Hosts can add /sw-kill.json to retire a broken service worker on the next visit.
   The body must be {"kill": true}: a single page app often answers unknown
   paths with index.html and a 200, which must not trigger the kill switch. */
async function checkKillSwitch() {
  const now = Date.now();
  if (now - killSwitchCheckedAt < KILL_CHECK_INTERVAL) return;
  killSwitchCheckedAt = now;
  try {
    const response = await fetch("/sw-kill.json", { cache: "no-store" });
    if (!response.ok) return;
    const type = response.headers.get("content-type") || "";
    if (!type.includes("json")) return;
    const payload = await response.json();
    if (!payload || payload.kill !== true) return;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
  } catch (error) {
    /* No kill switch, not JSON, or offline. */
  }
}
