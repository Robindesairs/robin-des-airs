/**
 * CRM → Airtable (proxy sécurisé, clé API côté serveur Netlify)
 *
 * POST /api/crm-airtable-sync?code=…  { "db": [ …dossiers CRM… ] }
 * GET  /api/crm-airtable-sync?code=…&ref=RDA-…  → import d’une ligne Airtable
 *
 * Auth : même code que /api/crm-backup (CRM_ACCESS_CODE ou ?code=).
 */

const {
  airtableCfg,
  airtableFindByRef,
  airtablePatch,
  airtableCreate,
  dossierToAirtableFields,
  recordFromAirtableFields,
  buildMandatUrl,
} = require('./lib/airtable-robin');
const {
  crmDossierToAirtableDossier,
  airtableRecordToCrmDossier,
} = require('./lib/crm-airtable-map');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-CRM-Code',
  'Cache-Control': 'no-store',
};

function checkAuth(event) {
  const crmCode = process.env.CRM_ACCESS_CODE;
  if (!crmCode) return true;
  const provided =
    event.queryStringParameters?.code ||
    event.headers?.['x-crm-code'] ||
    event.headers?.['X-CRM-Code'];
  return provided === crmCode;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (!checkAuth(event)) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  const cfg = airtableCfg();
  if (!cfg) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({
        error: 'Airtable non configuré (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID)',
      }),
    };
  }

  if (event.httpMethod === 'GET') {
    const ref = (event.queryStringParameters?.ref || '').trim();
    if (!ref) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Paramètre ref obligatoire' }),
      };
    }
    try {
      const recs = await airtableFindByRef(cfg, ref);
      if (!recs.length) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Introuvable', ref }) };
      }
      const rec = recs[0];
      const data = recordFromAirtableFields(cfg, rec.fields || {});
      data.recordId = rec.id;
      const dossier = airtableRecordToCrmDossier(data);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          ok: true,
          ref,
          recordId: rec.id,
          dossier,
          mandat_url: buildMandatUrl(data, 'crm-import'),
        }),
      };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'GET ou POST' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const list = Array.isArray(body.db)
    ? body.db
    : Array.isArray(body.dossiers)
      ? body.dossiers
      : body.dossier
        ? [body.dossier]
        : [];

  if (!list.length) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Champ db[] ou dossiers[] obligatoire' }) };
  }

  const results = [];
  let pushed = 0;

  for (const raw of list) {
    const mapped = crmDossierToAirtableDossier(raw);
    if (!mapped || !mapped.ref) {
      results.push({ ref: raw && raw.id, ok: false, error: 'ref manquante' });
      continue;
    }
    const fieldsPatch = dossierToAirtableFields(cfg, mapped);
    try {
      const existing = await airtableFindByRef(cfg, mapped.ref);
      if (existing.length) {
        const id = existing[0].id;
        await airtablePatch(cfg, id, fieldsPatch);
        results.push({ ref: mapped.ref, ok: true, action: 'updated', recordId: id });
      } else {
        const created = await airtableCreate(cfg, fieldsPatch);
        results.push({
          ref: mapped.ref,
          ok: true,
          action: 'created',
          recordId: created && created.id,
        });
      }
      pushed += 1;
    } catch (e) {
      results.push({ ref: mapped.ref, ok: false, error: e.message });
    }
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: results.every((r) => r.ok),
      pushed,
      total: list.length,
      results,
    }),
  };
};
