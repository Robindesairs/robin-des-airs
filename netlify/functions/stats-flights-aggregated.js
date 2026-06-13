/**
 * Statistiques vols éligibles — agrégation par COMPAGNIE et par ROUTE.
 * Source : registre permanent des vols éligibles CE 261 (Netlify Blobs robin-radar).
 *
 * GET /api/stats-flights-aggregated?days=90
 *   → { ok, period, summary, airlines:[...], routes:[...], timeline:[...] }
 *
 * « les compagnies / routes les plus en retard, et tout agrégat utile » (page statistiques.html).
 * Lecture seule, protégé par accès CRM (mêmes données que le registre éligible).
 */

const { listRegistryFlights } = require('./lib/radar-eligible-registry');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');

const HEADERS = {
  ...corsHeaders(),
  'Cache-Control': 'private, max-age=300',
};

// Noms lisibles des compagnies les plus fréquentes du corridor Europe ↔ Afrique.
const AIRLINE_NAMES = {
  AF: 'Air France', KL: 'KLM', SN: 'Brussels Airlines', LH: 'Lufthansa',
  IB: 'Iberia', TP: 'TAP Air Portugal', AT: 'Royal Air Maroc', TK: 'Turkish Airlines',
  HC: 'Air Sénégal', HF: 'Air Côte d\'Ivoire', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines',
  DS: 'easyJet (DS/Corsair)', SS: 'Corsair', MS: 'EgyptAir', RAM: 'Royal Air Maroc',
  AC: 'Air Canada', DL: 'Delta', UA: 'United', BA: 'British Airways', LX: 'SWISS',
  OS: 'Austrian', FR: 'Ryanair', VY: 'Vueling', U2: 'easyJet', W6: 'Wizz Air',
  QC: 'Camair-Co', WB: 'RwandAir', KP: 'ASKY', '2J': 'Air Burkina',
};

function airlineName(code) {
  const c = String(code || '').toUpperCase();
  return AIRLINE_NAMES[c] || c || '—';
}

function inWindow(dateStr, sinceMs) {
  const t = Date.parse(String(dateStr || '').slice(0, 10));
  if (Number.isNaN(t)) return true; // pas de date fiable → on garde (mieux vaut compter que perdre)
  return t >= sinceMs;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: auth.error || 'Non autorisé' }) };
  }

  const days = Math.min(365, Math.max(1, parseInt(event.queryStringParameters?.days || '90', 10) || 90));
  const sinceMs = Date.now() - days * 86400000;

  try {
    const reg = await listRegistryFlights(event, { limit: 5000 });
    if (!reg.ok) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: reg.error || 'registre indisponible', airlines: [], routes: [] }) };
    }

    const flights = (reg.flights || []).filter((f) => inWindow(f.date, sinceMs));

    const byAirline = new Map();
    const byRoute = new Map();
    const byDay = new Map();
    let totalCancelled = 0, totalDelayed = 0;

    const bump = (map, key, f) => {
      let a = map.get(key);
      if (!a) { a = { key, total: 0, cancelled: 0, delayed: 0, sumDelay: 0, maxDelay: 0, routes: new Set() }; map.set(key, a); }
      a.total += 1;
      if (f.cancelled) a.cancelled += 1;
      const dm = Number(f.retardMin || f.delayMinutes || 0) || 0;
      if (!f.cancelled && dm >= 180) a.delayed += 1;
      if (!f.cancelled && dm > 0) { a.sumDelay += dm; a.maxDelay = Math.max(a.maxDelay, dm); }
      if (f.dep && f.arr) a.routes.add(`${f.dep}→${f.arr}`);
      return a;
    };

    for (const f of flights) {
      const code = String(f.airlineIata || f.comp || (f.vol || '').slice(0, 2) || '—').toUpperCase().slice(0, 3);
      const route = (f.dep && f.arr) ? `${f.dep}→${f.arr}` : '—';
      bump(byAirline, code, f);
      bump(byRoute, route, f);
      if (f.cancelled) totalCancelled += 1; else if (Number(f.retardMin || f.delayMinutes || 0) >= 180) totalDelayed += 1;
      const day = String(f.date || '').slice(0, 10);
      if (day) {
        const d = byDay.get(day) || { date: day, total: 0, cancelled: 0, delayed: 0 };
        d.total += 1; if (f.cancelled) d.cancelled += 1; else if (Number(f.retardMin || f.delayMinutes || 0) >= 180) d.delayed += 1;
        byDay.set(day, d);
      }
    }

    const finalize = (map, withName) => Array.from(map.values())
      .map((a) => ({
        key: a.key,
        name: withName ? airlineName(a.key) : a.key,
        total: a.total,
        cancelled: a.cancelled,
        delayed: a.delayed,
        avgDelayMin: a.delayed || a.sumDelay ? Math.round(a.sumDelay / Math.max(1, a.total - a.cancelled)) : 0,
        maxDelayMin: a.maxDelay,
        routesCount: a.routes.size,
        // Valeur radar potentielle INDICATIVE (600 € forfait haut, non garantie — sert au tri/priorisation).
        potentielEur: a.total * 600,
      }))
      .sort((x, y) => y.total - x.total);

    const airlines = finalize(byAirline, true).slice(0, 40);
    const routes = finalize(byRoute, false).slice(0, 60);
    const timeline = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-90);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        period: { days, since: new Date(sinceMs).toISOString().slice(0, 10) },
        registryUpdatedAt: reg.updatedAt || null,
        summary: {
          totalFlights: flights.length,
          totalCancelled,
          totalDelayed,
          distinctAirlines: byAirline.size,
          distinctRoutes: byRoute.size,
          potentielEur: flights.length * 600,
        },
        airlines,
        routes,
        timeline,
        hint: 'Vols éligibles CE261 captés par le radar (annulés ou retard arrivée ≥ 3 h). « potentielEur » = indicatif (600 € × vols), pas un montant garanti.',
      }),
    };
  } catch (e) {
    console.error('stats-flights-aggregated:', e);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, airlines: [], routes: [] }) };
  }
};
