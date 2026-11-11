// Quinto dia útil — datas conferidas à mão no calendário.
//
// Regra: o salário mensal vence no 5º dia útil do mês seguinte (CLT, art. 459, § 1º).
// O sábado conta; domingos e feriados não (Instrução Normativa MTP nº 2/2021, art. 14).
// Feriados nacionais: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11, 25/12 e a Sexta-feira Santa.
//
// Exemplos:
//   dez/2026: ter 1, qua 2, qui 3, sex 4, sáb 5 → sábado, 5/12
//   jan/2027: 1 é feriado, sáb 2, (dom 3), seg 4, ter 5, qua 6, qui 7 → quinta, 7/1
//   nov/2026: (dom 1), 2 é Finados, ter 3 ... sáb 7 → sábado, 7/11
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { raiz } = require('./carregar.cjs');

const Q = require(path.join(raiz, 'assets/js/quinto-dia-util.js'));

test('Páscoa e Sexta-feira Santa', () => {
  assert.equal(Q.pascoa(2025), '2025-04-20');
  assert.equal(Q.pascoa(2026), '2026-04-05');
  assert.equal(Q.pascoa(2027), '2027-03-28');
  assert.equal(Q.pascoa(2028), '2028-04-16');
  assert.equal(Q.feriadosNacionais(2026)['2026-04-03'], 'Sexta-feira Santa (municipal)');
  assert.equal(Q.feriadosNacionais(2027)['2027-03-26'], 'Sexta-feira Santa (municipal)');
});

test('feriados nacionais incluem a Consciência Negra (Lei 14.759/2023)', () => {
  const f = Q.feriadosNacionais(2026);
  assert.equal(Object.keys(f).length, 10);
  assert.ok(f['2026-11-20']);
  assert.ok(f['2026-11-02']);
  assert.equal(f['2026-02-17'], undefined); // Carnaval não é feriado nacional
});

test('quinto dia útil de cada mês, de novembro de 2026 a dezembro de 2027', () => {
  const esperado = {
    '2026-11': '2026-11-07', '2026-12': '2026-12-05',
    '2027-01': '2027-01-07', '2027-02': '2027-02-05', '2027-03': '2027-03-05', '2027-04': '2027-04-06',
    '2027-05': '2027-05-07', '2027-06': '2027-06-05', '2027-07': '2027-07-06', '2027-08': '2027-08-06',
    '2027-09': '2027-09-06', '2027-10': '2027-10-06', '2027-11': '2027-11-06', '2027-12': '2027-12-06',
  };
  for (const r of Q.tabela(2026, 11, 14)) {
    const chave = r.ano + '-' + String(r.mes).padStart(2, '0');
    assert.equal(r.data, esperado[chave], chave);
  }
});

test('dezembro de 2026 cai num sábado', () => {
  const r = Q.diaUtil(2026, 12);
  assert.equal(r.data, '2026-12-05');
  assert.equal(r.diaSemana, 'sábado');
  assert.equal(r.sabado, true);
  assert.deepEqual(r.contados, ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05']);
});

test('janeiro de 2027 pula o feriado do dia 1 e o domingo', () => {
  const r = Q.diaUtil(2027, 1);
  assert.equal(r.data, '2027-01-07');
  assert.equal(r.diaSemana, 'quinta-feira');
  assert.deepEqual(r.pulados.map((p) => p.data), ['2027-01-01', '2027-01-03']);
});

test('sem contar sábado (acordo da categoria) e com feriado local', () => {
  // dez/2026 sem sábado: ter 1, qua 2, qui 3, sex 4, (sáb 5, dom 6), seg 7
  assert.equal(Q.diaUtil(2026, 12, { sabadoUtil: false }).data, '2026-12-07');
  // feriado municipal no dia 3: ter 1, qua 2, sex 4, sáb 5, (dom 6), seg 7
  const r = Q.diaUtil(2026, 12, { feriadosExtras: '3' });
  assert.equal(r.data, '2026-12-07');
  assert.equal(r.pulados[0].motivo, 'feriado local');
});

test('leitura dos feriados locais digitados', () => {
  assert.deepEqual(Q.lerFeriadosExtras('20, 24/11, 2026-11-30, 31, x, 5/12', 2026, 11), ['2026-11-20', '2026-11-24', '2026-11-30']);
  assert.deepEqual(Q.lerFeriadosExtras('', 2026, 11), []);
  assert.deepEqual(Q.lerFeriadosExtras('3 3', 2026, 12), ['2026-12-03']);
});

test('textos: frase, compartilhamento e HTML', () => {
  const r = Q.diaUtil(2026, 12);
  assert.equal(Q.frase(r), 'O 5º dia útil de dezembro de 2026 é sábado, 5/12.');
  assert.match(Q.textoCompartilhar(r, 'https://x'), /Cai num sábado/);
  const h = Q.resultadoHTML(r);
  assert.match(h, /<strong>5\/12<\/strong> sábado/);
  assert.match(h, /o salário de novembro/);
  const j = Q.resultadoHTML(Q.diaUtil(2027, 1));
  assert.match(j, /o salário de dezembro de 2026/);
  assert.match(j, /Não contam: 1\/1 \(feriado: Confraternização Universal\), 3\/1 \(domingo\)/);
  const t = Q.tabelaHTML(Q.tabela(2026, 12, 2));
  assert.match(t, /id="dezembro-2026"/);
  assert.match(t, /<strong>7\/1<\/strong> \(quinta-feira\)/);
});
