/**
 * bureau-daily — routine quotidienne + veille 24/24 des postes du Bureau.
 *
 * Donne un « travail du jour » aux postes qui n'avaient pas encore d'automate :
 *   Aïcha (DG), Sofia (Partenaires), Karim (Trésorerie), Léa (Suivi), Nadia (Rentabilité).
 *   Les postes Malik / Robin / Me Lefèvre / Yanis / Aïssa ont déjà le leur.
 *
 * Lit les vraies données (dossiers + agences Airtable + file juridique via legal-pipeline),
 * calcule les briefs (lib/bureau-routines), stocke Blobs `robin-bureau` (briefs/latest.json)
 * et — en mode cron/secret — pousse UN brief WhatsApp consolidé au propriétaire (CallMeBot,
 * seulement s'il y a des actions). 100 % human-in-the-loop : aucun envoi, aucun changement
 * de statut.
 *
 * AUTH : cron Netlify OU ?secret= = run complet (recalcul + stockage + brief).
 *        GET + session CRM (cookie rda_crm) sans secret = recalcul live lecture seule (24/24).
 *
 * Tests : GET /api/bureau-daily   (bureau) · GET /api/bureau-daily?secret=…&force=1
 */

'use strict';

const { computeDeskBriefs, summarizeBureauForOwner, hasActionables } = require('./lib/bureau-routines');
const { buildLegalQueue, defaultThresholds } = require('./lib/legal-pipeline');
const { getAirlineClaim, airlineIataFromFlight } = require('./lib/airlines-claims');
const { africanDepartureFromRoute } = require('./lib/airport-coords');
const { sendCallMeBot } = require('./lib/callmebot');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { checkCrmAccess } = require('./lib/crm-access');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-bureau';
const BRIEFS_KEY = 'briefs/latest.json';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

const BASE = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
const T_DOSSIERS = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
const T_AGENCES = (process.env.AIRTABLE_TABLE_AGENCES || 'tbleJVsy8Is5VygkQ').trim();
const AG_STATUT_FIELD = 'fldXE9N3wp1EDTblM'; // « Statut (Agences) » (cf. bureau-stats)

const DOSSIER_FIELDS = [
  'Référence Dossier', 'Prénom Passager', 'Nom Passager',
  'Numéro de vol', 'Compagnie Aérienne', 'Itinéraire', 'Trajet',
  'Date du vol', 'Date Dossier', 'Statut du Dossier Suivi',
  "Montant de l'indemnité", 'Montant Client', 'Remarques',
];

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function val(f, key) {
  const v = f[key];
  if (v == null) return '';
  if (typeof v === 'object' && !Array.isArray(v)) return v.name || '';
  if (Array.isArray(v)) return v.map((x) => (x && x.name) || x).join(', ');
  return String(v);
}

async function airtableFetchByName(table, fields) {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return null;
  const headers = { Authorization: `Bearer ${key}` };
  const out = [];
  let offset = '';
  do {
    const p = new URLSearchParams({ pageSize: '100' });
    for (const f of fields || []) p.append('fields[]', f);
    if (offset) p.set('offset', offset);
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${table}?${p}`, { headers });
    if (!r.ok) throw new Error(`Airtable ${table} ${r.status}`);
    const data = await r.json();
    out.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);
  return out;
}

async function fetchAgences() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  if (!key) return { actives: 0, prospects: 0, total: 0 };
  const headers = { Authorization: `Bearer ${key}` };
  let actives = 0, prospects = 0, total = 0, offset = '';
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE}/${T_AGENCES}`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('returnFieldsByFieldId', 'true');
      if (offset) url.searchParams.set('offset', offset);
      const r = await fetch(url.toString(), { headers });
      if (!r.ok) throw new Error(`Airtable agences ${r.status}`);
      const data = await r.json();
      for (const rec of data.records || []) {
        const f = rec.fields || {};
        if (!Object.keys(f).length) continue;
        total++;
        const s = f[AG_STATUT_FIELD] ? (f[AG_STATUT_FIELD].name || f[AG_STATUT_FIELD]) : '';
        if (s === 'Actif') actives++;
        else if (s === 'À contacter') prospects++;
      }
      offset = data.offset || '';
    } while (offset);
  } catch (e) {
    console.warn('[bureau-daily] agences:', e.message);
  }
  return { actives, prospects, total };
}

function normalizeDossier(rec) {
  const f = rec.fields || {};
  const prenom = val(f, 'Prénom Passager');
  const nom = val(f, 'Nom Passager');
  return {
    ref: val(f, 'Référence Dossier'),
    name: [prenom, nom].filter(Boolean).join(' ').trim(),
    vol: val(f, 'Numéro de vol'),
    compagnie: val(f, 'Compagnie Aérienne'),
    route: val(f, 'Itinéraire') || val(f, 'Trajet'),
    dateVol: val(f, 'Date du vol'),
    dateDossier: val(f, 'Date Dossier') || (rec.createdTime ? rec.createdTime.slice(0, 10) : ''),
    statut: val(f, 'Statut du Dossier Suivi'),
    indemnite: val(f, "Montant de l'indemnité"),
    montantClient: val(f, 'Montant Client'),
    remarques: val(f, 'Remarques'),
  };
}

function getAirline(volOuCie) {
  const a = getAirlineClaim(volOuCie);
  if (!a) return null;
  return { ...a, iata: airlineIataFromFlight(String(volOuCie || '').toUpperCase().replace(/\s/g, '')) || '' };
}

async function compute() {
  let recs;
  try { recs = await airtableFetchByName(T_DOSSIERS, DOSSIER_FIELDS); }
  catch (e) { return { briefs: null, error: 'Airtable: ' + e.message }; }
  if (recs == null) return { briefs: null, error: 'Airtable non configuré' };

  const dossiers = recs.map(normalizeDossier);
  const agences = await fetchAgences();
  const legal = buildLegalQueue(dossiers, {
    now: new Date(), thresholds: defaultThresholds(), getAirline, africanDeparture: africanDepartureFromRoute,
  });
  const briefs = computeDeskBriefs({ now: new Date(), dossiers, agences, legal });
  return { briefs: { generatedAt: new Date().toISOString(), agences, legalCounts: legal.counts, desks: briefs }, error: null };
}

async function loadStored(event) {
  if (!blobs) return null;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    return await blobs.getStore(STORE).get(BRIEFS_KEY, { type: 'json' });
  } catch (_) { return null; }
}
async function store(event, briefs) {
  if (!blobs) return;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    await blobs.getStore(STORE).setJSON(BRIEFS_KEY, briefs);
  } catch (e) { console.error('[bureau-daily] Blobs:', e.message); }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  const fullRun = isNetlifyScheduled(event) || verifyInternalSecret(event, body).ok;

  if (!fullRun) {
    const crm = checkCrmAccess(event);
    if (!crm.ok) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: crm.error || 'Session CRM requise', desks: {} }) };
    const { briefs, error } = await compute();
    if (!briefs) {
      const stored = await loadStored(event);
      if (stored) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, stale: true, ...stored }) };
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error, desks: {} }) };
    }
    await store(event, briefs);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...briefs }) };
  }

  const { briefs, error } = await compute();
  if (!briefs) return { statusCode: error && error.includes('non configuré') ? 503 : 502, headers: HEADERS, body: JSON.stringify({ ok: false, error }) };
  await store(event, briefs);

  const force = (event.queryStringParameters || {}).force === '1' || body.force === true;
  let callmebot = { ok: false, reason: 'skipped' };
  let message = null;
  if (hasActionables(briefs.desks) || force) {
    message = summarizeBureauForOwner(briefs.desks, todayLabel());
    callmebot = await sendCallMeBot(message);
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, briefSent: !!message, callmebot, message }) };
};
