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
#blog-body table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:14px}
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

function renderArticlePage(post: Awaited<ReturnType<typeof getBySlug>>): string {
  if (!post) return '';
  const canonical = `${SITE_URL}/blog/${post.slug}.html`;
  const ogImage = `${SITE_URL}${post.image_url.startsWith('/') ? post.image_url : '/' + post.image_url}`;
  const faq = post.faq || [];
  const hasFaq = faq.length > 0;
  const blogPostingJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta_title,
    description: post.meta_description,
    url: canonical,
    image: ogImage,
    datePublished: TODAY,
    dateModified: TODAY,
    author: { '@type': 'Organization', name: 'Robin des Airs', url: SITE_URL + '/' },
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
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Meta Pixel -->
  <script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','1563661872042064');fbq('track','PageView');
  document.addEventListener('click',function(e){var t=e.target;var a=t&&t.closest?t.closest('a[href*="wa.me"],a[href*="whatsapp.com"]'):null;if(a){try{fbq('track','Lead',{content_name:'whatsapp_click'});}catch(_){}}},true);
  </script>
  <noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=1563661872042064&ev=PageView&noscript=1"/></noscript>
  <!-- End Meta Pixel -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>${escapeHtml(post.meta_title)}</title>
  <meta name="description" content="${escapeHtml(post.meta_description)}">
  <link rel="canonical" href="${canonical}">
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
</head>
<body>
  <nav>
    <a href="/">ROBIN<span style="color:#00E5A0"> des Airs</span></a>
    <a href="/" class="back">← Retour</a>
  </nav>
  <main class="wrap">
    <h1 class="title">${escapeHtml(post.title)}</h1>
    <div id="blog-body">${post.html}</div>
    ${faqHtml}
    <div class="cta-box">
      <p>Prêt à récupérer votre indemnité ?</p>
      <p>
        <a href="${SITE_URL}/#funnel-box">Vérifier mon indemnité</a>
        <span class="sep">·</span>
        <a href="https://wa.me/33756863630">WhatsApp direct</a>
      </p>
    </div>
    <section class="related">
      <h2>Articles liés</h2>
      <ul>
        <li><a href="/blog/reglementation-ce261-resume.html">Résumé du règlement CE 261/2004</a></li>
        <li><a href="/blog/indemnite-vol-montants-250-400-600.html">Montants 250 €, 400 €, 600 €</a></li>
        <li><a href="/blog/reclamer-seul-ou-passer-par-un-service-indemnite-vol.html">Réclamer seul ou se faire accompagner</a></li>
      </ul>
    </section>
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
.card p{font-size:.875rem;color:#6B7280;margin:.25rem 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Meta Pixel -->
  <script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','1563661872042064');fbq('track','PageView');
  document.addEventListener('click',function(e){var t=e.target;var a=t&&t.closest?t.closest('a[href*="wa.me"],a[href*="whatsapp.com"]'):null;if(a){try{fbq('track','Lead',{content_name:'whatsapp_click'});}catch(_){}}},true);
  </script>
  <noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=1563661872042064&ev=PageView&noscript=1"/></noscript>
  <!-- End Meta Pixel -->
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
        <a href="${SITE_URL}/#funnel-box">Diagnostic gratuit</a>
        <span class="sep">·</span>
        <a href="https://wa.me/33756863630">WhatsApp direct</a>
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

  for (const p of posts) {
    const full = getBySlug(p.slug);
    if (full) {
      fs.writeFileSync(
        path.join(BLOG_OUT_DIR, `${full.slug}.html`),
        renderArticlePage(full),
        'utf-8'
      );
      console.log(`[build-blog] blog/${full.slug}.html écrit.`);
    }
  }

  console.log('[build-blog] Terminé.');
}

main();
