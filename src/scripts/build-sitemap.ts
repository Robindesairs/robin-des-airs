/**
 * Génère public/sitemap.xml (accueil + 20 articles blog).
 * Usage: npm run build:sitemap
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAllSlugs } from '../services/blogService';

const SITE_URL = 'https://robindesairs.eu';
const OUT_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

function main(): void {
  const slugs = getAllSlugs();
  const urls = [
    { loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_URL + '/blog/', changefreq: 'weekly', priority: '0.9' },
    ...slugs.map((slug) => ({
      loc: `${SITE_URL}/blog/${slug}.html`,
      changefreq: 'monthly' as const,
      priority: '0.8',
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_PATH, xml, 'utf-8');
  console.log(`[build:sitemap] ${OUT_PATH} écrit (${urls.length} URLs).`);
}

main();
