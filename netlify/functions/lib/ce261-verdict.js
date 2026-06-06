/**
 * ce261-verdict.js — Logique PURE de verdict CE 261/2004 à partir des données de vol.
 *
 * Ne fait aucun appel réseau : on lui passe un vol déjà résolu (route, retard, distance,
 * compagnie) et il renvoie un verdict propre, prêt à afficher par le bot WhatsApp.
 *
 * ⚠️ RÈGLE D'OR : on ne prononce JAMAIS un "non" définitif sur la base de l'API seule.
 *   - Si les données manquent ou sont douteuses → 'a_verifier' (un expert tranche).
 *   - Le verdict 'sous_seuil' / 'hors_champ' n'est PAS un rejet : c'est une sortie douce
 *     qui garde le lead (autres droits possibles, vérification humaine).
 *
 * Champ central : delayMin = retard à L'ARRIVÉE en minutes (c'est ce que regarde le CE261).
 *
 * Verdicts possibles :
 *   'eligible'    → vol direct couvert + retard ≥ 3h confirmé → montant ferme
 *   'sous_seuil'  → couvert mais retard < 3h selon données → pas d'indemnité forfaitaire
 *   'hors_champ'  → compagnie non-UE au départ hors-UE → CE261 ne s'applique pas
 *   'a_verifier'  → correspondance, données partielles, annulation, ou doute → expert
 *   'introuvable' → vol non retrouvé dans les données → on garde le déclaratif client
 */
'use strict';

// Compagnies UE/EEE (mêmes que analyze-flight.js). Hors UE notables : TK, PC (Turquie),
// AT (Royal Air Maroc), SV, QR, ET, MS, DL, AA, UA, etc.
const EU_CARRIERS = [
  'AF', 'TO', 'VY', 'FR', 'U2', 'LH', 'KL', 'IB', 'AZ', 'SK', 'LX', 'OS', 'SN', 'TP',
  'EI', 'DY', 'W6', 'HV', 'BT', 'OU', 'OK', 'LO', 'RO', 'A3', 'OA', 'PS', 'DS', 'SS',
];

// Aéroports UE/EEE+CH+UK principaux (UK inclus : conserve la couverture pratique au départ).
const EU_AIRPORTS = [
  'CDG', 'ORY', 'BVA', 'LYS', 'MRS', 'NCE', 'TLS', 'BOD', 'NTE', 'SXB', 'LIL', 'MPL',
  'LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA',
  'AMS', 'EIN', 'RTM',
  'FRA', 'MUC', 'BER', 'HAM', 'DUS', 'CGN', 'STR',
  'MAD', 'BCN', 'PMI', 'AGP', 'ALC', 'VLC', 'LPA', 'TFS', 'SVQ', 'BIO',
  'FCO', 'MXP', 'LIN', 'NAP', 'VCE', 'BGY', 'CTA', 'BLQ',
  'BRU', 'CRL',
  'ZRH', 'GVA', 'BSL',
  'LIS', 'OPO', 'FAO',
  'ATH', 'HER', 'SKG', 'RHO',
  'WAW', 'KRK', 'WMI', 'GDN',
  'PRG', 'VIE', 'BUD', 'BTS',
  'HEL', 'ARN', 'OSL', 'CPH', 'GOT',
  'DUB', 'SNN', 'ORK',
  'RIX', 'TLL', 'VNO',
  'BEG', 'SOF', 'OTP', 'SKP', 'LUX',
];

const up = (s) => String(s || '').trim().toUpperCase();
const isEuCarrier = (iata) => EU_CARRIERS.includes(up(iata));
const isEuAirport = (iata) => EU_AIRPORTS.includes(up(iata));

/**
 * Indemnité forfaitaire par passager (€) selon la distance grand-cercle (km).
 * Retourne 600 par défaut si distance inconnue (route longue diaspora = cas dominant).
 */
function indemnitePerPax(distanceKm) {
  const d = Number(distanceKm);
  if (!d || Number.isNaN(d)) return 600;
  if (d <= 1500) return 250;
  if (d <= 3500) return 400;
  return 600;
}

/**
 * Couverture CE 261/2004 (art. 3§1) :
 *   - vol AU DÉPART d'un aéroport UE → couvert (quelle que soit la compagnie), OU
 *   - vol À DESTINATION de l'UE assuré par une compagnie UE → couvert.
 * Renvoie { covered:boolean, sens:'depuis_ue'|'vers_ue'|'inconnu', raison }.
 */
function coverage(depIata, arrIata, carrierIata) {
  const dep = up(depIata), arr = up(arrIata), car = up(carrierIata);
  if (dep && isEuAirport(dep)) return { covered: true, sens: 'depuis_ue', raison: 'Vol au départ de l’UE' };
  if (arr && isEuAirport(arr)) {
    if (car && isEuCarrier(car)) return { covered: true, sens: 'vers_ue', raison: 'Arrivée UE + compagnie UE' };
    // arrivée UE mais compagnie non-UE (ou inconnue) au départ hors-UE → non couvert
    if (car && !isEuCarrier(car)) return { covered: false, sens: 'vers_ue', raison: 'Arrivée UE mais compagnie non-UE au départ hors-UE' };
    return { covered: null, sens: 'vers_ue', raison: 'Compagnie inconnue : couverture à confirmer' };
  }
  // Ni départ ni arrivée UE détectés → on ne sait pas (codes aéroport non reconnus)
  return { covered: null, sens: 'inconnu', raison: 'Aéroports non reconnus' };
}

/**
 * Verdict principal.
 * @param {object} f  vol résolu : { depIata, arrIata, delayMin, distanceKm, carrierIata, status, typeVol }
 *   typeVol : 'direct' | 'escale' (si 'escale' → toujours 'a_verifier')
 * @returns {object} { verdict, perPax, distanceKm, delayMin, covered, sens, raison, proofLine }
 */
function verdict(f) {
  const o = f || {};
  const depIata = up(o.depIata);
  const arrIata = up(o.arrIata);
  const delayMin = Number.isFinite(o.delayMin) ? Math.max(0, Math.round(o.delayMin)) : null;
  const distanceKm = Number(o.distanceKm) || null;
  const carrierIata = up(o.carrierIata);
  const status = String(o.status || '').toLowerCase();
  const perPax = indemnitePerPax(distanceKm);

  const base = { perPax, distanceKm, delayMin, depIata, arrIata, carrierIata };

  // 0. Correspondance → jamais de verdict auto (c'est l'arrivée finale qui compte).
  if (o.typeVol === 'escale') {
    return { ...base, verdict: 'a_verifier', covered: null, sens: 'inconnu',
      raison: 'Vol avec correspondance : éligibilité calculée par un expert (arrivée finale).' };
  }

  // 1. Annulation détectée dans le statut → besoin du préavis (>14j ?) → expert.
  if (/cancel|annul/.test(status)) {
    return { ...base, verdict: 'a_verifier', covered: null, sens: 'inconnu',
      raison: 'Vol annulé : éligibilité selon le préavis (plus ou moins de 14 jours) → expert.' };
  }

  // 2. Couverture CE261.
  const cov = coverage(depIata, arrIata, carrierIata);
  if (cov.covered === false) {
    return { ...base, verdict: 'hors_champ', covered: false, sens: cov.sens, raison: cov.raison };
  }
  if (cov.covered === null) {
    // doute sur la couverture → on ne ferme pas, expert
    return { ...base, verdict: 'a_verifier', covered: null, sens: cov.sens, raison: cov.raison };
  }

  // 3. Couvert : on regarde le retard à l'arrivée.
  if (delayMin == null) {
    return { ...base, verdict: 'a_verifier', covered: true, sens: cov.sens,
      raison: 'Retard non communiqué par les données : à confirmer.' };
  }
  if (delayMin >= 180) {
    const h = Math.floor(delayMin / 60), m = delayMin % 60;
    return {
      ...base, verdict: 'eligible', covered: true, sens: cov.sens, raison: cov.raison,
      proofLine: `Retard à l’arrivée de ${h}h${String(m).padStart(2, '0')} confirmé par les données de vol.`,
    };
  }
  // Retard < 3h selon les données : pas d'indemnité forfaitaire, mais autres droits possibles.
  return { ...base, verdict: 'sous_seuil', covered: true, sens: cov.sens,
    raison: `Retard à l’arrivée de ${delayMin} min selon les données (sous le seuil des 3h).` };
}

module.exports = { verdict, coverage, indemnitePerPax, isEuCarrier, isEuAirport, EU_CARRIERS, EU_AIRPORTS };
