/* ============================================================
   Jornada Brasil — recomendações com links de afiliado.
   Tudo começa DESLIGADO (ativo: false). Para ligar uma recomendação:
     1. entre na rede (Lomadee, Awin, Hotmart...) e pegue o seu link de afiliado;
     2. cole o link em "url" e troque "ativo" para true;
     3. rode os testes (node --test tools/tests/afiliados.test.cjs) e publique.
   A caixa aparece só nas páginas listadas em "paginas", com o rótulo
   "Publicidade · link de afiliado", rel="sponsored nofollow noopener" e um link
   para /publicidade/. Não usa cookies próprios; o clique vira o evento
   "afiliado_clique" no Google Analytics (se a pessoa aceitou os cookies).
   Regras: texto honesto, sem prometer ganho nem dar aconselhamento financeiro.
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.JBAfiliados = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 18/11/2026: tudo desligado até a aprovação do AdSense (decisão para a nova revisão). Para religar uma recomendação, troque ativo por true.
  var AFILIADOS = [
    {
      id: 'tazzin-contato',
      ativo: false,
      proprio: true,
      rede: 'Tazzin (serviço do autor do site)',
      titulo: 'Controle da sua empresa ainda vive em planilhas?',
      texto: 'A Tazzin cria sistemas de gestão sob medida para indústrias e empresas: menos planilhas, mais controle. Conte qual controle mais dói hoje e receba uma ideia de por onde começar.',
      cta: 'Conversar com a Tazzin',
      url: 'https://douglastassinari.github.io/tazzin-site/contato/',
      paginas: ['/horas-extras/', '/adicional-noturno/', '/blog/banco-de-horas/', '/blog/como-calcular-horas-extras/', '/blog/trabalho-noturno/', '/blog/como-calcular-margem-de-lucro/', '/calcular-preco/'],
    },
    {
      id: 'contabilidade-mei-pj',
      ativo: false,
      rede: 'a definir (Awin, Lomadee ou programa próprio)',
      titulo: 'Vai abrir empresa ou virar MEI/PJ?',
      texto: 'Compare serviços de contabilidade online antes de decidir. Muita gente só descobre os custos depois de abrir.',
      cta: 'Ver opções de contabilidade online',
      url: '',
      paginas: ['/pj-vs-clt/', '/calcular-preco/', '/blog/clt-vs-pj/', '/blog/financas-do-autonomo/', '/comparar-propostas/'],
    },
    {
      id: 'organizacao-financeira',
      ativo: false,
      rede: 'a definir (Hotmart ou Lomadee)',
      titulo: 'Quer organizar o dinheiro do 13º e das férias?',
      texto: 'Planilhas e cursos de finanças pessoais ajudam a transformar o extra do ano em reserva, e não em dívida.',
      cta: 'Conhecer materiais de finanças pessoais',
      url: '',
      paginas: ['/decimo-terceiro/', '/ferias/', '/blog/decimo-terceiro-salario/', '/blog/planejar-13-e-ferias/', '/blog/reserva-de-emergencia/', '/blog/orcamento-50-30-20/', '/blog/como-sair-das-dividas/'],
    },
    {
      id: 'recolocacao-demitido',
      ativo: false, // ligar quando a Hotmart aprovar a afiliação ao PPMT (pedida em 16/11/2026) e o link estiver em "url"
      rede: 'Hotmart (PPMT - Preparatório Para o Mercado de Trabalho, comissão de 45%)',
      titulo: 'Foi demitido ou vai trocar de emprego?',
      texto: 'Curso criado por uma profissional de RH, com foco em currículo, entrevista e processo seletivo, para quem precisa voltar ao mercado.',
      cta: 'Conhecer o preparatório para o mercado de trabalho',
      url: '',
      paginas: ['/rescisao/', '/seguro-desemprego/', '/guia-demissao/', '/blog/demissao-sem-justa-causa/', '/blog/seguro-desemprego-como-funciona/'],
    },
    {
      id: 'declaracao-imposto-de-renda',
      ativo: false,
      rede: 'a definir (programa do próprio serviço ou Awin)',
      titulo: 'Vai declarar o Imposto de Renda?',
      texto: 'Programas de declaração ajudam a conferir deduções e evitar a malha fina. Confira as opções antes do prazo.',
      cta: 'Ver programas de declaração',
      url: '',
      paginas: ['/imposto-de-renda/', '/imposto-de-renda-salario/'],
    },
    {
      id: 'livros-clt-financas',
      ativo: false,
      rede: 'Lomadee (Editora Foco)',
      titulo: 'Quer estudar direito do trabalho a fundo?',
      texto: 'Livros jurídicos e de legislação para estudar a CLT com calma e consultar sempre que precisar.',
      cta: 'Ver livros da Editora Foco',
      url: 'https://lmdee.link/g6mthKAOq2pI',
      paginas: ['/blog/direitos-do-trabalhador-clt/', '/blog/jornada-de-trabalho/', '/blog/fim-da-escala-6x1/', '/blog/como-calcular-rescisao/'],
    },
    {
      id: 'motorista-pedagio',
      ativo: false,
      rede: 'Lomadee (Sem Parar)',
      titulo: 'Roda muito de carro para trabalhar?',
      texto: 'Pedágio e estacionamento pesam no lucro de quem dirige todo dia. A tag automática pode ajudar a controlar esses gastos.',
      cta: 'Conhecer a tag de pedágio',
      url: 'https://lmdee.link/1ZcoSrDk6Bp9',
      paginas: ['/blog/quanto-ganha-motorista-aplicativo/', '/meu-lucro/'],
    },
  ];

  function ligados() {
    return AFILIADOS.filter(function (a) { return a.ativo === true && /^https:\/\//.test(a.url || ''); });
  }

  function para(caminho) {
    return ligados().filter(function (a) { return a.paginas.indexOf(caminho) >= 0; })[0] || null;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function htmlTazzin(a) {
    var css = '<style>' +
      '.jb-tazzin{--tz-navy:#0D1B2A;--tz-navy2:#13263a;--tz-green:#4CAF50;font-family:Poppins,Inter,system-ui,sans-serif;position:relative;overflow:hidden;margin:32px 0;padding:22px 22px 18px;border-radius:16px;color:#fff;background:radial-gradient(120% 140% at 100% 0,#1c3a52 0,var(--tz-navy) 55%);border:1px solid rgba(76,175,80,.45);box-shadow:0 10px 30px rgba(13,27,42,.45),0 0 0 4px rgba(76,175,80,.08)}' +
      '.jb-tazzin::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}' +
      '.jb-tazzin>*{position:relative}' +
      '.jb-tazzin .tz-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}' +
      '.jb-tazzin .tz-tag{font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;background:var(--tz-green);color:var(--tz-navy);padding:4px 10px;border-radius:999px}' +
      '.jb-tazzin .tz-sub{font-size:.7rem;color:#9fb0c0;letter-spacing:.04em}' +
      '.jb-tazzin .tz-logo{display:flex;align-items:center;gap:10px;margin-bottom:12px}' +
      '.jb-tazzin .tz-word{font-weight:700;font-size:1.45rem;letter-spacing:.14em;line-height:1}' +
      '.jb-tazzin h2{margin:0 0 6px;font-size:1.35rem;line-height:1.25;font-weight:700;color:#fff}' +
      '.jb-tazzin h2 span{color:var(--tz-green)}' +
      '.jb-tazzin p.tz-txt{margin:0 0 14px;font-size:.92rem;line-height:1.55;color:#d5dee8}' +
      '.jb-tazzin .tz-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;padding:0;list-style:none}' +
      '.jb-tazzin .tz-chips li{font-size:.76rem;padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff}' +
      '.jb-tazzin .tz-cta{display:inline-flex;align-items:center;gap:8px;background:var(--tz-green);color:var(--tz-navy);font-weight:700;font-size:.98rem;padding:12px 22px;border-radius:10px;text-decoration:none;box-shadow:0 0 0 0 rgba(76,175,80,.6);animation:tzpulse 2.4s infinite}' +
      '.jb-tazzin .tz-cta:hover{background:#66bb6a}' +
      '.jb-tazzin .tz-demo{margin-left:14px;font-size:.84rem;color:#cfe9d1;text-decoration:underline}' +
      '.jb-tazzin .tz-foot{margin:14px 0 0;font-size:.72rem;color:#8ea0b2}' +
      '.jb-tazzin .tz-foot a{color:#cfe9d1}' +
      '@keyframes tzpulse{0%{box-shadow:0 0 0 0 rgba(76,175,80,.55)}70%{box-shadow:0 0 0 12px rgba(76,175,80,0)}100%{box-shadow:0 0 0 0 rgba(76,175,80,0)}}' +
      '@media (prefers-reduced-motion:reduce){.jb-tazzin .tz-cta{animation:none}}' +
      '@media (max-width:480px){.jb-tazzin{padding:18px 16px 16px}.jb-tazzin h2{font-size:1.15rem}.jb-tazzin .tz-demo{display:block;margin:12px 0 0}}' +
      '</style>';
    var logo = '<svg width="38" height="38" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path fill="#fff" d="M30 18H80Q82 18 82 20V35Q82 42 75 42H51V74Q51 82 43 82H38Q30 82 30 74V42H16Q14 42 14 40V34Q14 18 30 18Z"/><rect x="59" y="56" width="23" height="26" rx="8" fill="#4CAF50"/></svg>';
    return css + '<aside class="jb-tazzin" aria-label="Divulgação">' +
      '<div class="tz-top"><span class="tz-tag">Divulgação</span><span class="tz-sub">Serviço do autor do site</span></div>' +
      '<div class="tz-logo">' + logo + '<span class="tz-word">TAZZIN</span></div>' +
      '<h2>Menos planilhas. <span>Mais controle.</span></h2>' +
      '<p class="tz-txt">' + esc(a.texto) + '</p>' +
      '<ul class="tz-chips"><li>Calibração e manutenção</li><li>Estoque e compras</li><li>Produção</li><li>Clientes</li><li>Sob medida</li></ul>' +
      '<a class="tz-cta" href="' + esc(a.url) + '" target="_blank" rel="noopener" data-afiliado="' + esc(a.id) + '">' + esc(a.cta) + ' →</a>' +
      '<a class="tz-demo" href="https://tazzin.streamlit.app/" target="_blank" rel="noopener">Ver a demonstração</a>' +
      '<p class="tz-foot">A Tazzin é um negócio do mesmo autor do Jornada Brasil. <a href="/publicidade/">Como funciona</a>.</p>' +
      '</aside>';
  }

  function html(a) {
    if (a.proprio) return htmlTazzin(a);
    return '<aside class="jb-afiliado" aria-label="Publicidade" style="margin:28px 0;padding:16px 18px;border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:var(--radius-sm);background:var(--surface)">' +
      '<p style="margin:0 0 6px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2);font-weight:700">' + (a.proprio ? 'Divulgação · serviço do autor do site' : 'Publicidade · link de afiliado') + '</p>' +
      '<h2 style="margin:0 0 6px;font-size:1.05rem">' + esc(a.titulo) + '</h2>' +
      '<p style="margin:0 0 12px;font-size:.92rem;line-height:1.55;color:var(--text)">' + esc(a.texto) + '</p>' +
      '<a class="btn btn-primary" href="' + esc(a.url) + '" target="_blank" rel="' + (a.proprio ? 'noopener' : 'sponsored nofollow noopener') + '" data-afiliado="' + esc(a.id) + '">' + esc(a.cta) + ' →</a>' +
      '<p style="margin:10px 0 0;font-size:.78rem;color:var(--text-2)">' + (a.proprio ? 'A Tazzin é um negócio do mesmo autor do Jornada Brasil.' : 'Se você contratar por este link, o Jornada Brasil pode receber uma comissão, sem custo extra para você.') + ' <a href="/publicidade/" style="color:var(--accent-text)">Como funciona</a>.</p>' +
      '</aside>';
  }

  function montar() {
    if (typeof document === 'undefined') return;
    var a = para(location.pathname);
    if (!a) return;
    var alvo = document.querySelector('.related-calcs') || document.querySelector('.disclaimer-box') || document.querySelector('main .container');
    if (!alvo) return;
    var div = document.createElement('div');
    div.innerHTML = html(a);
    while (div.firstChild) alvo.parentNode.insertBefore(div.firstChild, alvo);
    if (a.proprio && !document.getElementById('jb-poppins')) {
      var l = document.createElement('link'); l.id = 'jb-poppins'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap';
      document.head.appendChild(l);
    }
    var link = document.querySelector('a[data-afiliado="' + a.id + '"]');
    if (link) link.addEventListener('click', function () {
      try { if (typeof window.gtag === 'function') window.gtag('event', 'afiliado_clique', { afiliado: a.id, pagina: location.pathname }); } catch (e) { /* sem analytics */ }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  }

  return { AFILIADOS: AFILIADOS, ligados: ligados, para: para, html: html, montar: montar };
});
