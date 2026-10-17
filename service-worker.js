// Portal Brasil — Service Worker
// Estratégia: Cache-First para estáticos, Network-First para HTML e JSON

const CACHE_VERSION = 'v7';
const STATIC_CACHE = `jornadabrasil-static-${CACHE_VERSION}`;
const HTML_CACHE = `jornadabrasil-html-${CACHE_VERSION}`;

const ALL_CACHES = [STATIC_CACHE, HTML_CACHE];

// Arquivos pré-cacheados no install (essenciais para funcionamento offline)
const PRECACHE_ASSETS = [
  '/assets/css/style.css',
  '/assets/js/contact-widget.js',
  '/assets/js/app.js',
  '/assets/js/engine.js',
  '/assets/js/consent.js',
  '/assets/img/favicon.svg',
  '/assets/img/logo.png',
  '/assets/img/logo-mark.png',
  '/assets/img/icons/icon-192x192.png',
  '/assets/img/icons/icon-512x512.png',
  '/404.html',
];

// Install: pré-cache dos estáticos
// skipWaiting() fora do waitUntil — ambos disparam em paralelo (correto)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove caches de versões anteriores e assume controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests cross-origin (analytics, fonts, ads)
  if (url.origin !== location.origin) return;

  // Ignora métodos não-GET
  if (request.method !== 'GET') return;

  // manifest.json e service-worker.js: sempre busca na rede (nunca cachear)
  if (
    url.pathname === '/manifest.json' ||
    url.pathname === '/service-worker.js'
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  const isHTML = request.headers.get('accept')?.includes('text/html');

  const isStaticAsset =
    url.pathname.startsWith('/assets/') &&
    !url.pathname.endsWith('.json');

  if (isStaticAsset) {
    // Stale-While-Revalidate: CSS, JS e imagens são servidos do cache na hora
    // (rápido) e revalidados na rede em segundo plano. Assim, novos deploys
    // chegam automaticamente na visita seguinte, sem hard-reload por página e
    // sem depender de bump manual da versão do cache.
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached || new Response('', { status: 503 }));
          return cached || network;
        })
      )
    );
  } else if (isHTML) {
    // Network-First: HTML sempre tenta rede para garantir conteúdo atualizado
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(HTML_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/404.html'))
        )
    );
  }
  // Qualquer outro recurso não interceptado: deixa passar normalmente
});

// Mensagem do cliente: força atualização do SW
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
