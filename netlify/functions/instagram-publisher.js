// Planificateur Instagram — publié chaque jour à 7h UTC via Netlify scheduled functions.
// Lit instagram-content-calendar.json, publie les posts du jour via Upload-Post API,
// puis marque published:true pour éviter les doublons.

const fs = require('fs');
const path = require('path');
const https = require('https');

const CALENDAR_PATH = path.join(__dirname, '../../instagram-content-calendar.json');
const UPLOAD_POST_BASE = 'https://www.upload-post.com/api';

// ─── helpers ────────────────────────────────────────────────────────────────

function apiRequest(method, endpoint, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(UPLOAD_POST_BASE + endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function isScheduledToday(scheduledAt) {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  return (
    scheduled.getUTCFullYear() === now.getUTCFullYear() &&
    scheduled.getUTCMonth() === now.getUTCMonth() &&
    scheduled.getUTCDate() === now.getUTCDate()
  );
}

// ─── publish helpers ─────────────────────────────────────────────────────────

async function publishPhoto(post, username, apiKey) {
  const body = {
    platform: ['instagram'],
    user: username,
    title: post.caption,
    photos: post.images,
    scheduled_date: post.scheduled_at,
  };
  return apiRequest('POST', '/upload_photos', body, apiKey);
}

async function publishCarousel(post, username, apiKey) {
  // Carousel = multiple photos via upload_photos endpoint
  const body = {
    platform: ['instagram'],
    user: username,
    title: post.caption,
    photos: post.images,
    scheduled_date: post.scheduled_at,
  };
  return apiRequest('POST', '/upload_photos', body, apiKey);
}

async function publishReel(post, username, apiKey) {
  const body = {
    platform: ['instagram'],
    user: username,
    title: post.caption,
    url: post.video_url,
    thumbnail: post.images?.[0],
    scheduled_date: post.scheduled_at,
  };
  return apiRequest('POST', '/upload', body, apiKey);
}

// ─── handler ─────────────────────────────────────────────────────────────────

exports.handler = async () => {
  const apiKey = process.env.UPLOAD_POST_API_KEY;
  const username = process.env.INSTAGRAM_USERNAME;

  if (!apiKey || !username) {
    console.error('[instagram-publisher] Missing UPLOAD_POST_API_KEY or INSTAGRAM_USERNAME');
    return { statusCode: 500, body: 'Configuration manquante' };
  }

  let calendar;
  try {
    calendar = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'));
  } catch (err) {
    console.error('[instagram-publisher] Impossible de lire le calendrier:', err.message);
    return { statusCode: 500, body: 'Calendrier introuvable' };
  }

  const todaysPosts = calendar.posts.filter(
    (p) => !p.published && isScheduledToday(p.scheduled_at)
  );

  if (todaysPosts.length === 0) {
    console.log('[instagram-publisher] Aucun post prévu aujourd\'hui.');
    return { statusCode: 200, body: 'Rien à publier' };
  }

  const results = [];

  for (const post of todaysPosts) {
    console.log(`[instagram-publisher] Publication du post ${post.id} (${post.type})…`);
    try {
      let res;
      if (post.type === 'reel') {
        res = await publishReel(post, username, apiKey);
      } else if (post.type === 'carousel') {
        res = await publishCarousel(post, username, apiKey);
      } else {
        res = await publishPhoto(post, username, apiKey);
      }

      if (res.status === 200 || res.status === 202) {
        post.published = true;
        post.published_at = new Date().toISOString();
        post.job_id = res.body?.job_id;
        console.log(`[instagram-publisher] ✅ ${post.id} soumis — job_id: ${post.job_id}`);
        results.push({ id: post.id, status: 'ok', job_id: post.job_id });
      } else {
        console.error(`[instagram-publisher] ❌ ${post.id} erreur HTTP ${res.status}:`, res.body);
        results.push({ id: post.id, status: 'error', http: res.status, detail: res.body });
      }
    } catch (err) {
      console.error(`[instagram-publisher] ❌ ${post.id} exception:`, err.message);
      results.push({ id: post.id, status: 'exception', error: err.message });
    }
  }

  // Sauvegarde du calendrier mis à jour (published:true)
  try {
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendar, null, 2));
  } catch (err) {
    console.warn('[instagram-publisher] Impossible de sauvegarder le calendrier:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ published: results }),
  };
};
