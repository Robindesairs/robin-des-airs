/**
 * Suppression dossier CRM — code direction côté serveur (CRM_SUPPRESSION_CODE).
 * POST { "ref": "RDA-…", "code": "…" }
 */

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

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, ref, deleted: true }),
  };
};
