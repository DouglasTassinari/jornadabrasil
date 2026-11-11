// Página /dados/ — os números citáveis precisam ser os mesmos das calculadoras.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { montar, ARQ } = require('../gerar-dados.cjs');

test('as tabelas de /dados/ estão em dia com os motores das calculadoras', () => {
  const html = fs.readFileSync(ARQ, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(montar(html), html, 'rode: node tools/gerar-dados.cjs');
});

test('/dados/ traz os números principais', () => {
  const html = fs.readFileSync(ARQ, 'utf8');
  assert.match(html, /ganha <strong>46 dias<\/strong> sem trabalho por ano/);
  assert.match(html, /<td>279<\/td>/);
  assert.match(html, /<strong>5\/12<\/strong> \(sábado\)/);
  assert.match(html, /<strong>R\$ 2\.751,40<\/strong>/);
});
