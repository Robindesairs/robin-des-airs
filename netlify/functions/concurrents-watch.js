/**
 * concurrents-watch — Veille concurrentielle (signaux PUBLICS, 100 % légal).
 *
 * RÔLE : chaque semaine (cron) ET à la demande (bureau / ?secret=), surveille les concurrents
 *   CE261 sur 3 axes et pousse un brief WhatsApp au propriétaire quand il y a du neuf :
 *     1) PUBS Meta (Ad Library) classées par DURÉE D'ACTIVITÉ — une pub qui tourne longtemps
 *        convertit → à copier. + veille mots-clés = découvre les NOUVEAUX annonceurs du créneau
 *        (avocats, comparateurs, acteurs diaspora) au-delà des concurrents nommés.
 *     2) Diff PRIX / positionnement (commission %, accroche hero) vs le dernier snapshot.
 *     3) Nouveaux ARTICLES SEO concurrents.
 *
 *   100 % lecture d'info publique : aucun scraping authentifié, aucune donnée privée,
 *   aucun envoi, aucune action sortante. Pur renseignement → l'humain décide.
 *
 * AUTH (même moule que sofia-prospect / legal-daily) :
 *   - cron Netlify OU ?secret=  → run complet (recalcul + snapshots Blobs + brief owner)
 *   - GET + session CRM          → lecture seule (snapshot stocké, sinon recalcul live) pour la
 *                                  carte « Veille concurrents » du bureau (poste Yanis). Jamais d'écriture.
 *
 * Tests : GET /api/concurrents-watch                 (bureau, session CRM)
 *         GET /api/concurrents-watch?secret=…&force=1 (run complet manuel + brief forcé)
 *         GET /api/concurrents-watch?secret=…&only=ads|pages|seo  (limiter une source)
 */

'use strict';

const CI = require('./lib/competitor-intel');
const { sendCallMeBot } = require('./lib/callmebot');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { checkCrmAccess } = require('./lib/crm-access');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-concurrents';
const KEY_LATEST = 'latest.json';      // payload affiché (bureau)
const KEY_SNAP = 'snapshots.json';     // état pour les diffs (hashes pages, articles, annonceurs vus)
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function norm(s) { return String(s || '').trim().toLowerCase(); }

async function blobGet(event, key) {
  if (!blobs) return null;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); return await blobs.getStore(STORE).get(key, { type: 'json' }); }
  catch (_) { return null; }
}
async function blobSet(event, key, val) {
  if (!blobs) return;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); await blobs.getStore(STORE).setJSON(key, val); }
  catch (e) { console.error('[concurrents-watch] Blobs:', e.message); }
}

/**
 * Recalcule la veille. `snap` = état précédent (pour les diffs). Renvoie { payload, snap }.
 * `only` ∈ {null,'ads','pages','seo'} permet de limiter les sources (tests / quota).
 */
async function compute(event, snap, only) {
  const prev = snap || { pages: {}, articles: {}, advertisers: [] };
  const nextSnap = { pages: { ...prev.pages }, articles: { ...prev.articles }, advertisers: [...(prev.advertisers || [])] };

  const doAds = !only || only === 'ads';
  const doPages = !only || only === 'pages';
  const doSeo = !only || only === 'seo';

  const payload = {
    generatedAt: new Date().toISOString(),
    topAds: [], newAdvertisers: [], pageChanges: [], newArticles: [],
    adsByCompetitor: [], adsApiError: null, links: {},
  };

  /* ── 1) PUBS Meta — concurrents nommés + veille mots-clés ── */
  if (doAds) {
    // a) concurrents nommés (en parallèle)
    const named = CI.COMPETITORS.filter((c) => c.metaSearch);
    const namedRes = await Promise.allSettled(named.map((c) => CI.fetchAds(c.metaSearch)));
    let apiErr = null;
    const allAds = [];
    namedRes.forEach((r, i) => {
      const c = named[i];
      payload.links[c.id] = CI.adLibraryDeepLink(c.metaSearch);
      if (r.status === 'fulfilled' && r.value.ok) {
        const ads = r.value.ads.map((a) => ({ ...a, competitor: c.name, cat: c.cat }));
        payload.adsByCompetitor.push({ id: c.id, name: c.name, cat: c.cat, count: ads.length, link: r.value.link });
        allAds.push(...ads);
      } else {
        const e = (r.status === 'fulfilled' ? r.value.error : r.reason && r.reason.message) || 'erreur';
        if (!apiErr) apiErr = e;
        payload.adsByCompetitor.push({ id: c.id, name: c.name, cat: c.cat, count: 0, link: payload.links[c.id], error: e });
      }
    });
    payload.adsApiError = apiErr;
    payload.topAds = allAds.sort((a, b) => (b.daysRunning || 0) - (a.daysRunning || 0)).slice(0, 12);

    // b) veille de l'espace par mots-clés → nouveaux annonceurs
    const knownNames = new Set([
      ...CI.COMPETITORS.map((c) => norm(c.name)),
      ...(prev.advertisers || []).map(norm),
    ]);
    const kwRes = await Promise.allSettled(CI.KEYWORD_WATCH.map((k) => CI.fetchAds(k, 25)));
    const seenNow = new Set();
    const fresh = [];
    kwRes.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.ok) {
        for (const a of r.value.ads) {
          const n = norm(a.page);
          if (!n || seenNow.has(n)) continue;
          seenNow.add(n);
          if (!knownNames.has(n)) fresh.push(a.page);
        }
      }
    });
    payload.newAdvertisers = Array.from(new Set(fresh)).slice(0, 12);
    payload.links.keywords = CI.adLibraryDeepLink(CI.KEYWORD_WATCH[0]);
    // mémorise tous les annonceurs vus (pour ne pas re-signaler la semaine suivante)
    nextSnap.advertisers = Array.from(new Set([...(prev.advertisers || []), ...Array.from(seenNow)])).slice(0, 400);
  }

  /* ── 2) Diff PRIX / positionnement ── */
  if (doPages) {
    const tasks = [];
    for (const c of CI.COMPETITORS) {
      for (const [label, url] of Object.entries(c.pages || {})) {
        if (label === 'blog') continue; // le blog est traité en SEO
        tasks.push({ c, label, url, key: `${c.id}:${label}` });
      }
    }
    const results = await Promise.allSettled(tasks.map((t) => CI.fetchPage(t.url)));
    results.forEach((r, i) => {
      const t = tasks[i];
      if (r.status !== 'fulfilled' || !r.value.ok) return;
      const next = r.value;
      const change = CI.diffPage(prev.pages[t.key], next, t.label);
      if (change) payload.pageChanges.push({ id: t.c.id, name: t.c.name, page: t.label, change, url: t.url });
      nextSnap.pages[t.key] = { hash: next.hash, pricing: next.pricing, len: next.len };
    });
  }

  /* ── 3) Nouveaux ARTICLES SEO ── */
  if (doSeo) {
    const blogs = CI.COMPETITORS.filter((c) => c.pages && c.pages.blog);
    const results = await Promise.allSettled(blogs.map((c) => CI.fetchBlogUrls(c.pages.blog)));
    results.forEach((r, i) => {
      const c = blogs[i];
      if (r.status !== 'fulfilled') return;
      const urls = r.value || [];
      const known = new Set(prev.articles[c.id] || []);
      const isFirst = !(prev.articles[c.id]); // 1er passage = baseline (pas de « nouveaux »)
      const fresh = urls.filter((u) => !known.has(u));
      if (!isFirst) for (const u of fresh.slice(0, 5)) payload.newArticles.push({ id: c.id, name: c.name, url: u });
      nextSnap.articles[c.id] = Array.from(new Set([...(prev.articles[c.id] || []), ...urls])).slice(0, 300);
    });
  }

  payload.counts = {
    topAds: payload.topAds.length,
    newAdvertisers: payload.newAdvertisers.length,
    pageChanges: payload.pageChanges.length,
    newArticles: payload.newArticles.length,
  };
  return { payload, snap: nextSnap };
}

function hasNews(p) {
  return (p.newAdvertisers || []).length || (p.pageChanges || []).length || (p.newArticles || []).length || (p.topAds || []).length;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}
  const q = event.queryStringParameters || {};
  const only = (q.only || body.only || '').toLowerCase().trim() || null;

  const fullRun = isNetlifyScheduled(event) || verifyInternalSecret(event, body).ok;

  // ── Lecture seule (bureau) : session CRM, jamais d'écriture ni de brief.
  if (!fullRun) {
    const crm = checkCrmAccess(event);
    if (!crm.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: crm.error || 'Session CRM requise', topAds: [] }) };
    const stored = await blobGet(event, KEY_LATEST);
    if (stored) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, cached: true, ...stored }) };
    // pas encore de snapshot : recalcul live (lecture publique seulement), sans rien stocker
    try {
      const { payload } = await compute(event, null, only);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, live: true, ...payload }) };
    } catch (e) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, topAds: [] }) };
    }
  }

  // ── Run complet (cron / secret).
  const snap = await blobGet(event, KEY_SNAP);
  let payload, nextSnap;
  try { ({ payload, snap: nextSnap } = await compute(event, snap, only)); }
  catch (e) { return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) }; }

  await blobSet(event, KEY_LATEST, payload);
  await blobSet(event, KEY_SNAP, nextSnap);

  const force = q.force === '1' || body.force === true;
  let callmebot = { ok: false, reason: 'skipped' };
  let briefSent = false;
  if (hasNews(payload) || force) {
    const message = CI.summarizeForOwner(payload, todayLabel());
    callmebot = await sendCallMeBot(message);
    briefSent = true;
  }

  return {
    statusCode: 200, headers: HEADERS,
    body: JSON.stringify({ ok: true, counts: payload.counts, adsApiError: payload.adsApiError, briefSent, callmebot }),
  };
};
