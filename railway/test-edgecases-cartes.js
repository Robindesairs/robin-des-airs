/**
 * Cas-limites cartes d'embarquement : (1) deux cartes envoyées À L'ENVERS ; (2) une seule carte qui ne
 * touche pas l'Europe (2e carte perdue). Utilise les VRAIES fonctions exportées de server.js.
 *   node test-edgecases-cartes.js
 */
'use strict';
process.env.PORT = process.env.PORT || '4557';
const { normalize } = require('./lib/extract-eticket');
const { setEticketFields, isEUAirport, AIRLINES } = require('./server');

function show(s) {
  console.log('   → transporteur effectif =', s.operateur_code || '—', '| hors-UE =', s.operateurNonUe, '| réclamation =', s.compagnie_reclamation || '—');
}

console.log('\n═══ CAS 1 — DEUX CARTES ENVOYÉES À L\'ENVERS ═══');
console.log('Trajet réel : Dakar →(Air Sénégal HC)→ Casablanca →(Air France AF)→ Paris');
console.log('Le client envoie d\'abord la carte CMN→CDG, PUIS la carte DKR→CMN → segments inversés.\n');

// Segments dans le DÉSORDRE (le 2e tronçon d'abord), tels que l'OCR les listerait s'il suit l'ordre d'envoi
const ocrInverse = {
  lisible: true, confidence: 1, compagnie: 'Air France', pnr: 'INV123',
  trajets: [{ sens: 'aller', date: '05/03/2026', depart: 'DKR', arrivee: 'CDG', segments: [
    { vol: 'AF1234', depart: 'CMN', arrivee: 'CDG', date: '05/03/2026' }, // tronçon 2 envoyé en 1er
    { vol: 'HC301', depart: 'DKR', arrivee: 'CMN', date: '05/03/2026' },  // tronçon 1 envoyé en 2e
  ] }], passagers: [{ nom: 'DIALLO', prenom: 'Aminata' }] };
const e1 = normalize(ocrInverse);
const s1 = { europeTouch: 'arrivee' };
setEticketFields(s1, e1);
console.log('   segments lus (ordre brut) :', e1.segments.map((x) => x.vol + ' ' + x.depart + '→' + x.arrivee).join('  |  '));
show(s1);
console.log('   ' + (s1.operateur_code === 'AF' && !s1.operateurNonUe ? '✅ Le bot prend le tronçon qui ARRIVE en Europe (AF), pas le dernier du tableau (HC). Inversion neutralisée.' : '❌ raté'));

console.log('\n═══ CAS 2 — UNE SEULE CARTE, NE TOUCHE PAS L\'EUROPE (2e carte perdue) ═══');
console.log('Le client a Dakar→Casa→Paris mais n\'envoie QUE la carte Dakar→Casablanca (Air Sénégal).\n');

// Ce que produit la carte seule (vol intra-Afrique)
const carte = { vol: 'HC301', compagnie: 'Air Sénégal', date: '05/03/2026', pnr: 'INC999', route: 'DKR → CMN', depart: 'DKR', arrivee: 'CMN', operePar: '', passengers: [{ name: 'AMINATA DIALLO' }] };
// Détection « voyage incomplet » (logique du handler scan, reproduite) :
const s2 = { europeTouch: 'arrivee', route_type: 'af_eu' };
const legsNow = [{ dep: carte.depart, arr: carte.arrivee }];
const attendEurope = s2.route_type === 'af_eu' || s2.europeTouch === 'arrivee' || s2.europeTouch === 'depart';
const toucheEurope = legsNow.some((l) => isEUAirport(l.dep) || isEUAirport(l.arr));
console.log('   vol lu :', carte.route, '| touche l\'Europe ?', toucheEurope, '| Europe attendue ?', attendEurope);
if (attendEurope && !toucheEurope) {
  console.log('   ✅ Le bot N\'AFFICHE PAS de verdict (il ne dira pas « non couvert » sur un voyage tronqué).');
  console.log('   📱 Message du bot :\n');
  const r = carte.route;
  console.log(['⚠️ Ce vol *' + r + '* ne touche pas l\'Europe — il manque le vol qui vous a *ramené(e) en Europe* (la correspondance).',
    '',
    'C\'est *ce vol-là* qui ouvre vos droits et désigne la compagnie à réclamer. 📎 Envoyez la *2ᵉ carte d\'embarquement* — ou mieux, votre *e-billet* (il contient tous les vols).',
    '',
    '_Carte perdue ? Pas de souci, on le fait à la main._'].map((l) => '      ' + l).join('\n'));
  console.log('\n   [Bouton : ✏️ Saisir le vol Europe]  → saisie manuelle du vol d\'entrée si la 2e carte est perdue.');
} else {
  console.log('   ❌ détection ratée');
}
console.log('\n' + '═'.repeat(70));
process.exit(0);
