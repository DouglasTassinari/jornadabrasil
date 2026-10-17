/* ============================================================
   Jornada Brasil — Extras do produto (Fases 3, 4 e 7)
   - Favoritar calculadoras e artigos (salvos neste aparelho)
   - Histórico automático de cálculos (salvo neste aparelho)
   - Reabertura de cálculo a partir do /historico/
   - "Continue lendo" e calculadoras relacionadas
   Fail-safe: nada aqui pode quebrar a página. Depende de JBData.
   ============================================================ */
(function () {
  "use strict";

  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function money(n) { return BRL.format(isFinite(+n) ? +n : 0); }
  function parseBRL(s) {
    if (!s) return null;
    var n = parseFloat(String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  function toast(msg, isErr) {
    var t = document.createElement("div");
    t.className = "jb-toast" + (isErr ? " err" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- contexto da página ---------- */
  var mainEl = document.getElementById("main-content");
  var calcTipo = mainEl ? mainEl.getAttribute("data-calc") : null;
  var path = location.pathname.replace(/\/index\.html$/, "");
  var isArticle = /^\/blog\/[^\/]+\/?$/.test(path) && path !== "/blog/" && path !== "/blog";

  function pageTitulo() {
    var h1 = document.querySelector("h1.calc-titulo, main h1, article h1, h1");
    return h1 ? h1.textContent.trim() : document.title.replace(/\s*[—|].*$/, "").trim();
  }
  function slugFromPath() {
    var parts = path.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "home";
  }

  /* ============================================================
     FAVORITOS (Fase 4)
     ============================================================ */
  function starSVG() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z"/></svg>';
  }
  function makeFavButton(tipo, slug, titulo, url) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jb-fav-btn no-print";
    btn.innerHTML = starSVG() + '<span>Favoritar</span>';
    var label = btn.querySelector("span");
    var fav = false;

    function paint() {
      btn.classList.toggle("is-fav", fav);
      label.textContent = fav ? "Favorito" : "Favoritar";
    }
    btn.addEventListener("click", function () {
      btn.disabled = true;
      var op = fav
        ? window.JBData.removeFavorito(tipo, slug)
        : window.JBData.addFavorito({ tipo: tipo, slug: slug, titulo: titulo, url: url });
      Promise.resolve(op).then(function (res) {
        btn.disabled = false;
        if (res && res.error) { toast("Não foi possível salvar", true); return; }
        fav = !fav; paint();
        toast(fav ? "Adicionado aos favoritos ✓" : "Removido dos favoritos");
      });
    });

    // estado inicial
    window.JBData.listFavoritos(tipo).then(function (res) {
      var list = (res && res.data) || [];
      fav = list.some(function (f) { return f.slug === slug; });
      paint();
    });

    paint();
    return btn;
  }

  function mountFavButton() {
    if (!window.JBData) return;
    var tipo, slug, titulo, url, host;
    if (calcTipo) {
      tipo = "calculadora"; slug = slugFromPath(); url = path + "/";
      titulo = pageTitulo();
      var formHeader = document.querySelector(".calc-desc-page");
      if (formHeader) {
        host = document.createElement("div");
        host.className = "jb-calc-head-tools";
        host.appendChild(makeFavButton(tipo, slug, titulo, url));
        formHeader.parentNode.insertBefore(host, formHeader.nextSibling);
      }
    } else if (isArticle) {
      tipo = "artigo"; slug = slugFromPath(); url = path + "/";
      titulo = pageTitulo();
      var h1 = document.querySelector("main h1, article h1, h1");
      if (h1) {
        host = document.createElement("div");
        host.className = "jb-calc-head-tools";
        host.appendChild(makeFavButton(tipo, slug, titulo, url));
        h1.parentNode.insertBefore(host, h1.nextSibling);
      }
    }
  }

  /* ============================================================
     HISTÓRICO AUTOMÁTICO (Fase 3) — só em páginas de calculadora
     ============================================================ */
  function collectInputs() {
    var form = document.getElementById("calc-form");
    if (!form) return {};
    var snap = {};
    var els = form.querySelectorAll("input, select");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.id) continue;
      snap[el.id] = (el.type === "checkbox") ? el.checked : el.value;
    }
    return snap;
  }
  function applyInputs(snap) {
    if (!snap) return;
    Object.keys(snap).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!snap[id];
      else el.value = snap[id];
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function readResult() {
    var demo = document.getElementById("calc-demo");
    if (!demo) return null;
    var grande = demo.querySelector(".total .grande");
    if (!grande) return null; // sem resultado válido ainda
    var label = demo.querySelector(".total .lbl b");
    var resumo = [];
    demo.querySelectorAll(".grupo-tit").forEach(function () {});
    demo.querySelectorAll(".sub").forEach(function (s) {
      var nome = s.querySelector(".nome"), val = s.querySelector(".val");
      if (nome && val) resumo.push({ nome: nome.textContent.trim(), valor: val.textContent.trim() });
    });
    // também capta as 2 primeiras linhas do destaque por bloco
    return {
      valor_principal: parseBRL(grande.textContent),
      valor_label: label ? label.textContent.trim() : "Resultado",
      resumo: resumo.slice(0, 6),
    };
  }

  function setupHistorico() {
    if (!calcTipo || !window.JBData) return;
    var url = path + "/";
    var titulo = pageTitulo();
    var sessionRowId = null; // 1 linha por visita; vai sendo atualizada
    var lastHash = null;
    var timer = null;

    function trySave() {
      var res = readResult();
      if (!res || res.valor_principal == null) return;
      var inputs = collectInputs();
      var hash = JSON.stringify([res.valor_principal, res.valor_label, inputs]);
      if (hash === lastHash) return;
      lastHash = hash;
      var payload = {
        tipo: calcTipo, titulo: titulo, url: url,
        valor_principal: res.valor_principal, valor_label: res.valor_label,
        resumo: res.resumo, inputs: inputs,
      };
      if (sessionRowId) {
        window.JBData.updateHistorico(sessionRowId, payload);
      } else {
        window.JBData.saveHistorico(payload).then(function (r) {
          if (r && r.data && r.data.id) sessionRowId = r.data.id;
        });
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(trySave, 2500);
    }

    var demo = document.getElementById("calc-demo");
    if (demo) {
      var obs = new MutationObserver(schedule);
      obs.observe(demo, { childList: true, subtree: true, characterData: true });
    }
  }

  var _reopenPending = false;
  function applyPendingReopen() {
    if (!calcTipo) return;
    var key = "jb:histApply:" + calcTipo;
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { return; }
    if (!raw) return;
    _reopenPending = true;
    try { localStorage.removeItem(key); } catch (e) {}
    var snap;
    try { snap = JSON.parse(raw); } catch (e) { return; }
    // espera o formulário existir (app.js monta de forma síncrona, mas garantimos)
    var tries = 0;
    (function wait() {
      if (document.getElementById("calc-form") && document.querySelector("#calc-form input, #calc-form select")) {
        applyInputs(snap);
        toast("Cálculo reaberto ✓");
        var res = document.querySelector(".calc-result-panel");
        if (res) res.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (tries++ < 40) { setTimeout(wait, 100); }
    })();
  }

  /* ============================================================
     CTA + "Continue lendo" nos artigos (Fase 7)
     ============================================================ */
  var ARTIGOS = {
    "como-calcular-salario-liquido": "Como calcular o salário líquido",
    "como-calcular-rescisao": "Como calcular a rescisão",
    "como-calcular-ferias": "Como calcular as férias",
    "como-calcular-horas-extras": "Como calcular horas extras",
    "como-calcular-dsr": "Como calcular o DSR",
    "como-calcular-margem-de-lucro": "Como calcular a margem de lucro",
    "como-precificar-servico": "Como precificar seu serviço",
    "quanto-cobrar-por-hora": "Quanto cobrar por hora",
    "quanto-ganha-motorista-aplicativo": "Quanto ganha um motorista de aplicativo",
    "clt-vs-pj": "CLT vs PJ: qual compensa?",
    "decimo-terceiro-salario": "13º salário: como funciona",
    "como-funciona-fgts": "Como funciona o FGTS",
    "como-funciona-aviso-previo": "Como funciona o aviso prévio",
    "demissao-sem-justa-causa": "Demissão sem justa causa",
    "seguro-desemprego-como-funciona": "Seguro-desemprego: como funciona",
    "auxilio-doenca-inss": "Auxílio-doença do INSS",
    "licenca-maternidade": "Licença-maternidade",
    "insalubridade": "Adicional de insalubridade",
    "periculosidade": "Adicional de periculosidade",
    "trabalho-noturno": "Adicional noturno",
    "jornada-de-trabalho": "Jornada de trabalho",
    "banco-de-horas": "Banco de horas",
    "contrato-de-experiencia": "Contrato de experiência",
    "direitos-do-trabalhador-clt": "Direitos do trabalhador CLT",
    "inss-tabela-2026": "Tabela INSS 2026",
    "irrf-tabela-2026": "Tabela IRRF 2026",
  };
  // Clusters temáticos para "Continue lendo".
  var CLUSTERS = {
    salario: ["como-calcular-salario-liquido", "inss-tabela-2026", "irrf-tabela-2026", "decimo-terceiro-salario"],
    rescisao: ["como-calcular-rescisao", "demissao-sem-justa-causa", "como-funciona-aviso-previo", "como-funciona-fgts", "seguro-desemprego-como-funciona"],
    ferias: ["como-calcular-ferias", "decimo-terceiro-salario", "como-calcular-salario-liquido"],
    jornada: ["como-calcular-horas-extras", "trabalho-noturno", "banco-de-horas", "jornada-de-trabalho", "como-calcular-dsr"],
    adicionais: ["insalubridade", "periculosidade", "trabalho-noturno"],
    autonomo: ["clt-vs-pj", "como-precificar-servico", "quanto-cobrar-por-hora", "como-calcular-margem-de-lucro", "quanto-ganha-motorista-aplicativo"],
    direitos: ["direitos-do-trabalhador-clt", "contrato-de-experiencia", "licenca-maternidade", "auxilio-doenca-inss"],
  };
  function clusterOf(slug) {
    for (var k in CLUSTERS) {
      if (CLUSTERS[k].indexOf(slug) !== -1) return CLUSTERS[k];
    }
    return ["como-calcular-salario-liquido", "como-calcular-rescisao", "clt-vs-pj"];
  }

  /* Calculadoras do portal (slug -> rótulo). url = "/" + slug + "/". */
  var CALCS = {
    "salario-liquido": "Salário Líquido",
    "rescisao": "Rescisão",
    "ferias": "Férias",
    "decimo-terceiro": "13º Salário",
    "horas-extras": "Horas Extras",
    "adicional-noturno": "Adicional Noturno",
    "salario-maternidade": "Salário-Maternidade",
    "seguro-desemprego": "Seguro-Desemprego",
    "imposto-de-renda": "Imposto de Renda",
    "auxilio-doenca": "Auxílio-Doença",
    "pj-vs-clt": "PJ vs CLT",
    "calcular-preco": "Calcular Preço",
  };
  // Artigo -> calculadoras relacionadas.
  var ART_TO_CALCS = {
    "como-calcular-salario-liquido": ["salario-liquido", "imposto-de-renda"],
    "como-calcular-rescisao": ["rescisao", "seguro-desemprego"],
    "como-calcular-ferias": ["ferias", "salario-liquido"],
    "como-calcular-horas-extras": ["horas-extras", "adicional-noturno"],
    "como-calcular-dsr": ["horas-extras", "salario-liquido"],
    "como-calcular-margem-de-lucro": ["calcular-preco"],
    "como-precificar-servico": ["calcular-preco"],
    "quanto-cobrar-por-hora": ["calcular-preco"],
    "quanto-ganha-motorista-aplicativo": ["calcular-preco"],
    "clt-vs-pj": ["pj-vs-clt", "salario-liquido"],
    "decimo-terceiro-salario": ["decimo-terceiro", "salario-liquido"],
    "como-funciona-fgts": ["rescisao", "seguro-desemprego"],
    "como-funciona-aviso-previo": ["rescisao"],
    "demissao-sem-justa-causa": ["rescisao", "seguro-desemprego"],
    "seguro-desemprego-como-funciona": ["seguro-desemprego", "rescisao"],
    "auxilio-doenca-inss": ["auxilio-doenca"],
    "licenca-maternidade": ["salario-maternidade"],
    "insalubridade": ["salario-liquido"],
    "periculosidade": ["salario-liquido"],
    "trabalho-noturno": ["adicional-noturno", "horas-extras"],
    "jornada-de-trabalho": ["horas-extras", "adicional-noturno"],
    "banco-de-horas": ["horas-extras"],
    "inss-tabela-2026": ["salario-liquido", "imposto-de-renda"],
    "irrf-tabela-2026": ["imposto-de-renda", "salario-liquido"],
  };
  // Calculadora -> artigos relacionados.
  var CALC_TO_ARTS = {
    "salario-liquido": ["como-calcular-salario-liquido", "inss-tabela-2026", "irrf-tabela-2026"],
    "rescisao": ["como-calcular-rescisao", "como-funciona-aviso-previo", "demissao-sem-justa-causa"],
    "ferias": ["como-calcular-ferias", "decimo-terceiro-salario"],
    "decimo-terceiro": ["decimo-terceiro-salario", "como-calcular-ferias"],
    "horas-extras": ["como-calcular-horas-extras", "como-calcular-dsr", "banco-de-horas"],
    "adicional-noturno": ["trabalho-noturno", "como-calcular-horas-extras"],
    "salario-maternidade": ["licenca-maternidade"],
    "seguro-desemprego": ["seguro-desemprego-como-funciona", "demissao-sem-justa-causa"],
    "imposto-de-renda": ["irrf-tabela-2026", "como-calcular-salario-liquido"],
    "auxilio-doenca": ["auxilio-doenca-inss"],
    "pj-vs-clt": ["clt-vs-pj", "como-precificar-servico"],
  };
  // Calculadora -> outras calculadoras relacionadas.
  var CALC_TO_CALCS = {
    "salario-liquido": ["decimo-terceiro", "ferias", "imposto-de-renda"],
    "rescisao": ["seguro-desemprego", "ferias", "salario-liquido"],
    "ferias": ["decimo-terceiro", "salario-liquido", "rescisao"],
    "decimo-terceiro": ["ferias", "salario-liquido"],
    "horas-extras": ["adicional-noturno", "salario-liquido"],
    "adicional-noturno": ["horas-extras", "salario-liquido"],
    "salario-maternidade": ["salario-liquido", "ferias"],
    "seguro-desemprego": ["rescisao", "salario-liquido"],
    "imposto-de-renda": ["salario-liquido", "decimo-terceiro"],
    "auxilio-doenca": ["salario-liquido", "salario-maternidade"],
    "pj-vs-clt": ["salario-liquido", "calcular-preco"],
  };
  function calcLink(slug) {
    if (!CALCS[slug]) return "";
    return '<a href="/' + slug + '/" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'internal_link\',{to:\'calc_' + slug + '\'})">' + CALCS[slug] + '</a>';
  }
  function artLink(slug, from) {
    if (!ARTIGOS[slug]) return "";
    return '<a href="/blog/' + slug + '/" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'internal_link\',{from:\'' + (from||"") + '\',to:\'' + slug + '\'})">' + ARTIGOS[slug] + '</a>';
  }

  function injectArticleExtras() {
    if (!isArticle) return;
    var slug = slugFromPath();
    var container = document.querySelector("main .container") || document.querySelector("main") || document.querySelector("article");
    if (!container) return;

    // 1) "Continue lendo" — evita duplicar se já existir
    if (!document.querySelector(".jb-related-articles")) {
      var related = clusterOf(slug).filter(function (s) { return s !== slug && ARTIGOS[s]; }).slice(0, 4);
      if (related.length) {
        var box = document.createElement("div");
        box.className = "jb-related-articles no-print";
        box.innerHTML = '<h2>Continue lendo</h2><div class="jb-ra-grid">' +
          related.map(function (s) {
            return '<a href="/blog/' + s + '/" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'internal_link\',{from:\'art_' + slug + '\',to:\'' + s + '\'})">' + ARTIGOS[s] + '</a>';
          }).join("") + "</div>";
        container.appendChild(box);
      }
    }

    // 2) Calculadoras relacionadas — leva o leitor do artigo para a ferramenta (Fase 7)
    if (!document.querySelector(".jb-related-calcs")) {
      var calcs = (ART_TO_CALCS[slug] || []).filter(function (s) { return CALCS[s]; }).slice(0, 4);
      if (calcs.length) {
        var cbox = document.createElement("div");
        cbox.className = "jb-related-calcs no-print";
        cbox.innerHTML = '<h2>Calcule agora</h2><div class="jb-rc-grid">' +
          calcs.map(function (s) {
            return '<a href="/' + s + '/" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'internal_link\',{from:\'art_' + slug + '\',to:\'calc_' + s + '\'})"><span class="jb-rc-ico">🧮</span><span>' + CALCS[s] + '</span></a>';
          }).join("") + "</div>";
        container.appendChild(cbox);
      }
    }
  }

  /* ============================================================
     SEO interno em páginas de calculadora (Fase 7)
     "Artigos relacionados" + "Outras calculadoras".
     ============================================================ */
  function injectCalcRelated() {
    if (!calcTipo) return;
    var slug = slugFromPath();
    var container = document.querySelector("main .container") || document.querySelector("main");
    if (!container) return;

    if (!document.querySelector(".jb-calc-related")) {
      var arts = (CALC_TO_ARTS[slug] || []).filter(function (s) { return ARTIGOS[s]; }).slice(0, 3);
      var others = (CALC_TO_CALCS[slug] || []).filter(function (s) { return CALCS[s] && s !== slug; }).slice(0, 3);
      if (arts.length || others.length) {
        var box = document.createElement("section");
        box.className = "jb-calc-related no-print";
        var html = "";
        if (others.length) {
          html += '<div class="jb-cr-block"><h2>Outras calculadoras</h2><div class="jb-rc-grid">' +
            others.map(function (s) {
              return '<a href="/' + s + '/" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'internal_link\',{from:\'calc_' + slug + '\',to:\'calc_' + s + '\'})"><span class="jb-rc-ico">🧮</span><span>' + CALCS[s] + '</span></a>';
            }).join("") + "</div></div>";
        }
        if (arts.length) {
          html += '<div class="jb-cr-block"><h2>Aprenda mais</h2><div class="jb-ra-grid">' +
            arts.map(function (s) { return artLink(s, "calc_" + slug); }).join("") + "</div></div>";
        }
        box.innerHTML = html;
        container.appendChild(box);
      }
    }
  }

  /* ============================================================
     RECUPERAÇÃO DE TRABALHO (Fase 6) — calculadoras
     Salva um rascunho local dos campos preenchidos e, ao voltar com
     o formulário vazio, oferece "Encontramos um cálculo não concluído".
     ============================================================ */
  function setupDraft() {
    if (!calcTipo || _reopenPending) return;
    var form = document.getElementById("calc-form");
    if (!form) return;
    var KEY = "jb:draft:" + calcTipo;
    var MAXAGE = 7 * 24 * 60 * 60 * 1000; // 7 dias

    function isMeaningful(snap) {
      if (!snap) return false;
      return Object.keys(snap).some(function (k) {
        var v = snap[k];
        return v !== "" && v !== false && v != null && v !== "0";
      });
    }
    function formIsEmpty() {
      var cur = collectInputs();
      return !isMeaningful(cur);
    }

    // 1) salvar rascunho (debounce) enquanto o usuário digita
    var t = null;
    form.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        try {
          var snap = collectInputs();
          if (isMeaningful(snap)) localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), inputs: snap }));
        } catch (e) {}
      }, 1200);
    });

    // limpar rascunho ao concluir/salvar no histórico já é natural; também ao limpar
    var reset = document.getElementById("calc-reset") || form.querySelector('[type="reset"]');
    if (reset) reset.addEventListener("click", function () { try { localStorage.removeItem(KEY); } catch (e) {} });

    // 2) oferecer recuperação quando o form está vazio mas há rascunho recente
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) {} return; }
    if (!draft || !draft.inputs || (Date.now() - (draft.at || 0)) > MAXAGE) { try { localStorage.removeItem(KEY); } catch (e) {} return; }
    if (!formIsEmpty()) return; // o usuário já está com algo preenchido — não atrapalhar

    var bar = document.createElement("div");
    bar.className = "jb-recover no-print";
    bar.innerHTML =
      '<div class="jb-recover-txt"><b>Encontramos um cálculo não concluído.</b><span>Quer retomar de onde parou?</span></div>' +
      '<div class="jb-recover-actions">' +
        '<button type="button" class="jb-recover-yes">Retomar</button>' +
        '<button type="button" class="jb-recover-no" aria-label="Descartar">Descartar</button>' +
      '</div>';
    form.parentNode.insertBefore(bar, form);
    bar.querySelector(".jb-recover-yes").addEventListener("click", function () {
      applyInputs(draft.inputs);
      bar.remove();
      var res = document.querySelector(".calc-result-panel");
      if (res) res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bar.querySelector(".jb-recover-no").addEventListener("click", function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      bar.remove();
    });
  }

  /* ---------- boot ---------- */
  ready(function () {
    try { mountFavButton(); } catch (e) {}
    try { setupHistorico(); } catch (e) {}
    try { applyPendingReopen(); } catch (e) {}
    try { setupDraft(); } catch (e) {}
    try { injectArticleExtras(); } catch (e) {}
    try { injectCalcRelated(); } catch (e) {}
  });
})();
