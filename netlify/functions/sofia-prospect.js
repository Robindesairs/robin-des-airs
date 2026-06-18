/**
 * sofia-prospect — Sofia, prospection d'agences partenaires (corridor diaspora Afrique).
 *
 * Trouve de VRAIES agences de voyage (OpenStreetMap/Overpass) dans les villes cibles —
 * on démarre par Dakar (SN), Abidjan (CI), Banjul/Serrekunda (GM) — filtre les bureaux de
 * compagnies aériennes, dédoublonne contre le CRM Airtable, et renvoie la liste à contacter.
 *
 * AUTH :
 *   - cron Netlify OU ?secret=  → run complet (recalcul + stockage Blobs + brief owner ;
 *       import CRM SEULEMENT si ?save=1 ET SOFIA_AUTOSAVE!=='0')
 *   - GET + session CRM          → lecture (snapshot stocké, sinon recalcul live) — JAMAIS d'écriture
 *
 * Sécurité : l'import CRM (création d'enregistrements) est OPT-IN (?save=1) et borné
 *   (SOFIA_SAVE_MAX, défaut 25/run) — human-in-the-loop, idempotent (n'ajoute que le NOUVEAU).
 *
 * Tests : GET /api/sofia-prospect            (bureau, session CRM)
 *         GET /api/sofia-prospect?secret=…&pays=SN
 *         GET /api/sofia-prospect?secret=…&save=1&limit=1   (import test 1 agence)
 */

'use strict';

const P = require('./lib/agency-prospector');
const IG = require('./lib/ig-prospector');
const { sendCallMeBot } = require('./lib/callmebot');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { checkCrmAccess } = require('./lib/crm-access');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-sofia';
const KEY = 'prospects/latest.json';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

const BASE = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
const T_AGENCES = (process.env.AIRTABLE_TABLE_AGENCES || 'tbleJVsy8Is5VygkQ').trim();
const F = {
  nom: 'fldPRqzq5dReuzc4M',
  statut: 'fldXE9N3wp1EDTblM',
  adresse: 'fldZy82S1rLNZHWzo',
  tel: 'fldOotElfRJkFQPhg',
  email: 'fldeRAHsjgqCzCXSH',
};
const STATUT_A_CONTACTER = 'À contacter';

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Instagram Graph API (token Meta + compte IG Business déjà présents dans le projet).
const IG_GRAPH = `https://graph.facebook.com/${(process.env.META_GRAPH_VERSION || 'v21.0')}`;
const IG_USER_ID = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();
const IG_TOKEN = (process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ADS_ACCESS_TOKEN || '').trim();
const IG_HASHTAG_CACHE_KEY = 'ig/hashtag-ids.json';

function intEnv(n, d) { const v = parseInt(String(process.env[n] || '').trim(), 10); return Number.isFinite(v) ? v : d; }

/** Interroge Overpass (POST), bascule sur un miroir si erreur/HTML. */
async function overpassFetch(ql) {
  let lastErr = 'inconnue';
  for (const url of OVERPASS_MIRRORS) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 30000);
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          // Les miroirs Overpass rejettent (406/429) les requêtes sans User-Agent identifiable.
          'User-Agent': 'RobinDesAirs/1.0 (prospection agences; contact@robindesairs.eu)',
        },
        body: 'data=' + encodeURIComponent(ql),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const txt = await r.text();
      if (!r.ok || txt.trim().startsWith('<')) { lastErr = `HTTP ${r.status}`; continue; }
      return JSON.parse(txt);
    } catch (e) { lastErr = e.message; }
  }
  throw new Error('Overpass indisponible (' + lastErr + ')');
}

// ── Instagram (recherche par hashtag) ──────────────────────────────────────

async function igGet(path, params) {
  const url = new URL(`${IG_GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', IG_TOKEN);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url.toString(), { signal: ctrl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || `HTTP ${r.status}`);
    return data;
  } finally { clearTimeout(to); }
}

/** Cache des IDs de hashtag (résolution = quota 30/7j → on ne résout qu'une fois). */
async function loadHashtagCache(event) {
  if (!blobs) return {};
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); return (await blobs.getStore(STORE).get(IG_HASHTAG_CACHE_KEY, { type: 'json' })) || {}; }
  catch (_) { return {}; }
}
async function saveHashtagCache(event, cache) {
  if (!blobs) return;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); await blobs.getStore(STORE).setJSON(IG_HASHTAG_CACHE_KEY, cache); }
  catch (_) {}
}

/** Découvre des prospects via les hashtags IG. Renvoie { prospects, error?, count }. */
async function fetchInstagram(paysArg, event) {
  if (!IG_USER_ID || !IG_TOKEN) return { prospects: [], error: 'Instagram non configuré (INSTAGRAM_BUSINESS_ID / token Meta)', count: 0 };
  const targets = IG.igTargets(paysArg);
  const cache = await loadHashtagCache(event);
  let cacheDirty = false;
  const prospects = [];
  let firstError = null;
  for (const t of targets) {
    try {
      // 1) résoudre l'ID du hashtag (depuis le cache si possible)
      let id = cache[t.tag];
      if (!id) {
        const res = await igGet('ig_hashtag_search', { user_id: IG_USER_ID, q: t.tag });
        id = res && res.data && res.data[0] && res.data[0].id;
        if (id) { cache[t.tag] = id; cacheDirty = true; }
      }
      if (!id) continue;
      // 2) médias récents du hashtag
      const media = await igGet(`${id}/recent_media`, {
        user_id: IG_USER_ID,
        fields: 'caption,permalink,timestamp,like_count,comments_count',
        limit: '40',
      });
      const list = (media && media.data) || [];
      prospects.push(...IG.mediaListToProspects(list, { ville: t.ville, pays: t.pays, tag: t.tag }));
    } catch (e) {
      if (!firstError) firstError = e.message;
    }
  }
  if (cacheDirty) await saveHashtagCache(event, cache);
  return { prospects, error: firstError, count: prospects.length };
}

/** Noms + téléphones des agences déjà au CRM (pour ne proposer que du nouveau). */
async function fetchExistingAgencies() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return { names: [], phones: [] };
  const headers = { Authorization: `Bearer ${key}` };
  const names = [], phones = [];
  let offset = '';
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE}/${T_AGENCES}`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('returnFieldsByFieldId', 'true');
      url.searchParams.append('fields[]', F.nom);
      url.searchParams.append('fields[]', F.tel);
      if (offset) url.searchParams.set('offset', offset);
      const r = await fetch(url.toString(), { headers });
      if (!r.ok) break;
      const data = await r.json();
      for (const rec of data.records || []) {
        const f = rec.fields || {};
        if (f[F.nom]) names.push(String(f[F.nom]));
        if (f[F.tel]) phones.push(String(f[F.tel]));
      }
      offset = data.offset || '';
    } while (offset);
  } catch (e) { console.warn('[sofia-prospect] existing:', e.message); }
  return { names, phones };
}

/** Crée les NOUVELLES agences au CRM (statut « À contacter »), par lots de 10. */
async function saveToAirtable(prospects, max) {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return { saved: 0, error: 'AIRTABLE_API_KEY manquant' };
  const slice = prospects.slice(0, max);
  let saved = 0;
  for (let i = 0; i < slice.length; i += 10) {
    const batch = slice.slice(i, i + 10).map((p) => ({
      fields: {
        [F.nom]: p.name,
        [F.statut]: STATUT_A_CONTACTER,
        [F.adresse]: p.address,
        ...(p.phone ? { [F.tel]: p.phone } : {}),
        ...(p.email ? { [F.email]: p.email } : {}),
      },
    }));
    try {
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/${T_AGENCES}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch, typecast: true }),
      });
      if (r.ok) { const d = await r.json(); saved += (d.records || []).length; }
      else console.warn('[sofia-prospect] save batch', r.status, (await r.text()).slice(0, 160));
    } catch (e) { console.warn('[sofia-prospect] save:', e.message); }
  }
  return { saved };
}

async function loadStored(event) {
  if (!blobs) return null;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); return await blobs.getStore(STORE).get(KEY, { type: 'json' }); }
  catch (_) { return null; }
}
async function store(event, payload) {
  if (!blobs) return;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); await blobs.getStore(STORE).setJSON(KEY, payload); }
  catch (e) { console.error('[sofia-prospect] Blobs:', e.message); }
}

/** Recalcule la liste de prospects (OpenStreetMap + Instagram), dédup + dédup CRM. */
async function compute(effectivePays, event, src) {
  const useOsm = !src || src === 'osm' || src === 'both';
  const useIg = !src || src === 'ig' || src === 'both';
  const existing = await fetchExistingAgencies();
  const parVille = [];
  let all = [];

  // Source 1 : OpenStreetMap (agences physiques)
  if (useOsm) {
    for (const city of P.citiesFor(paysArg)) {
      try {
        const data = await overpassFetch(P.buildOverpassQL(city));
        const parsed = P.parseElements(data.elements || [], { ville: city.ville, pays: city.pays }).map((p) => ({ ...p, source: 'osm' }));
        parVille.push({ ville: city.ville, pays: city.pays, paysNom: P.COUNTRY_NAMES[city.pays] || city.pays, trouve: parsed.length });
        all = all.concat(parsed);
      } catch (e) {
        parVille.push({ ville: city.ville, pays: city.pays, paysNom: P.COUNTRY_NAMES[city.pays] || city.pays, trouve: 0, erreur: e.message });
      }
    }
  }

  // Source 2 : Instagram (hashtags) — token Meta existant
  let igError = null;
  if (useIg) {
    const ig = await fetchInstagram(paysArg, event);
    igError = ig.error || null;
    all = all.concat(ig.prospects || []);
  }

  const news = P.sortProspects(P.filterNew(P.dedupe(all), existing));
  for (const v of parVille) v.nouveau = news.filter((p) => p.ville === v.ville).length;
  return {
    generatedAt: new Date().toISOString(),
    cibles: parVille,
    sources: {
      osm: news.filter((p) => p.source === 'osm').length,
      instagram: news.filter((p) => p.source === 'instagram').length,
    },
    igError,
    totalTrouve: all.length,
    totalNouveau: news.length,
    contactables: news.filter((p) => p.contactable).length,
    prospects: news,
  };
}

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function ownerBrief(payload, dateLabel, saved) {
  const lines = ['🤝 Sofia — prospection agences', `📅 ${dateLabel}`, ''];
  lines.push(`${payload.totalNouveau} nouvelle(s) agence(s) à contacter (${payload.contactables} avec coordonnées)`);
  if (payload.sources) lines.push(`📍 ${payload.sources.osm || 0} via carte · 📸 ${payload.sources.instagram || 0} via Instagram`);
  for (const v of payload.cibles) lines.push(`${P.COUNTRY_FLAG[v.pays] || '•'} ${v.ville} : ${v.nouveau || 0}${v.erreur ? ' (source indispo)' : ''}`);
  if (payload.igError) lines.push(`⚠️ Instagram indispo : ${String(payload.igError).slice(0, 80)}`);
  if (saved != null) lines.push('', `✅ ${saved} importée(s) au CRM (statut « À contacter »)`);
  lines.push('', '🔗 robindesairs.eu/bureau (poste Sofia)');
  return lines.join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}
  const q = event.queryStringParameters || {};
  const paysArg = (q.pays || body.pays || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  // Sans ?pays explicite (cron hebdo) → groupe de rotation de la semaine. Sofia « visite » ainsi
  // TOUS les pays du corridor sur un cycle de 4 semaines, sans dépasser le timeout ni le quota IG.
  const effectivePays = paysArg.length ? paysArg : P.rotationPays();
  const src = (q.src || body.src || '').toLowerCase().trim() || null; // 'osm' | 'ig' | 'both' (défaut both)

  const fullRun = isNetlifyScheduled(event) || verifyInternalSecret(event, body).ok;

  // Lecture seule (bureau) : session CRM, jamais d'écriture.
  if (!fullRun) {
    const crm = checkCrmAccess(event);
    if (!crm.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: crm.error || 'Session CRM requise', prospects: [] }) };
    const stored = await loadStored(event);
    if (stored) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, cached: true, ...stored }) };
    try {
      const payload = await compute(effectivePays, event, src);
      await store(event, payload);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...payload }) };
    } catch (e) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, prospects: [] }) };
    }
  }

  // Run complet (cron / secret).
  let payload;
  try { payload = await compute(effectivePays, event, src); }
  catch (e) { return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) }; }
  await store(event, payload);

  // Import CRM : opt-in strict (?save=1) + kill-switch SOFIA_AUTOSAVE=0 + plafond.
  let saved = null;
  const wantSave = q.save === '1' || body.save === true;
  if (wantSave && process.env.SOFIA_AUTOSAVE !== '0') {
    const limit = Math.min(intEnv('SOFIA_SAVE_MAX', 25), q.limit ? parseInt(q.limit, 10) || 25 : 25);
    const res = await saveToAirtable(payload.prospects, limit);
    saved = res.saved;
  }

  const force = q.force === '1' || body.force === true;
  let callmebot = { ok: false, reason: 'skipped' };
  let message = null;
  if (payload.totalNouveau > 0 || force) {
    message = ownerBrief(payload, todayLabel(), saved);
    callmebot = await sendCallMeBot(message);
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, totalNouveau: payload.totalNouveau, cibles: payload.cibles, saved, briefSent: !!message, callmebot }) };
};
