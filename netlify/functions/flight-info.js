/**
 * Infos vol par numéro — AeroDataBox (RapidAPI) uniquement.
 *
 * Variable Netlify obligatoire : RAPIDAPI_KEY ou AERODATABOX_RAPIDAPI_KEY
 * Optionnel : AERODATABOX_RAPIDAPI_HOST (défaut aerodatabox.p.rapidapi.com)
 *
 * GET ?flight=KL1395[&date=YYYY-MM-DD]
 * date : jour local Europe/Paris si omis.
 *
 * Réponse : tableau au format attendu par le site (departure/arrival iataCode, delay, geography).
 */

const ADB_HOST = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';

function corsJson(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

function parisYmd(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
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

  return {
    departure: {
      iataCode: depIata,
      airport: { iataCode: depIata, name: depName, latitude: depLat, longitude: depLon },
      city: cityDep,
      latitude: depLat,
      longitude: depLon
    },
    arrival: {
      iataCode: arrIata,
      airport: { iataCode: arrIata, name: arrName, latitude: arrLat, longitude: arrLon },
      city: cityArr,
      delay: delayMin,
      latitude: arrLat,
      longitude: arrLon
    },
    geography: distance != null ? { distance } : undefined,
    distance: distance != null ? distance : undefined
  };
}

function getNum(x) {
  if (x == null || x === '') return undefined;
  const n = Number(x);
  return Number.isNaN(n) ? undefined : n;
}

async function fetchAerodatabox(flightNumber, dateYmd, rapidKey) {
  const num = flightNumber.replace(/\s/g, '');
  const paths = [
    `/flights/number/${encodeURIComponent(num)}/${dateYmd}/${dateYmd}`,
    `/flights/number/${encodeURIComponent(num.toLowerCase())}/${dateYmd}/${dateYmd}`
  ];

  let lastErr = null;
  for (const path of paths) {
    const url = `https://${ADB_HOST}${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-host': ADB_HOST,
          'x-rapidapi-key': rapidKey,
          Accept: 'application/json'
        }
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
        lastErr = new Error(`ADB ${response.status}: ${text.slice(0, 120)}`);
        continue;
      }
      const rows = extractAdbRows(json);
      const mapped = rows.map(mapAdbRow).filter(Boolean);
      if (mapped.length) return mapped;
      lastErr = new Error('ADB: aucun vol mappé');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('AerodataBox indisponible');
}

exports.handler = async (event) => {
  const flightNumber = (event.queryStringParameters?.flight || '').trim().toUpperCase().replace(/\s/g, '');
  const dateParam = (event.queryStringParameters?.date || '').trim();

  if (!flightNumber) {
    return corsJson(400, { error: 'Numéro de vol manquant' });
  }

  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return corsJson(500, { error: 'Configuration manquante : RAPIDAPI_KEY (AeroDataBox / RapidAPI)' });
  }

  const dateYmd = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : parisYmd();

  try {
    const out = await fetchAerodatabox(flightNumber, dateYmd, rapidKey);

    if (!out || !Array.isArray(out) || out.length === 0) {
      return corsJson(200, { error: 'Vérifiez votre numéro de vol' });
    }

    const first = out[0];
    const dep = first.departure || {};
    const arr = first.arrival || {};
    const depIata = dep.iataCode || (dep.airport && dep.airport.iataCode) || '';
    const arrIata = arr.iataCode || (arr.airport && arr.airport.iataCode) || '';
    if (!depIata || !arrIata) {
      console.error('flight-info: structure invalide', { flightNumber, first });
      return corsJson(200, { error: 'Vérifiez votre numéro de vol' });
    }

    console.log('flight-info OK', flightNumber, '→', depIata, arrIata, '(AerodataBox)');
    return corsJson(200, out);
  } catch (error) {
    console.error('flight-info:', error.message || error, error);
    return corsJson(200, {
      error:
        'Vol introuvable ou API indisponible. Essayez une autre date (?date=YYYY-MM-DD) ou vérifiez le numéro.'
    });
  }
};
