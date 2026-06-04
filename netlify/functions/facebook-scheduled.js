/**
 * GET /api/facebook-scheduled
 * Compte les posts Facebook PROGRAMMÉS (non encore publiés) de la Page.
 * → /{page-id}/scheduled_posts (Graph API). C'est le seul « à venir » exposé par
 *   l'API : Instagram ne publie PAS ses brouillons/programmés.
 *
 * Sert à répondre, dans le bureau, à « où sont mes posts prévus ? » : ceux qui
 * sont planifiés mais pas encore en ligne (donc invisibles dans /api/instagram-stats
 * qui ne compte que le publié).
 *
 * Variables Netlify :
 *   META_PAGE_ACCESS_TOKEN  — token de la Page (perm pages_read_engagement /
 *                             pages_manage_posts). Reste côté serveur.
 *   META_AD_PAGE_ID         — id de la Page FB (ou FACEBOOK_PAGE_ID).
 */

const { GRAPH, resolveMeta } = require('./lib/meta-resolve');

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let token, pageId;
  try {
    // Token + Page résolus automatiquement (réutilise le token ads valide).
    const r = await resolveMeta();
    token = r.pageToken; pageId = r.pageId;
    if (!pageId) return fail('Page Facebook introuvable (aucune Page gérée par ce token, ou META_AD_PAGE_ID requis)');
  } catch (e) {
    return fail(e.message);
  }

  try {
    let scheduled = 0;
    let earliest = null;
    let latest = null;
    const sample = [];
    let url = `${GRAPH}/${pageId}/scheduled_posts?fields=id,scheduled_publish_time,message&limit=100&access_token=${encodeURIComponent(token)}`;
    let pages = 0;
    while (url && pages < 6) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      for (const p of json.data || []) {
        scheduled += 1;
        const ts = p.scheduled_publish_time ? Number(p.scheduled_publish_time) * 1000 : null;
        if (ts) {
          if (earliest == null || ts < earliest) earliest = ts;
          if (latest == null || ts > latest) latest = ts;
        }
        if (sample.length < 5) {
          sample.push({
            when: ts ? new Date(ts).toISOString() : null,
            preview: (p.message || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          });
        }
      }
      url = json.paging && json.paging.next ? json.paging.next : null;
      pages += 1;
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        scheduled,
        capped: pages >= 6,
        earliest: earliest ? new Date(earliest).toISOString() : null,
        latest: latest ? new Date(latest).toISOString() : null,
        sample,
      }),
    };
  } catch (err) {
    return fail(err.message);
  }
};
