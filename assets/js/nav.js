/* =====================================================================
   JORNADA BRASIL — Menu mobile (hambúrguer)
   ---------------------------------------------------------------------
   Progressive enhancement: injeta um botão hambúrguer no cabeçalho e
   transforma o menu horizontal (.main-nav / .jb-nav) num menu vertical
   recolhível em telas de celular. Se este script não rodar, o menu
   continua funcionando como lista horizontal rolável (fallback do CSS).
   ===================================================================== */
(function () {
  'use strict';

  var BREAKPOINT = 769; // px — acima disso o menu volta ao modo horizontal

  function enhance(header, nav) {
    if (!header || !nav || header.classList.contains('nav-enhanced')) return;

    if (!nav.id) nav.id = 'jb-nav-menu';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Abrir menu de navegação');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', nav.id);
    btn.innerHTML =
      '<svg class="nav-toggle-ic nav-toggle-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '<svg class="nav-toggle-ic nav-toggle-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // Insere o botão logo após o menu, dentro do container do cabeçalho.
    nav.parentNode.insertBefore(btn, nav.nextSibling);
    header.classList.add('nav-enhanced');

    function isOpen() { return nav.classList.contains('is-open'); }

    function open() {
      nav.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Fechar menu de navegação');
      document.addEventListener('keydown', onKey);
      document.addEventListener('click', onDocClick, true);
    }

    function close() {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menu de navegação');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick, true);
    }

    function toggle() { isOpen() ? close() : open(); }

    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) { close(); btn.focus(); }
    }

    function onDocClick(e) {
      // Fecha ao clicar fora do cabeçalho.
      if (!header.contains(e.target)) close();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    // Fecha ao tocar num link do menu (navegação dentro da mesma página, âncoras).
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    // Ao voltar para a largura de desktop, garante o menu fechado/limpo.
    var mq = window.matchMedia('(min-width: ' + BREAKPOINT + 'px)');
    function onMQ() { if (mq.matches && isOpen()) close(); }
    if (mq.addEventListener) mq.addEventListener('change', onMQ);
    else if (mq.addListener) mq.addListener(onMQ);
  }

  // Link "Salvos" (favoritos, histórico e orçamentos guardados neste aparelho).
  var SALVOS_PATHS = ['/salvos/', '/favoritos/', '/historico/', '/meus-orcamentos/'];

  function addSalvosLink(nav, linkClass, activeClass) {
    if (!nav || nav.querySelector('a[href="/salvos/"]')) return;
    var a = document.createElement('a');
    a.href = '/salvos/';
    a.textContent = 'Salvos';
    if (linkClass) a.className = linkClass;
    if (SALVOS_PATHS.indexOf(location.pathname) !== -1) {
      a.classList.add(activeClass);
      a.setAttribute('aria-current', 'page');
    }
    nav.appendChild(a);
  }

  function init() {
    addSalvosLink(document.querySelector('.site-header .main-nav'), 'nav-link', 'active');
    addSalvosLink(document.querySelector('.jb-header .jb-nav'), '', 'is-active');

    // Cabeçalho padrão do portal.
    enhance(document.querySelector('.site-header'),
            document.querySelector('.site-header .main-nav'));
    // Cabeçalho do app "Meu Lucro".
    enhance(document.querySelector('.jb-header'),
            document.querySelector('.jb-header .jb-nav'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
