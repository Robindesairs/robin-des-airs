/**
 * POST /api/generate-claim  { ref, secret }
 * Génère la MISE EN DEMEURE CE 261/2004 d'un dossier (depuis Airtable) → PDF déterministe
 * → stockage Blobs `robin-claims` + remarque Airtable (PAS de changement de statut : l'humain
 * valide et envoie, puis marque LRAR_ENVOYEE) + notif owner. Renvoie le PDF (base64).
 *
 * Auth interne (verifyInternalSecret). Inerte tant que non appelé. Aucun texte généré par IA.
 */

const { airtableCfg, airtableFindByRef, recordFromAirtableFields, airtablePatch } = require('./lib/airtable-robin');
const { getAirlineClaim } = require('./lib/airlines-claims');
const { genererClaimPdf } = require('./lib/claim-pdf');
const { verifyInternalSecret, publicCorsHeaders, denyResponse } = require('./lib/internal-auth');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}
let loadEnqueteCache = null;
try { ({ loadCache: loadEnqueteCache } = require('./lib/radar-enquete')); } catch (_) {}
let notifyOwner = null;
try { ({ notifyOwner } = require('./lib/owner-notify')); } catch (_) {}

const STORE = 'robin-claims';
const HEADERS = publicCorsHeaders({ 'Cache-Control': 'no-store' });

function frToYmd(d) {
  const m = String(d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d).slice(0, 10) : '';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'POST uniquement' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'JSON invalide' }) }; }

  const auth = verifyInternalSecret(event, body);
  if (!auth.ok) return denyResponse(401, auth.error, 'public');

  const ref = (body.ref || '').trim();
  if (!ref) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'ref requis' }) };

  const cfg = airtableCfg();
  if (!cfg) return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Airtable non configuré' }) };

  let recs;
  try { recs = await airtableFindByRef(cfg, ref); }
  catch (e) { return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Airtable: ' + e.message }) }; }
  if (!recs.length) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'dossier introuvable' }) };

  const rec = recs[0];
  const data = recordFromAirtableFields(cfg, rec.fields);
  const airline = getAirlineClaim(data.vol || data.compagnie);
  const montant = parseInt(String(data.indemnite || '').replace(/[^\d]/g, ''), 10) || 600;

  // Art. 9 (best-effort, depuis le cache d'enquête malick)
  let art9Note = '';
  if (loadEnqueteCache && data.vol) {
    try {
      const enq = await loadEnqueteCache(event, data.vol, frToYmd(data.date));
      if (enq && enq.art9 && enq.art9.note) art9Note = enq.art9.note;
    } catch (_) {}
  }

  const claim = {
    ref,
    passengerName: data.name || '—',
    address: data.address || '',
    airlineName: (airline && airline.nom) || data.compagnie || 'la compagnie aérienne',
    neb: (airline && airline.neb && airline.neb.nom) || '',
    vol: data.vol || '',
    dateVol: data.date || '',
    pnr: data.pnr || '',
    route: data.route || '',
    incident: data.motif || '',
    montant,
    exigerCash: !!(airline && airline.exigerCash),
    art9Note,
    delaiJours: 14,
  };

  let pdf;
  try { pdf = await genererClaimPdf(claim); }
  catch (e) { return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'PDF: ' + e.message }) }; }

  // Stockage Blobs (append-only par ref)
  const safeRef = ref.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobKey = `claim/${safeRef}/lrar.pdf`;
  if (blobs) {
    try {
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE);
      await store.set(blobKey, pdf, { metadata: { contentType: 'application/pdf', ref, generatedAt: new Date().toISOString() } });
      await store.setJSON(`claim/${safeRef}/lrar.json`, { ref, claim, generatedAt: new Date().toISOString(), channel: airline && airline.entryMode });
    } catch (e) { console.error('generate-claim: Blobs error:', e.message); }
  }

  // Remarque Airtable (PAS de changement de statut : human-in-loop)
  try {
    const note = `MED générée ${new Date().toISOString().slice(0, 10)} — canal ${(airline && airline.entryMode) || '?'}${claim.exigerCash ? ' — cash exigé' : ''} — à valider/envoyer`;
    const prev = (data.remarques || '').trim();
    let remark = prev ? `${prev} | ${note}` : note;
    if (remark.length > 900) remark = remark.slice(-900);
    await airtablePatch(cfg, rec.id, { [cfg.fRemarques]: remark });
  } catch (e) { console.error('generate-claim: Airtable remark error:', e.message); }

  // Notif owner (best-effort)
  if (notifyOwner) {
    try {
      await notifyOwner(
        `Mise en demeure prête — ${ref} (${claim.airlineName})`,
        `MED générée pour ${claim.passengerName} · vol ${claim.vol || '—'} · ${montant} €${claim.exigerCash ? ' · CASH exigé' : ''}\n` +
        `Canal: ${(airline && airline.entryMode) || 'à confirmer'} · NEB: ${claim.neb || '—'}\n` +
        `À VALIDER puis envoyer (mandat requis pour le paiement sur compte tiers).`
      );
    } catch (_) {}
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      ref,
      airline: claim.airlineName,
      channel: airline && airline.entryMode,
      exigerCash: claim.exigerCash,
      montant,
      neb: claim.neb,
      art9: !!art9Note,
      blobKey,
      mandatRequis: true,
      statutInchange: true,
      pdfBase64: pdf.toString('base64'),
    }),
  };
};
