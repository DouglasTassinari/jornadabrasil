/* ============================================================
   Calcular Preço — persistência de orçamentos (neste aparelho)
   Salvar / listar / reabrir / duplicar / excluir.
   Depende de window.__CP (exposto pelo app React) e window.JBData
   (/shared/jb-data.js).
   ============================================================ */
(function () {
  "use strict";
  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var money = function (n) { return BRL.format(isFinite(+n) ? +n : 0); };
  function dateBR(s) { if (!s) return ""; var p = String(s).slice(0,10).split("-"); return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : s; }

  // ---------- estilos ----------
  var css = document.createElement("style");
  css.textContent = [
    ".cp-fab{position:fixed;right:16px;bottom:16px;z-index:900;display:flex;flex-direction:column;gap:8px;align-items:flex-end}",
    ".cp-fab button{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;border:none;font:600 .9rem/1 Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px -6px rgba(0,0,0,.35)}",
    ".cp-fab .cp-save{background:#F97316;color:#fff}",
    ".cp-fab .cp-list{background:#fff;color:#1F2937;border:1px solid #E5E7EB}",
    "@media(prefers-color-scheme:dark){.cp-fab .cp-list{background:#111827;color:#F9FAFB;border-color:#283447}}",
    ".cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center}",
    ".cp-sheet{background:var(--surface,#fff);color:var(--text,#1F2937);width:100%;max-width:640px;max-height:82vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px}",
    "@media(min-width:680px){.cp-overlay{align-items:center}.cp-sheet{border-radius:18px}}",
    "@media(prefers-color-scheme:dark){.cp-sheet{background:#111827;color:#F9FAFB}}",
    ".cp-sheet h3{margin:0 0 4px;font:700 1.15rem Inter,system-ui,sans-serif}",
    ".cp-sheet .cp-sub{color:#6B7280;font-size:.85rem;margin-bottom:14px}",
    ".cp-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(128,128,128,.18)}",
    ".cp-row:last-child{border-bottom:none}",
    ".cp-row .t{font-weight:600}",
    ".cp-row .s{font-size:.8rem;color:#6B7280}",
    ".cp-row .v{font-weight:700;white-space:nowrap}",
    ".cp-acts{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}",
    ".cp-acts button{font:600 .78rem Inter,system-ui,sans-serif;padding:5px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;cursor:pointer}",
    ".cp-acts .cp-del{color:#BB3B2A}",
    ".cp-close{float:right;background:none;border:none;font-size:1.4rem;cursor:pointer;color:inherit;line-height:1}",
    ".cp-empty{color:#6B7280;padding:18px 0;text-align:center}",
    ".cp-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:#157A4C;color:#fff;padding:10px 18px;border-radius:10px;z-index:1100;font:600 .9rem Inter,system-ui,sans-serif;box-shadow:0 6px 18px -6px rgba(0,0,0,.4)}",
    ".cp-recover{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:1100;display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:92vw;background:#fff;color:#1F2937;border:1px solid #FED7AA;border-left:4px solid #F97316;border-radius:12px;padding:12px 16px;box-shadow:0 10px 30px -8px rgba(0,0,0,.35)}",
    "@media(prefers-color-scheme:dark){.cp-recover{background:#111827;color:#F9FAFB;border-color:rgba(249,115,22,.4)}}",
    ".cp-recover .t{display:flex;flex-direction:column;gap:1px;min-width:0}",
    ".cp-recover .t b{font:700 .92rem Inter,system-ui,sans-serif}",
    ".cp-recover .t span{font-size:.82rem;color:#6B7280}",
    ".cp-recover .a{display:flex;gap:8px;flex-shrink:0}",
    ".cp-recover button{font:600 .84rem Inter,system-ui,sans-serif;padding:8px 15px;border-radius:9px;cursor:pointer;border:none}",
    ".cp-recover .yes{background:#F97316;color:#fff}",
    ".cp-recover .no{background:transparent;color:#6B7280;border:1px solid rgba(128,128,128,.3)}",
  ].join("");
  document.head.appendChild(css);

  function toast(msg, ok) {
    var t = document.createElement("div");
    t.className = "cp-toast";
    if (ok === false) t.style.background = "#BB3B2A";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // ---------- FAB ----------
  var fab = document.createElement("div");
  fab.className = "cp-fab no-print";
  fab.innerHTML =
    '<button type="button" class="cp-list">📁 Meus orçamentos</button>' +
    '<button type="button" class="cp-save">💾 Salvar orçamento</button>';
  document.body.appendChild(fab);
  var btnSave = fab.querySelector(".cp-save");
  var btnList = fab.querySelector(".cp-list");

  function ensureSnapshot() { return window.__CP && window.__CP.snapshot ? window.__CP.snapshot() : null; }

  btnSave.addEventListener("click", function () {
    var snap = ensureSnapshot();
    if (!snap) { toast("Preencha o orçamento primeiro", false); return; }
    var def = snap.nome || ("Orçamento " + new Date().toLocaleDateString("pt-BR"));
    var nome = prompt("Nome do orçamento:", def);
    if (nome === null) return;
    snap.nome = (nome || def).trim();
    btnSave.disabled = true;
    window.JBData.saveOrcamento(snap).then(function (res) {
      btnSave.disabled = false;
      if (res.error) { toast("Erro ao salvar: " + res.error.message, false); return; }
      toast("Orçamento salvo neste aparelho ✓");
    });
  });

  btnList.addEventListener("click", openList);

  function openList() {
    var ov = document.createElement("div");
    ov.className = "cp-overlay";
    ov.innerHTML = '<div class="cp-sheet"><button class="cp-close" aria-label="Fechar">×</button><h3>Meus orçamentos</h3><div class="cp-sub">Reabra, duplique ou exclua um orçamento salvo neste aparelho.</div><div class="cp-body"><div class="cp-empty">Carregando…</div></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    ov.querySelector(".cp-close").addEventListener("click", function () { ov.remove(); });
    var body = ov.querySelector(".cp-body");

    window.JBData.listOrcamentos().then(function (res) {
      var list = (res && res.data) || [];
      if (res && res.error) { body.innerHTML = '<div class="cp-empty">Erro: ' + res.error.message + '</div>'; return; }
      if (!list.length) { body.innerHTML = '<div class="cp-empty">Nenhum orçamento salvo ainda.</div>'; return; }
      body.innerHTML = "";
      list.forEach(function (o) {
        var row = document.createElement("div");
        row.className = "cp-row";
        row.innerHTML =
          '<div style="min-width:0"><div class="t"></div><div class="s">' + dateBR(o.created_at) + (o.margem!=null ? ' · margem '+o.margem+'%' : '') + '</div>' +
          '<div class="cp-acts"><button class="cp-open">Reabrir</button><button class="cp-dup">Duplicar</button><button class="cp-del">Excluir</button></div></div>' +
          '<div class="v">' + (o.preco_final!=null ? money(o.preco_final) : '—') + '</div>';
        row.querySelector(".t").textContent = o.nome || "Orçamento";
        row.querySelector(".cp-open").addEventListener("click", function () {
          if (window.__cpApply) { window.__cpApply(o.params || {}); ov.remove(); toast("Orçamento reaberto ✓"); window.scrollTo({ top: 0, behavior: "smooth" }); }
        });
        row.querySelector(".cp-dup").addEventListener("click", function () {
          var copy = { nome: (o.nome || "Orçamento") + " (cópia)", valor_hora: o.valor_hora, custos: o.custos, margem: o.margem, preco_final: o.preco_final, params: o.params };
          window.JBData.saveOrcamento(copy).then(function (r) {
            if (r.error) { toast("Erro ao duplicar", false); return; }
            toast("Orçamento duplicado ✓"); ov.remove(); openList();
          });
        });
        row.querySelector(".cp-del").addEventListener("click", function () {
          if (!confirm("Excluir \"" + (o.nome || "Orçamento") + "\"?")) return;
          window.JBData.deleteOrcamento(o.id).then(function (r) {
            if (r.error) { toast("Erro ao excluir", false); return; }
            toast("Orçamento excluído"); row.remove();
            if (!body.querySelector(".cp-row")) body.innerHTML = '<div class="cp-empty">Nenhum orçamento salvo ainda.</div>';
          });
        });
        body.appendChild(row);
      });
    });
  }

  // ---------- reabrir via ?orc=ID ----------
  function tryOpenFromUrl() {
    var m = /[?&]orc=([^&]+)/.exec(location.search);
    if (!m) return;
    var id = decodeURIComponent(m[1]);
    window.JBData.getOrcamento(id).then(function (res) {
      if (res && res.data && window.__cpApply) {
        window.__cpApply(res.data.params || {});
        toast("Orçamento \"" + (res.data.nome || "Orçamento") + "\" reaberto ✓");
        history.replaceState(null, "", location.pathname);
      }
    });
  }
  // ---------- recuperação de trabalho (Fase 6) ----------
  var CP_DRAFT = "cp_draft";
  var MAXAGE = 7 * 24 * 60 * 60 * 1000; // 7 dias

  function draftMeaningful(snap) {
    if (!snap || !snap.params) return false;
    var p = snap.params;
    if (p.prof && ((p.prof.nome && p.prof.nome.trim()) || (p.prof.contato && p.prof.contato.trim()))) return true;
    if (Array.isArray(p.servicos) && p.servicos.some(function (s) { return (s.nome && s.nome.trim()) && (+s.quantidade > 0); })) return true;
    if (Array.isArray(p.aditivos) && p.aditivos.length) return true;
    return false;
  }

  function startAutosave() {
    var lastHash = null;
    function tick() {
      var snap = ensureSnapshot();
      if (!snap) return;
      if (!draftMeaningful(snap)) {
        // form vazio/limpo: descarta rascunho antigo para não oferecer recuperação à toa
        try { if (localStorage.getItem(CP_DRAFT)) localStorage.removeItem(CP_DRAFT); } catch (e) {}
        lastHash = null;
        return;
      }
      var hash = JSON.stringify(snap.params);
      if (hash === lastHash) return;
      lastHash = hash;
      try { localStorage.setItem(CP_DRAFT, JSON.stringify({ at: Date.now(), snap: snap })); } catch (e) {}
    }
    setInterval(tick, 4000);
    window.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") tick(); });
    window.addEventListener("pagehide", tick);
  }

  function offerRecovery() {
    // não atrapalha quando o orçamento é aberto por ?orc=
    if (/[?&]orc=/.test(location.search)) return;

    var raw;
    try { raw = localStorage.getItem(CP_DRAFT); } catch (e) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (e) { try { localStorage.removeItem(CP_DRAFT); } catch (e2) {} return; }
    if (!draft || !draft.snap || (Date.now() - (draft.at || 0)) > MAXAGE || !draftMeaningful(draft.snap)) {
      try { localStorage.removeItem(CP_DRAFT); } catch (e) {}
      return;
    }

    var bar = document.createElement("div");
    bar.className = "cp-recover no-print";
    bar.innerHTML =
      '<div class="t"><b>Encontramos um orçamento não concluído.</b><span>Quer retomar de onde parou?</span></div>' +
      '<div class="a"><button type="button" class="yes">Retomar</button><button type="button" class="no">Descartar</button></div>';
    document.body.appendChild(bar);
    bar.querySelector(".yes").addEventListener("click", function () {
      if (window.__cpApply) window.__cpApply(draft.snap.params || {});
      bar.remove();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("Orçamento retomado ✓");
    });
    bar.querySelector(".no").addEventListener("click", function () {
      try { localStorage.removeItem(CP_DRAFT); } catch (e) {}
      bar.remove();
    });
  }

  function onReady() { tryOpenFromUrl(); offerRecovery(); startAutosave(); }
  if (window.__cpReadyFired) onReady();
  else window.addEventListener("cp:ready", onReady, { once: true });
})();
