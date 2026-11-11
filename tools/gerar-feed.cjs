#!/usr/bin/env node
/*
 * Gera o feed RSS do blog (/feed.xml) a partir dos artigos publicados em blog/<slug>/.
 * Lê de cada artigo: título (og:title ou <title>), descrição, data de publicação
 * (article:published_time, datePublished ou <time datetime>) e data de atualização.
 * O resultado só muda quando os artigos mudam (não usa a data de "agora"), então
 * rodar de novo sem mudanças não altera o arquivo.
 *
 * Uso: node tools/gerar-feed.cjs        (o publicador de agendados também chama)
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://jornadabrasil.com.br';
const LIMITE = 60;

function decodificar(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pegar(html, re) {
  const m = html.match(re);
  return m ? decodificar(m[1].trim()) : null;
}

// "AAAA-MM-DD" → data RFC 822 ao meio-dia de Brasília (evita virar o dia por fuso)
function rfc822(dia) {
  return new Date(dia + 'T12:00:00-03:00').toUTCString();
}

function lerArtigo(raiz, slug) {
  const arq = path.join(raiz, 'blog', slug, 'index.html');
  if (!fs.existsSync(arq)) return null;
  const html = fs.readFileSync(arq, 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) return null;
  const titulo = pegar(html, /<meta property="og:title" content="([^"]+)"/)
    || (pegar(html, /<title>([^<]+)<\/title>/) || '').replace(/\s*[|—-]\s*(Blog\s+)?Jornada Brasil\s*$/i, '');
  const descricao = pegar(html, /<meta name="description" content="([^"]+)"/) || '';
  const publicado = pegar(html, /<meta property="article:published_time" content="(\d{4}-\d{2}-\d{2})/)
    || pegar(html, /"datePublished":\s*"(\d{4}-\d{2}-\d{2})/)
    || pegar(html, /<time datetime="(\d{4}-\d{2}-\d{2})">/);
  const atualizado = pegar(html, /<meta property="article:modified_time" content="(\d{4}-\d{2}-\d{2})/)
    || pegar(html, /"dateModified":\s*"(\d{4}-\d{2}-\d{2})/)
    || publicado;
  const categoria = pegar(html, /<span class="blog-card-tag">([^<]+)<\/span>/);
  if (!titulo || !publicado) return null;
  return { slug, url: `${SITE}/blog/${slug}/`, titulo, descricao, publicado, atualizado, categoria };
}

function coletar(raiz) {
  const pasta = path.join(raiz, 'blog');
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => lerArtigo(raiz, d.name))
    .filter(Boolean)
    .sort((a, b) => b.publicado.localeCompare(a.publicado) || a.slug.localeCompare(b.slug));
}

function montarFeed(itens) {
  const lista = itens.slice(0, LIMITE);
  const maisRecente = itens.reduce((m, i) => (i.atualizado > m ? i.atualizado : m), '1970-01-01');
  const linhas = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Jornada Brasil — guias trabalhistas</title>',
    `    <link>${SITE}/blog/</link>`,
    `    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`,
    '    <description>Guias sobre direitos trabalhistas, salário, férias, 13º, FGTS e a nova jornada de trabalho, com as regras e tabelas oficiais.</description>',
    '    <language>pt-BR</language>',
    `    <lastBuildDate>${rfc822(maisRecente)}</lastBuildDate>`,
  ];
  for (const i of lista) {
    linhas.push(
      '    <item>',
      `      <title>${escapar(i.titulo)}</title>`,
      `      <link>${i.url}</link>`,
      `      <guid isPermaLink="true">${i.url}</guid>`,
      `      <pubDate>${rfc822(i.publicado)}</pubDate>`,
      ...(i.categoria ? [`      <category>${escapar(i.categoria)}</category>`] : []),
      `      <description>${escapar(i.descricao)}</description>`,
      '    </item>'
    );
  }
  linhas.push('  </channel>', '</rss>', '');
  return linhas.join('\n');
}

function gerarFeed(raiz) {
  const itens = coletar(raiz);
  const xml = montarFeed(itens);
  const arq = path.join(raiz, 'feed.xml');
  const antes = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : null;
  if (antes !== xml) fs.writeFileSync(arq, xml);
  return { total: itens.length, mudou: antes !== xml };
}

if (require.main === module) {
  const raiz = path.resolve(process.env.JB_RAIZ || path.join(__dirname, '..'));
  const r = gerarFeed(raiz);
  console.log(`feed.xml: ${r.total} artigos${r.mudou ? ' (atualizado)' : ' (sem mudança)'}`);
}

module.exports = { coletar, montarFeed, gerarFeed, rfc822 };
