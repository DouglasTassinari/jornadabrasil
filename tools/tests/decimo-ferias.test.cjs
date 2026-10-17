// 13º salário e férias — regras oficiais de 2026, contas feitas à mão.
//
// 13º: Lei 4.090/1962 (1/12 da remuneração por mês trabalhado; fração de 15 dias ou mais
// conta como mês) e Lei 4.749/1965 (1ª parcela = metade, sem descontos; 2ª parcela com
// INSS e IRRF). INSS do 13º é calculado em separado (Lei 8.212/1991, art. 28, § 7º).
// O IRRF do 13º é exclusivo na fonte e também recebe o redutor de 2026
// (Lei 9.250/1995, art. 3º-A, § 3º, incluído pela Lei 15.270/2025).
//
// Férias: CF, art. 7º, XVII (+ 1/3); CLT, art. 143 (abono: vender até 1/3 dos dias).
// O abono e o 1/3 dele não pagam INSS (Lei 8.212/1991, art. 28, § 9º, "e", 6) nem IRRF.
// Férias gozadas + 1/3 pagam INSS e IRRF, calculados em separado do salário do mês.
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor } = require('./carregar.cjs');

const E = motor();

test('13º integral sem imposto de renda', () => {
  // 3.000 × 12/12 = 3.000. INSS 248,60 (ver inss-irrf). IRRF: base 3.000 − 607,20 = 2.392,80 → isento.
  const r = E.decimoTerceiro({ bruto: 3000, meses: 12 });
  assert.equal(r.bruto13, 3000);
  assert.equal(r.inss.valor, 248.60);
  assert.equal(r.irrf.valor, 0);
  assert.equal(r.primeira, 1500);          // metade, sem desconto
  assert.equal(r.liquidoTotal, 2751.40);   // 3.000 − 248,60
  assert.equal(r.segunda, 1251.40);        // 2.751,40 − 1.500
});

test('13º proporcional (6 avos)', () => {
  // 2.400 ÷ 12 × 6 = 1.200 → INSS 1.200 × 7,5% = 90,00; sem IR.
  const r = E.decimoTerceiro({ bruto: 2400, meses: 6 });
  assert.equal(r.bruto13, 1200);
  assert.equal(r.inss.valor, 90);
  assert.equal(r.primeira, 600);
  assert.equal(r.liquidoTotal, 1110);
  assert.equal(r.segunda, 510);
});

test('13º na faixa de transição do IR recebe o redutor', () => {
  // 6.000: INSS 641,51; IRRF tabela 564,85 − redução 179,75 = 385,10 (mesma conta do salário mensal)
  const r = E.decimoTerceiro({ bruto: 6000, meses: 12 });
  assert.equal(r.inss.valor, 641.51);
  assert.equal(r.irrf.valor, 385.10);
  assert.equal(r.liquidoTotal, 4973.39);   // 6.000 − 641,51 − 385,10
  assert.equal(r.primeira, 3000);
  assert.equal(r.segunda, 1973.39);
});

test('13º alto com dependente', () => {
  // 12.000: INSS no teto 988,09. Deduções 988,09 + 189,59 = 1.177,68 → base 10.822,32.
  // 10.822,32 × 27,5% − 908,73 = 2.067,408 → 2.067,41. Sem redutor (acima de 7.350).
  const r = E.decimoTerceiro({ bruto: 12000, meses: 12, deps: 1 });
  assert.equal(r.inss.valor, 988.09);
  assert.equal(r.irrf.valor, 2067.41);
  assert.equal(r.liquidoTotal, 8944.50);
  assert.equal(r.primeira, 6000);
  assert.equal(r.segunda, 2944.50);
});

test('13º: avos ficam entre 0 e 12', () => {
  assert.equal(E.decimoTerceiro({ bruto: 3000, meses: 15 }).meses, 12);
  assert.equal(E.decimoTerceiro({ bruto: 3000, meses: -3 }).bruto13, 0);
});

test('férias de 30 dias com 1/3', () => {
  // 3.000 + 1/3 (1.000) = 4.000 de base. INSS 368,60. IR: rendimento até 5.000 → zero.
  const r = E.ferias({ bruto: 3000, dias: 30 });
  assert.equal(r.valorGozo, 3000);
  assert.equal(r.tercoGozo, 1000);
  assert.equal(r.baseTributavel, 4000);
  assert.equal(r.inss.valor, 368.60);
  assert.equal(r.irrf.valor, 0);
  assert.equal(r.liquido, 3631.40);
});

test('férias com venda de 10 dias (abono pecuniário)', () => {
  // 4.500 ÷ 30 = 150 por dia. Gozo 20 dias = 3.000 + 1/3 = 1.000 → base 4.000.
  // Abono 10 dias = 1.500 + 1/3 = 500, sem INSS e sem IR.
  // Líquido: 3.000 + 1.000 + 1.500 + 500 − INSS 368,60 = 5.631,40.
  const r = E.ferias({ bruto: 4500, dias: 30, venderDias: 10 });
  assert.equal(r.diasGozo, 20);
  assert.equal(r.valorGozo, 3000);
  assert.equal(r.tercoGozo, 1000);
  assert.equal(r.abono, 1500);
  assert.equal(r.tercoAbono, 500);
  assert.equal(r.baseTributavel, 4000);
  assert.equal(r.inss.valor, 368.60);
  assert.equal(r.irrf.valor, 0);
  assert.equal(r.liquido, 5631.40);
});

test('férias com imposto de renda', () => {
  // 6.000 + 2.000 = 8.000. INSS 921,51. Base IR 8.000 − 921,51 = 7.078,49.
  // 7.078,49 × 27,5% − 908,73 = 1.037,85475 → 1.037,85 (sem redutor: acima de 7.350).
  const r = E.ferias({ bruto: 6000, dias: 30 });
  assert.equal(r.inss.valor, 921.51);
  assert.equal(r.irrf.valor, 1037.85);
  assert.equal(r.liquido, 6040.64);
});

test('férias de 15 dias', () => {
  // 4.500 ÷ 30 × 15 = 2.250 + 1/3 (750) = 3.000. INSS 248,60. Sem IR.
  const r = E.ferias({ bruto: 4500, dias: 15 });
  assert.equal(r.valorGozo, 2250);
  assert.equal(r.tercoGozo, 750);
  assert.equal(r.liquido, 2751.40);
});

test('férias: no máximo 30 dias e venda de no máximo 10 (CLT, art. 130 e 143)', () => {
  assert.equal(E.ferias({ bruto: 3000, dias: 40 }).dias, 30);
  assert.equal(E.ferias({ bruto: 3000, dias: 30, venderDias: 15 }).venderDias, 10);
});
