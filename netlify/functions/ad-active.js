/**
 * ad-active — Liste les campagnes Meta Ads en cours (lancées depuis le radar).
 *
 * GET /.netlify/functions/ad-active
 * Auth : session CRM (cookie rda_crm) ou en-tête X-CRM-Code.
 *
 * Source : Blobs `active-ad-campaigns` (posé par ad-launch, purgé par ad-stop/ad-watch)
 * + insights Meta par campagne (dépense, portée, clics, conversations WhatsApp) —
 * best-effort : si l'appel insights échoue, la campagne est listée sans stats.
 */

const { getStore } = require('@netlify/blobs');
const { checkCrmAccess } = require('./lib/crm-access');

const META_API = 'https://graph.facebook.com/v19.0';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: auth.error || 'Non autorisé (session CRM requise)' }) };
  }

  const token = process.env.META_ADS_ACCESS_TOKEN;

  let campaigns = [];
  try {
    const store = getStore('active-ad-campaigns');
    const list = await store.list();
    for (const item of (list.blobs || [])) {
      const meta = await store.get(item.key, { type: 'json' }).catch(() => null);
      if (meta) campaigns.push(meta);
    }
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, campaigns: [], note: 'Blobs indisponible : ' + e.message }),
    };
  }

  // Stats live par campagne (cap 6 appels — le radar n'a jamais plus de quelques campagnes actives)
  if (token && campaigns.length) {
    await Promise.all(campaigns.slice(0, 6).map(async (c) => {
      try {
        const url = `${META_API}/${c.campaignId}/insights?fields=spend,impressions,reach,clicks,actions&date_preset=maximum&access_token=${token}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        const row = (json.data || [])[0] || {};
        c.spend = parseFloat(row.spend || 0);
        c.impressions = parseInt(row.impressions || 0, 10);
        c.reach = parseInt(row.reach || 0, 10);
        c.clicks = parseInt(row.clicks || 0, 10);
        const convo = (row.actions || []).find((a) => /messaging_conversation_started/.test(a.action_type || ''));
        c.waConvos = convo ? parseInt(convo.value || 0, 10) : 0;
      } catch (_) { /* stats best-effort */ }
    }));
  }

  campaigns.sort((a, b) => (b.launchedAt || 0) - (a.launchedAt || 0));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ ok: true, count: campaigns.length, campaigns }),
  };
};
