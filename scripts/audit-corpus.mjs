#!/usr/bin/env node
/**
 * Audit du corpus publie : regarde les PAGES HTML, pas les sources markdown.
 *
 * Raison d'etre : 92 des 256 pages du blog n'ont pas de source markdown. Tout
 * controle qui ne scanne que src/content/blog/ est donc aveugle sur plus d'un
 * tiers du site. C'est ce qui a permis, le 19/07/2026, de publier un article
 * qui doublait un article existant.
 *
 *   node scripts/audit-corpus.mjs            audit complet
 *   node scripts/audit-corpus.mjs "sujet"    verifie si un sujet est deja traite
 *                                            AVANT d'ecrire un nouvel article
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const DIRS = ['blog', 'en/blog'];
const SRC = 'src/content/blog';

const strip = (h) =>
  h.replace(/<script[\s\S]*?<\/script>/gi, ' ')
   .replace(/<style[\s\S]*?<\/style>/gi, ' ')
   .replace(/<[^>]+>/g, ' ')
   .replace(/&[a-z]+;|&#\d+;/gi, ' ')
   .replace(/\s+/g, ' ')
   .trim();

function corpus() {
  const out = [];
  for (const d of DIRS) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => x.endsWith('.html'))) {
      const path = join(d, f);
      const html = readFileSync(path, 'utf8');
      const slug = basename(f, '.html');
      out.push({
        path,
        slug,
        lang: d.startsWith('en') ? 'en' : 'fr',
        title: (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1],
        text: strip(html),
        html,
        hasSource: existsSync(join(SRC, `${slug}.md`)),
      });
    }
  }
  return out;
}

/** Affirmations juridiques trop absolues. Chaque motif a coute une correction reelle. */
const RISQUES = [
  [/technique[^.]{0,70}n'est jamais une circonstance extraordinaire/i,
   "« jamais » : une cause exterieure (oiseau, debris, foudre, vice cache) EST extraordinaire"],
  [/rotation[^.]{0,90}(toujours indemnis|jamais une circonstance)/i,
   "l'exoneration peut remonter la rotation (CJUE C-74/19, C-826/19)"],
  [/(indemnit[ée]|indemnisation)[^.]{0,40}(toujours|automatiquement) due/i,
   "aucune indemnisation n'est automatique : la compagnie peut prouver 3 choses"],
  [/Excuses valables[^.]{0,140}contr[ôo]leurs a[ée]riens\s*\.(?!\s*M[êe]me)/i,
   "omet que meme une circonstance extraordinaire exige des mesures raisonnables"],
];

const pages = corpus();
const arg = process.argv[2];

if (arg) {
  // Mode « ce sujet est-il deja traite ? », a lancer AVANT d'ecrire.
  const mots = arg.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored = pages
    .map((p) => {
      const hay = `${p.slug} ${p.title}`.toLowerCase();
      const body = p.text.toLowerCase();
      const s = mots.reduce(
        (n, w) => n + (hay.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0);
      return { ...p, s };
    })
    .filter((p) => p.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 10);

  console.log(`\nSujet recherche : « ${arg} »`);
  console.log(`${pages.length} pages publiees examinees\n`);
  if (!scored.length) {
    console.log('  Aucune page proche. Le sujet semble libre.\n');
  } else {
    console.log(`  ${'score'.padEnd(7)}${'lang'.padEnd(6)}${'source'.padEnd(9)}page`);
    for (const p of scored) {
      console.log(`  ${String(p.s).padEnd(7)}${p.lang.padEnd(6)}${(p.hasSource ? 'md' : 'ORPHELIN').padEnd(9)}${p.slug.slice(0, 56)}`);
    }
    console.log('\n  Un score eleve = risque de cannibalisation. Fusionner plutot qu\'ajouter.\n');
  }
  process.exit(0);
}

// Audit complet
const orph = pages.filter((p) => !p.hasSource);
console.log(`\n=== CORPUS ===`);
console.log(`  pages publiees        : ${pages.length}`);
console.log(`  sans source markdown  : ${orph.length}  (invisibles aux outils bases sur src/)`);

console.log(`\n=== HYGIENE ===`);
const noCanon = pages.filter((p) => !p.html.includes('rel="canonical"'));
const noLd = pages.filter((p) => !p.html.includes('application/ld+json'));
const thin = pages.filter((p) => p.text.split(' ').length < 600);
console.log(`  sans canonical        : ${noCanon.length}`);
console.log(`  sans donnees structurees : ${noLd.length}`);
console.log(`  moins de 600 mots     : ${thin.length}`);
for (const p of thin.slice(0, 5)) console.log(`      ${p.slug.slice(0, 60)}`);

console.log(`\n=== AFFIRMATIONS JURIDIQUES A RISQUE ===`);
let n = 0;
for (const [re, why] of RISQUES) {
  const hits = pages.filter((p) => re.test(p.text));
  if (!hits.length) continue;
  n += hits.length;
  console.log(`\n  ${hits.length} page(s) : ${why}`);
  for (const p of hits.slice(0, 6)) console.log(`      ${p.lang}  ${p.slug.slice(0, 58)}`);
}
if (!n) console.log('  aucune');

console.log(`\n=== DOUBLONS DE TITRE ===`);
const byTitle = new Map();
for (const p of pages.filter((x) => x.lang === 'fr')) {
  const k = p.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 45);
  if (!k) continue;
  byTitle.set(k, [...(byTitle.get(k) || []), p.slug]);
}
const dups = [...byTitle.values()].filter((v) => v.length > 1);
console.log(`  ${dups.length} groupe(s)`);
for (const g of dups.slice(0, 5)) console.log(`      ${g.join('  |  ')}`);

console.log(`\n=== LIENS INTERNES MORTS ===`);
let dead = 0;
for (const p of pages) {
  for (const m of p.html.matchAll(/href=["'](\/(?:en\/)?blog\/[^"'#?]+)["']/g)) {
    let t = m[1].replace(/^\//, '');
    if (!t.endsWith('.html')) t += '.html';
    if (!existsSync(t)) { console.log(`      ${p.slug.slice(0, 40)} -> ${m[1]}`); dead++; }
  }
}
console.log(`  ${dead} lien(s) mort(s)`);
console.log();
process.exit(n > 0 || dead > 0 ? 1 : 0);
