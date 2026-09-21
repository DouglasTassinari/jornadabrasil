// consent.js — LGPD + Google Consent Mode v2
// Nota: window.dataLayer, gtag() e gtag('consent','default') já foram declarados
// no <head> do HTML antes deste script carregar.

const RC_CONSENT_KEY = 'lgpd_consent';

const RC = {
  getConsent: function() {
    try {
      const raw = localStorage.getItem(RC_CONSENT_KEY);
      if (!raw) return null;
      const prefs = JSON.parse(raw);
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (!prefs.ts || Date.now() - prefs.ts > oneYear) {
        localStorage.removeItem(RC_CONSENT_KEY);
        return null;
      }
      return prefs;
    } catch(e) { return null; }
  },

  setConsent: function(prefs) {
    try {
      localStorage.setItem(RC_CONSENT_KEY, JSON.stringify({ ...prefs, ts: Date.now() }));
    } catch(e) {}
    RC.applyConsent(prefs);
    RC.hideBanner();
    RC.hideModal();
  },

  applyConsent: function(prefs) {
    if (!prefs) return;
    const analytics = prefs.analytics ? 'granted' : 'denied';
    const ads = prefs.ads ? 'granted' : 'denied';
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        'ad_storage': ads,
        'ad_user_data': ads,
        'ad_personalization': ads,
        'analytics_storage': analytics
      });
    }
    // Carrega scripts de terceiros conforme consentimento
    if (prefs.analytics) RC.loadAnalytics();
    if (prefs.ads) RC.loadAds();
    else RC.pauseAds();
  },

  acceptAll: function() {
    RC.setConsent({ analytics: true, ads: true, essential: true });
  },

  acceptEssential: function() {
    RC.setConsent({ analytics: false, ads: false, essential: true });
  },

  showBanner: function() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('hidden');
  },

  hideBanner: function() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.add('hidden');
  },

  openConsentManager: function() {
    let modal = document.getElementById('rc-consent-modal');
    if (!modal) {
      modal = RC._createModal();
      document.body.appendChild(modal);
    }
    const prefs = RC.getConsent() || { analytics: false, ads: false };
    modal.querySelector('#rc-toggle-analytics').checked = !!prefs.analytics;
    modal.querySelector('#rc-toggle-ads').checked = !!prefs.ads;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Foco no primeiro elemento interativo dentro do modal (acessibilidade)
    setTimeout(function() {
      const first = modal.querySelector('button, input, [tabindex]');
      if (first) first.focus();
    }, 50);
  },

  hideModal: function() {
    const modal = document.getElementById('rc-consent-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  },

  _createModal: function() {
    const modal = document.createElement('div');
    modal.id = 'rc-consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Gerenciar preferências de cookies');
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px';
    modal.innerHTML = `
      <div style="background:var(--surface,#fff);border-radius:14px;padding:28px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <h2 style="font-size:1.2rem;font-weight:700;margin:0 0 8px">Preferências de cookies</h2>
        <p style="font-size:.85rem;color:var(--text-2,#4B5563);margin:0 0 20px">Escolha quais tipos de cookies deseja aceitar.</p>
        <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px">
          <label style="display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--border,#E3E8EF);border-radius:10px;cursor:default;opacity:.7">
            <div>
              <div style="font-weight:600;font-size:.9rem">Essenciais</div>
              <div style="font-size:.78rem;color:var(--text-2,#4B5563)">Necessários para o funcionamento do site</div>
            </div>
            <input type="checkbox" checked disabled style="width:18px;height:18px;accent-color:#155E75" aria-label="Cookies essenciais (sempre ativos)">
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--border,#E3E8EF);border-radius:10px;cursor:pointer">
            <div>
              <div style="font-weight:600;font-size:.9rem">Análise (Analytics)</div>
              <div style="font-size:.78rem;color:var(--text-2,#4B5563)">Google Analytics — nos ajuda a melhorar o portal</div>
            </div>
            <input id="rc-toggle-analytics" type="checkbox" style="width:18px;height:18px;accent-color:#155E75" aria-label="Cookies de análise">
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--border,#E3E8EF);border-radius:10px;cursor:pointer">
            <div>
              <div style="font-weight:600;font-size:.9rem">Publicidade</div>
              <div style="font-size:.78rem;color:var(--text-2,#4B5563)">Google AdSense — anúncios relevantes para você</div>
            </div>
            <input id="rc-toggle-ads" type="checkbox" style="width:18px;height:18px;accent-color:#155E75" aria-label="Cookies de publicidade">
          </label>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button onclick="RC.hideModal()" style="padding:10px 18px;border:1px solid var(--border,#E3E8EF);border-radius:8px;background:transparent;cursor:pointer;font-size:.9rem;font-weight:600;color:var(--text,#1F2937)">Cancelar</button>
          <button onclick="RC._saveModalPrefs()" style="padding:10px 18px;background:#155E75;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:600">Salvar preferências</button>
        </div>
      </div>`;
    // Fechar ao clicar no backdrop
    modal.addEventListener('click', function(e){ if(e.target===modal) RC.hideModal(); });
    // Fechar com Escape (acessibilidade)
    modal.addEventListener('keydown', function(e){ if(e.key==='Escape') RC.hideModal(); });
    return modal;
  },

  _saveModalPrefs: function() {
    const analytics = document.getElementById('rc-toggle-analytics')?.checked || false;
    const ads = document.getElementById('rc-toggle-ads')?.checked || false;
    RC.setConsent({ analytics, ads, essential: true });
  },

  // Carrega GA4 via loader diferido declarado no <head>
  loadAnalytics: function() {
    if (typeof window._jbLoadAnalytics === 'function') {
      window._jbLoadAnalytics();
    }
  },

  // O código do AdSense fica no <head> das páginas com conteúdo, com as
  // requisições de anúncio pausadas (pauseAdRequests=1) até o consentimento.
  // Páginas sem o código (conta, erro, redirecionamentos) não exibem anúncios.
  loadAds: function() {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) return;
    (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 0;
  },

  pauseAds: function() {
    (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
  }
};

window.RC = RC;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  const consent = RC.getConsent();
  if (!consent) {
    RC.showBanner();
  } else {
    RC.applyConsent(consent);
  }
});
