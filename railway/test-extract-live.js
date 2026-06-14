/**
 * Test VISION RÉEL (nécessite OPENAI_API_KEY ou ANTHROPIC_API_KEY dans l'environnement).
 * Lit les 3 faux billets PDF avec le vrai modèle → compare à la vérité-terrain
 * (PNR, route, escale, passagers, MINEUR). Mesure aussi la latence.
 *
 *   export $(grep -vE '^#|^$' railway/.env | xargs) && node railway/test-extract-live.js
 *   (ou depuis railway/ :  env $(grep -vE '^#|^$' .env | xargs) node test-extract-live.js )
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { extractEticket } = require('./lib/extract-eticket');

if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Aucune clé (OPENAI_API_KEY / ANTHROPIC_API_KEY) dans l\'environnement. Pose-la dans railway/.env puis relance avec :\n   env $(grep -vE "^#|^$" railway/.env | xargs) node railway/test-extract-live.js');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..');
const CASES = [
  { file: 'ebooking-test-AF-3pax.pdf', truth: { pnr: 'RBNAF3', route: 'CDG → DSS', escale: false, pax: 3, minors: 0, noms: ['KODJO'] } },
  { file: 'ebooking-test-AF-escale-3pax.pdf', truth: { pnr: 'RBNAF2', route: 'MRS → CDG → DSS', escale: true, pax: 3, minors: 0, noms: ['KODJO'] } },
  { file: 'ebooking-test-3pax.pdf', truth: { pnr: 'RBN3PX', route: 'DSS → BRU', escale: false, pax: 3, minors: 1, noms: ['DIALLO'] } },
];

(async () => {
  let pass = 0, total = 0; const check = (c, m) => { total++; if (c) { pass++; console.log('    ✓ ' + m); } else console.log('    ✗ ' + m); };
  for (const c of CASES) {
    const bytes = fs.readFileSync(path.join(ROOT, c.file));
    console.log(`\n📄 ${c.file}`);
    const t0 = Date.now();
    let r; try { r = await extractEticket(bytes, 'application/pdf'); } catch (e) { console.log('    ❌ extraction a jeté : ' + e.message); continue; }
    const ms = Date.now() - t0;
    if (!r) { console.log(`    ❌ extraction = null (lisible=?, ${ms} ms)`); continue; }
    const minors = (r.passengers || []).filter((p) => p.minor).length;
    console.log(`    → ${ms} ms · PNR=${r.pnr} · route=${r.route} · escale=${r.escale} · pax=${r.pax} · mineurs=${minors} · lisible=${r.lisible} (conf ${r.confidence})`);
    console.log(`      passagers: ${(r.passengers || []).map((p) => p.name + (p.minor ? ' [MINEUR]' : '')).join(' | ')}`);
    check(r.pnr === c.truth.pnr, `PNR = ${c.truth.pnr}`);
    check(r.route === c.truth.route, `route = ${c.truth.route}`);
    check(!!r.escale === c.truth.escale, `escale = ${c.truth.escale}`);
    check(r.pax === c.truth.pax, `pax = ${c.truth.pax}`);
    check(minors === c.truth.minors, `mineurs = ${c.truth.minors}` + (c.truth.minors ? ' (détection « Enfant » sans DDN)' : ''));
    check((r.passengers || []).every((p) => c.truth.noms.some((n) => p.name.toUpperCase().includes(n))), `noms de famille cohérents (${c.truth.noms.join('/')})`);
  }
  console.log(`\n${pass === total ? '✅' : '⚠️'} Vision réelle : ${pass}/${total} vérifications OK`);
  process.exit(pass === total ? 0 : 1);
})();
