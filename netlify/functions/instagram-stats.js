/**
 * GET /api/instagram-stats
 * Stats Instagram ORGANIQUES du mois en cours (compte IG Business/Creator).
 * → publications, likes, commentaires (sommés sur les médias du mois),
 *   + followers et media_count totaux, + reach 30j si dispo.
 *
 * Principe maison : aucun chiffre inventé. On ne renvoie QUE ce que la Graph API
 * mesure réellement. Les métriques non mesurables en organique
 * (clics WhatsApp, conversations DM) restent à null → le bureau affiche « — ».
 *
 * Variables Netlify :
 *   META_PAGE_ACCESS_TOKEN  — token de la Page FB liée au compte IG Business
 *                             (déjà utilisé par instagram-dm-webhook)
 *   INSTAGRAM_BUSINESS_ID   — (optionnel) id du compte IG Business. Si absent,
 *                             résolu depuis META_AD_PAGE_ID.
 *   META_AD_PAGE_ID         — id de la Page FB (fallback pour résoudre l'IG id)
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
  'Access-Control-Allow-Origin': '*',
};

const fail = (error, extra = {}) => ({
  statusCode: 200,
  headers: HEADERS,
  body: JSON.stringify({ ok: false, error, ...extra }),
});

async function gget(path, token, params = {}) {
  const qs = new URLSearchParams({ ...params, access_token: token }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

// Résout l'id du compte IG Business depuis la Page FB si non fourni explicitement.
async function resolveIgId(token) {
  const explicit = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();
  if (explicit) return explicit;
  const pageId = (process.env.META_AD_PAGE_ID || '').trim();
  if (!pageId) return null;
  const j = await gget(pageId, token, { fields: 'instagram_business_account' });
  return j.instagram_business_account ? j.instagram_business_account.id : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const token = (process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ADS_ACCESS_TOKEN || '').trim();
  if (!token) return fail('META_PAGE_ACCESS_TOKEN manquant');

  try {
    const igId = await resolveIgId(token);
    if (!igId) return fail('Compte IG Business introuvable (INSTAGRAM_BUSINESS_ID ou META_AD_PAGE_ID requis)');

    // Profil : followers + media_count total
    const profile = await gget(igId, token, { fields: 'followers_count,media_count,username' });

    // Début du mois en cours (UTC)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Médias du mois : on pagine tant que les posts sont >= début de mois.
    let publications = 0, likes = 0, comments = 0;
    let url = `${GRAPH}/${igId}/media?fields=timestamp,like_count,comments_count&limit=50&access_token=${encodeURIComponent(token)}`;
    let pages = 0;
    let reachedOlder = false;
    while (url && pages < 6 && !reachedOlder) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      for (const m of json.data || []) {
        const t = new Date(m.timestamp);
        if (t >= monthStart) {
          publications += 1;
          likes += m.like_count || 0;
          comments += m.comments_count || 0;
        } else {
          reachedOlder = true; // médias triés du + récent au + ancien
        }
      }
      url = (!reachedOlder && json.paging && json.paging.next) ? json.paging.next : null;
      pages += 1;
    }

    // Reach du mois (best-effort — non bloquant si l'autorisation insights manque)
    let reach = null;
    try {
      const since = Math.floor(monthStart.getTime() / 1000);
      const until = Math.floor(now.getTime() / 1000);
      const ins = await gget(`${igId}/insights`, token, {
        metric: 'reach', period: 'day', since: String(since), until: String(until),
      });
      const series = ((ins.data || [])[0] || {}).values || [];
      reach = series.reduce((s, v) => s + (v.value || 0), 0);
    } catch (_) { /* autorisation insights absente → reach reste null */ }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        username: profile.username || (process.env.INSTAGRAM_USERNAME || null),
        month: monthStart.toISOString().slice(0, 7),
        // mesurés réellement ce mois-ci :
        publications,
        likes,
        comments,
        reach,
        // totaux profil :
        followers: profile.followers_count != null ? profile.followers_count : null,
        mediaTotal: profile.media_count != null ? profile.media_count : null,
        // non mesurables en organique via l'API → le bureau garde « — » :
        whatsappClicks: null,
        socialConversations: null,
      }),
    };
  } catch (err) {
    return fail(err.message);
  }
};
