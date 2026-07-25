/**
 * Génère sitemap.xml à la racine (accueil, pages principales, destinations, blog).
 * Usage: npm run build:sitemap
 * Netlify : exécuté avant build:blog dans la commande de build.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getAllSlugs } from '../services/blogService';

const SITE_URL = 'https://robindesairs.eu';
const OUT_PATH = path.join(process.cwd(), 'sitemap.xml');
// Alias FR sous le motif `sitemap-XX.xml` : GSC bloque parfois le `sitemap.xml` « par défaut »
// dans un état « Impossible de récupérer » coincé ; un nom de langue se soumet proprement.
const FR_PATH = path.join(process.cwd(), 'sitemap-fr.xml');
const INDEX_PATH = path.join(process.cwd(), 'sitemap-index.xml');
const BLOG_DIR = path.join(process.cwd(), 'blog');
const DEST_DIR = path.join(process.cwd(), 'destinations');

/**
 * Date du dernier commit touchant chaque fichier, en un seul passage de `git log`
 * (le log est antéchronologique : la première occurrence d'un chemin est la plus récente).
 *
 * ⚠️ NE JAMAIS remplacer par la date du jour. Google n'utilise le `lastmod` que s'il est
 * « consistently and verifiably accurate » : un site qui tamponne toutes ses URL à la date
 * du build apprend à Google que son `lastmod` est du bruit, et Google cesse de le croire
 * pour l'ensemble du site. C'était le cas ici jusqu'au 16/07/2026 (258 URL à la date du
 * jour, sitemap non relu depuis le 19/06) : l'inverse exact de l'effet recherché.
 * Si la date est inconnue, on OMET le lastmod — un signal absent vaut mieux qu'un faux.
 */
let gitDates: Map<string, string> | null = null;
function lastCommitDate(relPath: string): string | null {
  if (!gitDates) {
    gitDates = new Map();
    try {
      const log = execSync('git log --format=%cs --name-only --no-merges', {
        cwd: process.cwd(),
        maxBuffer: 64 * 1024 * 1024,
      }).toString();
      let current = '';
      for (const line of log.split('\n')) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(line)) current = line;
        else if (line && !gitDates.has(line)) gitDates.set(line, current);
      }
    } catch {
      console.warn('[build:sitemap] git indisponible : lastmod omis (préférable à une date fausse).');
    }
  }
  return gitDates.get(relPath) ?? null;
}

/** `<lastmod>` seulement si on connaît la vraie date. Sinon : rien. */
function lastmodTag(relPath: string | null): string {
  const d = relPath ? lastCommitDate(relPath) : null;
  return d ? `<lastmod>${d}</lastmod>` : '';
}

/** Fichier source qui fait foi pour la date d'une URL du site. */
function sourceFor(loc: string): string | null {
  const p = loc.replace(SITE_URL, '');
  if (p === '/' || p === '') return 'index.html';
  if (p === '/blog/') return 'blog/index.html';
  const m = p.match(/^\/blog\/(.+)\.html$/);
  if (m) {
    // le Markdown fait foi ; à défaut (articles legacy en HTML autonome), le HTML publié
    const md = path.join('src', 'content', 'blog', `${m[1]}.md`);
    return fs.existsSync(path.join(process.cwd(), md)) ? md : `blog/${m[1]}.html`;
  }
  return p.replace(/^\//, '') || null;
}

/**
 * Liste des sub-sitemaps publiés à la racine. Le lastmod de l'index reflète la date
 * de modification la plus récente parmi les URL du sub-sitemap correspondant.
 */
const SUB_SITEMAPS = ['sitemap.xml', 'sitemap-fr.xml', 'sitemap-en.xml'];

/** Date la plus récente réellement présente dans un sub-sitemap déjà écrit. */
function newestLastmodIn(name: string): string | null {
  const f = path.join(process.cwd(), name);
  if (!fs.existsSync(f)) return null;
  const dates = [...fs.readFileSync(f, 'utf-8').matchAll(/<lastmod>([\d-]+)<\/lastmod>/g)].map((m) => m[1]);
  return dates.length ? dates.sort().pop()! : null;
}

function writeSitemapIndex(): void {
  const items = SUB_SITEMAPS.map((name) => {
    const d = newestLastmodIn(name);
    return `  <sitemap><loc>${SITE_URL}/${name}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</sitemap>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
  fs.writeFileSync(INDEX_PATH, xml, 'utf-8');
  console.log(`[build:sitemap] ${INDEX_PATH} écrit (${SUB_SITEMAPS.length} sub-sitemaps, lastmod réels).`);
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
  'vol-retarde-antananarivo-madagascar-paris-indemnite',
]);

// Pages-villes à faible ROI diaspora passées en noindex (X-Robots-Tag via _headers) :
// sorties du sitemap pour concentrer le budget de crawl sur les routes fortes.
// Pilote 25/07/2026 ANNULÉ : ces pages-villes auto-générées contiennent des ROUTES FABRIQUÉES
// (vérifié web : Air Côte d'Ivoire ne dessert PAS Frankfurt ; ITA Airways ne vole PAS vers Lagos).
// Le noindex était donc PROTECTEUR (contenu non fiable), pas juste du budget de crawl. On garde
// les 4 en noindex tant que les tableaux compagnies ne sont pas vérifiés/corrigés route par route.
const NOINDEX_SLUGS = new Set<string>([
  'vol-retarde-frankfurt-abidjan-indemnite', 'vol-retarde-lisbonne-dakar-indemnite',
  'vol-retarde-madrid-dakar-indemnite', 'vol-retarde-milan-lagos-indemnite',
  'vol-retarde-addis-abeba-paris-indemnite', 'vol-retarde-alger-paris-indemnite',
  'vol-retarde-amsterdam-accra-indemnite', 'vol-retarde-amsterdam-lagos-indemnite',
  'vol-retarde-amsterdam-nairobi-indemnite', 'vol-retarde-bujumbura-paris-indemnite',
  'vol-retarde-cap-vert-paris-indemnite', 'vol-retarde-casablanca-paris-indemnite',
  'vol-retarde-dar-es-salaam-paris-indemnite', 'vol-retarde-djibouti-paris-indemnite',
  'vol-retarde-freetown-paris-indemnite',
  'vol-retarde-ile-maurice-paris-indemnite', 'vol-retarde-johannesburg-paris-indemnite',
  'vol-retarde-kampala-paris-indemnite',
  'vol-retarde-luanda-paris-indemnite',
  'vol-retarde-maputo-paris-indemnite',
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

/**
 * Régénère un sitemap de langue (EN/DE/ES) à partir de son dossier /<lang>/blog/*.html,
 * avec le lastmod réel de chaque page (cf. lastCommitDate). Inclut la home localisée si elle existe.
 * Corrige le point Bing « sitemaps non rafraîchis quotidiennement » : ces sub-sitemaps étaient statiques.
 */
/**
 * Pages d'une langue qui vivent à la RACINE et non dans /<lang>/blog/, donc invisibles
 * à l'auto-découverte ci-dessous. Sans cette liste, elles n'entrent dans aucun sitemap.
 */
const LANG_ROOT_PAGES: Record<string, Array<{ file: string; changefreq: string; priority: string }>> = {
  en: [{ file: 'ce261-brackets-en.html', changefreq: 'monthly', priority: '0.8' }],
};

function writeLangSitemap(lang: string, dirRel: string, homePath: string): void {
  const urls: Array<{ loc: string; changefreq: string; priority: string }> = [];
  if (fs.existsSync(path.join(process.cwd(), `index-${lang}.html`))) {
    urls.push({ loc: SITE_URL + homePath, changefreq: 'weekly', priority: '1.0' });
  }
  for (const p of LANG_ROOT_PAGES[lang] ?? []) {
    if (!fs.existsSync(path.join(process.cwd(), p.file))) continue;
    urls.push({ loc: `${SITE_URL}/${p.file}`, changefreq: p.changefreq, priority: p.priority });
  }
  const dir = path.join(process.cwd(), dirRel);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html') && x !== 'index.html').sort()) {
      urls.push({ loc: `${SITE_URL}/${dirRel}/${f}`, changefreq: 'monthly', priority: '0.8' });
    }
  }
  if (!urls.length) return;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${lastmodTag(sourceFor(u.loc))}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(process.cwd(), `sitemap-${lang}.xml`), xml, 'utf-8');
  console.log(`[build:sitemap] sitemap-${lang}.xml écrit (${urls.length} URLs, lastmod réels).`);
}

function main(): void {
  const slugs = getAllBlogSlugs();
  const staticPages: Array<{ loc: string; changefreq: string; priority: string }> = [
    { loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' },
    // /depot-en-ligne.html RETIRÉ : la page est en `<meta name="robots" content="noindex">`
    // (c'est le lien de dépôt personnalisé du CRM, servi en `?r=<réf>` — il n'a aucun sens
    // hors dossier). La déclarer au sitemap tout en la marquant noindex envoie deux ordres
    // contradictoires aux crawlers. La page publique équivalente est /depot-express.html,
    // déjà déclarée juste en dessous.
    { loc: SITE_URL + '/depot-express.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/dossier.html', changefreq: 'monthly', priority: '0.9' },
    { loc: SITE_URL + '/suivi-dossier.html', changefreq: 'monthly', priority: '0.8' },
    { loc: SITE_URL + '/guide-whatsapp.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/choix-reclamation.html', changefreq: 'monthly', priority: '0.8' },
    // /partenaires-agences.html RETIRÉ : supprimée par 91f1db1, elle renvoyait 404 tout en restant
    // déclarée ici (seul 404 des 259 URLs du sitemap, vérifié le 17/07). Remplacée par
    // programme-agents-voyage.html. /partenaires-agences-fcfa.html RETIRÉ aussi : ce n'est plus qu'une
    // redirection meta-refresh vers programme-agents-voyage.html, et on ne soumet pas une redirection
    // au sitemap (le canonical y pointe déjà). Les deux landing partenaires restent, elles.
    { loc: SITE_URL + '/programme-agents-voyage.html', changefreq: 'monthly', priority: '0.75' },
    { loc: SITE_URL + '/cgv.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/politique-confidentialite.html', changefreq: 'yearly', priority: '0.4' },
    // /mandat-representation.html RETIRÉ : ce n'est plus qu'un stub de redirection
    // (meta-refresh vers /autorisation.html, cf. le 301 dans _redirects). Même règle que
    // pour /partenaires-agences-fcfa.html ci-dessus : on ne soumet pas une redirection au
    // sitemap, la cible porte déjà le canonical.
    { loc: SITE_URL + '/droit-retractation.html', changefreq: 'yearly', priority: '0.4' },
    { loc: SITE_URL + '/blog/', changefreq: 'weekly', priority: '0.9' },
    { loc: SITE_URL + '/nos-tarifs.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_URL + '/parrainage.html', changefreq: 'monthly', priority: '0.6' },
    { loc: SITE_URL + '/a-propos.html', changefreq: 'monthly', priority: '0.6' },
    // Barème 250/400/600 : la page qui répond littéralement à « combien puis-je récupérer ».
    // Live en prod et indexable depuis toujours, mais jamais déclarée ici (ajoutée le 17/07/2026).
    { loc: SITE_URL + '/bareme-ce261-fr.html', changefreq: 'monthly', priority: '0.8' },
    // /jurisprudence-ce261.html RETIRÉ : la page est en `<meta name="robots" content="noindex, nofollow">`
    // (recueil interne). La déclarer au sitemap tout en la marquant noindex envoie deux ordres
    // contradictoires à Google. Si le codex devient public un jour, retirer le noindex D'ABORD,
    // puis la remettre ici.
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
${urls.map((u) => `  <url><loc>${u.loc}</loc>${lastmodTag(sourceFor(u.loc))}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(OUT_PATH, xml, 'utf-8');
  fs.writeFileSync(FR_PATH, xml, 'utf-8'); // alias FR identique (contourne le blocage GSC sur sitemap.xml)
  console.log(`[build:sitemap] ${OUT_PATH} + sitemap-fr.xml écrits (${urls.length} URLs).`);
  // Sitemaps de langue régénérés à chaque build (fini les fichiers statiques périmés).
  writeLangSitemap('en', 'en/blog', '/en');
  // DE/ES supprimés (2026-07-16) : traductions partielles non indexées (diluaient le crawl budget). FR + EN uniquement.
  writeSitemapIndex();
}

main();
