/**
 * Proxy Flight Tracker — Aviation Edge (clé côté serveur).
 * Variable Netlify : AVIATION_EDGE_KEY
 * Paramètre : flight (ex: AF718)
 */

exports.handler = async (event) => {
  const flightNumber = (event.queryStringParameters?.flight || '').trim().toUpperCase();
  const apiKey = process.env.AVIATION_EDGE_KEY;

  if (!flightNumber) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Numéro de vol manquant" })
    };
  }

  try {
    const url = `https://aviation-edge.com/v2/public/flights?key=${apiKey}&flightIata=${flightNumber}`;
    const response = await fetch(url);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('flight-info: réponse non-JSON (HTML ou erreur)', { flightNumber, contentType: response.headers.get('content-type') });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Oups ! Le serveur a renvoyé une erreur (HTML) au lieu de JSON. Quota API ou erreur Netlify possible.' })
      };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error("flight-info: données vides ou invalides", { flightNumber, type: typeof data, isArray: Array.isArray(data), length: Array.isArray(data) ? data.length : null });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: "Vérifiez votre numéro de vol" })
      };
    }

    const first = data[0];
    const dep = first.departure || {};
    const arr = first.arrival || {};
    const depIata = dep.iataCode || (dep.airport && dep.airport.iataCode) || '';
    const arrIata = arr.iataCode || (arr.airport && arr.airport.iataCode) || '';
    if (!depIata || !arrIata) {
      console.error("flight-info: structure invalide (departure/arrival.iataCode manquants)", { flightNumber, first });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: "Vérifiez votre numéro de vol" })
      };
    }

    console.log("Recherche vol :", flightNumber, "→ Départ:", depIata, "Arrivée:", arrIata);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("ERREUR flight-info :", error.message || error, error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Erreur technique : quota Netlify ou Aviation Edge probablement épuisé, ou réseau indisponible." })
    };
  }
};
