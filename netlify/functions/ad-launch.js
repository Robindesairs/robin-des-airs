/**
 * ad-launch — Lance une campagne Meta Ads en geofencing autour d'un aéroport africain.
 * Crée automatiquement 3 formats (Feed 16:9, Carré 1:1, Story 9:16) + 2 CTAs (Site + WhatsApp).
 * Sélection automatique de la langue du visuel selon l'aéroport (FR / EN / PT).
 *
 * POST /.netlify/functions/ad-launch
 * Body JSON : { airport: "DLA" }
 *
 * Variables Netlify requises :
 *   META_ADS_ACCESS_TOKEN        — token avec permission ads_management
 *   META_AD_ACCOUNT_ID           — ex: act_123456789
 *   META_AD_PAGE_ID              — ID de la Page Facebook de Robin des Airs
 *   META_AD_WHATSAPP_NUMBER      — numéro WhatsApp sans + (ex: 33612345678)
 *
 *   Hashes images — uploader via : node scripts/upload-ad-images.js
 *
 *   Slot Story WA    META_AD_HASH_URGENCE_STORY   → ad_set1_1D_urgence_emotionnelle.png  ("Encore en train d'attendre ?")
 *   Slot Feed Site   META_AD_HASH_FR_FEED         → ad_fb_A.png                          ("Votre vol retardé ? 600€")
 *   Slot Carré WA    META_AD_HASH_URGENCE_SQUARE  → ad_set1_1A_montant_qui_frappe.png    ("600€ — Réclamer sur WhatsApp")
 *   Slot Carré Site  META_AD_HASH_SOCIAL_PROOF    → ad_set3_3B_social_proof.png          (screenshot virement 1 350€)
 *
 *   Variantes EN (aéroports anglophones) :
 *   META_AD_HASH_EN_FEED         → ad_set5_5A_english_standard.png
 *   META_AD_HASH_EN_SQUARE       → ad_set5_5A_english_standard.png (même hash)
 *
 * Optionnelles :
 *   META_AD_DAILY_BUDGET_CENTS   — budget journalier en centimes (défaut: 1000 = 10€)
 *   META_AD_RADIUS_KM            — rayon geofencing en km (défaut: 2)
 *   META_AD_DURATION_DAYS        — durée campagne en jours (défaut: 1)
 */

const { getAirportCoords } = require('./lib/airport-coords');

const META_API = 'https://graph.facebook.com/v19.0';

/** Aéroports francophones */
const FR_AIRPORTS = new Set([
  'DSS','DKR','BKO','OUA','NIM','CKY','ABJ','COO','LFW','BJL','OXB',
  'DLA','NSI','LBV','BZV','PNR','FIH','FKI','FBM','GOM','NDJ','BGF',
  'MPM','TNR','NKC','SSG','ROB','FNA',
]);

/** Aéroports anglophones */
const EN_AIRPORTS = new Set([
  'LOS','ABV','KAN','PHC','ACC','NBO','MBA','EBB','DAR','JRO','ZNZ',
  'LUN','HRE','JNB','CPT','DUR','WDH','JIB','ADD','KGL','MRU',
]);

/** Aéroports lusophones */
const PT_AIRPORTS = new Set(['LAD','OXB']);

function getLang(iata) {
  if (PT_AIRPORTS.has(iata)) return 'PT';
  if (EN_AIRPORTS.has(iata)) return 'EN';
  return 'FR'; // défaut français
}

/**
 * Retourne les 4 slots de visuels selon la langue :
 *   storyWa    → urgence "Encore en train d'attendre ?" (Story 9:16, CTA WhatsApp)
 *   feedSite   → "Votre vol retardé ? 600€"            (Feed 16:9, CTA Site)
 *   squareWa   → "600€ — Réclamer sur WhatsApp"        (Carré 1:1, CTA WhatsApp)
 *   squareSite → Screenshot virement 1 350€            (Carré 1:1, CTA Site)
 */
function getHashes(lang, env) {
  if (lang === 'EN') {
    return {
      storyWa:    env.META_AD_HASH_URGENCE_STORY  || env.META_AD_HASH_EN_FEED,
      feedSite:   env.META_AD_HASH_EN_FEED        || env.META_AD_HASH_FR_FEED,
      squareWa:   env.META_AD_HASH_EN_SQUARE      || env.META_AD_HASH_URGENCE_SQUARE,
      squareSite: env.META_AD_HASH_EN_SQUARE      || env.META_AD_HASH_SOCIAL_PROOF,
    };
  }
  // FR et PT
  return {
    storyWa:    env.META_AD_HASH_URGENCE_STORY,
    feedSite:   env.META_AD_HASH_FR_FEED,
    squareWa:   env.META_AD_HASH_URGENCE_SQUARE,
    squareSite: env.META_AD_HASH_SOCIAL_PROOF,
  };
}

function getMsg(lang, city) {
  if (lang === 'EN') {
    return `✈️ Flight from ${city} delayed or cancelled? EU law gives you up to €600 per passenger. Check for free in 2 minutes.`;
  }
  return `✈️ Vol depuis ${city} retardé ou annulé ? La loi européenne vous donne jusqu'à 600 € par passager. Vérifiez gratuitement en 2 minutes.`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const origin = event.headers['origin'] || event.headers['referer'] || '';
  const allowed = process.env.ALLOWED_ORIGIN || 'robindesairs.eu';
  if (!origin.includes(allowed) && process.env.NODE_ENV !== 'development') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const airport = (body.airport || '').toUpperCase().slice(0, 3);
  if (!airport) return { statusCode: 400, body: JSON.stringify({ error: 'airport requis' }) };

  const coords = getAirportCoords(airport);
  if (!coords) {
    return { statusCode: 400, body: JSON.stringify({ error: `Aéroport inconnu : ${airport}` }) };
  }

  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const pageId    = process.env.META_AD_PAGE_ID;
  const waNumber  = process.env.META_AD_WHATSAPP_NUMBER;

  if (!token || !accountId || !pageId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Variables Meta Ads manquantes dans Netlify' }) };
  }

  const lang    = getLang(airport);
  const hashes  = getHashes(lang, process.env);
  const msgText = getMsg(lang, coords.city);

  if (!hashes.feed && !hashes.square && !hashes.story) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Aucun hash image configuré dans Netlify (META_AD_HASH_FR_FEED etc.)' }) };
  }

  const dailyBudget  = parseInt(process.env.META_AD_DAILY_BUDGET_CENTS || '1000', 10);
  const radiusKm     = parseFloat(process.env.META_AD_RADIUS_KM || '2');
  const durationDays = parseInt(process.env.META_AD_DURATION_DAYS || '1', 10);
  const nowSec       = Math.floor(Date.now() / 1000);
  const endSec       = nowSec + durationDays * 86400;

  const siteUrl = 'https://robindesairs.eu';
  const waMsg   = lang === 'EN'
    ? `Hello, my flight from ${coords.city} was delayed. I'd like to check my compensation.`
    : `Bonjour, mon vol depuis ${coords.city} a été retardé. Je voudrais vérifier mon indemnité.`;
  const waLink  = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`
    : null;

  const targeting = {
    geo_locations: {
      custom_locations: [{
        latitude: coords.lat,
        longitude: coords.lng,
        radius: radiusKm,
        distance_unit: 'kilometer',
      }],
    },
    age_min: 22,
    age_max: 65,
    // Facebook + Instagram
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story', 'reels'],
    instagram_positions: ['stream', 'story', 'reels'],
  };

  try {
    // 1. Campagne
    const campaign = await metaPost(`/${accountId}/campaigns`, token, {
      name: `RDA-GEO-${airport}-${lang}-${new Date().toISOString().slice(0, 10)}`,
      objective: 'OUTCOME_TRAFFIC',
      status: 'ACTIVE',
      special_ad_categories: [],
    });

    // 2. Ad Set géofencé
    const adSet = await metaPost(`/${accountId}/adsets`, token, {
      name: `GEO-${airport}-${coords.city}-${lang}`,
      campaign_id: campaign.id,
      daily_budget: dailyBudget,
      start_time: nowSec,
      end_time: endSec,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      status: 'ACTIVE',
      targeting,
    });

    // 3. Créer les 4 creatives selon les slots
    const creatives = [];

    const slots = [
      {
        label:  'story-wa',
        hash:   hashes.storyWa,
        link:   waLink || siteUrl,
        cta:    waLink ? 'WHATSAPP_MESSAGE' : 'LEARN_MORE',
      },
      {
        label:  'feed-site',
        hash:   hashes.feedSite,
        link:   siteUrl,
        cta:    'LEARN_MORE',
      },
      {
        label:  'square-wa',
        hash:   hashes.squareWa,
        link:   waLink || siteUrl,
        cta:    waLink ? 'WHATSAPP_MESSAGE' : 'LEARN_MORE',
      },
      {
        label:  'square-site',
        hash:   hashes.squareSite,
        link:   siteUrl,
        cta:    'LEARN_MORE',
      },
    ];

    for (const slot of slots) {
      if (!slot.hash) continue; // skip si hash non configuré
      const c = await metaPost(`/${accountId}/adcreatives`, token, {
        name: `Creative-${airport}-${slot.label.toUpperCase()}`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            image_hash: slot.hash,
            link:       slot.link,
            message:    msgText,
            call_to_action: { type: slot.cta, value: { link: slot.link } },
          },
        },
      });
      creatives.push({ label: slot.label, id: c.id });
    }

    // 4. Créer un Ad par creative
    const ads = [];
    for (const cr of creatives) {
      const ad = await metaPost(`/${accountId}/ads`, token, {
        name: `Ad-${airport}-${cr.label}-${Date.now()}`,
        adset_id: adSet.id,
        creative: { creative_id: cr.id },
        status: 'ACTIVE',
      });
      ads.push({ label: cr.label, id: ad.id });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        airport,
        city: coords.city,
        lang,
        campaignId: campaign.id,
        adSetId: adSet.id,
        ads,
        formats: ads.map(a => a.label),
        radius: `${radiusKm} km`,
        budget: `${(dailyBudget / 100).toFixed(2)} €/jour`,
        duration: `${durationDays} jour(s)`,
      }),
    };
  } catch (err) {
    console.error('[ad-launch] Erreur Meta API:', err.message, err.body || '');
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message, detail: err.body || null }),
    };
  }
};

async function metaPost(path, token, params) {
  const url = `${META_API}${path}?access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    const err = new Error(json.error?.message || `Meta API ${res.status}`);
    err.body = JSON.stringify(json.error || json);
    throw err;
  }
  return json;
}
