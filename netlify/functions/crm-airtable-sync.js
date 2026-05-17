/**
 * CRM ↔ Airtable (proxy sécurisé)
 * POST { "db": [ …dossiers… ] }
 * GET ?ref=RDA-… | ?pull=all
 * Auth : cookie rda_crm ou header X-CRM-Code
 */

const {
  airtableCfg,
  airtableListRecords,
  airtableFindByRef,
  airtableUpsertDossiers,
  dossierToAirtableFields,
  recordFromAirtableFields,
  buildMandatUrl,
} = require('./lib/airtable-robin');
const {
  crmDossierToAirtableDossier,
  airtableRecordToCrmDossier,
} = require('./lib/crm-airtable-map');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

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
      body: JSON.stringify({ error: auth.error || 'Non autorisé' }),
    };
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
    const pull = (event.queryStringParameters?.pull || '').trim().toLowerCase();
    const ref = (event.queryStringParameters?.ref || '').trim();

    if (pull === 'all') {
      try {
        const recs = await airtableListRecords(cfg);
        const dossiers = [];
        const skipped = [];
        for (const rec of recs) {
          const data = recordFromAirtableFields(cfg, rec.fields || {});
          data.recordId = rec.id;
          if (!data.ref) {
            skipped.push({ recordId: rec.id, reason: 'ref_manquante' });
            continue;
          }
          const dossier = airtableRecordToCrmDossier(data);
          if (!dossier) {
            skipped.push({ recordId: rec.id, ref: data.ref, reason: 'mapping_invalide' });
            continue;
          }
          dossiers.push({
            ref: data.ref,
            recordId: rec.id,
            dossier,
            mandat_url: buildMandatUrl(data, 'crm-import'),
          });
        }
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({
            ok: true,
            pulled: dossiers.length,
            total: recs.length,
            dossiers,
            skipped,
          }),
        };
      } catch (e) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
      }
    }

    if (!ref) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Paramètre ref ou pull=all obligatoire' }),
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

  const upsertItems = [];
  const preErrors = [];

  for (const raw of list) {
    const mapped = crmDossierToAirtableDossier(raw);
    if (!mapped || !mapped.ref) {
      preErrors.push({ ref: raw && raw.id, ok: false, error: 'ref manquante' });
      continue;
    }
    upsertItems.push({
      ref: mapped.ref,
      recordId: raw.airtable_record_id || raw.airtableRecordId || null,
      fields: dossierToAirtableFields(cfg, mapped),
    });
  }

  let results = preErrors;
  try {
    const synced = await airtableUpsertDossiers(cfg, upsertItems);
    results = results.concat(synced);
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
  }

  const pushed = results.filter((r) => r.ok).length;

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
