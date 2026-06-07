/**
 * Cron « heures chaudes » — scan rapproché des départs Afrique → Europe.
 *
 * Complète radar-monitor (qui passe à :05) avec des passages à :25 et :45 pendant
 * la fenêtre chaude (18h-02h UTC) → cadence ~20 min → alertes annulation / retard
 * ≥3h plus fraîches. Réutilise EXACTEMENT la même logique (runAfricaEveningScan) :
 * scan jour entier des hubs MONITOR_HUBS + la même dédup d'alertes (un vol n'est
 * alerté qu'une fois, quel que soit le scan qui le détecte).
 *
 * Planifié : netlify.toml → radar-monitor-hot.
 * Manuel : POST /api/radar-monitor-hot avec le secret interne.
 */

const { isRadarBackgroundApiEnabled } = require('./lib/radar-api-policy');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { runAfricaEveningScan } = require('./radar-monitor');

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return { statusCode: 503, body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }) };
  }

  // Même politique quota que le monitor : si l'API de fond est coupée, on ne scanne pas.
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

  try {
    const entry = await runAfricaEveningScan(event);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        hot: true,
        parisHour: entry.parisHour,
        impactedCount: entry.impactedCount,
        apiRequests: entry.apiRequests,
        alerts: entry.alerts,
      }),
    };
  } catch (e) {
    console.error('radar-monitor-hot:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
