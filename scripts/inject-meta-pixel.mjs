#!/usr/bin/env node
/**
 * Injecte le Pixel Meta dans le <head> des pages PUBLIQUES (marketing + tunnel).
 * - Dry-run par défaut : liste ce qui serait modifié, sans rien écrire.
 *   Lancer pour de vrai : `node scripts/inject-meta-pixel.mjs --commit`
 * - Idempotent : saute toute page contenant déjà "Meta Pixel".
 * - Exclut back-office / outils / tests / previews (DENY ci-dessous).
 * - Place le pixel juste après le bloc Google gtag s'il existe, sinon après <head>.
 *
 * ⚠️ L'ID est un PLACEHOLDER : __META_PIXEL_ID__  → faire un find/replace global
 *    une fois l'ID réel connu (un seul remplacement couvre tout le site).
 *
 * Le blog (blog/, en/blog, de/blog, es/blog) est GÉNÉRÉ → il est patché séparément
 * dans le générateur (src/scripts/build-blog.ts), pas par ce script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const COMMIT = process.argv.includes('--commit');

export const PIXEL_ID = '1563661872042064';

// Snippet canonique. PageView + écouteur global de clic WhatsApp -> Lead.
export const PIXEL_SNIPPET = `<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');
document.addEventListener('click',function(e){
  var t=e.target;var a=t&&t.closest?t.closest('a[href*="wa.me"],a[href*="whatsapp.com"]'):null;
  if(a){try{fbq('track','Lead',{content_name:'whatsapp_click'});}catch(_){}}
},true);
</script>
<noscript><img height="1" width="1" style="display:none" alt=""
src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel -->
`;

// Chemins exclus (back-office, outils internes, tests, maquettes, previews, exports).
const DENY = [
  /^node_modules\//, /^\.git\//, /\.next\//, /^\.claude\//,
  /^proofs\//, /^docs\//, /^pubs-aissa\//, /^src\//, /^crm\//, /^public\//, /^assets\//,
  /^documents\//,                              // gabarits de mandat
  /bureau\.html$/, /dashboard\.html$/, /navigation-interne\.html$/,
  /statistiques\.html$/, /verification-fonctions\.html$/, /live-campagnes\.html$/,
  /(^|\/)test-/, /-test\.html$/, /dossier-test/, /^dossier\.html$/,
  /^brief-/, /radar/, /scan-airport/, /generateur-pub/,
  /^apercu-/, /^pub-meta/, /preview/, /maquette/, /-animation\.html$/,
  /^e-billet-/, /^carte-embarquement-/, /-exemple-/, /^gabarit-/,
];

// SEUL le blog FR racine (blog/) est GÉNÉRÉ (build-blog.ts) → patch du générateur, pas d'injection.
// Les blogs en/blog, de/blog, es/blog sont STATIQUES (ils ont déjà le tag Google) → injectés ici.
const BLOG = /^blog\//;

function listHtml() {
  return execSync('git ls-files "*.html"', { encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function classify(path) {
  if (DENY.some(re => re.test(path))) return 'exclu (interne/test/preview)';
  if (BLOG.test(path)) return 'blog (via générateur)';
  return 'inclus';
}

function inject(html) {
  if (/Meta Pixel/.test(html)) return { html, changed: false, reason: 'déjà présent' };
  // 1) après le bloc gtag (src googletagmanager… puis le </script> de config)
  const gtag = html.match(/<script[^>]*googletagmanager\.com\/gtag[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/i);
  if (gtag) {
    const idx = html.indexOf(gtag[0]) + gtag[0].length;
    return { html: html.slice(0, idx) + '\n' + PIXEL_SNIPPET + html.slice(idx), changed: true, reason: 'après gtag' };
  }
  // 2) sinon juste après l'ouverture <head>
  const head = html.match(/<head[^>]*>/i);
  if (head) {
    const idx = html.indexOf(head[0]) + head[0].length;
    return { html: html.slice(0, idx) + '\n' + PIXEL_SNIPPET + html.slice(idx), changed: true, reason: 'après <head>' };
  }
  return { html, changed: false, reason: 'pas de <head> (ignoré)' };
}

const files = listHtml();
const inc = [], exc = [], blog = [], skip = [];
for (const f of files) {
  const kind = classify(f);
  if (kind.startsWith('exclu')) { exc.push(f); continue; }
  // Blog FR : les pages régénérées par build-blog.ts ont déjà le pixel (skip par idempotence) ;
  // les pages "orphelines" (non régénérées : anciens articles, pages-villes gen_lot) sont injectées ici.
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const r = inject(src);
  if (!r.changed) { skip.push(`${f} (${r.reason})`); continue; }
  (kind.startsWith('blog') ? blog : inc).push(`${f} (${r.reason})`);
  if (COMMIT) writeFileSync(f, r.html);
}

console.log(`\n=== INJECTEUR PIXEL META — ${COMMIT ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'} ===`);
console.log(`Total HTML suivis: ${files.length}`);
console.log(`\n✅ À INJECTER (${inc.length}) :`); inc.forEach(x => console.log('  + ' + x));
console.log(`\n📰 BLOG (généré, via build-blog.ts) (${blog.length}) — non touchés ici`);
console.log(`\n⏭️  DÉJÀ OK / sans <head> (${skip.length}) :`); skip.slice(0, 20).forEach(x => console.log('  · ' + x));
console.log(`\n🚫 EXCLUS internes/test/preview (${exc.length}) :`); exc.forEach(x => console.log('  - ' + x));
console.log(`\n${COMMIT ? 'Écrit.' : 'Aucune écriture (dry-run). Relancer avec --commit pour appliquer.'}`);
