/**
 * Test de la logique « Cabinet Me Lefèvre » (netlify/functions/lib/legal-pipeline.js).
 * Logique pure, sans réseau. Lance : node test-legal-pipeline.js
 */
'use strict';

const assert = require('assert');
const {
  buildLegalQueue, evaluateDossier, summarizeForOwner, defaultThresholds,
} = require('./netlify/functions/lib/legal-pipeline');
const { getAirlineClaim, airlineIataFromFlight } = require('./netlify/functions/lib/airlines-claims');
const { africanDepartureFromRoute } = require('./netlify/functions/lib/airport-coords');

function getAirline(x) {
  const a = getAirlineClaim(x);
  if (!a) return null;
  return { ...a, iata: airlineIataFromFlight(String(x || '').toUpperCase().replace(/\s/g, '')) || '' };
}

const NOW = new Date('2026-06-13T08:00:00Z');
const T = defaultThresholds();
const ctx = { now: NOW, thresholds: T, getAirline, africanDeparture: africanDepartureFromRoute };

// Helpers dates relatives à NOW
function daysAgo(n) { return new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10); }
function fr(dateIso) { const [y, m, d] = dateIso.split('-'); return `${d}/${m}/${y}`; }

let pass = 0;
function ok(name, cond, extra) { assert.ok(cond, `${name} ${extra || ''}`); console.log('  ✓', name); pass++; }

console.log('\n— evaluateDossier (cas unitaires) —');

// 1. Mandat signé récent (J+2) → préparer MED, vert
let it = evaluateDossier({ ref: 'RDA-1', name: 'Awa Sow', statut: 'Mandat signé', vol: 'AF718', compagnie: 'Air France', route: 'Dakar (DSS) → Paris (CDG)', dateVol: daysAgo(40), dateDossier: daysAgo(2) }, ctx);
ok('signé J+2 = vert + MED à préparer', it.urgence === 'vert' && /Préparer la mise en demeure/.test(it.action), JSON.stringify(it.action));

// 2. Mandat signé J+8 → SLA dépassé → rouge
it = evaluateDossier({ ref: 'RDA-2', statut: 'Mandat signé', vol: 'AF718', dateVol: daysAgo(60), dateDossier: daysAgo(8) }, ctx);
ok('signé J+8 = rouge (SLA 5j dépassé)', it.urgence === 'rouge', it.urgence);

// 3. Mandat signé + MED déjà générée (remarque) → orange, "envoyer"
it = evaluateDossier({ ref: 'RDA-3', statut: 'Mandat signé', vol: 'AF718', dateVol: daysAgo(60), dateDossier: daysAgo(3), remarques: `MED générée ${daysAgo(1)} — à valider` }, ctx);
ok('signé + MED générée = orange + envoyer', it.urgence === 'orange' && /Envoyer la mise en demeure/.test(it.action), it.action);

// 4. LRAR envoyée, MED il y a 5 j → suivi, vert (cadence dérivée de dossier-state : J+15/30/62)
it = evaluateDossier({ ref: 'RDA-4', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(60), dateDossier: daysAgo(20), remarques: `MED générée ${daysAgo(5)}` }, ctx);
ok('LRAR +5j = vert (suivi)', it.urgence === 'vert' && /Suivre/.test(it.action), it.action);

// 5. LRAR, MED il y a 20 j → relance 1, orange (J+15)
it = evaluateDossier({ ref: 'RDA-5', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(80), dateDossier: daysAgo(40), remarques: `MED générée ${daysAgo(20)}` }, ctx);
ok('LRAR +20j = orange (relance)', it.urgence === 'orange' && /Relancer la compagnie/.test(it.action), it.action);

// 6. LRAR, MED il y a 40 j → relance 2 ferme, orange (J+30)
it = evaluateDossier({ ref: 'RDA-6', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(120), dateDossier: daysAgo(55), remarques: `MED générée ${daysAgo(40)}` }, ctx);
ok('LRAR +40j = orange (relance 2 ferme)', it.urgence === 'orange' && /Relance 2/.test(it.action), it.action);

// 7. LRAR, MED il y a 70 j → escalade NEB, rouge (J+62)
it = evaluateDossier({ ref: 'RDA-7', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(200), dateDossier: daysAgo(90), remarques: `MED générée ${daysAgo(70)}` }, ctx);
ok('LRAR +70j = rouge (escalade NEB)', it.urgence === 'rouge' && /Escalade NEB/.test(it.action), it.action);
ok('escalade NEB cite la DGAC (AF=FR)', /DGAC/.test(it.action), it.action);

// 8. LRAR, MED il y a 100 j → contentieux, rouge (J+90)
it = evaluateDossier({ ref: 'RDA-7b', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(300), dateDossier: daysAgo(120), remarques: `MED générée ${daysAgo(100)}` }, ctx);
ok('LRAR +100j = rouge (contentieux)', it.urgence === 'rouge' && /contentieux/i.test(it.action), it.action);

// 8. Refus (non définitif) → escalade NEB, rouge
it = evaluateDossier({ ref: 'RDA-8', statut: 'Refus', vol: 'AF718', dateVol: daysAgo(100), dateDossier: daysAgo(60) }, ctx);
ok('Refus = rouge (escalade NEB)', it.urgence === 'rouge' && /Escalade NEB/.test(it.action), it.action);

// 9. Prescription imminente (vol il y a ~5 ans - 30 j) → rouge + mention prescription
const presVol = new Date(NOW.getTime()); presVol.setUTCFullYear(presVol.getUTCFullYear() - 5); presVol.setUTCDate(presVol.getUTCDate() + 30);
it = evaluateDossier({ ref: 'RDA-9', statut: 'Mandat signé', vol: 'AF718', dateVol: presVol.toISOString().slice(0, 10), dateDossier: daysAgo(1) }, ctx);
ok('prescription <90j = rouge', it.urgence === 'rouge', it.urgence);
ok('prescription dans le détail', /[Pp]rescription/.test(it.detail) && it.prescription.joursRestants <= T.prescriptionAlertDays, JSON.stringify(it.prescription));

// 10. Non-UE au départ d'Afrique → alerte bloquant éligibilité
it = evaluateDossier({ ref: 'RDA-10', statut: 'Mandat signé', vol: 'TK500', compagnie: 'Turkish Airlines', route: 'Dakar (DSS) → Istanbul (IST)', dateVol: daysAgo(30), dateDossier: daysAgo(8) }, ctx);
ok('non-UE départ Afrique = alerte bloquant', it.alerte && it.alerte.niveau === 'bloquant', JSON.stringify(it.alerte));
ok('non-UE bloquant n’est pas escaladé en rouge', it.urgence !== 'rouge', it.urgence);

// 11. Terminal → exclu (null)
ok('Payé client = null (terminal)', evaluateDossier({ ref: 'RDA-11', statut: 'Payé client' }, ctx) === null);
// 12. Amont → exclu (null)
ok('Signature en attente = null (amont)', evaluateDossier({ ref: 'RDA-12', statut: 'Signature en attente' }, ctx) === null);

console.log('\n— buildLegalQueue (file + tri + exclusions) —');
const records = [
  { ref: 'RDA-A', statut: 'Mandat signé', vol: 'AF718', dateVol: daysAgo(40), dateDossier: daysAgo(2) },
  { ref: 'RDA-B', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(200), dateDossier: daysAgo(90), remarques: `MED générée ${daysAgo(70)}` },
  { ref: 'RDA-C', statut: 'Payé client', vol: 'AF718' },
  { ref: 'RDA-TEST-1', name: 'Test Démo', statut: 'Mandat signé', vol: 'AF718', dateVol: daysAgo(60), dateDossier: daysAgo(9) },
  { ref: 'RDA-D', name: 'exemple', statut: 'LRAR envoyée', vol: 'AF718', dateVol: daysAgo(60), dateDossier: daysAgo(20) },
];
const q = buildLegalQueue(records, ctx);
ok('exclut terminal + test/démo (2 restants)', q.total === 2, `total=${q.total}`);
ok('tri urgence : rouge en tête', q.items[0].urgence === 'rouge', q.items[0].urgence);
ok('compteurs cohérents', q.counts.total === 2 && (q.counts.rouge + q.counts.orange + q.counts.vert + q.counts.info) === 2, JSON.stringify(q.counts));

console.log('\n— summarizeForOwner (brief WhatsApp) —');
const msg = summarizeForOwner(q, 'Samedi 13 juin 2026');
ok('brief contient l’en-tête cabinet', /Cabinet Me Lefèvre/.test(msg));
ok('brief liste l’action urgente', /Escalade NEB|À TRAITER/.test(msg));
ok('brief < 1500 chars', msg.length < 1500, `len=${msg.length}`);

console.log(`\n✅ ${pass} assertions OK\n`);
console.log('— Exemple de brief —\n');
console.log(msg);
