/**
 * Infos vol par numéro — AeroDataBox (RapidAPI) uniquement.
 *
 * Variable Netlify obligatoire : RAPIDAPI_KEY ou AERODATABOX_RAPIDAPI_KEY
 * Optionnel : AERODATABOX_RAPIDAPI_HOST (défaut aerodatabox.p.rapidapi.com)
 *
 * GET ?flight=KL1395[&date=YYYY-MM-DD]
 * date : jour local Europe/Paris si omis.
 *
 * Réponse : tableau au format attendu par le site (departure/arrival iataCode, delay, geography).
 */

const { fetchAerodatabox, parisYmd, rapidApiKey } = require('./lib/aerodatabox-flight');

function corsJson(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  const flightNumber = (event.queryStringParameters?.flight || '').trim().toUpperCase().replace(/\s/g, '');
  const dateParam = (event.queryStringParameters?.date || '').trim();

  if (!flightNumber) {
    return corsJson(400, { error: 'Numéro de vol manquant' });
  }

  const rapidKey = rapidApiKey();
  if (!rapidKey) {
    return corsJson(500, { error: 'Configuration manquante : RAPIDAPI_KEY (AeroDataBox / RapidAPI)' });
  }

  const dateYmd = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : parisYmd();

  try {
    const out = await fetchAerodatabox(flightNumber, dateYmd, rapidKey);

    if (!out || !Array.isArray(out) || out.length === 0) {
      return corsJson(200, { error: 'Vérifiez votre numéro de vol' });
    }

    const first = out[0];
    const dep = first.departure || {};
    const arr = first.arrival || {};
    const depIata = dep.iataCode || (dep.airport && dep.airport.iataCode) || '';
    const arrIata = arr.iataCode || (arr.airport && arr.airport.iataCode) || '';
    if (!depIata || !arrIata) {
      console.error('flight-info: structure invalide', { flightNumber, first });
      return corsJson(200, { error: 'Vérifiez votre numéro de vol' });
    }

    console.log('flight-info OK', flightNumber, '→', depIata, arrIata, '(AerodataBox)');
    return corsJson(200, out);
  } catch (error) {
    console.error('flight-info:', error.message || error, error);
    return corsJson(200, {
      error:
        'Vol introuvable ou API indisponible. Essayez une autre date (?date=YYYY-MM-DD) ou vérifiez le numéro.'
    });
  }
};
