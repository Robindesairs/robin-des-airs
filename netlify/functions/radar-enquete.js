/**
 * POST /api/radar-enquete
 * Enquête automatique d'un vol retardé/annulé détecté par le radar (poste Malik du bureau) :
 *   cause probable + circonstance extraordinaire + météo METAR + rotation précédente de l'appareil.
 * Body : { vol, date?, dep?, arr?, delayMin?, cancelled?, force? }
 * Réponse : { ok, enquete:{...} }   (résultat mis en cache 12 h par VOL_DATE — pas de re-facturation)
 *
 * Données vol uniquement, aucune donnée personnelle. Rate-limité (coût IA web_search).
 */

const { runEnquete } = require('./lib/radar-enquete');
const { checkRateLimit } = require('./lib/rate-limit');

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'POST uniquement' }) };
  }

  // Plafond anti-abus (l'enquête consomme du web_search payant). Cache 12 h côté serveur en plus.
  const rl = await checkRateLimit(event, { key: 'radar-enquete', max: 40, windowSec: 600 });
  if (!rl.ok) return rl.response;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'JSON invalide' }) }; }

  const vol = String(body.vol || '').toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(vol)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'numéro de vol invalide' }) };
  }

  try {
    const enquete = await runEnquete(event, {
      vol,
      date: body.date,
      dep: body.dep,
      arr: body.arr,
      airline: body.airline,
      delayMin: body.delayMin,
      cancelled: !!body.cancelled,
      route: body.route,
    }, { force: !!body.force });

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: enquete.ok !== false, enquete }) };
  } catch (e) {
    console.error('radar-enquete:', e.message);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
