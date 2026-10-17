/* ============================================================
   Meu Lucro — lógica do app

   Persistência em dois modos:
   - NUVEM  (Firebase Auth + Firestore) quando config.js está
     preenchido e o usuário está logado. Dados por usuário (UID),
     sincronizados em tempo real entre dispositivos.
   - LOCAL  (LocalStorage) como fallback quando o Firebase não
     está configurado. Permite usar/testar o app sem conta.
   ============================================================ */

const APP_NAME = "Meu Lucro"; // nome temporário — fácil de trocar
const STORAGE = {
  config: "ml_config",
  records: "ml_records",
};
const DEFAULT_COST_KM = 0.25;

/* ---------------- Estado ---------------- */
let config = null;          // { model, year, dailyGoal, monthlyGoal, costKm }
let records = [];           // [{ id, date, revenue, km, fuel, other }]
let currentUser = null;     // usuário do Firebase quando logado
let unsubUser = null;       // listener do doc do usuário
let unsubRecords = null;    // listener da coleção de registros
let onboardingShown = false;
let migrationTried = false;

/* ---------------- Atalhos DOM ---------------- */
const $ = (id) => document.getElementById(id);

/* ============================================================
   Modo de operação (nuvem x local)
   ============================================================ */
function cloudEnabled() {
  return !!(window.FB && window.FB.enabled);
}
function cloudActive() {
  return !!(cloudEnabled() && currentUser && window.FB.uid);
}
function userDoc() {
  return window.FB.db.collection("users").doc(window.FB.uid);
}
function recordsCol() {
  return userDoc().collection("records");
}

/* ============================================================
   Persistência LOCAL (LocalStorage)
   ============================================================ */
function loadLocalConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.config)) || null;
  } catch {
    return null;
  }
}
function loadLocalRecords() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE.records)) || [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveLocalConfig(c) {
  localStorage.setItem(STORAGE.config, JSON.stringify(c));
}
function saveLocalRecords() {
  localStorage.setItem(STORAGE.records, JSON.stringify(records));
}

/* ============================================================
   Utilidades
   ============================================================ */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (n) => BRL.format(isFinite(n) ? n : 0);

// Converte texto digitado ("1.234,56" ou "1234.56" ou "80") em número.
function parseNum(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  let s = String(value).trim().replace(/[^\d.,-]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function formatDateBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function formatDateShort(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function monthKey(iso) {
  return iso.slice(0, 7); // YYYY-MM
}
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function monthLabel(iso) {
  const [y, m] = iso.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}
function cryptoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

/* ============================================================
   Cálculos
   ============================================================ */
function costKm() {
  return config && isFinite(config.costKm) ? config.costKm : DEFAULT_COST_KM;
}
function computed(r) {
  const wear = (r.km || 0) * costKm();
  const profit = (r.revenue || 0) - (r.fuel || 0) - (r.other || 0) - wear;
  return { ...r, wear, profit };
}
function aggregate(list) {
  return list.reduce(
    (a, raw) => {
      const r = computed(raw);
      a.revenue += r.revenue;
      a.fuel += r.fuel;
      a.other += r.other;
      a.km += r.km;
      a.wear += r.wear;
      a.profit += r.profit;
      a.days += 1;
      return a;
    },
    { revenue: 0, fuel: 0, other: 0, km: 0, wear: 0, profit: 0, days: 0 }
  );
}

/* ============================================================
   Renderização
   ============================================================ */
function render() {
  renderToday();
  renderMonth();
  renderInsight();
  renderHistory();
}

function renderToday() {
  const iso = todayISO();
  $("todayLabel").textContent = formatDateBR(iso);
  const a = aggregate(records.filter((r) => r.date === iso));

  $("todayRevenue").textContent = money(a.revenue);
  $("todayFuel").textContent = money(a.fuel);
  $("todayWear").textContent = money(a.wear);
  $("todayKm").textContent = `${a.km.toLocaleString("pt-BR")} km`;
  $("todayProfit").textContent = money(a.profit);

  const goal = config?.dailyGoal || 0;
  const pct = goal > 0 ? Math.max(0, (a.profit / goal) * 100) : 0;
  $("todayGoalFill").style.width = `${Math.min(pct, 100)}%`;
  $("todayGoalText").textContent = goal > 0
    ? `${Math.round(pct)}% da meta diária (${money(goal)})`
    : "Defina sua meta diária nas configurações";
}

function renderMonth() {
  const mk = monthKey(todayISO());
  $("monthLabel").textContent = monthLabel(todayISO());
  const a = aggregate(records.filter((r) => monthKey(r.date) === mk));

  $("monthRevenue").textContent = money(a.revenue);
  $("monthFuel").textContent = money(a.fuel);
  $("monthWear").textContent = money(a.wear);
  $("monthProfit").textContent = money(a.profit);
  $("monthDays").textContent = String(a.days);
  $("monthAvg").textContent = money(a.days ? a.profit / a.days : 0);

  const goal = config?.monthlyGoal || 0;
  const pct = goal > 0 ? Math.max(0, (a.profit / goal) * 100) : 0;
  $("monthGoalPercent").textContent = `${Math.round(pct)}%`;
  $("monthGoalFill").style.width = `${Math.min(pct, 100)}%`;
  $("monthProfitLabel").textContent = `${money(a.profit)} de ${money(goal)}`;

  const remaining = goal - a.profit;
  $("monthRemaining").textContent =
    goal > 0 ? (remaining > 0 ? `Faltam ${money(remaining)}` : "Meta batida! 🎉") : "";
}

let insightRotation = [];
let insightIndex = 0;
function renderInsight() {
  const el = $("insightText");
  const mk = monthKey(todayISO());
  const monthRecords = records.filter((r) => monthKey(r.date) === mk);

  if (records.length === 0) {
    el.textContent = "Registre seu primeiro dia para ver suas metas em ação.";
    insightRotation = [];
    return;
  }

  const a = aggregate(monthRecords);
  const monthlyGoal = config?.monthlyGoal || 0;
  const dailyGoal = config?.dailyGoal || 0;
  const avg = a.days ? a.profit / a.days : 0;
  const messages = [];

  if (monthlyGoal > 0) {
    const pct = Math.round((a.profit / monthlyGoal) * 100);
    const remaining = monthlyGoal - a.profit;
    if (remaining <= 0) {
      messages.push(`Você já bateu sua meta mensal! Lucro de ${money(a.profit)}. 🎉`);
    } else {
      messages.push(`Você já atingiu ${pct}% da meta mensal.`);
      messages.push(`Faltam ${money(remaining)} para atingir seu objetivo do mês.`);
    }
  }
  if (dailyGoal > 0 && a.days > 0) {
    if (avg >= dailyGoal) messages.push("Seu lucro médio diário está acima da meta. Continue assim!");
    else messages.push(`Sua média diária é ${money(avg)} — um pouco abaixo da meta de ${money(dailyGoal)}.`);
  }
  const todays = aggregate(records.filter((r) => r.date === todayISO()));
  if (todays.days > 0 && a.days > 1) {
    if (todays.profit > avg) messages.push("Hoje foi um dia acima da sua média. 👏");
    else if (todays.profit > 0) messages.push("Hoje ficou um pouco abaixo da sua média do mês.");
  }

  el.textContent = messages[0] || "Continue registrando para acompanhar sua evolução.";
  insightRotation = messages;
  insightIndex = 0;
}
function rotateInsight() {
  if (insightRotation.length < 2) return;
  insightIndex = (insightIndex + 1) % insightRotation.length;
  $("insightText").textContent = insightRotation[insightIndex];
}

function renderHistory() {
  const body = $("historyBody");
  const empty = $("historyEmpty");
  const wrap = $("historyWrap");

  if (records.length === 0) {
    empty.hidden = false;
    wrap.hidden = true;
    body.innerHTML = "";
    const sel0 = $("historyPeriod"); if (sel0) sel0.hidden = true;
    return;
  }
  empty.hidden = true;
  wrap.hidden = false;

  // Filtro por período (mês). Popula as opções e mantém a seleção.
  const sel = $("historyPeriod");
  let period = "all";
  if (sel) {
    sel.hidden = false;
    if (!sel.__bound) {
      sel.addEventListener("change", () => renderHistory());
      sel.__bound = true;
    }
    period = sel.value || "all";
    const months = Array.from(new Set(records.map((r) => monthKey(r.date)))).sort().reverse();
    const wanted = ["all"].concat(months).join("|");
    if (sel.__sig !== wanted) {
      sel.__sig = wanted;
      sel.innerHTML =
        '<option value="all">Todos os períodos</option>' +
        months.map((m) => `<option value="${m}">${monthLabel(m + "-01")}</option>`).join("");
      if (months.indexOf(period) === -1 && period !== "all") period = "all";
      sel.value = period;
    }
  }

  let visible = records;
  if (period !== "all") visible = records.filter((r) => monthKey(r.date) === period);

  const sorted = [...visible].sort((x, y) => (x.date < y.date ? 1 : -1));
  body.innerHTML = sorted
    .map((raw) => {
      const r = computed(raw);
      const cls = r.profit >= 0 ? "text-positive" : "text-negative";
      return `
      <tr>
        <td class="table__date">${formatDateShort(r.date)}</td>
        <td class="num">${money(r.revenue)}</td>
        <td class="num">${r.km}</td>
        <td class="num">${money(r.fuel)}</td>
        <td class="num row-profit ${cls}">${money(r.profit)}</td>
        <td class="num"><button class="table__edit" data-edit="${r.id}" aria-label="Editar">✎</button></td>
      </tr>`;
    })
    .join("");

  body.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openEdit(btn.dataset.edit))
  );
}

/* ============================================================
   Registro de dia
   ============================================================ */
function readForm() {
  return {
    date: $("inpDate").value || todayISO(),
    revenue: parseNum($("inpRevenue").value),
    km: parseNum($("inpKm").value),
    fuel: parseNum($("inpFuel").value),
    other: parseNum($("inpOther").value),
  };
}
function updateFormPreview() {
  const data = readForm();
  const hasInput =
    $("inpRevenue").value || $("inpKm").value || $("inpFuel").value || $("inpOther").value;
  const preview = $("formPreview");
  if (!hasInput) {
    preview.hidden = true;
    return;
  }
  preview.hidden = false;
  $("formPreviewValue").textContent = money(computed(data).profit);
}
function resetForm() {
  $("dayForm").reset();
  $("inpDate").value = todayISO();
  $("formPreview").hidden = true;
}

function handleSave(e) {
  e.preventDefault();
  const data = readForm();
  if (data.revenue === 0 && data.km === 0 && data.fuel === 0 && data.other === 0) {
    toast("Preencha pelo menos o faturamento.");
    return;
  }

  // Se já existe registro na mesma data, soma ao existente.
  const existing = records.find((r) => r.date === data.date);
  const id = existing ? existing.id : cryptoId();
  const merged = existing
    ? {
        id,
        date: data.date,
        revenue: existing.revenue + data.revenue,
        km: existing.km + data.km,
        fuel: existing.fuel + data.fuel,
        other: existing.other + data.other,
      }
    : { id, ...data };

  if (cloudActive()) {
    recordsCol().doc(id).set(merged).catch(() => toast("Erro ao salvar na nuvem."));
    // O onSnapshot atualiza a lista e re-renderiza (compensação de latência = instantâneo).
  } else {
    if (existing) Object.assign(existing, merged);
    else records.push(merged);
    saveLocalRecords();
    render();
  }

  resetForm();
  if (window.jbTrack) jbTrack("dia_salvo", { novo: !existing });
  toast(existing ? "Dia atualizado ✓" : "Dia salvo ✓");
}

/* ============================================================
   Edição / exclusão
   ============================================================ */
function openEdit(id) {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  $("editId").value = r.id;
  $("editDate").value = r.date;
  $("editRevenue").value = String(r.revenue).replace(".", ",");
  $("editKm").value = String(r.km);
  $("editFuel").value = String(r.fuel).replace(".", ",");
  $("editOther").value = String(r.other).replace(".", ",");
  showModal("editModal");
}

function handleEditSave(e) {
  e.preventDefault();
  const id = $("editId").value;
  const r = records.find((x) => x.id === id);
  if (!r) return;
  const updated = {
    id,
    date: $("editDate").value || r.date,
    revenue: parseNum($("editRevenue").value),
    km: parseNum($("editKm").value),
    fuel: parseNum($("editFuel").value),
    other: parseNum($("editOther").value),
  };

  if (cloudActive()) {
    recordsCol().doc(id).set(updated).catch(() => toast("Erro ao salvar na nuvem."));
  } else {
    Object.assign(r, updated);
    saveLocalRecords();
    render();
  }
  hideModal("editModal");
  toast("Registro atualizado ✓");
}

function handleEditDelete() {
  const id = $("editId").value;
  if (!confirm("Excluir este dia? Esta ação não pode ser desfeita.")) return;

  if (cloudActive()) {
    recordsCol().doc(id).delete().catch(() => toast("Erro ao excluir na nuvem."));
  } else {
    records = records.filter((x) => x.id !== id);
    saveLocalRecords();
    render();
  }
  hideModal("editModal");
  toast("Registro excluído");
}

/* ============================================================
   Configurações
   ============================================================ */
function openSettings(firstTime = false) {
  $("settingsIntro").hidden = !firstTime;
  $("accountBox").hidden = !cloudActive();
  if (cloudActive()) $("accountEmail").textContent = currentUser.email || "";

  if (config) {
    $("cfgModel").value = config.model || "";
    $("cfgYear").value = config.year || "";
    $("cfgDailyGoal").value = config.dailyGoal ? String(config.dailyGoal).replace(".", ",") : "";
    $("cfgMonthlyGoal").value = config.monthlyGoal ? String(config.monthlyGoal).replace(".", ",") : "";
    $("cfgCostKm").value = String(config.costKm ?? DEFAULT_COST_KM).replace(".", ",");
  } else {
    $("settingsForm").reset();
    $("cfgCostKm").value = String(DEFAULT_COST_KM).replace(".", ",");
  }
  showModal("settingsModal");
}

function handleSettingsSave(e) {
  e.preventDefault();
  const c = {
    model: $("cfgModel").value.trim(),
    year: $("cfgYear").value.trim(),
    dailyGoal: parseNum($("cfgDailyGoal").value),
    monthlyGoal: parseNum($("cfgMonthlyGoal").value),
    costKm: parseNum($("cfgCostKm").value) || DEFAULT_COST_KM,
  };

  if (cloudActive()) {
    config = c; // otimista
    render();
    userDoc()
      .set({ name: currentUser.displayName || "", config: c }, { merge: true })
      .catch(() => toast("Erro ao salvar na nuvem."));
  } else {
    config = c;
    saveLocalConfig(c);
    render();
  }
  hideModal("settingsModal");
  toast("Configurações salvas ✓");
}

/* ============================================================
   Sincronização com a nuvem (Firestore)
   ============================================================ */
function subscribeCloud() {
  unsubUser = userDoc().onSnapshot(
    (doc) => {
      const data = doc.exists ? doc.data() : null;
      config = data && data.config ? data.config : null;
      render();
      if (!config && !onboardingShown) {
        onboardingShown = true;
        openSettings(true);
      }
    },
    (err) => console.warn("[Meu Lucro] erro no doc do usuário:", err)
  );

  unsubRecords = recordsCol().onSnapshot(
    (snap) => {
      records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
      maybeMigrateLocal();
    },
    (err) => console.warn("[Meu Lucro] erro nos registros:", err)
  );
}

function unsubscribeCloud() {
  if (unsubUser) unsubUser();
  if (unsubRecords) unsubRecords();
  unsubUser = unsubRecords = null;
}

// Migração única: se a nuvem está vazia e há dados locais antigos,
// envia-os para a conta (uma vez por usuário).
function maybeMigrateLocal() {
  if (migrationTried || !cloudActive()) return;
  migrationTried = true;
  const uid = window.FB.uid;
  if (records.length > 0) return; // já tem dados na nuvem
  if (localStorage.getItem("ml_migrated_" + uid)) return;

  const localRecords = loadLocalRecords();
  const localConfig = loadLocalConfig();
  if (localRecords.length === 0 && !localConfig) return;

  const batch = window.FB.db.batch();
  localRecords.forEach((r) => {
    const id = r.id || cryptoId();
    batch.set(recordsCol().doc(id), { ...r, id });
  });
  if (localConfig) {
    batch.set(userDoc(), { name: currentUser.displayName || "", config: localConfig }, { merge: true });
  }
  batch
    .commit()
    .then(() => {
      localStorage.setItem("ml_migrated_" + uid, "1");
      toast("Dados locais importados para sua conta ✓");
    })
    .catch((err) => console.warn("[Meu Lucro] migração falhou:", err));
}

/* ============================================================
   Fluxo de autenticação (UI)
   ============================================================ */
function setState(state) {
  document.body.className = "state-" + state; // 'loading' | 'auth' | 'app'
}

function handleAuthChange(user) {
  if (user) {
    currentUser = user;
    migrationTried = false;
    onboardingShown = false;
    $("accountBox").hidden = false;
    $("accountEmail").textContent = user.email || "";
    if (window.jbTrack && !window.__jbAuthAction) jbTrack("user_return");
    window.__jbAuthAction = false;
    setState("app");
    subscribeCloud();
  } else {
    currentUser = null;
    unsubscribeCloud();
    records = [];
    config = null;
    $("accountBox").hidden = true;
    clearAuthMessages();
    setState("auth");
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth__tab").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.tab === tab)
  );
  $("loginForm").hidden = tab !== "login";
  $("signupForm").hidden = tab !== "signup";
  clearAuthMessages();
}

function clearAuthMessages() {
  $("authError").hidden = true;
  $("authNote").hidden = true;
}
function showAuthError(msg) {
  $("authNote").hidden = true;
  const el = $("authError");
  el.textContent = msg;
  el.hidden = false;
}
function showAuthNote(msg) {
  $("authError").hidden = true;
  const el = $("authNote");
  el.textContent = msg;
  el.hidden = false;
}

function handleLogin(e) {
  e.preventDefault();
  clearAuthMessages();
  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value;
  const btn = $("loginBtn");
  btn.disabled = true;
  window.__jbAuthAction = true;
  window.FB.login(email, pass)
    .then(() => { if (window.jbTrack) jbTrack("login", { method: "password" }); })
    .catch((err) => showAuthError(window.FB_ERROR(err)))
    .finally(() => (btn.disabled = false));
}

function handleSignup(e) {
  e.preventDefault();
  clearAuthMessages();
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const pass = $("signupPass").value;
  if (name.length < 2) return showAuthError("Digite seu nome.");
  const btn = $("signupBtn");
  btn.disabled = true;
  window.__jbAuthAction = true;
  window.FB.signup(name, email, pass)
    .then(() => { if (window.jbTrack) jbTrack("sign_up", { method: "password" }); })
    .catch((err) => showAuthError(window.FB_ERROR(err)))
    .finally(() => (btn.disabled = false));
}

function handleForgot() {
  clearAuthMessages();
  const email = $("loginEmail").value.trim();
  if (!email) {
    showAuthError("Digite seu e-mail acima para receber o link de recuperação.");
    $("loginEmail").focus();
    return;
  }
  window.FB.resetPassword(email)
    .then(() => showAuthNote("Enviamos um link de recuperação para o seu e-mail."))
    .catch((err) => showAuthError(window.FB_ERROR(err)));
}

function handleLogout() {
  hideModal("settingsModal");
  if (cloudActive()) window.FB.logout().catch(() => {});
}

/* ============================================================
   Relatório PDF
   ============================================================ */
function downloadReport() {
  const mk = monthKey(todayISO());
  const monthRecords = records.filter((r) => monthKey(r.date) === mk);
  if (records.length === 0) {
    toast("Nenhum dado para gerar relatório.");
    return;
  }
  const a = aggregate(monthRecords);
  const avg = a.days ? a.profit / a.days : 0;
  const period = monthLabel(todayISO());

  const jsPDFRef = window.jspdf?.jsPDF;
  if (!jsPDFRef) {
    printReport(period, a, avg, monthRecords);
    return;
  }

  const doc = new jsPDFRef({ unit: "pt", format: "a4" });
  const left = 48;
  let y = 60;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 125, 77);
  doc.text(APP_NAME, left, y);

  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  y += 26;
  doc.text(`Relatório — ${period}`, left, y);

  if (config?.model) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    y += 16;
    doc.text(
      `Veículo: ${config.model}${config.year ? " (" + config.year + ")" : ""}  ·  Custo por km: ${money(costKm())}`,
      left, y
    );
  }

  y += 28;
  const rows = [
    ["Receita total", money(a.revenue)],
    ["Combustível", money(a.fuel)],
    ["Outros gastos", money(a.other)],
    ["Desgaste do veículo", money(a.wear)],
    ["Lucro líquido", money(a.profit)],
    ["Dias trabalhados", String(a.days)],
    ["Média líquida por dia", money(avg)],
  ];
  doc.setDrawColor(225, 230, 235);
  rows.forEach(([label, value]) => {
    const bold = label === "Lucro líquido";
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(bold ? 15 : 60, bold ? 125 : 60, bold ? 77 : 60);
    doc.text(label, left, y);
    doc.text(value, 547 - doc.getTextWidth(value), y);
    y += 8;
    doc.line(left, y, 547, y);
    y += 16;
  });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Detalhamento por dia", left, y);
  y += 18;

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const cols = [left, left + 90, left + 180, left + 280, left + 400];
  doc.text("Data", cols[0], y);
  doc.text("Receita", cols[1], y);
  doc.text("KM", cols[2], y);
  doc.text("Combustível", cols[3], y);
  doc.text("Lucro", cols[4], y);
  y += 6;
  doc.line(left, y, 547, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  [...monthRecords]
    .sort((x, z) => (x.date < z.date ? -1 : 1))
    .forEach((raw) => {
      if (y > 780) {
        doc.addPage();
        y = 60;
      }
      const r = computed(raw);
      doc.text(formatDateBR(r.date), cols[0], y);
      doc.text(money(r.revenue), cols[1], y);
      doc.text(String(r.km), cols[2], y);
      doc.text(money(r.fuel), cols[3], y);
      doc.text(money(r.profit), cols[4], y);
      y += 16;
    });

  doc.save(`relatorio-meu-lucro-${mk}.pdf`);
  toast("Relatório gerado ✓");
}

function printReport(period, a, avg, monthRecords) {
  const rows = [...monthRecords]
    .sort((x, z) => (x.date < z.date ? -1 : 1))
    .map((raw) => {
      const r = computed(raw);
      return `<tr><td>${formatDateBR(r.date)}</td><td>${money(r.revenue)}</td><td>${r.km}</td><td>${money(r.fuel)}</td><td>${money(r.profit)}</td></tr>`;
    })
    .join("");

  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Relatório ${period}</title>
    <style>
      body{font-family:Arial,sans-serif;color:#222;padding:32px;}
      h1{color:#B45309;margin:0 0 4px;}
      h2{font-size:16px;margin:0 0 18px;color:#444;}
      table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px;}
      td,th{padding:8px;border-bottom:1px solid #e1e6eb;text-align:left;}
      .summary td{border:none;padding:4px 0;}
      .summary td:last-child{text-align:right;font-weight:600;}
    </style></head><body>
    <h1>${APP_NAME}</h1>
    <h2>Relatório — ${period}</h2>
    <table class="summary">
      <tr><td>Receita total</td><td>${money(a.revenue)}</td></tr>
      <tr><td>Combustível</td><td>${money(a.fuel)}</td></tr>
      <tr><td>Desgaste do veículo</td><td>${money(a.wear)}</td></tr>
      <tr><td>Lucro líquido</td><td>${money(a.profit)}</td></tr>
      <tr><td>Dias trabalhados</td><td>${a.days}</td></tr>
      <tr><td>Média líquida por dia</td><td>${money(avg)}</td></tr>
    </table>
    <table>
      <thead><tr><th>Data</th><th>Receita</th><th>KM</th><th>Combustível</th><th>Lucro</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

/* ============================================================
   Modais e Toast
   ============================================================ */
function showModal(id) {
  $(id).hidden = false;
  document.body.dataset.modal = "open";
}
function hideModal(id) {
  $(id).hidden = true;
  delete document.body.dataset.modal;
}
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ============================================================
   Inicialização
   ============================================================ */
function init() {
  $("brandName").textContent = APP_NAME;
  $("footerNote").textContent = APP_NAME;
  $("inpDate").value = todayISO();

  // Formulário de registro
  $("dayForm").addEventListener("submit", handleSave);
  ["inpRevenue", "inpKm", "inpFuel", "inpOther"].forEach((id) =>
    $(id).addEventListener("input", updateFormPreview)
  );

  // Configurações
  $("openSettings").addEventListener("click", () => openSettings(false));
  $("settingsForm").addEventListener("submit", handleSettingsSave);
  $("logoutBtn").addEventListener("click", handleLogout);

  // Edição
  $("editForm").addEventListener("submit", handleEditSave);
  $("editDelete").addEventListener("click", handleEditDelete);

  // Relatório
  $("downloadReport").addEventListener("click", downloadReport);

  // Insight clicável
  $("insightCard").addEventListener("click", rotateInsight);

  // Fechar modais
  document.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", () => {
      hideModal("settingsModal");
      hideModal("editModal");
    })
  );

  // Tela de autenticação
  document.querySelectorAll(".auth__tab").forEach((b) =>
    b.addEventListener("click", () => switchAuthTab(b.dataset.tab))
  );
  $("loginForm").addEventListener("submit", handleLogin);
  $("signupForm").addEventListener("submit", handleSignup);
  $("forgotBtn").addEventListener("click", handleForgot);

  // Decide o modo de operação
  if (cloudEnabled()) {
    setState("loading");
    window.FB.auth.onAuthStateChanged(handleAuthChange);
  } else {
    // Modo local (Firebase não configurado)
    $("localBanner").hidden = false;
    config = loadLocalConfig();
    records = loadLocalRecords();
    setState("app");
    render();
  }

  // Service worker (PWA)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
