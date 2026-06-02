/**
 * GET /api/meta-stats
 * Stats Meta Ads agrégées au niveau du COMPTE publicitaire (pas par campagne).
 * → dépense, impressions, reach, CPM, CPC, clics, conversations WhatsApp démarrées,
 *   clics sur lien, + nombre de campagnes actuellement actives (Netlify Blobs).
 *
 * Params : ?range=today|yesterday|last_7d|last_30d|this_month  (défaut last_7d)
 * Le token Meta reste côté serveur (env META_ADS_ACCESS_TOKEN) — jamais exposé.
 */

const META_API = 'https://graph.facebook.com/v19.0';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120',
  'Access-Control-Allow-Origin': '*',
};

const RANGES = new Set(['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month']);

async function activeCampaignCount() {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('active-ad-campaigns');
    const list = await store.list();
    return (list.blobs || []).length;
  } catch (e) {
    return null; // Blobs indisponible
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const token = (process.env.META_ADS_ACCESS_TOKEN || '').trim();
  let account = (process.env.META_AD_ACCOUNT_ID || '').trim();
  if (!token || !account) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'META_ADS_ACCESS_TOKEN ou META_AD_ACCOUNT_ID manquant' }),
    };
  }
  if (!account.startsWith('act_')) account = 'act_' + account;

  const range = (event.queryStringParameters || {}).range;
  const datePreset = RANGES.has(range) ? range : 'last_7d';

  try {
    const fields = ['spend', 'impressions', 'reach', 'cpm', 'cpc', 'clicks', 'actions'].join(',');
    const url = `${META_API}/${account}/insights?level=account&fields=${fields}&date_preset=${datePreset}&access_token=${encodeURIComponent(token)}`;
    const [res, activeCampaigns] = await Promise.all([fetch(url), activeCampaignCount()]);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);

    const d = (json.data || [])[0] || {};
    const actions = d.actions || [];
    const actVal = (types) => {
      const a = actions.find((x) => types.includes(x.action_type));
      return a ? parseInt(a.value, 10) : 0;
    };
    const waConvos = actVal([
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.total_messaging_connection',
      'messaging_first_message',
    ]);
    const linkClicks = actVal(['link_click']);
    const leads = actVal(['lead', 'onsite_conversion.lead_grouped']);

    const spend = parseFloat(d.spend || 0);
    const cpl = waConvos > 0 ? +(spend / waConvos).toFixed(2) : null;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        range: datePreset,
        spend: +spend.toFixed(2),
        impressions: parseInt(d.impressions || 0, 10),
        reach: parseInt(d.reach || 0, 10),
        cpm: parseFloat(d.cpm || 0).toFixed(2),
        cpc: parseFloat(d.cpc || 0).toFixed(2),
        clicks: parseInt(d.clicks || 0, 10),
        linkClicks,
        waConvos,
        leads,
        cpl, // coût par conversation WhatsApp
        activeCampaigns,
      }),
    };
  } catch (err) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
