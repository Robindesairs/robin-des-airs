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
    const data = await response.json();

    console.log("Recherche vol :", flightNumber);
    console.log("Résultat :", Array.isArray(data) && data.length > 0 ? "Trouvé" : "Non trouvé");

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("ERREUR flight-info :", error.message || error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Erreur serveur" })
    };
  }
};
