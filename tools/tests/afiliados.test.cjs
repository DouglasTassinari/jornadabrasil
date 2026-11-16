// Recomendações com links de afiliado: nada aparece sem link próprio, e todo item ligado segue as regras.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');
const A = require(path.join(raiz, 'assets/js/afiliados.js'));

test('cada recomendação tem identificador único, páginas existentes e textos', () => {
  const ids = new Set();
  for (const a of A.AFILIADOS) {
    assert.ok(a.id && !ids.has(a.id), 'id único: ' + a.id);
    ids.add(a.id);
    assert.ok(a.titulo && a.texto && a.cta, a.id + ': textos');
    assert.ok(a.paginas.length > 0, a.id + ': páginas');
    for (const p of a.paginas) {
      const arq = path.join(raiz, p.replace(/^\//, ''), 'index.html');
      assert.ok(fs.existsSync(arq), `${a.id}: a página ${p} não existe`);
    }
    // não pode prometer ganho nem usar apelo de clique
    assert.doesNotMatch(a.texto + a.titulo + a.cta, /garant|clique aqui|ganhe dinheiro|renda extra garantida|lucro certo/i, a.id + ': texto promocional exagerado');
  }
});

test('só aparece o que está ligado e tem link https', () => {
  for (const a of A.ligados()) {
    assert.equal(a.ativo, true);
    assert.match(a.url, /^https:\/\//);
  }
  assert.equal(A.para('/pagina-que-nao-existe/'), null);
});

test('o bloco traz o rótulo de publicidade, rel sponsored e o link de explicação', () => {
  const h = A.html({ id: 'x', titulo: 'T & <b>', texto: 'txt', cta: 'Ver', url: 'https://exemplo.com/?a=1&b=2' });
  assert.match(h, /Publicidade · link de afiliado/);
  assert.match(h, /rel="sponsored nofollow noopener"/);
  assert.match(h, /href="\/publicidade\/"/);
  assert.match(h, /T &amp; &lt;b&gt;/);
  assert.match(h, /a=1&amp;b=2/);
});

test('a página /publicidade/ existe e o script é carregado nas calculadoras', () => {
  assert.ok(fs.existsSync(path.join(raiz, 'publicidade', 'index.html')));
  for (const p of ['pj-vs-clt', 'decimo-terceiro', 'imposto-de-renda-salario', 'rescisao']) {
    assert.match(fs.readFileSync(path.join(raiz, p, 'index.html'), 'utf8'), /assets\/js\/afiliados\.js/, p);
  }
});
