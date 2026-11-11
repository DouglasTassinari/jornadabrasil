/* ============================================================
   Jornada Brasil — tela da Calculadora da escala 6x1 para 5x2.
   Usa o motor window.JBEscala (assets/js/escala-6x1.js).
   - atualiza o resultado a cada digitação;
   - desenha o card 1080x1920 (status do WhatsApp / stories) num <canvas>;
   - compartilha no WhatsApp, pelo menu do celular, baixa a imagem ou copia o link;
   - aceita os parâmetros ?e=6x1&d=6&h=44&t=60&f=9&v=1&s=2200 para abrir preenchido.
   Nada do que a pessoa digita sai do aparelho.
   ============================================================ */
(function () {
  'use strict';
  var E = window.JBEscala;
  var form = document.getElementById('esc-form');
  var saida = document.getElementById('esc-resultado');
  if (!E || !form || !saida) return;

  var URL_PAGINA = 'https://jornadabrasil.com.br/calculadora-escala-6x1/';
  var canvas = document.getElementById('esc-card');
  var share = document.getElementById('esc-share');
  var feedback = document.getElementById('esc-feedback');
  var anuncio = document.getElementById('esc-anuncio');
  var campoDias = document.getElementById('campo-dias');
  var campoHoras = document.getElementById('campo-horas');
  var atual = null;
  var calculou = false;
  var timerCard = null, timerAnuncio = null;

  function track(nome, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', nome, params || {}); } catch (e) { /* sem analytics */ }
  }

  function link(origem) {
    return URL_PAGINA + '?utm_source=' + origem + '&utm_medium=compartilhamento&utm_campaign=escala-6x1';
  }

  function ler() {
    var el = form.elements;
    var marcada = form.querySelector('input[name="escala"]:checked');
    return {
      escala: marcada ? marcada.value : '6x1',
      dias: el.dias.value,
      horas: el.horas.value,
      deslocamentoMin: el.deslocamento.value,
      feriados: el.feriados.value,
      ferias: el.ferias.checked,
      salario: el.salario.value,
    };
  }

  function ajustarCampos(escala) {
    if (campoDias) campoDias.classList.toggle('oculto', escala !== 'outra');
    if (campoHoras) campoHoras.classList.toggle('oculto', escala === '12x36');
  }

  function atualizar(peloUsuario) {
    var entrada = ler();
    ajustarCampos(entrada.escala);
    atual = E.calcular(entrada);
    saida.innerHTML = E.resultadoHTML(atual);
    var wa = document.getElementById('esc-wa');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(E.textoCompartilhar(atual, link('whatsapp')));
    var miniTxt = document.getElementById('esc-mini-txt');
    if (miniTxt) miniTxt.innerHTML = E.resumoCurto(atual);
    clearTimeout(timerCard);
    timerCard = setTimeout(desenharCard, 120);
    if (anuncio) {
      clearTimeout(timerAnuncio);
      timerAnuncio = setTimeout(function () { anuncio.textContent = E.textoCompartilhar(atual, '').replace(/ Quantos dias[\s\S]*$/, ''); }, 700);
    }
    if (peloUsuario && !calculou) {
      calculou = true;
      track('escala_calculo', { escala: atual.entrada.escala, caso: atual.caso });
    }
  }

  /* ---------------- Preenchimento pela URL ---------------- */
  function preencherPelaUrl() {
    var p;
    try { p = new URLSearchParams(window.location.search); } catch (e) { return; }
    var el = form.elements;
    var escala = p.get('e');
    if (escala) {
      var radio = form.querySelector('input[name="escala"][value="' + escala.replace(/[^0-9a-z]/gi, '') + '"]');
      if (radio) radio.checked = true;
    }
    if (p.get('d')) el.dias.value = String(Math.min(6, Math.max(1, parseInt(p.get('d'), 10) || 6)));
    if (p.get('h')) el.horas.value = p.get('h');
    if (p.get('t')) {
      var t = p.get('t');
      var existe = Array.prototype.some.call(el.deslocamento.options, function (o) { return o.value === t; });
      if (existe) el.deslocamento.value = t;
    }
    if (p.get('f')) el.feriados.value = p.get('f');
    if (p.get('v')) el.ferias.checked = p.get('v') !== '0';
    if (p.get('s')) el.salario.value = p.get('s');
  }

  /* ---------------- Card para compartilhar ---------------- */
  var FONTE = '"Inter", "Segoe UI", Roboto, Arial, sans-serif';

  function caber(ctx, texto, pesoTam, maxLarg) {
    // reduz a fonte até o texto caber na largura
    var partes = pesoTam.split(' '), peso = partes[0], tam = parseInt(partes[1], 10);
    ctx.font = peso + ' ' + tam + 'px ' + FONTE;
    while (ctx.measureText(texto).width > maxLarg && tam > 20) {
      tam -= 4;
      ctx.font = peso + ' ' + tam + 'px ' + FONTE;
    }
  }

  function quebrar(ctx, texto, maxLarg) {
    var palavras = texto.split(' '), linhas = [], linha = '';
    palavras.forEach(function (p) {
      var teste = linha ? linha + ' ' + p : p;
      if (ctx.measureText(teste).width > maxLarg && linha) { linhas.push(linha); linha = p; }
      else linha = teste;
    });
    if (linha) linhas.push(linha);
    return linhas;
  }

  function retangulo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function desenharCard() {
    if (!canvas || !atual || !canvas.getContext) return;
    var c = E.cartao(atual);
    var W = 1080, H = 1920, ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;

    var fundo = ctx.createLinearGradient(0, 0, 0, H);
    fundo.addColorStop(0, '#15275A');
    fundo.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(0, 0, W, 18);

    // marca
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 64px ' + FONTE;
    var jw = ctx.measureText('Jornada').width, bw = ctx.measureText(' Brasil').width, x0 = (W - jw - bw) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('Jornada', x0, 175);
    ctx.fillStyle = '#F97316'; ctx.fillText(' Brasil', x0 + jw, 175);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDBA74';
    caber(ctx, c.chamada, '700 40', 900);
    ctx.fillText(c.chamada, W / 2, 285);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 66px ' + FONTE;
    var linhas = quebrar(ctx, c.lead, 900);
    linhas.slice(0, 2).forEach(function (l, i) { ctx.fillText(l, W / 2, 470 + i * 84); });

    ctx.fillStyle = '#F97316';
    caber(ctx, c.numero, '700 400', 960);
    ctx.fillText(c.numero, W / 2, 960);

    ctx.fillStyle = '#FFFFFF';
    caber(ctx, c.unidade[0], '700 82', 960);
    ctx.fillText(c.unidade[0], W / 2, 1080);
    ctx.fillStyle = '#BFDBFE';
    ctx.font = '500 62px ' + FONTE;
    ctx.fillText(c.unidade[1], W / 2, 1160);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(150, 1225, W - 300, 3);

    ctx.fillStyle = '#FFFFFF';
    c.fatos.forEach(function (f, i) {
      caber(ctx, f, '500 46', 940);
      ctx.fillText(f, W / 2, 1315 + i * 70);
    });

    retangulo(ctx, 90, 1505, W - 180, 190, 36);
    ctx.fillStyle = '#F97316';
    ctx.fill();
    ctx.fillStyle = '#15275A';
    ctx.font = '700 52px ' + FONTE;
    ctx.fillText('Faça a sua conta', W / 2, 1585);
    // o endereço não usa a Inter: ela troca "6x1" por "6×1" e a pessoa digitaria errado
    ctx.font = '700 46px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('jornadabrasil.com.br/6x1', W / 2, 1652);

    ctx.fillStyle = '#93C5FD';
    caber(ctx, c.rodape, '400 30', 940);
    ctx.fillText(c.rodape, W / 2, 1765);

    if (share) share.hidden = false;
  }

  function comImagem(fn) {
    if (!canvas || !canvas.toBlob) { fn(null); return; }
    desenharCard();
    canvas.toBlob(function (blob) { fn(blob); }, 'image/png');
  }

  function avisar(msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { feedback.textContent = ''; }, 4000);
  }

  function baixar(blob) {
    if (!blob) { avisar('Seu navegador não conseguiu gerar a imagem.'); return; }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'minha-escala-jornada-brasil.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    avisar('Imagem baixada. Agora é só postar no status ou nos stories.');
  }

  function ligarBotoes() {
    var wa = document.getElementById('esc-wa');
    if (wa) wa.addEventListener('click', function () { track('escala_compartilhar', { metodo: 'whatsapp', caso: atual && atual.caso }); });

    var btnImg = document.getElementById('esc-img');
    if (btnImg) btnImg.addEventListener('click', function () {
      track('escala_compartilhar', { metodo: 'imagem', caso: atual && atual.caso });
      comImagem(function (blob) {
        if (!blob) { avisar('Seu navegador não conseguiu gerar a imagem.'); return; }
        var arquivo;
        try { arquivo = new File([blob], 'minha-escala-jornada-brasil.png', { type: 'image/png' }); } catch (e) { arquivo = null; }
        var dados = { files: arquivo ? [arquivo] : [], text: E.textoCompartilhar(atual, link('imagem')) };
        if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
          navigator.share(dados).catch(function () { /* a pessoa cancelou */ });
        } else {
          baixar(blob);
        }
      });
    });

    var btnBaixar = document.getElementById('esc-baixar');
    if (btnBaixar) btnBaixar.addEventListener('click', function () {
      track('escala_compartilhar', { metodo: 'download', caso: atual && atual.caso });
      comImagem(baixar);
    });

    var btnCopiar = document.getElementById('esc-copiar');
    if (btnCopiar) btnCopiar.addEventListener('click', function () {
      track('escala_compartilhar', { metodo: 'copiar', caso: atual && atual.caso });
      var texto = E.textoCompartilhar(atual, link('link'));
      var ok = function () { avisar('Texto e link copiados. Cole onde quiser.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(ok, function () { copiarAntigo(texto); ok(); });
      } else { copiarAntigo(texto); ok(); }
    });
  }

  function copiarAntigo(texto) {
    var t = document.createElement('textarea');
    t.value = texto;
    t.setAttribute('readonly', '');
    t.style.position = 'absolute';
    t.style.left = '-9999px';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); } catch (e) { /* sem cópia */ }
    t.remove();
  }

  /* ---------------- Barra fixa no celular ----------------
     Mostra o número enquanto o resultado ainda está abaixo da tela. */
  function ligarBarraMini() {
    var mini = document.getElementById('esc-mini');
    var painel = document.getElementById('esc-result-panel');
    if (!mini || !painel || !('IntersectionObserver' in window)) return;
    mini.hidden = false;
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        var abaixo = !en.isIntersecting && en.boundingClientRect.top > 0;
        mini.classList.toggle('fora', !abaixo);
      });
    }, { rootMargin: '0px 0px -120px 0px' }).observe(painel);
    mini.addEventListener('click', function () { track('escala_barra_mini', { caso: atual && atual.caso }); });
  }

  /* ---------------- Início ---------------- */
  preencherPelaUrl();
  ligarBarraMini();
  form.addEventListener('input', function () { atualizar(true); });
  form.addEventListener('change', function () { atualizar(true); });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); atualizar(true); });
  ligarBotoes();
  atualizar(false);
  if (document.fonts && document.fonts.load) {
    Promise.all(['700 100px Inter', '600 100px Inter', '500 100px Inter', '400 100px Inter'].map(function (f) { return document.fonts.load(f); }))
      .then(desenharCard, desenharCard);
  }
})();
