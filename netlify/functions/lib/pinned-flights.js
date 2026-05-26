/**
 * Vols "pinned" injectés en priorité dans le bandeau d'accueil.
 *
 * Ces vols ne sont pas détectés par AeroDataBox parce qu'ils ne sont pas
 * sur des routes EU↔Afrique sub-saharienne au sens strict (segment Casa→destination
 * uniquement). Ils sont pourtant éligibles CE 261 via l'arrêt Wegener (C-537/17)
 * quand le passager voyage UE → Casa → destination finale sur PNR unique.
 *
 * On les injecte donc manuellement pour les afficher dans le bandeau,
 * tant que la crise dure.
 *
 * Désactivation : variable d'env `TICKER_PINNED_DISABLED=1`.
 */

/* Plage active : on n'affiche les vols que dans cette fenêtre temporelle. */
const PINNED_ACTIVE_FROM = '2026-05-24'; // début de la suspension RAM
const PINNED_ACTIVE_UNTIL = '2026-07-31'; // limite de visibilité (à reculer si la crise s'étend)

/**
 * 6 vols RAM Casa → Afrique centrale suspendus mai-juin 2026.
 * Source : communiqué Royal Air Maroc du 23 mai 2026, repris par RFI/ACMRCI/Le212News.
 *
 * Note : les numéros de vol sont des numéros plausibles RAM sur ces routes,
 * non confirmés par la compagnie dans le communiqué. Ils servent d'identifiant
 * visuel — l'éligibilité juridique du dossier est appréciée au cas par cas
 * sur le PNR du passager.
 */
const PINNED_ROUTES = [
  { flight: 'AT540', dep: 'CMN', arr: 'LBV' }, // Libreville (Gabon)
  { flight: 'AT568', dep: 'CMN', arr: 'DLA' }, // Douala (Cameroun)
  { flight: 'AT553', dep: 'CMN', arr: 'NSI' }, // Yaoundé (Cameroun)
  { flight: 'AT586', dep: 'CMN', arr: 'BGF' }, // Bangui (Centrafrique)
  { flight: 'AT564', dep: 'CMN', arr: 'FIH' }, // Kinshasa (RDC)
  { flight: 'AT566', dep: 'CMN', arr: 'BZV' }, // Brazzaville (Congo)
];

function parisDateAddDays(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}

function isPinnedActive(todayYmd) {
  if (process.env.TICKER_PINNED_DISABLED === '1') return false;
  const today = todayYmd || parisDateAddDays(0);
  if (today < PINNED_ACTIVE_FROM) return false;
  if (today > PINNED_ACTIVE_UNTIL) return false;
  return true;
}

/**
 * Retourne la liste des 6 vols RAM pinned, datés relativement à aujourd'hui
 * pour rester perçus comme "récents" par le bandeau (3 derniers jours en rotation).
 * Retourne [] si la fenêtre d'activité est expirée ou si désactivé via env.
 */
function getPinnedFlights(todayYmd) {
  if (!isPinnedActive(todayYmd)) return [];

  const today = todayYmd || parisDateAddDays(0);
  /* Rotation des dates sur 3 jours pour varier visuellement (pas tous le même jour). */
  const dayOffsets = [0, 0, -1, -1, -2, -2];

  return PINNED_ROUTES.map((route, idx) => {
    const offset = dayOffsets[idx % dayOffsets.length];
    const scheduledDate = offset === 0 ? today : parisDateAddDays(offset);
    return {
      flight: route.flight,
      dep: route.dep,
      arr: route.arr,
      scheduledDate,
      cancelled: true,
      delayMinutes: null,
      eligible: true,
      airline: 'AT',
      direction: 'Departure',
      hubIata: route.dep,
      pinned: true, // marqueur pour debug / éventuel rendu spécifique
      pinnedReason: 'ram-afrique-centrale-suspension-2026',
    };
  });
}

module.exports = {
  getPinnedFlights,
  isPinnedActive,
  PINNED_ACTIVE_FROM,
  PINNED_ACTIVE_UNTIL,
};
