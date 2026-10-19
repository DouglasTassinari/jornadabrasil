#!/usr/bin/env node
/*
 * Publica os artigos agendados do Jornada Brasil.
 *
 * Cada artigo agendado fica em agendados/<slug>/ com dois arquivos:
 *   - index.html  → a página pronta, já com a data de publicação
 *   - meta.json   → { slug, publicar_em: "AAAA-MM-DD", card: {tag, titulo, resumo},
 *                     mapa: {secao, texto} }
 * A pasta agendados/ não vai para o site (está no exclude do _config.yml).
 *
 * Quando chega a data (horário de Brasília), este script:
 *   1. move a página para blog/<slug>/index.html;
 *   2. coloca o endereço no sitemap.xml;
 *   3. põe o card no topo de /blog/ e atualiza os "Últimos artigos" da home;
 *   4. acrescenta o link no mapa do site;
 *   5. atualiza a caixa "Série" de todos os artigos da mesma série.
 *
 * Uso: node tools/publicar-agendados.cjs
 * Variáveis opcionais: HOJE=AAAA-MM-DD (simula outra data), JB_RAIZ=pasta do site.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://jornadabrasil.com.br';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function hojeEmBrasilia() {
  if (process.env.HOJE) return process.env.HOJE;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}

function ler(raiz, rel) { return fs.readFileSync(path.join(raiz, rel), 'utf8'); }
function gravar(raiz, rel, texto) { fs.writeFileSync(path.join(raiz, rel), texto); }

function trocarUmaVez(texto, procurado, novo, onde) {
  const i = texto.indexOf(procurado);
  if (i < 0) throw new Error(`Não encontrei o ponto de inserção em ${onde}: ${procurado.slice(0, 60)}`);
  return texto.slice(0, i) + novo + texto.slice(i + procurado.length);
}

function lerAgendados(raiz) {
  const pasta = path.join(raiz, 'agendados');
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(pasta, d.name, 'meta.json')))
    .map((d) => {
      const meta = JSON.parse(fs.readFileSync(path.join(pasta, d.name, 'meta.json'), 'utf8'));
      if (meta.slug !== d.name) throw new Error(`agendados/${d.name}: o slug do meta.json (${meta.slug}) é diferente da pasta`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.publicar_em || '')) throw new Error(`agendados/${d.name}: publicar_em inválido`);
      return meta;
    })
    .sort((a, b) => a.publicar_em.localeCompare(b.publicar_em) || a.slug.localeCompare(b.slug));
}

function cardHtml(meta) {
  const [ano, mes] = meta.publicar_em.split('-');
  return `        <div class="blog-card">
          <span class="blog-card-tag">${meta.card.tag}</span>
          <h3><a href="/blog/${meta.slug}/">${meta.card.titulo}</a></h3>
          <p class="blog-card-excerpt">${meta.card.resumo}</p>
          <span class="blog-card-date"><time datetime="${meta.publicar_em}">${MESES[Number(mes) - 1]}/${ano}</time></span>
        </div>
`;
}

function noSitemap(raiz, meta) {
  let s = ler(raiz, 'sitemap.xml');
  const loc = `<loc>${SITE}/blog/${meta.slug}/</loc>`;
  if (s.includes(loc)) return;
  const entrada = `  <url>\n    ${loc}\n    <lastmod>${meta.publicar_em}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  s = trocarUmaVez(s, '</urlset>', entrada + '</urlset>', 'sitemap.xml');
  gravar(raiz, 'sitemap.xml', s);
}

function noBlog(raiz, meta) {
  let s = ler(raiz, 'blog/index.html');
  if (s.includes(`href="/blog/${meta.slug}/"`)) return;
  const abre = '<div class="blog-grid">\n';
  s = trocarUmaVez(s, abre, abre + cardHtml(meta), 'blog/index.html');
  gravar(raiz, 'blog/index.html', s);
}

// A home mostra os 3 primeiros cards de /blog/ (latest-posts.js); aqui atualizamos a cópia
// estática, que é a que o Google e quem está sem JavaScript enxergam.
function naHome(raiz) {
  const blog = ler(raiz, 'blog/index.html');
  const grade = blog.slice(blog.indexOf('<div class="blog-grid">'));
  const cards = (grade.match(/ {8}<div class="blog-card">[\s\S]*?<\/div>\n/g) || []).slice(0, 3);
  if (cards.length < 3) throw new Error('blog/index.html: menos de 3 cards encontrados');
  let home = ler(raiz, 'index.html');
  const re = /(<div class="blog-grid" id="home-latest-grid"[^>]*>\n)([\s\S]*?)( {6}<\/div>\n {6}<a href="\/blog\/")/;
  if (!re.test(home)) throw new Error('index.html: grade "Últimos artigos" não encontrada');
  home = home.replace(re, (_, a, _b, c) => a + cards.join('') + c);
  gravar(raiz, 'index.html', home);
}

function noMapa(raiz, meta) {
  let s = ler(raiz, 'mapa-do-site/index.html');
  if (s.includes(`href="/blog/${meta.slug}/"`)) return;
  const li = `          <li><a href="/blog/${meta.slug}/">${meta.mapa.texto}</a></li>\n`;
  const titulo = `<h2>${meta.mapa.secao}</h2>`;
  const i = s.indexOf(titulo);
  if (i >= 0) {
    const fim = s.indexOf('        </ul>', i);
    s = s.slice(0, fim) + li + s.slice(fim);
  } else {
    // seção nova entra antes dos outros guias (assunto novo fica em destaque)
    const bloco = `${titulo}\n        <ul>\n${li}        </ul>\n\n        `;
    const ancora = s.includes('<h2>Guias:') ? '<h2>Guias:' : '<h2>Institucional</h2>';
    s = trocarUmaVez(s, ancora, bloco + ancora, 'mapa-do-site');
  }
  gravar(raiz, 'mapa-do-site/index.html', s);
}

function metaTag(html, nome) {
  const m = html.match(new RegExp(`<meta name="${nome}" content="([^"]*)">`));
  return m ? m[1] : null;
}

// Reescreve a caixa "Série" (<nav class="serie-box" data-serie="...">) de cada artigo publicado,
// listando só os artigos da série que já estão no ar. Com menos de 2, a caixa fica escondida.
function atualizarSeries(raiz) {
  const pastaBlog = path.join(raiz, 'blog');
  const paginas = fs.readdirSync(pastaBlog, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(pastaBlog, d.name, 'index.html')))
    .map((d) => ({ slug: d.name, rel: `blog/${d.name}/index.html` }));
  const series = {};
  for (const p of paginas) {
    const html = ler(raiz, p.rel);
    const serie = metaTag(html, 'jb-serie');
    if (!serie) continue;
    (series[serie] = series[serie] || []).push({ ...p, html, ordem: Number(metaTag(html, 'jb-serie-ordem')), titulo: metaTag(html, 'jb-serie-titulo') });
  }
  for (const [serie, membros] of Object.entries(series)) {
    membros.sort((a, b) => a.ordem - b.ordem);
    for (const m of membros) {
      const itens = membros.map((o) => (o.slug === m.slug
        ? `<li><strong aria-current="page">${o.titulo}</strong> <span style="color: var(--text-2)">(você está aqui)</span></li>`
        : `<li><a href="/blog/${o.slug}/">${o.titulo}</a></li>`)).join('');
      const re = new RegExp(`<nav class="serie-box" data-serie="${serie}"([^>]*)>([\\s\\S]*?)<ol>[\\s\\S]*?</ol>`);
      if (!re.test(m.html)) continue;
      const novo = m.html.replace(re, (_, attrs, meio) => {
        const semHidden = attrs.replace(/ hidden/g, '');
        return `<nav class="serie-box" data-serie="${serie}"${semHidden}${membros.length < 2 ? ' hidden' : ''}>${meio}<ol>${itens}</ol>`;
      });
      if (novo !== m.html) gravar(raiz, m.rel, novo);
    }
  }
}

function publicar(raiz, meta) {
  const origem = path.join(raiz, 'agendados', meta.slug);
  const destino = path.join(raiz, 'blog', meta.slug);
  if (fs.existsSync(path.join(destino, 'index.html'))) throw new Error(`blog/${meta.slug}/ já existe; não vou sobrescrever`);
  fs.mkdirSync(destino, { recursive: true });
  fs.copyFileSync(path.join(origem, 'index.html'), path.join(destino, 'index.html'));
  noSitemap(raiz, meta);
  noBlog(raiz, meta);
  noMapa(raiz, meta);
  fs.rmSync(origem, { recursive: true, force: true });
}

function executar(raiz, hoje) {
  const devidos = lerAgendados(raiz).filter((m) => m.publicar_em <= hoje);
  for (const meta of devidos) publicar(raiz, meta);
  if (devidos.length) naHome(raiz);
  atualizarSeries(raiz);
  return devidos.map((m) => m.slug);
}

if (require.main === module) {
  const raiz = path.resolve(process.env.JB_RAIZ || path.join(__dirname, '..'));
  const hoje = hojeEmBrasilia();
  const publicados = executar(raiz, hoje);
  const restantes = lerAgendados(raiz);
  console.log(`Hoje (Brasília): ${hoje}`);
  console.log(publicados.length ? `Publicados: ${publicados.join(', ')}` : 'Nenhum artigo para publicar hoje.');
  for (const m of restantes) console.log(`Agendado: ${m.publicar_em}  ${m.slug}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `publicados=${publicados.join(', ')}\n`);
}

module.exports = { executar, lerAgendados, hojeEmBrasilia };
