/**
 * Radar Robin des Airs — Tous les vols au départ ou à l'arrivée en France.
 * Priorité : ANNULÉ → ROUGE (≥2h30) → ORANGE (1h–2h30) → JAUNE (~1h).
 *
 * Fournisseur unique : **AeroDataBox** (RapidAPI). Variables Netlify :
 *   - RAPIDAPI_KEY ou AERODATABOX_RAPIDAPI_KEY (obligatoire)
 *   - AERODATABOX_RAPIDAPI_HOST (optionnel, défaut aerodatabox.p.rapidapi.com)
 *
 * Query `mode=ticker-history` : même jeu de données **jour civil Europe/Paris** que le mode live
 * (pas d’historique multi-jours sans autre API — le bandeau utilise la 1ʳᵉ réponse si elle contient des vols).
 */

const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'];
const AFRICA_COUNTRIES = ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'];
const EU_AIRLINES_IATA = ['AF','SN','TP','IB','SS','TO','DS','AT','U2','FR','VY','EI','LX','OS','KL'];

const AIRPORT_COUNTRY = {
  CDG:'FR', ORY:'FR', MRS:'FR', LYS:'FR', NCE:'FR', BOD:'FR', TLS:'FR', NTE:'FR', LIL:'FR', SXB:'FR', RUN:'FR',
  BRU:'BE', GVA:'CH', ZRH:'CH', LHR:'GB', LGW:'GB', AMS:'NL', FRA:'DE', MUC:'DE', MAD:'ES', BCN:'ES',
  LIS:'PT', OPO:'PT', FCO:'IT', MXP:'IT', VIE:'AT', CPH:'DK', OSL:'NO', ARN:'SE', HEL:'FI', DUB:'IE',
  ATH:'GR', IST:'TR', DXB:'AE', DOH:'QA', JFK:'US', EWR:'US', MIA:'US',
  DSS:'SN', DKR:'SN', ABJ:'CI', BKO:'ML', NIM:'NE', OUA:'BF', NDJ:'TD', COO:'BJ', LFW:'TG', CKY:'GN',
  BJL:'GM', CMN:'MA', RAK:'MA', ALG:'DZ', TUN:'TN', CAI:'EG', ADD:'ET', NBO:'KE', DAR:'TZ', JNB:'ZA',
  CPT:'ZA', DLA:'CM', NSI:'CM', LBV:'GA', BZV:'CG', FIH:'CD', RUN:'RE', PTP:'GP', FDF:'MQ', MRU:'MU',
  TNR:'MG', MPM:'MZ', ACC:'GH', LOS:'NG', ABV:'NG',
  NKC:'MR', FNA:'SL', ROB:'LR', PNR:'CG', LAD:'AO', SSG:'GQ', BGF:'CF', KGL:'RW', JIB:'DJ', ZNZ:'TZ', DZA:'FR'
};

/** Tous les départs France : principaux aéroports métropole + La Réunion. */
const HUBS = ['CDG', 'ORY', 'MRS', 'LYS', 'NCE', 'BOD', 'TLS', 'NTE', 'LIL', 'SXB', 'RUN'];

/** ICAO pour l’endpoint AeroDataBox `/flights/airports/icao/...`. */
const HUB_ICAO = {
  CDG: 'LFPG',
  ORY: 'LFPO',
  MRS: 'LFML',
  LYS: 'LFLL',
  NCE: 'LFMN',
  BOD: 'LFBD',
  TLS: 'LFBO',
  NTE: 'LFRS',
  LIL: 'LFQQ',
  SXB: 'LFST',
  RUN: 'FMEE'
};

function parisDateYmd() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

/** Extrait une datetime ISO depuis les champs AeroDataBox (string ou { utc, local }). */
function adbTimeIso(section, keys) {
  if (!section) return null;
  for (const k of keys) {
    const v = section[k];
    if (v == null) continue;
    if (typeof v === 'string' && v.length >= 10) return v.includes('T') ? v : null;
    if (typeof v === 'object' && (v.utc || v.local)) return v.utc || v.local;
  }
  const nested = section.scheduledTime || section.actualTime || section.estimatedTime || section.revisedTime;
  if (nested && typeof nested === 'object' && (nested.utc || nested.local)) return nested.utc || nested.local;
  if (typeof nested === 'string') return nested;
  return null;
}

function adbStatusToAe(statusRaw) {
  const s = String(statusRaw || '').toLowerCase();
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('land') || s.includes('arriv')) return 'landed';
  if (s.includes('depart') || s.includes('en route') || s.includes('active')) return 'departed';
  if (s.includes('delay')) return 'delayed';
  return 'scheduled';
}

/** Vol brut AeroDataBox → même forme que Aviation Edge pour le reste du pipeline. */
function normalizeAdbFlight(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dep = raw.departure || {};
  const arr = raw.arrival || {};
  const depAp = dep.airport || {};
  const arrAp = arr.airport || {};
  const depIata = String(depAp.iata || dep.iataCode || '').toUpperCase().slice(0, 3);
  const arrIata = String(arrAp.iata || arr.iataCode || '').toUpperCase().slice(0, 3);

  const schedDep = adbTimeIso(dep, ['scheduledTimeUtc', 'scheduledTimeLocal']);
  const actDep = adbTimeIso(dep, ['actualTimeUtc', 'actualTimeLocal', 'runwayTimeUtc', 'runwayTimeLocal']);
  const estDep =
    adbTimeIso(dep, ['estimatedTimeUtc', 'estimatedTimeLocal', 'revisedTimeUtc', 'revisedTimeLocal']) || actDep;

  const schedArr = adbTimeIso(arr, ['scheduledTimeUtc', 'scheduledTimeLocal']);
  const actArr = adbTimeIso(arr, ['actualTimeUtc', 'actualTimeLocal', 'runwayTimeUtc', 'runwayTimeLocal']);
  const estArr =
    adbTimeIso(arr, ['estimatedTimeUtc', 'estimatedTimeLocal', 'revisedTimeUtc', 'revisedTimeLocal']) || actArr;

  const airline = raw.airline || {};
  let iataAirline = String(airline.iata || '').toUpperCase().slice(0, 2);
  let num = String(raw.number || raw.flightNumber || '').replace(/\s/g, '');
  if (/^\d+$/.test(num) && iataAirline) num = iataAirline + num;
  if (!iataAirline && num.length >= 2 && /^[A-Za-z]{2}/.test(num)) iataAirline = num.slice(0, 2).toUpperCase();
  const flightIata = num.toUpperCase() || '—';

  let depDelay = delayMinutesFromTimes(schedDep, actDep || estDep);
  let arrDelay = delayMinutesFromTimes(schedArr, actArr || estArr);
  if (typeof dep.delay === 'number') depDelay = dep.delay;
  if (typeof arr.delay === 'number') arrDelay = arr.delay;

  return {
    departure: {
      iataCode: depIata,
      scheduledTime: schedDep,
      actualTime: actDep,
      estimatedTime: estDep,
      delay: depDelay != null ? depDelay : undefined
    },
    arrival: {
      iataCode: arrIata,
      scheduledTime: schedArr,
      actualTime: actArr,
      estimatedTime: estArr,
      delay: arrDelay != null ? arrDelay : undefined
    },
    flight: { iata: flightIata, number: flightIata, icao: raw.callSign },
    airline: { iataCode: iataAirline || flightIata.slice(0, 2) },
    status: adbStatusToAe(raw.status)
  };
}

async function fetchAdbWindow(icao, from, to, direction, rapidKey) {
  const host = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';
  const params = new URLSearchParams({
    withLeg: 'true',
    direction,
    withCancelled: 'true',
    withCodeshared: 'false',
    withCargo: 'false',
    withPrivate: 'false',
    withLocation: 'false'
  });
  const url = `https://${host}/flights/airports/icao/${icao}/${from}/${to}?${params}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': rapidKey,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    console.warn('radar AerodataBox HTTP', res.status, icao, direction, from);
    return [];
  }
  const j = await res.json().catch(() => ({}));
  const key = direction === 'Arrival' ? 'arrivals' : 'departures';
  return Array.isArray(j[key]) ? j[key] : [];
}

async function fillFromAerodatabox(allRaw, arrivalRaw, rapidKey) {
  const dateStr = parisDateYmd();
  const windows = [
    [`${dateStr}T00:00`, `${dateStr}T11:59`],
    [`${dateStr}T12:00`, `${dateStr}T23:59`]
  ];
  for (const hub of HUBS) {
    const icao = HUB_ICAO[hub];
    if (!icao) continue;
    for (const [a, b] of windows) {
      const [deps, arrs] = await Promise.all([
        fetchAdbWindow(icao, a, b, 'Departure', rapidKey),
        fetchAdbWindow(icao, a, b, 'Arrival', rapidKey)
      ]);
      for (const r of deps) {
        const n = normalizeAdbFlight(r);
        if (n) allRaw.push(n);
      }
      for (const r of arrs) {
        const n = normalizeAdbFlight(r);
        if (n) arrivalRaw.push(n);
      }
    }
  }
}

/** Réponse JSON succès : cache court CDN + navigateur (bandeau vols, pas besoin de seconde-fraîcheur). */
const RADAR_CACHE_CONTROL = 'public, max-age=120, s-maxage=120, stale-while-revalidate=300';

function jsonHeaders(extra) {
  return Object.assign(
    {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': RADAR_CACHE_CONTROL
    },
    extra || {}
  );
}

function getCountry(iata) {
  return AIRPORT_COUNTRY[(iata || '').toUpperCase()] || null;
}

function checkEligible(originCountry, destCountry, airlineIata) {
  const o = (originCountry || '').toUpperCase();
  const d = (destCountry || '').toUpperCase();
  const air = (airlineIata || '').toUpperCase();
  if (EU_COUNTRIES.includes(o)) return true;
  if (AFRICA_COUNTRIES.includes(o) && EU_COUNTRIES.includes(d))
    return EU_AIRLINES_IATA.includes(air);
  return false;
}

function getColor(delayMinutes, eligible) {
  if (!eligible) return 'GREY';
  const d = delayMinutes || 0;
  if (d >= 150) return 'RED';
  if (d >= 60) return 'ORANGE';
  if (d >= 30) return 'YELLOW';
  return 'GREEN';
}

function isEurope(country) {
  return country && EU_COUNTRIES.includes(country.toUpperCase());
}
function isAfrica(country) {
  return country && AFRICA_COUNTRIES.includes(country.toUpperCase());
}

/** Extrait HH:mm d'une chaîne ISO (ex. 2024-01-15T10:30:00) ou "HH:mm" */
function toTimeStr(val) {
  if (!val) return '—';
  const s = String(val).trim();
  const iso = s.match(/T(\d{2}):(\d{2})/);
  if (iso) return iso[1] + ':' + iso[2];
  const hhmm = s.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) return hhmm[1].padStart(2, '0') + ':' + hhmm[2];
  return '—';
}

/** Heure en Zulu (UTC) : "HH:mmZ" exactement à la minute (09:33 → 09:33Z, jamais arrondi à 09:35). */
function toTimeStrZulu(val) {
  if (!val) return '—';
  const s = String(val).trim();
  const tMatch = s.match(/[T\s](\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
  if (tMatch) return String(parseInt(tMatch[1], 10)).padStart(2, '0') + ':' + tMatch[2] + 'Z';
  const anyHhMm = s.match(/(\d{1,2}):(\d{2})/);
  if (anyHhMm) return String(parseInt(anyHhMm[1], 10)).padStart(2, '0') + ':' + anyHhMm[2] + 'Z';
  let s2 = s;
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(s2) && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(s2)) s2 = s2.replace(/\.\d+$/, '') + 'Z';
  const d = new Date(s2);
  if (isNaN(d.getTime())) return '—';
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + 'Z';
}

/** Clé normalisée pour matcher départ et arrivée (même vol) entre API departure et arrival. */
function arrivalMapKey(flightNumber, depIata, arrIata) {
  const fn = String(flightNumber || '').replace(/\s/g, '').toUpperCase();
  const dep = (depIata || '').toUpperCase();
  const arr = (arrIata || '').toUpperCase();
  return fn + '|' + dep + '|' + arr;
}

/** Calcule le retard en minutes = différence (heure effective − heure prévue). Retourne null si impossible. */
function delayMinutesFromTimes(scheduledTime, actualOrEstimatedTime) {
  if (!scheduledTime || !actualOrEstimatedTime) return null;
  const s = new Date(scheduledTime).getTime();
  const a = new Date(actualOrEstimatedTime).getTime();
  if (isNaN(s) || isNaN(a)) return null;
  const diffMs = a - s;
  const diffMin = Math.round(diffMs / 60000);
  return diffMin > 0 ? diffMin : 0;
}

/** Statut vol API → libellé français. Distinction claire : Taxi = au sol ; En vol = en l'air (décollé ou en route). */
function statusToFr(statusRaw) {
  const s = (statusRaw || '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'annulé') return 'Annulé';
  if (s === 'landed' || s === 'arrived') return 'Atterri';
  if (s === 'active' || s === 'in flight' || s === 'en vol' || s === 'departed' || s === 'departure') return 'En vol';
  if (s === 'boarding') return 'Embarquement';
  if (s === 'taxi' || s === 'taxiing') return 'Taxi';
  if (s === 'delayed') return 'Retardé';
  if (s === 'scheduled' || s === 'ontime') return 'Prévu';
  if (s === 'diverted' || s === 'redirected') return 'Dérouté';
  if (s === 'incident') return 'Incident';
  if (s && s !== '—') return s.charAt(0).toUpperCase() + s.slice(1);
  return 'Au sol';
}

/** Traqueur vol compagnie : URL avec numéro de vol si possible. */
const AIRLINE_TRACKER = {
  AF: 'https://www.airfrance.fr/flightstatus/search',
  KL: 'https://www.klm.com/flightstatus',
  SN: 'https://www.brusselsairlines.com/en/flight-status',
  LH: 'https://www.lufthansa.com/flight-status',
  IB: 'https://www.iberia.com/flight-status',
  TP: 'https://www.flytap.com/flight-status',
  FR: 'https://www.ryanair.com/flight-status',
  VY: 'https://www.vueling.com/en/flight-status',
  EI: 'https://www.aerlingus.com/flight-status',
  LX: 'https://www.swiss.com/flight-status',
  OS: 'https://www.austrian.com/flight-status',
  DS: 'https://www.corsair.com/fr/suivi-de-vol'
};
function getTrackerUrl(airlineIata, flightNumber) {
  const base = AIRLINE_TRACKER[(airlineIata || '').toUpperCase()];
  if (!base) return null;
  const fn = (flightNumber || '').replace(/\s/g, '');
  if (base.includes('airfrance')) return base + '?flightNumber=' + encodeURIComponent(fn);
  if (base.includes('klm.com')) return base + '?searchKey=' + encodeURIComponent(fn);
  return base + (base.includes('?') ? '&' : '?') + 'flight=' + encodeURIComponent(fn);
}

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 500,
      headers: jsonHeaders({ 'Cache-Control': 'no-store' }),
      body: JSON.stringify({
        error: 'Configuration radar manquante : définir RAPIDAPI_KEY (AeroDataBox / RapidAPI)'
      })
    };
  }

  try {
    const allRaw = [];
    const arrivalRaw = [];
    await fillFromAerodatabox(allRaw, arrivalRaw, rapidKey);

    /** Map arrivées : clé normalisée -> heure d'arrivée estimée/réelle (API arrival = à jour). */
    const arrivalMap = new Map();
    for (const f of arrivalRaw) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '';
      const key = arrivalMapKey(flightNumber, depIata, arrIata);
      const est = arr.actualTime || arr.estimatedTime || arr.estTime || arr.revisedTime;
      if (est) arrivalMap.set(key, est);
    }

    /** Code-share : une seule ligne par vol physique = celle opérée par la compagnie (numéro de vol = préfixe compagnie). */
    const routeMap = new Map(); // routeKey -> { data, isOperating }
    for (const f of allRaw) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      const depCountry = getCountry(depIata);
      const arrCountry = getCountry(arrIata);
      /* Pas de filtre trajet : on garde tous les départs (France). */

      const airlineIata = (f.airline?.iataCode || (f.flight?.iata && f.flight.iata.slice(0, 2)) || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '—';
      const flightPrefix = (String(flightNumber).replace(/\s/g, '').match(/^[A-Za-z]{2}/) || [])[0]?.toUpperCase() || '';
      const isOperatingRow = flightPrefix === airlineIata;
      const routeKey = depIata + arrIata + (dep.scheduledTime || '');

      const effectiveTime = dep.actualTime || dep.estimatedTime;
      let delayMinutes = delayMinutesFromTimes(dep.scheduledTime, effectiveTime);
      if (delayMinutes == null) {
        delayMinutes = 0;
        if (typeof arr.delay === 'number') delayMinutes = arr.delay;
        else if (typeof dep.delay === 'number') delayMinutes = dep.delay;
      }
      if (typeof dep.delay === 'string' && dep.delay !== '' && !isNaN(Number(dep.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(dep.delay));
      }
      if (typeof arr.delay === 'string' && arr.delay !== '' && !isNaN(Number(arr.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(arr.delay));
      }

      const statusRaw = (f.status || '').toLowerCase();
      if (statusRaw === 'landed' || statusRaw === 'arrived') {
        const arrDm = delayMinutesFromTimes(arr.scheduledTime, arr.actualTime || arr.estimatedTime);
        if (arrDm != null) delayMinutes = Math.max(delayMinutes || 0, arrDm);
      }
      const cancelled = statusRaw === 'cancelled' || statusRaw === 'canceled' || statusRaw === 'annulé';
      const hasActualDep = !!(dep.actualTime);
      const flightStatus = cancelled ? 'cancelled' : (hasActualDep ? 'departed' : 'scheduled');
      const statusFr = cancelled ? 'Annulé' : (statusRaw === 'landed' || statusRaw === 'arrived' ? 'Atterri' : (hasActualDep ? 'En vol' : statusToFr(f.status)));
      const landedAtZulu = (statusRaw === 'landed' || statusRaw === 'arrived') && (arr.actualTime || arr.estimatedTime) ? toTimeStrZulu(arr.actualTime || arr.estimatedTime) : null;
      const cancelledAt = cancelled ? (toTimeStrZulu(dep.estimatedTime || dep.actualTime || f.updatedAt || dep.scheduledTime) || null) : null;
      const trackerUrl = getTrackerUrl(airlineIata, flightNumber);

      const eligible = checkEligible(depCountry, arrCountry, airlineIata);
      const color = cancelled ? 'CANCELLED' : getColor(delayMinutes, eligible);

      const scheduledDeparture = toTimeStrZulu(dep.scheduledTime);
      const estimatedDeparture = toTimeStrZulu(dep.actualTime || dep.estimatedTime || dep.scheduledTime);
      const scheduledArrival = toTimeStrZulu(arr.scheduledTime);
      const keyNorm = arrivalMapKey(flightNumber, depIata, arrIata);
      const arrivalEstFromApi = arrivalMap.get(keyNorm);
      let estimatedArrivalRaw = arrivalEstFromApi || arr.actualTime || arr.estimatedTime || arr.estTime || arr.revisedTime;
      if (!estimatedArrivalRaw && typeof arr.delay === 'number' && arr.delay > 0 && arr.scheduledTime) {
        const sched = new Date(arr.scheduledTime);
        if (!isNaN(sched.getTime())) estimatedArrivalRaw = new Date(sched.getTime() + arr.delay * 60000).toISOString();
      }
      const estimatedArrival = toTimeStrZulu(estimatedArrivalRaw || arr.scheduledTime);
      const scheduledDate = (dep.scheduledTime && String(dep.scheduledTime).slice(0, 10)) || null;

      const flightObj = {
        flight: flightNumber,
        airline: airlineIata,
        dep: depIata || '—',
        arr: arrIata || '—',
        scheduledDeparture,
        estimatedDeparture,
        scheduledArrival,
        estimatedArrival,
        delayMinutes: cancelled ? null : delayMinutes,
        eligible,
        color,
        cancelled: !!cancelled,
        status: f.status || '—',
        statusFr,
        landedAtZulu,
        flightStatus,
        cancelledAt,
        scheduledDate,
        trackerUrl
      };

      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, { data: flightObj, isOperating: isOperatingRow });
      } else {
        const cur = routeMap.get(routeKey);
        if (cur.isOperating) continue;
        if (isOperatingRow) routeMap.set(routeKey, { data: flightObj, isOperating: true });
      }
    }

    /** Arrivées en France : ajouter les vols qui arrivent sur un hub français (sans dupliquer les domestiques). */
    const hubsSet = new Set(HUBS.map((h) => h.toUpperCase()));
    for (const f of arrivalRaw) {
      const dep = f.departure || {};
      const arr = f.arrival || {};
      const depIata = (dep.iataCode || '').toUpperCase();
      const arrIata = (arr.iataCode || '').toUpperCase();
      if (!hubsSet.has(arrIata)) continue;
      const routeKey = depIata + arrIata + (dep.scheduledTime || '');
      if (routeMap.has(routeKey)) continue;

      const depCountry = getCountry(depIata);
      const arrCountry = getCountry(arrIata);
      const airlineIata = (f.airline?.iataCode || (f.flight?.iata && f.flight.iata.slice(0, 2)) || '').toUpperCase();
      const flightNumber = f.flight?.iata || f.flight?.number || f.flight?.icao || '—';
      const flightPrefix = (String(flightNumber).replace(/\s/g, '').match(/^[A-Za-z]{2}/) || [])[0]?.toUpperCase() || '';
      const isOperatingRow = flightPrefix === airlineIata;

      const effectiveArr = arr.actualTime || arr.estimatedTime;
      let delayMinutes = delayMinutesFromTimes(arr.scheduledTime, effectiveArr);
      if (delayMinutes == null) {
        delayMinutes = 0;
        if (typeof arr.delay === 'number') delayMinutes = arr.delay;
        else if (typeof dep.delay === 'number') delayMinutes = dep.delay;
      }
      if (typeof arr.delay === 'string' && arr.delay !== '' && !isNaN(Number(arr.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(arr.delay));
      }
      if (typeof dep.delay === 'string' && dep.delay !== '' && !isNaN(Number(dep.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(dep.delay));
      }

      const statusRaw = (f.status || '').toLowerCase();
      const cancelled = statusRaw === 'cancelled' || statusRaw === 'canceled' || statusRaw === 'annulé';
      const hasActualArr = !!(arr.actualTime);
      const statusFr = cancelled ? 'Annulé' : (statusRaw === 'landed' || statusRaw === 'arrived' ? 'Atterri' : (hasActualArr ? 'Atterri' : statusToFr(f.status)));
      const landedAtZulu = (statusRaw === 'landed' || statusRaw === 'arrived') && (arr.actualTime || arr.estimatedTime) ? toTimeStrZulu(arr.actualTime || arr.estimatedTime) : null;
      const cancelledAt = cancelled ? (toTimeStrZulu(dep.estimatedTime || dep.actualTime || f.updatedAt || dep.scheduledTime) || null) : null;
      const trackerUrl = getTrackerUrl(airlineIata, flightNumber);

      const eligible = checkEligible(depCountry, arrCountry, airlineIata);
      const color = cancelled ? 'CANCELLED' : getColor(delayMinutes, eligible);

      const scheduledDeparture = toTimeStrZulu(dep.scheduledTime);
      const estimatedDeparture = toTimeStrZulu(dep.actualTime || dep.estimatedTime || dep.scheduledTime);
      const scheduledArrival = toTimeStrZulu(arr.scheduledTime);
      const keyNorm = arrivalMapKey(flightNumber, depIata, arrIata);
      const arrivalEstFromApi = arrivalMap.get(keyNorm);
      let estimatedArrivalRaw = arrivalEstFromApi || arr.actualTime || arr.estimatedTime || arr.estTime || arr.revisedTime;
      if (!estimatedArrivalRaw && typeof arr.delay === 'number' && arr.delay > 0 && arr.scheduledTime) {
        const sched = new Date(arr.scheduledTime);
        if (!isNaN(sched.getTime())) estimatedArrivalRaw = new Date(sched.getTime() + arr.delay * 60000).toISOString();
      }
      const estimatedArrival = toTimeStrZulu(estimatedArrivalRaw || arr.scheduledTime);
      const scheduledDate = (dep.scheduledTime && String(dep.scheduledTime).slice(0, 10)) || null;

      const flightObj = {
        flight: flightNumber,
        airline: airlineIata,
        dep: depIata || '—',
        arr: arrIata || '—',
        scheduledDeparture,
        estimatedDeparture,
        scheduledArrival,
        estimatedArrival,
        delayMinutes: cancelled ? null : delayMinutes,
        eligible,
        color,
        cancelled: !!cancelled,
        status: f.status || '—',
        statusFr,
        landedAtZulu,
        flightStatus: cancelled ? 'cancelled' : (hasActualArr ? 'arrived' : 'scheduled'),
        cancelledAt,
        scheduledDate,
        trackerUrl
      };
      routeMap.set(routeKey, { data: flightObj, isOperating: isOperatingRow });
    }

    let flights = Array.from(routeMap.values()).map((v) => v.data);

    // Croisement Amadeus (optionnel) : si CERTIFICATION_API_URL est défini, récupérer is_certified_amadeus
    const certificationApiUrl = process.env.CERTIFICATION_API_URL;
    if (certificationApiUrl && flights.length > 0) {
      try {
        const flightKey = (f) => [f.flight, f.dep, f.arr, f.scheduledDate || ''].map((s) => (s || '').trim().toUpperCase()).join('|');
        const keys = [...new Set(flights.map(flightKey).filter(Boolean))];
        if (keys.length > 0) {
          const url = certificationApiUrl.replace(/\/$/, '') + '/api/certifications?keys=' + encodeURIComponent(keys.join(','));
          const certRes = await fetch(url, { cache: 'no-store' });
          if (certRes.ok) {
            const certMap = await certRes.json();
            flights = flights.map((f) => ({ ...f, is_certified_amadeus: !!certMap[flightKey(f)] }));
          }
        }
      } catch (_) {
        // Ne jamais faire échouer le radar si l'API certifications est indisponible
      }
    }

    // Lier les vols retour aux vols aller annulés : marquer en SURVEILLANCE RETOUR
    for (const fl of flights) {
      if (fl.cancelled && fl.dep && fl.arr) {
        const returnFlights = flights.filter(
          (f) => !f.cancelled && f.dep === fl.arr && f.arr === fl.dep
        );
        returnFlights.forEach((r) => {
          r.surveillanceRetour = true;
          r.linkedCancelledFlight = fl.flight;
        });
      }
    }

    const order = { CANCELLED: 0, RED: 1, ORANGE: 2, YELLOW: 3, GREEN: 4, GREY: 5 };
    flights.sort((a, b) => (order[a.color] ?? 6) - (order[b.color] ?? 6) || ((b.delayMinutes || 0) - (a.delayMinutes || 0)));

    const now = new Date();
    const viewDate = now.toISOString().slice(0, 10);

    const payload = {
      flights,
      viewDate,
      updatedAt: now.toISOString(),
      dataSource: 'aerodatabox'
    };

    return {
      statusCode: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    };
  } catch (err) {
    console.error('radar err:', err);
    return {
      statusCode: 200,
      headers: jsonHeaders({ 'Cache-Control': 'public, max-age=30, s-maxage=30' }),
      body: JSON.stringify({
        flights: [],
        updatedAt: new Date().toISOString(),
        error: err.message || 'Erreur radar'
      })
    };
  }
};
