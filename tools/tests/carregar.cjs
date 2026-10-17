// Carrega dentro do Node os scripts que o site usa no navegador.
// Não é um teste: os testes ficam nos arquivos *.test.cjs desta pasta.
const path = require('node:path');

const raiz = path.resolve(__dirname, '..', '..');

// engine.js termina com `window.RCEngine = {...}`; no Node basta criar um `window` vazio.
function motor() {
  global.window = global.window || {};
  require(path.join(raiz, 'assets/js/engine.js'));
  return global.window.RCEngine;
}

function ferramentas() {
  return require(path.join(raiz, 'assets/js/decision-tools.js'));
}

module.exports = { raiz, motor, ferramentas };
