const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { paginas, TRAVA_NOVA, AVISO, VERSAO } = require('../anuncios-para-todos.cjs');

const RAIZ = path.resolve(__dirname, '..', '..');
const comAnuncio = paginas(RAIZ)
  .map((arq) => ({ rel: path.relative(RAIZ, arq), html: fs.readFileSync(arq, 'utf8') }))
  .filter((p) => p.html.includes('adsbygoogle.js'));

// Roda a trava do <head> e o consent.js com um navegador de mentira.
function visitar(escolha) {
  const guardado = escolha ? { lgpd_consent: JSON.stringify({ ...escolha, ts: Date.now() }) } : {};
  const prontos = [];
  const sandbox = {
    localStorage: {
      getItem: (k) => guardado[k] ?? null,
      setItem: (k, v) => { guardado[k] = v; },
      removeItem: (k) => { delete guardado[k]; },
    },
    document: {
      addEventListener: (_, f) => prontos.push(f),
      querySelector: () => ({}),
      getElementById: () => null,
      body: { style: {} },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(TRAVA_NOVA.replace(/<\/?script>/g, ''), sandbox);
  const padrao = Array.from(sandbox.dataLayer[0]);
  vm.runInContext('function gtag(){dataLayer.push(arguments)}', sandbox);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets/js/consent.js'), 'utf8'), sandbox);
  prontos.forEach((f) => f());
  return { sandbox, padrao, ads: sandbox.adsbygoogle };
}

for (const [nome, escolha] of [['sem escolha', null], ['só essenciais', { ads: false, analytics: false }]]) {
  test(`anúncios: ${nome} vê anúncio sem personalização e sem cookie de publicidade`, () => {
    const { ads, padrao } = visitar(escolha);
    assert.equal(ads.pauseAdRequests, 0);
    assert.equal(ads.requestNonPersonalizedAds, 1);
    assert.equal(padrao[1], 'default');
    for (const sinal of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(padrao[2][sinal], 'denied');
  });
}

test('anúncios: quem aceitou vê anúncio personalizado', () => {
  const { ads, padrao } = visitar({ ads: true, analytics: true });
  assert.equal(ads.pauseAdRequests, 0);
  assert.equal(ads.requestNonPersonalizedAds, 0);
  assert.equal(padrao[2].ad_storage, 'granted');
});

test('anúncios: aceitar e depois recusar troca o tipo na mesma visita', () => {
  const { sandbox, ads } = visitar(null);
  sandbox.RC.acceptAll();
  assert.equal(ads.requestNonPersonalizedAds, 0);
  sandbox.RC.acceptEssential();
  assert.equal(ads.requestNonPersonalizedAds, 1);
  assert.equal(ads.pauseAdRequests, 0);
  const ultimo = Array.from(sandbox.dataLayer.at(-1));
  assert.equal(ultimo[2].ad_storage, 'denied');
});

test('anúncios: toda página com AdSense tem a regra nova antes do código do Google', () => {
  assert.ok(comAnuncio.length > 100);
  for (const { rel, html } of comAnuncio) {
    const regra = html.indexOf(TRAVA_NOVA);
    assert.ok(regra >= 0 && regra < html.indexOf('adsbygoogle.js'), rel);
    assert.ok(!html.includes('pauseAdRequests=p'), rel);
    assert.ok(html.includes(AVISO), `aviso de cookies: ${rel}`);
    assert.ok(html.includes(`consent.js?v=${VERSAO}`), `versão do consent.js: ${rel}`);
  }
});

test('anúncios: nenhum texto ainda promete anúncio só depois do aceite', () => {
  for (const rel of ['privacidade', 'cookies', 'publicidade']) {
    const html = fs.readFileSync(path.join(RAIZ, rel, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /solicitações de anúncio pausadas|só são (carregados|solicitados|pedidos) depois|mediante consentimento\)/, rel);
  }
});

test('análise: calcular preço e meu lucro só carregam GA4 e Clarity com consentimento', () => {
  for (const [escolha, esperado] of [[null, 0], [{ analytics: false, ads: false }, 0], [{ analytics: true, ads: false }, 2]]) {
    const carregados = [];
    const agendados = [];
    const guardado = escolha ? JSON.stringify({ ...escolha, ts: Date.now() }) : null;
    const prontos = [];
    const novo = () => ({ set src(v) { carregados.push(v); } });
    const sandbox = {
      localStorage: { getItem: () => guardado, setItem() {}, removeItem() {} },
      setTimeout: (f) => agendados.push(f),
      requestIdleCallback: (f) => agendados.push(f),
      document: {
        head: { appendChild() {} },
        body: { style: {} },
        createElement: novo,
        getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
        addEventListener: (nome, f) => (nome === 'DOMContentLoaded' ? prontos : agendados).push(f),
        removeEventListener() {},
        querySelector: () => null,
        getElementById: () => null,
      },
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'shared/jb-analytics.js'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets/js/consent.js'), 'utf8'), sandbox);
    prontos.forEach((f) => f());
    for (let i = 0; i < agendados.length; i++) agendados[i]();
    assert.equal(carregados.length, esperado, JSON.stringify(escolha));
  }
});
