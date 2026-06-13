/**
 * Tests garde-fous Netlify (pur Node, hors dossier functions pour ne pas être déployé) :
 *  A) doc-filename : unicité des noms de fichiers pour familles diaspora (même nom/vol) + sécurité.
 *  B) submit-mandat : branches de validation (405/400) AVANT tout effet de bord.
 *   node test-mandat-guards.js
 */
'use strict';
const { nomFichierCompagnie } = require('./netlify/functions/lib/doc-filename');

let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

console.log('\n── A. doc-filename : unicité familles diaspora + sécurité ──');
const fam = [
  { nom: 'Diallo', prenom: 'Aminata', vol: 'AF718', ref: 'RDA-20260613-A3F2' },
  { nom: 'Diallo', prenom: 'Ousmane', vol: 'AF718', ref: 'RDA-20260613-B7K9' },
  { nom: 'Diallo', prenom: 'Fatou', vol: 'AF718', ref: 'RDA-20260613-C1M4' },
];
const names = fam.map((d) => nomFichierCompagnie(d, 'mandat'));
ok(new Set(names).size === 3, 'famille même nom/vol → 3 fichiers distincts (prénom + CODE)');
ok(nomFichierCompagnie({ nom: 'Ba', prenom: 'Mariam', vol: 'AF718', ref: 'RDA-1-XXXX' }) !== nomFichierCompagnie({ nom: 'Ba', prenom: 'Mariam', vol: 'AF718', ref: 'RDA-2-YYYY' }), 'homonymes parfaits → distincts par le CODE');
const safe = nomFichierCompagnie({ nom: "N'Diaye", prenom: 'awa fatou', vol: 'af 718', ref: 'rda-x-9z8é' }, 'med');
ok(/^[A-Za-z0-9.\-]+\.pdf$/.test(safe), 'caractères sûrs (pas d\'accent/apostrophe/espace) : ' + safe);
const set = new Set(); let dup = 0;
const SUR = ['DIALLO', 'NDIAYE', 'BA', 'KEITA', 'TOURE', 'SOW', 'CISSE'], PRE = ['Awa', 'Moussa', 'Fatou', 'Ibrahima', 'Mariam', 'Cheikh'];
for (let i = 0; i < 300; i++) { const f = nomFichierCompagnie({ nom: SUR[i % SUR.length], prenom: PRE[(i * 3) % PRE.length], vol: 'AF' + (700 + (i % 9)), ref: 'RDA-2026-' + i.toString(36).toUpperCase().padStart(5, '0') }); if (set.has(f)) dup++; set.add(f); }
ok(dup === 0, `300 dossiers (réfs uniques) → ${dup} collision(s)`);
console.log('  ℹ️ risque résiduel connu : 2 réfs au MÊME suffixe 4-car → collision (rare, allonger le CODE si besoin).');

console.log('\n── B. submit-mandat : garde-fous (sans effet de bord) ──');
(async () => {
  const { handler } = require('./netlify/functions/submit-mandat');
  const ev = (m, b) => ({ httpMethod: m, headers: { 'x-forwarded-for': '9.9.9.9', 'user-agent': 't' }, body: b === undefined ? undefined : (typeof b === 'string' ? b : JSON.stringify(b)) });
  const call = async (m, b) => { const r = await handler(ev(m, b)); let j = {}; try { j = JSON.parse(r.body || '{}'); } catch (_) {} return { code: r.statusCode, err: j.error || '' }; };
  ok((await call('GET')).code === 405, 'GET → 405');
  const r2 = await call('POST', '{bad'); ok(r2.code === 400 && /JSON/i.test(r2.err), 'corps JSON invalide → 400');
  const r3 = await call('POST', {}); ok(r3.code === 400 && /ref|whatsapp/i.test(r3.err), 'ref+whatsapp manquants → 400');
  const r4 = await call('POST', { ref: 'RDA-x', whatsapp: '+221770000000' }); ok(r4.code === 400 && /vol|compagnie/i.test(r4.err), 'vol+compagnie manquants → 400 « ' + r4.err + ' »');
  console.log(`\n${fail === 0 ? '✅ TOUS LES TESTS PASSENT' : '❌ ' + fail + ' échec(s)'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
