/* ============================================================
   Jornada Brasil — Quinto dia útil (prazo do salário mensal)
   Motor puro (sem DOM): roda no navegador (window.JBDiaUtil) e no Node (testes).

   Regras:
   - o salário mensal deve ser pago até o 5º dia útil do mês seguinte
     ao trabalhado (CLT, art. 459, § 1º);
   - para essa contagem, o sábado é dia útil; domingos e feriados, inclusive
     os municipais, não (Instrução Normativa MTP nº 2/2021, art. 14, que
     orienta a fiscalização; ela revogou a IN SRT nº 1/1989);
   - feriados nacionais: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11 e
     25/12 (Leis 662/1949, 6.802/1980, 10.607/2002 e 14.759/2023), mais a
     Sexta-feira Santa, feriado religioso municipal adotado em quase todas
     as cidades (Lei 9.093/1995). Carnaval e Corpus Christi só contam onde
     houver lei local: a pessoa informa os feriados da cidade ou do estado.
   - empregada doméstica tem regra própria: até o dia 7 do mês seguinte
     (LC 150/2015, art. 35), fora desta conta.
   As datas são tratadas em UTC para não depender do fuso do aparelho.
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JBDiaUtil = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  var FIXOS = [
    ['01-01', 'Confraternização Universal'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
    ['12-25', 'Natal'],
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(ano, mes, dia) { return ano + '-' + pad(mes) + '-' + pad(dia); }
  function utc(ano, mes, dia) { return new Date(Date.UTC(ano, mes - 1, dia)); }
  function diasNoMes(ano, mes) { return new Date(Date.UTC(ano, mes, 0)).getUTCDate(); }

  // Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)
  function pascoa(ano) {
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31);
    var dia = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(ano, mes, dia);
  }

  function somarDias(dataIso, n) {
    var p = dataIso.split('-').map(Number);
    var d = utc(p[0], p[1], p[2] + n);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  // { 'AAAA-MM-DD': 'nome' }
  function feriadosNacionais(ano) {
    var lista = {};
    FIXOS.forEach(function (f) { lista[ano + '-' + f[0]] = f[1]; });
    lista[somarDias(pascoa(ano), -2)] = 'Sexta-feira Santa (municipal)';
    return lista;
  }

  // Aceita "20", "20, 24", "20/11" ou "2026-11-20" e devolve datas do mês pedido
  function lerFeriadosExtras(texto, ano, mes) {
    if (!texto) return [];
    var max = diasNoMes(ano, mes), saida = [];
    String(texto).split(/[,;\s]+/).forEach(function (parte) {
      if (!parte) return;
      var m = parte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) { if (+m[1] === ano && +m[2] === mes) saida.push(iso(ano, mes, +m[3])); return; }
      m = parte.match(/^(\d{1,2})(?:\/(\d{1,2}))?$/);
      if (!m) return;
      var dia = +m[1];
      if (m[2] && +m[2] !== mes) return;
      if (dia >= 1 && dia <= max) saida.push(iso(ano, mes, dia));
    });
    return saida.filter(function (d, i) { return saida.indexOf(d) === i; });
  }

  // n-ésimo dia útil do mês (n = 5 para o salário)
  function diaUtil(ano, mes, opcoes) {
    opcoes = opcoes || {};
    var n = opcoes.n || 5;
    var sabadoUtil = opcoes.sabadoUtil !== false;
    var nacionais = feriadosNacionais(ano);
    var extras = lerFeriadosExtras(opcoes.feriadosExtras, ano, mes);
    var contados = [], pulados = [];
    var total = diasNoMes(ano, mes);
    for (var dia = 1; dia <= total && contados.length < n; dia++) {
      var data = iso(ano, mes, dia);
      var sem = utc(ano, mes, dia).getUTCDay();
      if (sem === 0) { pulados.push({ data: data, motivo: 'domingo' }); continue; }
      if (sem === 6 && !sabadoUtil) { pulados.push({ data: data, motivo: 'sábado' }); continue; }
      if (nacionais[data]) { pulados.push({ data: data, motivo: 'feriado: ' + nacionais[data] }); continue; }
      if (extras.indexOf(data) >= 0) { pulados.push({ data: data, motivo: 'feriado local' }); continue; }
      contados.push(data);
    }
    var alvo = contados[n - 1];
    var semAlvo = alvo ? utc(ano, mes, +alvo.slice(8)).getUTCDay() : null;
    return {
      ano: ano, mes: mes, n: n, sabadoUtil: sabadoUtil,
      data: alvo,
      dia: alvo ? +alvo.slice(8) : null,
      diaSemana: semAlvo === null ? null : SEMANA[semAlvo],
      sabado: semAlvo === 6,
      contados: contados,
      pulados: pulados,
      feriadosExtras: extras,
    };
  }

  function tabela(inicioAno, inicioMes, quantidade, opcoes) {
    var lista = [], ano = inicioAno, mes = inicioMes;
    for (var i = 0; i < quantidade; i++) {
      lista.push(diaUtil(ano, mes, opcoes));
      mes++;
      if (mes > 12) { mes = 1; ano++; }
    }
    return lista;
  }

  /* ---------------- Textos ---------------- */
  function dataCurta(dataIso) { return +dataIso.slice(8) + '/' + +dataIso.slice(5, 7); }
  function nomeMes(mes) { return MESES[mes - 1]; }
  function mesAnterior(ano, mes) { return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano: ano, mes: mes - 1 }; }

  function frase(r) {
    return 'O ' + r.n + 'º dia útil de ' + nomeMes(r.mes) + ' de ' + r.ano + ' é ' + r.diaSemana + ', ' + dataCurta(r.data) + '.';
  }

  function resultadoHTML(r) {
    var ant = mesAnterior(r.ano, r.mes), h = [];
    var ultimoSalario = 'o salário de ' + nomeMes(ant.mes) + (ant.ano !== r.ano ? ' de ' + ant.ano : '');
    h.push('<div class="qdu-hero">',
      '<p class="qdu-lead">O 5º dia útil de ' + nomeMes(r.mes) + ' de ' + r.ano + ' é</p>',
      '<p class="qdu-data"><strong>' + r.dia + '/' + pad(r.mes) + '</strong> ' + r.diaSemana + '</p>',
      '<p class="qdu-sub">Prazo para pagar ' + ultimoSalario + ' (CLT, art. 459).</p>',
      '</div>');
    if (r.sabado) {
      h.push('<p class="qdu-nota">Cai num <strong>sábado</strong>. O sábado conta como dia útil: o dinheiro precisa estar disponível até esse dia (por PIX, por exemplo). Como não há compensação bancária no sábado, muitas empresas depositam na sexta, e algumas convenções coletivas exigem isso. Pagar antes pode; depois, não.</p>');
    }
    // contagem
    h.push('<ol class="qdu-conta">');
    r.contados.forEach(function (d, i) {
      var sem = SEMANA_CURTA[utc(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8)).getUTCDay()];
      h.push('<li' + (i === r.contados.length - 1 ? ' class="alvo"' : '') + '><span>' + (i + 1) + 'º dia útil</span><strong>' + sem + ', ' + dataCurta(d) + '</strong></li>');
    });
    h.push('</ol>');
    var naoContam = r.pulados.filter(function (p) { return p.data < r.data; });
    if (naoContam.length) {
      h.push('<p class="qdu-pulados">Não contam: ' + naoContam.map(function (p) { return dataCurta(p.data) + ' (' + p.motivo + ')'; }).join(', ') + '.</p>');
    }
    // calendário do mês
    var total = diasNoMes(r.ano, r.mes), primeiro = utc(r.ano, r.mes, 1).getUTCDay();
    var nacionais = feriadosNacionais(r.ano);
    h.push('<table class="qdu-cal" aria-label="Calendário de ' + nomeMes(r.mes) + ' de ' + r.ano + '"><thead><tr>');
    SEMANA_CURTA.forEach(function (s) { h.push('<th scope="col">' + s + '</th>'); });
    h.push('</tr></thead><tbody><tr>');
    for (var v = 0; v < primeiro; v++) h.push('<td></td>');
    for (var dia = 1; dia <= total; dia++) {
      var data = iso(r.ano, r.mes, dia), sem = (primeiro + dia - 1) % 7;
      var cls = [];
      if (r.contados.indexOf(data) >= 0) cls.push('util');
      if (data === r.data) cls.push('alvo');
      if (nacionais[data] || r.feriadosExtras.indexOf(data) >= 0) cls.push('feriado');
      if (sem === 0) cls.push('dom');
      h.push('<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + dia + '</td>');
      if (sem === 6 && dia < total) h.push('</tr><tr>');
    }
    h.push('</tr></tbody></table>');
    return h.join('');
  }

  function tabelaHTML(lista) {
    var h = ['<table class="data-table qdu-tabela"><thead><tr><th>Mês do pagamento</th><th>5º dia útil</th><th>Salário referente a</th></tr></thead><tbody>'];
    lista.forEach(function (r) {
      var ant = mesAnterior(r.ano, r.mes);
      h.push('<tr id="' + nomeMes(r.mes).replace('ç', 'c') + '-' + r.ano + '"><td>' + nomeMes(r.mes).replace(/^./, function (c) { return c.toUpperCase(); }) + ' de ' + r.ano + '</td>',
        '<td><strong>' + dataCurta(r.data) + '</strong> (' + r.diaSemana + ')</td>',
        '<td>' + nomeMes(ant.mes) + ' de ' + ant.ano + '</td></tr>');
    });
    h.push('</tbody></table>');
    return h.join('');
  }

  function textoCompartilhar(r, url) {
    return frase(r) + (r.sabado ? ' Cai num sábado: muitas empresas pagam na sexta.' : '') + ' Veja o de todos os meses: ' + url;
  }

  return {
    pascoa: pascoa,
    feriadosNacionais: feriadosNacionais,
    lerFeriadosExtras: lerFeriadosExtras,
    diaUtil: diaUtil,
    tabela: tabela,
    frase: frase,
    resultadoHTML: resultadoHTML,
    tabelaHTML: tabelaHTML,
    textoCompartilhar: textoCompartilhar,
    nomeMes: nomeMes,
    dataCurta: dataCurta,
  };
});
