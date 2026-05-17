/**
 * Auth espace agence partenaire
 */

const { findAgencyAccount, loadAgencyAccounts } = require('./lib/agency-accounts');
const {
  makeAgencyToken,
  getAgencySession,
  agencyCookieHeader,
} = require('./lib/agency-access');
const { corsHeaders, getAgencyAuthSecret } = require('./lib/auth-config');

const HEADERS = corsHeaders('agency');

function json(statusCode, body, extra = {}) {
  return { statusCode, headers: { ...HEADERS, ...extra }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (!getAgencyAuthSecret()) {
    return json(503, {
      ok: false,
      error: 'AGENCY_AUTH_SECRET requis sur Netlify (production)',
    });
  }

  if (loadAgencyAccounts().length === 0) {
    return json(503, {
      ok: false,
      error: 'AGENCY_ACCOUNTS non configuré (aucun compte agence)',
    });
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
      const proto = String(
        event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || ''
      )
        .split(',')[0]
        .trim();
      const secure = proto === 'https' ? '; Secure' : '';
      return json(
        200,
        { ok: true },
        { 'Set-Cookie': `rda_agency=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` }
      );
    }

    const account = findAgencyAccount(body.code, body.pass);
    if (!account) {
      return json(401, { ok: false, error: 'Code agence ou mot de passe incorrect' });
    }

    try {
      const token = makeAgencyToken(account.code);
      return json(
        200,
        {
          ok: true,
          agency: { code: account.code, name: account.name },
        },
        { 'Set-Cookie': agencyCookieHeader(token, event) }
      );
    } catch (e) {
      return json(503, { ok: false, error: e.message });
    }
  }

  return json(405, { ok: false, error: 'GET ou POST' });
};
