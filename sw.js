const CACHE_NAME = "mahadev-garage-v2";
const FONT_CACHE = "mahadev-fonts-v1";

// App shell files to pre-cache on install
const APP_SHELL = [
  "/",
  "/index.html",
  "/admin.html",
  "/manifest.json",

  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",

  "/assets/main-C-ukJMlA.js",
  "/assets/index.es-CeD_mz3P.js",
  "/assets/admin-B9ookjHz.js",
  "/assets/pin-KJ0oEqrR.js",
  "/assets/html2canvas.esm-DXEQVQnt.js",
  "/assets/purify.es-VaSPOPhr.js",
  "/assets/pin-C2qdixNe.css",

  "/sql-wasm.js",
  "/sql-wasm.wasm"
];

// ---- INSTALL: pre-cache app shell ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: delete old caches ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: smart caching strategy ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Google Fonts: cache-first (fonts don't change)
  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // HTML pages: network-first, fall back to cache
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // JS/CSS/images: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ---- STRATEGIES ----

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback to root index.html for any navigation
    const fallback = await cache.match("/") || await cache.match("/index.html");
    if (fallback) return fallback;
    return new Response(offlinePage(), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || new Response("", { status: 503 });
}

function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Offline — MAHADEV AUTO GARAGE</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f6fa;color:#1a1d2e;text-align:center;padding:20px}
  .box{max-width:340px}
  .icon{font-size:64px;margin-bottom:16px}
  h1{font-size:20px;font-weight:700;margin-bottom:8px}
  p{font-size:14px;color:#6b7280;margin-bottom:20px}
  a{display:inline-block;padding:10px 24px;background:#FF6B00;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
</style>
</head>
<body>
<div class="box">
  <div class="icon">🔧</div>
  <h1>MAHADEV AUTO GARAGE</h1>
  <p>Aap abhi offline hain. Internet connection check karein aur dobara try karein.</p>
  <a href="/">Try Again</a>
</div>
</body>
</html>`;
}
