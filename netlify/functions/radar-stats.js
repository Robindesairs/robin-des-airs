/**
 * Statistiques radar (lecture seule) — Netlify Blobs.
 * GET /api/radar-stats?days=14
 */

const { loadStatsReport } = require('./lib/radar-stats-store');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'private, max-age=300',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const days = Math.min(
    30,
    Math.max(1, parseInt(event.queryStringParameters?.days || '14', 10) || 14)
  );

  try {
    const report = await loadStatsReport(event, days);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        daysRequested: days,
        index: report.index,
        daily: report.days,
        hint: 'Données alimentées par radar-monitor (8h, 16-17h, 18h-2h Paris). Rapport email matin si RESEND_API_KEY configuré.',
      }),
    };
  } catch (e) {
    console.error('radar-stats:', e);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: e.message, index: { days: [] }, daily: [] }),
    };
  }
};
