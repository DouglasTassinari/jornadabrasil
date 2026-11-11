// Grava na página /calculadora-escala-6x1/ o resultado padrão já calculado
// (6x1, 44 h, 1 h de deslocamento, 9 feriados e férias), para que o Google e
// quem abre sem JavaScript vejam os números. Também atualiza o link do WhatsApp.
// Rode depois de mudar o motor (assets/js/escala-6x1.js):
//   node tools/gerar-escala-6x1.cjs
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const E = require(path.join(raiz, 'assets/js/escala-6x1.js'));
const arquivo = path.join(raiz, 'calculadora-escala-6x1', 'index.html');

const r = E.calcular({});
const url = 'https://jornadabrasil.com.br/calculadora-escala-6x1/?utm_source=whatsapp&utm_medium=compartilhamento&utm_campaign=escala-6x1';
const wa = 'https://wa.me/?text=' + encodeURIComponent(E.textoCompartilhar(r, url));

let html = fs.readFileSync(arquivo, 'utf8');
const antes = html;
html = html.replace(/<!--RESULTADO-INICIO-->[\s\S]*?<!--RESULTADO-FIM-->/, '<!--RESULTADO-INICIO-->' + E.resultadoHTML(r) + '<!--RESULTADO-FIM-->');
html = html.replace(/(id="esc-wa" href=")[^"]*(")/, '$1' + wa.replace(/&/g, '&amp;') + '$2');

if (html === antes) {
  console.log('Nada mudou.');
} else {
  fs.writeFileSync(arquivo, html);
  console.log('Página atualizada: ' + r.ganho.diasPorAno + ' dias de folga a mais por ano no cenário padrão.');
}
