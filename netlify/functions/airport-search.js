/**
 * Proxy recherche aéroports/villes — Aviation Edge OU Amadeus (clé jamais exposée côté client).
 *
 * Aviation Edge (prioritaire si la clé est définie) :
 *   Variable Netlify : AVIATION_EDGE_KEY
 *   Doc : https://aviation-edge.com/airport-autocomplete
 *
 * Amadeus (sinon) :
 *   Variables Netlify : AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
 *   Optionnel : AMADEUS_HOST (test.api.amadeus.com ou api.amadeus.com)
 */

const AMADEUS_HOST = process.env.AMADEUS_HOST || 'test.api.amadeus.com';
const TOKEN_CACHE = { token: null, expires: 0 };

// ——— Aviation Edge : autocomplete (clé secrète côté serveur uniquement)
async function searchAviationEdge(keyword) {
  const key = process.env.AVIATION_EDGE_KEY;
  if (!key) return null;
  const q = encodeURIComponent(keyword);
  const url = `https://aviation-edge.com/v2/public/autocomplete?key=${key}&city=${q}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const items = [];
  const seen = new Set();
  function add(code, cityName, name) {
    if (!code || seen.has(code)) return;
    seen.add(code);
    const text = cityName && code ? cityName + ' (' + code + ') - ' + (name || cityName) : (name || code);
    items.push({ value: code, text });
  }
  (data.cities || []).forEach((c) => add(c.code || c.cityCode, c.cityName || c.name, c.name));
  (data.airports || []).forEach((a) => add(a.code, a.cityName || a.name, a.name));
  return items.slice(0, 20);
}

// ——— Amadeus : token + locations
async function getAmadeusToken() {
  if (TOKEN_CACHE.token && Date.now() < TOKEN_CACHE.expires) return TOKEN_CACHE.token;
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const res = await fetch(`https://${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  TOKEN_CACHE.token = data.access_token;
  TOKEN_CACHE.expires = Date.now() + (data.expires_in || 1790) * 1000;
  return TOKEN_CACHE.token;
}

function formatAmadeusItem(loc) {
  const iata = loc.iataCode || loc.address?.cityCode || '';
  const cityName = loc.address?.cityName || loc.name || '';
  const name = loc.name || cityName;
  const text = cityName && iata ? cityName + ' (' + iata + ') - ' + name : (name || iata || '');
  return { value: iata, text };
}

async function searchAmadeus(keyword) {
  const token = await getAmadeusToken();
  if (!token) return null;
  const url = `https://${AMADEUS_HOST}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=20&view=LIGHT`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.data || []).map(formatAmadeusItem).filter((i) => i.value && i.text);
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
  if (keyword.length > 50) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'keyword too long' })
    };
  }
  try {
    let items = await searchAviationEdge(keyword);
    if (!items || items.length === 0) items = await searchAmadeus(keyword);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(items || [])
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message || 'Server error' })
    };
  }
};
