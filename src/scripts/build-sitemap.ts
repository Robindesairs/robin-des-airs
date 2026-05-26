/**
 * Génère sitemap.xml à la racine (accueil, pages principales, destinations, blog).
 * Usage: npm run build:sitemap
 * Netlify : exécuté avant build:blog dans la commande de build.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAllSlugs } from '../services/blogService';

const SITE_URL = 'https://robindesairs.eu';
const OUT_PATH = path.join(process.cwd(), 'sitemap.xml');
const INDEX_PATH = path.join(process.cwd(), 'sitemap-index.xml');
const BLOG_DIR = path.join(process.cwd(), 'blog');
const LASTMOD = new Date().toISOString().slice(0, 10);

/**
 * Liste des sub-sitemaps publiés à la racine. L'index doit être regénéré
 * à chaque build avec un lastmod frais, sinon Google ne re-crawle pas les
 * sub-sitemaps même s'ils changent (cause typique de pages non découvertes).
 */
const SUB_SITEMAPS = ['sitemap.xml', 'sitemap-en.xml', 'sitemap-de.xml', 'sitemap-es.xml'];

function writeSitemapIndex(): void {
  const items = SUB_SITEMAPS.map(
    (name) => `  <sitemap><loc>${SITE_URL}/${name}</loc><lastmod>${LASTMOD}</lastmod></sitemap>`
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
  fs.writeFileSync(INDEX_PATH, xml, 'utf-8');
  console.log(`[build:sitemap] ${INDEX_PATH} écrit (${SUB_SITEMAPS.length} sub-sitemaps, lastmod ${LASTMOD}).`);
}

/**
 * Liste tous les articles publiés dans /blog/ — qu'ils aient un .md source
 * (pipeline normal) ou qu'ils soient des HTML autonomes (legacy).
 */
function getAllBlogSlugs(): string[] {
  const mdSlugs = new Set(getAllSlugs());
  if (fs.existsSync(BLOG_DIR)) {
    for (const f of fs.readdirSync(BLOG_DIR)) {
      if (!f.endsWith('.html')) continue;
      if (f === 'index.html') continue;
      mdSlugs.add(f.replace(/\.html$/, ''));
    }
  }
  return Array.from(mdSlugs).sort();
}

function main(): void {
  const slugs = getAllBlogSlugs();
  const staticPages: Array<{ loc: string; changefreq: string; priority: string }> = [
    { loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_URL + '/depot-en-ligne.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/depot-express.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/dossier.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/suivi-dossier.html', changefreq: 'monthly', priority: '0.8' },
    { loc: SITE_URL + '/guide-whatsapp.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/choix-reclamation.html', changefreq: 'monthly', priority: '0.8' },
    { loc: SITE_URL + '/partenaires-agences.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/programme-agents-voyage.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/partenaires-agences-fcfa.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/cgv.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/politique-confidentialite.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/mandat-representation.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/droit-retractation.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/blog/', changefreq: 'weekly', priority: '0.9' },
    { loc: SITE_URL + '/nos-tarifs.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/parrainage.html', changefreq: 'monthly', priority: '0.6' },
    { loc: SITE_URL + '/destinations/dakar.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/destinations/abidjan.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/destinations/bamako.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/destinations/kinshasa.html', changefreq: 'monthly', priority: '0.7' },
  ];
  const blogUrls = slugs.map((slug) => ({
    loc: `${SITE_URL}/blog/${slug}.html`,
    changefreq: 'monthly' as const,
    priority: '0.8',
  }));
  const urls = [...staticPages, ...blogUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(OUT_PATH, xml, 'utf-8');
  console.log(`[build:sitemap] ${OUT_PATH} écrit (${urls.length} URLs).`);
  writeSitemapIndex();
}

main();
