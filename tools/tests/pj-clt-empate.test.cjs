// Estudo PJ × CLT (página /dados/ e guia do blog): os números precisam bater com o motor das calculadoras.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { motor, raiz } = require('./carregar.cjs');
const P = require(path.join(raiz, 'tools/pj-clt-empate.cjs'));
const RC = motor();

test('CLT de R$ 8.000: o ano vale R$ 88.946,71 (líquido, férias com 1/3, 13º e FGTS)', () => {
  const c = P.cltAnual(RC, 8000);
  assert.equal(c.mes, 6040.64);
  assert.equal(c.fer, 7925.7);
  assert.equal(c.fgts, 8533.33);
  assert.equal(c.total, 88946.71);
});

test('PJ empata com a CLT de R$ 8.000 faturando R$ 8.482,43 (Anexo III, 6%)', () => {
  const f = P.empate(RC, 8000);
  assert.equal(f, 8482.43);
  const p = P.pjAnual(RC, f);
  assert.equal(p.das, 508.95);
  assert.equal(p.inss, 261.26);
  assert.ok(Math.abs(p.total - P.cltAnual(RC, 8000).total) < 0.05);
});

test('pró-labore nunca fica abaixo do salário mínimo e o Anexo III muda de faixa acima de R$ 180 mil/ano', () => {
  assert.equal(P.pjAnual(RC, 3000).pro, RC.SALARIO_MINIMO);
  assert.ok(Math.abs(P.pjAnual(RC, 15000).aliq - 0.06) < 1e-9);
  assert.ok(P.pjAnual(RC, 20934.46).aliq > 0.07);
});

test('quanto maior o salário, menor a diferença até a faixa de R$ 15 mil', () => {
  const l = P.linhas(RC);
  const pct = Object.fromEntries(l.map((x) => [x.salario, x.pct12]));
  assert.ok(pct[3000] > pct[5000] && pct[5000] > pct[8000] && pct[8000] > pct[15000]);
});
