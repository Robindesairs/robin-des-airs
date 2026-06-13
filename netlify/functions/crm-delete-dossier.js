/**
 * Suppression dossier CRM — code direction côté serveur (CRM_SUPPRESSION_CODE).
 * POST { "ref": "RDA-…", "code": "…" }
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');
const { airtableCfg, airtableFindByRef } = require('./lib/airtable-robin');
let blobsLib = null; try { blobsLib = require('./lib/netlify-blobs-store'); } catch (e) {}

const HEADERS = corsHeaders('crm');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return {
      statusCode: auth.configured === false ? 503 : 401,
      headers: HEADERS,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };
  }

  const expected = (process.env.CRM_SUPPRESSION_CODE || '').trim();
  if (!expected) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'CRM_SUPPRESSION_CODE non configuré sur Netlify',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const code = String(body.code || '').trim();
  const ref = String(body.ref || body.id || '').trim();

  if (code !== expected) {
    return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Code suppression incorrect' }) };
  }
  if (!ref) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'ref obligatoire' }) };
  }

  // Suppression RÉELLE dans Airtable (avant : no-op → le dossier réapparaissait au prochain import).
  let deletedAirtable = 0;
  try {
    const cfg = airtableCfg();
    if (cfg) {
      const recs = await airtableFindByRef(cfg, ref);
      for (const r of (recs || [])) {
        if (!r || !r.id) continue;
        const resp = await fetch(`https://api.airtable.com/v0/${cfg.base}/${cfg.table}/${r.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${cfg.key}` },
        });
        if (resp.ok) deletedAirtable++;
      }
    }
  } catch (e) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: 'Airtable: ' + e.message }) };
  }

  // Best-effort : retirer le dossier du store Blobs 'mandats' (sinon crm-backfill le ressusciterait).
  try { const st = blobsLib && blobsLib.getBlobStore(event, 'mandats'); if (st && st.delete) await st.delete('m/' + ref); } catch (e) { /* non bloquant */ }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, ref, deleted: true, deletedAirtable }),
  };
};
