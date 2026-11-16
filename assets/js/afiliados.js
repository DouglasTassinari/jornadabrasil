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

  var AFILIADOS = [
    {
      id: 'tazzin-contato',
      ativo: true,
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
      ativo: true,
      rede: 'Lomadee (Editora Foco)',
      titulo: 'Quer estudar direito do trabalho a fundo?',
      texto: 'Livros jurídicos e de legislação para estudar a CLT com calma e consultar sempre que precisar.',
      cta: 'Ver livros da Editora Foco',
      url: 'https://lmdee.link/g6mthKAOq2pI',
      paginas: ['/blog/direitos-do-trabalhador-clt/', '/blog/jornada-de-trabalho/', '/blog/fim-da-escala-6x1/', '/blog/como-calcular-rescisao/'],
    },
    {
      id: 'motorista-pedagio',
      ativo: true,
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

  function html(a) {
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
    alvo.parentNode.insertBefore(div.firstChild, alvo);
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
