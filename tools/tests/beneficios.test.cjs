// Seguro-desemprego, auxílio-doença e salário-maternidade — regras oficiais de 2026.
//
// Seguro-desemprego (tabela do MTE a partir de 11/01/2026, Lei 7.998/1990 e
// Resolução CODEFAT 957/2022): média dos 3 últimos salários.
//   até R$ 2.222,17                → 80% da média
//   de R$ 2.222,18 a R$ 3.703,99   → R$ 1.777,74 + 50% do que passar de R$ 2.222,17
//   acima de R$ 3.703,99           → R$ 2.518,65 (teto)
//   nunca abaixo do salário mínimo (R$ 1.621,00).
// Carência e parcelas dependem da solicitação (Lei 7.998/1990, art. 3º e art. 4º, § 2º):
//   1ª: mínimo 12 meses (12–23 → 4 parcelas; 24+ → 5)
//   2ª: mínimo 9 meses (9–11 → 3; 12–23 → 4; 24+ → 5)
//   3ª em diante: mínimo 6 meses (6–11 → 3; 12–23 → 4; 24+ → 5)
//
// Auxílio-doença (benefício por incapacidade temporária): 91% do salário de benefício
// (Lei 8.213/1991, art. 61), limitado ao teto do INSS; os 15 primeiros dias são pagos pela
// empresa (art. 60, § 3º). Nenhum benefício que substitui o salário pode ser menor que o
// salário mínimo (CF, art. 201, § 2º; Lei 8.213/1991, art. 33).
//
// Salário-maternidade da empregada CLT: remuneração integral (Lei 8.213/1991, art. 72),
// 120 dias (ou 180 na Empresa Cidadã). Sofre desconto de INSS e IRRF como salário.
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor } = require('./carregar.cjs');

const E = motor();

test('seguro-desemprego faixa 1: 80% da média, com piso no salário mínimo', () => {
  // média 2.200 → 80% = 1.760,00; 24 meses → 5 parcelas → 8.800,00
  const a = E.seguroDesemprego({ s1: 2200, s2: 2200, s3: 2200, formalTempo: 24 });
  assert.equal(a.media, 2200);
  assert.equal(a.parcela, 1760);
  assert.equal(a.nParcelas, 5);
  assert.equal(a.total, 8800);
  // média 2.000 → 80% = 1.600, abaixo do mínimo → 1.621,00; 12 meses → 4 parcelas
  const b = E.seguroDesemprego({ s1: 2000, s2: 2000, s3: 2000, formalTempo: 12 });
  assert.equal(b.parcela, 1621);
  assert.equal(b.nParcelas, 4);
  assert.equal(b.total, 6484);
});

test('seguro-desemprego faixa 2: valor fixo + 50% do excedente', () => {
  // salários 3.000 + 3.200 + 3.466,51 = 9.666,51 ÷ 3 = 3.222,17
  // 1.777,74 + (3.222,17 − 2.222,17) × 50% = 1.777,74 + 500 = 2.277,74; 6 meses na 3ª solicitação → 3 parcelas
  const r = E.seguroDesemprego({ s1: 3000, s2: 3200, s3: 3466.51, formalTempo: 6, solicitacao: 3 });
  assert.equal(r.media, 3222.17);
  assert.equal(r.parcela, 2277.74);
  assert.equal(r.nParcelas, 3);
  assert.equal(r.total, 6833.22);
  // no limite da faixa: 1.777,74 + (3.703,99 − 2.222,17) × 50% = 1.777,74 + 740,91 = 2.518,65
  assert.equal(E.seguroDesemprego({ s1: 3703.99, s2: 3703.99, s3: 3703.99 }).parcela, 2518.65);
});

test('seguro-desemprego faixa 3: teto de R$ 2.518,65', () => {
  const r = E.seguroDesemprego({ s1: 5000, s2: 5000, s3: 5000, formalTempo: 30 });
  assert.equal(r.parcela, 2518.65);
  assert.equal(r.nParcelas, 5);
  assert.equal(r.total, 12593.25);
});

test('seguro-desemprego: carência e parcelas mudam conforme a solicitação', () => {
  // Lei 7.998/1990, art. 3º (mínimo de meses) e art. 4º, § 2º (parcelas)
  const n = (solicitacao, meses) =>
    E.seguroDesemprego({ s1: 3000, s2: 3000, s3: 3000, formalTempo: meses, solicitacao }).nParcelas;
  // 1ª solicitação: mínimo de 12 meses; 12 a 23 → 4; 24 ou mais → 5
  assert.equal(n(1, 11), 0);
  assert.equal(n(1, 12), 4);
  assert.equal(n(1, 23), 4);
  assert.equal(n(1, 24), 5);
  // 2ª solicitação: mínimo de 9 meses; 9 a 11 → 3; 12 a 23 → 4; 24 ou mais → 5
  assert.equal(n(2, 8), 0);
  assert.equal(n(2, 9), 3);
  assert.equal(n(2, 11), 3);
  assert.equal(n(2, 12), 4);
  assert.equal(n(2, 24), 5);
  // 3ª em diante: mínimo de 6 meses; 6 a 11 → 3; 12 a 23 → 4; 24 ou mais → 5
  assert.equal(n(3, 5), 0);
  assert.equal(n(3, 6), 3);
  assert.equal(n(3, 11), 3);
  assert.equal(n(3, 12), 4);
  assert.equal(n(3, 60), 5);
});

test('seguro-desemprego: sem a carência mínima não há parcelas', () => {
  const r = E.seguroDesemprego({ s1: 3000, s2: 3000, s3: 3000, formalTempo: 10, solicitacao: 1 });
  assert.equal(r.temDireito, false);
  assert.equal(r.minimoMeses, 12);
  assert.equal(r.total, 0);
  // quem não informa a solicitação é tratado como 1ª (a regra mais exigente)
  assert.equal(E.seguroDesemprego({ s1: 3000, s2: 3000, s3: 3000, formalTempo: 10 }).nParcelas, 0);
});

test('seguro-desemprego na tela: pergunta a solicitação e explica a carência', () => {
  const campo = E.CALCS.seguro.campos.find((c) => c.id === 'solicitacao');
  assert.deepEqual(campo.opcoes.map((o) => o.v), ['1', '2', '3']);
  const base = { s1: 2200, s2: 2200, s3: 2200 };
  // 8 meses na 1ª solicitação: sem direito, com a regra dos 12 meses na mensagem
  assert.match(E.CALCS.seguro.calcular({ ...base, formalTempo: 8, solicitacao: '1' }).erro, /12 meses/);
  // 8 meses na 2ª: ainda falta (precisa de 9)
  assert.match(E.CALCS.seguro.calcular({ ...base, formalTempo: 8, solicitacao: '2' }).erro, /9 meses/);
  // 8 meses na 3ª: 3 parcelas de 2.200 × 80% = 1.760 → 5.280
  const r = E.CALCS.seguro.calcular({ ...base, formalTempo: 8, solicitacao: '3' });
  assert.equal(r.erro, undefined);
  assert.equal(r.destaque.valor, 5280);
  assert.equal(r.blocos[0].linhas.length, 3);
});

test('auxílio-doença: 15 dias pela empresa e o resto pelo INSS', () => {
  // 3.000 × 91% = 2.730,00. Empresa: 3.000 ÷ 30 × 15 = 1.500. INSS: 2.730 ÷ 30 × 15 = 1.365.
  const r = E.auxilioDoenca({ salarioBruto: 3000, afastamento: 30 });
  assert.equal(r.valorBenef, 2730);
  assert.equal(r.valorEmpregador, 1500);
  assert.equal(r.diasINSS, 15);
  assert.equal(r.valorINSS, 1365);
});

test('auxílio-doença: salário acima do teto usa o teto do INSS', () => {
  // 8.475,55 × 91% = 7.712,7505 → 7.712,75. Empresa: 10.000 ÷ 30 × 15 = 5.000.
  // 45 dias: INSS paga 30 dias = 7.712,75.
  const r = E.auxilioDoenca({ salarioBruto: 10000, afastamento: 45 });
  assert.equal(r.salBeneficio, 8475.55);
  assert.equal(r.valorBenef, 7712.75);
  assert.equal(r.valorEmpregador, 5000);
  assert.equal(r.valorINSS, 7712.75);
});

test('auxílio-doença: afastamento curto fica todo com a empresa', () => {
  const r = E.auxilioDoenca({ salarioBruto: 3000, afastamento: 10 });
  assert.equal(r.valorEmpregador, 1000);
  assert.equal(r.diasINSS, 0);
  assert.equal(r.valorINSS, 0);
});

test('auxílio-doença: nunca abaixo do salário mínimo (CF, art. 201, § 2º)', () => {
  // 1.621 × 91% = 1.475,11, abaixo do mínimo → o benefício mensal sobe para 1.621,00.
  // 30 dias de afastamento: INSS paga 15 dias = 1.621 ÷ 30 × 15 = 810,50.
  const r = E.auxilioDoenca({ salarioBruto: 1621, afastamento: 30 });
  assert.equal(r.valorBenef, 1621);
  assert.equal(r.valorINSS, 810.50);
  // 1.700 × 91% = 1.547,00 → também sobe para 1.621,00
  assert.equal(E.auxilioDoenca({ salarioBruto: 1700, afastamento: 30 }).valorBenef, 1621);
  // na tela: empresa 810,50 + INSS 810,50 = 1.621,00, com o piso explicado na memória de cálculo
  const tela = E.CALCS.auxilio.calcular({ salarioBruto: 1621, afastamento: 30, mesesContrib: 12 });
  assert.equal(tela.destaque.valor, 1621);
  assert.ok(tela.memoria.some((m) => m.includes('salário mínimo')));
});

test('salário-maternidade de 120 dias', () => {
  // 3.000: INSS 248,60; IR zero; líquido 2.751,40 × 4 meses = 11.005,60
  const r = E.salarioMaternidade({ salarioBruto: 3000, duracao: 120 });
  assert.equal(r.valorMensal, 3000);
  assert.equal(r.inss.valor, 248.60);
  assert.equal(r.irrf.valor, 0);
  assert.equal(r.liquido, 2751.40);
  assert.equal(r.periodos, 4);
  assert.equal(r.totalLiquido, 11005.60);
});

test('salário-maternidade de 180 dias (Empresa Cidadã), salário acima do teto', () => {
  // CLT recebe a remuneração integral, sem limite do teto do INSS.
  // 10.000: INSS 988,09; IRRF 1.569,55; líquido 7.442,36 × 6 = 44.654,16
  const r = E.salarioMaternidade({ salarioBruto: 10000, duracao: 180 });
  assert.equal(r.valorMensal, 10000);
  assert.equal(r.inss.valor, 988.09);
  assert.equal(r.irrf.valor, 1569.55);
  assert.equal(r.periodos, 6);
  assert.equal(r.totalLiquido, 44654.16);
});
