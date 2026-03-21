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

const TAILWIND_CDN =
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderArticlePage(post: Awaited<ReturnType<typeof getBySlug>>): string {
  if (!post) return '';
  const canonical = `${SITE_URL}/blog/${post.slug}.html`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
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
  <meta property="og:image" content="${SITE_URL}${post.image_url.startsWith('/') ? post.image_url : '/' + post.image_url}">
  <link href="${TAILWIND_CDN}" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>body{font-family:'Montserrat',sans-serif}
#blog-body h2{font-size:1.125rem;font-weight:700;color:#0B1F3A;margin:1.75rem 0 .5rem;padding-left:12px;border-left:4px solid #00C87A}
#blog-body p{margin-bottom:.875rem;font-size:14px;color:#374151}
#blog-body ul{margin:.5rem 0 .875rem 1.25rem}
#blog-body li{margin-bottom:.25rem;font-size:14px}
#blog-body li::marker{color:#00C87A}
#blog-body strong{color:#0B1F3A}
#blog-body a{color:#009960;font-weight:600}
#blog-body a:hover{color:#00C87A;text-decoration:underline}
#blog-body table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:14px}
#blog-body th,#blog-body td{border:1px solid #E2E6EE;padding:10px 12px;text-align:left}
#blog-body th{background:#0B1F3A;color:white;font-weight:700}
#blog-body tr:nth-child(even){background:#F7F8FA}</style>
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
  <nav class="bg-[#0B1F3A] px-6 py-4 flex items-center justify-between">
    <a href="/" class="font-black text-white text-sm">ROBIN<span class="text-[#00E5A0]"> des Airs</span></a>
    <a href="/" class="text-white/80 text-sm font-semibold hover:text-white">← Retour</a>
  </nav>
  <main class="max-w-3xl mx-auto px-6 py-10 pb-20">
    <h1 class="text-2xl font-black text-[#0B1F3A] mb-2 pb-3 border-b-2 border-[#00C87A]">${escapeHtml(post.title)}</h1>
    <div class="max-w-none mt-6 text-gray-700 leading-relaxed" id="blog-body">${post.html}</div>
    <div class="mt-10 rounded-xl bg-[#0B1F3A] text-center py-8 px-6 text-white">
      <p class="mb-3 text-white/90">Prêt à récupérer votre indemnité ?</p>
      <p>
        <a href="${SITE_URL}/#funnel-box" class="text-[#00E5A0] font-bold mx-2">Vérifier mon indemnité</a>
        <span class="text-white/50">·</span>
        <a href="https://wa.me/33756863630" class="text-[#00E5A0] font-bold mx-2">WhatsApp direct</a>
      </p>
    </div>
  </main>
</body>
</html>`;
}

function renderIndexPage(posts: ReturnType<typeof getAllPosts>): string {
  const canonical = `${SITE_URL}/blog/`;
  const titles = escapeHtml('Blog — Robin des Airs | Indemnités vol retardé, annulé, surbooking');
  const desc = escapeHtml('Guides et articles sur vos droits : vol retardé, annulé, correspondance manquée, surbooking. Jusqu\'à 600€ par passager.');
  const cards = posts
    .map(
      (p) => `
    <a href="/blog/${p.slug}.html" class="block p-5 rounded-xl border border-gray-200 bg-white hover:border-[#00C87A] hover:shadow-md transition">
      <h2 class="font-bold text-[#0B1F3A] text-base">${escapeHtml(p.title)}</h2>
      <p class="text-sm text-gray-500 mt-1 line-clamp-2">${escapeHtml(p.meta_description)}</p>
    </a>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.png" type="image/png">
  <title>${titles}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="Blog Robin des Airs — Indemnités aériennes CE 261">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <link href="${TAILWIND_CDN}" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>body{font-family:'Montserrat',sans-serif}</style>
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
  <nav class="bg-[#0B1F3A] px-6 py-4 flex items-center justify-between">
    <a href="/" class="font-black text-white text-sm">ROBIN<span class="text-[#00E5A0]"> des Airs</span></a>
    <a href="/" class="text-white/80 text-sm font-semibold hover:text-white">← Retour à l'accueil</a>
  </nav>
  <main class="max-w-4xl mx-auto px-6 py-10 pb-20">
    <h1 class="text-2xl font-black text-[#0B1F3A] mb-2">Blog</h1>
    <p class="text-gray-600 mb-10">Vos droits en cas de vol retardé, annulé ou surbooké. Chaque article vous redirige vers le diagnostic ou WhatsApp.</p>
    <div class="grid gap-4 sm:grid-cols-2">${cards}</div>
    <div class="mt-12 rounded-xl bg-[#0B1F3A] text-center py-8 px-6 text-white">
      <p class="mb-3 text-white/90">Prêt à récupérer votre indemnité ?</p>
      <p>
        <a href="${SITE_URL}/#funnel-box" class="text-[#00E5A0] font-bold mx-2">Diagnostic gratuit</a>
        <span class="text-white/50">·</span>
        <a href="https://wa.me/33756863630" class="text-[#00E5A0] font-bold mx-2">WhatsApp direct</a>
      </p>
    </div>
  </main>
</body>
</html>`;
}

function main(): void {
  if (!fs.existsSync(BLOG_OUT_DIR)) fs.mkdirSync(BLOG_OUT_DIR, { recursive: true });

  const posts = getAllPosts();
  console.log(`[build-blog] ${posts.length} articles trouvés.`);

  fs.writeFileSync(path.join(BLOG_OUT_DIR, 'index.html'), renderIndexPage(posts), 'utf-8');
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
