/**
 * ad-target — Lit / modifie le type de localisation du ciblage d'une campagne Meta.
 *
 * LECTURE :
 *   GET /.netlify/functions/ad-target?campaignId=120xxx
 *     → liste les ad sets + leur geo_locations.location_types actuel
 *
 * MODIFICATION (cible les voyageurs, exclut les résidents) :
 *   GET /.netlify/functions/ad-target?campaignId=120xxx&action=set&mode=travel&confirm=OUI
 *     → passe location_types = ["travel_in"] sur tous les ad sets
 *   mode=home    → ["home"]            (résidents seulement)
 *   mode=recent  → ["recent"]          (récemment dans le lieu)
 *   mode=travel  → ["travel_in"]       (de passage : domicile à +200 km)  ← défaut
 *
 * Sécurité : aucune modification sans &confirm=OUI.
 */

const META_API = 'https://graph.facebook.com/v19.0';

const MODES = {
  home:   ['home'],
  recent: ['recent'],
  travel: ['travel_in'],
  all:    ['home', 'recent', 'travel_in'],
};

async function getJSON(url, opts) {
  const res  = await fetch(url, opts);
  const json = await res.json();
  if (json.error) {
    const e = json.error;
    const detail = [e.message, e.error_user_title, e.error_user_msg]
      .filter(Boolean).join(' | ');
    const err = new Error(detail || 'Erreur Meta');
    err.meta = { code: e.code, subcode: e.error_subcode, blame: e.error_data };
    throw err;
  }
  return json;
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const campaignId = q.campaignId;
  if (!campaignId) return { statusCode: 400, body: JSON.stringify({ error: 'campaignId requis' }) };

  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'Token manquant' }) };

  try {
    // 1) Récupérer les ad sets + leur ciblage actuel
    const adsetsUrl = `${META_API}/${campaignId}/adsets`
      + `?fields=id,name,targeting&access_token=${token}`;
    const adsets = (await getJSON(adsetsUrl)).data || [];

    const summarize = (t) => {
      const geo = (t && t.geo_locations) || {};
      return {
        location_types: geo.location_types || null,
        custom_locations: geo.custom_locations || null,
        cities: geo.cities || null,
        regions: geo.regions || null,
        countries: geo.countries || null,
      };
    };

    // --- LECTURE seule ---
    if (q.action !== 'set' && q.action !== 'move') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true, mode: 'read', campaignId,
          adsets: adsets.map((a) => ({ id: a.id, name: a.name, geo: summarize(a.targeting) })),
        }, null, 2),
      };
    }

    // --- DÉPLACER LE PIN (action=move&lat=..&lng=..&radius=..) ---
    if (q.action === 'move') {
      if (q.confirm !== 'OUI') {
        return { statusCode: 400, body: JSON.stringify({ error: 'confirm=OUI requis pour modifier' }) };
      }
      const lat = parseFloat(q.lat), lng = parseFloat(q.lng);
      if (!isFinite(lat) || !isFinite(lng)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'lat & lng requis' }) };
      }
      const radius = parseFloat(q.radius) || 2;
      const results = [];
      for (const a of adsets) {
        const targeting = a.targeting || {};
        targeting.geo_locations = targeting.geo_locations || {};
        const old = (targeting.geo_locations.custom_locations || [])[0] || {};
        // on ne garde que les champs géo strictement nécessaires (Meta re-résout ville/région)
        targeting.geo_locations.custom_locations = [{
          latitude: lat,
          longitude: lng,
          radius,
          distance_unit: 'kilometer',
          country: old.country || q.country,
        }];
        const body = new URLSearchParams({
          targeting: JSON.stringify(targeting),
          access_token: token,
        });
        try {
          const up = await getJSON(`${META_API}/${a.id}`, { method: 'POST', body });
          results.push({
            id: a.id, name: a.name,
            before: { lat: old.latitude, lng: old.longitude, radius: old.radius },
            after: { lat, lng, radius },
            success: up.success !== false,
          });
        } catch (e) {
          results.push({ id: a.id, name: a.name, error: e.message, meta: e.meta });
        }
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, mode: 'move', campaignId, results }, null, 2),
      };
    }

    // --- MODIFICATION location_types ---
    if (q.confirm !== 'OUI') {
      return { statusCode: 400, body: JSON.stringify({ error: 'confirm=OUI requis pour modifier' }) };
    }
    const newTypes = MODES[q.mode || 'travel'];
    if (!newTypes) return { statusCode: 400, body: JSON.stringify({ error: 'mode invalide' }) };

    const results = [];
    for (const a of adsets) {
      const targeting = a.targeting || {};
      targeting.geo_locations = targeting.geo_locations || {};
      const before = targeting.geo_locations.location_types || null;
      targeting.geo_locations.location_types = newTypes;
      // certaines configs exigent location_types aussi DANS chaque custom_location
      if (Array.isArray(targeting.geo_locations.custom_locations)) {
        targeting.geo_locations.custom_locations = targeting.geo_locations.custom_locations.map(
          (c) => ({ ...c, location_types: newTypes }),
        );
      }

      const upUrl = `${META_API}/${a.id}`;
      const body = new URLSearchParams({
        targeting: JSON.stringify(targeting),
        access_token: token,
      });
      try {
        const up = await getJSON(upUrl, { method: 'POST', body });
        results.push({ id: a.id, name: a.name, before, after: newTypes, success: up.success !== false });
      } catch (e) {
        results.push({ id: a.id, name: a.name, before, after: newTypes, error: e.message, meta: e.meta });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, mode: 'set', applied: newTypes, campaignId, results }, null, 2),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
