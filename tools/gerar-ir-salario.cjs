// Grava na página /imposto-de-renda-salario/ o resultado padrão (salário de R$ 4.900) já calculado,
// para quem abre sem JavaScript e para o Google:  node tools/gerar-ir-salario.cjs
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const ARQ = path.join(raiz, 'imposto-de-renda-salario', 'index.html');

function montar(html) {
  const J = require(path.join(raiz, 'assets/js/ir-salario.js'));
  const r = J.calcular({ salario: '4.900' });
  const url = 'https://jornadabrasil.com.br/imposto-de-renda-salario/?utm_source=whatsapp&utm_medium=compartilhamento&utm_campaign=ir-salario';
  const wa = 'https://wa.me/?text=' + encodeURIComponent(J.textoCompartilhar(r, url));
  let h = html.replace(/<!--IRS-RESULTADO-INICIO-->[\s\S]*?<!--IRS-RESULTADO-FIM-->/, '<!--IRS-RESULTADO-INICIO-->' + J.resultadoHTML(r) + '<!--IRS-RESULTADO-FIM-->');
  h = h.replace(/(id="irs-wa" href=")[^"]*(")/, '$1' + wa.replace(/&/g, '&amp;') + '$2');
  return h;
}

if (require.main === module) {
  const a = fs.readFileSync(ARQ, 'utf8'); const d = montar(a);
  if (a === d) console.log('Nada mudou.'); else { fs.writeFileSync(ARQ, d); console.log('/imposto-de-renda-salario/ atualizada.'); }
}
module.exports = { montar, ARQ };
