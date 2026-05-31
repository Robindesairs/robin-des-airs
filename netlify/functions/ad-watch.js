/**
 * ad-watch — Surveille les campagnes Meta actives et les arrête automatiquement.
 *
 * Règles d'arrêt selon le sens du vol :
 *
 *   AF→EU (ex: DSS→CDG) :
 *     Passagers bloqués à l'aéroport africain (Dakar).
 *     → Arrêt quand l'avion DÉCOLLE d'Afrique (statut departed/active).
 *
 *   EU→AF (ex: CDG→DSS) :
 *     Passagers bloqués en Europe, on cible les gens à Dakar qui attendent.
 *     → Arrêt quand l'avion ATTERRIT en Afrique (statut arrived/landed).
 *
 *   Fallback : 6h dans tous les cas.
 *
 * Planifié toutes les 10 minutes via netlify.toml.
 */

const { getStore } = require('@netlify/blobs');
const { fetchAerodatabox, parisYmd, rapidApiKey } = require('./lib/aerodatabox-flight');

const META_API   = 'https://graph.facebook.com/v19.0';
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h

// AF_IATA : codes aéroports africains (pour détecter le sens du vol)
const AF_IATA = new Set([
  'DSS','DKR','ABJ','BKO','DLA','NSI','LBV','BZV','PNR','FIH','FIH','NDJ','BGF',
  'LOS','ABV','ACC','NBO','MBA','EBB','DAR','JRO','ZNZ','JNB','CPT','DUR',
  'TNR','MRU','MPM','LUN','HRE','WDH','ADD','KGL','JIB','LAD','LFW','COO',
  'CKY','FNA','OXB','NIM','OUA','BJL','SSG','GOM','FKI','FBM',
]);

// Statuts AeroDataBox → avion a décollé (AF→EU : on arrête ici)
const STATUTS_DECOLE = new Set(['departed', 'active', 'en route', 'airborne', 'diverted']);
// Statuts AeroDataBox → avion a atterri (EU→AF : on arrête ici)
const STATUTS_ATTERRI = new Set(['arrived', 'landed', 'completed']);

exports.handler = async (event) => {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'META_ADS_ACCESS_TOKEN manquant' }) };

  let store;
  try {
    store = getStore('active-ad-campaigns');
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'Blobs indisponible', reason: e.message }) };
  }

  // Lister toutes les campagnes actives stockées
  let keys = [];
  try {
    const list = await store.list();
    keys = (list.blobs || []).map((b) => b.key);
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, campaigns: 0, note: e.message }) };
  }

  if (keys.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, campaigns: 0 }) };
  }

  const rapidKey = rapidApiKey();
  const now      = Date.now();
  const results  = [];

  for (const campaignId of keys) {
    let meta = {};
    try {
      meta = await store.get(campaignId, { type: 'json' }) || {};
    } catch { /* lecture échouée, on tente quand même */ }

    const launchedAt = meta.launchedAt || now;
    const ageMs      = now - launchedAt;
    let   reason     = null;

    // Règle 2 : 6h écoulées
    if (ageMs >= MAX_AGE_MS) {
      reason = 'expired_6h';
    }

    // Règle 1 : vérifier statut vol selon le sens
    if (!reason && meta.vol && rapidKey) {
      // Sens du vol : AF→EU si départ africain, EU→AF si arrivée africaine
      const isAfEu = AF_IATA.has((meta.dep || '').toUpperCase());
      try {
        const today = parisYmd();
        const rows  = await fetchAerodatabox(meta.vol, today, rapidKey);
        const row   = rows && rows[0];
        if (row) {
          const status = String(row.status || row.flightStatus || '').toLowerCase();
          if (isAfEu) {
            // AF→EU : passagers à l'aéroport africain → arrêt quand avion décolle
            if (STATUTS_DECOLE.has(status)) reason = 'flight_departed_africa';
          } else {
            // EU→AF : gens qui attendent à l'aéroport africain → arrêt quand avion atterrit
            if (STATUTS_ATTERRI.has(status)) reason = 'flight_arrived_africa';
            // Mais si l'avion est encore en vol (departed EU) → on garde la pub active
            // car les gens à destination attendent encore
          }
        }
      } catch (e) {
        console.warn('[ad-watch] ADB check failed for', meta.vol, ':', e.message);
      }
    }

    if (reason) {
      try {
        await metaPause(campaignId, token);
        await store.delete(campaignId);
        results.push({ campaignId, stopped: true, reason, vol: meta.vol || '?' });
        console.log(`[ad-watch] Campagne ${campaignId} arrêtée (${reason}) — vol ${meta.vol}`);
      } catch (e) {
        results.push({ campaignId, stopped: false, error: e.message });
      }
    } else {
      const remainingMin = Math.round((MAX_AGE_MS - ageMs) / 60000);
      results.push({ campaignId, active: true, vol: meta.vol || '?', remainingMin });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, checked: keys.length, results }),
  };
};

async function metaPause(campaignId, token) {
  const res = await fetch(`${META_API}/${campaignId}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PAUSED' }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}
