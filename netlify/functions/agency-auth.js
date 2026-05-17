/**
 * Auth espace agence partenaire
 * GET  /api/agency-auth  → session active ?
 * POST /api/agency-auth  { "code", "pass" } | { "logout": true }
 */

const { findAgencyAccount } = require('./lib/agency-accounts');
const {
  makeAgencyToken,
  getAgencySession,
  agencyCookieHeader,
} = require('./lib/agency-access');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode, body, extra = {}) {
  return { statusCode, headers: { ...HEADERS, ...extra }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const agency = getAgencySession(event);
    return json(200, {
      ok: !!agency,
      agency: agency ? { code: agency.code, name: agency.name } : null,
    });
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'JSON invalide' });
    }

    if (body.logout === true) {
      return json(
        200,
        { ok: true },
        { 'Set-Cookie': 'rda_agency=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
      );
    }

    const account = findAgencyAccount(body.code, body.pass);
    if (!account) {
      return json(401, { ok: false, error: 'Code agence ou mot de passe incorrect' });
    }

    const token = makeAgencyToken(account.code);
    return json(
      200,
      {
        ok: true,
        agency: { code: account.code, name: account.name },
      },
      { 'Set-Cookie': agencyCookieHeader(token, event) }
    );
  }

  return json(405, { ok: false, error: 'GET ou POST' });
};
