/* ============================================================
   Jornada Brasil — Calculadora da escala 6x1 para 5x2
   Motor puro (sem DOM): roda no navegador (window.JBEscala) e no Node (testes).

   Regras — Emenda Constitucional 141/2026, publicada em 16/10/2026:
   - a partir de 16/12/2026: 2 dias de descanso remunerado por semana e
     no máximo 42 horas semanais;
   - a partir de 16/12/2027: no máximo 40 horas semanais;
   - o limite de 8 horas por dia continua; quem já faz 40 horas ou menos
     não tem a jornada reduzida, mas ganha os 2 dias de descanso (art. 4º);
   - o salário não pode diminuir (art. 2º);
   - a 12x36 continua permitida (CLT, art. 59-A).

   Contas (médias do calendário, sem depender de um ano específico):
   - base = 365 − férias (30 dias, se marcadas) − feriados de folga;
   - dias de trabalho no ano = base × dias de trabalho por semana ÷ 7
     (um feriado só vira folga extra quando cai num dia que seria de trabalho);
   - horas de trabalho no ano = base × horas semanais ÷ 7;
   - 12x36: um dia de trabalho e um de descanso → (365 − férias) ÷ 2 plantões
     de 12 h; os feriados já são compensados (CLT, art. 59-A, parágrafo único);
   - valor da hora = salário ÷ (horas semanais × 5) → divisores 220 (44 h),
     210 (42 h) e 200 (40 h), os mesmos das outras calculadoras do site;
   - tempo acordado = 16 horas por dia (8 horas de sono).
   Os dias são arredondados antes de calcular as diferenças, para que os
   números exibidos fechem entre si (279 − 233 = 46).
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JBEscala = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIAS_ANO = 365;
  var DIAS_FERIAS = 30;
  var HORAS_ACORDADO_DIA = 16;
  var LIMITE_HOJE = 44;
  var LIMITE_2026 = 42;
  var LIMITE_2027 = 40;
  var FERIADOS_PADRAO = 9; // feriados nacionais (Leis 662/1949, 6.802/1980, 10.607/2002 e 14.759/2023)

  var PADROES = {
    '6x1': { dias: 6, horas: 44 },
    '5x2': { dias: 5, horas: 44 },
    '12x36': { dias: 3.5, horas: 42 },
    'outra': { dias: 6, horas: 44 },
  };

  function numero(valor, padrao) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : padrao;
    if (valor === null || valor === undefined) return padrao;
    var n = parseNumero(String(valor));
    return n === null ? padrao : n;
  }

  // Aceita "2.200", "2200", "2.200,50", "2200,5" e "2200.50".
  function parseNumero(texto) {
    var s = String(texto).trim().replace(/[R$\s]/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function limitar(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function arred(n, casas) { var f = Math.pow(10, casas || 0); return Math.round(n * f) / f; }

  function nomeEscala(dias) {
    if (dias === 3.5) return '12x36';
    return dias + 'x' + (7 - dias);
  }

  function normalizar(e) {
    e = e || {};
    var escala = PADROES[e.escala] ? e.escala : '6x1';
    var dias = PADROES[escala].dias;
    if (escala === 'outra') dias = limitar(Math.round(numero(e.dias, 6)), 1, 6);
    var horas = escala === '12x36' ? 42 : limitar(numero(e.horas, PADROES[escala].horas), 1, LIMITE_HOJE);
    return {
      escala: escala,
      dias: dias,
      horas: horas,
      deslocamentoMin: limitar(numero(e.deslocamentoMin, 60), 0, 600),
      feriados: limitar(Math.round(numero(e.feriados, FERIADOS_PADRAO)), 0, 30),
      ferias: e.ferias === undefined ? true : !!e.ferias && e.ferias !== '0' && e.ferias !== 'false',
      salario: Math.max(0, numero(e.salario, 0)),
    };
  }

  // Um regime de trabalho ao longo de um ano.
  function regime(dias, horas, en) {
    var ferias = en.ferias ? DIAS_FERIAS : 0;
    var diasExato, horasExato;
    if (dias === 3.5) {
      diasExato = (DIAS_ANO - ferias) / 2;
      horasExato = diasExato * 12;
    } else {
      var base = DIAS_ANO - ferias - en.feriados;
      diasExato = base * dias / 7;
      horasExato = base * horas / 7;
    }
    var deslocExato = diasExato * en.deslocamentoMin / 60;
    var diasTrabalho = Math.round(diasExato);
    return {
      escala: nomeEscala(dias),
      diasSemana: dias,
      horasSemana: horas,
      diasTrabalho: diasTrabalho,
      diasLivres: DIAS_ANO - diasTrabalho,
      horasTrabalho: Math.round(horasExato),
      horasDeslocamento: Math.round(deslocExato),
      pctAcordado: Math.round((horasExato + deslocExato) / (DIAS_ANO * HORAS_ACORDADO_DIA) * 100),
    };
  }

  // "1 ano e 3 meses", "8 meses", "2 anos"
  function textoTempo(dias) {
    dias = Math.max(0, Math.round(dias));
    var anos = Math.floor(dias / DIAS_ANO);
    var meses = Math.floor((dias - anos * DIAS_ANO) / (DIAS_ANO / 12));
    var partes = [];
    if (anos) partes.push(anos + (anos === 1 ? ' ano' : ' anos'));
    if (meses) partes.push(meses + (meses === 1 ? ' mês' : ' meses'));
    if (!partes.length) return dias + (dias === 1 ? ' dia' : ' dias');
    return partes.join(' e ');
  }

  function calcular(entrada) {
    var en = normalizar(entrada);
    var hoje = regime(en.dias, en.horas, en);
    var caso;
    var r2026, r2027;

    if (en.escala === '12x36') {
      caso = '12x36';
      r2026 = hoje;
      r2027 = hoje;
    } else {
      var diasNovo = Math.min(en.dias, 5);
      r2026 = regime(diasNovo, Math.min(en.horas, LIMITE_2026), en);
      r2027 = regime(diasNovo, Math.min(en.horas, LIMITE_2027), en);
      if (en.dias >= 6) caso = 'ganha-dias';
      else if (en.horas > LIMITE_2027) caso = 'so-horas';
      else caso = 'ja-cumpre';
    }

    var diasPorAno = hoje.diasTrabalho - r2026.diasTrabalho;
    var ganho = {
      diasPorAno: diasPorAno,
      dias10Anos: diasPorAno * 10,
      tempo10Anos: textoTempo(diasPorAno * 10),
      horas2026: hoje.horasTrabalho - r2026.horasTrabalho,
      horas2027: hoje.horasTrabalho - r2027.horasTrabalho,
      deslocamentoHoras: hoje.horasDeslocamento - r2026.horasDeslocamento,
    };

    var valorHora = null;
    if (en.salario > 0) {
      var vHoje = en.salario / (en.horas * 5);
      var v2026 = en.salario / (r2026.horasSemana * 5);
      var v2027 = en.salario / (r2027.horasSemana * 5);
      valorHora = {
        hoje: arred(vHoje, 2),
        r2026: arred(v2026, 2),
        r2027: arred(v2027, 2),
        aumentoPct2026: arred((v2026 / vHoje - 1) * 100, 1),
        aumentoPct2027: arred((v2027 / vHoje - 1) * 100, 1),
      };
    }

    var comparacao = [
      { escala: '6x1', diasLivres: regime(6, 44, en).diasLivres },
      { escala: '5x2', diasLivres: regime(5, 42, en).diasLivres },
      { escala: '12x36', diasLivres: regime(3.5, 42, en).diasLivres },
      { escala: '4x3', diasLivres: regime(4, 36, en).diasLivres, hipotetica: true },
    ];

    return { entrada: en, caso: caso, hoje: hoje, r2026: r2026, r2027: r2027, ganho: ganho, valorHora: valorHora, comparacao: comparacao };
  }

  /* ---------------- Formatação (pt-BR, sem depender do Intl) ---------------- */
  function fmtInt(n) {
    var s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '−' : '') + s;
  }
  function fmtMoeda(n) {
    var partes = Math.abs(n).toFixed(2).split('.');
    return 'R$ ' + partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + partes[1];
  }
  function fmtPct(n) { return String(n).replace('.', ',') + '%'; }

  function premissas(en) {
    var p = [];
    p.push(en.ferias ? '30 dias de férias' : 'sem férias');
    p.push(en.feriados === 1 ? '1 feriado de folga' : en.feriados + ' feriados de folga');
    return p.join(' e ') + ' por ano';
  }

  /* ---------------- Resultado em HTML (tela e versão estática da página) ---------------- */
  function resultadoHTML(r) {
    var en = r.entrada, g = r.ganho, h = [];
    var nomeHoje = r.hoje.escala;

    if (r.caso === 'ganha-dias') {
      h.push('<div class="esc-hero">',
        '<p class="esc-hero-lead">Com o fim da escala ' + nomeHoje + ', você ganha</p>',
        '<p class="esc-hero-num"><strong>' + fmtInt(g.diasPorAno) + '</strong> dias</p>',
        '<p class="esc-hero-sub">sem trabalhar por ano</p>',
        '<p class="esc-hero-10">Em 10 anos, são ' + fmtInt(g.dias10Anos) + ' dias: mais de <strong>' + g.tempo10Anos + '</strong> de folga.</p>',
        '</div>');
    } else if (r.caso === 'so-horas') {
      h.push('<div class="esc-hero">',
        '<p class="esc-hero-lead">Você já tem 2 folgas por semana. Com a nova jornada, você trabalha</p>',
        '<p class="esc-hero-num"><strong>' + fmtInt(g.horas2027) + '</strong> horas</p>',
        '<p class="esc-hero-sub">a menos por ano</p>',
        '<p class="esc-hero-10">São ' + fmtInt(g.horas2026) + ' h a menos a partir de 16/12/2026 (42 h) e ' + fmtInt(g.horas2027) + ' h a partir de 16/12/2027 (40 h).</p>',
        '</div>');
    } else if (r.caso === '12x36') {
      h.push('<div class="esc-hero">',
        '<p class="esc-hero-lead">Na 12x36, você tem</p>',
        '<p class="esc-hero-num"><strong>' + fmtInt(r.hoje.diasLivres) + '</strong> dias</p>',
        '<p class="esc-hero-sub">sem trabalhar por ano</p>',
        '<p class="esc-hero-10">A 12x36 continua prevista na CLT (art. 59-A). Com a emenda, escalas diferentes da regra geral devem estar em acordo ou convenção coletiva, e o limite de 40 horas, a partir de 16/12/2027, ainda depende de negociação ou de lei para essa escala.</p>',
        '</div>');
    } else {
      h.push('<div class="esc-hero">',
        '<p class="esc-hero-lead">Sua escala já cumpre a nova regra</p>',
        '<p class="esc-hero-num"><strong>' + fmtInt(r.hoje.diasLivres) + '</strong> dias</p>',
        '<p class="esc-hero-sub">sem trabalhar por ano</p>',
        '<p class="esc-hero-10">Você já tem 2 folgas por semana e até 40 horas. A emenda não reduz a jornada de quem já faz 40 horas ou menos, e o salário continua protegido.</p>',
        '</div>');
    }

    var muda = r.caso === 'ganha-dias' || r.caso === 'so-horas';
    var cols = muda
      ? [{ t: 'Hoje', s: nomeHoje + ', ' + fmtInt(en.horas) + ' h', v: r.hoje },
         { t: '16/12/2026', s: r.r2026.escala + ', até ' + r.r2026.horasSemana + ' h', v: r.r2026 },
         { t: '16/12/2027', s: r.r2027.escala + ', até ' + r.r2027.horasSemana + ' h', v: r.r2027 }]
      : [{ t: 'Sua escala', s: nomeHoje + ', ' + fmtInt(en.horas) + ' h', v: r.hoje }];

    var linhas = [
      ['Dias de trabalho no ano', function (v) { return fmtInt(v.diasTrabalho); }],
      ['Dias sem trabalho no ano', function (v) { return fmtInt(v.diasLivres); }],
      ['Horas de trabalho no ano', function (v) { return fmtInt(v.horasTrabalho) + ' h'; }],
    ];
    if (en.deslocamentoMin > 0) linhas.push(['Horas no trânsito no ano', function (v) { return fmtInt(v.horasDeslocamento) + ' h'; }]);
    linhas.push(['Do seu tempo acordado vai para o trabalho', function (v) { return v.pctAcordado + '%'; }]);

    h.push('<div class="esc-tab-wrap"><table class="esc-tab"><thead><tr><th scope="col"><span class="sr-only">Item</span></th>');
    cols.forEach(function (c) { h.push('<th scope="col">' + c.t + '<small>' + c.s + '</small></th>'); });
    h.push('</tr></thead><tbody>');
    linhas.forEach(function (l) {
      h.push('<tr><th scope="row">' + l[0] + '</th>');
      cols.forEach(function (c, i) { h.push('<td' + (i > 0 ? ' class="novo"' : '') + '>' + l[1](c.v) + '</td>'); });
      h.push('</tr>');
    });
    if (r.valorHora) {
      var vh = r.valorHora;
      var valores = muda ? [vh.hoje, vh.r2026, vh.r2027] : [vh.hoje];
      h.push('<tr><th scope="row">Valor da sua hora</th>');
      valores.forEach(function (v, i) { h.push('<td' + (i > 0 ? ' class="novo"' : '') + '>' + fmtMoeda(v) + '</td>'); });
      h.push('</tr>');
    }
    h.push('</tbody></table></div>');

    if (r.valorHora && muda && r.valorHora.aumentoPct2027 > 0) {
      h.push('<p class="esc-nota esc-nota--ok">Mesmo salário com menos horas: o valor da sua hora sobe ' + fmtPct(r.valorHora.aumentoPct2026) +
        ' em dezembro de 2026 e ' + fmtPct(r.valorHora.aumentoPct2027) + ' em dezembro de 2027. Isso também aumenta a hora extra e o adicional noturno.</p>');
    }

    var max = 0;
    r.comparacao.forEach(function (c) { if (c.diasLivres > max) max = c.diasLivres; });
    var atual = r.caso === '12x36' ? '12x36' : nomeHoje;
    h.push('<div class="esc-barras" role="group" aria-label="Dias sem trabalho por ano em cada escala"><p class="grupo-tit">Dias sem trabalho por ano em cada escala</p>');
    r.comparacao.forEach(function (c) {
      var nova = r.caso === 'ganha-dias' && c.escala === '5x2';
      var marca = c.escala === atual ? ' <em>você hoje</em>' : (nova ? ' <em>nova regra</em>' : '');
      h.push('<div class="esc-barra' + (c.escala === atual ? ' atual' : '') + (nova ? ' nova' : '') + (c.hipotetica ? ' hip' : '') + '">',
        '<span class="rot">' + c.escala + (c.hipotetica ? ' <small>hipotética</small>' : '') + marca + '</span>',
        '<span class="trilho"><span class="fill" style="width:' + Math.round(c.diasLivres / max * 100) + '%"></span></span>',
        '<span class="n">' + fmtInt(c.diasLivres) + '</span></div>');
    });
    h.push('</div>');
    h.push('<p class="esc-premissas">Estimativa com ' + premissas(en) + (en.deslocamentoMin ? ' e ' + fmtInt(en.deslocamentoMin) + ' min de deslocamento por dia de trabalho' : '') +
      '. A 4x3 não está na emenda: aparece só para comparar.</p>');
    return h.join('');
  }

  /* ---------------- Card para compartilhar (o desenho fica no navegador) ---------------- */
  function cartao(r) {
    var g = r.ganho, rod = 'Estimativa com ' + premissas(r.entrada);
    if (r.caso === 'ganha-dias') {
      return { chamada: 'FIM DA ESCALA 6x1', lead: 'Com a nova regra, eu ganho', numero: fmtInt(g.diasPorAno),
        unidade: ['dias sem trabalhar', 'por ano'],
        fatos: ['Hoje: ' + fmtInt(r.hoje.diasTrabalho) + ' dias de trabalho no ano', 'Na 5x2: ' + fmtInt(r.r2026.diasTrabalho) + ' dias', 'Em 10 anos: mais de ' + g.tempo10Anos + ' de folga'],
        rodape: rod };
    }
    if (r.caso === 'so-horas') {
      return { chamada: 'NOVA JORNADA DE TRABALHO', lead: 'Com a nova jornada, eu trabalho', numero: fmtInt(g.horas2027),
        unidade: ['horas a menos', 'por ano'],
        fatos: [fmtInt(g.horas2026) + ' h a menos a partir de 16/12/2026', fmtInt(g.horas2027) + ' h a menos a partir de 16/12/2027', 'Mesmo salário, por lei'],
        rodape: rod };
    }
    return { chamada: r.caso === '12x36' ? 'ESCALA 12x36' : 'MINHA ESCALA', lead: r.caso === '12x36' ? 'Na 12x36, eu tenho' : 'Na minha escala, eu tenho',
      numero: fmtInt(r.hoje.diasLivres), unidade: ['dias sem trabalhar', 'por ano'],
      fatos: [fmtInt(r.hoje.diasTrabalho) + ' dias de trabalho no ano', fmtInt(r.hoje.horasTrabalho) + ' horas de trabalho no ano', 'Quanto você ganha com o fim da 6x1?'],
      rodape: rod };
  }

  // Uma linha para a barra fixa do celular
  function resumoCurto(r) {
    if (r.caso === 'ganha-dias') return 'Você ganha <strong>' + fmtInt(r.ganho.diasPorAno) + ' dias</strong> de folga por ano';
    if (r.caso === 'so-horas') return 'Você trabalha <strong>' + fmtInt(r.ganho.horas2027) + ' h</strong> a menos por ano';
    return 'Você tem <strong>' + fmtInt(r.hoje.diasLivres) + ' dias</strong> sem trabalho por ano';
  }

  function textoCompartilhar(r, url) {
    var g = r.ganho, t;
    if (r.caso === 'ganha-dias') t = 'Fiz a conta: com o fim da escala 6x1, eu ganho ' + fmtInt(g.diasPorAno) + ' dias sem trabalhar por ano. Em 10 anos, é mais de ' + g.tempo10Anos + ' de folga.';
    else if (r.caso === 'so-horas') t = 'Fiz a conta: com a nova jornada, eu trabalho ' + fmtInt(g.horas2027) + ' horas a menos por ano, com o mesmo salário.';
    else t = 'Fiz a conta da minha escala: tenho ' + fmtInt(r.hoje.diasLivres) + ' dias sem trabalhar por ano.';
    return t + ' Quantos dias de folga você ganha com o fim da 6x1? Faça a sua conta: ' + url;
  }

  return {
    calcular: calcular,
    normalizar: normalizar,
    parseNumero: parseNumero,
    textoTempo: textoTempo,
    nomeEscala: nomeEscala,
    resultadoHTML: resultadoHTML,
    cartao: cartao,
    resumoCurto: resumoCurto,
    textoCompartilhar: textoCompartilhar,
    fmtInt: fmtInt,
    fmtMoeda: fmtMoeda,
    FERIADOS_PADRAO: FERIADOS_PADRAO,
  };
});
