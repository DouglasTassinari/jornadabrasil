/* Jornada Brasil — vídeos do canal no YouTube, carregados só no clique.
   Antes do clique a página mostra apenas uma imagem local: nenhum script, cookie ou
   requisição do YouTube acontece. Depois do clique, o player vem de youtube-nocookie.com.
   Sem JavaScript, o link "Assistir no YouTube" ao lado do vídeo continua funcionando. */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var botao = e.target.closest ? e.target.closest('.video-jb__play') : null;
    if (!botao) return;
    var caixa = botao.parentNode;
    var id = caixa.getAttribute('data-yt');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
    var quadro = document.createElement('iframe');
    quadro.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    quadro.title = botao.getAttribute('aria-label') || 'Vídeo do canal Jornada Brasil';
    quadro.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    quadro.setAttribute('allowfullscreen', '');
    quadro.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    quadro.style.cssText = 'width:100%;aspect-ratio:9/16;border:0;border-radius:10px;display:block;background:#000';
    caixa.replaceChild(quadro, botao);
  });
})();
