/**
 * Banc de test pour lib/extract-eticket.js
 *
 *  node railway/test-extract-eticket.js
 *
 *  • MODE OFFLINE (toujours) : vérifie normalize() sur le JSON brut que renvoie le modèle
 *    pour nos 2 e-billets factices → prouve la logique d'intégration SANS clé API.
 *  • MODE LIVE (si OPENAI_API_KEY ou ANTHROPIC_API_KEY est posée) : lit réellement les PDF
 *    ../ebooking-test-AF-3pax.pdf et ../ebooking-test-AF-escale-3pax.pdf et affiche le JSON.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { extractEticket, normalize } = require('./lib/extract-eticket');

let fails = 0;
function check(label, got, expected) {
  const g = JSON.stringify(got), e = JSON.stringify(expected);
  const ok = g === e;
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      attendu: ${e}\n      obtenu : ${g}`}`);
}

// ── Le JSON brut que le modèle renvoie en lisant chacun de nos PDF (vérité terrain) ──
const RAW_DIRECT = {
  vol: 'AF718', compagnie: 'Air France', date: '24/05/2026', pnr: 'RBNAF3',
  depart: 'CDG', arrivee: 'DSS', escale: false,
  segments: [{ vol: 'AF718', depart: 'CDG', arrivee: 'DSS', date: '24/05/2026' }],
  passagers: [
    { nom: 'KODJO', prenom: 'Climbie', date_naissance: '' },
    { nom: 'KODJO', prenom: 'Seyni', date_naissance: '' },
    { nom: 'KODJO', prenom: 'Djibril', date_naissance: '' },
  ],
};
const RAW_ESCALE = {
  vol: 'AF7669', compagnie: 'Air France', date: '24/05/2026', pnr: 'RBNAF2',
  depart: 'MRS', arrivee: 'DSS', escale: true,
  segments: [
    { vol: 'AF7669', depart: 'MRS', arrivee: 'CDG', date: '24/05/2026' },
    { vol: 'AF718', depart: 'CDG', arrivee: 'DSS', date: '24/05/2026' },
  ],
  passagers: [
    { nom: 'KODJO', prenom: 'Climbie' },
    { nom: 'KODJO', prenom: 'Seyni' },
    { nom: 'KODJO', prenom: 'Djibril' },
  ],
};

console.log('\n── MODE OFFLINE : normalize() (aucune clé requise) ──\n');

console.log('Billet DIRECT (CDG → DSS) :');
const d = normalize(RAW_DIRECT);
console.log('  →', JSON.stringify(d));
check('vol', d.vol, 'AF718');
check('pnr', d.pnr, 'RBNAF3');
check('date', d.date, '24/05/2026');
check('route', d.route, 'CDG → DSS');
check('escale', d.escale, false);
check('pax', d.pax, 3);
check('noms', d.passengers.map((p) => p.name), ['CLIMBIE KODJO', 'SEYNI KODJO', 'DJIBRIL KODJO']);

console.log('\nBillet AVEC ESCALE (MRS → CDG → DSS) :');
const e = normalize(RAW_ESCALE);
console.log('  →', JSON.stringify(e));
check('vol (conjonction)', e.vol, 'AF7669 + AF718');
check('pnr', e.pnr, 'RBNAF2');
check('depart', e.depart, 'MRS');
check('arrivee (finale)', e.arrivee, 'DSS');
check('route (chaînée)', e.route, 'MRS → CDG → DSS');
check('escale', e.escale, true);
check('segments', e.segments.length, 2);
check('pax', e.pax, 3);
check('noms', e.passengers.map((p) => p.name), ['CLIMBIE KODJO', 'SEYNI KODJO', 'DJIBRIL KODJO']);

// Multi-pages photographiées : le modèle peut renvoyer un passager EN DOUBLE (présent p.1 et p.2).
// normalize() doit le dédoublonner par nom (et garder la date de naissance si une seule page la porte).
console.log('\nBillet PHOTOGRAPHIÉ EN 2 PAGES (passager en doublon entre les pages) :');
const m = normalize({
  vol: 'AF718', compagnie: 'Air France', date: '24/05/2026', pnr: 'RBNAF3', depart: 'CDG', arrivee: 'DSS',
  segments: [{ vol: 'AF718', depart: 'CDG', arrivee: 'DSS', date: '24/05/2026' }],
  passagers: [
    { nom: 'KODJO', prenom: 'Climbie' },                                  // page 1
    { nom: 'KODJO', prenom: 'Seyni' },                                    // page 1
    { nom: 'KODJO', prenom: 'Climbie', date_naissance: '14/02/1990' },   // page 2 (doublon + DDN)
    { nom: 'KODJO', prenom: 'Djibril' },                                  // page 2
  ],
});
console.log('  →', JSON.stringify(m.passengers));
check('pax dédoublonné', m.pax, 3);
check('noms uniques', m.passengers.map((p) => p.name), ['CLIMBIE KODJO', 'SEYNI KODJO', 'DJIBRIL KODJO']);
check('DDN récupérée sur la page 2', m.passengers[0].dob, '14/02/1990');

console.log(`\n${fails === 0 ? '✅ OFFLINE : tous les champs OK' : `❌ OFFLINE : ${fails} échec(s)`}\n`);

// ── MODE LIVE (optionnel) ──────────────────────────────────────────────────────
(async () => {
  const hasKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasKey) {
    console.log('── MODE LIVE : sauté (pose ANTHROPIC_API_KEY pour lire les vrais PDF) ──\n');
    process.exit(fails === 0 ? 0 : 1);
  }
  console.log('── MODE LIVE : extraction réelle des PDF ──\n');
  const cases = [
    { file: '../ebooking-test-AF-3pax.pdf', label: 'DIRECT' },
    { file: '../ebooking-test-AF-escale-3pax.pdf', label: 'ESCALE' },
  ];
  for (const c of cases) {
    const p = path.join(__dirname, c.file);
    if (!fs.existsSync(p)) { console.log(`  (absent : ${c.file})`); continue; }
    const out = await extractEticket(fs.readFileSync(p), 'application/pdf');
    console.log(`${c.label} — ${c.file}`);
    console.log(out ? JSON.stringify(out, null, 2) : '  NULL (clé invalide ou modèle indispo)');
    console.log('');
  }
  process.exit(fails === 0 ? 0 : 1);
})();
