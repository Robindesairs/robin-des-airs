/**
 * ad-watch — Surveille les campagnes Meta actives et les arrête automatiquement.
 *
 * Règles d'arrêt (première condition atteinte) :
 *   1. Le vol passe en statut VOL / APPROCHE / ATTERRI (avion décollé)
 *   2. 6 heures écoulées depuis le lancement (fallback)
 *
 * Planifié toutes les 10 minutes via netlify.toml.
 * Manuel : GET /.netlify/functions/ad-watch
 */

const { getStore } = require('@netlify/blobs');
const { fetchAerodatabox, parisYmd, rapidApiKey } = require('./lib/aerodatabox-flight');

const META_API   = 'https://graph.facebook.com/v19.0';
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h

// Phases qui indiquent que l'avion a décollé → plus utile de garder la pub
const PHASES_DECOLE = new Set(['departed', 'active', 'en route', 'airborne', 'diverted']);
const STATUTS_DECOLE = new Set(['VOL', 'APPROCHE', 'ATTERRI']);

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

    // Règle 1 : vérifier statut vol (si pas déjà expiré et qu'on a le numéro de vol)
    if (!reason && meta.vol && rapidKey) {
      try {
        const today = parisYmd();
        const rows  = await fetchAerodatabox(meta.vol, today, rapidKey);
        const row   = rows && rows[0];
        if (row) {
          const status = String(row.status || row.flightStatus || '').toLowerCase();
          const phase  = String(row.phase || '').toUpperCase();
          if (PHASES_DECOLE.has(status) || STATUTS_DECOLE.has(phase)) {
            reason = 'flight_departed';
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
