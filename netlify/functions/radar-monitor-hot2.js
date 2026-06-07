/**
 * Cron « hubs secondaires » — surveillance à cadence moyenne (~45 min) des autres
 * aéroports diaspora Afrique → Europe (hors hubs prioritaires DSS/ABJ).
 *
 * Pyramide de fraîcheur :
 *   - radar-monitor (:05) + radar-monitor-hot (:25,:45) → DSS/ABJ toutes les ~20 min.
 *   - radar-monitor-hot2 (:10,:55)                      → le reste, écart max ~45 min.
 *
 * Hubs = getSecondaryHubs() (env MONITOR_HUBS_SECONDARY, sinon AFRICA_EVENING_HUBS
 * moins les prioritaires). Même logique de scan + alertes + dédup que les autres.
 *
 * Planifié : netlify.toml → radar-monitor-hot2.
 * Manuel : POST /api/radar-monitor-hot2 avec le secret interne.
 */

const { isRadarBackgroundApiEnabled } = require('./lib/radar-api-policy');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { getSecondaryHubs } = require('./lib/radar-monitor-config');
const { runAfricaEveningScan } = require('./radar-monitor');

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return { statusCode: 503, body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }) };
  }

  if (!isRadarBackgroundApiEnabled()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, skipped: 'background_api_disabled' }),
    };
  }

  // Réservé au cron Netlify (ou appel interne signé) — pas de déclenchement public (quota).
  if (!isNetlifyScheduled(event)) {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {}
    const auth = verifyInternalSecret(event, body);
    if (!auth.ok) {
      return {
        statusCode: 401,
        headers: publicCorsHeaders({ 'Cache-Control': 'no-store' }),
        body: JSON.stringify({ ok: false, error: auth.error }),
      };
    }
  }

  const hubs = getSecondaryHubs();
  if (!hubs.length) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, skipped: 'no_secondary_hubs' }),
    };
  }

  try {
    const entry = await runAfricaEveningScan(event, { hubs, source: 'radar-monitor-hot2' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        tier: 'secondary',
        hubs: hubs.length,
        impactedCount: entry.impactedCount,
        apiRequests: entry.apiRequests,
        alerts: entry.alerts,
      }),
    };
  } catch (e) {
    console.error('radar-monitor-hot2:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
