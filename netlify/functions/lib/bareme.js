/**
 * bareme.js — Barème d'indemnisation CE 261/2004 selon la distance/route.
 *
 *   ≤ 1 500 km                          → 250 €  (rare en Afrique–Europe)
 *   1 500–3 500 km (Maghreb)            → 400 €  (Maroc / Algérie / Tunisie)
 *   > 3 500 km (Afrique subsaharienne)  → 600 €
 *
 * Heuristique par ville/aéroport : si la route mentionne une ville du Maghreb
 * → 400 € ; sinon on garde le montant fourni (subsaharien = 600 € par défaut).
 *
 * ⚠️ Garder la liste MAGHREB synchro avec la version inline de mandat.html
 *    (fonction baremeIndemnitePerPax).
 *
 *   const { indemnitePerPax } = require('./lib/bareme');
 *   indemnitePerPax('Casablanca', 'Paris', '', 600);  // -> 400
 *   indemnitePerPax('', '', 'Dakar → Paris', 600);    // -> 600
 */
'use strict';

const MAGHREB = [
  // Maroc
  'maroc', 'morocco', 'casablanca', 'marrakech', 'rabat', 'fes', 'tanger', 'tangier',
  'agadir', 'oujda', 'nador', 'tetouan', 'essaouira', 'ouarzazate',
  // Algérie
  'algerie', 'algeria', 'alger', 'algiers', 'oran', 'constantine', 'annaba',
  'tlemcen', 'setif', 'bejaia',
  // Tunisie
  'tunisie', 'tunisia', 'tunis', 'monastir', 'djerba', 'sfax', 'tozeur', 'gabes', 'enfidha',
];

/**
 * Retourne l'indemnité légale par passager (€) selon la route.
 * @param {string} dep   ville/aéroport de départ
 * @param {string} arr   ville/aéroport d'arrivée
 * @param {string} route chaîne route libre (ex. "Dakar → Paris")
 * @param {number} fallback montant si non-Maghreb (défaut 600)
 * @returns {number}
 */
function indemnitePerPax(dep, arr, route, fallback) {
  const fb = (typeof fallback === 'number' && fallback > 0) ? fallback : 600;
  const hay = ' ' + (String(dep || '') + ' ' + String(arr || '') + ' ' + String(route || ''))
    .toLowerCase().replace(/[éèê]/g, 'e').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  for (let i = 0; i < MAGHREB.length; i++) {
    if (hay.indexOf(' ' + MAGHREB[i] + ' ') !== -1) return 400;
  }
  return fb;
}

module.exports = { indemnitePerPax, MAGHREB };
