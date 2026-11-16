/* ============================================================
   Jornada Brasil — "Vou pagar ou receber Imposto de Renda?" a partir do salário.
   Motor (sem DOM): navegador (window.JBIRSalario) e Node (testes).
   Usa o motor das calculadoras (window.RCEngine / engine.js) para INSS, IR do mês,
   férias, 13º e a declaração anual — as mesmas contas do resto do site.

   Como a conta é montada (ano-calendário 2026, declaração em 2027):
   - cada mês de trabalho: INSS e IR na fonte sobre o salário;
   - mês das férias (30 dias): recebe o salário do mês + 1/3 de férias, e o INSS e o IR
     incidem sobre esse valor; os outros 11 meses são de salário normal;
   - 13º: tributado à parte, na fonte, e NÃO entra no total de rendimentos tributáveis
     da declaração (o INSS do 13º também não é deduzido na declaração);
   - declaração: rendimentos tributáveis = salários + salário e 1/3 das férias; o INSS
     pago nesses rendimentos entra nas deduções; vale a forma (simplificada ou completa)
     mais vantajosa e o redutor da Lei 15.270/2025; o IR retido nos meses e nas férias
     é descontado do imposto devido.
   Estimativa para quem tem uma só fonte de renda; não considera despesas médicas,
   educação, pensão e outras rendas.
   ============================================================ */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JBIRSalario = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function motor() {
    if (root && root.RCEngine) return root.RCEngine;
    if (typeof require === 'function') {
      root.window = root.window || {};
      require('./engine.js');
      return root.window.RCEngine;
    }
    throw new Error('engine.js não carregado');
  }

  function parseNumero(texto) {
    if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0;
    var s = String(texto || '').trim().replace(/[R$\s]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  function fmtMoeda(n) {
    var p = Math.abs(n).toFixed(2).split('.');
    return 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
  }
  function fmtRound(n) { // sem centavos, para as frases de destaque
    return 'R$ ' + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function calcular(entrada) {
    var E = motor();
    var bruto = Math.max(0, parseNumero(entrada && entrada.salario));
    var comFerias = !entrada || entrada.ferias !== false;
    var com13 = !entrada || entrada.decimo !== false;
    var deps = Math.max(0, Math.min(20, Math.round(parseNumero(entrada && entrada.dependentes))));
    if (bruto <= 0) return { vazio: true };

    var mes = E.salarioLiquido({ bruto: bruto, deps: deps });
    var fer = comFerias ? E.ferias({ bruto: bruto, dias: 30, venderDias: 0, deps: deps }) : null;
    var dec = com13 ? E.decimoTerceiro({ bruto: bruto, meses: 12, deps: deps }) : null;

    var mesesSalario = comFerias ? 11 : 12;
    var rendTrib = r2(mesesSalario * bruto + (fer ? fer.baseTributavel : 0));
    var inssAnual = r2(mesesSalario * mes.inss.valor + (fer ? fer.inss.valor : 0));
    var retido = r2(mesesSalario * mes.irrf.valor + (fer ? fer.irrf.valor : 0));

    var ir = E.CALCS.ir.calcular({ rendTrib: rendTrib, inssAnual: inssAnual, irrfRetidoFonte: retido, deps: deps, pensao: 0, despMed: 0, despEduc: 0, livrosCaixa: 0 });
    var linhas = ir.blocos[1].linhas;
    var pega = function (nome) { var l = linhas.filter(function (x) { return x.nome.indexOf(nome) === 0; })[0]; return l ? l.valor : 0; };
    var devido = pega('Imposto devido no ano');
    var saldo = r2(retido - devido); // positivo = restituição
    var simplificada = ir.blocos[0].titulo.indexOf('Simplificada') >= 0;

    var faixa = rendTrib <= E.IRRF_ANUAL_ISENTAO ? 'isento' : (rendTrib <= E.IRRF_ANUAL_TETO_REDUTOR ? 'parcial' : 'sem-reducao');
    var caso = Math.abs(saldo) < 0.5 ? 'zero' : (saldo > 0 ? 'restitui' : 'paga');

    return {
      entrada: { salario: bruto, ferias: comFerias, decimo: com13, dependentes: deps },
      mes: { inss: mes.inss.valor, irrf: mes.irrf.valor, liquido: mes.liquido },
      ferias: fer ? { base: fer.baseTributavel, inss: fer.inss.valor, irrf: fer.irrf.valor, liquido: fer.liquido } : null,
      decimo: dec ? { bruto: dec.bruto13, inss: dec.inss.valor, irrf: dec.irrf.valor, liquido: dec.liquidoTotal } : null,
      ano: { rendTrib: rendTrib, inssAnual: inssAnual, retido: retido, devido: devido, saldo: saldo, simplificada: simplificada, faixa: faixa, caso: caso,
        limiteIsento: E.IRRF_ANUAL_ISENTAO, limiteTeto: E.IRRF_ANUAL_TETO_REDUTOR },
    };
  }

  /* ---------------- Explicação em português simples ---------------- */
  function manchete(r) {
    var a = r.ano;
    if (a.caso === 'restitui') return { lead: 'Pela nossa conta, você deve receber', valor: fmtRound(a.saldo), fim: 'de volta do Imposto de Renda' };
    if (a.caso === 'paga') return { lead: 'Pela nossa conta, você deve pagar', valor: fmtRound(a.saldo), fim: 'de Imposto de Renda na declaração' };
    return { lead: 'Pela nossa conta, você', valor: 'não paga nem recebe', fim: 'nada de Imposto de Renda na declaração' };
  }

  function passos(r) {
    var e = r.entrada, a = r.ano, p = [], n = 0;
    var sal = fmtMoeda(e.salario);
    n++;
    p.push({ n: n, titulo: 'No dia a dia, todo mês', texto: r.mes.irrf > 0
      ? 'Do seu salário de ' + sal + ', a empresa desconta ' + fmtMoeda(r.mes.inss) + ' de INSS e ' + fmtMoeda(r.mes.irrf) + ' de Imposto de Renda. Sobra ' + fmtMoeda(r.mes.liquido) + ' na conta.'
      : 'Do seu salário de ' + sal + ', <strong>não sai Imposto de Renda</strong>: quem ganha até R$ 5.000 por mês está isento (Lei 15.270/2025). Só o INSS é descontado (' + fmtMoeda(r.mes.inss) + '), e sobram ' + fmtMoeda(r.mes.liquido) + '.' });
    if (r.ferias) {
      n++;
      p.push({ n: n, titulo: 'Nas férias', texto: r.ferias.irrf > 0
        ? 'No mês das férias, você recebe o salário mais o terço constitucional, ' + fmtMoeda(r.ferias.base) + ' no total. Esse valor é maior que o de um mês normal, então <strong>as férias descontam</strong>: ' + fmtMoeda(r.ferias.inss) + ' de INSS e <strong>' + fmtMoeda(r.ferias.irrf) + ' de Imposto de Renda</strong>.'
        : 'No mês das férias, você recebe o salário mais o terço constitucional, ' + fmtMoeda(r.ferias.base) + ' no total. Nesse valor também não sai Imposto de Renda; só o INSS (' + fmtMoeda(r.ferias.inss) + ').' });
    }
    if (r.decimo) {
      n++;
      p.push({ n: n, titulo: 'No 13º salário', texto: 'O 13º tem o imposto calculado <strong>à parte</strong> e não entra na soma do ano da declaração. Do seu 13º de ' + fmtMoeda(r.decimo.bruto) + ', ' + (r.decimo.irrf > 0 ? 'saem ' + fmtMoeda(r.decimo.inss) + ' de INSS e ' + fmtMoeda(r.decimo.irrf) + ' de Imposto de Renda.' : 'sai só o INSS (' + fmtMoeda(r.decimo.inss) + '); de Imposto de Renda, nada.') });
    }
    n++;
    var base = e.ferias ? '12 salários (11 meses mais as férias) e o terço de férias' : '12 salários';
    var faixaTxt = a.faixa === 'isento'
      ? 'Como isso fica <strong>até R$ 60.000</strong> no ano, o imposto é zero.'
      : (a.faixa === 'parcial'
        ? 'Como isso fica <strong>entre R$ 60.000 e R$ 88.200</strong>, você entra na faixa de transição: o imposto existe, mas recebe um desconto que diminui conforme o rendimento sobe.'
        : 'Como isso passa de R$ 88.200, não há o desconto da lei de 2025.');
    p.push({ n: n, titulo: 'Na declaração do ano', texto: 'Para a declaração, o que conta é só o que é tributável: ' + base + ', ou seja, <strong>' + fmtMoeda(a.rendTrib) + '</strong> (o 13º fica de fora). ' + faixaTxt + ' O imposto devido no ano fica em <strong>' + fmtMoeda(a.devido) + '</strong>, usando a declaração ' + (a.simplificada ? 'simplificada' : 'completa') + ', que compensa mais.' });
    n++;
    var conta = 'Durante o ano, já foram descontados <strong>' + fmtMoeda(a.retido) + '</strong> de Imposto de Renda na fonte' + (r.ferias && r.ferias.irrf > 0 && r.mes.irrf === 0 ? ' (tudo no mês das férias)' : '') + '. ';
    var fecho = a.caso === 'restitui' ? 'Como você pagou mais do que devia, a Receita devolve <strong>' + fmtMoeda(a.saldo) + '</strong>.'
      : (a.caso === 'paga' ? 'Como você pagou menos do que devia, falta <strong>' + fmtMoeda(-a.saldo) + '</strong>, que se paga na declaração e pode ser parcelado em até 8 vezes.' : 'Como o pago e o devido são praticamente iguais, não sobra diferença.');
    p.push({ n: n, titulo: 'No fim das contas', texto: conta + fecho });
    return p;
  }

  function resultadoHTML(r) {
    if (r.vazio) return '<p class="irs-vazio">Digite o seu salário para ver a conta.</p>';
    var m = manchete(r), h = [];
    h.push('<div class="irs-hero"><p class="irs-lead">' + m.lead + '</p><p class="irs-valor"><strong>' + m.valor + '</strong></p><p class="irs-fim">' + m.fim + '</p></div>');
    h.push('<ol class="irs-passos">');
    passos(r).forEach(function (s) { h.push('<li><span class="irs-n">' + s.n + '</span><div><h3>' + s.titulo + '</h3><p>' + s.texto + '</p></div></li>'); });
    h.push('</ol>');
    h.push('<p class="irs-aviso">É uma estimativa para quem tem uma só fonte de renda, sem despesas médicas, de educação ou pensão. O valor real depende do seu informe de rendimentos e das suas deduções.</p>');
    return h.join('');
  }

  function textoCompartilhar(r, url) {
    var m = manchete(r);
    var t = r.ano.caso === 'zero' ? 'Fiz a conta do Imposto de Renda 2027 com meu salário, férias e 13º: não pago nem recebo nada.'
      : 'Fiz a conta do Imposto de Renda 2027 com meu salário, férias e 13º: ' + m.lead.replace('Pela nossa conta, você deve', 'devo') + ' ' + m.valor + (r.ano.caso === 'restitui' ? ' de volta.' : ' na declaração.');
    return t + ' Faça a sua, é grátis: ' + url;
  }

  return { calcular: calcular, resultadoHTML: resultadoHTML, manchete: manchete, passos: passos, textoCompartilhar: textoCompartilhar, parseNumero: parseNumero, fmtMoeda: fmtMoeda };
});
