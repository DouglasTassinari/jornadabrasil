// PJ vs CLT e simulador do IR anual — contas feitas à mão.
//
// PJ vs CLT: compara o líquido CLT + benefícios (provisões mensais) com o líquido PJ.
//  - FGTS 8% (Lei 8.036/1990, art. 15); 13º = 1/12; férias = 1/12 e o 1/3 = 1/36 do salário.
//  - Simples Nacional, Anexo III, 1ª faixa: 6% (LC 123/2006).
//  - INSS do contribuinte individual no plano simplificado: 11% do salário mínimo
//    (Lei 8.212/1991, art. 21, § 2º, I) → 1.621 × 11% = 178,31.
//  - Multa de 40% do FGTS (Lei 8.036/1990, art. 18, § 1º).
//
// IR anual (declaração 2027, ano-calendário 2026):
//  - Tabela anual = soma das 12 tabelas mensais de 2026 (Lei 11.482/2007, art. 1º, parágrafo
//    único). A parcela a deduzir sai da continuidade entre faixas, como a Receita publicou
//    para 2025 (2.135,04 / 4.679,03 / 8.054,97 / 10.853,78). Para 2026:
//      até 29.145,60 isento; até 33.919,80 7,5% − 2.185,92; até 45.012,60 15% − 4.729,91;
//      até 55.976,16 22,5% − 8.105,85; acima 27,5% − 10.904,66.
//  - Desconto simplificado: 20% dos rendimentos, limitado a R$ 17.640,00 a partir de 2026
//    (Lei 9.250/1995, art. 10, X, incluído pela Lei 15.270/2025).
//  - Redução anual (Lei 9.250/1995, art. 11-A): até R$ 60.000 o imposto zera (até 2.694,15);
//    de 60.000,01 a 88.200 a redução é 8.429,73 − 0,095575 × rendimentos; acima, nenhuma.
//  - Dependente: R$ 2.275,08 por ano. Educação: até R$ 3.561,50 por pessoa — o titular e
//    cada dependente (Lei 9.250/1995, art. 8º, II, "b").
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor } = require('./carregar.cjs');

const E = motor();

test('PJ vs CLT: caso básico no Simples a 6%', () => {
  // CLT 6.000: INSS 641,51, IRRF 385,10 → líquido 4.973,39
  // benefícios: FGTS 480 + 13º 500 + férias 500 + 1/3 166,67 = 1.646,67
  // valor econômico CLT: 4.973,39 + 1.646,67 = 6.620,06
  // PJ 10.000: imposto 6% = 600; INSS 178,31 → líquido 9.221,69
  // diferença: 9.221,69 − 6.620,06 = 2.601,63 → PJ vale mais (margem acima de 5%)
  // PJ necessário: (6.620,06 + 178,31) ÷ (1 − 0,06) = 6.798,37 ÷ 0,94 = 7.232,3085 → 7.232,31
  const r = E.pjVsClt({ salarioCLT: 6000, remuneracaoPJ: 10000, regimePJ: 'simples6' });
  assert.equal(r.cltLiquido, 4973.39);
  assert.equal(r.beneficios.fgts, 480);
  assert.equal(r.beneficios.decimo, 500);
  assert.equal(r.beneficios.ferias, 500);
  assert.equal(r.beneficios.terco, 166.67);
  assert.equal(r.totalBeneficios, 1646.67);
  assert.equal(r.cltEconomico, 6620.06);
  assert.equal(r.inssPatronal, 1200);
  assert.equal(r.impostoPJ, 600);
  assert.equal(r.inssAuto, 178.31);
  assert.equal(r.pjLiquido, 9221.69);
  assert.equal(r.diferenca, 2601.63);
  assert.equal(r.veredito, 'pj');
  assert.equal(r.pjNecessario, 7232.31);
  // FGTS em 5 anos: 480 × 60 = 28.800; multa 40% = 11.520
  assert.equal(r.fgts5anos, 28800);
  assert.equal(r.multa5anos, 11520);
});

test('PJ vs CLT: multa do FGTS, aviso e seguro-desemprego como provisão', () => {
  // multa: 40% × 480 = 192 | aviso: 6.000 ÷ 12 = 500
  // seguro: média 6.000 → teto 2.518,65 × 5 parcelas = 12.593,25 ÷ 12 = 1.049,4375 → 1.049,44
  // benefícios: 1.646,67 + 192 + 500 + 1.049,44 = 3.388,11 → valor CLT 4.973,39 + 3.388,11 = 8.361,50
  const r = E.pjVsClt({ salarioCLT: 6000, remuneracaoPJ: 10000, incluirMulta: true, incluirRescisao: true });
  assert.equal(r.beneficios.multa, 192);
  assert.equal(r.beneficios.aviso, 500);
  assert.equal(r.beneficios.seguroDes, 1049.44);
  assert.equal(r.totalBeneficios, 3388.11);
  assert.equal(r.cltEconomico, 8361.50);
});

test('PJ vs CLT: vale-transporte só conta o que passa de 6% do salário', () => {
  // VT 500; o trabalhador paga até 6% × 6.000 = 360; a empresa subsidia 140
  const r = E.pjVsClt({ salarioCLT: 6000, remuneracaoPJ: 10000, valeTransporte: 500 });
  assert.equal(r.vtDescMax, 360);
  assert.equal(r.beneficios.vt, 140);
});

test('PJ vs CLT: MEI paga o DAS fixo', () => {
  // DAS: 5% × 1.621 = 81,05 (parte do INSS). Sem a contribuição extra de autônomo:
  // 5.000 − 81,05 = 4.918,95
  const r = E.pjVsClt({ salarioCLT: 3000, remuneracaoPJ: 5000, regimePJ: 'mei', inssAutoVoluntario: false });
  assert.equal(r.impostoPJ, 81.05);
  assert.equal(r.pjLiquido, 4918.95);
});

function irAnual(v) {
  const dados = Object.assign({ rendTrib: 0, inssAnual: 0, irrfRetidoFonte: 0, deps: 0, pensao: 0,
    despMed: 0, despEduc: 0, livrosCaixa: 0 }, v);
  const r = E.CALCS.ir.calcular(dados);
  const linha = (bloco, prefixo) => r.blocos[bloco].linhas.find((l) => l.nome.startsWith(prefixo)).valor;
  return {
    r,
    simplificado: linha(0, 'Desconto simplificado'),
    completas: linha(0, 'Deduções legais completas'),
    base: linha(1, 'Base de cálculo'),
    tabela: linha(1, 'Imposto pela tabela'),
    devido: linha(1, 'Imposto devido'),
  };
}

test('IR anual: R$ 60.000 no ano fica isento pelo redutor', () => {
  // simplificado 20% = 12.000 → base 48.000 → 48.000 × 22,5% − 8.105,85 = 2.694,15
  // redução de até 2.694,15 → imposto zero; retido 1.000 → restituir 1.000
  const a = irAnual({ rendTrib: 60000, irrfRetidoFonte: 1000 });
  assert.equal(a.simplificado, 12000);
  assert.equal(a.base, 48000);
  assert.equal(a.tabela, 2694.15);
  assert.equal(a.devido, 0);
  assert.equal(a.r.destaque.label, 'A restituir');
  assert.equal(a.r.destaque.valor, 1000);
});

test('IR anual: faixa de transição (R$ 72.000)', () => {
  // simplificado 14.400 → base 57.600 → 57.600 × 27,5% − 10.904,66 = 4.935,34
  // redução: 8.429,73 − 0,095575 × 72.000 = 8.429,73 − 6.881,40 = 1.548,33
  // devido: 4.935,34 − 1.548,33 = 3.387,01
  const a = irAnual({ rendTrib: 72000 });
  assert.equal(a.base, 57600);
  assert.equal(a.tabela, 4935.34);
  assert.equal(a.devido, 3387.01);
});

test('IR anual: acima de R$ 88.200, desconto simplificado no limite e sem redutor', () => {
  // 20% de 100.000 = 20.000, limitado a 17.640 → base 82.360
  // (deduções completas: só INSS 11.857,08, menores que 17.640)
  // 82.360 × 27,5% − 10.904,66 = 22.649 − 10.904,66 = 11.744,34; retido 11.000 → pagar 744,34
  const a = irAnual({ rendTrib: 100000, inssAnual: 11857.08, irrfRetidoFonte: 11000 });
  assert.equal(a.simplificado, 17640);
  assert.equal(a.base, 82360);
  assert.equal(a.devido, 11744.34);
  assert.equal(a.r.destaque.label, 'A recolher');
  assert.equal(a.r.destaque.valor, 744.34);
});

test('IR anual: limite de educação vale para o titular e para cada dependente', () => {
  // 1 dependente → 2 pessoas → limite 2 × 3.561,50 = 7.123,00; gasto 7.000 entra inteiro.
  // deduções: INSS 11.857,08 + dependente 2.275,08 + educação 7.000 = 21.132,16 (> 17.640)
  // base 100.000 − 21.132,16 = 78.867,84 → × 27,5% − 10.904,66 = 10.783,996 → 10.784,00
  const a = irAnual({ rendTrib: 100000, inssAnual: 11857.08, deps: 1, despEduc: 7000 });
  assert.equal(a.completas, 21132.16);
  assert.equal(a.base, 78867.84);
  assert.equal(a.devido, 10784);
  // sem dependentes o limite é de 1 pessoa: 3.561,50
  assert.equal(irAnual({ rendTrib: 100000, despEduc: 7000 }).completas, 3561.50);
});
