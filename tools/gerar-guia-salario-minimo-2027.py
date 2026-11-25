#!/usr/bin/env python
"""Gera o guia "Salário mínimo 2027" assim que o decreto oficial sair.

Uso (na pasta portal/):
    python tools/gerar-guia-salario-minimo-2027.py --valor 1741 --decreto "Decreto nº 99.999, de 30/12/2026" --data 2026-12-30
    python tools/gerar-guia-salario-minimo-2027.py --valor 1741 --decreto "..." --data 2026-12-30 --inpc 4.93   (opcional)
    ... --saida PASTA   (só para testar: grava lá, fora do site)

O que faz: cria agendados/salario-minimo-2027/{index.html,meta.json} e a capa em assets/img/blog/.
Depois, rode `node tools/publicar-agendados.cjs` (publica na data) e confira o roteiro em
PREPARAR-SALARIO-MINIMO-2027.md (na raiz do projeto, fora do site).

NUNCA rode com valor "previsto": use só o valor do decreto publicado no Diário Oficial.
Todos os números do guia saem do valor informado; nada é digitado à mão.
"""
import argparse, html, json, math, os, re, sys, textwrap

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MIN_2026 = 1621.00
PL = "https://www.planalto.gov.br/ccivil_03/"

def r2(x):  # arredondamento do motor do site (meio para cima)
    return math.floor(x * 100 + 0.5 + 1e-9) / 100

def brl(n):
    return "R$ " + f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def pct(n):
    return f"{n:.2f}".replace(".", ",") + "%"

def tabela(cab, linhas):
    h = '<div style="overflow-x: auto"><table class="data-table">\n<thead><tr>' + "".join(f"<th>{c}</th>" for c in cab) + "</tr></thead>\n<tbody>\n"
    for l in linhas:
        h += "<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>\n"
    return h + "</tbody></table></div>"

def capa(slug, tag, titulo, destaque, legenda):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), (30, 58, 138)); d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=(int(30 - 12 * t), int(58 - 20 * t), int(138 - 40 * t)))
    d.rectangle([0, 0, 12, H], fill=(249, 115, 22))
    fb = lambda s: ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", s); fr = lambda s: ImageFont.truetype("C:/Windows/Fonts/arial.ttf", s)
    d.rounded_rectangle([70, 60, 70 + d.textlength(tag, font=fb(26)) + 40, 108], radius=24, fill=(249, 115, 22)); d.text((90, 68), tag, font=fb(26), fill=(255, 255, 255))
    y = 150
    for linha in textwrap.wrap(titulo, 26):
        d.text((70, y), linha, font=fb(54), fill=(255, 255, 255)); y += 70
    d.text((70, y + 20), legenda, font=fr(30), fill=(147, 197, 253))
    f = fb(92); w = d.textlength(destaque, font=f)
    d.rounded_rectangle([W - w - 130, 360, W - 50, 550], radius=26, fill=(255, 255, 255))
    d.text((W - w - 90, 380), destaque, font=f, fill=(30, 58, 138)); d.text((W - w - 90, 508), "jornadabrasil.com.br", font=fr(26), fill=(100, 116, 139))
    d.text((70, 570), "Jornada Brasil", font=fb(30), fill=(255, 255, 255))
    return img

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--valor", type=float, required=True, help="salário mínimo de 2027 do decreto, ex.: 1741")
    ap.add_argument("--decreto", required=True, help='identificação do decreto, ex.: "Decreto nº 99.999, de 30/12/2026"')
    ap.add_argument("--data", required=True, help="data de publicação AAAA-MM-DD")
    ap.add_argument("--inpc", type=float, help="INPC acumulado em 12 meses até novembro (%%), se divulgado")
    ap.add_argument("--saida", help="pasta de teste (não grava no site)")
    a = ap.parse_args()
    V = a.valor
    if not (MIN_2026 < V < 2100): sys.exit("valor fora do intervalo plausível (1.621 a 2.100): confira o decreto")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", a.data): sys.exit("--data deve ser AAAA-MM-DD")
    ano, mes, dia = a.data.split("-"); data_ext = f"{int(dia)} de {['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][int(mes)-1]} de {ano}"
    slug = "salario-minimo-2027"
    aum = r2(V - MIN_2026); pc = (V / MIN_2026 - 1) * 100
    inss26, inss27 = r2(MIN_2026 * 0.075), r2(V * 0.075)
    linhas = [
        ["Salário mínimo mensal", brl(MIN_2026), f"<strong>{brl(V)}</strong>", "+ " + brl(aum)],
        ["FGTS depositado pela empresa (8%)", brl(r2(MIN_2026 * 0.08)), brl(r2(V * 0.08)), "+ " + brl(r2(V * 0.08) - r2(MIN_2026 * 0.08))],
        ["INSS descontado do empregado (7,5%)", brl(inss26), brl(inss27), "+ " + brl(r2(inss27 - inss26))],
        ["Salário líquido (sem imposto de renda)", brl(r2(MIN_2026 - inss26)), brl(r2(V - inss27)), "+ " + brl(r2((V - inss27) - (MIN_2026 - inss26)))],
        ["DAS do MEI de serviços (5% + R$ 5 de ISS)", brl(r2(MIN_2026 * 0.05 + 5)), brl(r2(V * 0.05 + 5)), "+ " + brl(r2(V * 0.05 + 5) - r2(MIN_2026 * 0.05 + 5))],
        ["INSS do autônomo, plano simplificado (11%)", brl(r2(MIN_2026 * 0.11)), brl(r2(V * 0.11)), "+ " + brl(r2(V * 0.11) - r2(MIN_2026 * 0.11))],
        ["INSS do autônomo, plano normal (20%)", brl(r2(MIN_2026 * 0.20)), brl(r2(V * 0.20)), "+ " + brl(r2(V * 0.20) - r2(MIN_2026 * 0.20))],
    ]
    inpc_txt = (f" A inflação medida pelo INPC nos 12 meses até novembro foi de {pct(a.inpc)}." if a.inpc is not None else "")
    titulo = f"Salário mínimo 2027: {brl(V)}, reajuste de {pct(pc)} e o que muda no seu bolso"
    desc = f"O salário mínimo de 2027 será de {brl(V)} ({pct(pc)} acima dos R$ 1.621 de 2026). Veja como o valor foi definido, desde quando vale e quanto muda no FGTS, no INSS e no MEI."
    resumo = (f"pelo {html.escape(a.decreto)}, o salário mínimo de 2027 é de <strong>{brl(V)}</strong>, um reajuste de <strong>{pct(pc)}</strong> (mais {brl(aum)} por mês) sobre os R$ 1.621,00 de 2026. "
              f"O novo valor vale a partir de <strong>1º de janeiro de 2027</strong>. Até lá, continuam valendo os R$ 1.621,00 e as tabelas de 2026.{inpc_txt}")
    corpo = f'''          <h2>Como o valor foi definido</h2>
          <p>Desde 2024, o reajuste segue a política de valorização do salário mínimo (Lei 14.663/2023): soma-se a <strong>variação do INPC nos 12 meses até novembro</strong> ao <strong>crescimento real do PIB de dois anos antes</strong>. Se o PIB daquele ano tiver sido negativo, o reajuste leva em conta só a inflação. O valor é fixado por decreto, que sai depois da divulgação do INPC de novembro.{inpc_txt}</p>
          <p>O decreto desta vez é o <strong>{html.escape(a.decreto)}</strong>. O mínimo vale para quem tem carteira assinada sem piso maior, e é a base de benefícios do INSS e do BPC, que não podem pagar menos que ele (Constituição, art. 201, § 2º).</p>

          <h2>O que muda com o novo mínimo</h2>
          <p>Comparação entre 2026 e 2027, para quem recebe exatamente um salário mínimo:</p>
{tabela(["Item", "2026", "A partir de 1º/1/2027", "Diferença"], linhas)}
          <p>Os valores de 2027 são cálculos do Jornada Brasil sobre o novo mínimo, com as alíquotas em vigor. O ISS de R$ 5,00 do MEI é fixo e não acompanha o mínimo.</p>

          <h2>O que não muda automaticamente</h2>
          <ul>
            <li><strong>Teto do INSS e as faixas de desconto:</strong> a primeira faixa acompanha o mínimo, mas o teto e as demais faixas são atualizados em portaria, que costuma sair em janeiro. Até lá, a calculadora de <a href="/salario-liquido/">salário líquido</a> segue com as tabelas de 2026.</li>
            <li><strong>Imposto de renda:</strong> a isenção até R$ 5.000 por mês vem da Lei 15.270/2025 e não depende do salário mínimo.</li>
            <li><strong>Pisos de categoria:</strong> pisos estaduais e de convenção coletiva têm regras próprias e podem ser maiores que o mínimo nacional.</li>
          </ul>

          <h2>Quando o novo valor passa a valer</h2>
          <p>A partir de <strong>1º de janeiro de 2027</strong>. Quem recebe um mínimo por mês vê a diferença no salário de janeiro, pago em fevereiro conforme a data do contrato (veja o <a href="/quinto-dia-util/">quinto dia útil</a>). Os benefícios do INSS no valor de um salário mínimo seguem o calendário do INSS.'''
    faq = [("Qual é o salário mínimo de 2027?", f"Pelo {a.decreto}, o salário mínimo de 2027 é de {brl(V)}, um reajuste de {pct(pc)} sobre os R$ 1.621,00 de 2026, a partir de 1º de janeiro de 2027."),
           ("Como é calculado o reajuste do salário mínimo?", "Soma a variação do INPC dos 12 meses até novembro ao crescimento real do PIB de dois anos antes (Lei 14.663/2023). Com PIB negativo, vale só a inflação."),
           ("Desde quando vale o novo salário mínimo?", "A partir de 1º de janeiro de 2027. Até lá, continuam valendo R$ 1.621,00 e as tabelas de 2026."),
           ("O novo mínimo muda o desconto do INSS?", "A primeira faixa do INSS acompanha o mínimo. O teto e as outras faixas são atualizados em portaria própria, que costuma sair em janeiro.")]
    artigo = dict(slug=slug, curto="Salário mínimo 2027", tag="Salário", min=4, title=f"Salário mínimo 2027: {brl(V)}, reajuste de {pct(pc)} e o que muda", h1=titulo, desc=desc,
                  card=f"O salário mínimo de 2027 será de {brl(V)}, reajuste de {pct(pc)}. Como o valor foi definido, desde quando vale e quanto muda no FGTS, no INSS e no MEI.",
                  alt=f"Capa do artigo sobre o salário mínimo de 2027, de {brl(V)}", capa_titulo="Salário mínimo 2027", capa_destaque=brl(V).replace(",00", ""), capa_legenda=f"reajuste de {pct(pc)} sobre R$ 1.621",
                  origem="Os valores da tabela foram calculados pelo Jornada Brasil a partir do valor do decreto. ", mapa={"secao": "Guias: salário, holerite e impostos", "texto": f"Salário mínimo 2027: {brl(V)}"},
                  resumo=resumo, corpo=corpo, faq=faq,
                  rel=[("/salario-liquido/", "Salário líquido"), ("/seguro-desemprego/", "Seguro-desemprego"), ("/pj-vs-clt/", "PJ vs CLT")],
                  side_calc=[("/salario-liquido/", "Salário Líquido"), ("/rescisao/", "Rescisão"), ("/seguro-desemprego/", "Seguro-Desemprego")],
                  side_art=[("/blog/salario-minimo-2026/", "Salário mínimo 2026"), ("/blog/inss-tabela-2026/", "INSS progressivo em 2026"), ("/blog/fgts-salario-minimo-2026/", "FGTS do salário mínimo")],
                  fontes=[(PL + "_ato2023-2026/2023/Lei/L14663.htm", "Lei nº 14.663/2023 — política de valorização do salário mínimo"), (PL + "constituicao/constituicao.htm", "Constituição Federal — art. 7º, IV, e art. 201, § 2º"),
                          (PL + "leis/lcp/lcp123.htm", "Lei Complementar nº 123/2006 — MEI e Simples Nacional"), ("https://www.gov.br/trabalho-e-emprego/pt-br", "Ministério do Trabalho e Emprego"),
                          ("/tabelas/", "Tabelas do Jornada Brasil")])
    # montagem a partir do modelo de artigo
    modelo = open(os.path.join(RAIZ, "blog", "pedido-de-demissao", "index.html"), encoding="utf-8").read()
    E = lambda s: html.escape(s, quote=True)
    url = f"https://jornadabrasil.com.br/blog/{slug}/"; og = f"https://jornadabrasil.com.br/assets/img/blog/{slug}.jpg"
    h = modelo; i = h.index('<script type="application/ld+json">'); j = h.index("</script>", i) + len("</script>")
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": artigo["h1"], "image": [og], "description": desc, "datePublished": a.data, "dateModified": a.data,
         "author": {"@type": "Person", "name": "Douglas Tassinari", "url": "https://jornadabrasil.com.br/autor/douglas-tassinari/"},
         "publisher": {"@type": "Organization", "name": "Jornada Brasil", "url": "https://jornadabrasil.com.br"}, "url": url, "inLanguage": "pt-BR"},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Início", "item": "https://jornadabrasil.com.br/"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://jornadabrasil.com.br/blog/"}, {"@type": "ListItem", "position": 3, "name": artigo["curto"], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in faq]}]}
    h = h[:i] + '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2) + "\n  </script>" + h[j:]
    for pat, new in [(r"<title>.*?</title>", f"<title>{E(artigo['title'])} | Jornada Brasil</title>"), (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">'),
                     (r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">'), (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{E(titulo)}">'),
                     (r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{og}">'), (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{E(desc)}">'),
                     (r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">'), (r'<meta property="article:published_time" content="[^"]*">', f'<meta property="article:published_time" content="{a.data}">'),
                     (r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{E(titulo)}">'), (r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{E(desc)}">'),
                     (r'<meta name="twitter:image" content="[^"]*">', f'<meta name="twitter:image" content="{og}">')]:
        h, n = re.subn(pat, lambda m: new, h, count=1, flags=re.S); assert n == 1, pat
    faq_html = "".join(f'<details class="faq-item">\n<summary>{E(q)}</summary>\n<div class="faq-answer"><p>{r}</p></div>\n</details>\n' for q, r in faq)
    rel = "".join(f'<a href="{x}" class="related-card">{y}</a>' for x, y in artigo["rel"]); sc = "".join(f'<li><a href="{x}">{y}</a></li>' for x, y in artigo["side_calc"]); sa = "".join(f'<li><a href="{x}">{y}</a></li>' for x, y in artigo["side_art"])
    fontes = "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{l}</a></li>\n' if u.startswith("http") else f'<li><a href="{u}">{l}</a></li>\n' for u, l in artigo["fontes"])
    main = f'''<main id="main-content">
    <div class="container" style="padding-top: 24px; padding-bottom: 48px">
      <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span class="breadcrumb-sep" aria-hidden="true">›</span><a href="/blog/">Blog</a><span class="breadcrumb-sep" aria-hidden="true">›</span><span aria-current="page">{E(artigo["curto"])}</span></nav>
      <div class="article-layout">
        <article class="article-content" style="min-width: 0">
          <header style="margin-bottom: 24px">
            <span class="blog-card-tag">{artigo["tag"]}</span>
            <h1 style="margin-top: 8px">{E(titulo)}</h1>
            <p class="article-byline" style="color: var(--text-2); font-size: .9rem; margin-top: 8px">Por <a href="/autor/douglas-tassinari/" rel="author">Douglas Tassinari</a> · Publicado em <time datetime="{a.data}">{data_ext}</time> · Leitura: 4 min</p>
          </header>
          <figure class="article-cover"><img src="/assets/img/blog/{slug}.webp" alt="{E(artigo["alt"])}" width="1200" height="630" decoding="async" fetchpriority="high"></figure>
          <p><strong>Resumo:</strong> {resumo}</p>

{corpo}

          <section class="faq-section" style="margin:32px 0">
            <h2>Perguntas frequentes</h2>
{faq_html}          </section>
          <div class="disclaimer-box">As informações deste artigo têm <strong>caráter educativo e informativo</strong> e não substituem orientação jurídica, contábil ou trabalhista profissional. Para casos específicos, consulte sempre um especialista.</div>
          <div class="related-calcs"><h2>Ferramentas relacionadas</h2><div class="related-calcs-grid">{rel}</div></div>
        <footer class="article-trust" aria-label="Autoria e fontes">
          <p class="article-trust__meta"><strong>Quem escreve:</strong> <a href="/autor/douglas-tassinari/" rel="author">Douglas Tassinari</a>, criador do Jornada Brasil. O texto é escrito com apoio de inteligência artificial e conferido com as fontes oficiais listadas abaixo. {artigo["origem"]}Veja a <a href="/politica-editorial/">política editorial</a> e a <a href="/metodologia/">metodologia</a>. Encontrou um erro? Avise pelo <a href="/contato/">formulário de contato</a>.</p>
          <div class="article-trust__sources">
            <h2 id="article-sources-heading">Fontes desta página</h2>
            <ul>
{fontes}            </ul>
          </div>
        </footer>
        </article>
        <aside class="sidebar" aria-label="Conteúdo relacionado">
          <div class="calc-panel" style="padding: 16px"><h3 style="font-size: .95rem; margin-bottom: 12px">Calculadoras relacionadas</h3><ul class="footer-list">{sc}</ul></div>
          <div class="calc-panel" style="padding: 16px"><h3 style="font-size: .95rem; margin-bottom: 12px">Artigos relacionados</h3><ul class="footer-list">{sa}</ul></div>
        </aside>
      </div>
    </div>
  </main>'''
    s = h.index('<main id="main-content">'); e = h.index("</main>") + len("</main>"); h = h[:s] + main + h[e:]
    pasta = os.path.join(a.saida if a.saida else os.path.join(RAIZ, "agendados"), slug); os.makedirs(pasta, exist_ok=True)
    open(os.path.join(pasta, "index.html"), "w", encoding="utf-8", newline="").write(h)
    json.dump({"slug": slug, "publicar_em": a.data, "card": {"tag": artigo["tag"], "titulo": titulo, "resumo": artigo["card"]}, "mapa": artigo["mapa"]}, open(os.path.join(pasta, "meta.json"), "w", encoding="utf-8", newline=""), ensure_ascii=False, indent=2)
    img = capa(slug, artigo["tag"], artigo["capa_titulo"], artigo["capa_destaque"], artigo["capa_legenda"])
    pimg = a.saida if a.saida else os.path.join(RAIZ, "assets", "img", "blog")
    img.save(os.path.join(pimg, slug + ".jpg"), quality=88); img.save(os.path.join(pimg, slug + ".webp"), quality=84)
    print("gerado em", pasta, "| valor", brl(V), "| reajuste", pct(pc))

if __name__ == "__main__":
    main()
