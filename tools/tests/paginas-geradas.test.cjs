// IR e horas extras: as tabelas das páginas precisam bater com os motores das calculadoras.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ir = require('../gerar-ir.cjs');
const he = require('../gerar-horas-extras.cjs');

for (const [nome, mod] of [['/imposto-de-renda/', ir], ['/horas-extras/', he]]) {
  test(`tabelas de ${nome} em dia com o motor`, () => {
    const html = fs.readFileSync(mod.ARQ, 'utf8').replace(/\r\n/g, '\n');
    assert.equal(mod.montar(html), html, 'rode o gerador em tools/');
  });
}

test('números-chave das páginas', () => {
  const a = fs.readFileSync(ir.ARQ, 'utf8');
  assert.match(a, /<strong>R\$ 3\.387,01<\/strong>/);
  assert.match(a, /Acima de R\$ 55\.976,16<\/td><td>27,5%/);
  const b = fs.readFileSync(he.ARQ, 'utf8');
  assert.match(b, /<td>R\$ 2\.200,00<\/td><td>R\$ 10,00<\/td><td><strong>R\$ 15,00<\/strong><\/td><td>R\$ 20,00<\/td>/);
});
