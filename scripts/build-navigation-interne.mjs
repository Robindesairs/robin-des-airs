#!/usr/bin/env node
/**
 * Génère navigation-interne.html — hub de liens pour l’équipe.
 * Usage : node scripts/build-navigation-interne.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SECTIONS = [
  {
    id: 'accueil',
    title: 'Accueil & conversion',
    links: [
      { url: '/', label: 'Accueil FR' },
      { url: '/en', label: 'Accueil EN' },
      { url: '/nos-tarifs.html', label: 'Nos tarifs' },
      { url: '/choix-reclamation', label: 'Choix réclamation' },
      { url: '/depot-express.html', label: 'Dépôt express' },
      { url: '/depot-en-ligne.html', label: 'Dépôt en ligne' },
      { url: '/depot-simple', label: 'Dépôt simple' },
      { url: '/dossier', label: 'Dossier' },
      { url: '/merci-dossier', label: 'Merci dossier' },
      { url: '/suivi-dossier', label: 'Suivi dossier' },
      { url: '/guide-whatsapp', label: 'Guide WhatsApp' },
      { url: '/pourquoi-si-peu-reclament.html', label: 'Pourquoi si peu réclament' },
      { url: '/parrainage', label: 'Parrainage' },
      { url: '/404.html', label: '404 (test)' },
    ],
  },
  {
    id: 'legal',
    title: 'Légal & mandats',
    links: [
      { url: '/cgv', label: 'CGV' },
      { url: '/politique-confidentialite', label: 'Confidentialité' },
      { url: '/droit-retractation', label: 'Droit de rétractation' },
      { url: '/mandat', label: 'Mandat FR' },
      { url: '/mandat-en.html', label: 'Mandat EN' },
      { url: '/documents/mandat-fr', label: 'Mandat document FR' },
      { url: '/mandat-representation', label: 'Mandat (redirect)' },
    ],
  },
  {
    id: 'ce261',
    title: 'CE 261 — barèmes & délais',
    links: [
      { url: '/bareme-ce261-fr.html', label: 'Barème FR' },
      { url: '/ce261-brackets-en.html', label: 'Brackets EN' },
      { url: '/delais-dates-ce261-fr.html', label: 'Délais FR' },
      { url: '/ce261-date-deadlines-en.html', label: 'Deadlines EN' },
    ],
  },
  {
    id: 'agences',
    title: 'Partenaires & agences',
    links: [
      { url: '/espace-agence', label: 'Espace agence' },
      { url: '/espace-agence-maquette.html', label: 'Maquette agence', tag: 'interne' },
      { url: '/partner-agreement-fr.html', label: 'Contrat partenaire FR' },
      { url: '/partner-agreement-en.html', label: 'Partner agreement EN' },
      { url: '/paliers-commission-agence-fr.html', label: 'Paliers commission FR' },
      { url: '/paliers-commission-agence-en.html', label: 'Paliers commission EN' },
      { url: '/agency-commission-tiers-en.html', label: 'Commission tiers EN' },
      { url: '/partenaires-landing.html', label: 'Landing partenaires' },
      { url: '/partenaires-rejoindre.html', label: 'Rejoindre' },
      { url: '/partenaires-agences-fcfa.html', label: 'Agences FCFA' },
      { url: '/programme-agents-voyage.html', label: 'Agents de voyage' },
      { url: '/merci-partenaire.html', label: 'Merci partenaire' },
    ],
  },
  {
    id: 'radar',
    title: 'Radar & vols',
    links: [
      { url: '/radar', label: 'Radar (prod)' },
      { url: '/radar-choix', label: 'Radar choix' },
      { url: '/radar-direct.html', label: 'Radar direct' },
      { url: '/radar-v3.html', label: 'Radar v3', tag: 'legacy' },
      { url: '/radar-vols-v2.html', label: 'Radar v2', tag: 'legacy' },
      { url: '/test-radar.html', label: 'Test radar', tag: 'dev' },
      { url: '/VOLS-EUROPE-AFRIQUE.html', label: 'Vols EU–AF' },
      { url: '/docs/LOGIQUE-RADAR.html', label: 'Doc logique radar' },
      { url: '/meteo-dossier-indemnite.html', label: 'Météo dossier' },
      { url: '/scan-airport-v8.html', label: 'Scan aéroport' },
    ],
  },
  {
    id: 'outils',
    title: 'Outils internes',
    links: [
      { url: '/crm/', label: 'CRM' },
      { url: '/generateur-pub.html', label: 'Générateur pub' },
      { url: '/verification-fonctions.html', label: 'Test fonctions Netlify' },
      { url: '/navigation-interne', label: 'Cette page' },
      { url: '/docs/PAGES-SITE.md', label: 'Inventaire markdown (GitHub)', external: true },
    ],
  },
];

const API_LINKS = [
  { url: '/api/radar-snapshot', label: 'Snapshot matin (GET)' },
  { url: '/api/vol-ticker', label: 'Bandeau vol-ticker (GET)' },
  { url: '/.netlify/functions/radar', label: 'Radar live (GET)' },
  { url: '/api/daily-radar-snapshot', label: 'Trigger snapshot (POST)', method: 'POST' },
  { url: '/api/radar-monitor', label: 'Radar monitor (POST)', method: 'POST' },
  { url: '/api/whatsapp-status', label: 'WhatsApp status' },
  { url: '/.netlify/functions/flight-info?flight=AF718', label: 'Flight info AF718' },
  { url: '/.netlify/functions/airport-search?query=paris', label: 'Airport search Paris' },
  { url: '/api/agency-auth', label: 'Agency auth' },
  { url: '/api/agency-dossiers', label: 'Agency dossiers' },
];

function scanHtmlDir(dir, urlPrefix, sectionTitle, sectionId) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return null;
  const files = fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort();
  const links = [{ url: urlPrefix, label: 'Index' }];
  for (const f of files) {
    const slug = f.replace(/\.html$/, '');
    links.push({
      url: `${urlPrefix}${slug}.html`,
      label: slug.replace(/-/g, ' '),
    });
  }
  return { id: sectionId, title: sectionTitle, links };
}

function scanRootHtml() {
  const skip = new Set([
    'navigation-interne.html',
    'index.html',
    '404.html',
    'verification-fonctions.html',
  ]);
  const files = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html') && !skip.has(f))
    .sort();
  const inSections = new Set(
    SECTIONS.flatMap((s) => s.links.map((l) => l.url.replace(/^\//, '').replace(/\/$/, '')))
  );
  const links = [];
  for (const f of files) {
    const base = f.replace(/\.html$/, '');
    if (inSections.has(f) || inSections.has(base)) continue;
    links.push({ url: `/${f}`, label: f, tag: 'racine' });
  }
  if (!links.length) return null;
  return { id: 'autres', title: 'Autres pages racine', links };
}

const blogSection = scanHtmlDir('blog', '/blog/', 'Blog', 'blog');
const destSection = scanHtmlDir('destinations', '/destinations/', 'Destinations SEO', 'destinations');
const autres = scanRootHtml();

const allSections = [...SECTIONS, blogSection, destSection, autres].filter(Boolean);

const totalLinks = allSections.reduce((n, s) => n + s.links.length, 0) + API_LINKS.length;

const sectionsJson = JSON.stringify(allSections);
const apisJson = JSON.stringify(API_LINKS);

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Navigation interne — Robin des Airs</title>
<link rel="stylesheet" href="/assets/navigation-interne.css">
</head>
<body>
<header class="ni-top">
  <div>
    <h1>Navigation interne</h1>
    <p class="ni-sub">robindesairs.eu · ${totalLinks} liens · généré ${new Date().toISOString().slice(0, 10)}</p>
  </div>
  <div class="ni-top-actions">
    <a href="/" class="ni-btn">Accueil</a>
    <a href="/radar" class="ni-btn">Radar</a>
    <a href="/verification-fonctions.html" class="ni-btn">Tests API</a>
  </div>
</header>

<div class="ni-toolbar">
  <input type="search" id="ni-search" placeholder="Filtrer une page (vol, mandat, blog…)" autocomplete="off" aria-label="Filtrer">
  <label class="ni-open"><input type="checkbox" id="ni-newtab"> Ouvrir dans un nouvel onglet</label>
</div>

<nav class="ni-jump" id="ni-jump" aria-label="Sections"></nav>

<main id="ni-main"></main>

<section class="ni-section ni-apis" id="ni-apis">
  <h2>API & fonctions (test rapide)</h2>
  <ul class="ni-list" id="ni-api-list"></ul>
</section>

<footer class="ni-foot">
  <p>Régénérer : <code>node scripts/build-navigation-interne.mjs</code> · Doc : <code>docs/PAGES-SITE.md</code></p>
</footer>

<script>
var SECTIONS = ${sectionsJson};
var API_LINKS = ${apisJson};

function origin() {
  return window.location.origin || 'https://robindesairs.eu';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}

function render() {
  var q = (document.getElementById('ni-search').value || '').toLowerCase().trim();
  var newTab = document.getElementById('ni-newtab').checked;
  var main = document.getElementById('ni-main');
  var jump = document.getElementById('ni-jump');
  var html = '';
  var jumps = '';
  SECTIONS.forEach(function(sec) {
    var links = sec.links.filter(function(l) {
      if (!q) return true;
      return (l.label + ' ' + l.url).toLowerCase().indexOf(q) >= 0;
    });
    if (!links.length) return;
    jumps += '<a href="#' + sec.id + '">' + esc(sec.title) + ' (' + links.length + ')</a>';
    html += '<section class="ni-section" id="' + sec.id + '"><h2>' + esc(sec.title) + '</h2><ul class="ni-list">';
    links.forEach(function(l) {
      var href = l.external ? l.url : (l.url.indexOf('http') === 0 ? l.url : origin() + l.url);
      var target = newTab ? ' target="_blank" rel="noopener"' : '';
      var tag = l.tag ? '<span class="ni-tag">' + esc(l.tag) + '</span>' : '';
      html += '<li><a href="' + esc(href) + '"' + target + '><span class="ni-label">' + esc(l.label) + '</span><code class="ni-url">' + esc(l.url) + '</code></a>' + tag + '</li>';
    });
    html += '</ul></section>';
  });
  main.innerHTML = html || '<p class="ni-empty">Aucun résultat.</p>';
  jump.innerHTML = jumps;

  var apiList = document.getElementById('ni-api-list');
  var apiHtml = '';
  API_LINKS.forEach(function(a) {
    var show = !q || (a.label + ' ' + a.url).toLowerCase().indexOf(q) >= 0;
    if (!show) return;
    var full = origin() + a.url;
    apiHtml += '<li class="ni-api-row"><a href="' + esc(full) + '" target="_blank" rel="noopener"><code>' + esc(a.url) + '</code></a> <span>' + esc(a.label) + '</span>';
    if (a.method === 'POST') apiHtml += ' <button type="button" class="ni-btn-sm" data-post="' + esc(full) + '">POST</button>';
    apiHtml += '</li>';
  });
  apiList.innerHTML = apiHtml;
  apiList.querySelectorAll('[data-post]').forEach(function(btn) {
    btn.onclick = function() {
      fetch(btn.getAttribute('data-post'), { method: 'POST' })
        .then(function(r) {
          return r.text().then(function(t) {
            alert(r.status + ': ' + t.slice(0, 200));
          });
        })
        .catch(function(e) { alert(e.message); });
    };
  });
}

document.getElementById('ni-search').addEventListener('input', render);
document.getElementById('ni-newtab').addEventListener('change', render);
render();
</script>
</body>
</html>
`;

const out = path.join(ROOT, 'navigation-interne.html');
fs.writeFileSync(out, html, 'utf8');
console.log('OK', out, '—', totalLinks, 'liens');
