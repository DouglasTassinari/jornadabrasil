/* ============================================================
   Jornada Brasil — tela do Quinto dia útil (usa window.JBDiaUtil).
   - abre no próximo pagamento de salário (data de Brasília);
   - aceita ?m=12&a=2026 para abrir num mês;
   - atualiza a cada mudança e prepara o texto do WhatsApp.
   ============================================================ */
(function () {
  'use strict';
  var Q = window.JBDiaUtil;
  var form = document.getElementById('qdu-form');
  var saida = document.getElementById('qdu-resultado');
  if (!Q || !form || !saida) return;

  var URL_PAGINA = 'https://jornadabrasil.com.br/quinto-dia-util/';
  var feedback = document.getElementById('qdu-feedback');
  var atual = null, calculou = false;

  function track(nome, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', nome, params || {}); } catch (e) { /* sem analytics */ }
  }
  function link(origem) { return URL_PAGINA + '?utm_source=' + origem + '&utm_medium=compartilhamento&utm_campaign=quinto-dia-util'; }

  function hojeBrasilia() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  }

  // Mês do próximo pagamento: se o 5º dia útil deste mês já passou, vai para o seguinte
  function proximoMes() {
    var h = hojeBrasilia(), ano = +h.slice(0, 4), mes = +h.slice(5, 7);
    if (h > Q.diaUtil(ano, mes).data) { mes++; if (mes > 12) { mes = 1; ano++; } }
    return { ano: ano, mes: mes };
  }

  function garantirAno(ano) {
    var sel = form.elements.ano;
    var existe = Array.prototype.some.call(sel.options, function (o) { return +o.value === ano; });
    if (!existe && ano > 2000 && ano < 2100) {
      var op = document.createElement('option');
      op.value = String(ano); op.textContent = String(ano);
      sel.appendChild(op);
    }
  }

  function ler() {
    var el = form.elements;
    return { ano: +el.ano.value, mes: +el.mes.value, sabadoUtil: el.sabado.checked, feriadosExtras: el.feriados.value };
  }

  function atualizar(peloUsuario) {
    var e = ler();
    atual = Q.diaUtil(e.ano, e.mes, { sabadoUtil: e.sabadoUtil, feriadosExtras: e.feriadosExtras });
    if (!atual.data) return;
    saida.innerHTML = Q.resultadoHTML(atual);
    var wa = document.getElementById('qdu-wa');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(Q.textoCompartilhar(atual, link('whatsapp')));
    if (peloUsuario && !calculou) { calculou = true; track('quinto_dia_util_calculo', { mes: e.mes, ano: e.ano }); }
  }

  function iniciar() {
    var p = null;
    try { p = new URLSearchParams(window.location.search); } catch (e) { /* navegador antigo */ }
    var alvo = proximoMes();
    var m = p && +p.get('m'), a = p && +p.get('a');
    if (m >= 1 && m <= 12) alvo.mes = m;
    if (a > 2000 && a < 2100) alvo.ano = a;
    garantirAno(alvo.ano);
    form.elements.mes.value = String(alvo.mes);
    form.elements.ano.value = String(alvo.ano);
    atualizar(false);
  }

  function avisar(msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { feedback.textContent = ''; }, 4000);
  }

  form.addEventListener('input', function () { atualizar(true); });
  form.addEventListener('change', function () { atualizar(true); });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); atualizar(true); });

  var wa = document.getElementById('qdu-wa');
  if (wa) wa.addEventListener('click', function () { track('quinto_dia_util_compartilhar', { metodo: 'whatsapp' }); });
  var copiar = document.getElementById('qdu-copiar');
  if (copiar) copiar.addEventListener('click', function () {
    track('quinto_dia_util_compartilhar', { metodo: 'copiar' });
    var texto = Q.textoCompartilhar(atual, link('link'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { avisar('Texto e link copiados.'); }, function () { avisar('Não consegui copiar. Selecione e copie o texto do resultado.'); });
    } else { avisar('Seu navegador não permite copiar automaticamente.'); }
  });

  iniciar();
})();
