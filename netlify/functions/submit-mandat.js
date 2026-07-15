/**
 * submit-mandat — Robin des Airs
 * Signature mandat.html → Blobs + Airtable + email équipe (Resend) + webhook Make/Wati.
 *
 * POST /api/submit-mandat
 */

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require('@netlify/blobs'); } catch (e) {}

const { clientEmailForRef } = require('./lib/airtable-robin');
const { checkRateLimit: rateLimitCheck } = require('./lib/rate-limit');

// Génération + envoi de la copie PDF signée (best-effort : ne doit jamais casser la signature)
let genererMandatPdf = null, genererMandatBilinguePdf = null;
try { ({ genererMandatPdf, genererMandatBilinguePdf } = require('./lib/mandat-pdf')); } catch (e) { console.error('submit-mandat: mandat-pdf indisponible:', e.message); }
let watiSendFile = null, watiCfg = null;
try { ({ watiSendFile, watiCfg } = require('./lib/wati-api')); } catch (e) { /* WhatsApp optionnel */ }
// Convention de nom « côté compagnie » : Contrat-Cession-NOM-Prénom-VOL-CODE.pdf (lib/doc-filename)
let nomFichierCompagnie = null, codeFromRef = null;
try { ({ nomFichierCompagnie, codeFromRef } = require('./lib/doc-filename')); } catch (e) {}

const STORE_NAME = 'robin-signatures';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const INCIDENT_AT = {
  delay: 'Retard +3h',
  cancel: 'Annulation',
  denied: 'Surbooking',
};

function hashString(str) {
  // Pseudonymisation forte : SHA-256 salé, tronqué (96 bits) — non réversible / non ré-identifiable.
  // Définir RDA_HASH_SALT dans l'environnement Netlify pour un sel secret (sinon fallback ci-dessous).
  const salt = process.env.RDA_HASH_SALT || 'rda-ce261-pseudo-v1';
  return require('crypto').createHash('sha256').update(salt + '|' + String(str), 'utf8').digest('hex').slice(0, 24);
}

// Empreinte cryptographique (intégrité du document signé — preuve eIDAS)
function sha256(str) {
  return require('crypto').createHash('sha256').update(String(str), 'utf8').digest('hex');
}

// ── Double-write append-only vers Supabase (best-effort) : un DOUBLE infalsifiable du journal de preuve.
// Reste TOTALEMENT INERTE tant que SUPABASE_URL + SUPABASE_SERVICE_KEY ne sont pas posés en env (aucun impact).
// N'utilise QUE fetch (zéro dépendance npm), timeboxé, et ne casse JAMAIS la signature (try/catch). Blobs reste
// le stockage principal ; ceci est la copie immuable (table en INSERT seul, UPDATE/DELETE révoqués côté Supabase).
async function logSignatureEvent(row) {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !key) return; // non configuré → on ignore silencieusement
  try {
    await fetch(url + '/rest/v1/signature_events', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) { console.error('submit-mandat: Supabase log KO (non bloquant):', e.message); }
}

function generateCertId(phone, ref, ts) {
  const date = (ts || new Date().toISOString()).substring(0, 10).replace(/-/g, '');
  const shortPhone = (phone || '').replace(/\D/g, '').slice(-4) || 'XXXX';
  const shortRef = (ref || '').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'AAAAAA';
  return `RDA-${date}-${shortPhone}-${shortRef}`;
}

function airtableCfg() {
  const key = (process.env.AIRTABLE_API_KEY || '').trim();
  const base = (process.env.AIRTABLE_BASE_ID || 'appv72lKbQtjt7EIP').trim();
  const table = (process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O').trim();
  if (!key || !base || !table) return null;
  return {
    key,
    base,
    table,
    fRef: (process.env.AIRTABLE_F_REF_DOSSIER || 'flduSWqrqxeNoQkKW').trim(),
    fWa: (process.env.AIRTABLE_F_WHATSAPP || 'fldsFH0PoWe3AV0sI').trim(),
    fRemarques: (process.env.AIRTABLE_F_REMARQUES || 'fldqks5asIPXar8BD').trim(),
    fStatutSuivi: (process.env.AIRTABLE_F_STATUT_SUIVI || 'fldUnBUQFKeoKf8LL').trim(),
    fCompagnie: (process.env.AIRTABLE_F_COMPAGNIE || 'fld8Ku1jGMOPWnrQc').trim(),
    fVol: (process.env.AIRTABLE_F_NUMERO_VOL || 'fldcVnS4B86eZntjr').trim(),
    fDateVol: (process.env.AIRTABLE_F_DATE_VOL || 'flduDNEC3osPnTMAv').trim(),
    fPnr: (process.env.AIRTABLE_F_PNR || 'fld7scWE20q3DRPUa').trim(),
    // Champ optionnel : n° billet electronique (13 chiffres, ex 057-1234567890). Facultatif — le mapping
    // n'est fait que si l'env var AIRTABLE_F_NUMERO_BILLET est fournie (permet de creer le champ dans
    // Airtable puis d'activer le mapping en une seule variable, sans redeploiement de code).
    fBillet: (process.env.AIRTABLE_F_NUMERO_BILLET || '').trim(),
    fIncident: (process.env.AIRTABLE_F_TYPE_INCIDENT || 'fldci5VnHb0HpOoKL').trim(),
    fItineraire: (process.env.AIRTABLE_F_ITINERAIRE || 'fldtCISegQZ58Yvrl').trim(),
    fMandatPdf: (process.env.AIRTABLE_F_MANDAT_PDF || 'fldynALd43y4YYcxz').trim(), // champ pièce jointe « Mandat de Représentation signé »
    fPiecePasseport: (process.env.AIRTABLE_F_PIECE_PASSEPORT || 'fldCTsCendE7smLCG').trim(), // « Copie Passeport / CI »
    fPieceCarte: (process.env.AIRTABLE_F_PIECE_CARTE || 'flddIxlejoKprr2Ok').trim(), // « Carte d'embarquement »
    statutSuiviSigne: (process.env.AIRTABLE_STATUT_SUIVI_MANDAT_SIGNE || 'Contrat signé').trim(),
    // Statut posé AU CLIC (avant la vraie signature Yousign) : le client va signer, il n'a pas encore signé.
    statutSignatureAttente: (process.env.AIRTABLE_STATUT_SIGNATURE_ATTENTE || 'Signature en attente').trim(),
  };
}

function atHeaders(key) {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function escapeFormulaValue(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function airtableFindByRef(cfg, ref) {
  const formula = `{${cfg.fRef}}='${escapeFormulaValue(ref)}'`;
  const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20`;
  const r = await fetch(url, { headers: atHeaders(cfg.key) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Airtable find ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  return data.records || [];
}

function flightDateForAirtable(isoOrDash) {
  const s = (isoOrDash || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

async function patchAirtableSigned(record) {
  const cfg = airtableCfg();
  if (!cfg) {
    console.warn('submit-mandat: Airtable non configuré (AIRTABLE_API_KEY)');
    return { skipped: true };
  }
  const ref = (record.ref || '').trim();
  if (!ref) return { skipped: true, reason: 'no ref' };

  let recs = await airtableFindByRef(cfg, ref);
  const phone = (record.whatsapp || '').trim();
  if (!recs.length && phone && cfg.fWa) {
    const formula = `{${cfg.fWa}}='${escapeFormulaValue(phone)}'`;
    const url = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=5`;
    const r = await fetch(url, { headers: atHeaders(cfg.key) });
    if (r.ok) {
      const data = await r.json();
      recs = data.records || [];
    }
  }
  const signedNote = `Contrat soumis pour signature le ${record.signed_at || new Date().toISOString()} (cert ${record.cert_id || '—'})`;
  const addr = (record.address || '').trim();
  const itin = [record.depAirport, record.arrAirport].filter(Boolean).join(' → ');
  const incidentLabel = INCIDENT_AT[record.incident] || record.incident || '';
  const remarquesExtra = [
    signedNote,
    record.contactPhone ? `📞 RAPPEL: ${record.contactPhone}` : '',
    record.contactEmail ? `✉️ Email perso: ${record.contactEmail}` : '',
    addr ? `Adresse: ${addr}` : '',
    record.email ? `Email: ${record.email}` : '',
    (record.passengerNames && record.passengerNames.length) ? `Passagers: ${record.passengerNames.join(', ')}` : '',
    record.operatedBy ? `Opéré par: ${record.operatedBy}` : '',
    record.connecting ? `Correspondance: ${record.connecting}` : '',
  ].filter(Boolean).join(' | ');

  const common = {};
  // Au CLIC, le client n'a PAS encore signé sur Yousign → « Signature en attente ». Le passage à
  // « Contrat signé » se fera à la VRAIE signature (webhook Yousign), pas ici (fin de la fausse « signé »).
  if (cfg.fStatutSuivi && cfg.statutSignatureAttente) common[cfg.fStatutSuivi] = cfg.statutSignatureAttente;
  if (cfg.fCompagnie && record.airline) common[cfg.fCompagnie] = record.airline;
  if (cfg.fVol && record.flightNum) common[cfg.fVol] = record.flightNum;
  const fd = flightDateForAirtable(record.flightDate);
  if (cfg.fDateVol && fd) common[cfg.fDateVol] = fd;
  if (cfg.fPnr && record.pnr) common[cfg.fPnr] = String(record.pnr).trim().toUpperCase();
  if (cfg.fBillet && record.billet) common[cfg.fBillet] = String(record.billet).trim();
  if (cfg.fIncident && incidentLabel) common[cfg.fIncident] = incidentLabel;
  if (cfg.fItineraire && itin) common[cfg.fItineraire] = itin;
  if (cfg.fWa && phone) common[cfg.fWa] = phone;

  const apiUrl = `https://api.airtable.com/v0/${cfg.base}/${cfg.table}`;

  // ── Upsert : si aucune fiche (réf ni téléphone), on la CRÉE ──────────────
  if (!recs.length) {
    const createFields = { ...common };
    if (cfg.fRef) createFields[cfg.fRef] = ref;
    if (cfg.fRemarques) createFields[cfg.fRemarques] = remarquesExtra;
    const cr = await fetch(apiUrl, {
      method: 'POST',
      headers: atHeaders(cfg.key),
      body: JSON.stringify({ records: [{ fields: createFields }], typecast: true }),
    });
    if (!cr.ok) {
      const t = await cr.text();
      throw new Error(`Airtable create ${cr.status}: ${t.slice(0, 300)}`);
    }
    console.log(`submit-mandat: Airtable CREATE fiche ref=${ref}`);
    return { created: 1, updated: 0 };
  }

  // ── Sinon : mise à jour de la/les fiche(s) existante(s) ──────────────────
  const updates = recs.map((rec) => {
    const f = { ...common };
    if (cfg.fRemarques) {
      const prev = (rec.fields && rec.fields[cfg.fRemarques]) || '';
      f[cfg.fRemarques] = prev ? `${prev} | ${remarquesExtra}` : remarquesExtra;
    }
    return { id: rec.id, fields: f };
  });
  const pr = await fetch(apiUrl, {
    method: 'PATCH',
    headers: atHeaders(cfg.key),
    body: JSON.stringify({ records: updates }),
  });
  if (!pr.ok) {
    const t = await pr.text();
    throw new Error(`Airtable patch ${pr.status}: ${t.slice(0, 300)}`);
  }
  console.log(`submit-mandat: Airtable PATCH ${updates.length} ligne(s) ref=${ref}`);
  return { updated: updates.length };
}

// Attache le PDF signé BILINGUE à la fiche Airtable (champ « Mandat de Représentation signé »).
// Étape SÉPARÉE, lancée APRÈS l'archivage du PDF (sinon Airtable irait chercher un PDF absent → 404).
// URL publique-par-réf (/api/mandat-pdf, pas de secret) → Airtable la récupère et stocke sa propre copie.
async function attachMandatToAirtable(record) {
  const cfg = airtableCfg();
  if (!cfg || !cfg.fMandatPdf) return { skipped: true };
  const ref = (record.ref || '').trim();
  if (!ref) return { skipped: true, reason: 'no ref' };
  const recs = await airtableFindByRef(cfg, ref);
  if (!recs.length) return { skipped: true, reason: 'fiche introuvable' };
  const url = `https://robindesairs.eu/api/mandat-pdf?r=${encodeURIComponent(ref)}&bilingue=1`;
  // Nom propre « côté compagnie » : Contrat-Cession-NOM-Prénom-VOL-CODE.pdf (sinon repli sur la réf).
  const filename = (nomFichierCompagnie
    ? nomFichierCompagnie({ nom: record.lastName, prenom: record.firstName, vol: record.flightNum, ref }, 'mandat')
    : `Contrat-Cession-Robin-des-Airs-${ref.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`);
  const updates = recs.map((rec) => ({ id: rec.id, fields: { [cfg.fMandatPdf]: [{ url, filename }] } }));
  const pr = await fetch(`https://api.airtable.com/v0/${cfg.base}/${cfg.table}`, {
    method: 'PATCH', headers: atHeaders(cfg.key), body: JSON.stringify({ records: updates }),
  });
  if (!pr.ok) throw new Error(`Airtable attach mandat ${pr.status}: ${(await pr.text()).slice(0, 200)}`);
  console.log(`submit-mandat: mandat bilingue attaché à Airtable (${updates.length} fiche·s) ref=${ref}`);
  return { attached: updates.length };
}

// Téléverse les pièces (passeport/CNI, carte d'embarquement) du dossier vers les champs Airtable dédiés,
// en BASE64 via l'API « uploadAttachment » d'Airtable — les octets vont directement de Blobs à Airtable,
// AUCUNE URL ni secret exposé. Mappe par type. Best-effort, plafonné en taille et en nombre.
async function attachPiecesToAirtable(record, event) {
  const cfg = airtableCfg();
  if (!cfg || !netlifyBlobsModule || (!cfg.fPiecePasseport && !cfg.fPieceCarte)) return { skipped: true };
  const ref = (record.ref || '').trim();
  if (!ref) return { skipped: true, reason: 'no ref' };
  const recs = await airtableFindByRef(cfg, ref);
  if (!recs.length) return { skipped: true, reason: 'fiche introuvable' };

  const blobs = netlifyBlobsModule;
  if (blobs.connectLambda && event) blobs.connectLambda(event);
  const store = blobs.getStore('pieces');
  if (!store) return { skipped: true, reason: 'store pieces indisponible' };

  // Clés des pièces : dépôt web (p/<ref>/…) + bot WhatsApp (wa/<tel>/…)
  const phoneDigits = String(record.whatsapp || '').replace(/\D/g, '');
  const keys = [];
  try { const w = await store.list({ prefix: `p/${ref}/` }); for (const b of (w.blobs || [])) keys.push(b.key); } catch (_) {}
  if (phoneDigits) { try { const a = await store.list({ prefix: `wa/${phoneDigits}/` }); for (const b of (a.blobs || [])) keys.push(b.key); } catch (_) {} }
  if (!keys.length) return { skipped: true, reason: 'aucune pièce' };

  // Type de pièce → champ Airtable. Certificat / frais : pas de champ dédié → ignorés (restent dans Blobs).
  const fieldFor = (kind) => {
    const k = String(kind || '').toLowerCase();
    if (/identite|passeport|cni|passport|sejour/.test(k)) return cfg.fPiecePasseport;
    if (/carte|boarding|ebillet|ebooking|billet|voyage/.test(k)) return cfg.fPieceCarte;
    return null;
  };
  const code = (codeFromRef ? codeFromRef(ref) : ref.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase());
  // CRM = 1 ligne par passager → on attache chaque pièce à TOUTES les fiches du dossier (même réf),
  // pour que l'e-billet (partagé) apparaisse sur chaque passager. Séquentiel + plafond (limite débit Airtable).
  let uploaded = 0, nId = 0, nCarte = 0;
  const MAX_UPLOADS = 12;
  for (const key of keys.slice(0, 12)) {
    if (uploaded >= MAX_UPLOADS) break;
    try {
      const res = await store.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!res || !res.data) continue;
      const meta = res.metadata || {};
      const kind = meta.kind || (key.split('/').pop() || '').replace(/^\d+_/, '').replace(/\.[a-z0-9]+$/i, '');
      const field = fieldFor(kind);
      if (!field) continue;
      const buf = Buffer.from(res.data);
      if (!buf.length || buf.length > 3500000) continue; // garde-fou : limite upload Airtable (~5 Mo requête)
      // Nom propre (pas l'horodatage) — par type + code dossier + index. Pas de nom de passager (la pièce
      // peut être celle d'un co-passager : on ne risque pas de la mal étiqueter).
      const ext = ((key.split('.').pop() || (meta.mime || '').split('/')[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg').slice(0, 4);
      const filename = field === cfg.fPiecePasseport
        ? `Piece-identite-${code}-${++nId}.${ext}`
        : `Carte-embarquement-${code}-${++nCarte}.${ext}`;
      const body = JSON.stringify({ contentType: meta.mime || 'application/octet-stream', file: buf.toString('base64'), filename });
      for (const rec of recs) {
        if (uploaded >= MAX_UPLOADS) break;
        const up = await fetch(`https://content.airtable.com/v0/${cfg.base}/${rec.id}/${field}/uploadAttachment`, {
          method: 'POST', headers: atHeaders(cfg.key), body,
        });
        if (up.ok) uploaded++;
        else console.error(`submit-mandat: upload pièce ${key} → ${rec.id} Airtable ${up.status}`);
      }
    } catch (e) { console.error('submit-mandat: pièce → Airtable', key, e.message); }
  }
  console.log(`submit-mandat: ${uploaded} upload·s pièce·s (${recs.length} fiche·s du dossier) ref=${ref}`);
  return { uploaded, records: recs.length };
}

function signatureBase64(record) {
  const raw = record.signatureImg || '';
  const m = String(raw).match(/^data:image\/\w+;base64,(.+)$/);
  return m ? m[1] : (raw.startsWith('iVBOR') || /^[A-Za-z0-9+/=]+$/.test(raw.slice(0, 80)) ? raw : '');
}

function escapeHtml(s) {
  return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clientDisplayName(record) {
  const first = (record.firstName || '').trim();
  return first || [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Madame, Monsieur';
}

function isValidClientEmail(email) {
  const e = (email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function buildTeamMandatEmailContent(record) {
  const name = [record.firstName, record.lastName].filter(Boolean).join(' ') || '—';
  const itin = [record.depAirport, record.arrAirport].filter(Boolean).join(' → ') || '—';
  const incident = INCIDENT_AT[record.incident] || record.incident || '—';
  const pax = (record.passengerNames && record.passengerNames.length)
    ? record.passengerNames.join(', ')
    : (record.pax > 1 ? `${record.pax} passager(s)` : name);
  const lines = [
    ['Référence dossier', record.ref || '—'],
    ['Certificat', record.cert_id || '—'],
    ['Signé le', record.signed_at || '—'],
    ['Passager', name],
    ['WhatsApp', record.whatsapp || '—'],
    ['📞 Numéro de rappel', record.contactPhone || record.whatsapp || '—'],
    ['Email perso', record.contactEmail || '—'],
    ['Email client', record.email || '—'],
    ['Adresse', record.address || '—'],
    ['Vol', record.flightNum || '—'],
    ['Date vol', record.flightDate || '—'],
    ['Compagnie (billet)', record.airline || '—'],
    ['Opéré par (réel)', record.operatedBy || '—'],
    ['PNR', record.pnr || '—'],
    ['Itinéraire', itin],
    ['Correspondance(s)', record.connecting || '—'],
    ['Incident', incident],
    ['Passagers', pax],
    ['Cession de créance', record.cessionCreance === false ? 'Non' : 'Oui (Art. 5 bis — née ou à naître)'],
    ['Acceptation mandataire', `${record.mandataireName || 'Robin des Airs'} — ${record.mandataireAcceptedAt || record.signed_at || '—'}`],
    ['Source', record.source || 'mandat.html'],
  ];
  const text = lines.map(([k, v]) => `${k} : ${v}`).join('\n');
  const htmlRows = lines.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top">${k}</td><td style="padding:6px 0;font-size:13px"><strong>${escapeHtml(v)}</strong></td></tr>`
  ).join('');
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px">
<p style="margin:0 0 16px">Un contrat de cession de créance vient d’être <strong>soumis pour signature</strong> sur robindesairs.eu (signature Yousign en cours).</p>
<table style="border-collapse:collapse">${htmlRows}</table>
<p style="margin:20px 0 0;font-size:12px;color:#888">Robin des Airs — notification automatique</p>
</body></html>`;
  return { subject: `Contrat soumis (signature en cours) — ${record.ref || record.cert_id || 'dossier'} — ${name}`, text, html };
}

function buildClientMandatEmailContent(record) {
  const hello = clientDisplayName(record);
  const ref = record.ref || '—';
  const vol = record.flightNum || '—';
  const date = record.flightDate || '—';
  const cie = record.airline || '—';
  const pnr = record.pnr || '—';
  const signed = record.signed_at
    ? new Date(record.signed_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })
    : '—';

  const text = [
    `Bonjour ${hello},`,
    '',
    'Nous avons bien enregistré la signature de votre contrat de cession de créance Robin des Airs.',
    '',
    `Référence dossier : ${ref}`,
    `Vol : ${vol} — ${date}`,
    `Compagnie : ${cie}`,
    pnr !== '—' ? `PNR : ${pnr}` : '',
    `Signé le : ${signed}`,
    '',
    'Et maintenant, comment ça se passe :',
    '1. Sous 24 h, un expert vérifie votre dossier et vous rappelle depuis le +33 7 56 86 36 30 (enregistrez ce numéro sous « Robin des Airs »).',
    // L.221-25 C. conso : sans demande EXPRESSE de démarrage immédiat (case startNow), aucune
    // démarche active pendant le délai de rétractation de 14 jours ; la promesse doit suivre.
    record.startNow
      ? '2. On écrit à la compagnie en votre nom : mise en demeure sous 48 h (démarrage immédiat demandé).'
      : '2. On écrit à la compagnie en votre nom : mise en demeure après votre délai de rétractation de 14 jours (répondez-nous pour démarrer avant).',
    '3. On recouvre votre argent : on négocie, on relance, et si la compagnie refuse on va jusqu\'au tribunal (avocat et huissier à notre charge).',
    '4. Vous êtes payé : dès l\'argent récupéré, on vous verse votre part (75 %, ou 60 % si tribunal). 0 € si rien n\'est récupéré, vous n\'avancez jamais un centime.',
    '',
    'Combien de temps ? La plupart des dossiers se règlent à l\'amiable, en quelques semaines à quelques mois. Si la compagnie refuse et qu\'il faut passer par le tribunal, comptez 12 à 24 mois. Dans tous les cas, vous n\'avez rien à faire ni à avancer, et on vous tient informé à chaque étape.',
    '',
    'Suivi de votre dossier : https://robindesairs.eu/suivi-dossier.html',
    '',
    'Droit de rétractation : 14 jours — contact@robindesairs.eu (objet : Je me rétracte — Réf. ' + ref + ')',
    '',
    'Questions : expert@robindesairs.eu — WhatsApp +33 7 56 86 36 30',
    'https://wa.me/33756863630',
    '',
    'Robin des Airs — Votre droit, notre mission.',
  ].filter(Boolean).join('\n');

  const pdfUrl = `https://robindesairs.eu/api/mandat-pdf?r=${encodeURIComponent(ref)}`;
  const etape2 = record.startNow
    ? 'Mise en demeure à la compagnie sous 48 h (démarrage immédiat demandé).'
    : 'Mise en demeure à la compagnie après votre délai de rétractation de 14 jours (répondez-nous pour démarrer avant).';
  // ── Email de confirmation PREMIUM (tables + styles inline = compatible tous clients mail) ──
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#eef1f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B1F3A">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">C'est signé — on s'occupe de tout pour récupérer votre indemnité, vous n'avancez rien.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(11,31,58,.12)">
  <tr><td style="background:#0B1F3A;padding:20px 28px" align="left"><span style="font-size:17px;font-weight:800;letter-spacing:.3px;color:#ffffff">Robin <span style="color:#00C87A">des Airs</span> 🏹</span></td></tr>
  <tr><td align="center" style="padding:32px 28px 8px">
    <div style="width:64px;height:64px;line-height:64px;border-radius:50%;background:#EFF9F4;border:2px solid #00C87A;color:#047857;font-size:34px;font-weight:800;margin:0 auto 14px">&#10003;</div>
    <div style="font-size:22px;font-weight:800;color:#0B1F3A;margin:0 0 6px">C'est signé, merci de votre confiance&nbsp;!</div>
    <div style="font-size:14.5px;color:#51607A;line-height:1.55;max-width:430px;margin:0 auto">Bonjour <strong>${escapeHtml(hello)}</strong>, votre <strong>contrat de cession de créance</strong> est bien enregistré. On s'occupe de tout pour récupérer votre argent&nbsp;— <strong>vous n'avancez rien</strong>.</div>
  </td></tr>
  <tr><td style="padding:18px 28px 6px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;border:1px solid #e2e6ee;border-radius:12px">
      <tr><td style="padding:11px 16px;color:#8a94a6;font-size:12px;width:42%">Référence</td><td style="padding:11px 16px;font-size:13.5px;font-weight:700;color:#0B1F3A">${escapeHtml(ref)}</td></tr>
      <tr><td style="padding:11px 16px;color:#8a94a6;font-size:12px;border-top:1px solid #e9edf2">Vol</td><td style="padding:11px 16px;font-size:13.5px;color:#0B1F3A;border-top:1px solid #e9edf2"><strong>${escapeHtml(vol)}</strong> — ${escapeHtml(date)}</td></tr>
      ${cie !== '—' ? `<tr><td style="padding:11px 16px;color:#8a94a6;font-size:12px;border-top:1px solid #e9edf2">Compagnie</td><td style="padding:11px 16px;font-size:13.5px;color:#0B1F3A;border-top:1px solid #e9edf2">${escapeHtml(cie)}</td></tr>` : ''}
      ${pnr !== '—' ? `<tr><td style="padding:11px 16px;color:#8a94a6;font-size:12px;border-top:1px solid #e9edf2">Réservation</td><td style="padding:11px 16px;font-size:13.5px;color:#0B1F3A;border-top:1px solid #e9edf2">${escapeHtml(pnr)}</td></tr>` : ''}
      <tr><td style="padding:11px 16px;color:#8a94a6;font-size:12px;border-top:1px solid #e9edf2">Signé le</td><td style="padding:11px 16px;font-size:13.5px;color:#0B1F3A;border-top:1px solid #e9edf2">${escapeHtml(signed)}</td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:16px 28px 4px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#00C87A"><a href="${pdfUrl}" style="display:inline-block;padding:12px 22px;font-size:14.5px;font-weight:800;color:#06351f;text-decoration:none">📄 Mon contrat signé (PDF)</a></td></tr></table>
    <div style="margin:10px 0 0"><a href="https://robindesairs.eu/suivi-dossier.html" style="font-size:13px;font-weight:700;color:#047857;text-decoration:none">📲 Suivre mon dossier →</a></div>
  </td></tr>
  <tr><td style="padding:20px 28px 4px">
    <div style="font-size:15px;font-weight:800;color:#0B1F3A;margin:0 0 14px">Et maintenant, comment ça se passe&nbsp;?</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="34" valign="top" style="padding:0 0 14px"><div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0B1F3A;color:#ffffff;font-size:13px;font-weight:800">1</div></td>
        <td valign="top" style="padding:2px 0 14px 4px"><div style="font-size:13.5px;font-weight:700;color:#0B1F3A">Sous 24 h, un expert vérifie votre dossier</div><div style="font-size:12.5px;color:#5b6b82;line-height:1.5">Il vous rappelle depuis le <strong>+33&nbsp;7&nbsp;56&nbsp;86&nbsp;36&nbsp;30</strong> (enregistrez ce numéro sous «&nbsp;Robin des Airs&nbsp;»).</div></td>
      </tr>
      <tr>
        <td width="34" valign="top" style="padding:0 0 14px"><div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0B1F3A;color:#ffffff;font-size:13px;font-weight:800">2</div></td>
        <td valign="top" style="padding:2px 0 14px 4px"><div style="font-size:13.5px;font-weight:700;color:#0B1F3A">On écrit à la compagnie, en votre nom</div><div style="font-size:12.5px;color:#5b6b82;line-height:1.5">${escapeHtml(etape2)}</div></td>
      </tr>
      <tr>
        <td width="34" valign="top" style="padding:0 0 14px"><div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0B1F3A;color:#ffffff;font-size:13px;font-weight:800">3</div></td>
        <td valign="top" style="padding:2px 0 14px 4px"><div style="font-size:13.5px;font-weight:700;color:#0B1F3A">On recouvre votre argent</div><div style="font-size:12.5px;color:#5b6b82;line-height:1.5">On négocie et on relance. Si la compagnie refuse, on va jusqu'au tribunal (avocat et huissier <strong>à notre charge</strong>).</div></td>
      </tr>
      <tr>
        <td width="34" valign="top"><div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#00C87A;color:#06351f;font-size:13px;font-weight:800">4</div></td>
        <td valign="top" style="padding:2px 0 0 4px"><div style="font-size:13.5px;font-weight:700;color:#0B1F3A">Vous êtes payé</div><div style="font-size:12.5px;color:#5b6b82;line-height:1.5">Dès l'argent récupéré, on vous verse <strong>votre part (75&nbsp;%, ou 60&nbsp;% si tribunal)</strong>. <strong>0&nbsp;€ si rien n'est récupéré</strong>, vous n'avancez jamais un centime.</div></td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:10px 28px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;border:1px solid #e2e6ee;border-radius:12px"><tr><td style="padding:13px 16px">
      <div style="font-size:13.5px;font-weight:800;color:#0B1F3A;margin:0 0 4px">⏱️ Combien de temps&nbsp;?</div>
      <div style="font-size:12.5px;color:#3a4658;line-height:1.55">La plupart des dossiers se règlent <strong>à l'amiable, en quelques semaines à quelques mois</strong>. Si la compagnie refuse et qu'il faut passer par le tribunal, comptez <strong>12 à 24 mois</strong>. Dans tous les cas, <strong>vous n'avez rien à faire ni à avancer</strong>, et on vous tient informé à chaque étape.</div>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:18px 28px 6px">
    <div style="font-size:12px;color:#8a94a6;line-height:1.6">Rétractation possible sous 14 jours&nbsp;: <a href="mailto:contact@robindesairs.eu?subject=${encodeURIComponent('Rétractation — Réf. ' + ref)}" style="color:#047857">contact@robindesairs.eu</a><br>Une question&nbsp;? <a href="mailto:expert@robindesairs.eu" style="color:#047857">expert@robindesairs.eu</a> · <a href="https://wa.me/33756863630" style="color:#047857">WhatsApp</a></div>
  </td></tr>
  <tr><td style="background:#0B1F3A;padding:16px 28px" align="center"><div style="font-size:12px;color:#9fb0c4">Robin <span style="color:#00C87A">des Airs</span> 🏹 — On prend aux compagnies, on rend aux familles.</div></td></tr>
</table>
</td></tr></table>
</body></html>`;

  return {
    subject: `✅ C'est signé, merci ${hello} — votre dossier ${ref}`,
    text,
    html,
  };
}

async function sendResendEmail(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('submit-mandat: Resend', r.status, JSON.stringify(data).slice(0, 300));
    return { ok: false, error: data.message || String(r.status) };
  }
  return { ok: true, id: data.id };
}

/** Emails équipe + client (si email valide). Resend : RESEND_API_KEY, MANDAT_NOTIFY_EMAIL, MANDAT_EMAIL_FROM */
async function notifyMandatSignedByEmail(record, pdfBuffer, pdfBilingueBuffer) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { skipped: true, reason: 'no RESEND_API_KEY' };
  }
  const from = (process.env.MANDAT_EMAIL_FROM || 'Robin des Airs <notifications@robindesairs.eu>').trim();
  const result = { team: null, client: null };

  const toTeamRaw = (process.env.MANDAT_NOTIFY_EMAIL || 'expert@robindesairs.eu').trim();
  if (toTeamRaw) {
    const teamContent = buildTeamMandatEmailContent(record);
    const teamPayload = {
      from,
      to: toTeamRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      subject: teamContent.subject,
      text: teamContent.text,
      html: teamContent.html,
    };
    const teamAttachments = [];
    const sigB64 = signatureBase64(record);
    if (sigB64) {
      teamAttachments.push({
        filename: `signature-${(record.ref || 'mandat').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`,
        content: sigB64,
      });
    }
    if (pdfBilingueBuffer) {
      teamAttachments.push({
        filename: `Contrat-Cession-bilingue-FR-EN-${(record.ref || 'mandat').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        content: pdfBilingueBuffer.toString('base64'),
      });
    }
    if (teamAttachments.length) teamPayload.attachments = teamAttachments;
    result.team = await sendResendEmail(apiKey, teamPayload);
  } else {
    result.team = { skipped: true, reason: 'no MANDAT_NOTIFY_EMAIL' };
  }

  // Email perso du client en PRIORITÉ (saisi sur le mandat) → le vrai passager reçoit la confirmation,
  // même si le WhatsApp n'est pas le sien. À défaut, on retombe sur l'adresse technique (comportement antérieur).
  const clientEmail = (record.contactEmail || '').trim() || (record.email || '').trim();
  if (isValidClientEmail(clientEmail)) {
    const replyTo = (process.env.MANDAT_EMAIL_REPLY_TO || 'expert@robindesairs.eu').trim();
    const clientContent = buildClientMandatEmailContent(record);
    const clientPayload = {
      from,
      to: [clientEmail],
      subject: clientContent.subject,
      text: clientContent.text,
      html: clientContent.html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };
    if (pdfBuffer) {
      const suffixe = (record.ref || '').replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase();
      const filename = suffixe ? `Contrat-Cession-Robin-des-Airs-${suffixe}.pdf` : 'Contrat-Cession-Robin-des-Airs.pdf';
      clientPayload.attachments = [{ filename, content: pdfBuffer.toString('base64') }];
    }
    result.client = await sendResendEmail(apiKey, clientPayload);
  } else {
    result.client = { skipped: true, reason: clientEmail ? 'invalid email' : 'no client email' };
  }

  return result;
}

async function forwardBotWebhook(record) {
  // URL par défaut = endpoint du bot Railway (aucune config requise) ; secret = celui de WATI (déjà présent)
  const url = (process.env.MANDAT_SIGNED_WEBHOOK_URL || 'https://robin-bot-v8-production.up.railway.app/api/mandat-signed').trim();
  if (!url) return;
  const secret = (process.env.MANDAT_SIGNED_WEBHOOK_SECRET || process.env.WATI_WEBHOOK_SECRET || '').trim();
  const body = {
    ref: record.ref,
    secret,
    phone: record.whatsapp,
    waId: record.whatsapp,
    cert_id: record.cert_id,
    signed_at: record.signed_at,
    source: record.source || 'mandat.html',
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    flightNum: record.flightNum,
    flightDate: record.flightDate,
    airline: record.airline,
    pnr: record.pnr,
    incident: record.incident,
    has_signature_attachment: !!signatureBase64(record),
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Mandat-Secret': secret } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('submit-mandat: bot webhook', r.status, await r.text().then((t) => t.slice(0, 200)));
  } catch (e) {
    console.error('submit-mandat: bot webhook error:', e.message);
  }
}

/** Envoie la copie PDF du mandat signé au client par WhatsApp (Wati). Best-effort. */
async function sendMandatWhatsappCopy(record, pdfBuffer) {
  if (!pdfBuffer || !watiSendFile || !watiCfg || !watiCfg()) {
    return { skipped: true, reason: !pdfBuffer ? 'pas de PDF' : 'Wati non configuré' };
  }
  const ref = record.ref || record.cert_id || 'dossier';
  const suffixe = String(ref).replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase();
  const fileName = suffixe ? `Contrat-Cession-Robin-des-Airs-${suffixe}.pdf` : 'Contrat-Cession-Robin-des-Airs.pdf';
  // NB : ce message part à la GÉNÉRATION du contrat (avant signature) → il ne demande QUE la signature.
  // Les pièces, les frais (art. 9), le lien sécurisé et « un expert va vous appeler » sont envoyés
  // APRÈS signature par le bot (payout preference + rappel pièces différé) — ne pas les remettre ici (doublon + prématuré).
  const caption = (record.lang === 'en')
    ? `📄 *One last step* — finalise your *signature* on the Yousign screen that just opened (ref. ${ref}). Without it, we can't start your claim.\n\nAttached: your contract to review. 🏹\n\nThe Robin des Airs team`
    : `📄 *Plus qu'une étape* — finalisez votre *signature* sur l'écran Yousign qui vient de s'ouvrir (réf. ${ref}). Sans elle, on ne peut pas lancer votre réclamation.\n\nEn pièce jointe : votre contrat à relire. 🏹\n\nL'équipe Robin des Airs`;
  try {
    return await watiSendFile(record.whatsapp, pdfBuffer, fileName, caption);
  } catch (e) {
    console.error('submit-mandat: WhatsApp copie error:', e.message);
    return { ok: false, error: e.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const rl = await rateLimitCheck(event, { key: 'submit-mandat', max: 5, windowSec: 60 });
  if (!rl.ok) return rl.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Corps JSON invalide' }) };
  }

  const phone = (body.whatsapp || body.phone || '').trim();
  const ref = (body.ref || '').trim();
  if (!phone || !ref) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'ref et whatsapp obligatoires' }),
    };
  }

  // Le vol doit être identifié : un mandat (cession de créance, Art. 5 bis) sans transporteur
  // NI n° de vol rend la créance indéterminable et donc inopposable. Le front valide déjà
  // ces champs ; on double le contrôle côté serveur pour rejeter tout payload incomplet.
  const airlineIn = (body.airline || '').trim();
  const flightNumIn = (body.flightNum || '').trim();
  if (!airlineIn && !flightNumIn) {
    console.warn(`submit-mandat: REFUS signature — vol non identifié (airline+flightNum vides) pour ref=${ref}`);
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Compagnie et n° de vol requis pour identifier la créance.' }),
    };
  }

  // SÉCURITÉ (audit) : on ne signe QUE pour un dossier RÉEL pré-existant (m/<ref> créé par le bot,
  // réf indevinable ~72 bits). Empêche la forge de fausses signatures et l'empoisonnement de
  // /api/is-signed pour des réfs arbitraires/devinées. Même modèle que /api/depot-upload (prod).
  if (netlifyBlobsModule) {
    try {
      if (netlifyBlobsModule.connectLambda && event) netlifyBlobsModule.connectLambda(event);
      const dossierExists = await netlifyBlobsModule.getStore('mandats').get('m/' + ref, { type: 'json' });
      if (!dossierExists) {
        console.warn(`submit-mandat: REFUS signature — dossier inconnu pour ref=${ref} (forge probable)`);
        return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Dossier inconnu ou lien expiré. Contactez-nous : contact@robindesairs.eu' }) };
      }
    } catch (e) {
      // Panne Blobs : on ne bloque pas une VRAIE signature pour une panne d'infra (le stockage
      // de la signature échouerait de toute façon). Loggé pour visibilité.
      console.error('submit-mandat: vérif dossier impossible (Blobs):', e.message);
    }
  }

  const ts = body.signedAt || new Date().toISOString();
  const certId = generateCertId(phone, ref, ts);

  const rawIp = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['client-ip']
    || 'unknown';
  const ipHash = hashString(rawIp + ts.substring(0, 10));

  const record = {
    cert_id: certId,
    ref,
    signed_at: ts,
    ip_hash: ipHash,
    user_agent: (event.headers?.['user-agent'] || '').substring(0, 150),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    whatsapp: phone,
    lang: (body.lang === 'en' ? 'en' : 'fr'), // langue de la page de signature (mandat-en.html → légende WhatsApp EN)
    contactPhone: (body.contactPhone || '').trim(),
    contactEmail: (body.contactEmail || '').trim(),
    email: (body.email || '').trim() || clientEmailForRef(ref),
    address: body.address || '',
    startNow: !!body.startNow,
    eligibilityAcknowledged: body.eligibilityAcknowledged !== false,
    coPassAgreement: !!body.coPassAgreement,
    cessionCreance: body.cessionCreance !== false,
    mandataireAccepted: body.mandataireAccepted !== false,
    mandataireName: body.mandataireName || 'Robin des Airs — Service juridique CE 261/2004',
    mandataireAcceptedAt: body.mandataireAcceptedAt || ts,
    airline: body.airline || '',
    operatedBy: body.operatedBy || '',
    flightNum: body.flightNum || '',
    flightDate: body.flightDate || '',
    pnr: body.pnr || '',
    incident: body.incident || '',
    pax: body.pax || 1,
    passengerNames: body.passengerNames || [],
    passengersData: body.passengersData || [],
    depAirport: body.depAirport || '',
    arrAirport: body.arrAirport || '',
    connecting: body.connecting || '',
    flightMode: body.flightMode || 'direct',
    flightLegs: Array.isArray(body.flightLegs) ? body.flightLegs.map((l) => ({
      flightNum: String((l && l.flightNum) || ''),
      flightDate: String((l && l.flightDate) || ''),
      depAirport: String((l && l.depAirport) || ''),
      arrAirport: String((l && l.arrAirport) || ''),
    })).filter((l) => l.flightNum || l.depAirport || l.arrAirport) : null,
    signCity: body.signCity || '',
    signDate: body.signDate || '',
    signatureImg: body.signatureImg || '',
    source: body.source || 'web',
    // Trail de consentement renforcé : preuve « c'est lui + il a accepté » (liant WhatsApp)
    mandat_version: body.mandatVersion || '',
    link_sent_at: body.linkSentAt || '',
    wati_conversation_id: body.watiConversationId || phone || '',
  };

  // Empreinte SHA-256 du document signé : lie les termes essentiels + la signature.
  // Toute altération ultérieure (montant, vol, identité, signature) change l'empreinte → inaltérable.
  record.doc_hash = sha256([
    record.ref, record.firstName, record.lastName, record.whatsapp, record.address,
    record.airline, record.operatedBy, record.flightNum, record.flightDate, record.pnr,
    record.incident, String(record.pax), record.depAirport, record.arrAirport, record.connecting,
    String(record.cessionCreance), String(record.mandataireAccepted), record.mandat_version,
    // Acquittements scellés dans l'empreinte → l'état coché des cases est prouvable et inaltérable
    String(record.eligibilityAcknowledged), String(record.startNow), String(record.coPassAgreement),
    record.signed_at, record.signatureImg || '', JSON.stringify(record.passengersData || []),
  ].join('|'));

  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const phoneKey = phone.replace(/\D/g, '');
      await store.setJSON(`sig/${phoneKey}/${ref}`, record);
      // Marqueur de signature PAR RÉF (atomique, sans race) : c'est CE que /api/is-signed lit
      // en priorité pour annuler une relance « signez ». Indépendant de l'__index agrégé (qui
      // peut perdre une entrée si deux signatures s'entrecroisent) et de la génération PDF.
      try { await store.setJSON(`signed/${ref}`, { ref, signed_at: ts, cert_id: certId }); } catch (_) {}
      // Marqueur « démarrage immédiat » (art. L.221-25) PAR RÉF, lu à la signature (yousign-webhook)
      // pour afficher dans le CRM « MED pas avant J+14 » quand le Cédant n'a PAS coché l'exécution immédiate.
      try { await store.setJSON(`medgate/${ref}`, { startNow: !!record.startNow, submittedAt: ts }); } catch (_) {}

      let index = [];
      try { index = await store.get('__index', { type: 'json' }) || []; } catch { index = []; }
      index.unshift({
        cert_id: certId,
        ref,
        phone_hash: hashString(phone),
        flightNum: record.flightNum,
        signed_at: ts,
      });
      if (index.length > 500) index = index.slice(0, 500);
      await store.setJSON('__index', index);
    } catch (e) {
      console.error('submit-mandat: Blobs error:', e.message);
    }
  }

  // Noms + DATE DE NAISSANCE de chaque passager du dossier (famille) → journal auto-suffisant.
  var paxNames = ((record.passengersData && record.passengersData.length)
    ? record.passengersData.map(function (p) {
        var nm = [p && p.prenom, p && p.nom].filter(Boolean).join(' ');
        return (p && p.dob) ? (nm + ' (' + p.dob + ')') : nm;
      })
    : (record.passengerNames || [])
  ).filter(Boolean).join(', ');
  // DOUBLE du journal de preuve dans Supabase (append-only), en plus de Blobs. Best-effort : inerte si non configuré.
  await logSignatureEvent({
    ref, cert_id: certId, event: 'signed', signed_at: ts,
    ip_hash: ipHash, user_agent: record.user_agent, doc_hash: record.doc_hash,
    flight_num: record.flightNum || null, pax: record.pax || null,
    passenger_names: paxNames || null,
    address: record.address || null,
    flight_mode: (record.flightMode === 'connecting' ? 'correspondance' : 'direct'),
    consent_docs: body.documentsConsent === true, start_now: !!record.startNow,
    source: record.source || 'web', lang: record.lang,
  });

  // Met à jour le dossier (store 'mandats') avec les données FRAÎCHEMENT saisies par le client
  // (adresse par passager notamment) : le navigateur appelle /api/render-mandat-pdf juste après
  // cette requête, qui recharge mandat.html?r=REF à neuf (Puppeteer) et relit ce dossier — sans
  // cette mise à jour, le PDF signé via Yousign porterait les adresses connues du bot à l'OUVERTURE
  // du dossier (souvent aucune, pour les co-passagers), pas celles tapées à l'instant par le client.
  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const mStore = blobs.getStore('mandats');
      const existing = (await mStore.get('m/' + ref, { type: 'json' })) || {};
      const existingPax = Array.isArray(existing.passengers) ? existing.passengers : [];
      const freshPax = record.passengersData.length ? record.passengersData : existingPax;
      const mergedPassengers = freshPax.map((p, i) => ({
        name: (p && p.name) || (existingPax[i] && existingPax[i].name) || '',
        dob: (p && p.dob) || (existingPax[i] && existingPax[i].dob) || '',
        adresse: (p && p.adresse) || (existingPax[i] && existingPax[i].adresse) || '',
      }));
      await mStore.setJSON('m/' + ref, { ...existing, address: record.address || existing.address || '', passengers: mergedPassengers, _ts: new Date().toISOString() });
    } catch (e) {
      console.error('submit-mandat: mise à jour dossier (adresses passagers) échouée:', e.message);
    }
  }

  let airtableResult = { skipped: true };
  try {
    airtableResult = await patchAirtableSigned(record);
  } catch (e) {
    console.error('submit-mandat: Airtable error:', e.message);
    airtableResult = { error: e.message };
  }

  // Génère la copie PDF du mandat signé (best-effort)
  let pdfBuffer = null;
  if (genererMandatPdf) {
    try { pdfBuffer = await genererMandatPdf(record); }
    catch (e) { console.error('submit-mandat: génération PDF échouée:', e.message); }
  }

  // ── Archive le PDF signé EXACT (byte-identique à la copie reçue par le client) + son SHA-256 ──
  // Stocké en base64 sous pdf/<ref> dans le store des signatures. Récupérable via /api/mandat-pdf?r=REF.
  // Insensible aux futurs changements de template : la copie archivée reste celle envoyée. Best-effort.
  if (pdfBuffer && netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      // Immutabilité (audit sécu) : ne JAMAIS écraser un PDF déjà archivé (preuve eIDAS du 1er signataire).
      const already = await store.getMetadata(`pdf/${ref}`).catch(() => null);
      if (already && already.metadata) {
        console.warn(`submit-mandat: PDF déjà archivé pour ${ref} — pas d'écrasement (immutabilité)`);
      } else {
        const pdfSha = require('crypto').createHash('sha256').update(pdfBuffer).digest('hex');
        await store.set(`pdf/${ref}`, pdfBuffer.toString('base64'), {
          metadata: { ref, cert_id: certId, sha256: pdfSha, signed_at: ts, bytes: pdfBuffer.length },
        });
        console.log(`submit-mandat: PDF archivé pdf/${ref} (${pdfBuffer.length} o · sha ${pdfSha.slice(0, 12)}…)`);
        // Empreinte du contrat signé dans le journal de preuve Supabase (append-only). Best-effort.
        await logSignatureEvent({ ref, cert_id: certId, event: 'document', signed_at: ts, doc_hash: pdfSha, doc_kind: 'contrat-signe-pdf', doc_filename: 'Mandat-Robin-des-Airs-' + ref + '.pdf' });
      }
    } catch (e) { console.error('submit-mandat: archive PDF échouée:', e.message); }
  }
  // Génère le PDF bilingue FR/EN (pour les compagnies étrangères) — joint à la notif équipe
  let pdfBilingueBuffer = null;
  if (genererMandatBilinguePdf) {
    try { pdfBilingueBuffer = await genererMandatBilinguePdf(record); }
    catch (e) { console.error('submit-mandat: génération PDF bilingue échouée:', e.message); }
  }
  // Archive le PDF BILINGUE aussi → récupérable à la demande via /api/mandat-pdf?r=REF&bilingue=1
  // (document à envoyer aux compagnies étrangères). Immutable, best-effort, comme le PDF FR.
  if (pdfBilingueBuffer && netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const already = await store.getMetadata(`pdf-bilingue/${ref}`).catch(() => null);
      if (!(already && already.metadata)) {
        await store.set(`pdf-bilingue/${ref}`, pdfBilingueBuffer.toString('base64'), {
          metadata: { ref, cert_id: certId, signed_at: ts, bytes: pdfBilingueBuffer.length, lang: 'fr-en' },
        });
        console.log(`submit-mandat: PDF bilingue archivé pdf-bilingue/${ref} (${pdfBilingueBuffer.length} o)`);
      }
    } catch (e) { console.error('submit-mandat: archive PDF bilingue échouée:', e.message); }
  }

  // Attache le mandat signé bilingue à la fiche Airtable (CRM) — APRÈS archivage du PDF. Best-effort.
  try { await attachMandatToAirtable(record); }
  catch (e) { console.error('submit-mandat: attache mandat Airtable échouée:', e.message); }
  // Téléverse les pièces (passeport, carte) vers Airtable en base64 (sans secret exposé). Best-effort.
  try { await attachPiecesToAirtable(record, event); }
  catch (e) { console.error('submit-mandat: attache pièces Airtable échouée:', e.message); }

  // Plus d'envoi WhatsApp du contrat à la génération : le client est déjà sur l'écran Yousign (« ça fait trop »).
  // Le PDF reste envoyé par EMAIL ci-dessous (+ Yousign l'envoie), et après signature le bot confirme « C'est signé ».
  const [webhookResult, emailResult] = await Promise.all([
    forwardBotWebhook(record).then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e.message })),
    notifyMandatSignedByEmail(record, pdfBuffer, pdfBilingueBuffer),
  ]);
  const waCopyResult = { skipped: true, reason: 'WhatsApp copie désactivée à la génération' };

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      cert_id: certId,
      ref,
      airtable: airtableResult,
      email: emailResult,
      webhook: webhookResult,
      whatsapp_copy: waCopyResult,
      pdf_generated: !!pdfBuffer,
    }),
  };
};
