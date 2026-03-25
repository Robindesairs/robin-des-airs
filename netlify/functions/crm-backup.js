/**
 * crm-backup — Robin des Airs
 * Gestion des points de restauration du CRM (Netlify Blobs).
 *
 * GET  /api/crm-backup          → liste les 10 dernières sauvegardes
 * POST /api/crm-backup          → crée un nouveau point de restauration
 * GET  /api/crm-backup?key=...  → récupère une sauvegarde précise (restore)
 * DELETE /api/crm-backup?key=.. → supprime une sauvegarde
 *
 * Protégé par CRM_ACCESS_CODE (header X-CRM-Code ou query ?code=).
 */

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require('@netlify/blobs'); } catch (e) {}

const STORE_NAME = 'robin-crm-backups';
const MAX_BACKUPS = 10;

function checkAuth(event) {
  const crmCode = process.env.CRM_ACCESS_CODE;
  if (!crmCode) return true; // pas de code configuré = accès libre
  const provided =
    event.queryStringParameters?.code ||
    event.headers?.['x-crm-code'] ||
    event.headers?.['X-CRM-Code'];
  return provided === crmCode;
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  if (!checkAuth(event)) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  if (!netlifyBlobsModule) {
    return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ error: 'Blobs non disponibles' }) };
  }

  const blobs = netlifyBlobsModule;
  if (blobs.connectLambda && event) blobs.connectLambda(event);
  const store = blobs.getStore(STORE_NAME);

  // ── GET : liste ou restore ──────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const key = event.queryStringParameters?.key;

    // Restore d'une sauvegarde spécifique
    if (key) {
      const raw = await store.get(key);
      if (!raw) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Sauvegarde introuvable' }) };
      return { statusCode: 200, headers: HEADERS, body: typeof raw === 'string' ? raw : JSON.stringify(raw) };
    }

    // Liste des sauvegardes (index stocké séparément)
    const indexRaw = await store.get('__index');
    const index = indexRaw ? (typeof indexRaw === 'string' ? JSON.parse(indexRaw) : indexRaw) : [];
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ backups: index }) };
  }

  // ── POST : créer un point de restauration ──────────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

    if (!body.db || !Array.isArray(body.db)) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Champ db[] manquant' }) };
    }

    const now = new Date();
    const ts = now.getTime();
    const label = body.label || now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const key = `backup_${ts}`;

    const snapshot = {
      key,
      label,
      ts,
      count: body.db.length,
      db: body.db,
    };

    await store.set(key, JSON.stringify(snapshot));

    // Mettre à jour l'index
    const indexRaw = await store.get('__index');
    let index = indexRaw ? (typeof indexRaw === 'string' ? JSON.parse(indexRaw) : indexRaw) : [];
    index.unshift({ key, label, ts, count: body.db.length });

    // Garder seulement MAX_BACKUPS
    if (index.length > MAX_BACKUPS) {
      const toDelete = index.splice(MAX_BACKUPS);
      for (const old of toDelete) {
        try { await store.delete(old.key); } catch {}
      }
    }

    await store.set('__index', JSON.stringify(index));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ success: true, key, label, count: body.db.length, backups: index }),
    };
  }

  // ── DELETE : supprimer une sauvegarde ──────────────────────────────────
  if (event.httpMethod === 'DELETE') {
    const key = event.queryStringParameters?.key;
    if (!key) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'key manquant' }) };

    await store.delete(key);

    const indexRaw = await store.get('__index');
    let index = indexRaw ? (typeof indexRaw === 'string' ? JSON.parse(indexRaw) : indexRaw) : [];
    index = index.filter(b => b.key !== key);
    await store.set('__index', JSON.stringify(index));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, backups: index }) };
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
