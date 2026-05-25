/**
 * Rate-limiting partagé pour endpoints sensibles.
 * Sliding window simple basé sur Netlify Blobs.
 *
 * Usage :
 *   const { checkRateLimit } = require('./lib/rate-limit');
 *   const rl = await checkRateLimit(event, { key: 'crm-auth', max: 10, windowSec: 60 });
 *   if (!rl.ok) return rl.response;
 *
 * Fail-open (si Blobs indispo, on autorise plutôt que de tout casser).
 */

let blobsModule = null;
try { blobsModule = require('@netlify/blobs'); } catch (_) {}

const STORE_NAME = 'rda-ratelimit';

function clientIp(event) {
  const xff = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-Forwarded'] || '';
  const first = String(xff).split(',')[0].trim();
  return first || event.headers?.['client-ip'] || 'unknown';
}

function hashIp(ip) {
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, '0');
}

/**
 * @param {object} event - event Netlify
 * @param {object} opts
 * @param {string} opts.key   - identifiant logique (ex. "crm-auth", "yousign-init")
 * @param {number} opts.max   - nombre max de requêtes par fenêtre
 * @param {number} opts.windowSec - taille de la fenêtre en secondes
 * @param {string} [opts.subject] - sujet additionnel (ex. code agence) pour limiter aussi par compte
 * @returns {Promise<{ok:boolean, remaining:number, resetSec:number, response?:object}>}
 */
async function checkRateLimit(event, opts) {
  const { key, max, windowSec, subject = '' } = opts;
  if (!blobsModule) return { ok: true, remaining: max, resetSec: windowSec };

  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const ipKey = hashIp(clientIp(event));
  const blobKey = `rl/${key}/${bucket}/${ipKey}${subject ? '/' + subject : ''}`;

  try {
    if (blobsModule.connectLambda && event) blobsModule.connectLambda(event);
    const store = blobsModule.getStore(STORE_NAME);
    const current = (await store.get(blobKey, { type: 'json' })) || { count: 0 };
    if (current.count >= max) {
      const resetSec = (bucket + 1) * windowSec - now;
      return {
        ok: false,
        remaining: 0,
        resetSec,
        response: {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Retry-After': String(resetSec),
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetSec),
          },
          body: JSON.stringify({
            ok: false,
            error: 'Trop de requêtes — réessayez plus tard.',
            retry_after_sec: resetSec,
          }),
        },
      };
    }
    await store.setJSON(blobKey, { count: current.count + 1, t: now });
    return { ok: true, remaining: max - current.count - 1, resetSec: (bucket + 1) * windowSec - now };
  } catch (_) {
    return { ok: true, remaining: max, resetSec: windowSec };
  }
}

module.exports = { checkRateLimit, clientIp };
