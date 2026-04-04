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
const LASTMOD = '2026-03-08';

function main(): void {
  const slugs = getAllSlugs();
  const staticPages: Array<{ loc: string; changefreq: string; priority: string }> = [
    { loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_URL + '/depot-en-ligne.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/depot-simple.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/dossier.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/suivi-dossier.html', changefreq: 'monthly', priority: '0.8' },
    { loc: SITE_URL + '/guide-whatsapp.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/choix-reclamation.html', changefreq: 'monthly', priority: '0.8' },
    { loc: SITE_URL + '/partenaires-agences.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/partenaires-agences-fcfa.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/cgv.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/politique-confidentialite.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/mandat-representation.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/droit-retractation.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/blog/index.html', changefreq: 'weekly', priority: '0.9' },
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
}

main();
