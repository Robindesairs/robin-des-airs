/**
 * Proxy Amadeus Airport & City Search — ne pas exposer la clé API côté client.
 * Déployer avec variables d'environnement Netlify : AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
 * Optionnel : AMADEUS_HOST (défaut test.api.amadeus.com pour test, api.amadeus.com pour prod)
 */

const AMADEUS_HOST = process.env.AMADEUS_HOST || 'test.api.amadeus.com';
const TOKEN_CACHE = { token: null, expires: 0 };

async function getAmadeusToken() {
  if (TOKEN_CACHE.token && Date.now() < TOKEN_CACHE.expires) return TOKEN_CACHE.token;
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be set');
  }
  const res = await fetch(`https://${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Amadeus token error: ' + res.status + ' ' + err);
  }
  const data = await res.json();
  TOKEN_CACHE.token = data.access_token;
  TOKEN_CACHE.expires = Date.now() + (data.expires_in || 1790) * 1000;
  return TOKEN_CACHE.token;
}

function formatItem(loc) {
  const iata = loc.iataCode || loc.address?.cityCode || '';
  const cityName = loc.address?.cityName || loc.name || '';
  const name = loc.name || cityName;
  const text = cityName && iata ? cityName + ' (' + iata + ') - ' + name : (name || iata || '');
  return { value: iata, text: text };
}

exports.handler = async (event) => {
  const keyword = (event.queryStringParameters?.keyword || event.queryStringParameters?.q || '').trim();
  if (keyword.length < 3) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'keyword must be at least 3 characters' })
    };
  }
  if (keyword.length > 10) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'keyword max 10 characters' })
    };
  }
  try {
    const token = await getAmadeusToken();
    const url = `https://${AMADEUS_HOST}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=20&view=LIGHT`;
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      const err = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Amadeus API error', detail: err })
      };
    }
    const data = await res.json();
    const items = (data.data || []).map(formatItem).filter((i) => i.value && i.text);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(items)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message || 'Server error' })
    };
  }
};
