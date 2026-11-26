/* =====================================================================
   JORNADA BRASIL — analytics centralizado da plataforma.
   GA4 (G-MK3XD5ZVE0) + Microsoft Clarity (x7ir0zxu39) + helper jbTrack.
   Carregado pelos modulos /calcular-preco/ e /meu-lucro/. Idempotente:
   pode ser incluido mais de uma vez sem duplicar tags.
   ===================================================================== */
(function () {
  if (window.__jbAnalytics) return;
  window.__jbAnalytics = true;

  var GA_ID = 'G-MK3XD5ZVE0';
  var CLARITY_ID = 'x7ir0zxu39';

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function _jbLoadAnalytics() {
    if (window._jbALoaded) return;
    window._jbALoaded = 1;
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);
    gtag('js', new Date());
    gtag('config', GA_ID);
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }
  // Só o consent.js chama o loader, e apenas com consentimento de análise.
  window._jbLoadAnalytics = _jbLoadAnalytics;

  window.jbTrack = function (name, params) {
    try { gtag('event', name, params || {}); } catch (e) {}
  };
})();
