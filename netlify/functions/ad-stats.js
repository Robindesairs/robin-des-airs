/**
 * ad-stats — Stats live d'une campagne Meta Ads.
 *
 * GET /.netlify/functions/ad-stats?campaignId=120xxx
 * Retourne : spend, impressions, reach, cpm, clics, conversations WhatsApp
 */

const META_API = 'https://graph.facebook.com/v19.0';

exports.handler = async (event) => {
  const campaignId = (event.queryStringParameters || {}).campaignId;
  if (!campaignId) return { statusCode: 400, body: JSON.stringify({ error: 'campaignId requis' }) };

  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'Token manquant' }) };

  try {
    const fields = [
      'spend', 'impressions', 'reach', 'cpm', 'cpc',
      'clicks', 'actions', 'cost_per_action_type',
    ].join(',');

    const url = `${META_API}/${campaignId}/insights?fields=${fields}&date_preset=today&access_token=${token}`;
    const res  = await fetch(url);
    const json = await res.json();

    if (json.error) throw new Error(json.error.message);

    const data = (json.data || [])[0] || {};

    // Extraire les actions (clics WA, messages démarrés)
    const actions = data.actions || [];
    const waConvos = (actions.find(a =>
      a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
      a.action_type === 'messaging_first_message'
    ) || {}).value || '0';
    const linkClicks = (actions.find(a => a.action_type === 'link_click') || {}).value || '0';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        campaignId,
        spend:       parseFloat(data.spend || 0).toFixed(2),
        impressions: parseInt(data.impressions || 0),
        reach:       parseInt(data.reach || 0),
        cpm:         parseFloat(data.cpm || 0).toFixed(2),
        clicks:      parseInt(data.clicks || 0),
        waConvos:    parseInt(waConvos),
        linkClicks:  parseInt(linkClicks),
      }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
