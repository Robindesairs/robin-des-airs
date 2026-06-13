/**
 * Test de lib/bureau-routines.js (logique pure des postes du Bureau).
 * Lance : node test-bureau-routines.js
 */
'use strict';

const assert = require('assert');
const { computeDeskBriefs, summarizeBureauForOwner, hasActionables } = require('./netlify/functions/lib/bureau-routines');

const NOW = new Date('2026-06-13T08:00:00Z');
const moisCourant = '2026-06';

let pass = 0;
function ok(name, cond, extra) { assert.ok(cond, `${name} ${extra || ''}`); console.log('  ✓', name); pass++; }

const dossiers = [
  // compagnie a payé, pas encore reversé → Karim rouge
  { ref: 'D1', name: 'Awa Sow', statut: 'Payé', indemnite: '600', montantClient: '450', dateDossier: '2026-06-02' },
  { ref: 'D2', name: 'Kofi Mensah', statut: 'Indemnité reçue', indemnite: '600', montantClient: '450', dateDossier: '2026-06-05' },
  // déjà reversé ce mois → gagné ce mois (Nadia / Léa satisfaction)
  { ref: 'D3', name: 'Fatou Ba', statut: 'Payé client', indemnite: '600', montantClient: '450', dateDossier: '2026-06-10' },
  // documents en cours → Léa relance pièces
  { ref: 'D4', name: 'Ali Traoré', statut: 'Documents en cours', indemnite: '600', montantClient: '', dateDossier: '2026-06-11' },
  // engagé simple
  { ref: 'D5', name: 'Moussa Diop', statut: 'LRAR envoyée', indemnite: '600', montantClient: '', dateDossier: '2026-05-20' },
  // bruit test → ignoré partout
  { ref: 'RDA-TEST-9', name: 'Démo Test', statut: 'Payé', indemnite: '600', montantClient: '450', dateDossier: '2026-06-01' },
];
const agences = { actives: 12, prospects: 5, total: 30 };
const legal = { total: 3, counts: { rouge: 1, orange: 1, vert: 1 } };

const briefs = computeDeskBriefs({ now: NOW, dossiers, agences, legal, seuilMensuel: 4 });

console.log('\n— Karim (trésorerie, poste 5) —');
ok('reversements détectés (2, pas le test)', /2 indemnité/.test(briefs[5].top), briefs[5].top);
ok('Karim = rouge', briefs[5].urgence === 'rouge', briefs[5].urgence);
ok('montant à reverser = 900 € (450×2, sans le test)', /900 €/.test(briefs[5].top), briefs[5].top);

console.log('\n— Sofia (partenaires, poste 4) —');
ok('5 agences à contacter', /5 agence/.test(briefs[4].top), briefs[4].top);
ok('Sofia = orange', briefs[4].urgence === 'orange', briefs[4].urgence);
ok('KPI = agences actives (12)', briefs[4].kpi === 12, String(briefs[4].kpi));

console.log('\n— Léa (suivi, poste 6) —');
ok('docs en cours → relance pièces', /documents en cours/i.test(briefs[6].actions.map((a) => a.txt).join(' ')), JSON.stringify(briefs[6].actions));
ok('satisfaction à confirmer (1 gagné ce mois)', /gagné\(s\) ce mois/.test(briefs[6].actions.map((a) => a.txt).join(' ')), '');

console.log('\n— Nadia (rentabilité, poste 8) —');
// D1 (Payé), D2 (Indemnité reçue), D3 (Payé client) sont tous « gagnés » et datés juin → 3/4
ok('3/4 gagnés ce mois (tous statuts gagnés datés juin, hors test)', /3\/4/.test(briefs[8].top), briefs[8].top);
ok('Nadia = orange (sous le seuil mais >0)', briefs[8].urgence === 'orange', briefs[8].urgence);

console.log('\n— Aïcha (DG, poste 0) —');
ok('roll-up cite juridique', /juridique/.test(briefs[0].actions.map((a) => a.txt).join(' ')), '');
ok('roll-up cite reversements', /reversement/.test(briefs[0].actions.map((a) => a.txt).join(' ')), '');
ok('Aïcha = rouge (hérite du plus urgent)', briefs[0].urgence === 'rouge', briefs[0].urgence);

console.log('\n— Brief propriétaire —');
ok('hasActionables = true', hasActionables(briefs) === true);
const msg = summarizeBureauForOwner(briefs, 'Samedi 13 juin 2026');
ok('brief titre Bureau', /Bureau Robin — actions du jour/.test(msg));
ok('brief liste Karim (rouge)', /Karim Benali/.test(msg), '');
ok('brief n’inclut pas les postes verts', !/aucun reversement/i.test(msg));
ok('brief < 1500 chars', msg.length < 1500, `len=${msg.length}`);

console.log('\n— Cas calme (rien à faire) —');
const calmes = computeDeskBriefs({ now: NOW, dossiers: [{ ref: 'X', statut: 'LRAR envoyée', indemnite: '600', dateDossier: '2026-06-09' }], agences: { actives: 55, prospects: 0, total: 55 }, legal: { total: 0, counts: {} }, seuilMensuel: 0 });
ok('aucun actionnable → owner brief « tous à jour »', hasActionables(calmes) === false && /à jour/.test(summarizeBureauForOwner(calmes, 'x')));

console.log(`\n✅ ${pass} assertions OK\n`);
console.log('— Exemple de brief —\n');
console.log(msg);
