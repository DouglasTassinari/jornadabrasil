// Grava na página /quinto-dia-util/ a tabela de meses e o resultado padrão
// (o mês do próximo pagamento), para que o Google e quem abre sem JavaScript
// vejam as datas. Rode depois de mudar o motor ou para virar o ano:
//   node tools/gerar-quinto-dia-util.cjs [AAAA-MM do resultado padrão]
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const Q = require(path.join(raiz, 'assets/js/quinto-dia-util.js'));
const arquivo = path.join(raiz, 'quinto-dia-util', 'index.html');

// Resultado padrão: mês do próximo pagamento (ou o mês passado como argumento)
let [ano, mes] = (process.argv[2] || '').split('-').map(Number);
if (!ano || !mes) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  ano = +hoje.slice(0, 4); mes = +hoje.slice(5, 7);
  if (hoje > Q.diaUtil(ano, mes).data) { mes++; if (mes > 12) { mes = 1; ano++; } }
}
const r = Q.diaUtil(ano, mes);
// Tabela: do mês padrão até dezembro do ano seguinte
const meses = (ano + 1 - ano) * 12 + (12 - mes) + 1;
const tabela = Q.tabela(ano, mes, meses);

const url = 'https://jornadabrasil.com.br/quinto-dia-util/?utm_source=whatsapp&utm_medium=compartilhamento&utm_campaign=quinto-dia-util';
const wa = 'https://wa.me/?text=' + encodeURIComponent(Q.textoCompartilhar(r, url));

let html = fs.readFileSync(arquivo, 'utf8');
const antes = html;
html = html.replace(/<!--QDU-RESULTADO-INICIO-->[\s\S]*?<!--QDU-RESULTADO-FIM-->/, '<!--QDU-RESULTADO-INICIO-->' + Q.resultadoHTML(r) + '<!--QDU-RESULTADO-FIM-->');
html = html.replace(/<!--QDU-TABELA-INICIO-->[\s\S]*?<!--QDU-TABELA-FIM-->/, '<!--QDU-TABELA-INICIO-->' + Q.tabelaHTML(tabela) + '<!--QDU-TABELA-FIM-->');
html = html.replace(/(id="qdu-wa" href=")[^"]*(")/, '$1' + wa.replace(/&/g, '&amp;') + '$2');
// o select abre no mês padrão
html = html.replace(/(<select id="qdu-mes" name="mes">[\s\S]*?<\/select>)/, (sel) =>
  sel.replace(/ selected/g, '').replace(`<option value="${mes}">`, `<option value="${mes}" selected>`));
html = html.replace(/(<select id="qdu-ano" name="ano">[\s\S]*?<\/select>)/, (sel) =>
  sel.replace(/ selected/g, '').replace(`<option value="${ano}">`, `<option value="${ano}" selected>`));

if (html === antes) console.log('Nada mudou.');
else {
  fs.writeFileSync(arquivo, html);
  console.log(`Página atualizada: ${Q.frase(r)} Tabela com ${tabela.length} meses.`);
}
