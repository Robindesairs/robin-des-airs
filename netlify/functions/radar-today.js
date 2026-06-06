/**
 * GET /api/radar-today
 * Expose (lecture publique) les vols ÉLIGIBLES réellement détectés par le radar
 * (registre Netlify Blobs alimenté par radar-monitor). Données de vols uniquement
 * — aucune donnée personnelle. Sert le panneau Radar / poste Malik du bureau.
 */

const { listRegistryFlights } = require('./lib/radar-eligible-registry');

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  try {
    const res = await listRegistryFlights(event, { limit: 60 });
    const flights = (res.flights || []).map((f) => ({
      flight: f.vol || f.flight || '—',
      dep: f.dep || '',
      arr: f.arr || '',
      via: f.via || '',
      cancelled: !!f.cancelled || f.statut === 'ANNULE',
      delayMinutes: f.retardMin != null ? f.retardMin : (f.delayMinutes != null ? f.delayMinutes : null),
      eligible: f.eligible !== false,
      date: f.date || null,
      compensation: f.compensation || 600,
      // Heures + statut + tracker : déjà stockés dans le registre, aucun appel API en plus
      std: f.std || null,
      sta: f.sta || null,
      eta: f.eta || null,
      statut: f.statut || null,
      trackerUrl: f.trackerUrl || '',
      // Report d'annulation (prochain vol) + fraîcheur — pour le panneau radar du bureau
      rescheduledTo: f.rescheduledTo || null,
      rescheduledRoute: f.rescheduledRoute || null,
      rescheduledDayOffset: f.rescheduledDayOffset != null ? f.rescheduledDayOffset : null,
      nextFlightFound: f.nextFlightFound != null ? !!f.nextFlightFound : null,
      cancelDetectedAt: f.cancelDetectedAt || null,
    }));
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: res.ok !== false, total: res.total || flights.length, updatedAt: res.updatedAt || null, flights }),
    };
  } catch (e) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, flights: [] }) };
  }
};
