/**
 * Report d'un vol annulé — « prochain vol » sur le même numéro.
 *
 * Quand un vol Afrique↔Europe est ANNULÉ, l'info business n°1 est : à quand la
 * compagnie reprogramme-t-elle les passagers ? AeroDataBox ne donne pas le
 * « rebooking » officiel, mais on peut retrouver la PROCHAINE occurrence
 * planifiée du même numéro de vol (même jour plus tard, demain, après-demain).
 * Pour une ligne long-courrier quotidienne (ex : AF718 DSS→CDG), c'est
 * exactement « le vol de demain » — la cible publicitaire de Robin des Airs.
 *
 * Coût quota : 1 à 3 appels AeroDataBox par annulation, mis en cache 12 h
 * (Netlify Blobs) pour ne jamais re-chercher le même vol annulé.
 */

const { fetchAerodatabox, rapidApiKey, parisYmd } = require('./aerodatabox-flight');

function addDaysYmd(ymd, n) {
  const [y, m, d] = String(ymd || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** "2026-06-07 14:35+00:00" / ISO → "14h35". */
function hhmmFromLocal(s) {
  if (!s) return null;
  // La date (2026-06-07) n'a pas de ":", donc le 1ᵉʳ HH:MM est toujours l'heure.
  const m = String(s).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : null;
}

function dayWord(offset) {
  if (offset === 0) return 'même jour';
  if (offset === 1) return 'demain';
  if (offset === 2) return 'après-demain';
  return `dans ${offset} j`;
}

/** Libellé humain prêt à afficher : "demain 14h35". */
function rescheduleLabel(r) {
  if (!r) return null;
  const t = hhmmFromLocal(r.scheduledLocal) || '?';
  return `${dayWord(r.dayOffset)} ${t}`;
}

function depTimeMs(row) {
  const s = row && row.departure && row.departure.scheduled;
  const ms = s ? Date.parse(String(s).replace(' ', 'T')) : NaN;
  return Number.isNaN(ms) ? Infinity : ms;
}

// Parse une heure programmée → ms, en tolérant le format AeroDataBox "2026-06-12 21:40+00:00"
// (espace au lieu de "T", que Date.parse peut rejeter). Renvoie null si illisible.
function parseSchedMs(s) {
  if (!s) return null;
  const ms = Date.parse(String(s).replace(' ', 'T'));
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Trouve la prochaine occurrence planifiée du même numéro de vol sur la même route.
 * @param {object} flight  { flight|vol, dep, arr, scheduledDate|date, scheduledDeparture }
 * @returns {Promise<null | { flight, dep, arr, scheduledLocal, dayOffset, dateYmd, statusRaw }>}
 */
async function findNextScheduledFlight(flight) {
  const num = String(flight.flight || flight.vol || '').replace(/\s/g, '').toUpperCase();
  if (!num) return null;
  const key = rapidApiKey();
  if (!key) return null;

  const dep = String(flight.dep || '').toUpperCase();
  const arr = String(flight.arr || '').toUpperCase();
  const baseDate = String(flight.scheduledDate || flight.date || parisYmd()).slice(0, 10);
  const cancelledDepMs = parseSchedMs(flight.scheduledDeparture);

  const days = [baseDate, addDaysYmd(baseDate, 1), addDaysYmd(baseDate, 2)].filter(Boolean);

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    let rows = [];
    try {
      rows = await fetchAerodatabox(num, d, key);
    } catch (_) {
      continue;
    }
    const matches = (rows || [])
      .filter((r) => {
        const rd = (r.departure && r.departure.iataCode || '').toUpperCase();
        const ra = (r.arrival && r.arrival.iataCode || '').toUpperCase();
        return (!dep || rd === dep) && (!arr || ra === arr);
      })
      .sort((a, b) => depTimeMs(a) - depTimeMs(b));

    for (const r of matches) {
      const sched = (r.departure && r.departure.scheduled) || null;
      const schedMs = parseSchedMs(sched);
      // Ignorer une occurrence elle-même annulée si l'API le dit.
      if (/cancel|annul/i.test(String(r.status || ''))) continue;
      // MÊME JOUR (i === 0) : un report n'a de sens que sur une occurrence STRICTEMENT
      // postérieure au vol annulé (≥ 30 min après). Si on ne connaît pas de façon fiable
      // l'heure du vol annulé OU celle du candidat, on ne tente PAS un report « même jour » :
      // ce serait l'instance annulée elle-même (bug « reporté même jour, même heure »).
      // On laisse alors la boucle passer à demain / après-demain.
      if (i === 0) {
        if (cancelledDepMs == null || schedMs == null) continue;
        if (schedMs <= cancelledDepMs + 30 * 60000) continue;
      }
      return {
        flight: num,
        dep: (r.departure && r.departure.iataCode || dep).toUpperCase(),
        arr: (r.arrival && r.arrival.iataCode || arr).toUpperCase(),
        scheduledLocal: sched,
        dayOffset: i,
        dateYmd: d,
        statusRaw: String(r.status || ''),
      };
    }
  }
  return null;
}

/**
 * Enrichit un vol annulé avec son report (avec cache Blobs 12 h).
 * Mute l'objet `flight` en place : ajoute rescheduledTo / rescheduledAtLocal /
 * rescheduledDayOffset / rescheduledRoute / nextFlightFound.
 * No-op si non annulé. Ne lève jamais (best-effort).
 *
 * @param {object} flight
 * @param {object} [store]  Netlify Blobs store optionnel (cache partagé).
 */
async function enrichCancellationReschedule(flight, store) {
  if (!flight || !flight.cancelled) return flight;

  const cacheKey = [
    String(flight.flight || flight.vol || 'UNK').replace(/\s/g, '').toUpperCase(),
    String(flight.dep || '').toUpperCase(),
    String(flight.arr || '').toUpperCase(),
    String(flight.scheduledDate || flight.date || '').slice(0, 10),
  ].join('-');

  // 1) Cache
  if (store) {
    try {
      const raw = await store.get(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        applyReschedule(flight, cached);
        return flight;
      }
    } catch (_) {}
  }

  // 2) Lookup API
  let next = null;
  try {
    next = await findNextScheduledFlight(flight);
  } catch (_) {
    next = null;
  }

  const payload = next
    ? {
        rescheduledTo: rescheduleLabel(next),
        rescheduledAtLocal: next.scheduledLocal,
        rescheduledDayOffset: next.dayOffset,
        rescheduledRoute: `${next.dep}→${next.arr}`,
        nextFlightFound: true,
      }
    : { rescheduledTo: null, nextFlightFound: false };

  applyReschedule(flight, payload);

  if (store) {
    try {
      await store.set(cacheKey, JSON.stringify(payload), { ttl: 12 * 3600 });
    } catch (_) {}
  }
  return flight;
}

function applyReschedule(flight, p) {
  if (!p) return;
  flight.rescheduledTo = p.rescheduledTo || null;
  flight.rescheduledAtLocal = p.rescheduledAtLocal || null;
  flight.rescheduledDayOffset = p.rescheduledDayOffset != null ? p.rescheduledDayOffset : null;
  flight.rescheduledRoute = p.rescheduledRoute || null;
  flight.nextFlightFound = !!p.nextFlightFound;
}

module.exports = {
  findNextScheduledFlight,
  enrichCancellationReschedule,
  rescheduleLabel,
  hhmmFromLocal,
  addDaysYmd,
};
