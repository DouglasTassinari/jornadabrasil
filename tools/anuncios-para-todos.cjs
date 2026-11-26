/* Anúncios para todos os visitantes:
   quem aceita publicidade vê anúncio personalizado; quem recusa ou ainda não
   escolheu vê anúncio sem personalização, com os cookies de publicidade negados.

   Uso (na raiz do site):  node tools/anuncios-para-todos.cjs
   Pode rodar mais de uma vez: o que já foi trocado é ignorado. */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const VERSAO = '20261126a';

const TRAVA_ANTIGA = "<script>(function(){var p=1;try{var c=JSON.parse(localStorage.getItem('lgpd_consent')||'null');if(c&&c.ads&&c.ts&&Date.now()-c.ts<31536000000)p=0;}catch(e){}(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=p;})();</script>";

// Precisa vir antes do adsbygoogle.js: declara o consentimento de publicidade e o tipo de anúncio.
const TRAVA_NOVA = "<script>(function(){var ok=0;try{var c=JSON.parse(localStorage.getItem('lgpd_consent')||'null');if(c&&c.ads&&c.ts&&Date.now()-c.ts<31536000000)ok=1;}catch(e){}window.dataLayer=window.dataLayer||[];(function(){window.dataLayer.push(arguments)})('consent','default',{'ad_storage':ok?'granted':'denied','ad_user_data':ok?'granted':'denied','ad_personalization':ok?'granted':'denied'});var a=window.adsbygoogle=window.adsbygoogle||[];a.requestNonPersonalizedAds=ok?0:1;a.pauseAdRequests=0;})();</script>";

const AVISO = '<p>O site é mantido por anúncios. Aceitando, eles são personalizados e usamos cookies de análise; sem aceitar, aparecem sem personalização. <a href="/cookies/">Política de Cookies</a>.</p>';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// [arquivo, texto antigo, texto novo]. O texto novo nunca contém o antigo.
const TEXTOS = [
  ['assets/js/consent.js',
    "    // Carrega scripts de terceiros conforme consentimento\n    if (prefs.analytics) RC.loadAnalytics();\n    if (prefs.ads) RC.loadAds();\n    else RC.pauseAds();",
    "    // Análise só carrega com consentimento; anúncios mudam de tipo\n    if (prefs.analytics) RC.loadAnalytics();\n    RC.setAds(!!prefs.ads);"],
  ['assets/js/consent.js',
    `  // O código do AdSense fica no <head> das páginas com conteúdo, com as
  // requisições de anúncio pausadas (pauseAdRequests=1) até o consentimento.
  // Páginas sem o código (conta, erro, redirecionamentos) não exibem anúncios.
  loadAds: function() {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) return;
    (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 0;
  },

  pauseAds: function() {
    (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
  }`,
    `  // O código do AdSense fica no <head> das páginas com conteúdo. Todos veem
  // anúncios; sem consentimento de publicidade eles são pedidos sem
  // personalização. Páginas sem o código (conta, erro) não exibem anúncios.
  setAds: function(personalizados) {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) return;
    const ads = (window.adsbygoogle = window.adsbygoogle || []);
    ads.requestNonPersonalizedAds = personalizados ? 0 : 1;
    ads.pauseAdRequests = 0;
  }`],
  ['assets/js/consent.js',
    '<div style="font-weight:600;font-size:.9rem">Publicidade</div>',
    '<div style="font-weight:600;font-size:.9rem">Publicidade personalizada</div>'],
  ['assets/js/consent.js',
    'Google AdSense — anúncios relevantes para você',
    'Google AdSense — desligado, os anúncios aparecem sem personalização'],
  ['assets/js/consent.js',
    'aria-label="Cookies de publicidade">',
    'aria-label="Publicidade personalizada">'],

  ['cookies/index.html',
    'O código do AdSense é carregado nas páginas com as solicitações de anúncio pausadas: os anúncios só são pedidos depois que você aceita os cookies de publicidade.',
    'Os anúncios do Google AdSense aparecem para todos os visitantes. Se você aceita os cookies de publicidade, eles podem ser personalizados; se recusa ou ainda não escolheu, pedimos ao Google anúncios sem personalização e sem a gravação de novos cookies de publicidade.'],
  ['publicidade/index.html',
    'O Google usa cookies para mostrar anúncios. Eles só são carregados depois que você aceita os cookies, e você pode mudar a escolha',
    'Os anúncios aparecem para todos os visitantes. Com o seu aceite, o Google pode usar cookies para personalizá-los; sem o aceite, são pedidos sem personalização. Você pode mudar a escolha'],
  ['privacidade/index.html',
    'O código do AdSense é carregado nas páginas com as solicitações de anúncio pausadas; anúncios só são solicitados depois que o visitante aceita os cookies de publicidade. A partir daí, o Google e seus parceiros podem usar cookies, web beacons, endereço IP e outros identificadores para exibir e medir anúncios, conforme a Política de Privacidade do Google.',
    'Os anúncios aparecem para todos os visitantes. Se você aceita os cookies de publicidade, o Google e seus parceiros podem usar cookies, web beacons, endereço IP e outros identificadores para exibir, personalizar e medir anúncios. Se você recusa ou ainda não escolheu, pedimos ao Google anúncios sem personalização e sem a gravação de novos cookies de publicidade; mesmo assim, o Google recebe dados técnicos, como endereço IP, tipo de navegador e página visitada, para exibir e medir os anúncios e evitar fraudes, conforme a Política de Privacidade do Google.'],
  ['privacidade/index.html',
    'Exibição de publicidade relevante que nos permite manter o portal gratuito (AdSense, mediante consentimento).',
    'Exibição de publicidade que nos permite manter o portal gratuito (AdSense; personalizada somente com consentimento).'],
  ['privacidade/index.html',
    'cookies de análise (Google Analytics) e publicidade (Google AdSense)',
    'cookies de análise (Google Analytics), cookies de publicidade e anúncios personalizados (Google AdSense)'],
  ['privacidade/index.html',
    'cookies técnicos essenciais necessários para o funcionamento básico do portal.',
    'cookies técnicos essenciais necessários para o funcionamento básico do portal; e exibição de anúncios sem personalização, para manter o portal gratuito.'],
];

function paginas(dir, lista = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'node_modules') continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) paginas(caminho, lista);
    else if (item.name.endsWith('.html')) lista.push(caminho);
  }
  return lista;
}

function aplicar(raiz = RAIZ, hoje = new Date()) {
  const mudados = new Set();
  const faltando = [];
  const ler = (arq) => fs.readFileSync(arq, 'utf8');
  const gravar = (arq, antes, depois) => {
    if (antes === depois) return;
    fs.writeFileSync(arq, depois);
    mudados.add(arq);
  };

  for (const [rel, antigo, novo] of TEXTOS) {
    const arq = path.join(raiz, rel);
    const antes = ler(arq);
    const crlf = antes.includes('\r\n');
    const a = crlf ? antigo.replace(/\n/g, '\r\n') : antigo;
    const n = crlf ? novo.replace(/\n/g, '\r\n') : novo;
    if (antes.includes(a)) gravar(arq, antes, antes.split(a).join(n));
    else if (!antes.includes(n)) faltando.push(`${rel}: "${antigo.slice(0, 60)}..."`);
  }

  // Datas de revisão só mudam nas páginas cujo texto mudou nesta execução.
  const mes = `${MESES[hoje.getMonth()]}`;
  for (const rel of ['privacidade/index.html', 'cookies/index.html', 'publicidade/index.html']) {
    const arq = path.join(raiz, rel);
    if (!mudados.has(arq)) continue;
    const antes = ler(arq);
    gravar(arq, antes, antes
      .replace(/(Última atualização: )[a-zç]+\/\d{4}/, `$1${mes}/${hoje.getFullYear()}`)
      .replace(/(Atualizado em )\d{1,2} de [a-zç]+ de \d{4}/, `$1${hoje.getDate()} de ${mes} de ${hoje.getFullYear()}`));
  }

  for (const arq of paginas(raiz)) {
    const antes = ler(arq);
    const depois = antes
      .split(TRAVA_ANTIGA).join(TRAVA_NOVA)
      .replace(/(id="cookie-banner"[^>]*>\s*(?:<div[^>]*>\s*)?)<p>[\s\S]*?<\/p>/, (_, abre) => abre + AVISO)
      .replace(/(assets\/js\/consent\.js\?v=)[0-9a-z]+/g, `$1${VERSAO}`);
    gravar(arq, antes, depois);
  }

  return { mudados: [...mudados], faltando };
}

module.exports = { aplicar, paginas, TRAVA_ANTIGA, TRAVA_NOVA, AVISO, VERSAO };

if (require.main === module) {
  const { mudados, faltando } = aplicar();
  console.log(`${mudados.length} arquivos alterados.`);
  if (faltando.length) {
    console.error('Textos não encontrados (o site mudou; revisar o script):\n- ' + faltando.join('\n- '));
    process.exit(1);
  }
}
