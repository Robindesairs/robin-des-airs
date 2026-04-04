/**
 * Réception des alertes AeroDataBox (RapidAPI) — souscription webhook « FlightByNumber ».
 *
 * URL publique (à mettre dans le body curl, en HTTPS) :
 *   https://robindesairs.eu/api/aerodatabox-webhook
 *
 * Exemple d’inscription (clé uniquement en variable d’env / CI, jamais dans le dépôt) :
 *   curl --request POST \
 *     --url 'https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByNumber/KL1395?useCredits=false' \
 *     --header 'Content-Type: application/json' \
 *     --header 'x-rapidapi-host: aerodatabox.p.rapidapi.com' \
 *     --header "x-rapidapi-key: $RAPIDAPI_KEY" \
 *     --data '{"url":"https://robindesairs.eu/api/aerodatabox-webhook","maxDeliveryRetries":0}'
 *
 * Optionnel : AERODATABOX_WEBHOOK_SECRET — alors passer le même jeton en header
 *   x-aerodatabox-secret ou query ?secret=
 */

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, service: 'aerodatabox-webhook' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = process.env.AERODATABOX_WEBHOOK_SECRET;
  if (secret) {
    const h = event.headers || {};
    const got =
      h['x-aerodatabox-secret'] ||
      h['X-Aerodatabox-Secret'] ||
      (event.queryStringParameters && event.queryStringParameters.secret);
    if (got !== secret) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_) {
    payload = { raw: (event.body || '').slice(0, 500) };
  }

  const preview = JSON.stringify(payload);
  console.log('aerodatabox-webhook', preview.length > 2500 ? preview.slice(0, 2500) + '…' : preview);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
