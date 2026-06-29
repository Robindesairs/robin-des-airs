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
// Alias FR sous le motif `sitemap-XX.xml` : GSC bloque parfois le `sitemap.xml` « par défaut »
// dans un état « Impossible de récupérer » coincé ; un nom de langue se soumet proprement.
const FR_PATH = path.join(process.cwd(), 'sitemap-fr.xml');
const INDEX_PATH = path.join(process.cwd(), 'sitemap-index.xml');
const BLOG_DIR = path.join(process.cwd(), 'blog');
const DEST_DIR = path.join(process.cwd(), 'destinations');
const LASTMOD = new Date().toISOString().slice(0, 10);

/**
 * Liste des sub-sitemaps publiés à la racine. L'index doit être regénéré
 * à chaque build avec un lastmod frais, sinon Google ne re-crawle pas les
 * sub-sitemaps même s'ils changent (cause typique de pages non découvertes).
 */
const SUB_SITEMAPS = ['sitemap.xml', 'sitemap-fr.xml', 'sitemap-en.xml', 'sitemap-de.xml', 'sitemap-es.xml'];

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
// Doublons d'URL redirigés en 301 vers leur version canonique (cf. _redirects) :
// on les EXCLUT du sitemap pour ne pas demander à Google d'indexer une URL qui redirige.
const REDIRECTED_SLUGS = new Set<string>([
  'air-cote-d-ivoire-vol-retarde-indemnite',
  'air-cote-divoire-vol-retarde-indemnite',
  'arret-folkerts-correspondance-cjue',
  'correspondance-ratee-a-qui-reclamer-ce261-folkerts',
  'arret-wallentin-hermann-panne-technique-cjue',
  'reforme-ce261-2026-ce-qui-change-droits-passagers',
  'reforme-reglement-ce261-2026-droits-passagers-afrique',
  'lettre-mise-en-demeure-compagnie-aerienne-modele',
  'preuve-retard-vol-documents-conserver',
  'antananarivo-madagascar-paris-indemnite',
]);

// Pages-villes à faible ROI diaspora passées en noindex (X-Robots-Tag via _headers) :
// sorties du sitemap pour concentrer le budget de crawl sur les routes fortes.
const NOINDEX_SLUGS = new Set<string>([
  'vol-retarde-addis-abeba-paris-indemnite', 'vol-retarde-alger-paris-indemnite',
  'vol-retarde-amsterdam-accra-indemnite', 'vol-retarde-amsterdam-lagos-indemnite',
  'vol-retarde-amsterdam-nairobi-indemnite', 'vol-retarde-bujumbura-paris-indemnite',
  'vol-retarde-cap-vert-paris-indemnite', 'vol-retarde-casablanca-paris-indemnite',
  'vol-retarde-dar-es-salaam-paris-indemnite', 'vol-retarde-djibouti-paris-indemnite',
  'vol-retarde-frankfurt-abidjan-indemnite', 'vol-retarde-freetown-paris-indemnite',
  'vol-retarde-ile-maurice-paris-indemnite', 'vol-retarde-johannesburg-paris-indemnite',
  'vol-retarde-kampala-paris-indemnite', 'vol-retarde-lisbonne-dakar-indemnite',
  'vol-retarde-luanda-paris-indemnite', 'vol-retarde-madrid-dakar-indemnite',
  'vol-retarde-maputo-paris-indemnite', 'vol-retarde-milan-lagos-indemnite',
  'vol-retarde-montreal-paris-indemnite', 'vol-retarde-new-york-paris-indemnite',
  'vol-retarde-rome-nairobi-indemnite', 'vol-retarde-stockholm-accra-indemnite',
  'vol-retarde-tunis-paris-indemnite',
]);

function getAllBlogSlugs(): string[] {
  const mdSlugs = new Set(getAllSlugs());
  if (fs.existsSync(BLOG_DIR)) {
    for (const f of fs.readdirSync(BLOG_DIR)) {
      if (!f.endsWith('.html')) continue;
      if (f === 'index.html') continue;
      mdSlugs.add(f.replace(/\.html$/, ''));
    }
  }
  for (const s of REDIRECTED_SLUGS) mdSlugs.delete(s);
  for (const s of NOINDEX_SLUGS) mdSlugs.delete(s);
  return Array.from(mdSlugs).sort();
}

/** Auto-découverte des pages /destinations/*.html (évite d'oublier des destinations). */
function getDestinationPages(): Array<{ loc: string; changefreq: string; priority: string }> {
  if (!fs.existsSync(DEST_DIR)) return [];
  return fs
    .readdirSync(DEST_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((f) => ({ loc: `${SITE_URL}/destinations/${f}`, changefreq: 'monthly', priority: '0.7' }));
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
    { loc: SITE_URL + '/a-propos.html', changefreq: 'monthly', priority: '0.6' },
    { loc: SITE_URL + '/jurisprudence-ce261.html', changefreq: 'monthly', priority: '0.7' },
  ];
  // Destinations : auto-découvertes (toutes les /destinations/*.html, plus de liste en dur)
  const destPages = getDestinationPages();
  const blogUrls = slugs.map((slug) => ({
    loc: `${SITE_URL}/blog/${slug}.html`,
    changefreq: 'monthly' as const,
    priority: '0.8',
  }));
  const urls = [...staticPages, ...destPages, ...blogUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(OUT_PATH, xml, 'utf-8');
  fs.writeFileSync(FR_PATH, xml, 'utf-8'); // alias FR identique (contourne le blocage GSC sur sitemap.xml)
  console.log(`[build:sitemap] ${OUT_PATH} + sitemap-fr.xml écrits (${urls.length} URLs).`);
  writeSitemapIndex();
}

main();
