/**
 * Config veille serveur — GET/POST (session CRM).
 * Permet d'activer/désactiver aller et retour sans contacter le support.
 *
 * GET  /api/radar-veille-config
 * POST /api/radar-veille-config  { allerEnabled?, returnEnabled?, clearHistory? }
 */

const { checkCrmAccess } = require('./lib/crm-access');
const { publicCorsHeaders, denyResponse } = require('./lib/internal-auth');
const {
  loadConfig,
  saveConfig,
  loadState,
  effectiveFlags,
  clearVeilleData,
} = require('./lib/radar-veille-store');

function json(status, body) {
  return {
    statusCode: status,
    headers: publicCorsHeaders({ 'Cache-Control': 'no-store' }),
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: publicCorsHeaders(), body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return denyResponse(401, auth.error || 'Non autorisé', 'public');
  }

  if (method === 'GET') {
    try {
      const config = await loadConfig(event);
      const flags = effectiveFlags(config);
      const state = await loadState(event);
      return json(200, {
        ok: true,
        config,
        effective: flags,
        lastRuns: state.lastRuns || {},
        lastScan: state.lastScan || null,
      });
    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  if (method !== 'POST') {
    return json(405, { ok: false, error: 'Méthode non autorisée' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { ok: false, error: 'JSON invalide' });
  }

  try {
    if (body.clearHistory) {
      await clearVeilleData(event);
    }

    const patch = {};
    if (typeof body.allerEnabled === 'boolean') patch.allerEnabled = body.allerEnabled;
    if (typeof body.returnEnabled === 'boolean') patch.returnEnabled = body.returnEnabled;
    if (Object.keys(patch).length) {
      patch.updatedBy = 'radar-ui';
      await saveConfig(event, patch);
    }

    const config = await loadConfig(event);
    const flags = effectiveFlags(config);
    const state = await loadState(event);

    return json(200, {
      ok: true,
      config,
      effective: flags,
      lastRuns: state.lastRuns || {},
      lastScan: state.lastScan || null,
      cleared: !!body.clearHistory,
    });
  } catch (e) {
    return json(500, { ok: false, error: e.message });
  }
};
