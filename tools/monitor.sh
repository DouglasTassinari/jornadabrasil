#!/usr/bin/env bash
# Monitor do Jornada Brasil: confere se o site inteiro está no ar.
#
# Lê o sitemap.xml publicado (todas as ferramentas e artigos) e soma as páginas e os
# arquivos importantes que ficam fora dele. Uma página só "passa" quando responde 200,
# chega inteira (tem </html>) e tem um <title> preenchido.
# Se qualquer item falhar, o script termina com erro: o GitHub marca a execução como
# falha e manda o e-mail de aviso.
#
# Para rodar no computador: bash tools/monitor.sh
set -uo pipefail

BASE="${BASE:-https://jornadabrasil.com.br}"
MIN_URLS="${MIN_URLS:-50}"   # o sitemap tem 65 endereços; menos de 50 indica sitemap quebrado
SAIDA="${GITHUB_OUTPUT:-/dev/null}"
RESUMO="${GITHUB_STEP_SUMMARY:-/dev/null}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Páginas que importam mas não estão no sitemap (dados salvos no aparelho e página de erro)
PAGINAS_EXTRAS=(/salvos/ /favoritos/ /historico/ /meus-orcamentos/ /404.html)

# Arquivos principais de CSS e JS (o texto à direita precisa aparecer no arquivo, se houver)
ARQUIVOS=(
  "/assets/css/style.css"
  "/shared/jb-extras.css"
  "/assets/js/engine.js|RCEngine"
  "/assets/js/decision-tools.js|dismissalGuide"
  "/assets/js/app.js"
  "/assets/js/nav.js"
  "/assets/js/consent.js"
  "/assets/js/contact-widget.js"
  "/assets/js/pwa.js"
  "/assets/js/jb-retention.js"
  "/shared/jb-data.js|JBData"
  "/shared/jb-extras.js"
  "/service-worker.js"
  "/manifest.json"
  "/robots.txt|Sitemap:"
  "/sitemap.xml|</urlset>"
)

OK=0
TOTAL=0
FALHAS=""

# baixa um endereço e devolve o código HTTP (000 = sem resposta)
baixar() {
  local codigo
  codigo=$(curl -sS --max-time 20 --retry 2 --retry-delay 5 --retry-all-errors \
    -A "JornadaBrasil-Monitor/1.0" -o "$2" -w '%{http_code}' "$1" 2>/dev/null)
  echo "${codigo:-000}"
}

falhou() {
  echo "✗ $1 — $2"
  FALHAS+="❌ $1 → $2"$'\n'"   $BASE$1"$'\n'
}

checar_pagina() {
  local caminho="$1" arquivo="$TMP/pagina" codigo titulo
  TOTAL=$((TOTAL + 1))
  codigo=$(baixar "$BASE$caminho" "$arquivo")
  if [ "$codigo" != "200" ]; then falhou "$caminho" "HTTP $codigo"; return; fi
  if ! grep -qi '</html>' "$arquivo"; then falhou "$caminho" "página incompleta (sem </html>)"; return; fi
  titulo=$(tr '\r\n' '  ' < "$arquivo" | grep -oiE '<title[^>]*>[^<]*</title>' | head -n 1 \
    | sed -E 's/<[^>]*>//g; s/^[[:space:]]+//; s/[[:space:]]+$//')
  if [ -z "$titulo" ]; then falhou "$caminho" "sem <title> ou título vazio"; return; fi
  OK=$((OK + 1))
  echo "✓ $caminho — $titulo"
}

checar_arquivo() {
  local caminho="${1%%|*}" esperado="" arquivo="$TMP/arquivo" codigo
  [[ "$1" == *"|"* ]] && esperado="${1#*|}"
  TOTAL=$((TOTAL + 1))
  codigo=$(baixar "$BASE$caminho" "$arquivo")
  if [ "$codigo" != "200" ]; then falhou "$caminho" "HTTP $codigo"; return; fi
  if [ ! -s "$arquivo" ]; then falhou "$caminho" "arquivo vazio"; return; fi
  if [ -n "$esperado" ] && ! grep -qF "$esperado" "$arquivo"; then
    falhou "$caminho" "conteúdo inesperado (falta \"$esperado\")"; return
  fi
  OK=$((OK + 1))
  echo "✓ $caminho"
}

echo "=== SITEMAP ==="
codigo=$(baixar "$BASE/sitemap.xml" "$TMP/sitemap.xml")
PAGINAS=()
if [ "$codigo" = "200" ]; then
  # pega cada <loc> e guarda só o caminho, para conferir sempre no mesmo domínio
  mapfile -t PAGINAS < <(grep -oE '<loc>[^<]+</loc>' "$TMP/sitemap.xml" \
    | sed -E 's#</?loc>##g; s#^https?://[^/]+##; s#^$#/#')
  echo "${#PAGINAS[@]} endereços no sitemap"
else
  echo "sitemap.xml respondeu HTTP $codigo"
fi
if [ "${#PAGINAS[@]}" -lt "$MIN_URLS" ]; then
  TOTAL=$((TOTAL + 1))
  falhou "/sitemap.xml" "só ${#PAGINAS[@]} endereços (esperado pelo menos $MIN_URLS)"
fi

echo ""
echo "=== PÁGINAS ==="
mapfile -t TODAS < <(printf '%s\n' "${PAGINAS[@]}" "${PAGINAS_EXTRAS[@]}" | sed '/^$/d' | sort -u)
for caminho in "${TODAS[@]}"; do checar_pagina "$caminho"; done

echo ""
echo "=== ARQUIVOS ==="
for item in "${ARQUIVOS[@]}"; do checar_arquivo "$item"; done

echo ""
echo "Resultado: $OK de $TOTAL itens ok"

{
  echo "## Monitor do Jornada Brasil"
  echo ""
  echo "**$OK de $TOTAL itens ok** (${#PAGINAS[@]} páginas do sitemap + ${#PAGINAS_EXTRAS[@]} páginas extras + ${#ARQUIVOS[@]} arquivos)"
  if [ -n "$FALHAS" ]; then
    echo ""
    echo '```'
    printf '%s' "$FALHAS"
    echo '```'
  fi
} >> "$RESUMO"

if [ -n "$FALHAS" ]; then
  {
    echo "failed=true"
    echo "summary=$OK de $TOTAL itens passaram"
    echo "details<<FIM_DETALHES"
    printf '%s' "$FALHAS"
    echo "FIM_DETALHES"
  } >> "$SAIDA"
  exit 1
fi

{
  echo "failed=false"
  echo "summary=Todos os $TOTAL itens passaram"
} >> "$SAIDA"
