/**
 * Netlify → Airtable (création / mise à jour / lecture)
 *
 * GET  /api/airtable-sync?ref=RDA-...&secret=...
 * POST /api/airtable-sync  { secret, dossier: { ref, prenom, nom, ... } }
 *      → upsert par Référence Dossier
 */

const {
  airtableCfg,
  recordFromAirtableFields,
  buildMandatUrl,
  airtableFindByRef,
  airtablePatch,
  airtableCreate,
  dossierToAirtableFields,
  verifySecret,
} = require('./lib/airtable-robin');

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type, X-Airtable-Secret',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  const cfg = airtableCfg();
  if (!cfg) {
    return {
      statusCode: 503,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Airtable non configuré sur Netlify' }),
    };
  }

  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const fakeBody = { secret: params.secret };
    const auth = verifySecret(fakeBody, event.headers || {});
    if (!auth.ok) {
      return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: auth.error }) };
    }
    const ref = (params.ref || '').trim();
    if (!ref) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Paramètre ref obligatoire' }) };
    }
    try {
      const recs = await airtableFindByRef(cfg, ref);
      if (!recs.length) {
        return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Dossier introuvable', ref }) };
      }
      const rec = recs[0];
      const data = recordFromAirtableFields(cfg, rec.fields || {});
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          ok: true,
          recordId: rec.id,
          ref,
          fields: rec.fields,
          dossier: data,
          mandat_url: buildMandatUrl(data, 'airtable-sync'),
        }),
      };
    } catch (e) {
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'GET ou POST' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const auth = verifySecret(body, event.headers || {});
  if (!auth.ok) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: auth.error }) };
  }

  const dossier = body.dossier || body.record || body;
  const ref = (dossier.ref || dossier.reference || '').trim();
  if (!ref) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'dossier.ref obligatoire' }) };
  }

  const fieldsPatch = dossierToAirtableFields(cfg, {
    ref,
    prenom: dossier.prenom || dossier.firstName,
    nom: dossier.nom || dossier.lastName,
    email: dossier.email,
    whatsapp: dossier.whatsapp || dossier.phone,
    address: dossier.address || dossier.adresse,
    vol: dossier.vol || dossier.flightNum,
    dateVol: dossier.dateVol || dossier.flightDate || dossier.date,
    compagnie: dossier.compagnie || dossier.airline,
    pnr: dossier.pnr,
    incident: dossier.incident || dossier.motif,
    indemnite: dossier.indemnite,
    route: dossier.route || dossier.itineraire,
    statutSuivi: dossier.statutSuivi || dossier.statut,
    remarques: dossier.remarques,
  });

  try {
    const existing = await airtableFindByRef(cfg, ref);
    if (existing.length) {
      const id = existing[0].id;
      await airtablePatch(cfg, id, fieldsPatch);
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: true, action: 'updated', recordId: id, ref }),
      };
    }
    const created = await airtableCreate(cfg, fieldsPatch);
    return {
      statusCode: 201,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: true, action: 'created', recordId: created.id, ref }),
    };
  } catch (e) {
    console.error('airtable-sync:', e.message);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};
