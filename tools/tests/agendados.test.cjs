// Artigos agendados e o publicador automático (tools/publicar-agendados.cjs).
// Garante que cada artigo agendado está completo, que nenhuma página publicada aponta para
// um artigo que ainda não saiu, e simula as publicações futuras numa cópia do site.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');
const { executar, lerAgendados } = require('../publicar-agendados.cjs');

const agendados = lerAgendados(raiz);
const lerArq = (rel, base = raiz) => fs.readFileSync(path.join(base, rel), 'utf8');
const publicados = (base = raiz) => fs.readdirSync(path.join(base, 'blog'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(base, 'blog', d.name, 'index.html'))).map((d) => d.name);
const linksBlog = (html) => [...html.matchAll(/href="\/blog\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
const textoPrincipal = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .match(/<main[\s\S]*<\/main>/)[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('cada artigo agendado está completo e com a data certa', () => {
  for (const meta of agendados) {
    const html = lerArq(`agendados/${meta.slug}/index.html`);
    const onde = `agendados/${meta.slug}`;
    assert.ok(meta.card && meta.card.tag && meta.card.titulo && meta.card.resumo, `${onde}: card incompleto`);
    assert.ok(meta.mapa && meta.mapa.secao && meta.mapa.texto, `${onde}: mapa incompleto`);
    assert.ok(!fs.existsSync(path.join(raiz, 'blog', meta.slug)), `${onde}: já existe em blog/`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://jornadabrasil.com.br/blog/${meta.slug}/">`), `${onde}: canonical`);
    assert.ok(html.includes(`"datePublished": "${meta.publicar_em}"`), `${onde}: datePublished diferente de publicar_em`);
    assert.ok(html.includes(`<time datetime="${meta.publicar_em}">`), `${onde}: data visível diferente de publicar_em`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${onde}: precisa de exatamente um <h1>`);
    assert.match(html, /<title>[^<]{20,}<\/title>/, `${onde}: título`);
    assert.match(html, /<meta name="description" content="[^"]{80,}">/, `${onde}: description`);
    for (const bloco of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(bloco[1]);
    assert.ok(textoPrincipal(html).split(' ').length >= 600, `${onde}: conteúdo curto`);
    assert.ok(html.includes('</html>'), `${onde}: página incompleta`);
  }
});

test('artigo agendado só aponta para artigos que já estarão no ar na data dele', () => {
  const noAr = new Set(publicados());
  const datas = Object.fromEntries(agendados.map((m) => [m.slug, m.publicar_em]));
  for (const meta of agendados) {
    for (const alvo of linksBlog(lerArq(`agendados/${meta.slug}/index.html`))) {
      const ok = noAr.has(alvo) || (datas[alvo] && datas[alvo] <= meta.publicar_em);
      assert.ok(ok, `agendados/${meta.slug} aponta para /blog/${alvo}/, que ainda não estará publicado em ${meta.publicar_em}`);
    }
  }
});

test('nenhuma página no ar aponta para um artigo que ainda não foi publicado', () => {
  const noAr = new Set(publicados());
  const paginas = ['index.html', 'blog/index.html', 'mapa-do-site/index.html', ...publicados().map((s) => `blog/${s}/index.html`)];
  for (const rel of paginas) {
    for (const alvo of linksBlog(lerArq(rel))) assert.ok(noAr.has(alvo), `${rel} aponta para /blog/${alvo}/, que não existe`);
  }
});

function copiaDoSite() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jb-agendados-'));
  for (const item of ['blog', 'agendados', 'mapa-do-site']) {
    if (fs.existsSync(path.join(raiz, item))) fs.cpSync(path.join(raiz, item), path.join(tmp, item), { recursive: true });
  }
  for (const arq of ['sitemap.xml', 'index.html']) fs.copyFileSync(path.join(raiz, arq), path.join(tmp, arq));
  return tmp;
}

test('simulação: publicar tudo o que está agendado deixa o site consistente', () => {
  const tmp = copiaDoSite();
  try {
    const feitos = executar(tmp, '2099-12-31');
    assert.deepEqual(feitos, agendados.map((m) => m.slug));
    assert.deepEqual(lerAgendados(tmp), []);
    const sitemap = lerArq('sitemap.xml', tmp);
    const blog = lerArq('blog/index.html', tmp);
    const mapa = lerArq('mapa-do-site/index.html', tmp);
    for (const meta of agendados) {
      assert.ok(fs.existsSync(path.join(tmp, 'blog', meta.slug, 'index.html')));
      assert.equal(sitemap.split(`<loc>https://jornadabrasil.com.br/blog/${meta.slug}/</loc>`).length, 2, `${meta.slug} no sitemap uma vez`);
      assert.equal(blog.split(`<h3><a href="/blog/${meta.slug}/">`).length, 2, `${meta.slug} no blog uma vez`);
      assert.ok(mapa.includes(`href="/blog/${meta.slug}/"`), `${meta.slug} no mapa do site`);
    }
    // a home mostra os mesmos 3 primeiros cards do blog
    const cards = (html) => [...html.matchAll(/<h3><a href="(\/blog\/[^"]+)">/g)].map((m) => m[1]);
    const home = lerArq('index.html', tmp);
    const gradeHome = home.slice(home.indexOf('id="home-latest-grid"'), home.indexOf('Ver todos os artigos'));
    assert.deepEqual(cards(gradeHome), cards(blog.slice(blog.indexOf('<div class="blog-grid">'))).slice(0, 3));
    if (agendados.length) assert.equal(cards(blog.slice(blog.indexOf('<div class="blog-grid">')))[0], `/blog/${agendados[agendados.length - 1].slug}/`);
    // rodar de novo não muda nada
    const antes = sitemap + blog + mapa;
    assert.deepEqual(executar(tmp, '2099-12-31'), []);
    assert.equal(lerArq('sitemap.xml', tmp) + lerArq('blog/index.html', tmp) + lerArq('mapa-do-site/index.html', tmp), antes);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('simulação: a caixa "Série" lista só os artigos que já saíram', () => {
  const tmp = copiaDoSite();
  try {
    const datas = [...new Set(agendados.map((m) => m.publicar_em))];
    for (const dia of datas) {
      executar(tmp, dia);
      const membros = publicados(tmp).filter((s) => /<meta name="jb-serie" content="/.test(lerArq(`blog/${s}/index.html`, tmp)));
      const porSerie = {};
      for (const s of membros) {
        const html = lerArq(`blog/${s}/index.html`, tmp);
        const serie = html.match(/<meta name="jb-serie" content="([^"]+)">/)[1];
        (porSerie[serie] = porSerie[serie] || []).push({ s, html });
      }
      for (const lista of Object.values(porSerie)) {
        for (const { s, html } of lista) {
          const caixa = html.match(/<nav class="serie-box"[^>]*>[\s\S]*?<\/nav>/)[0];
          assert.equal(/ hidden>/.test(caixa.split('\n')[0]), lista.length < 2, `${s} em ${dia}: caixa escondida só com menos de 2 artigos`);
          assert.equal((caixa.match(/<li>/g) || []).length, lista.length, `${s} em ${dia}: itens da série`);
          assert.equal((caixa.match(/aria-current="page"/g) || []).length, 1, `${s} em ${dia}: marca a página atual`);
          for (const o of lista) if (o.s !== s) assert.ok(caixa.includes(`href="/blog/${o.s}/"`), `${s} em ${dia}: link para ${o.s}`);
        }
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
