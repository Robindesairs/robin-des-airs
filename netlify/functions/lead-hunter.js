/**
 * lead-hunter — Sofia/Malik, prospection de leads passagers via Instagram.
 *
 * Cherche des posts de particuliers ayant subi un retard/annulation et n'ayant
 * pas été indemnisés → liste de leads à contacter (DM Instagram ou WhatsApp).
 *
 * AUTH :
 *   - cron Netlify OU ?secret=  → run complet (recalcul + stockage Blobs + brief owner)
 *   - GET + session CRM         → lecture (snapshot stocké, sinon recalcul live)
 *
 * Import Airtable : opt-in strict (?save=1), plafond LEAD_SAVE_MAX (défaut 20/run).
 * Les leads sont créés avec le statut « Prospect » dans la table dossiers principale.
 *
 * Endpoints :
 *   GET  /api/lead-hunter                         → lecture bureau (session CRM)
 *   GET  /api/lead-hunter?secret=…               → run complet
 *   GET  /api/lead-hunter?secret=…&save=1        → run + import Airtable
 *   GET  /api/lead-hunter?secret=…&tags=retardavion,ce261  → hashtags spécifiques
 *
 * Instagram activé en prod le 2026-06-14 (INSTAGRAM_BUSINESS_ID + META_PAGE_ACCESS_TOKEN).
 */

'use strict';

const LP = require('./lib/passenger-prospector');
const { sendCallMeBot } = require('./lib/callmebot');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { checkCrmAccess } = require('./lib/crm-access');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-leads';
const KEY = 'leads/latest.json';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

// Airtable — table principale dossiers
const BASE = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
const T_DOSSIERS = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
const STATUT_FIELD = 'fldUnBUQFKeoKf8LL';
const STATUT_PROSPECT = 'Prospect';

// Instagram Graph API (token Meta existant)
const IG_GRAPH = `https://graph.facebook.com/${(process.env.META_GRAPH_VERSION || 'v21.0')}`;
const IG_USER_ID = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();
const IG_TOKEN = (process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ADS_ACCESS_TOKEN || '').trim();
const IG_HASHTAG_CACHE_KEY = 'ig/lead-hashtag-ids.json'; // cache séparé des agences

function intEnv(n, d) { const v = parseInt(String(process.env[n] || '').trim(), 10); return Number.isFinite(v) ? v : d; }

// ── Blobs helpers ────────────────────────────────────────────────────────────

async function loadStored(event) {
  if (!blobs) return null;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    return await blobs.getStore(STORE).get(KEY, { type: 'json' });
  } catch (_) { return null; }
}

async function storeResult(event, payload) {
  if (!blobs) return;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    await blobs.getStore(STORE).setJSON(KEY, payload);
  } catch (e) { console.error('[lead-hunter] Blobs:', e.message); }
}

async function loadHashtagCache(event) {
  if (!blobs) return {};
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    return (await blobs.getStore(STORE).get(IG_HASHTAG_CACHE_KEY, { type: 'json' })) || {};
  } catch (_) { return {}; }
}

async function saveHashtagCache(event, cache) {
  if (!blobs) return;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    await blobs.getStore(STORE).setJSON(IG_HASHTAG_CACHE_KEY, cache);
  } catch (_) {}
}

// ── Instagram Graph API ──────────────────────────────────────────────────────

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

/** Cherche des leads passagers sur les hashtags IG spécifiés. */
async function fetchPassengerLeads(hashtagsArg, event) {
  if (!IG_USER_ID || !IG_TOKEN) {
    return { leads: [], error: 'Instagram non configuré (INSTAGRAM_BUSINESS_ID / token Meta)', count: 0 };
  }

  const tags = hashtagsArg && hashtagsArg.length
    ? hashtagsArg.slice(0, LP.DEFAULT_TAG_LIMIT)
    : LP.LEAD_HASHTAGS.slice(0, LP.DEFAULT_TAG_LIMIT);

  const cache = await loadHashtagCache(event);
  let cacheDirty = false;
  const leads = [];
  let firstError = null;

  for (const tag of tags) {
    try {
      // Résolution ID hashtag (cache persistant pour économiser le quota 30/7j)
      let id = cache[tag];
      if (!id) {
        const res = await igGet('ig_hashtag_search', { user_id: IG_USER_ID, q: tag });
        id = res && res.data && res.data[0] && res.data[0].id;
        if (id) { cache[tag] = id; cacheDirty = true; }
      }
      if (!id) continue;

      // Médias récents du hashtag
      const media = await igGet(`${id}/recent_media`, {
        user_id: IG_USER_ID,
        fields: 'caption,permalink,timestamp,like_count,comments_count',
        limit: '50',
      });
      leads.push(...LP.mediaListToLeads((media && media.data) || [], tag));
    } catch (e) {
      if (!firstError) firstError = e.message;
    }
  }

  if (cacheDirty) await saveHashtagCache(event, cache);

  // Dédup par permalink, tri par score desc
  const seen = new Set();
  const deduped = leads
    .filter(l => { if (seen.has(l.permalink)) return false; seen.add(l.permalink); return true; })
    .sort((a, b) => b.score - a.score);

  return { leads: deduped, error: firstError, count: deduped.length };
}

// ── Airtable import ──────────────────────────────────────────────────────────

/** Crée les nouveaux leads dans Airtable (statut « Prospect »), par lots de 10. */
async function saveLeadsToAirtable(leads, max) {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return { saved: 0, error: 'AIRTABLE_API_KEY manquant' };
  const slice = leads.slice(0, max);
  let saved = 0;
  for (let i = 0; i < slice.length; i += 10) {
    const batch = slice.slice(i, i + 10).map((l) => ({
      fields: {
        [STATUT_FIELD]: STATUT_PROSPECT,
        // Champs nommés (typecast crée les options manquantes)
        'Source lead': `Instagram — #${l.tag}`,
        'Note': [
          l.airline ? `Compagnie : ${l.airline}` : null,
          l.delayHours ? `Retard déclaré : ${l.delayHours}h` : null,
          l.hasAfrica ? 'Route africaine probable' : null,
          `Score : ${l.score}/12 (${l.heat})`,
          `Post : ${l.permalink}`,
          `Extrait : ${l.snippet.slice(0, 120)}`,
        ].filter(Boolean).join(' · '),
        ...(l.phone ? { 'Téléphone': l.phone } : {}),
        ...(l.handle ? { 'Instagram': `@${l.handle}` } : {}),
        ...(l.airline ? { 'Compagnie aérienne': l.airline } : {}),
      },
    }));
    try {
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/${T_DOSSIERS}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch, typecast: true }),
      });
      if (r.ok) { const d = await r.json(); saved += (d.records || []).length; }
      else console.warn('[lead-hunter] save batch', r.status, (await r.text()).slice(0, 160));
    } catch (e) { console.warn('[lead-hunter] save:', e.message); }
  }
  return { saved };
}

// ── Brief CallMeBot ──────────────────────────────────────────────────────────

function ownerBrief(payload, saved) {
  const date = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const hot = payload.leads.filter(l => l.score >= 7).length;
  const lines = [
    '🎯 Lead Hunter — Instagram',
    `📅 ${date}`,
    '',
    `${payload.count} lead(s) passagers trouvé(s)`,
    `🔥 ${hot} HOT · 🟡 ${payload.count - hot} WARM`,
  ];
  if (payload.leads[0]) {
    lines.push('', `Meilleur lead : ${payload.leads[0].airline || 'compagnie inconnue'} — score ${payload.leads[0].score}/12`);
    lines.push(payload.leads[0].permalink);
  }
  if (payload.error) lines.push('', `⚠️ Erreur partielle : ${String(payload.error).slice(0, 80)}`);
  if (saved != null) lines.push('', `✅ ${saved} importé(s) au CRM (statut : Prospect)`);
  lines.push('', '🔗 robindesairs.eu/bureau (poste Malik)');
  return lines.join('\n');
}

// ── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  const q = event.queryStringParameters || {};
  const hashtagsArg = (q.tags || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const fullRun = isNetlifyScheduled(event) || verifyInternalSecret(event, {}).ok;

  // Lecture seule (bureau) : session CRM, jamais d'écriture.
  if (!fullRun) {
    const crm = checkCrmAccess(event);
    if (!crm.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: crm.error || 'Session CRM requise', leads: [] }) };
    const stored = await loadStored(event);
    if (stored) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, cached: true, ...stored }) };
    try {
      const result = await fetchPassengerLeads(hashtagsArg, event);
      await storeResult(event, { ...result, generatedAt: new Date().toISOString() });
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...result }) };
    } catch (e) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message, leads: [] }) };
    }
  }

  // Run complet (cron / secret).
  let result;
  try {
    result = await fetchPassengerLeads(hashtagsArg, event);
  } catch (e) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }

  const payload = { ...result, generatedAt: new Date().toISOString() };
  await storeResult(event, payload);

  // Import CRM opt-in strict (?save=1) + plafond
  let saved = null;
  if (q.save === '1') {
    const limit = Math.min(intEnv('LEAD_SAVE_MAX', 20), q.limit ? parseInt(q.limit, 10) || 20 : 20);
    const res = await saveLeadsToAirtable(result.leads, limit);
    saved = res.saved;
  }

  // Brief owner si leads trouvés
  let briefSent = false;
  if (result.count > 0) {
    const msg = ownerBrief(payload, saved);
    const cb = await sendCallMeBot(msg);
    briefSent = cb.ok;
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, count: result.count, hot: result.leads.filter(l => l.score >= 7).length, saved, briefSent, error: result.error || null }),
  };
};
