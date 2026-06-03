/**
 * ad-breakdown — Stats Meta Ads détaillées + ventilations.
 *
 * GET /.netlify/functions/ad-breakdown?campaignId=120xxx
 *   &datePreset=maximum         (défaut: maximum = cumul total depuis le lancement)
 *   &level=campaign|adset|ad    (défaut: campaign)
 *   &breakdown=gender|age|gender_age|country|region|placement|none
 *
 * Retourne le total agrégé + (si breakdown) le détail par segment.
 * Plusieurs breakdowns peuvent être demandés via ?breakdown=gender,age,country
 */

const META_API = 'https://graph.facebook.com/v19.0';

// breakdowns Meta autorisés et leur mapping
const BREAKDOWNS = {
  gender:     'gender',
  age:        'age',
  gender_age: 'age,gender',
  country:    'country',
  region:     'region',
  placement:  'publisher_platform,platform_position',
};

const BASE_FIELDS = [
  'spend', 'impressions', 'reach', 'cpm', 'cpc', 'ctr',
  'clicks', 'actions', 'frequency',
];

function extractActions(actions) {
  const a = actions || [];
  const find = (t) => (a.find((x) => x.action_type === t) || {}).value || '0';
  return {
    waConvos: parseInt(
      find('onsite_conversion.messaging_conversation_started_7d') !== '0'
        ? find('onsite_conversion.messaging_conversation_started_7d')
        : find('messaging_first_message'),
    ),
    linkClicks: parseInt(find('link_click')),
  };
}

function shape(row) {
  return {
    spend:       parseFloat(row.spend || 0).toFixed(2),
    impressions: parseInt(row.impressions || 0),
    reach:       parseInt(row.reach || 0),
    cpm:         parseFloat(row.cpm || 0).toFixed(2),
    cpc:         parseFloat(row.cpc || 0).toFixed(2),
    ctr:         parseFloat(row.ctr || 0).toFixed(2),
    clicks:      parseInt(row.clicks || 0),
    frequency:   parseFloat(row.frequency || 0).toFixed(2),
    ...extractActions(row.actions),
    // dimensions de ventilation présentes selon le breakdown
    ...(row.gender            ? { gender: row.gender } : {}),
    ...(row.age               ? { age: row.age } : {}),
    ...(row.country           ? { country: row.country } : {}),
    ...(row.region            ? { region: row.region } : {}),
    ...(row.publisher_platform ? { publisher_platform: row.publisher_platform } : {}),
    ...(row.platform_position ? { platform_position: row.platform_position } : {}),
    ...(row.ad_id             ? { ad_id: row.ad_id, ad_name: row.ad_name } : {}),
  };
}

async function call(url) {
  const res  = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.data || [];
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const campaignId = q.campaignId;
  if (!campaignId) return { statusCode: 400, body: JSON.stringify({ error: 'campaignId requis' }) };

  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'Token manquant' }) };

  const datePreset = q.datePreset || 'maximum';
  const level      = q.level || 'campaign';
  const fields     = BASE_FIELDS.concat(level === 'ad' ? ['ad_id', 'ad_name'] : []).join(',');

  const requested = (q.breakdown || '')
    .split(',').map((s) => s.trim()).filter((s) => s && s !== 'none' && BREAKDOWNS[s]);

  try {
    // 1) Total agrégé (sans breakdown)
    const totUrl = `${META_API}/${campaignId}/insights`
      + `?level=${level}&fields=${fields}&date_preset=${datePreset}&access_token=${token}`;
    const totalRows = await call(totUrl);
    const total = totalRows.map(shape);

    // 2) Chaque ventilation demandée (1 appel Meta par breakdown)
    const breakdowns = {};
    for (const key of requested) {
      const url = `${META_API}/${campaignId}/insights`
        + `?level=${level}&fields=${fields}&breakdowns=${encodeURIComponent(BREAKDOWNS[key])}`
        + `&date_preset=${datePreset}&access_token=${token}`;
      breakdowns[key] = (await call(url)).map(shape);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        campaignId,
        datePreset,
        level,
        total: total.length === 1 ? total[0] : total,
        breakdowns,
      }, null, 2),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
