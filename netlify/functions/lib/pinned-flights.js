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
 * 6 routes RAM UE → Casa → Afrique centrale suspendues mai-juin 2026.
 * Source : communiqué Royal Air Maroc du 23 mai 2026, repris par RFI/ACMRCI/Le212News.
 *
 * Format Wegener : on affiche la route complète UE → CMN → destination car
 * c'est cette route (sur PNR unique) qui ouvre l'éligibilité CE 261 via
 * l'arrêt CJUE Wegener (C-537/17). Le `dep` est un hub UE (Paris-CDG) pour
 * passer le filtre bandeau EU↔Afrique. Le `via` (CMN) est affiché dans le
 * chip pour montrer la correspondance.
 */
const PINNED_ROUTES = [
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'LBV' }, // Libreville (Gabon)
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'DLA' }, // Douala (Cameroun)
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'NSI' }, // Yaoundé (Cameroun)
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'BGF' }, // Bangui (Centrafrique)
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'FIH' }, // Kinshasa (RDC)
  { flight: 'RAM', depEu: 'CDG', via: 'CMN', arr: 'BZV' }, // Brazzaville (Congo)
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
      dep: route.depEu,
      arr: route.arr,
      via: route.via,
      scheduledDate,
      cancelled: true,
      delayMinutes: null,
      eligible: true,
      airline: 'AT',
      direction: 'Departure',
      hubIata: route.depEu,
      pinned: true,
      pinnedReason: 'ram-afrique-centrale-suspension-2026',
    };
  });
}

/**
 * Indique si la route (dep, arr) est un segment de correspondance pinné
 * (CMN → 6 destinations Afrique centrale RAM). Utilisé par radar.js pour
 * élargir le filtre du bandeau et auto-détecter ces vols si AeroDataBox
 * les rapporte annulés/retardés sur le segment Casa→destination.
 */
function isPinnedCorrespondanceRoute(depIata, arrIata) {
  if (!isPinnedActive()) return false;
  const dep = String(depIata || '').toUpperCase();
  const arr = String(arrIata || '').toUpperCase();
  return PINNED_ROUTES.some((r) => r.via === dep && r.arr === arr);
}

/** Liste des aéroports de correspondance à scanner en plus (hub Casa).
 * Exposée pour permettre à ticker-africa-hubs.js d'injecter le hub dans le scan. */
function getPinnedCorrespondanceHubs() {
  if (!isPinnedActive()) return [];
  const seen = new Set();
  const out = [];
  PINNED_ROUTES.forEach((r) => {
    if (r.via && !seen.has(r.via)) {
      seen.add(r.via);
      out.push(r.via);
    }
  });
  return out;
}

module.exports = {
  getPinnedFlights,
  isPinnedActive,
  isPinnedCorrespondanceRoute,
  getPinnedCorrespondanceHubs,
  PINNED_ACTIVE_FROM,
  PINNED_ACTIVE_UNTIL,
};
