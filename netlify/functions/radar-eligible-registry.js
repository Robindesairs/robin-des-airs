/**
 * Registre permanent vols éligibles — GET / POST / DELETE
 * Auth CRM (cookie rda_crm).
 *
 * GET  /api/radar-eligible-registry
 * POST /api/radar-eligible-registry  { flights: [...], source?: string }
 * DELETE /api/radar-eligible-registry?id=AF718_CDG_DSS_2026-05-15
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');
const {
  mergeFlightsIntoRegistry,
  listRegistryFlights,
  removeRegistryEntry,
} = require('./lib/radar-eligible-registry');

const HEADERS = {
  ...corsHeaders(),
  'Cache-Control': 'private, no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: auth.error || 'Non autorisé' }),
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const limit = event.queryStringParameters?.limit;
      const result = await listRegistryFlights(event, { limit });
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(result),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters?.id || '').trim();
      if (!id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ ok: false, error: 'Paramètre id requis' }),
        };
      }
      const result = await removeRegistryEntry(event, id);
      return {
        statusCode: result.ok ? 200 : 404,
        headers: HEADERS,
        body: JSON.stringify(result),
      };
    }

    if (event.httpMethod === 'POST') {
      let body = {};
      try {
        body = event.body ? JSON.parse(event.body) : {};
      } catch (_) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ ok: false, error: 'JSON invalide' }),
        };
      }
      const flights = Array.isArray(body.flights) ? body.flights : [];
      const result = await mergeFlightsIntoRegistry(event, flights, {
        source: body.source || 'radar-ui',
      });
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Méthode non autorisée' }),
    };
  } catch (e) {
    console.error('radar-eligible-registry:', e);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: e.message || 'Erreur serveur' }),
    };
  }
};
