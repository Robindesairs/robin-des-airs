/**
 * rgpd-purge-pieces — suppression automatique RGPD des pièces déposées.
 *
 * Déclencheurs : dossier « Payé client » OU Éligibilité « Non », + 30 j de grâce
 * (mesurés sur « Last Modified Time », ancre PRUDENTE : ne supprime jamais trop tôt),
 * + pas déjà purgé, + hors lignes Test/Démo.
 *
 * Supprime du store Blobs 'pieces' : p/<ref>/*  (dépôt web) et wa/<phone>/*  (WhatsApp bot).
 * CONSERVE le mandat signé (store 'mandats', clé m/<ref> — JAMAIS touché).
 *
 * SÉCURITÉ — destructif :
 *  - DRY-RUN par défaut. Ne supprime RIEN tant que RGPD_PURGE_ENABLED=1 (cron) ou ?commit=1 (manuel).
 *  - Idempotent : marque le champ « Pièces purgées (RGPD) » = date → jamais re-traité.
 *  - Manuel (test) : GET /api/rgpd-purge-pieces?s=<WATI_WEBHOOK_SECRET>          → dry-run (liste ce qui SERAIT supprimé)
 *                    GET /api/rgpd-purge-pieces?s=<secret>&commit=1              → supprime pour de vrai
 */

const { airtableCfg, airtableListRecords, airtablePatch } = require('./lib/airtable-robin');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { corsHeaders } = require('./lib/auth-config');

const J = (code, obj) => ({ statusCode: code, headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

const GRACE_DAYS = Math.max(0, parseInt(process.env.RGPD_PURGE_GRACE_DAYS, 10) || 30);
const STATUTS_TERMINAUX = ['Payé client']; // + Éligibilité « Non » (testé séparément)
const PURGE_FIELD = 'Pièces purgées (RGPD)';
const ELIG_FIELD = 'Éligibilité';
const LASTMOD_FIELD = 'Last Modified Time';
const TESTDEMO_FIELD = 'Test / Démo';

function digits(s) { return String(s || '').replace(/\D/g, ''); }

exports.handler = async (event) => {
  event = event || {};
  const isHttp = !!event.httpMethod;
  if (isHttp && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };

  // Mode commit : cron → RGPD_PURGE_ENABLED=1 ; manuel → ?commit=1. Sinon DRY-RUN (rien supprimé).
  let commit = process.env.RGPD_PURGE_ENABLED === '1';
  if (isHttp) {
    const q = event.queryStringParameters || {};
    const secret = String(q.s || event.headers['x-secret'] || '').trim();
    const expected = (process.env.WATI_WEBHOOK_SECRET || '').trim();
    if (!expected || secret !== expected) return J(401, { error: 'secret invalide' });
    if (q.commit === '1') commit = true;
    if (q.dry === '1') commit = false;
  }

  const cfg = airtableCfg();
  if (!cfg) return J(500, { error: 'airtable non configuré' });
  const pieces = getBlobStore(event, 'pieces');
  if (!pieces) return J(500, { error: 'store pieces indisponible' });

  const now = Date.now();
  const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
  const L = cfg.labels;

  let records;
  try { records = await airtableListRecords(cfg, { maxRecords: 1000 }); }
  catch (e) { return J(502, { error: 'airtable list: ' + e.message }); }

  const traites = [];
  let terminaux = 0, candidats = 0;

  for (const rec of records) {
    const f = rec.fields || {};
    if (f[TESTDEMO_FIELD] === true) continue;                       // jamais toucher les lignes de test/démo
    const statut = f[L.statutSuivi];
    const terminal = STATUTS_TERMINAUX.includes(statut) || f[ELIG_FIELD] === 'Non';
    if (!terminal) continue;
    terminaux++;
    if (f[PURGE_FIELD]) continue;                                   // déjà purgé (idempotence)
    const lastMod = Date.parse(f[LASTMOD_FIELD] || '') || 0;
    if (!lastMod || (now - lastMod) < graceMs) continue;           // grâce de 30 j non écoulée
    candidats++;

    const ref = String(f[L.ref] || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (!ref) continue;
    const phone = digits(f[L.whatsapp]);

    const prefixes = ['p/' + ref + '/'];
    if (phone) prefixes.push('wa/' + phone + '/');
    let keys = [];
    for (const prefix of prefixes) {
      try {
        const listing = await pieces.list({ prefix });
        for (const b of (listing && listing.blobs ? listing.blobs : [])) keys.push(b.key);
      } catch (_) {}
    }
    keys = [...new Set(keys)];

    let deleted = 0;
    if (commit) {
      for (const k of keys) { try { await pieces.delete(k); deleted++; } catch (_) {} }
      // Audit + idempotence (le mandat 'mandats' m/<ref> n'est PAS touché).
      try { await airtablePatch(cfg, rec.id, { [PURGE_FIELD]: new Date(now).toISOString().slice(0, 10) }); } catch (_) {}
    }
    traites.push({ ref, statut: statut || (f[ELIG_FIELD] === 'Non' ? 'Éligibilité=Non' : '?'), piecesTrouvees: keys.length, supprimees: deleted });
  }

  const summary = {
    ok: true,
    mode: commit ? 'COMMIT' : 'DRY-RUN',
    graceDays: GRACE_DAYS,
    terminauxScannes: terminaux,
    candidatsHorsGrace: candidats,
    traites: traites.length,
    dossiers: traites.slice(0, 50),
  };
  console.log('rgpd-purge-pieces', JSON.stringify(summary).slice(0, 600));
  return J(200, summary);
};
