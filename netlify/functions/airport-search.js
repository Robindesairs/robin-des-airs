/**
 * Proxy recherche aéroports/villes — Aviation Edge (prioritaire) ou Amadeus.
 * Variable Netlify : AVIATION_EDGE_KEY
 * Doc : https://aviation-edge.com/airport-autocomplete
 */

const AMADEUS_HOST = process.env.AMADEUS_HOST || 'test.api.amadeus.com';
const TOKEN_CACHE = { token: null, expires: 0 };

/** Mapping Aviation Edge : nameCity/nameAirport, codeIataCity/codeIataAirport → value, text pour Tom Select */
function formatAviationEdge(data) {
  const raw = Array.isArray(data) ? data : (data && (data.cities || data.airports)) ? [].concat(data.cities || [], data.airports || []) : [];
  return raw
    .map(item => ({
      value: item.codeIataAirport || item.codeIataCity || item.code || item.cityCode,
      text: (item.nameAirport || item.nameCity || item.name || item.cityName || item.value || '') + ' (' + (item.codeIataAirport || item.codeIataCity || item.code || item.cityCode || '') + ')'
    }))
    .filter(x => x.value && x.text)
    .slice(0, 30);
}

async function searchAviationEdge(keyword) {
  const apiKey = process.env.AVIATION_EDGE_KEY;
  if (!apiKey) return null;
  const url = `https://aviation-edge.com/v2/public/autocomplete?key=${apiKey}&query=${encodeURIComponent(keyword)}`;

  console.log("--- NOUVELLE RECHERCHE ---");
  console.log("Mot-clé tapé :", keyword);
  console.log("Clé API détectée :", apiKey ? "OUI (finit par " + apiKey.slice(-4) + ")" : "NON (VIDE)");
  console.log("Appel URL :", url.replace(apiKey, "SECRET_KEY"));

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const items = Array.isArray(data)
    ? data.map(item => ({
        value: item.codeIataAirport || item.codeIataCity,
        text: (item.nameAirport || item.nameCity || '') + ' (' + (item.codeIataAirport || item.codeIataCity) + ')'
      })).filter(x => x.value && x.text && !x.text.includes('undefined')).slice(0, 30)
    : formatAviationEdge(data);
  console.log("Réponse API reçue ! Nombre de résultats :", items.length);
  return items;
}

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
  const keyword = (event.queryStringParameters?.query || event.queryStringParameters?.keyword || event.queryStringParameters?.q || '').trim();

  if (!keyword) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Keyword manquant" })
    };
  }
  if (keyword.length < 3) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Au moins 3 caractères" })
    };
  }
  if (keyword.length > 50) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Recherche trop longue" })
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
  } catch (error) {
    console.error("ERREUR API :", error.message || error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Erreur lors de la recherche" })
    };
  }
};
