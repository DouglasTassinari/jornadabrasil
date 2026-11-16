// Preenche em /imposto-de-renda/ as tabelas citáveis (tabela anual e imposto por salário),
// calculadas pelo mesmo motor do simulador:  node tools/gerar-ir.cjs
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const ARQ = path.join(raiz, 'imposto-de-renda', 'index.html');
const brl = (n) => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function motor() { global.window = global.window || {}; require(path.join(raiz, 'assets/js/engine.js')); return global.window.RCEngine; }

function tabelaAnual(E) {
  const f = E.IRRF_ANUAL_TAB; let de = 0;
  const h = ['<table class="data-table"><thead><tr><th>Base de cálculo anual</th><th>Alíquota</th><th>Parcela a deduzir</th></tr></thead><tbody>'];
  f.forEach((x, i) => {
    const faixa = !Number.isFinite(x.ate) ? `Acima de ${brl(de)}` : (i === 0 ? `Até ${brl(x.ate)}` : `De ${brl(de + 0.01)} até ${brl(x.ate)}`);
    h.push(`<tr><td>${faixa}</td><td>${x.aliq === 0 ? 'isento' : String(Math.round(x.aliq * 1000) / 10).replace('.', ',') + '%'}</td><td>${x.deduz ? brl(x.deduz) : '—'}</td></tr>`);
    if (Number.isFinite(x.ate)) de = x.ate;
  });
  h.push('</tbody></table>');
  return h.join('');
}

function tabelaSalarios(E) {
  const h = ['<table class="data-table"><thead><tr><th>Salário bruto mensal</th><th>Rendimentos no ano (×12)</th><th>Imposto devido no ano</th></tr></thead><tbody>'];
  for (const m of [3000, 5000, 5500, 6000, 7000, 7350, 8000, 10000, 15000]) {
    const s = E.salarioLiquido({ bruto: m, dependentes: 0 });
    const r = E.CALCS.ir.calcular({ rendTrib: m * 12, inssAnual: s.inss.valor * 12, irrfRetidoFonte: 0, deps: 0, pensao: 0, despMed: 0, despEduc: 0, livrosCaixa: 0 });
    const devido = r.blocos[1].linhas.find((l) => l.nome === 'Imposto devido no ano').valor;
    h.push(`<tr><td>${brl(m)}</td><td>${brl(m * 12)}</td><td><strong>${devido ? brl(devido) : 'isento'}</strong></td></tr>`);
  }
  h.push('</tbody></table>');
  return h.join('');
}

function montar(html) {
  const E = motor();
  const t = (h, n, c) => h.replace(new RegExp(`<!--${n}-INICIO-->[\\s\\S]*?<!--${n}-FIM-->`), `<!--${n}-INICIO-->${c}<!--${n}-FIM-->`);
  return t(t(html, 'IR-ANUAL', tabelaAnual(E)), 'IR-SALARIOS', tabelaSalarios(E));
}

if (require.main === module) {
  const a = fs.readFileSync(ARQ, 'utf8'); const d = montar(a);
  if (a === d) console.log('Nada mudou.'); else { fs.writeFileSync(ARQ, d); console.log('/imposto-de-renda/ atualizada.'); }
}
module.exports = { montar, ARQ };
