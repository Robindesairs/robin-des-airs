/**
 * AeroDataBox (RapidAPI) — recherche vol par numéro + date.
 * Partagé par flight-info et proofs-collect.
 */

const ADB_HOST = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';

function parisYmd(d = new Date()) {
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

function extractAdbRows(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  for (const k of ['results', 'data', 'flights', 'items']) {
    if (Array.isArray(json[k])) return json[k];
  }
  return [];
}

function airportIata(ap) {
  if (!ap || typeof ap !== 'object') return '';
  const i = ap.iata || ap.code || '';
  return String(i).replace(/\s/g, '').toUpperCase().slice(0, 3);
}

function getNum(x) {
  if (x == null || x === '') return undefined;
  const n = Number(x);
  return Number.isNaN(n) ? undefined : n;
}

function mapAdbRow(row) {
  const dep = row.departure || {};
  const arr = row.arrival || {};
  const depAp = dep.airport && typeof dep.airport === 'object' ? dep.airport : {};
  const arrAp = arr.airport && typeof arr.airport === 'object' ? arr.airport : {};

  const depIata = airportIata(depAp) || airportIata(dep);
  const arrIata = airportIata(arrAp) || airportIata(arr);
  if (!depIata || !arrIata) return null;

  const depLat = getNum(depAp.location?.lat ?? depAp.location?.latitude ?? depAp.latitude ?? dep.latitude);
  const depLon = getNum(depAp.location?.lon ?? depAp.location?.longitude ?? depAp.longitude ?? dep.longitude);
  const arrLat = getNum(arrAp.location?.lat ?? arrAp.location?.latitude ?? arrAp.latitude ?? arr.latitude);
  const arrLon = getNum(arrAp.location?.lon ?? arrAp.location?.longitude ?? arrAp.longitude ?? arr.longitude);

  const depName = depAp.name || depAp.shortName || depAp.municipalityName || depIata;
  const arrName = arrAp.name || arrAp.shortName || arrAp.municipalityName || arrIata;
  const cityDep = depAp.municipalityName || dep.municipalityName;
  const cityArr = arrAp.municipalityName || arr.municipalityName;

  let delayMin = 0;
  if (typeof arr.delay === 'number' && !Number.isNaN(arr.delay)) delayMin = Math.max(0, Math.round(arr.delay));
  else if (typeof row.arrivalDelayMinutes === 'number') delayMin = Math.max(0, Math.round(row.arrivalDelayMinutes));
  else {
    const su = arr.scheduledTime?.utc || arr.scheduledTime?.local;
    const au = arr.actualTime?.utc || arr.actualTime?.local || arr.estimatedTime?.utc || arr.estimatedTime?.local;
    if (su && au) {
      const a = Date.parse(su);
      const b = Date.parse(au);
      if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) delayMin = Math.round((b - a) / 60000);
    }
  }

  let distance = null;
  const gcd = row.greatCircleDistance;
  if (typeof gcd === 'number') distance = Math.round(gcd);
  else if (gcd && typeof gcd === 'object') {
    if (gcd.km != null) distance = Math.round(Number(gcd.km));
    else if (gcd.metre != null) distance = Math.round(Number(gcd.metre) / 1000);
  } else if (typeof row.distance === 'number') distance = Math.round(row.distance);

  const status =
    row.status ||
    dep.status ||
    arr.status ||
    row.flightStatus ||
    '';

  return {
    departure: {
      iataCode: depIata,
      airport: { iataCode: depIata, name: depName, latitude: depLat, longitude: depLon },
      city: cityDep,
      latitude: depLat,
      longitude: depLon,
      scheduled: dep.scheduledTime?.local || dep.scheduledTime?.utc || null,
      actual: dep.actualTime?.local || dep.actualTime?.utc || dep.estimatedTime?.local || null,
    },
    arrival: {
      iataCode: arrIata,
      airport: { iataCode: arrIata, name: arrName, latitude: arrLat, longitude: arrLon },
      city: cityArr,
      delay: delayMin,
      latitude: arrLat,
      longitude: arrLon,
      scheduled: arr.scheduledTime?.local || arr.scheduledTime?.utc || null,
      actual: arr.actualTime?.local || arr.actualTime?.utc || arr.estimatedTime?.local || null,
    },
    geography: distance != null ? { distance } : undefined,
    distance: distance != null ? distance : undefined,
    status: status ? String(status) : '',
    airline: row.airline?.name || row.airline?.iata || row.operator || '',
    // Transporteur EFFECTIF (code-share) : AeroDataBox donne le code IATA de la compagnie du vol PHYSIQUE
    // et un codeshareStatus (« IsOperator » / « IsCodeshared » / « Unknown »). Sert à détecter un vol
    // entrant opéré par une compagnie hors-UE même quand l'e-billet n'écrit pas « opéré par ».
    airlineIata: String(row.airline?.iata || '').toUpperCase().replace(/\s/g, '').slice(0, 3),
    codeshareStatus: String(row.codeshareStatus || '').trim(),
  };
}

// ─── Cache des vols PASSÉS ───────────────────────────────────────────────────
// Un vol de la veille ne bougera plus jamais : horaires réels, statut et route sont figés.
// Or le même vol est interrogé plusieurs fois par dossier — saisie, verdict d'éligibilité,
// collecte de preuves, réouverture, enquête — et chaque appel coûte une API Unit.
// On ne met en cache QUE le passé : un vol du jour ou à venir change encore, le mettre en
// cache ferait rater un retard ou une annulation, ce qui coûte infiniment plus cher qu'un appel.
const ADB_CACHE_STORE = 'robin-adb-cache';
let _blobs = null;
try { _blobs = require('@netlify/blobs'); } catch (_) {}

function adbCacheStore() {
  if (!_blobs || process.env.ADB_CACHE === '0') return null;
  try { return _blobs.getStore({ name: ADB_CACHE_STORE, consistency: 'strong' }); }
  catch (_) { return null; }
}
/** true si la date du vol est STRICTEMENT antérieure à aujourd'hui (fuseau Paris). */
function estPasse(dateYmd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateYmd || '')) && String(dateYmd) < parisYmd();
}

async function fetchAerodatabox(flightNumber, dateYmd, rapidKey) {
  const num = String(flightNumber || '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');

  const cacheable = estPasse(dateYmd);
  const cacheKey = `adb/${num}/${dateYmd}.json`;
  if (cacheable) {
    try {
      const store = adbCacheStore();
      const hit = store && (await store.get(cacheKey, { type: 'json' }));
      if (hit && Array.isArray(hit.rows) && hit.rows.length) return hit.rows;
    } catch (_) { /* cache illisible → on interroge l'API, jamais bloquant */ }
  }
  const paths = [
    `/flights/number/${encodeURIComponent(num)}/${dateYmd}/${dateYmd}`,
    `/flights/number/${encodeURIComponent(num.toLowerCase())}/${dateYmd}/${dateYmd}`,
  ];

  let lastErr = null;
  for (const path of paths) {
    const url = `https://${ADB_HOST}${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-host': ADB_HOST,
          'x-rapidapi-key': rapidKey,
          Accept: 'application/json',
        },
      });
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        lastErr = new Error(`ADB non-JSON ${response.status}`);
        continue;
      }
      if (!response.ok) {
        const err = new Error(`ADB ${response.status}: ${text.slice(0, 120)}`);
        err.status = response.status;
        // 429 (quota/débit) et 401/403 (clé) ne dépendent PAS de la casse du n° de vol : réessayer la
        // variante minuscule ne peut pas aider, tire une 2ᵉ requête dans la même seconde (→ « rate limit
        // per second ») et consomme une API Unit de plus. `fatal` fait sortir de la boucle des paths.
        if (response.status === 429 || response.status === 401 || response.status === 403) err.fatal = true;
        lastErr = err;
        if (err.fatal) break;
        continue;
      }
      const rows = extractAdbRows(json);
      const mapped = rows.map(mapAdbRow).filter(Boolean);
      if (mapped.length) {
        if (cacheable) {
          try {
            const store = adbCacheStore();
            if (store) await store.setJSON(cacheKey, { rows: mapped, at: new Date().toISOString() });
          } catch (_) { /* écriture best-effort : ne casse jamais la réponse */ }
        }
        return mapped;
      }
      lastErr = new Error('ADB: aucun vol mappé');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('AerodataBox indisponible');
}

function rapidApiKey() {
  return (process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY || '').trim();
}

module.exports = {
  ADB_HOST,
  parisYmd,
  mapAdbRow,
  fetchAerodatabox,
  rapidApiKey,
};
