/**
 * Résolution automatique des identifiants Meta (Page + Instagram Business)
 * et choix d'un token valide — pour éviter toute config manuelle quand un
 * token ads longue durée fonctionne déjà.
 *
 * Stratégie :
 *  1. Token : on essaie META_PAGE_ACCESS_TOKEN puis META_ADS_ACCESS_TOKEN ;
 *     on garde le premier qui authentifie réellement (GET /me OK). Ça neutralise
 *     un META_PAGE_ACCESS_TOKEN périmé qui masquerait un token ads valide.
 *  2. Page + IG : si INSTAGRAM_BUSINESS_ID / META_AD_PAGE_ID sont fournis on les
 *     utilise ; sinon on interroge /me/accounts (le token donne les Pages gérées,
 *     leur page-token dédié et le compte IG business lié).
 *
 * Aucune donnée inventée : si rien n'est résolu, on renvoie des nulls + une raison.
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

async function gget(path, token, params = {}) {
  const qs = new URLSearchParams({ ...params, access_token: token }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

// Renvoie le premier token candidat qui authentifie (ou null).
async function pickValidToken() {
  const candidates = [
    (process.env.META_PAGE_ACCESS_TOKEN || '').trim(),
    (process.env.META_ADS_ACCESS_TOKEN || '').trim(),
  ].filter(Boolean);
  for (const t of candidates) {
    try {
      await gget('me', t, { fields: 'id' });
      return t;
    } catch (_) { /* token invalide/expiré → on tente le suivant */ }
  }
  return null;
}

/**
 * Résout { token, pageId, pageToken, igId } automatiquement.
 * `token` = token utilisateur/ads valide ; `pageToken` = token de Page dédié
 * (préféré pour les appels Page/IG). Lève une Error avec message clair si échec.
 */
async function resolveMeta() {
  const userToken = await pickValidToken();
  if (!userToken) {
    const e = new Error('Aucun token Meta valide (META_PAGE_ACCESS_TOKEN et META_ADS_ACCESS_TOKEN absents ou expirés)');
    e.code = 'NO_TOKEN';
    throw e;
  }

  const explicitPage = (process.env.META_AD_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '').trim();
  const explicitIg = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();

  // Récupère les Pages gérées (id, page-token, compte IG lié).
  let accounts = [];
  try {
    const j = await gget('me/accounts', userToken, { fields: 'id,name,access_token,instagram_business_account', limit: '50' });
    accounts = j.data || [];
  } catch (_) { /* le token ads peut ne pas exposer les Pages → on retombe sur l'explicite */ }

  // Choix de la Page : celle qui matche l'ID explicite, sinon la 1re avec un IG lié, sinon la 1re.
  let page = null;
  if (explicitPage) page = accounts.find(a => a.id === explicitPage) || null;
  if (!page) page = accounts.find(a => a.instagram_business_account) || accounts[0] || null;

  const pageId = (page && page.id) || explicitPage || null;
  const pageToken = (page && page.access_token) || userToken;

  // IG business id : explicite > celui lié à la Page > résolu depuis la Page.
  let igId = explicitIg || (page && page.instagram_business_account && page.instagram_business_account.id) || null;
  if (!igId && pageId) {
    try {
      const j = await gget(pageId, pageToken, { fields: 'instagram_business_account' });
      igId = j.instagram_business_account ? j.instagram_business_account.id : null;
    } catch (_) {}
  }

  return { token: userToken, pageId, pageToken, igId };
}

module.exports = { GRAPH, gget, pickValidToken, resolveMeta };
