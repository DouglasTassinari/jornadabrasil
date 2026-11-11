// Preenche as tabelas da página /dados/ com os mesmos motores das calculadoras,
// para que os números citáveis nunca divirjam das ferramentas.
//   node tools/gerar-dados.cjs
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const ARQ = path.join(raiz, 'dados', 'index.html');

function motores() {
  const Esc = require(path.join(raiz, 'assets/js/escala-6x1.js'));
  const Q = require(path.join(raiz, 'assets/js/quinto-dia-util.js'));
  global.window = global.window || {};
  require(path.join(raiz, 'assets/js/engine.js'));
  return { Esc, Q, RC: global.window.RCEngine };
}

const brl = (n) => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const int = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function tabela6x1(Esc) {
  const puro = Esc.calcular({ ferias: false, feriados: 0, deslocamentoMin: 0 });
  const padrao = Esc.calcular({});
  const p12 = Esc.calcular({ escala: '12x36', ferias: false, feriados: 0 });
  const d12 = Esc.calcular({ escala: '12x36' });
  const linhas = [
    ['6x1 com 44 h (até 15/12/2026)', puro.hoje, padrao.hoje],
    ['5x2 com até 42 h (a partir de 16/12/2026)', puro.r2026, padrao.r2026],
    ['5x2 com até 40 h (a partir de 16/12/2027)', puro.r2027, padrao.r2027],
    ['12x36 (plantões de 12 h)', p12.hoje, d12.hoje],
  ];
  const h = ['<table class="data-table"><thead><tr><th>Escala</th><th>Dias de trabalho no ano (calendário puro)</th><th>Dias de trabalho no ano (com férias e feriados)</th><th>Dias sem trabalho no ano (com férias e feriados)</th><th>Horas de trabalho no ano (com férias e feriados)</th></tr></thead><tbody>'];
  for (const [nome, a, b] of linhas) {
    h.push(`<tr><td><strong>${nome}</strong></td><td>${int(a.diasTrabalho)}</td><td>${int(b.diasTrabalho)}</td><td>${int(b.diasLivres)}</td><td>${int(b.horasTrabalho)} h</td></tr>`);
  }
  h.push('</tbody></table>');
  const g = padrao.ganho, v = Esc.calcular({ salario: 2200 }).valorHora;
  h.push('<ul>',
    `<li>Quem sai da 6x1 para a 5x2 ganha <strong>${int(g.diasPorAno)} dias</strong> sem trabalho por ano; em 10 anos, ${int(g.dias10Anos)} dias, mais de ${g.tempo10Anos}.</li>`,
    `<li>São <strong>${int(g.horas2026)} horas</strong> a menos de trabalho por ano com 42 h e <strong>${int(g.horas2027)} horas</strong> a menos com 40 h.</li>`,
    `<li>Com o mesmo salário, o valor da hora sobe <strong>${String(v.aumentoPct2026).replace('.', ',')}%</strong> com 42 h e <strong>${String(v.aumentoPct2027).replace('.', ',')}%</strong> com 40 h (divisores 220, 210 e 200): R$ 2.200 por mês dão hora de ${brl(v.hoje)}, ${brl(v.r2026)} e ${brl(v.r2027)}.</li>`,
    `<li>Contando 1 hora de deslocamento por dia de trabalho, o trabalho ocupa <strong>${padrao.hoje.pctAcordado}%</strong> do tempo acordado na 6x1 e ${padrao.r2027.pctAcordado}% na 5x2 com 40 h (16 horas acordado por dia).</li>`,
    '</ul>');
  return h.join('');
}

function tabelaQuinto(Q) {
  return Q.tabelaHTML(Q.tabela(2026, 12, 13));
}

function tabelaLiquido(RC) {
  const h = ['<table class="data-table"><thead><tr><th>Salário bruto</th><th>INSS</th><th>Imposto de renda</th><th>Salário líquido</th></tr></thead><tbody>'];
  for (const bruto of [1621, 2000, 3000, 4000, 5000, 7000, 10000]) {
    const r = RC.salarioLiquido({ bruto, dependentes: 0 });
    h.push(`<tr><td>${brl(bruto)}</td><td>${brl(r.inss.valor)}</td><td>${r.irrf.valor ? brl(r.irrf.valor) : 'isento'}</td><td><strong>${brl(r.liquido)}</strong></td></tr>`);
  }
  h.push('</tbody></table>');
  return h.join('');
}

function montar(html) {
  const { Esc, Q, RC } = motores();
  const trocar = (h, nome, conteudo) => h.replace(new RegExp(`<!--${nome}-INICIO-->[\\s\\S]*?<!--${nome}-FIM-->`), `<!--${nome}-INICIO-->${conteudo}<!--${nome}-FIM-->`);
  let h = html;
  h = trocar(h, 'DADOS-6X1', tabela6x1(Esc));
  h = trocar(h, 'DADOS-QDU', tabelaQuinto(Q));
  h = trocar(h, 'DADOS-LIQUIDO', tabelaLiquido(RC));
  return h;
}

if (require.main === module) {
  const antes = fs.readFileSync(ARQ, 'utf8');
  const depois = montar(antes);
  if (antes === depois) console.log('Nada mudou.');
  else { fs.writeFileSync(ARQ, depois); console.log('Página /dados/ atualizada.'); }
}

module.exports = { montar, ARQ };
