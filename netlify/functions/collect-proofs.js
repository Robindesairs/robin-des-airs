/**
 * Collecte / relance preuves pour un dossier existant.
 * POST /api/collect-proofs  { ref, recordId, vol, date, depart, arrivee, secret? }
 * Header : X-Proofs-Secret ou X-Airtable-Secret (= PROOFS_COLLECT_SECRET ou AIRTABLE_WEBHOOK_SECRET)
 */

const { airtableCfg } = require('./lib/airtable-robin');
const { runProofsPipeline, verifyProofsRequest } = require('./lib/proofs-collect');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Proofs-Secret, X-Airtable-Secret',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const auth = verifyProofsRequest(body, event.headers || {});
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: auth.error }) };
  }

  const ref = (body.ref || '').trim();
  const recordId = (body.recordId || '').trim();
  if (!ref) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'ref requis' }) };
  }

  const cfg = airtableCfg();
  if (!cfg) {
    return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ error: 'Airtable non configuré' }) };
  }

  try {
    const report = await runProofsPipeline(event, cfg, {
      ref,
      recordId,
      vol: body.vol,
      date: body.date,
      depart: body.depart,
      arrivee: body.arrivee,
      remarques: body.remarques,
    });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        ref: report.ref,
        reportUrl: report.links?.report || null,
        sources: report.sources,
        errors: report.errors,
      }),
    };
  } catch (e) {
    console.error('collect-proofs:', e.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
