// shared/jb-data.js — favoritos, histórico e orçamentos salvos no aparelho (localStorage).
// Roda no Node com um localStorage falso e um relógio controlado, para que cada item
// salvo tenha um horário diferente (como acontece no uso real).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');

const arquivo = path.join(raiz, 'shared/jb-data.js');
const DataReal = global.Date;

function localStorageFalso() {
  const dados = new Map();
  return {
    dados,
    cheio: false,
    getItem(k) { return dados.has(k) ? dados.get(k) : null; },
    setItem(k, v) {
      if (this.cheio) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      dados.set(k, String(v));
    },
    removeItem(k) { dados.delete(k); },
  };
}

// Relógio que anda 1 segundo a cada leitura.
function relogioFalso() {
  let agora = DataReal.UTC(2026, 9, 16, 12, 0, 0);
  class DataFalsa extends DataReal {
    constructor(...args) { if (args.length) super(...args); else { agora += 1000; super(agora); } }
    static now() { agora += 1000; return agora; }
  }
  global.Date = DataFalsa;
}

function novoJBData() {
  global.window = {};
  global.localStorage = localStorageFalso();
  relogioFalso();
  delete require.cache[require.resolve(arquivo)];
  require(arquivo);
  return global.window.JBData;
}

test.afterEach(() => { global.Date = DataReal; });

test('orçamentos: salvar, listar, abrir, atualizar e apagar', async () => {
  const J = novoJBData();
  const a = await J.saveOrcamento({ nome: 'Site', valor_hora: 80, preco_final: 1200, campoQueNaoExiste: 1 });
  assert.equal(a.error, null);
  assert.ok(a.data.id);
  assert.equal(a.data.nome, 'Site');
  assert.equal(a.data.campoQueNaoExiste, undefined); // só guarda os campos conhecidos
  const b = await J.saveOrcamento({ valor_hora: 50 });
  assert.equal(b.data.nome, 'Orçamento'); // nome padrão

  const lista = await J.listOrcamentos();
  assert.deepEqual(lista.data.map((o) => o.id), [b.data.id, a.data.id]); // mais novo primeiro

  const aberto = await J.getOrcamento(a.data.id);
  assert.equal(aberto.data.preco_final, 1200);

  const upd = await J.updateOrcamento(a.data.id, { preco_final: 1500 });
  assert.equal(upd.data.preco_final, 1500);
  assert.notEqual(upd.data.updated_at, upd.data.created_at);
  assert.equal((await J.getOrcamento(a.data.id)).data.preco_final, 1500);

  assert.equal((await J.deleteOrcamento(a.data.id)).error, null);
  assert.equal((await J.listOrcamentos()).data.length, 1);
  assert.match((await J.getOrcamento(a.data.id)).error.message, /não encontrado/i);
  assert.match((await J.updateOrcamento('nao-existe', { nome: 'x' })).error.message, /não encontrado/i);
});

test('histórico: salvar, filtrar por tipo, atualizar e apagar', async () => {
  const J = novoJBData();
  const r1 = await J.saveHistorico({ tipo: 'rescisao', titulo: 'Rescisão', valor_principal: 1000 });
  const r2 = await J.saveHistorico({ tipo: 'ferias', titulo: 'Férias', valor_principal: 2000 });
  const r3 = await J.saveHistorico({ titulo: 'Sem tipo' });
  assert.equal(r3.data.tipo, 'calculo'); // tipo padrão

  assert.deepEqual((await J.listHistorico()).data.map((h) => h.id), [r3.data.id, r2.data.id, r1.data.id]);
  assert.deepEqual((await J.listHistorico('ferias')).data.map((h) => h.id), [r2.data.id]);

  await J.updateHistorico(r1.data.id, { titulo: 'Rescisão revisada' });
  const rescisoes = (await J.listHistorico('rescisao')).data;
  assert.equal(rescisoes[0].titulo, 'Rescisão revisada');

  await J.deleteHistorico(r2.data.id);
  assert.equal((await J.listHistorico()).data.length, 2);
  assert.equal((await J.listHistorico('ferias')).data.length, 0);
});

test('histórico: guarda no máximo 200 cálculos e descarta os mais antigos', async () => {
  const J = novoJBData();
  const ids = [];
  for (let i = 1; i <= 205; i++) ids.push((await J.saveHistorico({ tipo: 'liquido', titulo: 'Cálculo ' + i })).data.id);
  const lista = (await J.listHistorico()).data;
  assert.equal(lista.length, 200);
  assert.equal(lista[0].id, ids[204]);       // o mais novo continua lá
  assert.equal(lista[199].id, ids[5]);       // os 5 mais antigos saíram
  assert.ok(!lista.some((h) => ids.slice(0, 5).includes(h.id)));
});

test('favoritos: não duplica e remove pelo tipo + endereço', async () => {
  const J = novoJBData();
  const a = await J.addFavorito({ slug: 'rescisao', titulo: 'Rescisão', url: '/rescisao/' });
  const repetido = await J.addFavorito({ slug: 'rescisao', titulo: 'Outro título' });
  assert.equal(repetido.data.id, a.data.id); // devolve o mesmo, sem criar outro
  assert.equal(a.data.tipo, 'calculadora');  // tipo padrão
  await J.addFavorito({ tipo: 'artigo', slug: 'rescisao', titulo: 'Artigo sobre rescisão' });

  assert.equal((await J.listFavoritos()).data.length, 2); // mesmo endereço, tipos diferentes
  assert.equal((await J.listFavoritos('calculadora')).data.length, 1);

  await J.removeFavorito('calculadora', 'rescisao');
  const sobra = (await J.listFavoritos()).data;
  assert.equal(sobra.length, 1);
  assert.equal(sobra[0].tipo, 'artigo');
});

test('dados corrompidos no aparelho não quebram a página', async () => {
  const J = novoJBData();
  global.localStorage.setItem('jb:historico', '{isto não é JSON');
  global.localStorage.setItem('jb:favoritos', '{"nao":"é lista"}');
  assert.deepEqual((await J.listHistorico()).data, []);
  assert.deepEqual((await J.listFavoritos()).data, []);
  // e dá para salvar de novo por cima
  assert.equal((await J.saveHistorico({ titulo: 'novo' })).error, null);
  assert.equal((await J.listHistorico()).data.length, 1);
});

test('aparelho sem espaço: devolve erro em vez de travar', async () => {
  const J = novoJBData();
  global.localStorage.cheio = true;
  const r = await J.saveOrcamento({ nome: 'x' });
  assert.equal(r.data, null);
  assert.match(r.error.message, /sem espaço/i);
});
