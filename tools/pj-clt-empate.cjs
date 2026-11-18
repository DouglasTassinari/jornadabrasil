// Estudo PJ × CLT: quanto uma PJ precisa faturar por mês para render, no ano, o mesmo que um salário CLT.
// Usado por tools/gerar-dados.cjs (página /dados/) e pelo guia /blog/pj-ou-clt-quanto-faturar-2026/,
// para que os números citados nunca divirjam das calculadoras.
//
// CLT (por ano): 11 meses de salário líquido + 1 mês de férias líquidas (30 dias + 1/3) + 13º líquido
//                + FGTS de 8% sobre 12 salários, o 1/3 de férias e o 13º. Sem multa do FGTS, seguro-desemprego
//                ou benefícios (vale-refeição, plano de saúde), que variam de empresa para empresa.
// PJ (por mês):  faturamento − DAS do Simples Nacional (Anexo III, com fator R) − INSS de 11% sobre o
//                pró-labore − IR do pró-labore − custos fixos (contador e taxas). O pró-labore é de 28% do
//                faturamento (mínimo do fator R), nunca abaixo do salário mínimo. O restante sai como lucro,
//                isento até R$ 50 mil por mês por empresa (Lei 15.270/2025).
// "Com 1 mês de folga": a PJ fatura 11 meses e, no mês parado, continua pagando os custos fixos e o INSS
//                do pró-labore mínimo.
'use strict';

// Simples Nacional (LC 123/2006, redação da LC 155/2016): faixas usadas pelo estudo
const ANEXO_III = [
  { ate: 180000, aliq: 0.06, pd: 0 }, { ate: 360000, aliq: 0.112, pd: 9360 },
  { ate: 720000, aliq: 0.135, pd: 17640 }, { ate: 1800000, aliq: 0.16, pd: 35640 },
];
const ANEXO_V = [
  { ate: 180000, aliq: 0.155, pd: 0 }, { ate: 360000, aliq: 0.18, pd: 4500 },
];
const CUSTOS_PADRAO = 300;
const SALARIOS = [3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];
const r2 = (x) => Math.round((x + 1e-9) * 100) / 100;

function aliqEfetiva(tab, rbt12) {
  const f = tab.find((x) => rbt12 <= x.ate);
  if (!f) throw new Error('faturamento fora das faixas do estudo');
  return (rbt12 * f.aliq - f.pd) / rbt12;
}

function cltAnual(RC, S) {
  const mes = RC.salarioLiquido({ bruto: S }).liquido;
  const fer = RC.ferias({ bruto: S }).liquido;
  const dec = RC.decimoTerceiro({ bruto: S }).liquidoTotal;
  const fgts = 0.08 * S * (13 + 1 / 3);
  const liquido = 11 * mes + fer + dec;
  return { mes, fer, dec, fgts: r2(fgts), liquido: r2(liquido), total: r2(liquido + fgts), porMes: r2((liquido + fgts) / 12) };
}

function pjAnual(RC, F, { meses = 12, custos = CUSTOS_PADRAO, anexo = 'III' } = {}) {
  const tab = anexo === 'III' ? ANEXO_III : ANEXO_V;
  const aliq = aliqEfetiva(tab, F * meses);
  const das = aliq * F;
  const pro = anexo === 'III' ? Math.max(0.28 * F, RC.SALARIO_MINIMO) : RC.SALARIO_MINIMO;
  const inss = 0.11 * Math.min(pro, RC.INSS_TETO);
  const ir = RC.calcIRRF(pro, inss, 0).valor;
  const liqMes = F - das - inss - ir - custos;
  const parado = (12 - meses) * (custos + 0.11 * RC.SALARIO_MINIMO);
  return { aliq, das: r2(das), pro: r2(pro), inss: r2(inss), ir: r2(ir), custos, liqMes: r2(liqMes), total: r2(liqMes * meses - parado) };
}

// Faturamento mensal em que a PJ empata com a CLT (busca binária, precisão de centavos)
function empate(RC, S, opcoes = {}, extraAnualCLT = 0) {
  const alvo = cltAnual(RC, S).total + extraAnualCLT;
  let lo = S * 0.5, hi = S * 3;
  for (let i = 0; i < 90; i++) {
    const m = (lo + hi) / 2;
    if (pjAnual(RC, m, opcoes).total < alvo) lo = m; else hi = m;
  }
  return r2(hi);
}

function linhas(RC) {
  return SALARIOS.map((S) => {
    const c = cltAnual(RC, S);
    const f12 = empate(RC, S, { meses: 12 });
    const f11 = empate(RC, S, { meses: 11 });
    return { salario: S, cltPorMes: c.porMes, f12, f11, pct12: r2((f12 / S - 1) * 100), pct11: r2((f11 / S - 1) * 100), aliqDAS: r2(pjAnual(RC, f12).aliq * 100) };
  });
}

const brl = (n) => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pct = (n) => n.toFixed(1).replace('.', ',') + '%';

function tabelaHTML(RC) {
  const h = ['<table class="data-table"><thead><tr><th>Salário CLT (bruto)</th><th>O que a CLT rende por mês, em média*</th><th>PJ precisa faturar (12 meses)</th><th>PJ precisa faturar (com 1 mês de folga)</th></tr></thead><tbody>'];
  for (const l of linhas(RC)) {
    h.push(`<tr><td>${brl(l.salario)}</td><td>${brl(l.cltPorMes)}</td><td><strong>${brl(l.f12)}</strong> (+${pct(l.pct12)})</td><td>${brl(l.f11)} (+${pct(l.pct11)})</td></tr>`);
  }
  h.push('</tbody></table>');
  return h.join('');
}

module.exports = { ANEXO_III, ANEXO_V, CUSTOS_PADRAO, SALARIOS, cltAnual, pjAnual, empate, linhas, tabelaHTML, brl };
