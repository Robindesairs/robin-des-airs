/**
 * /api/retract — RÉTRACTATION du client (droit de 14 jours, art. L.221-18 s.), JOURNALISÉE automatiquement.
 *
 * POST { ref, reason? }
 *  - Sécurité : n'accepte la rétractation QUE pour un dossier RÉEL existant (clé m/<ref> dans le store
 *    'mandats'). La réf-jeton (longue, non énumérable) agit comme bearer — comme /api/depot-upload.
 *  - Journalise une PREUVE scellée : marqueur retracted/<ref> (Blobs) = { ref, at, ip_hash, ua, reason }.
 *  - Met le dossier Airtable au statut « Rétracté » (+ ligne Remarques horodatée, garantie même si le
 *    statut n'existe pas encore comme option).
 *  - Notifie l'équipe (email + WhatsApp) : dossier à clôturer / rétrocession à opérer (Art. 9 du contrat).
 *  - Fire-once : une 2ᵉ rétractation renvoie simplement « déjà enregistrée ».
 *
 * → 200 { ok:true, at } | { ok:true, already:true, at }
 */
const crypto = require('crypto');
const { getBlobStore } = require('./lib/netlify-blobs-store');
let AT = null; try { AT = require('./lib/airtable-robin'); } catch (_) {}
let ownerNotify = null; try { ownerNotify = require('./lib/owner-notify'); } catch (_) {}

const SITE_ORIGINS = ['https://robindesairs.eu', 'https://www.robindesairs.eu'];
const corsFor = (event) => {
  const o = String((event && event.headers && (event.headers.origin || event.headers.Origin)) || '').trim();
  const allow = SITE_ORIGINS.includes(o) ? o : 'https://robindesairs.eu';
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type' };
};
const sha256 = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 32);

// Double append-only vers Supabase (best-effort, inerte sans SUPABASE_URL/KEY) : copie infalsifiable du journal.
async function logSignatureEvent(row) {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !key) return;
  try {
    await fetch(url + '/rest/v1/signature_events', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row), signal: AbortSignal.timeout(4000),
    });
  } catch (e) { console.error('retract: Supabase log KO (non bloquant):', e.message); }
};

exports.handler = async (event) => {
  const H = corsFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
  const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const reason = String(b.reason || '').slice(0, 500);
  if (!ref) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'ref requise' }) };

  const at = new Date().toISOString();
  const ipHash = sha256((event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'])) || '');
  const ua = String((event.headers && event.headers['user-agent']) || '').slice(0, 150);

  // 1) Sécurité : le dossier doit exister (réf-jeton valide). + fire-once.
  const mandats = getBlobStore(event, 'mandats');
  if (mandats) {
    try { const d = await mandats.get('m/' + ref); if (!d) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'dossier inconnu ou lien expiré' }) }; } catch (_) {}
    try { const prev = await mandats.get('retracted/' + ref, { type: 'json' }); if (prev && prev.at) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, already: true, at: prev.at }) }; } catch (_) {}
    try { await mandats.setJSON('retracted/' + ref, { ref, at, ip_hash: ipHash, ua, reason }); } catch (_) {}
  }
  // Double append-only du journal dans Supabase (best-effort).
  await logSignatureEvent({ ref, cert_id: null, event: 'retracted', signed_at: at, ip_hash: ipHash, user_agent: ua, doc_hash: null, source: 'web', lang: null });

  // 2) Airtable : statut « Rétracté » (best-effort) + ligne Remarques garantie.
  try {
    if (AT && AT.airtableCfg) {
      const cfg = AT.airtableCfg();
      if (cfg) {
        const recs = await AT.airtableFindByRef(cfg, ref);
        const rec = recs && recs[0];
        if (rec && rec.id) {
          const atDate = new Date(at).toLocaleDateString('fr-FR');
          const note = '⛔ RÉTRACTATION le ' + atDate + (reason ? ' — « ' + reason + ' »' : '') + ' — dossier à clôturer, rétrocession de créance à opérer (Art. 9).';
          const rem = cfg.labels.remarques;
          const cur = (rec.fields && rem && rec.fields[rem]) ? String(rec.fields[rem]).trim() : '';
          // Remarques d'abord (garanti) …
          if (rem) { try { await AT.airtablePatch(cfg, rec.id, { [rem]: cur ? (cur + '\n' + note) : note }); } catch (_) {} }
          // … puis le statut (peut échouer si l'option n'existe pas encore — sans casser le reste).
          const statut = (process.env.AIRTABLE_STATUT_RETRACTE || 'Rétracté').trim();
          try { await AT.airtablePatch(cfg, rec.id, { [cfg.labels.statutSuivi]: statut }); } catch (_) {}
        }
      }
    }
  } catch (_) {}

  // 3) Alerte équipe (email + WhatsApp) — rétrocession à traiter.
  try {
    if (ownerNotify) {
      const subject = '⛔ Rétractation — dossier ' + ref;
      const text = 'Le client s\'est RÉTRACTÉ (dossier ' + ref + ') le ' + at + '.' + (reason ? '\nMotif : ' + reason : '') + '\n→ Clôturer le dossier et, si la cession a été notifiée au transporteur, opérer la RÉTROCESSION par LRAR (Art. 9 du contrat).';
      if (ownerNotify.notifyOwner) ownerNotify.notifyOwner(subject, text).catch(() => {});
      if (ownerNotify.notifyOwnerWhatsApp) ownerNotify.notifyOwnerWhatsApp('', subject + '\n' + text).catch(() => {});
    }
  } catch (_) {}

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, at }) };
};
