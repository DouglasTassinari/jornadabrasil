// INSS, IRRF e salário líquido — regras oficiais de 2026.
//
// Os valores esperados foram calculados à mão a partir da lei (não da saída do código).
// Fontes:
//  - INSS: Portaria Interministerial MPS/MF nº 13/2026. Faixas: até 1.621,00 (7,5%);
//    até 2.902,84 (9%); até 4.354,27 (12%); até 8.475,55 (14%). Teto: 8.475,55.
//    EC 103/2019, art. 28, § 1º: cada alíquota incide só sobre a parte do salário
//    dentro da sua faixa. Arredondamos para o centavo no final.
//  - IRRF mensal: Lei 11.482/2007, art. 1º, XII (redação da Lei 15.191/2025). Dependente
//    R$ 189,59. Desconto simplificado R$ 607,20 (25% de 2.428,80) no lugar das deduções.
//  - Redutor 2026: Lei 9.250/1995, art. 3º-A (incluído pela Lei 15.270/2025): até R$ 5.000
//    o imposto zera; de R$ 5.000,01 a R$ 7.350 a redução é 978,62 − 0,133145 × rendimento;
//    acima de R$ 7.350 não há redução. A redução nunca passa do imposto da tabela.
//
// Imposto de cada faixa INSS cheia (usado nas contas abaixo):
//   faixa 1: 1.621,00 × 7,5%                  = 121,575
//   faixa 2: (2.902,84 − 1.621,00) × 9%       = 1.281,84 × 9%  = 115,3656
//   faixa 3: (4.354,27 − 2.902,84) × 12%      = 1.451,43 × 12% = 174,1716
//   faixa 4: (8.475,55 − 4.354,27) × 14%      = 4.121,28 × 14% = 576,9792
//   faixas 1+2 = 236,9406 · faixas 1+2+3 = 411,1122 · todas = 988,0914
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor } = require('./carregar.cjs');

const E = motor();

test('constantes de 2026 batem com as normas oficiais', () => {
  assert.equal(E.SALARIO_MINIMO, 1621.00); // Decreto 12.797/2025
  assert.equal(E.INSS_TETO, 8475.55);
  assert.deepEqual(E.INSS_TAB.map((f) => [f.ate, f.aliq]), [
    [1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14],
  ]);
  assert.deepEqual(E.IRRF_TAB.map((f) => [f.ate, f.aliq, f.deduz]), [
    [2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16],
    [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73],
  ]);
  assert.equal(E.IRRF_DEPENDENTE, 189.59);
  assert.equal(E.IRRF_SIMPLIFICADO, 607.20);
  assert.equal(E.IRRF_ISENTAO, 5000);
  assert.equal(E.IRRF_TETO_REDUTOR, 7350);
  // salário-família 2026 (mesma portaria do INSS): R$ 67,54 para quem ganha até R$ 1.980,38
  assert.equal(E.SF_VALOR, 67.54);
  assert.equal(E.SF_TETO, 1980.38);
});

test('INSS: zero ou negativo não desconta nada', () => {
  assert.equal(E.calcINSS(0).valor, 0);
  assert.equal(E.calcINSS(-100).valor, 0);
});

test('INSS faixa 1 (até R$ 1.621,00): 7,5% direto', () => {
  // 1.500,00 × 7,5% = 112,50
  assert.equal(E.calcINSS(1500).valor, 112.50);
  // 1.621,00 × 7,5% = 121,575 → arredonda para 121,58
  assert.equal(E.calcINSS(1621).valor, 121.58);
});

test('INSS faixa 2 (R$ 1.621,01 a R$ 2.902,84)', () => {
  // 2.500,95: 121,575 + (2.500,95 − 1.621,00) × 9% = 121,575 + 79,1955 = 200,7705 → 200,77
  assert.equal(E.calcINSS(2500.95).valor, 200.77);
});

test('INSS faixa 2 com salário em reais redondos (diferença de 1 centavo)', {
  todo: 'DÚVIDA: o código usa a parcela a deduzir arredondada (24,32); a conta faixa a faixa dá 24,315. '
    + 'Para salários redondos entre R$ 1.621,01 e R$ 2.902,84 o código desconta 1 centavo a menos. '
    + 'Depende da regra de arredondamento adotada pela folha; não alterado.',
}, () => {
  // 2.000,00: 121,575 + (2.000 − 1.621) × 9% = 121,575 + 34,11 = 155,685 → 155,69
  // (o código calcula 2.000 × 9% − 24,32 = 155,68)
  assert.equal(E.calcINSS(2000).valor, 155.69);
});

test('INSS faixa 3 (R$ 2.902,85 a R$ 4.354,27)', () => {
  // 3.000: 236,9406 + (3.000 − 2.902,84) × 12% = 236,9406 + 11,6592 = 248,5998 → 248,60
  assert.equal(E.calcINSS(3000).valor, 248.60);
  // 4.000: 236,9406 + 1.097,16 × 12% = 236,9406 + 131,6592 = 368,5998 → 368,60
  assert.equal(E.calcINSS(4000).valor, 368.60);
});

test('INSS faixa 4 (R$ 4.354,28 a R$ 8.475,55)', () => {
  // 5.000: 411,1122 + (5.000 − 4.354,27) × 14% = 411,1122 + 90,4022 = 501,5144 → 501,51
  assert.equal(E.calcINSS(5000).valor, 501.51);
  // 6.000: 411,1122 + 1.645,73 × 14% = 411,1122 + 230,4022 = 641,5144 → 641,51
  assert.equal(E.calcINSS(6000).valor, 641.51);
  // 8.000: 411,1122 + 3.645,73 × 14% = 411,1122 + 510,4022 = 921,5144 → 921,51
  assert.equal(E.calcINSS(8000).valor, 921.51);
});

test('INSS no teto: acima de R$ 8.475,55 o desconto para em R$ 988,09', () => {
  // soma das quatro faixas cheias = 988,0914 → 988,09
  assert.equal(E.calcINSS(8475.55).valor, 988.09);
  const r = E.calcINSS(10000);
  assert.equal(r.valor, 988.09);
  assert.equal(r.baseUsada, 8475.55);
  assert.equal(r.teto, true);
  assert.equal(E.calcINSS(8475.55).teto, false);
});

test('IRRF: tabela mensal em cada faixa', () => {
  assert.equal(E.irrfTabela(2428.80).imposto, 0);           // faixa isenta
  assert.equal(E.irrfTabela(2500).imposto, 5.34);           // 2.500 × 7,5% − 182,16 = 5,34
  assert.equal(E.irrfTabela(3000).imposto, 55.84);          // 3.000 × 15% − 394,16 = 55,84
  assert.equal(E.irrfTabela(4000).imposto, 224.51);         // 4.000 × 22,5% − 675,49 = 224,51
  assert.equal(E.irrfTabela(5000).imposto, 466.27);         // 5.000 × 27,5% − 908,73 = 466,27
  // na virada de faixa as duas linhas da tabela dão o mesmo valor:
  // 2.826,65 × 7,5% − 182,16 = 29,83875 e 2.826,65 × 15% − 394,16 = 29,8375 → 29,84
  assert.equal(E.irrfTabela(2826.65).imposto, 29.84);
});

test('IRRF: desconto simplificado quando ele é maior que as deduções', () => {
  // 3.000 com INSS 248,60: deduções legais 248,60 < 607,20 → usa o simplificado.
  // Base 3.000 − 607,20 = 2.392,80 → faixa isenta.
  const r = E.calcIRRF(3000, 248.60);
  assert.equal(r.usouSimplificado, true);
  assert.equal(r.base, 2392.80);
  assert.equal(r.valor, 0);
});

test('IRRF: até R$ 5.000 o redutor zera o imposto (Lei 15.270/2025)', () => {
  // 5.000 com INSS 501,51: simplificado (607,20) é maior → base 4.392,80.
  // Tabela: 4.392,80 × 22,5% − 675,49 = 312,89. Redução de até 312,89 → imposto zero.
  const r = E.calcIRRF(5000, 501.51);
  assert.equal(r.impostoApurado, 312.89);
  assert.equal(r.redutor, 312.89);
  assert.equal(r.valor, 0);
  assert.equal(r.isentoPeloRedutor, true);
  // 5.000,01 (INSS 501,52): tabela 4.392,81 × 22,5% − 675,49 = 312,89225 → 312,89;
  // redução 978,62 − 0,133145 × 5.000,01 = 312,8937 → 312,89 → continua zero.
  assert.equal(E.calcIRRF(5000.01, 501.52).valor, 0);
});

test('IRRF: faixa de transição de R$ 5.000,01 a R$ 7.350', () => {
  // 5.500 com INSS 571,51: simplificado (607,20) é maior → base 4.892,80.
  // Tabela: 4.892,80 × 27,5% − 908,73 = 436,79.
  // Redução: 978,62 − 0,133145 × 5.500 = 978,62 − 732,2975 = 246,3225 → 246,32.
  // Devido: 436,79 − 246,32 = 190,47.
  const a = E.calcIRRF(5500, 571.51);
  assert.equal(a.base, 4892.80);
  assert.equal(a.impostoApurado, 436.79);
  assert.equal(a.redutor, 246.32);
  assert.equal(a.valor, 190.47);
  // 6.000 com INSS 641,51: deduções legais (641,51) > 607,20 → base 5.358,49.
  // Tabela: 5.358,49 × 27,5% − 908,73 = 564,85475 → 564,85.
  // Redução: 978,62 − 0,133145 × 6.000 = 978,62 − 798,87 = 179,75. Devido: 385,10.
  const b = E.calcIRRF(6000, 641.51);
  assert.equal(b.usouSimplificado, false);
  assert.equal(b.base, 5358.49);
  assert.equal(b.impostoApurado, 564.85);
  assert.equal(b.redutor, 179.75);
  assert.equal(b.valor, 385.10);
});

test('IRRF: acima de R$ 7.350 não há redutor', () => {
  // em 7.350 a fórmula dá 978,62 − 978,61575 = 0,004 → zero
  assert.equal(E.calcRedutor(7350, 900), 0);
  assert.equal(E.calcRedutor(7350.01, 900), 0);
  assert.equal(E.calcRedutor(10000, 900), 0);
});

test('IRRF: dependentes entram nas deduções legais', () => {
  // 8.000 com INSS 921,51 e 2 dependentes: 921,51 + 2 × 189,59 = 1.300,69 (> 607,20).
  // Base 8.000 − 1.300,69 = 6.699,31 → 6.699,31 × 27,5% − 908,73 = 933,58025 → 933,58.
  const r = E.calcIRRF(8000, 921.51, 2);
  assert.equal(r.deducaoUsada, 1300.69);
  assert.equal(r.base, 6699.31);
  assert.equal(r.redutor, 0);
  assert.equal(r.valor, 933.58);
});

test('IRRF: pensão alimentícia é dedutível', () => {
  // 9.000, INSS 988,09, pensão 1.000: deduções 1.988,09 → base 7.011,91.
  // 7.011,91 × 27,5% − 908,73 = 1.019,54525 → 1.019,55.
  assert.equal(E.calcIRRF(9000, 988.09, 0, 1000).valor, 1019.55);
});

test('salário líquido em vários valores', () => {
  const casos = [
    // [bruto, dependentes, pensão, INSS, IRRF, líquido]
    [1621, 0, 0, 121.58, 0, 1499.42],      // salário mínimo
    [3000, 0, 0, 248.60, 0, 2751.40],
    [5000, 0, 0, 501.51, 0, 4498.49],      // isento pelo redutor
    [5500, 0, 0, 571.51, 190.47, 4738.02], // transição
    [6000, 0, 0, 641.51, 385.10, 4973.39], // transição
    [8000, 2, 0, 921.51, 933.58, 6144.91], // com dependentes
    [9000, 0, 1000, 988.09, 1019.55, 5992.36], // pensão também sai do líquido
    // 10.000: INSS no teto 988,09; base 9.011,91 × 27,5% − 908,73 = 1.569,54525 → 1.569,55
    [10000, 0, 0, 988.09, 1569.55, 7442.36],
  ];
  for (const [bruto, deps, pensao, inss, irrf, liquido] of casos) {
    const r = E.salarioLiquido({ bruto, deps, pensao });
    assert.equal(r.inss.valor, inss, `INSS de ${bruto}`);
    assert.equal(r.irrf.valor, irrf, `IRRF de ${bruto}`);
    assert.equal(r.liquido, liquido, `líquido de ${bruto}`);
  }
});

test('salário líquido: outros descontos saem do líquido', () => {
  assert.equal(E.salarioLiquido({ bruto: 3000, outrosDescontos: 100 }).liquido, 2651.40);
});
