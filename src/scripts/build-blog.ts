/**
 * Build Blog — Génère les pages statiques /blog (index) et /blog/[slug] à partir du Markdown.
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/build-blog.ts
 * ou: node -r ts-node/register src/scripts/build-blog.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAllPosts, getBySlug } from '../services/blogService';

const BLOG_OUT_DIR = path.join(process.cwd(), 'blog');
const SITE_URL = 'https://robindesairs.eu';
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Durcit les <img> du corps d'article : bascule les schémas PNG vers WebP (~5x plus léger),
 * diffère le chargement (aucune image n'est above-the-fold) et fixe les dimensions
 * pour éviter tout décalage de mise en page (CLS).
 * Les images de /assets/images/ sont toutes en 1200x630.
 *
 * Les PHOTOGRAPHIES sont servies en JPEG et gardent leur extension : elles n'ont pas de
 * contrepartie WebP (aucun encodeur webp dans la chaîne de build), et un PNG photo pèse
 * ~5x plus lourd qu'un JPEG de qualité équivalente. Elles bénéficient en revanche du même
 * durcissement (dimensions figées, chargement différé) : sans lui, un <img> sans width ni
 * height provoque un décalage de mise en page au chargement.
 */
function enhanceBodyImages(html: string): string {
  return html.replace(/<img\s+src="(\/assets\/images\/[^"]+)\.(png|jpe?g)"([^>]*)>/g, (_m, base, ext, rest) => {
    const attrs = rest.replace(/\s*\/?$/, '');
    const src = ext === 'png' ? `${base}.webp` : `${base}.${ext}`;
    return `<img src="${src}"${attrs} width="1200" height="630" loading="lazy" decoding="async">`;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * CSS minimal embarqué (sans CDN Tailwind) — aligné sur les articles "premium"
 * pour cohérence visuelle et performance (FCP/LCP).
 */
const INLINE_CSS = `*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#F9FAFB;color:#111827;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:'Montserrat',sans-serif}
nav{background:#0B1F3A;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
nav a{color:#fff;font-size:.875rem;text-decoration:none;font-weight:700}
nav a.back{color:rgba(255,255,255,.8);font-weight:600}nav a.back:hover{color:#fff}
.wrap{max-width:48rem;margin-left:auto;margin-right:auto;padding:2.5rem 1.5rem 5rem}
h1.title{font-size:1.5rem;line-height:2rem;font-weight:900;color:#0B1F3A;margin:0 0 .5rem;padding-bottom:.75rem;border-bottom:2px solid #00C87A}
.cta-box{margin-top:2.5rem;border-radius:.75rem;background:#0B1F3A;color:#fff;text-align:center;padding:2rem 1.5rem}
.cta-box p{margin:0 0 .75rem;color:rgba(255,255,255,.9)}
.cta-box a{color:#00E5A0;font-weight:700;margin:0 .5rem;text-decoration:none}
.cta-box span.sep{color:rgba(255,255,255,.5)}
.cta-top{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;margin:0 0 1.5rem;padding:.9rem 1.1rem;background:#EFF9F4;border:1px solid #00C87A;border-radius:.75rem;color:#0B1F3A;font-size:.95rem}
.cta-top strong{color:#0B1F3A}
.cta-top .btn{background:#00C87A;color:#0B1F3A;font-weight:800;text-decoration:none;padding:.6rem 1.05rem;border-radius:.6rem;white-space:nowrap}
.cta-top .muted{color:#4B5563;font-size:.82rem}
.related{margin-top:1.5rem;border:1px solid #E5E7EB;background:#fff;border-radius:.75rem;padding:1.25rem}
.related h2{font-size:1rem;font-weight:700;color:#0B1F3A;margin:0 0 .75rem}
.related ul{list-style:disc;padding-left:1.25rem;margin:0;font-size:.875rem;color:#374151}
.related li{margin-bottom:.25rem}
.related a{color:#009960;font-weight:600;text-decoration:none}
.related a:hover{color:#00C87A;text-decoration:underline}
#blog-body{margin-top:1.5rem;color:#374151;line-height:1.625}
#blog-body h2{font-size:1.125rem;font-weight:700;color:#0B1F3A;margin:1.75rem 0 .5rem;padding-left:12px;border-left:4px solid #00C87A}
#blog-body h3{font-size:1rem;font-weight:700;color:#0B1F3A;margin:1.25rem 0 .4rem}
#blog-body p{margin-bottom:.875rem;font-size:14px;color:#374151}
#blog-body ul,#blog-body ol{margin:.5rem 0 .875rem 1.25rem}
#blog-body li{margin-bottom:.25rem;font-size:14px}
#blog-body li::marker{color:#00C87A}
#blog-body strong{color:#0B1F3A}
#blog-body a{color:#009960;font-weight:600}
#blog-body a:hover{color:#00C87A;text-decoration:underline}
#blog-body img{display:block;max-width:100%;height:auto;margin:1.25rem 0;border-radius:.5rem;border:1px solid #E2E6EE}
/* Tableaux : 92 articles en contiennent, certains à 4 colonnes. Sans overflow, la
   dernière colonne était purement coupée sur mobile (vérifié à 375px : la colonne
   « Délai pour agir » disparaissait hors écran, sans scroll possible). Le trafic
   étant majoritairement mobile, on rend le tableau scrollable horizontalement. */
#blog-body table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;margin:1rem 0;font-size:14px}
#blog-body th,#blog-body td{border:1px solid #E2E6EE;padding:10px 12px;text-align:left}
#blog-body th{background:#0B1F3A;color:white;font-weight:700}
#blog-body tr:nth-child(even){background:#F7F8FA}
#blog-body blockquote{border-left:4px solid #00C87A;background:#EFF9F4;padding:12px 16px;border-radius:0 8px 8px 0;margin:1rem 0;color:#0B1F3A}
.faq{margin-top:2rem;border:1px solid #E5E7EB;background:#fff;border-radius:.75rem;padding:1.25rem 1.5rem}
.faq h2{font-size:1.125rem;font-weight:700;color:#0B1F3A;margin:0 0 .75rem;padding-left:12px;border-left:4px solid #00C87A}
.faq details{border-top:1px solid #F1F2F4;padding:.75rem 0}
.faq details:first-of-type{border-top:none}
.faq summary{font-size:.95rem;font-weight:600;color:#0B1F3A;cursor:pointer;padding:.25rem 0;list-style:none;position:relative;padding-right:1.5rem}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:1.25rem;color:#00C87A;font-weight:700;line-height:1}
.faq details[open] summary::after{content:'−'}
.faq details>div{margin-top:.5rem;font-size:.875rem;color:#374151;line-height:1.6}
.faq details>div a{color:#009960;font-weight:600}
.faq details>div strong{color:#0B1F3A}`;

/**
 * Convertit du Markdown inline minimal en HTML pour les réponses FAQ
 * (gras `**`, italique `*`, liens `[txt](url)`). Évite d'embarquer un parseur
 * complet juste pour les réponses courtes.
 */
function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

/**
 * Mots vides : n'apportent aucun signal de proximité thématique entre articles
 * (ils sont dans presque tous les slugs). On garde les tokens porteurs de sens :
 * villes, compagnies, situations (tabaski, hajj, bebe, greve…).
 */
const REL_STOPWORDS = new Set([
  'vol', 'retarde', 'retardee', 'annule', 'annulee', 'annulation', 'indemnite', 'indemnites',
  'droit', 'droits', 'paris', 'europe', 'html', 'les', 'des', 'aux', 'pour', 'sur', 'vers',
  'correspondance', 'manquee', 'ce261', '2004', 'guide', 'comment', 'faire', 'depuis', 'depart',
]);

function relTokens(slug: string): Set<string> {
  return new Set(slug.split('-').filter((t) => t.length >= 3 && !REL_STOPWORDS.has(t)));
}

/**
 * Articles piliers : ancrages transverses utilisés en complément quand un article
 * a trop peu de voisins thématiques (garantit >= 3 liens sortants par page).
 */
const PILLAR_SLUGS = [
  'reglementation-ce261-resume',
  'indemnite-vol-montants-250-400-600',
  'reclamer-seul-ou-passer-par-un-service-indemnite-vol',
];

/**
 * Type d'article, déduit du slug. Sert de 2e signal de maillage quand un article
 * a peu de voisins par tokens (ex. une compagnie a un nom unique → 0 voisin
 * thématique, mais doit pointer vers les AUTRES compagnies).
 */
function postType(slug: string): 'jurisprudence' | 'route' | 'compagnie' | 'situation' {
  if (slug.startsWith('arret-')) return 'jurisprudence';
  if (slug.startsWith('vol-retarde-') || slug.startsWith('vol-annule-')) return 'route';
  if (/-vol-retarde-indemnite$/.test(slug)) return 'compagnie';
  return 'situation';
}

/**
 * Maillage interne à 3 niveaux :
 *  1. voisins thématiques (tokens partagés : même ville, compagnie, thème) ;
 *  2. articles du MÊME TYPE (compagnie↔compagnie, arrêt↔arrêt…), avec rotation
 *     par article pour répartir le jus de lien sur tout le cluster ;
 *  3. piliers transverses en dernier recours (garantit >= 3 liens sortants).
 */
function computeRelated(
  targetSlug: string,
  all: Array<{ slug: string; title: string }>,
  max = 6
): Array<{ slug: string; title: string }> {
  const tks = relTokens(targetSlug);
  const tType = postType(targetSlug);
  const picked: Array<{ slug: string; title: string }> = [];
  const seen = new Set<string>([targetSlug]);
  const add = (p: { slug: string; title: string }) => {
    if (picked.length < max && !seen.has(p.slug)) {
      seen.add(p.slug);
      picked.push(p);
    }
  };

  // 1) Voisins thématiques
  const scored = all
    .filter((p) => p.slug !== targetSlug)
    .map((p) => {
      const ot = relTokens(p.slug);
      let score = 0;
      for (const t of tks) if (ot.has(t)) score++;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.slug.localeCompare(b.p.slug));
  for (const x of scored) add(x.p);

  // 2) Même type, avec point de départ tournant par article
  if (picked.length < max) {
    const sameType = all
      .filter((p) => p.slug !== targetSlug && postType(p.slug) === tType)
      .sort((a, b) => a.slug.localeCompare(b.slug));
    if (sameType.length) {
      let off = 0;
      for (const c of targetSlug) off = (off + c.charCodeAt(0)) % sameType.length;
      for (let i = 0; i < sameType.length; i++) add(sameType[(off + i) % sameType.length]);
    }
  }

  // 3) Piliers
  if (picked.length < 3) {
    for (const ps of PILLAR_SLUGS) {
      const found = all.find((p) => p.slug === ps);
      if (found) add(found);
    }
  }
  return picked;
}

/**
 * Lien WhatsApp PORTEUR DE LA SOURCE : le message prérempli finit par « (réf. article : <slug>) »,
 * que le bot lit, attribue au lead, puis retire du texte (cf. railway/server.js, handleMessage).
 *
 * Pourquoi : un lien wa.me ne transmet AUCUN referral. L'objet `referral` de l'API WhatsApp Business
 * n'existe que pour les pubs Click-to-WhatsApp de Meta. Sans ce tag, un clic organique est donc
 * indiscernable d'un clic Instagram ou d'un accès direct, et on ne peut pas relier un article au
 * dossier qu'il génère. C'est le seul maillon entre le SEO et la conversion.
 *
 * Limite assumée : si le client efface le texte prérempli avant d'envoyer, l'attribution est perdue.
 * Inhérent à wa.me ; on mesure donc un plancher, jamais un chiffre gonflé.
 */
function waLink(src: string): string {
  const msg =
    `Bonjour Robin ! Mon vol a été retardé ou annulé, ai-je droit à une indemnité (jusqu'à 600 €) ?` +
    `\n(réf. article : ${src})`;
  return `https://wa.me/33756863630?text=${encodeURIComponent(msg)}`;
}

/**
 * datePublished STABLE : on relit la date de la page DÉJÀ générée pour ne PAS la
 * réécrire à la date du jour à chaque build (sinon Google voit l'article « republié »
 * et l'article perd son ancienneté). Nouvelle page (aucun fichier) → date du jour.
 * Rend le build idempotent : un rebuild sans changement ne touche plus les dates.
 */
function readExistingMeta(slug: string): { datePublished: string; dateModified: string } {
  try {
    const html = fs.readFileSync(path.join(BLOG_OUT_DIR, `${slug}.html`), 'utf-8');
    const dp = html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})/);
    const dm = html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})/);
    return { datePublished: dp ? dp[1] : TODAY, dateModified: dm ? dm[1] : TODAY };
  } catch {
    return { datePublished: TODAY, dateModified: TODAY };
  }
}

function renderArticlePage(
  post: Awaited<ReturnType<typeof getBySlug>>,
  related: Array<{ slug: string; title: string }> = [],
  familyLinks: Array<{ slug: string; title: string }> = []
): string {
  if (!post) return '';
  const meta = readExistingMeta(post.slug);
  const canonical = `${SITE_URL}/blog/${post.slug}.html`;
  const ogImage = `${SITE_URL}${post.image_url.startsWith('/') ? post.image_url : '/' + post.image_url}`;
  // hreflang : posé UNIQUEMENT si une vraie traduction EN existe (hreflang_en en frontmatter) —
  // pas de couplage FR/EN automatique, les deux corpus sont indépendants (cf. audit SEO 16/07/2026).
  // x-default pointe sur le FR : c'est la version de reference du site, et les pages EN
  // pointent deja leur x-default vers le FR. Sans lui, l'appariement etait asymetrique.
  const hreflangHtml = post.hreflang_en
    ? `\n  <link rel="alternate" hreflang="fr" href="${canonical}">\n  <link rel="alternate" hreflang="en" href="${SITE_URL}/en/blog/${post.hreflang_en}.html">\n  <link rel="alternate" hreflang="x-default" href="${canonical}">`
    : '';
  // Images du corps : servir le WebP (5x plus léger que le PNG), différer le chargement
  // et fixer les dimensions pour ne pas provoquer de CLS. Les schémas font tous 1200x630.
  const body = enhanceBodyImages(post.html);
  const faq = post.faq || [];
  const hasFaq = faq.length > 0;
  const blogPostingJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta_title,
    description: post.meta_description,
    url: canonical,
    image: ogImage,
    datePublished: meta.datePublished,
    dateModified: meta.dateModified,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: { '@type': 'Person', '@id': SITE_URL + '/a-propos.html#climbie', name: 'Saint-Yves', description: "Fondateur de Robin des Airs, service spécialisé dans le recouvrement d'indemnités pour passagers aériens sur l'axe Europe-Afrique, spécialiste du règlement CE 261/2004.", url: SITE_URL + '/a-propos.html' },
    publisher: {
      '@type': 'Organization',
      name: 'Robin des Airs',
      logo: {
        '@type': 'ImageObject',
        url: SITE_URL + '/robin-des-airs-logo-texte-profil.png',
      },
    },
    inLanguage: 'fr-FR',
    isPartOf: {
      '@type': 'Blog',
      name: 'Blog Robin des Airs',
      url: SITE_URL + '/blog/',
    },
  });
  const breadcrumbJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Robin des Airs', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE_URL + '/blog/' },
      { '@type': 'ListItem', position: 3, name: post.meta_title, item: canonical },
    ],
  });
  const faqJson = hasFaq
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      })
    : '';
  const faqHtml = hasFaq
    ? `<section class="faq">
      <h2>Questions fréquentes</h2>
      ${faq
        .map(
          (f) => `<details>
        <summary>${escapeHtml(f.q)}</summary>
        <div>${inlineMd(f.a)}</div>
      </details>`
        )
        .join('\n      ')}
    </section>`
    : '';
  const relatedHtml = related.length
    ? `<section class="related">
      <h2>Articles liés</h2>
      <ul>
        ${related
          .map((r) => `<li><a href="/blog/${r.slug}.html">${escapeHtml(r.title)}</a></li>`)
          .join('\n        ')}
      </ul>
    </section>`
    : '';
  // Bloc « famille » : maille chaque page compagnie/route vers ses sœurs (y compris les
  // orphelines non indexées) → Google les découvre et les priorise depuis des pages fortes.
  const famType = postType(post.slug);
  const famTitle = famType === 'compagnie' ? 'Autres compagnies aériennes' : famType === 'route' ? 'Autres trajets fréquents' : '';
  const familyHtml = familyLinks.length && famTitle
    ? `<section class="related">
      <h2>${famTitle}</h2>
      <ul>
        ${familyLinks
          .map((r) => `<li><a href="/blog/${r.slug}.html">${escapeHtml(r.title)}</a></li>`)
          .join('\n        ')}
      </ul>
    </section>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Traceurs publicitaires : chargés UNIQUEMENT après consentement, cf. /assets/consent.js -->
  <script defer src="/assets/consent.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>${escapeHtml(post.meta_title)}</title>
  <meta name="description" content="${escapeHtml(post.meta_description)}">${(post as any).noindex ? '\n  <meta name="robots" content="noindex, follow">' : ''}
  <link rel="canonical" href="${canonical}">${hreflangHtml}
  <meta property="og:title" content="${escapeHtml(post.meta_title)}">
  <meta property="og:description" content="${escapeHtml(post.meta_description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.meta_title)}">
  <meta name="twitter:description" content="${escapeHtml(post.meta_description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"></noscript>
  <style>${INLINE_CSS}</style>
  <script type="application/ld+json">${blogPostingJson}</script>
  <script type="application/ld+json">${breadcrumbJson}</script>
  ${faqJson ? `<script type="application/ld+json">${faqJson}</script>` : ''}
  <script defer src="https://cloud.umami.is/script.js" data-website-id="2309ca47-51e3-4bfd-8192-5b2343213e4b"></script>
</head>
<body>
  <nav>
    <a href="/">ROBIN<span style="color:#00E5A0"> des Airs</span></a>
    <a href="/" class="back">← Retour</a>
  </nav>
  <main class="wrap">
    <h1 class="title">${escapeHtml(post.title)}</h1>
    <div class="cta-top">
      <span>💰 <strong>Vol retardé, annulé ou surbooké ?</strong> Jusqu'à 600 € par passager, 0 € d'avance.</span>
      <a class="btn" href="${SITE_URL}/depot-express">Vérifier mon vol en 2 min</a>
      <span class="muted">ou lisez le guide ci-dessous 👇</span>
    </div>
    <div id="blog-body">${body}</div>
    ${faqHtml}
    <div class="cta-box">
      <p>Prêt à récupérer votre indemnité ?</p>
      <p>
        <a href="${SITE_URL}/depot-express">Déposer mon dossier en 2 min</a>
        <span class="sep">·</span>
        <a href="${SITE_URL}/#funnel-box">Vérifier mon indemnité</a>
        <span class="sep">·</span>
        <a href="${waLink(post.slug)}">WhatsApp direct</a>
      </p>
    </div>
    ${relatedHtml}
    ${familyHtml}
  </main>
</body>
</html>`;
}

/**
 * Scanne les .html dans /blog/ qui n'ont pas de .md source (articles legacy
 * créés directement en HTML). Extrait title + meta_description pour les
 * inclure dans l'index. Évite que des articles publiés soient invisibles.
 */
function getOrphanHtmlPosts(slugsWithMd: Set<string>): Array<{
  slug: string;
  title: string;
  meta_description: string;
}> {
  if (!fs.existsSync(BLOG_OUT_DIR)) return [];
  const orphans: Array<{ slug: string; title: string; meta_description: string }> = [];
  for (const f of fs.readdirSync(BLOG_OUT_DIR)) {
    if (!f.endsWith('.html')) continue;
    if (f === 'index.html') continue;
    const slug = f.replace(/\.html$/, '');
    if (slugsWithMd.has(slug)) continue;
    const html = fs.readFileSync(path.join(BLOG_OUT_DIR, f), 'utf-8');
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
    orphans.push({
      slug,
      title: titleMatch ? titleMatch[1].trim() : slug,
      meta_description: descMatch ? descMatch[1].trim() : '',
    });
  }
  return orphans;
}

function renderIndexPage(posts: ReturnType<typeof getAllPosts>): string {
  const canonical = `${SITE_URL}/blog/`;
  const titles = escapeHtml('Blog — Robin des Airs | Indemnités vol retardé, annulé, surbooking');
  const desc = escapeHtml('Guides et articles sur vos droits : vol retardé, annulé, correspondance manquée, surbooking. Jusqu\'à 600€ par passager.');
  const cards = posts
    .map(
      (p) => `
    <a class="card" href="/blog/${p.slug}.html">
      <h2>${escapeHtml(p.title)}</h2>
      <p>${escapeHtml(p.meta_description)}</p>
    </a>`
    )
    .join('');
  const indexCss = `${INLINE_CSS}
.wrap{max-width:64rem}
h1.title{font-size:1.5rem;border-bottom:none;padding-bottom:0;margin-bottom:.5rem}
.lead{color:#6B7280;margin:0 0 2.5rem}
.grid{display:grid;gap:1rem;grid-template-columns:1fr}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
.card{display:block;padding:1.25rem;border-radius:.75rem;border:1px solid #E5E7EB;background:#fff;text-decoration:none;transition:all .15s ease}
.card:hover{border-color:#00C87A;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}
.card h2{font-size:1rem;font-weight:700;color:#0B1F3A;margin:0}
.card p{font-size:.875rem;color:#6B7280;margin:.25rem 0 0;line-height:1.5}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Traceurs publicitaires : chargés UNIQUEMENT après consentement, cf. /assets/consent.js -->
  <script defer src="/assets/consent.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>${titles}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="Blog Robin des Airs — Indemnités aériennes CE 261">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${SITE_URL}/robin-des-airs-logo-texte-profil.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog Robin des Airs — CE 261">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${SITE_URL}/robin-des-airs-logo-texte-profil.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"></noscript>
  <style>${indexCss}</style>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="2309ca47-51e3-4bfd-8192-5b2343213e4b"></script>
</head>
<body>
  <nav>
    <a href="/">ROBIN<span style="color:#00E5A0"> des Airs</span></a>
    <a href="/" class="back">← Retour à l'accueil</a>
  </nav>
  <main class="wrap">
    <h1 class="title">Blog</h1>
    <p class="lead">Vos droits en cas de vol retardé, annulé ou surbooké. Chaque article vous redirige vers le diagnostic ou WhatsApp.</p>
    <div class="grid">${cards}</div>
    <div class="cta-box">
      <p>Prêt à récupérer votre indemnité ?</p>
      <p>
        <a href="${SITE_URL}/depot-express">Déposer mon dossier en 2 min</a>
        <span class="sep">·</span>
        <a href="${SITE_URL}/#funnel-box">Diagnostic gratuit</a>
        <span class="sep">·</span>
        <a href="${waLink('blog-index')}">WhatsApp direct</a>
      </p>
    </div>
  </main>
</body>
</html>`;
}

function main(): void {
  if (!fs.existsSync(BLOG_OUT_DIR)) fs.mkdirSync(BLOG_OUT_DIR, { recursive: true });

  const posts = getAllPosts();
  const mdSlugs = new Set(posts.map((p) => p.slug));
  const orphans = getOrphanHtmlPosts(mdSlugs);
  const merged: Array<{ slug: string; title: string; meta_description: string; image_url?: string }> = [
    ...posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      meta_description: p.meta_description,
      image_url: p.image_url,
    })),
    ...orphans,
  ];
  console.log(
    `[build-blog] ${posts.length} articles .md + ${orphans.length} orphelins HTML = ${merged.length} total.`
  );

  fs.writeFileSync(
    path.join(BLOG_OUT_DIR, 'index.html'),
    renderIndexPage(merged as ReturnType<typeof getAllPosts>),
    'utf-8'
  );
  console.log('[build-blog] blog/index.html écrit.');

  const linkPool = merged.map((m) => ({ slug: m.slug, title: m.title }));
  const compagnies = linkPool.filter((m) => postType(m.slug) === 'compagnie');
  const routes = linkPool.filter((m) => postType(m.slug) === 'route').sort((a, b) => a.slug.localeCompare(b.slug));
  for (const p of posts) {
    const full = getBySlug(p.slug);
    if (full) {
      const related = computeRelated(full.slug, linkPool, 6);
      // Maillage « famille » : compagnie → TOUTES les autres compagnies ; route → fenêtre
      // tournante de 24 autres trajets (couvre le cluster sans gonfler la page). Chaque
      // orpheline reçoit ainsi des liens entrants depuis les pages fortes de sa famille.
      const t = postType(full.slug);
      let family: Array<{ slug: string; title: string }> = [];
      if (t === 'compagnie') {
        family = compagnies.filter((c) => c.slug !== full.slug);
      } else if (t === 'route') {
        const others = routes.filter((c) => c.slug !== full.slug);
        if (others.length <= 24) family = others;
        else {
          let off = 0;
          for (const ch of full.slug) off = (off + ch.charCodeAt(0)) % others.length;
          family = Array.from({ length: 24 }, (_, i) => others[(off + i) % others.length]);
        }
      }
      fs.writeFileSync(
        path.join(BLOG_OUT_DIR, `${full.slug}.html`),
        renderArticlePage(full, related, family),
        'utf-8'
      );
      console.log(`[build-blog] blog/${full.slug}.html écrit (${related.length} liens + ${family.length} famille).`);
    }
  }

  console.log('[build-blog] Terminé.');
}

main();
