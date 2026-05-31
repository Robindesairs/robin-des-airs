/**
 * ad-stop — Arrête une campagne Meta Ads active (pause + suppression du store).
 *
 * POST /.netlify/functions/ad-stop
 * Body : { campaignId: "120xxx" }
 */

const { getStore } = require('@netlify/blobs');

const META_API = 'https://graph.facebook.com/v19.0';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const { campaignId } = body;
  if (!campaignId) return { statusCode: 400, body: JSON.stringify({ error: 'campaignId requis' }) };

  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  if (!token || !accountId) return { statusCode: 500, body: JSON.stringify({ error: 'Variables Meta manquantes' }) };

  try {
    // 1. Pause la campagne Meta
    await metaPause(campaignId, token);

    // 2. Retire du store Netlify Blobs
    try {
      const store = getStore('active-ad-campaigns');
      await store.delete(campaignId);
    } catch (e) {
      console.warn('[ad-stop] Blobs delete:', e.message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, campaignId, stopped: true }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};

async function metaPause(campaignId, token) {
  const res = await fetch(`${META_API}/${campaignId}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PAUSED' }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}
