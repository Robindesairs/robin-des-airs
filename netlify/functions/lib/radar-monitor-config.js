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
  'CMN',
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
  'ALG',
  'TUN',
];

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

/** Fenêtre API pour le créneau horaire courant (départs). */
function slotTimeWindows(parisHour, dateYmd) {
  const h = String(parisHour).padStart(2, '0');
  const nextH = String((parisHour + 1) % 24).padStart(2, '0');
  if (parisHour === 23) {
    return [[`${dateYmd}T23:00`, `${dateYmd}T23:59`]];
  }
  if (parisHour >= 18 || parisHour <= 2) {
    return [[`${dateYmd}T${h}:00`, `${dateYmd}T${h}:59`]];
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
};
