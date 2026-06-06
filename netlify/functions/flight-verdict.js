/**
 * flight-verdict — Verdict CE 261/2004 à partir d'un numéro de vol + date.
 *
 * Brique "socle" appelée par le bot WhatsApp (Railway) pour les VOLS DIRECTS :
 * résout le vol via AeroDataBox, puis applique la logique pure ce261-verdict.
 *
 * GET  /api/flight-verdict?flight=AF718&date=YYYY-MM-DD[&type=direct|escale]
 * POST /api/flight-verdict  { flight, date, type }
 *
 * Réponse JSON :
 *   { ok, found, verdict, perPax, totalForPax?, distanceKm, delayMin,
 *     depIata, arrIata, carrierIata, route, airline, raison, proofLine, source }
 *
 * verdict ∈ eligible | sous_seuil | hors_champ | a_verifier | introuvable
 *
 * ⚠️ N'invente jamais un "non" : si le vol est introuvable → verdict 'introuvable'
 *    et le bot retombe sur le déclaratif client (aucun blocage du tunnel).
 */
const { fetchAerodatabox, parisYmd, rapidApiKey } = require('./lib/aerodatabox-flight');
const { verdict } = require('./lib/ce261-verdict');
const { publicCorsHeaders } = require('./lib/auth-config');
const { checkRateLimit } = require('./lib/rate-limit');
const { getBlobStore } = require('./lib/netlify-blobs-store');

function corsJson(statusCode, body) {
  return { statusCode, headers: publicCorsHeaders({}), body: typeof body === 'string' ? body : JSON.stringify(body) };
}

// Normalise une date entrée libre (JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ) → AAAA-MM-JJ.
function normYmd(raw) {
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: publicCorsHeaders({}), body: '' };

  const rl = await checkRateLimit(event, { key: 'flight-verdict', max: 30, windowSec: 60 });
  if (!rl.ok) return rl.response;

  let p = event.queryStringParameters || {};
  if (event.httpMethod === 'POST') { try { p = { ...p, ...JSON.parse(event.body || '{}') }; } catch (_) {} }

  const flight = String(p.flight || '').trim().toUpperCase().replace(/\s/g, '');
  const type = String(p.type || 'direct').toLowerCase() === 'escale' ? 'escale' : 'direct';
  const dateYmd = normYmd(p.date) || parisYmd();

  if (!flight) return corsJson(400, { ok: false, error: 'Numéro de vol manquant' });

  const carrierIata = (flight.match(/^([A-Z]{2,3})\d/) || [])[1] || '';

  // Correspondance : pas d'appel API nécessaire, verdict direct "à vérifier".
  if (type === 'escale') {
    const v = verdict({ typeVol: 'escale', carrierIata });
    return corsJson(200, { ok: true, found: false, source: 'rule', ...v });
  }

  // ─── Cache Blobs : vol PASSÉ = retard figé → on ne paie qu'une fois par (vol+date). ───
  // (vols d'aujourd'hui/futur : pas de cache, le retard n'est pas final.)
  const past = dateYmd < parisYmd();
  const cache = past ? getBlobStore(event, 'flightcache') : null;
  const cacheKey = `v/${flight}_${dateYmd}`;
  if (cache) {
    try { const hit = await cache.get(cacheKey); if (hit) return corsJson(200, { ...JSON.parse(hit), source: 'cache' }); } catch (_) {}
  }
  const remember = async (out) => { if (cache) { try { await cache.set(cacheKey, JSON.stringify(out)); } catch (_) {} } return out; };

  const rapidKey = rapidApiKey();
  if (!rapidKey) return corsJson(200, { ok: true, found: false, verdict: 'introuvable', raison: 'API vol non configurée', source: 'none' });

  let rows;
  try {
    rows = await fetchAerodatabox(flight, dateYmd, rapidKey);
  } catch (e) {
    // erreur transitoire → on ne met PAS en cache (on réessaiera plus tard)
    return corsJson(200, { ok: true, found: false, verdict: 'introuvable', raison: 'API vol indisponible', source: 'error' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return corsJson(200, await remember({ ok: true, found: false, verdict: 'introuvable', raison: 'Vol non retrouvé pour cette date', source: 'adb' }));
  }

  const f = rows[0];
  const dep = f.departure || {};
  const arr = f.arrival || {};
  const depIata = dep.iataCode || (dep.airport && dep.airport.iataCode) || '';
  const arrIata = arr.iataCode || (arr.airport && arr.airport.iataCode) || '';
  const delayMin = (typeof arr.delay === 'number') ? arr.delay : null;
  const distanceKm = (f.geography && f.geography.distance) || f.distance || null;

  const v = verdict({ depIata, arrIata, delayMin, distanceKm, carrierIata, status: f.status || '', typeVol: 'direct' });

  const route = depIata && arrIata ? `${depIata} → ${arrIata}` : '';
  return corsJson(200, await remember({
    ok: true, found: true, source: 'adb',
    ...v,
    route,
    airline: f.airline || '',
    scheduledDep: dep.scheduled || null,
    scheduledArr: arr.scheduled || null,
  }));
};
