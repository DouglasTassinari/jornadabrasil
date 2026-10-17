/* ============================================================
   Jornada Brasil — camada de dados (local, sem conta)
   Orçamentos (Calcular Preço), histórico de cálculos e favoritos.
   Tudo fica salvo no navegador deste aparelho (localStorage).
   Todas as funções devolvem Promise<{ data, error }>.
   ============================================================ */
(function () {
  "use strict";

  var KEYS = {
    orcamentos: "jb:orcamentos",
    historico: "jb:historico",
    favoritos: "jb:favoritos",
  };
  var MAX_HISTORICO = 200;

  function read(key) {
    try {
      var list = JSON.parse(localStorage.getItem(key));
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function write(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); return null; }
    catch (e) { return { message: "Sem espaço para salvar neste aparelho" }; }
  }
  function ok(data) { return Promise.resolve({ data: data, error: null }); }
  function fail(msg) { return Promise.resolve({ data: null, error: { message: msg } }); }
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function now() { return new Date().toISOString(); }
  function byNewest(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }
  function pick(src, fields) {
    var out = {};
    fields.forEach(function (k) { if (src[k] !== undefined) out[k] = src[k]; });
    return out;
  }

  function insert(key, row) {
    var list = read(key);
    row.id = newId();
    row.created_at = row.updated_at = now();
    list.push(row);
    var err = write(key, list);
    return err ? Promise.resolve({ data: null, error: err }) : ok(row);
  }
  function update(key, id, patch) {
    var list = read(key);
    var row = list.filter(function (r) { return r.id === id; })[0];
    if (!row) return fail("Não encontrado");
    Object.assign(row, patch, { updated_at: now() });
    var err = write(key, list);
    return err ? Promise.resolve({ data: null, error: err }) : ok(row);
  }
  function remove(key, keep) {
    var err = write(key, read(key).filter(keep));
    return err ? Promise.resolve({ data: null, error: err }) : ok(null);
  }

  var ORC_FIELDS = ["nome", "valor_hora", "custos", "margem", "preco_final", "params"];
  var HIST_FIELDS = ["tipo", "titulo", "url", "valor_principal", "valor_label", "resumo", "inputs"];

  window.JBData = {
    // ---------------- Orçamentos ----------------
    listOrcamentos: function () {
      return ok(read(KEYS.orcamentos).sort(byNewest));
    },
    getOrcamento: function (id) {
      var row = read(KEYS.orcamentos).filter(function (r) { return r.id === id; })[0];
      return row ? ok(row) : fail("Orçamento não encontrado neste aparelho");
    },
    saveOrcamento: function (o) {
      var row = pick(o, ORC_FIELDS);
      row.nome = o.nome || "Orçamento";
      return insert(KEYS.orcamentos, row);
    },
    updateOrcamento: function (id, o) {
      return update(KEYS.orcamentos, id, pick(o, ORC_FIELDS));
    },
    deleteOrcamento: function (id) {
      return remove(KEYS.orcamentos, function (r) { return r.id !== id; });
    },

    // ---------------- Histórico de cálculos ----------------
    listHistorico: function (tipo) {
      var list = read(KEYS.historico).sort(byNewest);
      if (tipo) list = list.filter(function (r) { return r.tipo === tipo; });
      return ok(list);
    },
    saveHistorico: function (h) {
      var row = pick(h, HIST_FIELDS);
      row.tipo = h.tipo || "calculo";
      // mantém só os cálculos mais recentes para não lotar o aparelho
      var list = read(KEYS.historico).sort(byNewest);
      if (list.length >= MAX_HISTORICO) write(KEYS.historico, list.slice(0, MAX_HISTORICO - 1));
      return insert(KEYS.historico, row);
    },
    updateHistorico: function (id, h) {
      return update(KEYS.historico, id, pick(h, HIST_FIELDS));
    },
    deleteHistorico: function (id) {
      return remove(KEYS.historico, function (r) { return r.id !== id; });
    },

    // ---------------- Favoritos ----------------
    listFavoritos: function (tipo) {
      var list = read(KEYS.favoritos).sort(byNewest);
      if (tipo) list = list.filter(function (r) { return r.tipo === tipo; });
      return ok(list);
    },
    addFavorito: function (f) {
      var tipo = f.tipo || "calculadora";
      var existing = read(KEYS.favoritos).filter(function (r) { return r.tipo === tipo && r.slug === f.slug; })[0];
      if (existing) return ok(existing);
      return insert(KEYS.favoritos, { tipo: tipo, slug: f.slug, titulo: f.titulo || null, url: f.url || null });
    },
    removeFavorito: function (tipo, slug) {
      return remove(KEYS.favoritos, function (r) { return !(r.tipo === tipo && r.slug === slug); });
    },
  };
})();
