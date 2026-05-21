// netlify/functions/scrape.js
// Fonction serverless Netlify — appelle l'API Apify clockworks~tiktok-scraper

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "clockworks~tiktok-scraper";

function extractWhatsApp(text) {
  if (!text) return "";
  const patterns = [
    /(?:whatsapp|wa|contact)[\s:]*(\+\d[\d\s\-]{6,15})/i,
    /(\+220[\s\-]?\d{3}[\s\-]?\d{4})/,        // Gambie
    /(\+221[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/, // Sénégal
    /(\+\d{1,3}[\s\-]?\d{6,12})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function parseProfile(item, keyword) {
  const author = item.authorMeta || item.author || {};
  const username = author.name || author.uniqueId || "";
  const nickname = author.nickName || author.nickname || "";
  const bio = author.signature || author.bio || "";
  const followers = author.fans || author.followerCount || 0;

  if (!bio) return null;

  return {
    keyword,
    username,
    nickname,
    bio,
    whatsapp: extractWhatsApp(bio),
    followers,
    profileUrl: username ? `https://www.tiktok.com/@${username}` : "",
  };
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  }

  if (!APIFY_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "APIFY_TOKEN non configuré dans les variables d'environnement Netlify" }) };
  }

  let keywords;
  try {
    const body = JSON.parse(event.body);
    keywords = body.keywords || [
      "Travel Agency Gambia",
      "Voyage Sénégal Dakar",
      "Billetterie Serekunda",
    ];
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body JSON invalide" }) };
  }

  const allResults = [];
  const seen = new Set();

  for (const keyword of keywords) {
    try {
      const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQueries: [keyword],
          resultsPerPage: 30,
          maxProfilesPerQuery: 20,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
      });

      if (!response.ok) {
        console.error(`Apify error for "${keyword}": ${response.status}`);
        continue;
      }

      const items = await response.json();

      for (const item of items) {
        const profile = parseProfile(item, keyword);
        if (profile && !seen.has(profile.username)) {
          seen.add(profile.username);
          allResults.push(profile);
        }
      }
    } catch (err) {
      console.error(`Erreur pour "${keyword}":`, err.message);
    }
  }

  // Trier : avec WhatsApp en premier
  allResults.sort((a, b) => (b.whatsapp ? 1 : 0) - (a.whatsapp ? 1 : 0));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      total: allResults.length,
      withContact: allResults.filter((r) => r.whatsapp).length,
      results: allResults,
    }),
  };
};
