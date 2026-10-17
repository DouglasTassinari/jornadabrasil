// Horas extras, adicional noturno e holerite completo — contas feitas à mão.
//
// Regras:
//  - Hora extra: no mínimo 50% (CF, art. 7º, XVI); 100% em domingo/feriado não compensado
//    (Lei 605/1949, art. 9º; Súmula 146 do TST). Divisor 220 (44h) ou 200 (40h).
//  - DSR sobre horas extras e adicional noturno habituais: Lei 605/1949, art. 7º;
//    Súmulas 172 e 60 do TST. DSR = variáveis ÷ dias úteis × (domingos + feriados).
//  - Adicional noturno: 20% (CLT, art. 73); hora noturna de 52min30s, ou seja, cada hora
//    real entre 22h e 5h vale 60 ÷ 52,5 = 8/7 hora.
//  - Insalubridade: 10%, 20% ou 40% do salário mínimo (CLT, art. 192).
//  - Periculosidade: 30% do salário-base (CLT, art. 193, § 1º).
//  - Vale-transporte: desconto de no máximo 6% do salário-base (Lei 7.418/1985, art. 4º).
//  - Salário-família 2026: R$ 67,54 por filho para remuneração até R$ 1.980,38
//    (Portaria Interministerial MPS/MF nº 13/2026). Não entra na base de INSS/IR.
//
// Os salários foram escolhidos para que o valor da hora seja exato (2.200 ÷ 220 = 10,00),
// assim o resultado não depende de como se arredonda a hora.
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor } = require('./carregar.cjs');

const E = motor();

test('horas extras a 50% sem DSR', () => {
  // hora 2.200 ÷ 220 = 10,00; extra 50% = 15,00; 10 h = 150,00
  const r = E.horasExtras({ bruto: 2200, jornadaMensal: 220, qtdHoras: 10, percentual: 50 });
  assert.equal(r.valorHora, 10);
  assert.equal(r.valorHoraExtra, 15);
  assert.equal(r.totalHE, 150);
  assert.equal(r.valorDSR, 0);
  assert.equal(r.total, 150);
});

test('horas extras a 50% com reflexo no DSR', () => {
  // DSR: 150 ÷ 25 dias úteis × 5 domingos/feriados = 30,00 → total 180,00
  const a = E.horasExtras({ bruto: 2200, qtdHoras: 10, percentual: 50, dsr: true, diasUteis: 25, domingosFeriados: 5 });
  assert.equal(a.valorDSR, 30);
  assert.equal(a.total, 180);
  // mês com 26 dias úteis e 4 domingos: 150 ÷ 26 × 4 = 23,0769 → 23,08
  const b = E.horasExtras({ bruto: 2200, qtdHoras: 10, percentual: 50, dsr: true, diasUteis: 26, domingosFeriados: 4 });
  assert.equal(b.valorDSR, 23.08);
  assert.equal(b.total, 173.08);
});

test('horas extras a 100% (domingo/feriado) na jornada de 40h', () => {
  // hora 3.000 ÷ 200 = 15,00; extra 100% = 30,00; 8 h = 240,00; DSR 240 ÷ 25 × 5 = 48,00
  const r = E.horasExtras({ bruto: 3000, jornadaMensal: 200, qtdHoras: 8, percentual: 100, dsr: true, diasUteis: 25, domingosFeriados: 5 });
  assert.equal(r.valorHora, 15);
  assert.equal(r.valorHoraExtra, 30);
  assert.equal(r.totalHE, 240);
  assert.equal(r.valorDSR, 48);
  assert.equal(r.total, 288);
});

test('adicional noturno com hora reduzida e DSR (calculadora)', () => {
  // hora 10,00; 35 h reais × 8/7 = 40 h noturnas; 40 × 10,00 × 20% = 80,00
  // DSR: 80 ÷ 25 × 5 = 16,00 → total 96,00
  const r = E.CALCS.noturno.calcular({ bruto: 2200, jornadaMensal: 220, horasNoturnas: 35, dsr: true, diasUteis: 25, domingosFeriados: 5 });
  assert.equal(r.proventos[0].valor, 80);
  assert.equal(r.proventos[1].valor, 16);
  assert.equal(r.destaque.valor, 96);
});

test('holerite: horas extras + adicional noturno + DSR', () => {
  // hora 4.400 ÷ 220 = 20,00
  // extras 50%: 10 h × 30,00 = 300,00
  // noturno: 35 h × 8/7 = 40 h × 20,00 × 20% = 160,00
  // DSR: (300 + 160) ÷ 25 × 5 = 92,00
  // bruto tributável: 4.400 + 300 + 160 + 92 = 4.952,00
  // INSS: 411,1122 + (4.952 − 4.354,27) × 14% = 411,1122 + 83,6822 = 494,7944 → 494,79
  // IRRF: rendimento até 5.000 → zero. Líquido: 4.952 − 494,79 = 4.457,21
  const r = E.folhaCompleta({ bruto: 4400, heQtd50: 10, adicNoturno: true, horasNoturnas: 35, dsr: true, diasUteis: 25, domingosFeriados: 5 });
  assert.equal(r.heValor50, 300);
  assert.equal(r.horasNotComputadas, 40);
  assert.equal(r.adicNoturnoValor, 160);
  assert.equal(r.dsrValor, 92);
  assert.equal(r.brutoTrib, 4952);
  assert.equal(r.inss.valor, 494.79);
  assert.equal(r.irrf.valor, 0);
  assert.equal(r.liquido, 4457.21);
});

test('holerite: periculosidade, vale-transporte limitado a 6% e plano de saúde', () => {
  // periculosidade 30% × 3.000 = 900 → bruto tributável 3.900
  // INSS: 236,9406 + (3.900 − 2.902,84) × 12% = 236,9406 + 119,6592 = 356,5998 → 356,60
  // VT: custo 300, mas o desconto máximo é 6% × 3.000 = 180
  // descontos: 356,60 + 180 + 100 = 636,60 → líquido 3.900 − 636,60 = 3.263,40
  const r = E.folhaCompleta({ bruto: 3000, periculosidade: true, desVT: 300, desPlanoSaude: 100 });
  assert.equal(r.perVal, 900);
  assert.equal(r.brutoTrib, 3900);
  assert.equal(r.inss.valor, 356.60);
  assert.equal(r.maxVT, 180);
  assert.equal(r.descVT, 180);
  assert.equal(r.liquido, 3263.40);
});

test('holerite: insalubridade sobre o salário mínimo', () => {
  assert.equal(E.folhaCompleta({ bruto: 3000, insalubridadeGrau: 'min10' }).insaVal, 162.10); // 10% × 1.621
  assert.equal(E.folhaCompleta({ bruto: 3000, insalubridadeGrau: 'min40' }).insaVal, 648.40); // 40% × 1.621
  // grau médio: 20% × 1.621 = 324,20 → bruto 3.324,20
  // INSS: 236,9406 + 421,36 × 12% = 236,9406 + 50,5632 = 287,5038 → 287,50
  const r = E.folhaCompleta({ bruto: 3000, insalubridadeGrau: 'min20' });
  assert.equal(r.insaVal, 324.20);
  assert.equal(r.inss.valor, 287.50);
  assert.equal(r.liquido, 3036.70);
});

test('holerite: salário-família não paga INSS nem IR', () => {
  // salário mínimo com 2 filhos: 2 × 67,54 = 135,08. INSS só sobre 1.621 = 121,58.
  // líquido: 1.621 + 135,08 − 121,58 = 1.634,50
  const r = E.folhaCompleta({ bruto: 1621, sfFilhos: 2 });
  assert.equal(r.sfValor, 135.08);
  assert.equal(r.brutoTrib, 1621);
  assert.equal(r.inss.valor, 121.58);
  assert.equal(r.liquido, 1634.50);
  // acima do limite não há salário-família
  assert.equal(E.folhaCompleta({ bruto: 2000, sfFilhos: 2 }).sfValor, 0);
});

test('holerite: salário-família considera a remuneração total, não só o salário-base', {
  todo: 'DÚVIDA: a portaria do INSS fala em "remuneração mensal" (salário de contribuição total). '
    + 'O código compara só o salário-base com R$ 1.980,38. Não alterado; precisa de confirmação.',
}, () => {
  // salário-base 1.900 + comissões 200 = 2.100 de remuneração, acima de 1.980,38 → sem salário-família
  const r = E.folhaCompleta({ bruto: 1900, comissoes: 200, sfFilhos: 2 });
  assert.equal(r.sfValor, 0);
});
