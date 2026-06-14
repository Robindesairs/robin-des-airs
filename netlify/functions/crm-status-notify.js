/**
 * crm-status-notify — notifie le client par WhatsApp quand le STATUT de son dossier
 * Airtable change (milestones AVAL : mandat signé → réclamation → relance → escalade → payé).
 *
 * Envoie des TEMPLATES approuvés (cf. docs/TEMPLATES-WATI.md) car le client est souvent
 * hors fenêtre 24h au moment du milestone. UTILITY = approbation facile + moins cher.
 *
 * IDÉMPOTENT : un état « dernier statut notifié par réf » est gardé dans Blobs. On n'envoie
 * que sur une VRAIE TRANSITION (le statut a changé depuis la dernière fois). Le 1er passage
 * AMORCE l'état SANS rien envoyer → aucun envoi en masse sur le backlog existant.
 *
 * SÉCURITÉ : DÉSACTIVÉ par défaut. N'envoie QUE si CRM_STATUS_TEMPLATES=1 ET templates approuvés.
 *   Flag OFF → balaie + amorce l'état seulement (dry-run), pour qu'activer plus tard ne blaste personne.
 *
 * AUTH : cron Netlify OU ?secret= interne. (GET manuel : /api/crm-status-notify?secret=…&force=1)
 */

'use strict';

const { airtableCfg, airtableListRecords, recordFromAirtableFields } = require('./lib/airtable-robin');
const { watiAgencySendTemplate } = require('./lib/wati-api');
const { requireCronOrInternalSecret, publicCorsHeaders } = require('./lib/internal-auth');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'crm-status-notify';
const KEY = 'last-status.json';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

// Nom de template (surchargeable par env CRM_TPL_<NOM_MAJ>) — doit matcher un template APPROUVÉ.
function tpl(name) { return (process.env['CRM_TPL_' + name.toUpperCase()] || name).trim(); }
// Paramètres positionnels WATI : [{name:'1', value}, …]
function P(values) { return values.map((v, i) => ({ name: String(i + 1), value: String(v == null ? '' : v).trim().slice(0, 180) || '—' })); }
function digits(x) { const n = parseInt(String(x || '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : 0; }
function eur(n) { return (n || 0) + ' €'; }
function brut(r) { return digits(r.indemnite) || 600; }
function net(r) { return digits(r.montantClient) || Math.round(brut(r) * 0.75); }
function voyage(r) { return (r.vol || r.route || 'votre vol').trim(); }
function prenom(r) { return (r.prenom || 'à vous').trim(); }

// Statut « Statut du Dossier Suivi » → template + paramètres. Statuts absents = pas de notif auto.
const STATUS_TEMPLATES = {
  'Mandat signé':  (r) => ({ name: tpl('mandat_signe'),        params: P([prenom(r), r.ref, eur(brut(r))]) }),
  'LRAR envoyée':  (r) => ({ name: tpl('reclamation_envoyee'), params: P([prenom(r), voyage(r)]) }),
  'Relance 1':     (r) => ({ name: tpl('relance_compagnie'),   params: P([r.ref, prenom(r)]) }),
  'Relance 2':     (r) => ({ name: tpl('relance_compagnie'),   params: P([r.ref, prenom(r)]) }),
  'Médiation':     (r) => ({ name: tpl('escalade_procedure'),  params: P([r.ref, prenom(r)]) }),
  'Contentieux':   (r) => ({ name: tpl('escalade_procedure'),  params: P([r.ref, prenom(r)]) }),
  'Payé client':   (r) => ({ name: tpl('paiement_en_cours'),   params: P([prenom(r), r.ref, eur(net(r))]) }),
  'Payé':          (r) => ({ name: tpl('paiement_en_cours'),   params: P([prenom(r), r.ref, eur(net(r))]) }),
  'Indemnisé':     (r) => ({ name: tpl('paiement_en_cours'),   params: P([prenom(r), r.ref, eur(net(r))]) }),
};

function store(event) {
  if (!blobs || !blobs.getStore) return null;
  try { if (blobs.connectLambda && event) blobs.connectLambda(event); } catch (_) {}
  try { return blobs.getStore(STORE); } catch (_) { return null; }
}

exports.handler = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };

  let body = {};
  try { body = event && event.body ? JSON.parse(event.body) : {}; } catch (_) {}
  const auth = requireCronOrInternalSecret(event, body);
  if (!auth.ok) {
    return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ ok: false, error: auth.error || 'Accès refusé (cron ou secret requis)' }) };
  }

  const cfg = airtableCfg();
  if (!cfg) return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Airtable non configuré (AIRTABLE_API_KEY/BASE/TABLE)' }) };

  const enabled = process.env.CRM_STATUS_TEMPLATES === '1';
  const st = store(event);
  if (!st) return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Netlify Blobs indisponible' }) };

  let seed = {};
  try { seed = (await st.get(KEY, { type: 'json' })) || {}; } catch (_) { seed = {}; }
  const firstRun = Object.keys(seed).length === 0;

  let records = [];
  try { records = await airtableListRecords(cfg, { maxRecords: 1000 }); }
  catch (e) { return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Airtable: ' + e.message }) }; }

  let scanned = 0, transitions = 0, sent = 0, seeded = 0, skipped = 0;
  const log = [];

  for (const rec of records) {
    const r = recordFromAirtableFields(cfg, rec.fields || {});
    const ref = (r.ref || '').trim();
    const statut = (r.statutSuivi || '').trim();
    if (!ref || /test/i.test(ref)) continue; // ignore réfs de test/démo
    scanned++;

    const prev = seed[ref];
    if (prev === statut) continue;          // pas de changement
    transitions++;

    const mapper = STATUS_TEMPLATES[statut];
    const phone = (r.whatsapp || '').replace(/\s/g, '');
    const sendable = enabled && !firstRun && prev !== undefined && mapper && phone && phone.replace(/\D/g, '').length >= 10;

    if (sendable) {
      const { name, params } = mapper(r);
      const res = await watiAgencySendTemplate(phone, name, params, 'robin');
      if (res && res.ok) { sent++; log.push(`✉️ ${ref} ${prev || '∅'}→${statut} (${name})`); }
      else { skipped++; log.push(`⚠️ ${ref} échec template ${name}: ${res && res.error}`); continue; } // garde l'ancien seed → on retentera
    } else if (prev === undefined) {
      seeded++;
    }
    seed[ref] = statut; // mémorise le nouveau statut (après envoi réussi, ou en amorçage / dry-run)
  }

  try { await st.setJSON(KEY, seed); } catch (e) { return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Blobs set: ' + e.message }) }; }

  const summary = { ok: true, enabled, dryRun: !enabled, firstRun, scanned, transitions, sent, seeded, skipped, log: log.slice(0, 50) };
  console.log('crm-status-notify', JSON.stringify({ ...summary, log: undefined }));
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(summary) };
};
