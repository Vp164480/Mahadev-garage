const CACHE_NAME = "mahadev-garage-v3";
const FONT_CACHE = "mahadev-fonts-v1";

const APP_SHELL = [
  "/Mahadev-garage/",
  "/Mahadev-garage/index.html",
  "/Mahadev-garage/admin.html",
  "/Mahadev-garage/manifest.json",

  "/Mahadev-garage/logo.png",
  "/Mahadev-garage/icon-192.png",
  "/Mahadev-garage/icon-512.png",

  "/Mahadev-garage/sql-wasm.js",
  "/Mahadev-garage/sql-wasm.wasm",

  "/Mahadev-garage/assets/main-C-ukJMlA.js",
  "/Mahadev-garage/assets/index.es-CeD_mz3P.js",
  "/Mahadev-garage/assets/admin-B9ookjHz.js",
  "/Mahadev-garage/assets/pin-KJ0oEqrR.js",
  "/Mahadev-garage/assets/html2canvas.esm-DXEQVQnt.js",
  "/Mahadev-garage/assets/purify.es-VaSPOPhr.js",
  "/Mahadev-garage/assets/pin-C2qdixNe.css"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      self.skipWaiting();
    })
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Google Fonts
  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(event.request, FONT_CACHE));
    return;
  }

  // HTML pages
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Other files
  event.respondWith(staleWhileRevalidate(event.request));
});

// CACHE FIRST
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// NETWORK FIRST
async function networkFirst(request) {

  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;

  } catch {

    const cached = await cache.match(request);

    if (cached) return cached;

    const fallback =
      await cache.match("/Mahadev-garage/index.html") ||
      await cache.match("/Mahadev-garage/");

    if (fallback) return fallback;

    return offlinePage();
  }
}

// STALE WHILE REVALIDATE
async function staleWhileRevalidate(request) {

  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {

      if (response && response.ok) {
        cache.put(request, response.clone());
      }

      return response;

    })
    .catch(() => null);

  return cached || networkFetch;
}

// OFFLINE PAGE
function offlinePage() {

  return new Response(
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>

<style>
body{
margin:0;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
font-family:Arial,sans-serif;
background:#f5f5f5;
text-align:center;
}

.box{
padding:20px;
}

h2{
color:#FF6B00;
}

a{
display:inline-block;
margin-top:20px;
padding:12px 20px;
background:#FF6B00;
color:white;
text-decoration:none;
border-radius:8px;
}
</style>

</head>

<body>

<div class="box">

<h2>🔧 MAHADEV AUTO GARAGE</h2>

<p>You are currently offline.</p>

<a href="/Mahadev-garage/">
Try Again
</a>

</div>

</body>

</html>`,
{
headers:{
"Content-Type":"text/html"
}
}
);

        }
