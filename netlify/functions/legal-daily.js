/**
 * legal-daily — Cabinet Me Lefèvre, routine quotidienne + veille 24/24.
 *
 * RÔLE : chaque jour (cron) ET à la demande (bureau), scanne les dossiers engagés
 *   d'Airtable, calcule la prochaine action juridique de chacun (mise en demeure < 5 j,
 *   relance, escalade NEB, contentieux, prescription) via lib/legal-pipeline, stocke la
 *   file dans Blobs `robin-legal` (queue/latest.json) et — en mode cron/secret — pousse
 *   un brief WhatsApp au propriétaire (CallMeBot, comme morning-report).
 *
 *   100 % human-in-the-loop : AUCUN envoi à une compagnie, aucun changement de statut.
 *   Me Lefèvre prépare la liste de travail ; l'humain valide et expédie.
 *
 * AUTH :
 *   - cron Netlify  OU  ?secret= interne  → RUN COMPLET (recalcul + stockage + brief owner)
 *   - GET + session CRM (cookie rda_crm / X-CRM-Code), sans secret → recalcul LIVE en
 *     lecture seule (PAS de brief) pour la carte Me Lefèvre du bureau (dispo 24/24)
 *
 * Tests :
 *   GET  /api/legal-daily            (depuis le bureau, session CRM)
 *   GET  /api/legal-daily?secret=…&force=1   (run complet manuel)
 */

'use strict';

const { buildLegalQueue, summarizeForOwner, defaultThresholds } = require('./lib/legal-pipeline');
const { getAirlineClaim, airlineIataFromFlight } = require('./lib/airlines-claims');
const { africanDepartureFromRoute } = require('./lib/airport-coords');
const { sendCallMeBot } = require('./lib/callmebot');
const { isNetlifyScheduled, verifyInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');
const { checkCrmAccess } = require('./lib/crm-access');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-legal';
const QUEUE_KEY = 'queue/latest.json';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

// Statuts terminaux exclus du fetch (réduit le volume Airtable).
const TERMINAL_FETCH = ['Payé client', 'Payé', 'Indemnisé', 'Refus définitif', 'Abandon', 'Prescrit', 'Clôturé', 'Clôturé payé'];

const FIELDS = [
  'Référence Dossier', 'Prénom Passager', 'Nom Passager',
  'Numéro de vol', 'Compagnie Aérienne', 'Itinéraire', 'Trajet',
  'Date du vol', 'Date Dossier', 'Statut du Dossier Suivi',
  "Montant de l'indemnité", 'Remarques',
];

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Lecture Airtable paginée (dossiers non terminaux). */
async function fetchEngagedDossiers() {
  const apiKey = (process.env.AIRTABLE_API_KEY || '').trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
  const tableId = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
  if (!apiKey) return null;

  const formula = `NOT(OR(${TERMINAL_FETCH.map((s) => `{Statut du Dossier Suivi}='${s.replace(/'/g, "\\'")}'`).join(',')}))`;
  const headers = { Authorization: `Bearer ${apiKey}` };
  const records = [];
  let offset = '';
  do {
    const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
    for (const f of FIELDS) params.append('fields[]', f);
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?${params}`, { headers });
    if (!res.ok) throw new Error(`Airtable ${res.status}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);
  return records;
}

/** Champ Airtable (string|number|array|select) → string. */
function val(f, key) {
  const v = f[key];
  if (v == null) return '';
  if (typeof v === 'object' && !Array.isArray(v)) return v.name || '';
  if (Array.isArray(v)) return v.map((x) => (x && x.name) || x).join(', ');
  return String(v);
}

/** Enregistrement Airtable → dossier normalisé pour legal-pipeline. */
function normalize(rec) {
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
    dateDossier: val(f, 'Date Dossier'),
    statut: val(f, 'Statut du Dossier Suivi'),
    montant: val(f, "Montant de l'indemnité"),
    remarques: val(f, 'Remarques'),
  };
}

/** getAirlineClaim + iata résolu (le réf n'embarque pas le code IATA). */
function getAirline(volOuCie) {
  const a = getAirlineClaim(volOuCie);
  if (!a) return null;
  const iata = airlineIataFromFlight(String(volOuCie || '').toUpperCase().replace(/\s/g, '')) || '';
  return { ...a, iata };
}

async function loadStoredQueue(event) {
  if (!blobs) return null;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    const store = blobs.getStore(STORE);
    return await store.get(QUEUE_KEY, { type: 'json' });
  } catch (_) { return null; }
}

async function storeQueue(event, queue) {
  if (!blobs) return;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    const store = blobs.getStore(STORE);
    await store.setJSON(QUEUE_KEY, queue);
  } catch (e) { console.error('legal-daily: Blobs error:', e.message); }
}

/** Recalcule la file depuis Airtable. Renvoie { queue, error }. */
async function computeQueue() {
  let records;
  try { records = await fetchEngagedDossiers(); }
  catch (e) { return { queue: null, error: 'Airtable: ' + e.message }; }
  if (records == null) return { queue: null, error: 'Airtable non configuré' };

  const dossiers = records.map(normalize);
  const queue = buildLegalQueue(dossiers, {
    now: new Date(),
    thresholds: defaultThresholds(),
    getAirline,
    africanDeparture: africanDepartureFromRoute,
  });
  return { queue, error: null };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  const isCron = isNetlifyScheduled(event);
  const internal = verifyInternalSecret(event, body);
  const fullRun = isCron || internal.ok;

  // Lecture seule pour le bureau : session CRM, pas de secret.
  if (!fullRun) {
    const crm = checkCrmAccess(event);
    if (!crm.ok) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: crm.error || 'Session CRM requise', items: [] }) };
    }
    const { queue, error } = await computeQueue();
    if (!queue) {
      const stored = await loadStoredQueue(event);
      if (stored) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, stale: true, ...stored }) };
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error, items: [] }) };
    }
    await storeQueue(event, queue); // rafraîchit le snapshot, sans brief
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...queue }) };
  }

  // Run complet (cron / secret) : recalcul + stockage + brief owner.
  const { queue, error } = await computeQueue();
  if (!queue) {
    return { statusCode: error && error.includes('non configuré') ? 503 : 502, headers: HEADERS, body: JSON.stringify({ ok: false, error }) };
  }
  await storeQueue(event, queue);

  const force = (event.queryStringParameters || {}).force === '1' || body.force === true;
  // Brief seulement s'il y a du rouge/orange (ou ?force=1) → pas de spam les jours calmes.
  const actionnables = (queue.counts.rouge || 0) + (queue.counts.orange || 0);
  let callmebot = { ok: false, reason: 'skipped' };
  let message = null;
  if (actionnables > 0 || force) {
    message = summarizeForOwner(queue, todayLabel());
    callmebot = await sendCallMeBot(message);
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, total: queue.total, counts: queue.counts, briefSent: !!message, callmebot, message }),
  };
};
