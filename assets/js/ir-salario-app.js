/* Tela da calculadora "Vou pagar ou receber Imposto de Renda?" (usa window.JBIRSalario e window.RCEngine).
   Atualiza a cada mudança; nada do que a pessoa digita sai do aparelho. */
(function () {
  'use strict';
  var J = window.JBIRSalario, form = document.getElementById('irs-form'), saida = document.getElementById('irs-resultado');
  if (!J || !window.RCEngine || !form || !saida) return;
  var URL_PAGINA = 'https://jornadabrasil.com.br/imposto-de-renda-salario/';
  var feedback = document.getElementById('irs-feedback'), atual = null, calculou = false;

  function track(n, p) { try { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); } catch (e) { /* sem analytics */ } }
  function link(o) { return URL_PAGINA + '?utm_source=' + o + '&utm_medium=compartilhamento&utm_campaign=ir-salario'; }

  function ler() {
    var el = form.elements;
    return { salario: el.salario.value, ferias: el.ferias.checked, decimo: el.decimo.checked, dependentes: el.deps.value };
  }

  function atualizar(user) {
    atual = J.calcular(ler());
    saida.innerHTML = J.resultadoHTML(atual);
    var box = document.getElementById('irs-share');
    if (box) box.hidden = !!atual.vazio;
    if (!atual.vazio) {
      var wa = document.getElementById('irs-wa');
      if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(J.textoCompartilhar(atual, link('whatsapp')));
      if (user && !calculou) { calculou = true; track('ir_salario_calculo', { caso: atual.ano.caso }); }
    }
  }

  function avisar(m) { if (!feedback) return; feedback.textContent = m; clearTimeout(avisar.t); avisar.t = setTimeout(function () { feedback.textContent = ''; }, 4000); }

  var p = null;
  try { p = new URLSearchParams(window.location.search); } catch (e) { /* navegador antigo */ }
  if (p && p.get('s')) form.elements.salario.value = p.get('s');
  form.addEventListener('input', function () { atualizar(true); });
  form.addEventListener('change', function () { atualizar(true); });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); atualizar(true); });
  var wa = document.getElementById('irs-wa');
  if (wa) wa.addEventListener('click', function () { track('ir_salario_compartilhar', { metodo: 'whatsapp' }); });
  var cp = document.getElementById('irs-copiar');
  if (cp) cp.addEventListener('click', function () {
    track('ir_salario_compartilhar', { metodo: 'copiar' });
    if (!atual || atual.vazio) return;
    var t = J.textoCompartilhar(atual, link('link'));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { avisar('Texto e link copiados.'); }, function () { avisar('Não consegui copiar.'); });
    else avisar('Seu navegador não permite copiar automaticamente.');
  });
  atualizar(false);
})();
