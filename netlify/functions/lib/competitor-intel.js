/**
 * competitor-intel — moteur de veille concurrentielle (signaux PUBLICS, 100 % légal).
 *
 * Trois sources, chacune dégradant proprement si indisponible :
 *   1) Meta Ad Library (ads_archive) — les pubs Facebook/Instagram ACTIVES des concurrents,
 *      classées par DURÉE D'ACTIVITÉ (une pub qui tourne longtemps = elle convertit → à copier).
 *      + veille par MOTS-CLÉS : découvre TOUT annonceur faisant de la pub « indemnisation vol »
 *      en France (avocats, comparateurs, nouveaux entrants) — pas seulement les concurrents nommés.
 *   2) Diff de page (prix / commission / positionnement) — fetch + hash, détecte un changement
 *      vs le dernier snapshot (ex : AirHelp passe de 35 % à 34 %, nouvelle accroche hero…).
 *   3) Nouveaux articles SEO — lit le sitemap/blog, repère les URLs apparues depuis le dernier run.
 *
 * Aucune donnée privée, aucun scraping authentifié : uniquement de l'info publique.
 * Le module est PUR (pas de Blobs ici) : la fonction appelante stocke/compare les snapshots.
 */

'use strict';

const crypto = require('crypto');

const GRAPH = `https://graph.facebook.com/${(process.env.META_GRAPH_VERSION || 'v21.0')}`;
const ADS_TOKEN = (process.env.META_ADS_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || '').trim();
const UA = 'RobinDesAirs/1.0 (veille concurrentielle; contact@robindesairs.eu)';

/* ────────────────────────────────────────────────────────────────────────
 *  Registre des concurrents (4 catégories). Éditable : ajoute/retire ici.
 *  - metaSearch : terme de marque cherché dans l'Ad Library (null = pas de pub suivie)
 *  - pages.pricing/home/blog : URLs publiques à surveiller (diff + nouveaux articles)
 * ──────────────────────────────────────────────────────────────────────── */
const COMPETITORS = [
  // ── Gros CE261 internationaux (présents en France) ──
  { id: 'airhelp',    name: 'AirHelp',    cat: 'gros', metaSearch: 'AirHelp',
    pages: { pricing: 'https://www.airhelp.com/fr/tarifs/', home: 'https://www.airhelp.com/fr/', blog: 'https://www.airhelp.com/fr/blog/' } },
  { id: 'flightright', name: 'Flightright', cat: 'gros', metaSearch: 'Flightright',
    pages: { home: 'https://www.flightright.fr/', pricing: 'https://www.flightright.fr/prix' } },
  { id: 'skycop',     name: 'Skycop',     cat: 'gros', metaSearch: 'Skycop',
    pages: { home: 'https://www.skycop.com/fr/' } },
  { id: 'compensair', name: 'Compensair', cat: 'gros', metaSearch: 'Compensair',
    pages: { home: 'https://compensair.com/fr/' } },
  { id: 'airadvisor', name: 'AirAdvisor', cat: 'gros', metaSearch: 'AirAdvisor',
    pages: { home: 'https://airadvisor.com/fr', blog: 'https://airadvisor.com/fr/blog' } },

  // ── Marché français (les + pertinents pour la diaspora FR) ──
  { id: 'retardvol',     name: 'RetardVol',     cat: 'fr', metaSearch: 'RetardVol',
    pages: { home: 'https://www.retardvol.com/' } },
  { id: 'air-indemnite', name: 'Air Indemnité', cat: 'fr', metaSearch: 'Air Indemnité',
    pages: { home: 'https://www.air-indemnite.com/', pricing: 'https://www.air-indemnite.com/tarifs' } },
  { id: 'indemniflight', name: 'Indemniflight', cat: 'fr', metaSearch: 'Indemniflight',
    pages: { home: 'https://www.indemniflight.com/' } },
  { id: 'weclaim',       name: 'Weclaim',       cat: 'fr', metaSearch: 'Weclaim',
    pages: { home: 'https://www.weclaim.com/fr' } },
];

/* Veille de l'ESPACE par mots-clés : surface TOUT annonceur (avocats, comparateurs, nouveaux
 * entrants, acteurs diaspora) faisant de la pub sur le créneau en France — pas seulement les
 * concurrents nommés ci-dessus. C'est ce qui couvre « avocats/agences locales » + « comparateurs ». */
const KEYWORD_WATCH = [
  'indemnisation vol',
  'vol retardé remboursement',
  'vol annulé indemnité',
  'indemnité passager aérien',
];

const CAT_LABEL = { gros: 'Gros CE261', fr: 'Marché FR', avocat: 'Avocats/agences', comparateur: 'Comparateurs' };

/* ────────────────────────────────────────────────────────────────────────
 *  1) Meta Ad Library
 * ──────────────────────────────────────────────────────────────────────── */

const AD_FIELDS = [
  'id', 'page_name', 'ad_delivery_start_time', 'ad_delivery_stop_time',
  'ad_creative_bodies', 'ad_creative_link_titles', 'ad_snapshot_url',
].join(',');

/** Lien public Ad Library (toujours valide, même si l'API échoue) pour cliquer à la main. */
function adLibraryDeepLink(query) {
  const u = new URL('https://www.facebook.com/ads/library/');
  u.searchParams.set('active_status', 'active');
  u.searchParams.set('ad_type', 'all');
  u.searchParams.set('country', 'FR');
  u.searchParams.set('media_type', 'all');
  u.searchParams.set('q', query);
  return u.toString();
}

function daysBetween(startISO, endISO) {
  const s = Date.parse(startISO);
  if (!Number.isFinite(s)) return null;
  const e = endISO ? Date.parse(endISO) : Date.now();
  return Math.max(0, Math.round((e - s) / 86400000));
}

async function graphGet(path, params, timeoutMs = 15000) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', ADS_TOKEN);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url.toString(), { signal: ctrl.signal, headers: { 'User-Agent': UA } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || `HTTP ${r.status}`);
    return data;
  } finally { clearTimeout(to); }
}

/** Normalise une pub Ad Library + calcule sa longévité (jours actifs). */
function normalizeAd(raw) {
  const body = (raw.ad_creative_bodies && raw.ad_creative_bodies[0]) || '';
  const title = (raw.ad_creative_link_titles && raw.ad_creative_link_titles[0]) || '';
  const days = daysBetween(raw.ad_delivery_start_time, raw.ad_delivery_stop_time);
  return {
    id: raw.id,
    page: raw.page_name || '',
    start: raw.ad_delivery_start_time || null,
    stillRunning: !raw.ad_delivery_stop_time,
    daysRunning: days,
    title: title.slice(0, 120),
    body: body.replace(/\s+/g, ' ').trim().slice(0, 280),
    snapshot: raw.ad_snapshot_url || null,
  };
}

/**
 * Interroge l'Ad Library pour un terme (marque OU mot-clé), pubs actives en France.
 * @returns {{ ok:boolean, ads:Array, error?:string, link:string }}
 */
async function fetchAds(searchTerm, limit = 30) {
  const link = adLibraryDeepLink(searchTerm);
  if (!ADS_TOKEN) return { ok: false, ads: [], error: 'token Meta absent', link };
  try {
    const data = await graphGet('ads_archive', {
      search_terms: searchTerm,
      ad_reached_countries: "['FR']",
      ad_active_status: 'ACTIVE',
      ad_type: 'ALL',
      fields: AD_FIELDS,
      limit: String(limit),
    });
    const ads = (data.data || []).map(normalizeAd)
      .sort((a, b) => (b.daysRunning || 0) - (a.daysRunning || 0));
    return { ok: true, ads, link };
  } catch (e) {
    return { ok: false, ads: [], error: e.message, link };
  }
}

/* ────────────────────────────────────────────────────────────────────────
 *  2) Diff de page (prix / positionnement)
 * ──────────────────────────────────────────────────────────────────────── */

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }

/** Extrait les signaux « prix » d'un texte : pourcentages de commission + montants €. */
function extractPricing(text) {
  const pcts = Array.from(new Set((text.match(/\b\d{1,2}\s?%/g) || []).map((s) => s.replace(/\s/g, '')))).slice(0, 8);
  const euros = Array.from(new Set((text.match(/\b\d{2,4}\s?€/g) || []).map((s) => s.replace(/\s/g, '')))).slice(0, 8);
  return { pcts, euros };
}

async function fetchPage(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    const html = await r.text();
    if (!r.ok) return { ok: false, status: r.status };
    const text = stripHtml(html);
    return { ok: true, status: r.status, text, hash: sha1(text), pricing: extractPricing(text), len: text.length };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally { clearTimeout(to); }
}

/** Compare une page fraîchement lue au snapshot précédent → description du changement (ou null). */
function diffPage(prev, next, label) {
  if (!next || !next.ok) return null;
  if (!prev) return null; // 1er passage = baseline, pas un « changement »
  const changes = [];
  // Prix : nouveaux % ou € apparus / disparus
  const newPct = (next.pricing.pcts || []).filter((p) => !(prev.pricing && prev.pricing.pcts || []).includes(p));
  const goneP = ((prev.pricing && prev.pricing.pcts) || []).filter((p) => !(next.pricing.pcts || []).includes(p));
  if (newPct.length || goneP.length) {
    changes.push(`commission ${goneP.length ? goneP.join('/') + '→' : ''}${newPct.join('/') || '?'}`);
  }
  // Contenu : hash différent (repositionnement / refonte)
  if (prev.hash && next.hash && prev.hash !== next.hash && !changes.length) {
    const delta = Math.abs((next.len || 0) - (prev.len || 0));
    if (delta > 200) changes.push(`page modifiée (${label})`);
  }
  return changes.length ? changes.join(' · ') : null;
}

/* ────────────────────────────────────────────────────────────────────────
 *  3) Nouveaux articles SEO (sitemap / blog)
 * ──────────────────────────────────────────────────────────────────────── */

/** Récupère des URLs d'articles depuis une page blog (liens) — best-effort. */
async function fetchBlogUrls(blogUrl, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(blogUrl, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    if (!r.ok) return [];
    const html = await r.text();
    const origin = new URL(blogUrl).origin;
    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1]);
    const urls = hrefs
      .map((h) => { try { return new URL(h, origin).toString(); } catch { return null; } })
      .filter(Boolean)
      .filter((u) => u.startsWith(origin) && /\/(blog|guide|conseils|article)s?\//i.test(u))
      .filter((u) => !/\/(blog|guides|conseils)\/?$/i.test(u)); // exclut la page index
    return Array.from(new Set(urls)).slice(0, 60);
  } catch { return []; }
  finally { clearTimeout(to); }
}

/* ────────────────────────────────────────────────────────────────────────
 *  Synthèse pour le brief propriétaire (WhatsApp)
 * ──────────────────────────────────────────────────────────────────────── */

/** Construit le brief texte à partir du payload calculé. */
function summarizeForOwner(payload, dateLabel) {
  const L = ['🕵️ Veille concurrents', `📅 ${dateLabel}`, ''];

  // A. Pubs qui DURENT (le signal le + actionnable)
  const top = (payload.topAds || []).slice(0, 5);
  if (top.length) {
    L.push('🏆 Pubs concurrentes qui durent (= qui convertissent) :');
    for (const a of top) {
      const d = a.daysRunning != null ? `${a.daysRunning} j` : '?';
      L.push(`• ${a.page} — ${d} : « ${(a.body || a.title || '').slice(0, 90)} »`);
    }
    L.push('');
  }

  // B. Nouveaux annonceurs détectés sur le créneau (veille mots-clés)
  if ((payload.newAdvertisers || []).length) {
    L.push(`👀 Nouveaux annonceurs sur le créneau : ${payload.newAdvertisers.slice(0, 6).join(', ')}`);
    L.push('');
  }

  // C. Changements de prix / pages
  if ((payload.pageChanges || []).length) {
    L.push('📝 Changements détectés :');
    for (const c of payload.pageChanges.slice(0, 8)) L.push(`• ${c.name} : ${c.change}`);
    L.push('');
  }

  // D. Nouveaux articles SEO
  if ((payload.newArticles || []).length) {
    L.push(`✍️ Nouveaux articles concurrents : ${payload.newArticles.length}`);
    for (const a of payload.newArticles.slice(0, 4)) L.push(`• ${a.name} : ${a.url}`);
    L.push('');
  }

  if (payload.adsApiError) L.push(`⚠️ Ad Library API : ${String(payload.adsApiError).slice(0, 70)} (liens cliquables dans le bureau)`);
  if (L.length <= 3) L.push('Rien de neuf cette semaine.');
  L.push('', '🔗 robindesairs.eu/bureau (Veille concurrents)');
  return L.join('\n');
}

module.exports = {
  COMPETITORS,
  KEYWORD_WATCH,
  CAT_LABEL,
  adLibraryDeepLink,
  fetchAds,
  fetchPage,
  diffPage,
  fetchBlogUrls,
  summarizeForOwner,
  // utilitaires exposés pour les tests / la fonction
  daysBetween,
  extractPricing,
  stripHtml,
};
