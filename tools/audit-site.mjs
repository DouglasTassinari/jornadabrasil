import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'agendados') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function one(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function stripHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function routeFor(file) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
}

function fileForRoute(route) {
  let clean = route.split('#')[0].split('?')[0];
  try { clean = decodeURIComponent(clean); } catch {}
  if (!clean.startsWith('/') || clean.startsWith('//')) return null;
  clean = clean.replace(/^\/+/, '');
  if (!clean || clean.endsWith('/')) clean += 'index.html';
  return path.join(root, clean.replaceAll('/', path.sep));
}

const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
const pages = [];
const errors = [];
const warnings = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const title = one(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = one(html, /<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || one(html, /<meta\s+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const canonical = one(html, /<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)
    || one(html, /<link\s+href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const robots = one(html, /<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i).toLowerCase();
  const indexable = !robots.includes('noindex');
  const contentHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const h1Count = (contentHtml.match(/<h1\b/gi) || []).length;
  const wordCount = stripHtml(contentHtml).split(/\s+/).filter(Boolean).length;
  const hasStaticAds = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html);
  const hasAdsenseMeta = /name=["']google-adsense-account["']/i.test(html);
  const isBlogArticle = /^\/blog\/[^/]+\/$/.test(route);
  const hasArticleTrust = /class=["'][^"']*\barticle-trust\b[^"']*["']/i.test(html)
    && /data-article-sources/i.test(html)
    && /article-trust\.js/i.test(html);

  if (!title) errors.push(`${route}: title ausente`);
  if (indexable && !description) errors.push(`${route}: description ausente`);
  if (indexable && !canonical) errors.push(`${route}: canonical ausente`);
  if (indexable && h1Count !== 1) errors.push(`${route}: ${h1Count} elementos h1`);
  if (indexable && wordCount < 250) warnings.push(`${route}: conteúdo curto (${wordCount} palavras)`);
  if (indexable && !hasAdsenseMeta) warnings.push(`${route}: meta de verificação AdSense ausente`);
  if (hasStaticAds) warnings.push(`${route}: script AdSense estático carrega antes do consentimento`);
  if (/em breve|coming soon|category-placeholder/i.test(stripHtml(html))) warnings.push(`${route}: texto de placeholder ou 'em breve'`);

  if (isBlogArticle && !hasArticleTrust) errors.push(route + ': bloco de fontes e revisão editorial ausente');

  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(block[1]); }
    catch (error) { errors.push(`${route}: JSON-LD inválido (${error.message})`); }
  }

  for (const match of html.matchAll(/\shref=["']([^"']+)["']/gi)) {
    const href = match[1].trim();
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const target = fileForRoute(href);
    if (target && !fs.existsSync(target)) warnings.push(`${route}: link interno sem arquivo ${href}`);
  }

  pages.push({ route, title, description, canonical, robots, indexable, wordCount });
}

function duplicates(field) {
  const groups = new Map();
  for (const page of pages.filter((item) => item.indexable && item[field])) {
    const value = page[field];
    groups.set(value, [...(groups.get(value) || []), page.route]);
  }
  return [...groups.entries()].filter(([, routes]) => routes.length > 1);
}

for (const field of ['title', 'description', 'canonical']) {
  for (const [value, routes] of duplicates(field)) {
    errors.push(`${field} duplicado em ${routes.join(', ')}: ${value}`);
  }
}

const sitemapPath = path.join(root, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapRoutes = new Set([...sitemap.matchAll(/<loc>https:\/\/jornadabrasil\.com\.br([^<]*)<\/loc>/g)].map((m) => m[1] || '/'));
  for (const page of pages.filter((item) => item.indexable && item.canonical.startsWith('https://jornadabrasil.com.br'))) {
    const canonicalRoute = page.canonical.replace('https://jornadabrasil.com.br', '') || '/';
    if (!sitemapRoutes.has(canonicalRoute)) warnings.push(`${page.route}: indexável fora do sitemap (${canonicalRoute})`);
  }
  for (const route of sitemapRoutes) {
    const page = pages.find((item) => item.route === route);
    if (!page) warnings.push(`sitemap: URL sem página local ${route}`);
    else if (!page.indexable) errors.push(`sitemap: URL noindex incluída ${route}`);
  }
}

const uniqueWarnings = [...new Set(warnings)];
console.log(`Páginas HTML: ${pages.length}`);
console.log(`Indexáveis: ${pages.filter((page) => page.indexable).length}`);
console.log(`Erros: ${errors.length}`);
for (const item of errors) console.log(`ERRO ${item}`);
console.log(`Avisos: ${uniqueWarnings.length}`);
for (const item of uniqueWarnings) console.log(`AVISO ${item}`);

process.exitCode = errors.length ? 1 : 0;
