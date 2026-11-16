// Preenche em /horas-extras/ a tabela "valor da hora extra por salário", com o motor da calculadora:
//   node tools/gerar-horas-extras.cjs
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const ARQ = path.join(raiz, 'horas-extras', 'index.html');
const brl = (n) => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function motor() { global.window = global.window || {}; require(path.join(raiz, 'assets/js/engine.js')); return global.window.RCEngine; }

function tabela(E) {
  const h = ['<table class="data-table"><thead><tr><th>Salário</th><th>Hora normal (220 h)</th><th>Hora extra 50%</th><th>Hora extra 100%</th><th>Hora extra 50% com 42 h (210)</th><th>Hora extra 50% com 40 h (200)</th></tr></thead><tbody>'];
  for (const s of [1621, 2000, 2200, 2500, 3000, 4000, 5000]) {
    const a = E.horasExtras({ bruto: s, jornadaMensal: 220, qtdHoras: 1, percentual: 50 });
    const b = E.horasExtras({ bruto: s, jornadaMensal: 220, qtdHoras: 1, percentual: 100 });
    const c = E.horasExtras({ bruto: s, jornadaMensal: 210, qtdHoras: 1, percentual: 50 });
    const d = E.horasExtras({ bruto: s, jornadaMensal: 200, qtdHoras: 1, percentual: 50 });
    h.push(`<tr><td>${brl(s)}</td><td>${brl(a.valorHora)}</td><td><strong>${brl(a.valorHoraExtra)}</strong></td><td>${brl(b.valorHoraExtra)}</td><td>${brl(c.valorHoraExtra)}</td><td>${brl(d.valorHoraExtra)}</td></tr>`);
  }
  h.push('</tbody></table>');
  return h.join('');
}

function montar(html) {
  const E = motor();
  return html.replace(/<!--HE-TABELA-INICIO-->[\s\S]*?<!--HE-TABELA-FIM-->/, `<!--HE-TABELA-INICIO-->${tabela(E)}<!--HE-TABELA-FIM-->`);
}

if (require.main === module) {
  const a = fs.readFileSync(ARQ, 'utf8'); const d = montar(a);
  if (a === d) console.log('Nada mudou.'); else { fs.writeFileSync(ARQ, d); console.log('/horas-extras/ atualizada.'); }
}
module.exports = { montar, ARQ };
