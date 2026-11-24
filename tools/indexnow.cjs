#!/usr/bin/env node
/*
 * Avisa o Bing, o Yandex e outros buscadores (protocolo IndexNow) que há páginas novas ou atualizadas.
 * Uso: node tools/indexnow.cjs [slug1,slug2,...]   (ou a variável PUBLICADOS)
 * Sempre envia também a home, o blog, o sitemap e o feed. O Google não usa IndexNow: ele lê o sitemap.
 */
'use strict';
const SITE = 'https://jornadabrasil.com.br';
const CHAVE = '4961bc2518c0eddbe7ab1b8faa0bd847'; // arquivo <chave>.txt na raiz do site
const slugs = (process.argv[2] || process.env.PUBLICADOS || '').split(',').map((s) => s.trim()).filter(Boolean);
const urls = [`${SITE}/`, `${SITE}/blog/`, `${SITE}/sitemap.xml`, `${SITE}/feed.xml`, ...slugs.map((s) => `${SITE}/blog/${s}/`)];
(async () => {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'jornadabrasil.com.br', key: CHAVE, keyLocation: `${SITE}/${CHAVE}.txt`, urlList: urls }),
  });
  console.log(`IndexNow: HTTP ${r.status} para ${urls.length} endereços`);
  if (r.status >= 400) process.exitCode = 1;
})();
