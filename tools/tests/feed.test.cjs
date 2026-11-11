// Feed RSS do blog (tools/gerar-feed.cjs) e o publicador de agendados mantendo o feed em dia.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');
const { coletar, montarFeed, rfc822 } = require('../gerar-feed.cjs');
const { executar, lerAgendados } = require('../publicar-agendados.cjs');

const artigos = fs.readdirSync(path.join(raiz, 'blog'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(raiz, 'blog', d.name, 'index.html')))
  .map((d) => d.name);

test('o feed traz todos os artigos publicados, com título, data e descrição', () => {
  const itens = coletar(raiz);
  assert.deepEqual(itens.map((i) => i.slug).sort(), [...artigos].sort());
  for (const i of itens) {
    assert.ok(i.titulo.length >= 10, `${i.slug}: título`);
    assert.match(i.publicado, /^\d{4}-\d{2}-\d{2}$/, `${i.slug}: data`);
    assert.ok(i.descricao.length >= 50, `${i.slug}: descrição`);
    assert.doesNotMatch(i.titulo, /Jornada Brasil$/, `${i.slug}: título sem o nome do site`);
  }
  // do mais novo para o mais antigo
  const datas = itens.map((i) => i.publicado);
  assert.deepEqual(datas, [...datas].sort().reverse());
});

test('o arquivo feed.xml publicado está em dia com os artigos', () => {
  const noDisco = fs.readFileSync(path.join(raiz, 'feed.xml'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(noDisco, montarFeed(coletar(raiz)), 'rode: node tools/gerar-feed.cjs');
});

test('o XML escapa caracteres especiais e usa datas RFC 822', () => {
  const xml = montarFeed([{ slug: 'x', url: 'https://jornadabrasil.com.br/blog/x/', titulo: 'PJ & CLT <2026>', descricao: 'a "b"', publicado: '2026-11-11', atualizado: '2026-11-11', categoria: 'A&B' }]);
  assert.match(xml, /<title>PJ &amp; CLT &lt;2026&gt;<\/title>/);
  assert.match(xml, /<description>a &quot;b&quot;<\/description>/);
  assert.match(xml, /<category>A&amp;B<\/category>/);
  assert.equal(rfc822('2026-11-11'), 'Wed, 11 Nov 2026 15:00:00 GMT');
});

test('publicar os agendados também atualiza o feed', () => {
  const agendados = lerAgendados(raiz);
  if (!agendados.length) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jb-feed-'));
  try {
    for (const item of ['blog', 'agendados', 'mapa-do-site']) fs.cpSync(path.join(raiz, item), path.join(tmp, item), { recursive: true });
    for (const arq of ['sitemap.xml', 'index.html', 'feed.xml']) fs.copyFileSync(path.join(raiz, arq), path.join(tmp, arq));
    executar(tmp, '2099-12-31');
    const feed = fs.readFileSync(path.join(tmp, 'feed.xml'), 'utf8');
    for (const m of agendados) assert.ok(feed.includes(`<link>https://jornadabrasil.com.br/blog/${m.slug}/</link>`), `${m.slug} no feed`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
