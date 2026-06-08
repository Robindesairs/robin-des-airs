/**
 * Radar Robin des Airs — Vols Afrique subsaharienne ↔ Europe uniquement.
 * Priorité : ANNULÉ → ROUGE (≥2h30) → ORANGE (1h–2h30) → JAUNE (~1h).
 *
 * Scan : 17 hubs EU (France + BRU/AMS/LIS/LGW/LHR/MAD) en parallèle (batch 10).
 * Filtre sortie : isEuSubSaharanAfricaRoute — exclut domestique, EU-EU, EU-Maghreb.
 *
 * Fournisseur unique : **AeroDataBox** (RapidAPI). Variables Netlify :
 *   - RAPIDAPI_KEY ou AERODATABOX_RAPIDAPI_KEY (obligatoire)
 *   - AERODATABOX_RAPIDAPI_HOST (optionnel, défaut aerodatabox.p.rapidapi.com)
 */

const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
const AFRICA_COUNTRIES = ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'];
const EU_AIRLINES_IATA = ['AF','SN','TP','IB','SS','TO','DS','AT','U2','FR','VY','EI','LX','OS','KL'];

// Base "simple et propre" : 42 destinations africaines (hubs) validées pour Robin.
// Le radar ne garde que les routes EU↔AF dont le côté africain est dans cette liste.
const AFRICA_42_HUBS = [
  'ABJ', 'ABV', 'ACC', 'ADD', 'TNR', 'BKO', 'BGF', 'BJL', 'OXB', 'BZV', 'BJM',
  'CPT', 'CKY', 'COO', 'DSS', 'DAR', 'JIB', 'DLA', 'EBB', 'FNA', 'GOM', 'JNB',
  'KGL', 'JRO', 'FIH', 'LOS', 'LBV', 'LFW', 'LAD', 'SSG', 'MPM', 'MRU', 'MBA',
  'NDJ', 'NBO', 'NIM', 'OUA', 'PNR', 'PHC', 'WDH', 'NSI', 'ZNZ', 'FBM', 'HRE',
];
const AFRICA_42_SET = new Set(AFRICA_42_HUBS);

const AIRPORT_COUNTRY = {
  CDG:'FR', ORY:'FR', MRS:'FR', LYS:'FR', NCE:'FR', BOD:'FR', TLS:'FR', NTE:'FR', LIL:'FR', SXB:'FR', RUN:'FR',
  BRU:'BE', GVA:'CH', ZRH:'CH', LHR:'GB', LGW:'GB', AMS:'NL', FRA:'DE', MUC:'DE', MAD:'ES', BCN:'ES',
  LIS:'PT', OPO:'PT', FCO:'IT', MXP:'IT', VIE:'AT', CPH:'DK', OSL:'NO', ARN:'SE', HEL:'FI', DUB:'IE',
  ATH:'GR', IST:'TR', DXB:'AE', DOH:'QA', JFK:'US', EWR:'US', MIA:'US',
  DSS:'SN', DKR:'SN', ABJ:'CI', BKO:'ML', NIM:'NE', OUA:'BF', NDJ:'TD', COO:'BJ', LFW:'TG', CKY:'GN',
  BJL:'GM', CMN:'MA', RAK:'MA', ALG:'DZ', TUN:'TN', CAI:'EG', ADD:'ET', NBO:'KE', DAR:'TZ', JNB:'ZA',
  CPT:'ZA', DLA:'CM', NSI:'CM', LBV:'GA', BZV:'CG', FIH:'CD', RUN:'RE', PTP:'GP', FDF:'MQ', MRU:'MU',
  TNR:'MG', MPM:'MZ', ACC:'GH', LOS:'NG', ABV:'NG',
  NKC:'MR', FNA:'SL', ROB:'LR', PNR:'CG', LAD:'AO', SSG:'GQ', BGF:'CF', KGL:'RW', JIB:'DJ', ZNZ:'TZ', DZA:'FR',
  OXB:'GW', KAN:'NG', PHC:'NG', FKI:'CD', FBM:'CD', GOM:'CD', MBA:'KE', EBB:'UG', JRO:'TZ', LUN:'ZM',
  HRE:'ZW', DUR:'ZA', WDH:'NA', OUA:'BF', NIM:'NE', COO:'BJ', LFW:'TG', CKY:'GN',
};

/** Aéroports France + principales portes EU vers Afrique subsaharienne. */
const HUBS = ['CDG', 'ORY', 'MRS', 'LYS', 'NCE', 'BOD', 'TLS', 'NTE', 'LIL', 'SXB', 'RUN'];

/** Hubs EU étendus : France + BRU (Brussels Airlines) + AMS (KLM) + LIS (TAP)
 *  + LGW/LHR (British Airways) + MAD (Iberia/Air Europa).
 *  Utilisés pour le scan principal radar afin de couvrir tous les vols EU↔Afrique subsaharienne. */
const RADAR_EU_HUBS = [
  ...HUBS,
  'BRU', 'AMS', 'LIS', 'LGW', 'LHR', 'MAD',
];

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
  RUN: 'FMEE',
  // Hubs EU étendus (si RADAR_USE_EU_HUBS=1 ou scan par "group")
  BRU: 'EBBR',
  AMS: 'EHAM',
  LIS: 'LPPT',
  LGW: 'EGKK',
  LHR: 'EGLL',
  MAD: 'LEMD',
  BCN: 'LEBL',
  FRA: 'EDDF',
  MUC: 'EDDM',
  FCO: 'LIRF',
  MXP: 'LIMC',
  ZRH: 'LSZH',
  GVA: 'LSGG',
};

/**
 * Groupes "anti-timeout" : découpe le scan en sous-ensembles de hubs.
 * Objectif : pouvoir lancer Zone 1/2/3… depuis le radar (≤26s).
 */
const HUB_GROUPS = {
  // Paris CDG seul (zone 1) — démarrage ultra léger.
  '1': ['CDG'],
  '2': ['MRS', 'LYS', 'NCE'],
  '3': ['BOD', 'TLS', 'NTE'],
  '4': ['LIL', 'SXB', 'RUN'],
  // Hubs Europe (séparés pour minimiser les appels / éviter les timeouts)
  '5': ['BRU'],
  '6': ['AMS'],
  '7': ['LIS'],
  '8': ['LHR', 'LGW'],
  '9': ['MAD', 'BCN'],
  '10': ['FRA', 'MUC'],
  '11': ['FCO', 'MXP'],
  '12': ['ZRH', 'GVA'],
  // Europe sud — 1 hub par bouton (anti-timeout)
  '13': ['FCO'],
  '14': ['MXP'],
  '15': ['MAD'],
  '16': ['BCN'],
  '17': ['FRA'],
  // Paris Orly seul — Corsair (SS) + AF/Transavia Orly → Afrique subsaharienne.
  '18': ['ORY'],
};


function getReturnEveningWindows(dayYmd) {
  const today = dayYmd || parisDateYmd();
  // Journée entière (2 requêtes / timeout) — pas de filtre 14h–06h pour l’instant.
  return [
    [`${today}T00:00`, `${today}T11:59`],
    [`${today}T12:00`, `${today}T23:59`],
  ];
}

/** Créneau retour découpé (évite timeout Netlify 26s). returnSlot = "1" | "2". */
function resolveReturnWindows(dayYmd, returnSlot) {
  const all = getReturnEveningWindows(dayYmd);
  const slot = String(returnSlot || '').trim();
  if (slot === '1') return [all[0]];
  if (slot === '2') return [all[1]];
  return all;
}

function parseHubGroup(event) {
  const raw = String(event.queryStringParameters?.group || '').trim();
  if (!raw) return null;
  const hubs = HUB_GROUPS[raw];
  if (!hubs) return null;
  return hubs.slice();
}

/** ICAO → IATA (AeroDataBox renvoie souvent icaoV2 sans iata sur departure/arrival). */
const ICAO_TO_IATA = {};
function registerIcaoMap(iata, icao) {
  if (!iata || !icao) return;
  ICAO_TO_IATA[String(icao).toUpperCase()] = String(iata).toUpperCase().slice(0, 3);
}

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

const ADB_TIME_KEYS = [
  'scheduledTime',
  'actualTime',
  'estimatedTime',
  'revisedTime',
  'runwayTime',
  'scheduledTimeUtc',
  'scheduledTimeLocal',
  'actualTimeUtc',
  'actualTimeLocal',
  'estimatedTimeUtc',
  'estimatedTimeLocal',
  'revisedTimeUtc',
  'revisedTimeLocal',
  'runwayTimeUtc',
  'runwayTimeLocal'
];

/** Extrait une datetime ISO depuis les champs AeroDataBox (string ou { utc, local }). */
function adbTimeIso(section, keys) {
  if (!section) return null;
  const keyList = keys && keys.length ? keys : ADB_TIME_KEYS;
  for (const k of keyList) {
    const v = section[k];
    if (v == null) continue;
    if (typeof v === 'string' && v.length >= 10) return v.includes('T') ? v : null;
    if (typeof v === 'object' && (v.utc || v.local)) return v.utc || v.local;
  }
  return null;
}

function airportIataFromAp(ap, section) {
  if (!ap || typeof ap !== 'object') ap = {};
  let iata = String(ap.iata || ap.code || ap.iataCode || '').replace(/\s/g, '').toUpperCase();
  if (iata.length >= 3) return iata.slice(0, 3);
  if (section && typeof section === 'object') {
    const s = String(section.iataCode || section.iata || '').replace(/\s/g, '').toUpperCase();
    if (s.length >= 3) return s.slice(0, 3);
  }
  const icao = String(ap.icaoV2 || ap.icao || '').toUpperCase();
  if (icao && ICAO_TO_IATA[icao]) return ICAO_TO_IATA[icao];
  return '';
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
function normalizeAdbFlight(raw, ctx) {
  if (!raw || typeof raw !== 'object') return null;
  const dep = raw.departure || {};
  const arr = raw.arrival || {};
  const depAp = dep.airport || {};
  const arrAp = arr.airport || {};
  let depIata = airportIataFromAp(depAp, dep);
  let arrIata = airportIataFromAp(arrAp, arr);
  const hub = ctx && ctx.hubIata ? String(ctx.hubIata).toUpperCase().slice(0, 3) : '';
  const direction = ctx && ctx.direction;
  if (!depIata && direction === 'Departure' && hub) depIata = hub;
  if (!arrIata && direction === 'Arrival' && hub) arrIata = hub;
  if (!depIata && !arrIata) return null;

  const schedDep = adbTimeIso(dep, ADB_TIME_KEYS);
  const actDep = adbTimeIso(dep, ['actualTime', 'runwayTime', 'actualTimeUtc', 'actualTimeLocal', 'runwayTimeUtc', 'runwayTimeLocal']);
  const estDep =
    adbTimeIso(dep, ['estimatedTime', 'revisedTime', 'estimatedTimeUtc', 'estimatedTimeLocal', 'revisedTimeUtc', 'revisedTimeLocal']) ||
    actDep;

  const schedArr = adbTimeIso(arr, ADB_TIME_KEYS);
  const actArr = adbTimeIso(arr, ['actualTime', 'runwayTime', 'actualTimeUtc', 'actualTimeLocal', 'runwayTimeUtc', 'runwayTimeLocal']);
  const estArr =
    adbTimeIso(arr, ['estimatedTime', 'revisedTime', 'estimatedTimeUtc', 'estimatedTimeLocal', 'revisedTimeUtc', 'revisedTimeLocal']) ||
    actArr;

  const ac = raw.aircraft || {};
  const aircraftRegistration = String(
    ac.reg || ac.registration || ac.regNumber || ac.tailNumber || raw.aircraftRegistration || ''
  )
    .trim()
    .toUpperCase();

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
    status: adbStatusToAe(raw.status),
    aircraftRegistration: aircraftRegistration || null
  };
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


/** Extrait départs/arrivées quelle que soit la forme JSON AeroDataBox. */
function extractAdbRows(body, direction) {
  if (!body || typeof body !== 'object') return { rows: [], hint: 'empty-body' };
  const key = direction === 'Arrival' ? 'arrivals' : 'departures';
  if (Array.isArray(body[key])) return { rows: body[key], hint: key };
  if (Array.isArray(body.flights)) return { rows: body.flights, hint: 'flights' };
  if (body.data && Array.isArray(body.data[key])) return { rows: body.data[key], hint: 'data.' + key };
  return { rows: [], hint: 'keys:' + Object.keys(body).slice(0, 8).join(',') };
}

/** Créneaux locaux hub — AeroDataBox attend yyyy-MM-ddTHH:mm (sans encodage %3A dans le path). */
function adbWindowPath(isoLocal) {
  return String(isoLocal || '').trim();
}

const { aerodataboxHost } = require('./lib/adb-host');

function scanStatsRateLimited(stats) {
  return (stats && stats.httpErrors || []).some((e) => e.status === 429);
}

async function fetchAdbWindow(icao, from, to, direction, rapidKey, hubIata, timeoutOverride, adbOpts = {}) {
  const host = aerodataboxHost();
  const withCodeshared = adbOpts.withCodeshared === true ? 'true' : 'false';
  const fromPath = adbWindowPath(from);
  const toPath = adbWindowPath(to);
  const params = new URLSearchParams({
    withLeg: 'true',
    direction,
    withCancelled: 'true',
    withCodeshared,
    withCargo: 'false',
    withPrivate: 'false',
    withLocation: 'false'
  });
  const timeoutMs =
    timeoutOverride ||
    Math.min(28000, parseInt(process.env.RADAR_FETCH_TIMEOUT_MS || '20000', 10) || 20000);
  const maxAttempts = Math.max(1, parseInt(process.env.RADAR_429_RETRIES || '3', 10) || 3);
  const backoffMs = parseInt(process.env.RADAR_429_BACKOFF_MS || '3000', 10) || 3000;
  const headers = {
    'x-rapidapi-host': host,
    'x-rapidapi-key': rapidKey,
    Accept: 'application/json'
  };

  async function requestUrl(url, label) {
    let lastStatus = 0;
    let lastHint = '';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await sleepMs(backoffMs * attempt);
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      lastStatus = res.status;
      const text = await res.text();
      let j = {};
      try {
        j = JSON.parse(text);
      } catch (_) {
        j = {};
      }
      const { rows, hint } = extractAdbRows(j, direction);
      lastHint = hint;
      if (res.status === 429 && attempt < maxAttempts - 1) {
        console.warn('radar AerodataBox 429 retry', attempt + 1, label, fromPath, toPath);
        continue;
      }
      return {
        rows,
        httpStatus: res.status,
        hint,
        rateLimited: res.status === 429
      };
    }
    return { rows: [], httpStatus: lastStatus, hint: lastHint || 'rate-limit', rateLimited: true };
  }

  try {
    const icaoUrl = `https://${host}/flights/airports/icao/${icao}/${fromPath}/${toPath}?${params}`;
    let out = await requestUrl(icaoUrl, icao);
    out.urlKind = 'icao';
    out.code = icao;
    if (
      !out.rows.length &&
      hubIata &&
      hubIata.length === 3 &&
      out.httpStatus !== 429 &&
      !out.rateLimited
    ) {
      const iataUrl = `https://${host}/flights/airports/iata/${hubIata}/${fromPath}/${toPath}?${params}`;
      const iataOut = await requestUrl(iataUrl, hubIata);
      if (iataOut.rows.length) {
        out = Object.assign(iataOut, { urlKind: 'iata', code: hubIata });
      } else if (!out.hint && iataOut.hint) out.hint = iataOut.hint;
      if (iataOut.rateLimited) out.rateLimited = true;
      if (iataOut.httpStatus === 429) out.httpStatus = 429;
    }
    if (!out.rows.length && out.httpStatus >= 400) {
      console.warn('radar AerodataBox HTTP', out.httpStatus, icao, direction, fromPath, toPath);
    } else if (!out.rows.length && !out.rateLimited) {
      console.warn('radar AerodataBox empty', icao, direction, fromPath, toPath, out.hint || '');
    }
    return {
      rows: out.rows,
      httpStatus: out.httpStatus,
      hint: out.hint,
      urlKind: out.urlKind,
      rateLimited: !!out.rateLimited,
      error: null
    };
  } catch (e) {
    console.warn('radar AerodataBox fetch', icao, e.message);
    return { rows: [], httpStatus: 0, error: e.message, rateLimited: false };
  }
}

/**
 * Scan ciblé (créneau horaire) — hubs + fenêtres + sens, throttle 1 req/s.
 */
async function fetchRadarSlot({ dateYmd, hubs, windows, directions }) {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) throw new Error('RAPIDAPI_KEY manquant');
  const day = dateYmd || parisDateYmd();
  const hubList = hubs && hubs.length ? hubs : HUBS;
  const wins =
    windows && windows.length
      ? windows
      : [
          [`${day}T00:00`, `${day}T11:59`],
          [`${day}T12:00`, `${day}T23:59`]
        ];
  const dirs = directions && directions.length ? directions : ['Departure', 'Arrival'];
  const delayMs = Math.max(900, parseInt(process.env.RADAR_API_DELAY_MS || '1100', 10) || 1100);

  const allRaw = [];
  const arrivalRaw = [];
  let apiRequests = 0;

  for (const hub of hubList) {
    const icao = TICKER_HUB_ICAO[hub] || HUB_ICAO[hub];
    if (!icao) continue;
    for (const [a, b] of wins) {
      for (const dir of dirs) {
        await sleepMs(delayMs);
        apiRequests += 1;
        const fetched = await fetchAdbWindow(icao, a, b, dir, rapidKey, hub);
        const rows = Array.isArray(fetched) ? fetched : (fetched && fetched.rows) || [];
        for (const r of rows) {
          const n = normalizeAdbFlight(r, { direction: dir, hubIata: hub });
          if (!n) continue;
          if (dir === 'Arrival') arrivalRaw.push(n);
          else allRaw.push(n);
        }
      }
    }
  }

  const payload = await assembleFlightsFromRaw(allRaw, arrivalRaw);
  return Object.assign(payload, { apiRequests });
}

const {
  isSubSaharanAfricaCountry,
  TICKER_AFRICA_HUBS,
  AFRICA_HUB_ICAO,
  getTickerAfricaHubs,
  getBannerHubsForRun,
  getBannerHubsFull,
  BANNER_EU_HUBS,
} = require('./lib/ticker-africa-hubs');

const { isPinnedCorrespondanceRoute } = require('./lib/pinned-flights');

const TICKER_HUB_ICAO = Object.assign({}, HUB_ICAO, AFRICA_HUB_ICAO, {
  BRU: 'EBBR',
  AMS: 'EHAM',
  LIS: 'LPPT',
  LGW: 'EGKK',
  LHR: 'EGLL',
  MAD: 'LEMD',
  FRA: 'EDDF',
  FCO: 'LIRF',
  ZRH: 'LSZH',
  MUC: 'EDDM',
});
for (const [iata, icao] of Object.entries(TICKER_HUB_ICAO)) registerIcaoMap(iata, icao);

async function fillFromAerodatabox(allRaw, arrivalRaw, rapidKey, dateStr, hubList, opts = {}) {
  const day = dateStr || parisDateYmd();
  const hubs = hubList && hubList.length ? hubList : RADAR_EU_HUBS;
  const windows = opts.windows || [
    [`${day}T00:00`, `${day}T11:59`],
    [`${day}T12:00`, `${day}T23:59`]
  ];
  const directions = opts.directions || ['Departure', 'Arrival'];
  const arrivalsToAllRaw = !!opts.arrivalsToAllRaw;
  const adbFetchOpts = opts.adbFetchOpts || {};
  const stats = opts.stats || null;

  async function adbFetch(icao, a, b, direction, hub, timeout) {
    const out = await fetchAdbWindow(icao, a, b, direction, rapidKey, hub, timeout, adbFetchOpts);
    const rows = Array.isArray(out) ? out : (out && out.rows) || [];
    if (stats) {
      stats.apiRowsFetched = (stats.apiRowsFetched || 0) + rows.length;
      if (out && out.httpStatus && out.httpStatus >= 400) {
        stats.httpErrors = stats.httpErrors || [];
        stats.httpErrors.push({ hub, direction, status: out.httpStatus, from: a, to: b });
      }
    }
    return rows;
  }

  // Séquentiel par hub, dep+arr en parallèle par fenêtre (2 req simultanées max).
  // Évite les 429 RapidAPI. Délai 300ms entre hubs pour respecter le rate-limit.
  const delayMs =
    opts.apiDelayMs != null
      ? opts.apiDelayMs
      : parseInt(process.env.RADAR_API_DELAY_MS || '300', 10) || 300;
  for (let hi = 0; hi < hubs.length; hi++) {
    const hub = hubs[hi];
    const icao = TICKER_HUB_ICAO[hub] || HUB_ICAO[hub];
    if (!icao) continue;
    if (hi > 0) await new Promise(r => setTimeout(r, delayMs));
    const perCallTimeout = opts.fetchTimeoutMs || null;
    const wantDep = directions.includes('Departure');
    const wantArr = directions.includes('Arrival');
    const arrivalOnly = wantArr && !wantDep && windows.length > 1;

    if (arrivalOnly) {
      const arrsList = [];
      for (let wi = 0; wi < windows.length; wi++) {
        if (wi > 0) await sleepMs(delayMs);
        const [a, b] = windows[wi];
        arrsList.push(await adbFetch(icao, a, b, 'Arrival', hub, perCallTimeout));
      }
      for (const arrs of arrsList) {
        for (const r of arrs) {
          const n = normalizeAdbFlight(r, { direction: 'Arrival', hubIata: hub });
          if (!n) continue;
          if (arrivalsToAllRaw) allRaw.push(n);
          else arrivalRaw.push(n);
        }
      }
    } else {
      for (const [a, b] of windows) {
        const deps = wantDep ? await adbFetch(icao, a, b, 'Departure', hub, perCallTimeout) : [];
        const arrs = wantArr ? await adbFetch(icao, a, b, 'Arrival', hub, perCallTimeout) : [];
        for (const r of deps) {
          const n = normalizeAdbFlight(r, { direction: 'Departure', hubIata: hub });
          if (n) allRaw.push(n);
        }
        for (const r of arrs) {
          const n = normalizeAdbFlight(r, { direction: 'Arrival', hubIata: hub });
          if (!n) continue;
          if (arrivalsToAllRaw) allRaw.push(n);
          else arrivalRaw.push(n);
        }
      }
    }
  }
}

/** Réponse JSON succès : cache court CDN + navigateur (bandeau vols, pas besoin de seconde-fraîcheur). */
const RADAR_CACHE_CONTROL = 'public, max-age=120, s-maxage=120, stale-while-revalidate=300';

const { SITE_ORIGIN } = require('./lib/auth-config');

function jsonHeaders(extra) {
  return Object.assign(
    {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': SITE_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': RADAR_CACHE_CONTROL,
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

/** Trajet Europe ↔ Afrique (sens aller ou retour). */
function isEuAfricaRoute(depIata, arrIata) {
  const dc = getCountry(depIata);
  const ac = getCountry(arrIata);
  if (!dc || !ac) return false;
  return (isEurope(dc) && isAfrica(ac)) || (isAfrica(dc) && isEurope(ac));
}

/** Bandeau diaspora : Europe ↔ Afrique subsaharienne (hors Maghreb / Égypte). */
function isEuSubSaharanAfricaRoute(depIata, arrIata) {
  const dc = getCountry(depIata);
  const ac = getCountry(arrIata);
  if (!dc || !ac) return false;
  const dep = (depIata || '').toUpperCase();
  const arr = (arrIata || '').toUpperCase();

  // Côté africain doit être dans la base 42 hubs
  if (isEurope(dc) && isSubSaharanAfricaCountry(ac)) return AFRICA_42_SET.has(arr);
  if (isSubSaharanAfricaCountry(dc) && isEurope(ac)) return AFRICA_42_SET.has(dep);
  return false;
}

/** Routes acceptées par le filtre bandeau : EU↔Afrique sub OU routes pinnées (correspondance). */
function isBannerEligibleRoute(depIata, arrIata) {
  if (isEuSubSaharanAfricaRoute(depIata, arrIata)) return true;
  /* Routes de correspondance pinnées (ex: CMN→Afrique centrale RAM 2026) :
   * autorisées car éligibles CE 261 via arrêt Wegener (C-537/17) quand
   * le passager voyage UE → Casa → destination sur PNR unique. */
  return isPinnedCorrespondanceRoute(depIata, arrIata);
}

/** Vols impactés bandeau : éligibles CE 261, route bandeau, annulé ou retard arrivée ≥ 3 h. */
function filterImpactedEuAfricaFlights(flights, minDelayMinutes) {
  const minD = minDelayMinutes != null ? minDelayMinutes : 180;
  return (flights || []).filter((f) => {
    if (!f || !f.eligible) return false;
    if (!isBannerEligibleRoute(f.dep, f.arr)) return false;
    if (f.cancelled) return true;
    return f.delayMinutes != null && f.delayMinutes >= minD;
  });
}

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

function flightDedupeKey(f) {
  return [
    String(f.flight || '').replace(/\s/g, '').toUpperCase(),
    (f.dep || '').toUpperCase(),
    (f.arr || '').toUpperCase(),
    f.scheduledDate || '',
  ].join('|');
}

/** Trie pour bandeau : date décroissante, puis annulation, puis retard. */
function sortImpactedForTicker(flights) {
  return flights.slice().sort((a, b) => {
    const da = a.scheduledDate || '';
    const db = b.scheduledDate || '';
    if (da !== db) return db.localeCompare(da);
    if (!!a.cancelled !== !!b.cancelled) return a.cancelled ? -1 : 1;
    return (b.delayMinutes || 0) - (a.delayMinutes || 0);
  });
}

/** Hubs bandeau matin (conso réduite, timeout Netlify). */
const BANNER_HUBS = ['CDG', 'ORY', 'RUN', 'DSS', 'DKR', 'ABJ', 'ACC', 'LOS', 'CMN', 'BJL'];
const BANNER_TARGET_COUNT = Math.min(20, Math.max(1, parseInt(process.env.TICKER_BANNER_COUNT || '14', 10) || 14));

/** Fusionne cache + scan : les vols les plus récents remplacent les plus anciens (max 9). */
function mergeTickerBannerFlights(existingList, incomingList, targetCount) {
  const target = targetCount != null ? targetCount : BANNER_TARGET_COUNT;
  const byKey = new Map();
  const add = (f) => {
    if (!f) return;
    const k = flightDedupeKey(f);
    const prev = byKey.get(k);
    if (!prev || String(f.scheduledDate || '').localeCompare(String(prev.scheduledDate || '')) > 0) {
      byKey.set(k, f);
    }
  };
  (incomingList || []).forEach(add);
  (existingList || []).forEach(add);
  return sortImpactedForTicker(Array.from(byKey.values())).slice(0, target);
}

/** Scan bandeau pour un jour — hubs par lots parallèles (évite timeout Netlify). */
async function fetchBannerDayScan(dateYmd, hubList) {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) throw new Error('RAPIDAPI_KEY manquant');
  const d = dateYmd || parisDateYmd();
  const hubs = hubList && hubList.length ? hubList : getBannerHubsForRun(0);
  const from = `${d}T00:00`;
  const to = `${d}T23:59`;
  const delayMs = Math.max(400, parseInt(process.env.RADAR_API_DELAY_MS || '600', 10) || 600);
  const batchSize = Math.min(6, Math.max(2, parseInt(process.env.TICKER_HUB_BATCH || '5', 10) || 5));
  const allRaw = [];
  const arrivalRaw = [];

  async function scanHub(hub) {
    const icao = TICKER_HUB_ICAO[hub] || HUB_ICAO[hub];
    if (!icao) return;
    const [deps, arrs] = await Promise.all([
      (async () => { const f = await fetchAdbWindow(icao, from, to, 'Departure', rapidKey, hub); return Array.isArray(f) ? f : (f && f.rows) || []; })(),
      (async () => { const f = await fetchAdbWindow(icao, from, to, 'Arrival', rapidKey, hub); return Array.isArray(f) ? f : (f && f.rows) || []; })(),
    ]);
    for (const r of deps) {
      const n = normalizeAdbFlight(r, { direction: 'Departure', hubIata: hub });
      if (n) allRaw.push(n);
    }
    for (const r of arrs) {
      const n = normalizeAdbFlight(r, { direction: 'Arrival', hubIata: hub });
      if (n) arrivalRaw.push(n);
    }
  }

  for (let i = 0; i < hubs.length; i += batchSize) {
    const chunk = hubs.slice(i, i + batchSize);
    await Promise.all(chunk.map(scanHub));
    if (i + batchSize < hubs.length) await sleepMs(delayMs);
  }

  return assembleFlightsFromRaw(allRaw, arrivalRaw);
}

/**
 * Bandeau : remonte les jours passés (Paris) jusqu’à trouver target vols EU↔AF impactés (≥ 3 h ou annulé).
 */
async function fetchBannerImpactedFlights(opts) {
  const target = opts && opts.targetCount != null ? opts.targetCount : BANNER_TARGET_COUNT;
  const maxDays = Math.min(
    14,
    Math.max(1, parseInt(process.env.TICKER_HISTORY_DAYS || '7', 10) || 7)
  );
  const maxDaysThisRun =
    opts && opts.maxDaysThisRun != null
      ? Math.min(maxDays, opts.maxDaysThisRun)
      : maxDays;
  const hubRunIndex = opts && opts.hubRunIndex != null ? opts.hubRunIndex : 0;
  const hubs =
    opts && opts.hubList && opts.hubList.length
      ? opts.hubList
      : getBannerHubsForRun(hubRunIndex);
  const byKey = new Map();
  let daysScanned = 0;

  for (let offset = 0; offset < maxDaysThisRun; offset++) {
    if (byKey.size >= target) break;
    daysScanned = offset + 1;
    const d = parisDateAddDays(-offset);
    try {
      const payload = await fetchBannerDayScan(d, hubs);
      const impacted = filterImpactedEuAfricaFlights(payload.flights || []);
      for (const f of impacted) {
        const k = flightDedupeKey(f);
        if (!byKey.has(k)) byKey.set(k, f);
        if (byKey.size >= target) break;
      }
    } catch (e) {
      console.warn('fetchBannerImpactedFlights', d, e.message);
    }
  }

  const all = sortImpactedForTicker(Array.from(byKey.values()));
  const banner = all.slice(0, target);
  return {
    flights: banner,
    allImpacted: all,
    viewDate: parisDateYmd(),
    daysScanned,
    maxDays,
    hubsScanned: hubs.length,
    hubRunIndex,
    targetCount: target,
    updatedAt: new Date().toISOString(),
    dataSource: 'aerodatabox',
    tickerMode: 'eu-africa-subsaharan-impacted',
    count: banner.length,
  };
}

/** @deprecated alias — utilise fetchBannerImpactedFlights (multi-jours, 9 vols). */
async function fetchRadarFlightsForDate(_dateYmd) {
  return fetchBannerImpactedFlights();
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

async function assembleFlightsFromRaw(allRaw, arrivalRaw, assembleOpts = {}) {
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
      let delayMinutes = delayMinutesFromTimes(arr.scheduledTime, arr.actualTime || arr.estimatedTime);
      if (delayMinutes == null) {
        delayMinutes = delayMinutesFromTimes(dep.scheduledTime, effectiveTime);
      }
      if (delayMinutes == null) {
        delayMinutes = 0;
        if (typeof arr.delay === 'number') delayMinutes = arr.delay;
        else if (typeof dep.delay === 'number') delayMinutes = dep.delay;
      }
      if (typeof arr.delay === 'number') delayMinutes = Math.max(delayMinutes || 0, arr.delay);
      if (typeof dep.delay === 'number') delayMinutes = Math.max(delayMinutes || 0, dep.delay);
      if (typeof dep.delay === 'string' && dep.delay !== '' && !isNaN(Number(dep.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(dep.delay));
      }
      if (typeof arr.delay === 'string' && arr.delay !== '' && !isNaN(Number(arr.delay))) {
        delayMinutes = Math.max(delayMinutes || 0, Number(arr.delay));
      }

      const statusRaw = (f.status || '').toLowerCase();
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
      const actualDeparture = toTimeStrZulu(dep.actualTime) || null;
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
        actualDeparture,
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
        trackerUrl,
        registration: f.aircraftRegistration || null
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
    const hubsSet = new Set([...HUBS, ...TICKER_AFRICA_HUBS].map((h) => h.toUpperCase()));
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
        delayMinutes = delayMinutesFromTimes(
          dep.scheduledTime,
          dep.actualTime || dep.estimatedTime
        );
      }
      if (delayMinutes == null) {
        delayMinutes = 0;
        if (typeof arr.delay === 'number') delayMinutes = arr.delay;
        else if (typeof dep.delay === 'number') delayMinutes = dep.delay;
      }
      if (typeof arr.delay === 'number') delayMinutes = Math.max(delayMinutes || 0, arr.delay);
      if (typeof dep.delay === 'number') delayMinutes = Math.max(delayMinutes || 0, dep.delay);
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
      const actualDeparture = toTimeStrZulu(dep.actualTime) || null;
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
        actualDeparture,
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
        trackerUrl,
        registration: f.aircraftRegistration || null
      };
      routeMap.set(routeKey, { data: flightObj, isOperating: isOperatingRow });
    }

    let flights = Array.from(routeMap.values()).map((v) => v.data);

    // ── Filtre principal : uniquement Afrique subsaharienne ↔ Europe ──────
    flights = flights.filter((f) => isEuSubSaharanAfricaRoute(f.dep, f.arr));

    // Croisement Amadeus (optionnel) : si CERTIFICATION_API_URL est défini, récupérer is_certified_amadeus
    const certificationApiUrl = process.env.CERTIFICATION_API_URL;
    if (certificationApiUrl && flights.length > 0 && !assembleOpts.skipCertification) {
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

    return {
      flights,
      viewDate,
      updatedAt: now.toISOString(),
      dataSource: 'aerodatabox'
    };
}


function buildScanStats(allRaw, arrivalRaw, returnMode) {
  if (returnMode) {
    return {
      rawDepartureCount: 0,
      rawArrivalCount: allRaw.length,
      rawApiCount: allRaw.length + arrivalRaw.length,
    };
  }
  return {
    rawDepartureCount: allRaw.length,
    rawArrivalCount: arrivalRaw.length,
    rawApiCount: allRaw.length + arrivalRaw.length,
  };
}

/** Scan un groupe hub (veille cron ou scripts internes). */
async function runGroupScan(rapidKey, { group, scanMode, hub, returnSlot }) {
  const allRaw = [];
  const arrivalRaw = [];
  const groupKey = String(group || '').trim();
  const groupHubs = HUB_GROUPS[groupKey];
  if (!groupHubs || !groupHubs.length) {
    throw new Error(`Groupe hub inconnu: ${groupKey}`);
  }
  let scanHubs = groupHubs.slice();
  const mode = String(scanMode || '').trim();
  const returnHub = String(hub || '').trim().toUpperCase();
  if (mode === 'return' && returnHub && (TICKER_HUB_ICAO[returnHub] || HUB_ICAO[returnHub])) {
    scanHubs = [returnHub];
  }
  const fillOpts =
    mode === 'return'
      ? {
          directions: ['Arrival'],
          windows: resolveReturnWindows(parisDateYmd(), returnSlot),
          arrivalsToAllRaw: true,
          adbFetchOpts: { withCodeshared: true },
          fetchTimeoutMs: parseInt(process.env.RADAR_RETURN_FETCH_TIMEOUT_MS || '18000', 10) || 18000,
          apiDelayMs: parseInt(process.env.RADAR_RETURN_API_DELAY_MS || '800', 10) || 800,
        }
      : {};
  const adbStats = { apiRowsFetched: 0, windows: fillOpts.windows || [] };
  fillOpts.stats = adbStats;
  await fillFromAerodatabox(allRaw, arrivalRaw, rapidKey, parisDateYmd(), scanHubs, fillOpts);
  const payload = await assembleFlightsFromRaw(allRaw, arrivalRaw, {
    skipCertification: mode === 'return',
  });
  if (mode === 'return') {
    payload.flights = (payload.flights || []).filter((f) => {
      const dep = String(f.dep || '').toUpperCase();
      const arr = String(f.arr || '').toUpperCase();
      if (!AFRICA_42_SET.has(dep) || !isEurope(getCountry(arr))) return false;
      if (returnHub && arr !== returnHub) return false;
      return true;
    });
    payload.scan = Object.assign(
      {
        mode: 'return',
        hub: returnHub || scanHubs[0],
        group: groupKey,
        hubs: scanHubs,
        apiRowsFetched: adbStats.apiRowsFetched || 0,
        windows: adbStats.windows,
      },
      buildScanStats(allRaw, arrivalRaw, true),
      { matchedCount: (payload.flights || []).length }
    );
    if (returnSlot) payload.scan.returnSlot = returnSlot;
  } else {
    payload.scan = Object.assign(
      { mode: 'aller', group: groupKey, hubs: scanHubs },
      buildScanStats(allRaw, arrivalRaw, false),
      { matchedCount: (payload.flights || []).length }
    );
  }
  return payload;
}

const { checkCrmAccess } = require('./lib/crm-access');
const { mergeFlightsIntoRegistry } = require('./lib/radar-eligible-registry');

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

  const mode = (event.queryStringParameters?.mode || '').trim();

  if (mode === 'ticker-banner') {
    try {
      let netlifyBlobsModule = null;
      try {
        netlifyBlobsModule = require('@netlify/blobs');
      } catch (e) {}
      if (netlifyBlobsModule) {
        const blobs = netlifyBlobsModule;
        if (blobs.connectLambda && event) blobs.connectLambda(event);
        const store = blobs.getStore('robin-radar-ticker');
        const cached = await store.get('banner/latest.json', { type: 'json' }).catch(() => null);
        if (cached && Array.isArray(cached.flights) && cached.flights.length) {
          return {
            statusCode: 200,
            headers: jsonHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }),
            body: JSON.stringify(cached),
          };
        }
      }
    } catch (e) {
      console.warn('radar ticker-banner cache:', e.message);
    }
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return {
      statusCode: 401,
      headers: jsonHeaders({ 'Cache-Control': 'no-store' }),
      body: JSON.stringify({ error: auth.error || 'Non autorisé' }),
    };
  }

  try {
    const allRaw = [];
    const arrivalRaw = [];
    // HUBS = France uniquement (CDG/ORY/MRS/LYS/NCE/BOD/TLS/NTE/LIL/SXB/RUN).
    // Passer RADAR_EU_HUBS pour activer les hubs EU non-français (BRU/AMS/LIS/LGW/LHR/MAD)
    // uniquement si le plan RapidAPI dispose d'un quota suffisant (>= 200 req/jour).
    const scanMode = String(event.queryStringParameters?.scanMode || '').trim();
    const returnSlot = String(event.queryStringParameters?.returnSlot || '').trim();
    const returnHub = String(event.queryStringParameters?.hub || '').trim().toUpperCase();
    const groupHubs = parseHubGroup(event);
    let scanHubs = groupHubs || (process.env.RADAR_USE_EU_HUBS === '1' ? RADAR_EU_HUBS : HUBS);
    if (scanMode === 'return' && returnHub && (TICKER_HUB_ICAO[returnHub] || HUB_ICAO[returnHub])) {
      scanHubs = [returnHub];
    }
    const fillOpts =
      scanMode === 'return'
        ? {
            directions: ['Arrival'],
            windows: resolveReturnWindows(parisDateYmd(), returnSlot),
            arrivalsToAllRaw: true,
            adbFetchOpts: { withCodeshared: true },
            fetchTimeoutMs: parseInt(process.env.RADAR_RETURN_FETCH_TIMEOUT_MS || '18000', 10) || 18000,
            apiDelayMs: parseInt(process.env.RADAR_RETURN_API_DELAY_MS || '800', 10) || 800,
          }
        : {};
    const adbStats = { apiRowsFetched: 0, windows: fillOpts.windows || [] };
    fillOpts.stats = adbStats;
    await fillFromAerodatabox(allRaw, arrivalRaw, rapidKey, parisDateYmd(), scanHubs, fillOpts);

    const payload = await assembleFlightsFromRaw(allRaw, arrivalRaw, {
      skipCertification: scanMode === 'return',
    });
    const scanStats = buildScanStats(allRaw, arrivalRaw, scanMode === 'return');
    payload.scan = Object.assign(payload.scan || {}, scanStats, {
      matchedCount: (payload.flights || []).length,
      apiRowsFetched: adbStats.apiRowsFetched || 0,
      windows: adbStats.windows,
      httpErrors: adbStats.httpErrors || [],
      rateLimited: scanStatsRateLimited(adbStats),
    });

    if (
      scanMode === 'return' &&
      (adbStats.apiRowsFetched || 0) === 0 &&
      !scanStatsRateLimited(adbStats)
    ) {
      const today = parisDateYmd();
      const probe = await fetchAdbWindow(
        'LFPG',
        `${today}T12:00`,
        `${today}T14:00`,
        'Departure',
        rapidKey,
        'CDG',
        12000,
        { withCodeshared: true }
      );
      payload.scan.apiProbeCDG = (probe.rows && probe.rows.length) || 0;
      if (probe.httpStatus && probe.httpStatus >= 400) payload.scan.apiHttpStatus = probe.httpStatus;
      if (probe.rateLimited || probe.httpStatus === 429) payload.scan.rateLimited = true;
      if (probe.error) payload.scan.apiError = probe.error;
      else if (probe.hint) payload.scan.apiHint = probe.hint;
    } else if (scanMode === 'return' && scanStatsRateLimited(adbStats)) {
      payload.scan.rateLimited = true;
      payload.scan.apiHttpStatus = payload.scan.apiHttpStatus || 429;
    }

    if (scanMode === 'return') {
      payload.flights = (payload.flights || []).filter((f) => {
        const dep = String(f.dep || '').toUpperCase();
        const arr = String(f.arr || '').toUpperCase();
        if (!AFRICA_42_SET.has(dep) || !isEurope(getCountry(arr))) return false;
        if (returnHub && arr !== returnHub) return false;
        return true;
      });
      payload.scan = payload.scan || {};
      payload.scan.mode = 'return';
      payload.scan.hub = returnHub || (scanHubs[0] || '');
      if (returnSlot) payload.scan.returnSlot = returnSlot;
    }
    if (groupHubs || scanMode === 'return') {
      payload.scan = payload.scan || {};
      payload.scan.hubs = scanHubs;
      payload.scan.group = String(event.queryStringParameters?.group || '').trim();
    }

    try {
      const registryMerge = await mergeFlightsIntoRegistry(event, filterImpactedEuAfricaFlights(payload.flights || []), {
        source: 'radar-scan',
        scanMode: scanMode || 'aller',
        hubs: scanHubs,
      });
      if (registryMerge.added > 0 || registryMerge.updated > 0) {
        payload.registry = { added: registryMerge.added, updated: registryMerge.updated, total: registryMerge.total };
      }
    } catch (regErr) {
      console.warn('radar eligible-registry:', regErr.message);
    }

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

exports.fetchRadarFlightsForDate = fetchRadarFlightsForDate;
exports.fetchBannerImpactedFlights = fetchBannerImpactedFlights;
exports.mergeTickerBannerFlights = mergeTickerBannerFlights;
exports.BANNER_TARGET_COUNT = BANNER_TARGET_COUNT;
exports.fetchRadarSlot = fetchRadarSlot;
exports.filterImpactedEuAfricaFlights = filterImpactedEuAfricaFlights;
exports.sortImpactedForTicker = sortImpactedForTicker;
exports.flightDedupeKey = flightDedupeKey;
exports.parisDateYmd = parisDateYmd;
exports.parisDateAddDays = parisDateAddDays;
exports.fetchBannerDayScan = fetchBannerDayScan;
exports.isEuAfricaRoute = isEuAfricaRoute;
exports.getCountry = getCountry;
exports.isEurope = isEurope;
exports.isAfrica = isAfrica;
exports.getBannerHubsForRun = getBannerHubsForRun;
exports.getBannerHubsFull = getBannerHubsFull;
exports.getTickerAfricaHubs = getTickerAfricaHubs;
exports.BANNER_EU_HUBS = BANNER_EU_HUBS;
exports.isEuSubSaharanAfricaRoute = isEuSubSaharanAfricaRoute;
exports.HUBS = HUBS;
exports.runGroupScan = runGroupScan;
exports.getReturnEveningWindows = getReturnEveningWindows;
exports.extractAdbRows = extractAdbRows;
exports.resolveReturnWindows = resolveReturnWindows;
exports.HUB_GROUPS = HUB_GROUPS;
