/**
 * Créneaux horaires radar Robin (heure Europe/Paris).
 */

const EU_AFTERNOON_HUBS = ['CDG', 'ORY', 'MRS', 'LYS', 'NCE', 'RUN', 'BRU', 'LIS', 'MAD'];

/** Départs Afrique + escales hub diaspora (soir 18h → 02h). */
const AFRICA_EVENING_HUBS = [
  'DSS',
  'DKR',
  'ABJ',
  'ACC',
  'LOS',
  'BKO',
  'BJL',
  'ADD',
  'NBO',
  'CKY',
  'FIH',
  'LFW',
  'COO',
  'OUA',
  'NDJ',
  // Alger/Tunis retirés (Maghreb, hors niche « africain noir »). Casablanca gardé (transit ouest-africain).
  // Afrique centrale/ouest francophone — diaspora noire → Paris (vols Air France/Brussels)
  'DLA', // Douala
  'NSI', // Yaoundé
  'LBV', // Libreville
  'BZV', // Brazzaville
  'PNR', // Pointe-Noire
  'NIM', // Niamey
  'NKC', // Nouakchott
];

/**
 * Hubs à scanner pour le monitor temps-réel.
 * Priorité env var MONITOR_HUBS (ex: "DSS,ABJ") → fallback AFRICA_EVENING_HUBS.
 */
function getMonitorHubs() {
  const raw = process.env.MONITOR_HUBS || '';
  if (raw.trim()) {
    return raw
      .split(/[\s,;]+/)
      .map((h) => h.trim().toUpperCase().slice(0, 3))
      .filter((h) => h.length === 3);
  }
  return AFRICA_EVENING_HUBS;
}

/**
 * Hubs « secondaires » — surveillés à cadence plus lente (radar-monitor-hot2, ~45 min).
 * Les hubs prioritaires (MONITOR_HUBS, scannés toutes les ~20 min) sont exclus pour
 * ne pas les scanner deux fois. Priorité env MONITOR_HUBS_SECONDARY, sinon
 * AFRICA_EVENING_HUBS moins les prioritaires moins DKR (Dakar-Yoff fermé).
 */
function getSecondaryHubs() {
  const raw = process.env.MONITOR_HUBS_SECONDARY || '';
  const primary = new Set(getMonitorHubs());
  if (raw.trim()) {
    return raw
      .split(/[\s,;]+/)
      .map((h) => h.trim().toUpperCase().slice(0, 3))
      .filter((h) => h.length === 3 && !primary.has(h));
  }
  return AFRICA_EVENING_HUBS.filter((h) => !primary.has(h) && h !== 'DKR');
}

/** Bandeau matin — hubs prioritaires (conso API maîtrisée). */
const BANNER_HUBS = ['CDG', 'ORY', 'RUN', 'DSS', 'DKR', 'ABJ', 'ACC', 'LOS', 'CMN', 'BJL'];

const MORNING_PARIS_HOUR = parseInt(process.env.RADAR_MORNING_HOUR || '8', 10);
const EU_CHECK_HOURS = (process.env.RADAR_EU_HOURS || '16,17')
  .split(',')
  .map((h) => parseInt(h.trim(), 10))
  .filter((h) => !isNaN(h));

/** 18 → 23 puis 0 → 2 (Paris). */
function isAfricaEveningHour(h) {
  return h >= 18 || h <= 2;
}

function getParisParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (t) => parts.find((p) => p.type === t)?.value || '';
  return {
    dateYmd: `${pick('year')}-${pick('month')}-${pick('day')}`,
    hour: parseInt(pick('hour'), 10),
  };
}

function getParisHour(date = new Date()) {
  return getParisParts(date).hour;
}

/**
 * Fenêtre API pour le créneau horaire courant.
 *
 * Créneau africa-evening (18h–02h) : on scanne la JOURNÉE COMPLÈTE en deux
 * fenêtres de 12h pour ne jamais rater un vol dont le retard est annoncé
 * avant ou après l'heure courante (ex: vol à 23h, retard annoncé à 19h).
 *
 * Les autres créneaux (morning, EU afternoon) gardent une fenêtre ciblée.
 */
function slotTimeWindows(parisHour, dateYmd) {
  const h = String(parisHour).padStart(2, '0');
  if (parisHour >= 18 || parisHour <= 2) {
    // Scan jour entier = 2 fenêtres de 12h (limite API AeroDataBox)
    return [
      [`${dateYmd}T00:00`, `${dateYmd}T11:59`],
      [`${dateYmd}T12:00`, `${dateYmd}T23:59`],
    ];
  }
  if (EU_CHECK_HOURS.includes(parisHour)) {
    return [[`${dateYmd}T12:00`, `${dateYmd}T20:59`]];
  }
  return [[`${dateYmd}T${h}:00`, `${dateYmd}T${h}:59`]];
}

function detectSlot(parisHour) {
  if (parisHour === MORNING_PARIS_HOUR) return 'morning';
  if (EU_CHECK_HOURS.includes(parisHour)) return 'eu-afternoon';
  if (isAfricaEveningHour(parisHour)) return 'africa-evening';
  return 'idle';
}

module.exports = {
  EU_AFTERNOON_HUBS,
  AFRICA_EVENING_HUBS,
  BANNER_HUBS,
  MORNING_PARIS_HOUR,
  EU_CHECK_HOURS,
  getParisParts,
  getParisHour,
  slotTimeWindows,
  detectSlot,
  isAfricaEveningHour,
  getMonitorHubs,
  getSecondaryHubs,
};
