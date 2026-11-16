// "Vou pagar ou receber Imposto de Renda?" — contas conferidas à mão (salário de R$ 4.900, sem dependentes).
//
//  mês normal: INSS 487,51 (faixa 14%: 4.900 × 14% − 198,49); IR zero (até R$ 5.000 por mês)
//  férias: 4.900 + 1/3 (1.633,33) = 6.533,33 → INSS 716,18; IR 582,25 (motor de férias do site)
//  rendimentos tributáveis: 11 × 4.900 + 6.533,33 = 60.433,33
//  declaração simplificada: 20% = 12.086,67 → base 48.346,67 → 22,5% − 8.105,85 = 2.772,... (tabela anual)
//  redutor anual: 8.429,73 − 0,095575 × 60.433,33 = 2.653,85 → imposto devido ≈ 118,34
//  retido 582,25 − devido 118,34 = restituição ≈ 463,91
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { raiz } = require('./carregar.cjs');
const J = require(path.join(raiz, 'assets/js/ir-salario.js'));

test('R$ 4.900 com férias e 13º: restituição de cerca de R$ 464', () => {
  const r = J.calcular({ salario: '4.900' });
  assert.equal(r.mes.inss, 487.51);
  assert.equal(r.mes.irrf, 0);
  assert.equal(r.ferias.base, 6533.33);
  assert.equal(r.ferias.inss, 716.18);
  assert.equal(r.ferias.irrf, 582.25);
  assert.equal(r.decimo.irrf, 0);
  assert.equal(r.ano.rendTrib, 60433.33);
  assert.equal(r.ano.faixa, 'parcial');
  assert.equal(r.ano.retido, 582.25);
  assert.ok(Math.abs(r.ano.devido - 118.34) < 0.02, 'devido ' + r.ano.devido);
  assert.ok(Math.abs(r.ano.saldo - 463.91) < 0.02, 'saldo ' + r.ano.saldo);
  assert.equal(r.ano.caso, 'restitui');
});

test('sem férias: 12 salários de R$ 4.900 = R$ 58.800, abaixo de R$ 60 mil, tudo zero', () => {
  const r = J.calcular({ salario: '4900', ferias: false, decimo: true });
  assert.equal(r.ano.rendTrib, 58800);
  assert.equal(r.ano.faixa, 'isento');
  assert.equal(r.ano.devido, 0);
  assert.equal(r.ano.caso, 'zero');
  assert.equal(r.ferias, null);
});

test('R$ 3.000: não paga nem recebe', () => {
  const r = J.calcular({ salario: 3000 });
  assert.equal(r.ano.caso, 'zero');
  assert.equal(r.ano.retido, 0);
});

test('salário alto: sem redutor e com restituição', () => {
  const r = J.calcular({ salario: '8.000' });
  assert.equal(r.ano.faixa, 'sem-reducao');
  assert.equal(r.ano.caso, 'restitui');
});

test('entrada vazia ou inválida', () => {
  assert.equal(J.calcular({ salario: '' }).vazio, true);
  assert.equal(J.calcular({ salario: 'abc' }).vazio, true);
  assert.equal(J.parseNumero('4.900,50'), 4900.5);
  assert.equal(J.parseNumero('R$ 4900'), 4900);
});

test('o texto explica em linguagem simples', () => {
  const h = J.resultadoHTML(J.calcular({ salario: '4.900' }));
  assert.match(h, /você deve receber/);
  assert.match(h, /<strong>R\$ 464<\/strong>/);
  assert.match(h, /não sai Imposto de Renda/);
  assert.match(h, /as férias descontam/);
  assert.match(h, /O 13º tem o imposto calculado <strong>à parte<\/strong>/);
  assert.match(h, /a Receita devolve/);
  assert.match(J.textoCompartilhar(J.calcular({ salario: '4.900' }), 'U'), /devo receber R\$ 464 de volta\. Faça a sua, é grátis: U/);
});

test('a página publicada traz o resultado padrão em dia com o motor', () => {
  const { montar, ARQ } = require('../gerar-ir-salario.cjs');
  const html = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(montar(html), html, 'rode: node tools/gerar-ir-salario.cjs');
});
