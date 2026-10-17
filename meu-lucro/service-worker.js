/* ============================================================
   Meu Lucro — Service Worker (PWA offline)
   ============================================================ */

const CACHE = "meu-lucro-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./auth.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

// Instala e pré-armazena os arquivos do app.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll falha tudo se um item falhar; tratamos individualmente.
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Remove caches antigos.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache primeiro, com atualização em segundo plano (stale-while-revalidate).
// Importante: só intercepta arquivos do próprio app e os CDNs conhecidos.
// As chamadas do Firebase/Firestore passam direto (não são cacheadas aqui).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isKnownCDN = ASSETS.includes(request.url);
  if (!sameOrigin && !isKnownCDN) return; // deixa Firebase/Google passarem direto

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
