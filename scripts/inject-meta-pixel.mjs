#!/usr/bin/env node
/**
 * Injecte le CHARGEUR DE CONSENTEMENT (/assets/consent.js) dans le <head> des pages
 * PUBLIQUES. Depuis la mise en conformité CNIL/ePrivacy (juillet 2026), le pixel Meta
 * et la balise Google Ads ne sont PLUS injectés en dur : ils sont chargés uniquement
 * APRÈS consentement, par assets/consent.js. Ce script pose donc le <script consent.js>,
 * jamais les traceurs eux-mêmes.
 *
 * ⚠️ NE JAMAIS réintroduire le pixel brut ici : ce serait un dépôt de traceur sans
 *    consentement (manquement art. 82 loi Informatique & Libertés / ePrivacy).
 *
 * - Dry-run par défaut ; `node scripts/inject-meta-pixel.mjs --commit` pour écrire.
 * - Idempotent : saute toute page contenant déjà "/assets/consent.js".
 * - Exclut back-office / outils / tests / previews (DENY ci-dessous).
 *
 * Le blog FR racine (blog/) est GÉNÉRÉ → le tag consent.js est posé dans le générateur
 * (src/scripts/build-blog.ts), pas par ce script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const COMMIT = process.argv.includes('--commit');

// Tag canonique : charge la bannière de consentement + les traceurs gatés (assets/consent.js).
export const PIXEL_SNIPPET = `<!-- Traceurs publicitaires (Meta Pixel + Google Ads) : chargés UNIQUEMENT après consentement, cf. /assets/consent.js -->
<script defer src="/assets/consent.js"></script>
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
  if (/\/assets\/consent\.js/.test(html)) return { html, changed: false, reason: 'déjà présent' };
  // Juste après l'ouverture <head> (le plus tôt possible pour afficher la bannière).
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
