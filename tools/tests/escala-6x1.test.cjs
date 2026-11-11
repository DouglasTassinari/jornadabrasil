// Calculadora da escala 6x1 para 5x2 — contas feitas à mão.
//
// Regras (Emenda Constitucional 141/2026): 2 folgas por semana e até 42 h a partir
// de 16/12/2026; até 40 h a partir de 16/12/2027; quem já faz 40 h ou menos não
// tem a jornada reduzida (art. 4º); a 12x36 continua (CLT, art. 59-A).
//
// Cenário padrão: 30 dias de férias e 9 feriados → base = 365 − 30 − 9 = 326 dias.
//   6x1: 326 × 6 ÷ 7 = 279,43 → 279 dias de trabalho; 365 − 279 = 86 sem trabalho
//   5x2: 326 × 5 ÷ 7 = 232,86 → 233 dias; 132 sem trabalho → ganho de 46 dias
//   horas: 326 × 44 ÷ 7 = 2.049,14 → 2.049; × 42 ÷ 7 = 1.956; × 40 ÷ 7 = 1.862,86 → 1.863
//   tempo acordado: (2.049,14 + 279,43) ÷ (365 × 16) = 39,9% → 40%
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');

const E = require(path.join(raiz, 'assets/js/escala-6x1.js'));

test('6x1 padrão: 46 dias a mais sem trabalhar por ano', () => {
  const r = E.calcular({});
  assert.equal(r.caso, 'ganha-dias');
  assert.equal(r.hoje.escala, '6x1');
  assert.equal(r.hoje.diasTrabalho, 279);
  assert.equal(r.hoje.diasLivres, 86);
  assert.equal(r.r2026.escala, '5x2');
  assert.equal(r.r2026.diasTrabalho, 233);
  assert.equal(r.r2026.diasLivres, 132);
  assert.equal(r.ganho.diasPorAno, 46);
  assert.equal(r.ganho.dias10Anos, 460);
  assert.equal(r.ganho.tempo10Anos, '1 ano e 3 meses');
});

test('6x1 padrão: horas de trabalho, trânsito e tempo acordado', () => {
  const r = E.calcular({});
  assert.equal(r.hoje.horasTrabalho, 2049);
  assert.equal(r.r2026.horasSemana, 42);
  assert.equal(r.r2026.horasTrabalho, 1956);
  assert.equal(r.r2027.horasSemana, 40);
  assert.equal(r.r2027.horasTrabalho, 1863);
  assert.equal(r.ganho.horas2026, 93);
  assert.equal(r.ganho.horas2027, 186);
  // 1 h por dia de trabalho: 279,43 h → 279; 232,86 h → 233
  assert.equal(r.hoje.horasDeslocamento, 279);
  assert.equal(r.r2026.horasDeslocamento, 233);
  assert.equal(r.ganho.deslocamentoHoras, 46);
  assert.equal(r.hoje.pctAcordado, 40);
  assert.equal(r.r2026.pctAcordado, 37);
  assert.equal(r.r2027.pctAcordado, 36);
});

test('calendário puro (sem férias e sem feriados): 313 contra 261 dias', () => {
  // 365 × 6 ÷ 7 = 312,86 → 313; 365 × 5 ÷ 7 = 260,71 → 261
  const r = E.calcular({ ferias: false, feriados: 0, deslocamentoMin: 0 });
  assert.equal(r.hoje.diasTrabalho, 313);
  assert.equal(r.hoje.diasLivres, 52);
  assert.equal(r.r2026.diasTrabalho, 261);
  assert.equal(r.r2026.diasLivres, 104);
  assert.equal(r.ganho.diasPorAno, 52);
  assert.equal(r.ganho.tempo10Anos, '1 ano e 5 meses');
  assert.equal(r.hoje.horasDeslocamento, 0);
});

test('valor da hora: divisores 220, 210 e 200', () => {
  // 2.200 ÷ 220 = 10,00; 2.200 ÷ 210 = 10,476 → 10,48; 2.200 ÷ 200 = 11,00
  const r = E.calcular({ salario: '2.200' });
  assert.equal(r.valorHora.hoje, 10);
  assert.equal(r.valorHora.r2026, 10.48);
  assert.equal(r.valorHora.r2027, 11);
  assert.equal(r.valorHora.aumentoPct2026, 4.8);
  assert.equal(r.valorHora.aumentoPct2027, 10);
  assert.equal(E.calcular({}).valorHora, null);
});

test('5x2 com 44 h: só as horas diminuem', () => {
  const r = E.calcular({ escala: '5x2' });
  assert.equal(r.caso, 'so-horas');
  assert.equal(r.ganho.diasPorAno, 0);
  assert.equal(r.ganho.horas2026, 93);
  assert.equal(r.ganho.horas2027, 186);
});

test('6 dias com 36 h (telemarketing): ganha a folga, a jornada não muda (art. 4º)', () => {
  const r = E.calcular({ escala: 'outra', dias: 6, horas: 36, salario: 1800 });
  assert.equal(r.caso, 'ganha-dias');
  assert.equal(r.ganho.diasPorAno, 46);
  assert.equal(r.r2026.horasSemana, 36);
  assert.equal(r.ganho.horas2026, 0);
  assert.equal(r.ganho.horas2027, 0);
  // 1.800 ÷ 180 = 10,00 nas três etapas
  assert.equal(r.valorHora.hoje, 10);
  assert.equal(r.valorHora.r2027, 10);
});

test('5x2 com 40 h já cumpre a nova regra', () => {
  const r = E.calcular({ escala: '5x2', horas: 40 });
  assert.equal(r.caso, 'ja-cumpre');
  assert.equal(r.ganho.diasPorAno, 0);
  assert.equal(r.ganho.horas2027, 0);
});

test('12x36: plantões de 12 h em dias alternados, feriados compensados', () => {
  // (365 − 30) ÷ 2 = 167,5 → 168 plantões; 365 − 168 = 197; 167,5 × 12 = 2.010 h
  const r = E.calcular({ escala: '12x36', feriados: 9 });
  assert.equal(r.caso, '12x36');
  assert.equal(r.hoje.diasTrabalho, 168);
  assert.equal(r.hoje.diasLivres, 197);
  assert.equal(r.hoje.horasTrabalho, 2010);
  assert.equal(r.ganho.diasPorAno, 0);
});

test('comparação entre escalas no cenário padrão', () => {
  const c = E.calcular({}).comparacao;
  assert.deepEqual(c.map((x) => [x.escala, x.diasLivres]), [['6x1', 86], ['5x2', 132], ['12x36', 197], ['4x3', 179]]);
  assert.equal(c[3].hipotetica, true);
});

test('normalização: limites dos campos', () => {
  const n = E.normalizar({ escala: 'xyz', horas: 60, feriados: -3, deslocamentoMin: 9999 });
  assert.equal(n.escala, '6x1');
  assert.equal(n.horas, 44);
  assert.equal(n.feriados, 0);
  assert.equal(n.deslocamentoMin, 600);
  assert.equal(E.normalizar({ escala: 'outra', dias: 7 }).dias, 6);
  assert.equal(E.normalizar({ ferias: '0' }).ferias, false);
  assert.equal(E.normalizar({}).ferias, true);
});

test('leitura de valores digitados em reais', () => {
  assert.equal(E.parseNumero('2.200'), 2200);
  assert.equal(E.parseNumero('2.200,50'), 2200.5);
  assert.equal(E.parseNumero('2200,5'), 2200.5);
  assert.equal(E.parseNumero('2200.50'), 2200.5);
  assert.equal(E.parseNumero('R$ 3.000'), 3000);
  assert.equal(E.parseNumero('1.234.567'), 1234567);
  assert.equal(E.parseNumero(''), null);
  assert.equal(E.parseNumero('abc'), null);
});

test('tempo em anos e meses', () => {
  assert.equal(E.textoTempo(460), '1 ano e 3 meses');
  assert.equal(E.textoTempo(365), '1 ano');
  assert.equal(E.textoTempo(730), '2 anos');
  assert.equal(E.textoTempo(31), '1 mês');
  assert.equal(E.textoTempo(30), '30 dias');
});

test('texto para compartilhar e card batem com o resultado', () => {
  const r = E.calcular({});
  const t = E.textoCompartilhar(r, 'https://exemplo');
  assert.match(t, /ganho 46 dias sem trabalhar por ano/);
  assert.match(t, /mais de 1 ano e 3 meses/);
  assert.ok(t.endsWith('https://exemplo'));
  const c = E.cartao(r);
  assert.equal(c.numero, '46');
  assert.deepEqual(c.fatos, ['Hoje: 279 dias de trabalho no ano', 'Na 5x2: 233 dias', 'Em 10 anos: mais de 1 ano e 3 meses de folga']);
  assert.equal(c.rodape, 'Estimativa com 30 dias de férias e 9 feriados de folga por ano');
});

test('resultado em HTML mostra os números e a hora quando há salário', () => {
  const h = E.resultadoHTML(E.calcular({ salario: 2200 }));
  assert.match(h, /<strong>46<\/strong> dias/);
  assert.match(h, /2\.049 h/);
  assert.match(h, /R\$ 10,48/);
  assert.match(h, /sobe 4,8% em dezembro de 2026 e 10% em dezembro de 2027/);
  assert.doesNotMatch(E.resultadoHTML(E.calcular({})), /Valor da sua hora/);
});
