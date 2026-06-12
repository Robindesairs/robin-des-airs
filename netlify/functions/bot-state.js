/**
 * Sauvegarde DURABLE de l'état du bot WhatsApp — survit aux redeploys Railway
 * (le FS /tmp du bot est éphémère : à chaque deploy, leads/sessions étaient perdus).
 * Réservé au bot (secret WATI_WEBHOOK_SECRET, en header pour ne pas fuiter en logs).
 *
 *   POST { secret, leads, state, dossiers }  → écrit le snapshot (Blobs 'bot-state').
 *   GET  (x-bot-secret)                       → renvoie le snapshot ({ leads:[],… } si vide).
 *
 * leads/state/dossiers = tableaux [[clé, valeur], …] (Map.entries sérialisés).
 */
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { safeEqualString } = require('./lib/safe-compare');

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://robindesairs.eu', 'Access-Control-Allow-Headers': 'Content-Type, x-bot-secret', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };

  const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
  const headerSecret = (event.headers?.['x-bot-secret'] || event.headers?.['X-Bot-Secret'] || '').trim();

  const store = getBlobStore(event, 'bot-state');
  if (!store) return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'store indisponible' }) };

  if (event.httpMethod === 'GET') {
    if (expected && !safeEqualString(headerSecret, expected)) return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };
    const snap = (await store.get('snapshot', { type: 'json' }).catch(() => null)) || { leads: [], state: [], dossiers: [] };
    return { statusCode: 200, headers: H, body: JSON.stringify(snap) };
  }

  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
    if (expected && !safeEqualString(String(b.secret || '').trim(), expected)) return { statusCode: 401, headers: H, body: JSON.stringify({ error: 'unauthorized' }) };
    const arr = (x) => (Array.isArray(x) ? x.slice(-5000) : []);
    const snap = { leads: arr(b.leads), state: arr(b.state), dossiers: arr(b.dossiers), ts: new Date().toISOString() };
    await store.setJSON('snapshot', snap);
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, leads: snap.leads.length, state: snap.state.length, dossiers: snap.dossiers.length }) };
  }

  return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'GET/POST only' }) };
};
