/**
 * airline-auto-submit — ROUTAGE par canal du dépôt de réclamation CE 261 chez la compagnie.
 *
 * RÔLE
 *   1) prepareClaimPackage(ref) : assemble un « package » BROUILLON (destinataire, objet, corps,
 *      pièces jointes mandat signé + mise en demeure LRAR) prêt à relire/envoyer par un humain.
 *      Lit le dossier Airtable, récupère/regénère la LRAR (Blobs `robin-claims`), récupère le
 *      mandat signé (Blobs `robin-signatures` clé `pdf/{ref}`), résout le canal via getAirlineClaim.
 *   2) sendClaimEmail(package, { confirm }) : N'ENVOIE l'email qu'avec confirm === 'SEND'.
 *
 * FLAG DE SÉCURITÉ (double verrou — human-in-the-loop)
 *   - Aucun envoi sans `confirm === 'SEND'` EXPLICITE (le défaut est BROUILLON).
 *   - Garde-fou env : si `process.env.AIRLINE_AUTOSEND === '0'`, sendClaimEmail refuse TOUJOURS
 *     (kill-switch ops). Toute autre valeur (ou absente) autorise — mais seulement avec confirm:'SEND'.
 *   - Seul le canal 'email' part. Les canaux 'form*' renvoient readyToSend=false (dépôt manuel,
 *     JAMAIS de scraping de formulaire — Akamai/CAPTCHA). On prépare quand même objet+corps+PJ
 *     pour le copier-coller humain.
 *   - Idempotence : si `sent/{ref}.json` existe déjà dans `robin-claims`, on REFUSE (anti double-envoi),
 *     sauf opts.force === true.
 */

const { airtableCfg, airtableFindByRef, recordFromAirtableFields, airtablePatch } = require('./airtable-robin');
const { getAirlineClaim, airlineIataFromFlight } = require('./airlines-claims');
const { africanDepartureFromRoute } = require('./airport-coords');
const { genererClaimPdf } = require('./claim-pdf');
const { nomFichierCompagnie } = require('./doc-filename');
const { getBlobStore } = require('./netlify-blobs-store');

let loadEnqueteCache = null;
try { ({ loadCache: loadEnqueteCache } = require('./radar-enquete')); } catch (_) {}
let notifyOwner = null;
try { ({ notifyOwner } = require('./owner-notify')); } catch (_) {}

const CLAIMS_STORE = 'robin-claims';      // LRAR générées + preuves d'envoi
const SIGNATURES_STORE = 'robin-signatures'; // mandat signé archivé (pdf/{ref})

function safeRef(ref) {
  return String(ref || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function frToYmd(d) {
  const m = String(d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d).slice(0, 10) : '';
}

function sha256(buf) {
  return require('crypto').createHash('sha256').update(buf).digest('hex');
}

/** Construit l'objet « claim » (mêmes règles que generate-claim.js) à partir du dossier. */
function buildClaim(ref, data, airline, art9Note) {
  const montant = parseInt(String(data.indemnite || '').replace(/[^\d]/g, ''), 10) || 600;
  return {
    ref,
    passengerName: data.name || '—',
    address: data.address || '',
    airlineName: (airline && airline.nom) || data.compagnie || 'la compagnie aérienne',
    adresseAR: (airline && airline.adresseAR) || '',
    neb: (airline && airline.neb && airline.neb.nom) || '',
    vol: data.vol || '',
    dateVol: data.date || '',
    pnr: data.pnr || '',
    route: data.route || '',
    incident: data.motif || '',
    montant,
    exigerCash: !!(airline && airline.exigerCash),
    conversion: (airline && airline.conversion) || 'inconnue',
    art9Note: art9Note || '',
    delaiJours: 14,
  };
}

/** Objet email selon la convention « Indemnisation EU261 — [PNR] — [NOM] [Prénom] — Vol [N°] ». */
function buildSubject(data) {
  const pnr = (data.pnr || '—').trim();
  const nom = (data.nom || '').trim().toUpperCase();
  const prenom = (data.prenom || '').trim();
  const who = [nom, prenom].filter(Boolean).join(' ') || (data.name || '—');
  const vol = (data.vol || '—').trim();
  return `Indemnisation EU261 — ${pnr} — ${who} — Vol ${vol}`;
}

/** Corps de la salve initiale (jour-00) — déterministe, AUCUN texte généré par IA. */
function buildBodyText(data, claim, airline) {
  const who = data.name || [data.prenom, data.nom].filter(Boolean).join(' ') || 'le passager';
  const incident = String(claim.incident || '').toLowerCase();
  let evenement = 'un retard de plus de 3 heures';
  if (incident.includes('annul')) evenement = "une annulation";
  else if (incident.includes('refus') || incident.includes('surbook') || incident.includes('embarq')) evenement = "un refus d'embarquement";

  const cieNom = (airline && airline.nom) || data.compagnie || 'votre compagnie';
  const cash = claim.exigerCash
    ? "\nConformément à l'arrêt de la CJUE (C-601/17), nous exigeons un paiement en NUMÉRAIRE. Tout « voucher » ou avoir sera systématiquement refusé."
    : '';

  return [
    'Madame, Monsieur,',
    '',
    `Je vous informe par la présente avoir été mandaté par ${who} pour gérer sa demande d'indemnisation`,
    `relative au vol ${claim.vol || '—'} du ${claim.dateVol || '—'} (réf. réservation : ${claim.pnr || '—'}), exploité par ${cieNom},`,
    `suite à ${evenement}.`,
    '',
    `Au titre du Règlement (CE) n° 261/2004, nous réclamons une indemnisation forfaitaire de ${claim.montant} € pour ce passager.`,
    '',
    "Veuillez trouver ci-joint le Mandat de Représentation signé électroniquement (conforme au Règlement eIDAS n° 910/2014)",
    'ainsi que la mise en demeure détaillée.' + cash,
    '',
    `À défaut de paiement sous ${claim.delaiJours} jours, nous saisirons l'organisme national compétent` +
      (claim.neb ? ` (${claim.neb})` : '') + ' et transmettrons le dossier à notre avocat partenaire et/ou au médiateur compétent.',
    '',
    "Conformément à l'article R. 124-4 du Code de procédure civile, les sommes réclamées au présent stade amiable n'ont pas de caractère exécutoire et peuvent être contestées.",
    '',
    'Merci de n\'utiliser que cette adresse pour toute correspondance relative à ce dossier.',
    '',
    'Dans l\'attente de votre accusé de réception.',
    '',
    'Cordialement,',
    "L'équipe Robin des Airs",
  ].join('\n');
}

/** Lit (ou regénère) la LRAR PDF depuis Blobs `robin-claims` clé claim/{ref}/lrar.pdf. */
async function getOrBuildLrarPdf(event, ref, claim) {
  const store = getBlobStore(event, CLAIMS_STORE);
  const key = `claim/${safeRef(ref)}/lrar.pdf`;
  if (store) {
    try {
      const existing = await store.get(key, { type: 'arrayBuffer' });
      if (existing) return { buffer: Buffer.from(existing), key, regenerated: false };
    } catch (_) { /* absent → on régénère */ }
  }
  // Absente : on RÉGÉNÈRE via la même lib que generate-claim (pas de round-trip HTTP).
  const buffer = await genererClaimPdf(claim);
  if (store) {
    try {
      await store.set(key, buffer, {
        metadata: { contentType: 'application/pdf', ref, generatedAt: new Date().toISOString(), via: 'airline-auto-submit' },
      });
    } catch (e) { console.error('airline-auto-submit: archive LRAR échouée:', e.message); }
  }
  return { buffer, key, regenerated: true };
}

/** Lit le mandat signé archivé (base64) depuis Blobs `robin-signatures` clé pdf/{ref}. */
async function getMandatPdf(event, ref) {
  const store = getBlobStore(event, SIGNATURES_STORE);
  if (!store) return null;
  try {
    const b64 = await store.get(`pdf/${ref}`, { type: 'text' });
    if (!b64) return null;
    return { buffer: Buffer.from(b64, 'base64'), key: `pdf/${ref}` };
  } catch (e) {
    console.error('airline-auto-submit: lecture mandat signé échouée:', e.message);
    return null;
  }
}

/**
 * Assemble le package BROUILLON pour un dossier.
 * @param {string} ref
 * @param {object} event  contexte Lambda (pour connectLambda / Blobs)
 * @returns {Promise<object>} { ref, airline, entryMode, recipient, recipientType, subject,
 *   bodyText, attachments:[{filename, blobKey, store, bytes}], readyToSend, blocker, alreadySent }
 */
async function prepareClaimPackage(ref, event) {
  ref = String(ref || '').trim();
  if (!ref) throw new Error('ref requis');

  const cfg = airtableCfg();
  if (!cfg) throw new Error('Airtable non configuré');

  const recs = await airtableFindByRef(cfg, ref);
  if (!recs.length) throw new Error('dossier introuvable');
  const rec = recs[0];
  const data = recordFromAirtableFields(cfg, rec.fields);
  const airline = getAirlineClaim(data.vol || data.compagnie);

  // Art. 9 best-effort (depuis le cache d'enquête) — enrichit la LRAR si présent.
  let art9Note = '';
  if (loadEnqueteCache && data.vol) {
    try {
      const enq = await loadEnqueteCache(event, data.vol, frToYmd(data.date));
      if (enq && enq.art9 && enq.art9.note) art9Note = enq.art9.note;
    } catch (_) {}
  }

  const claim = buildClaim(ref, data, airline, art9Note);

  // Garde-fou éligibilité CE 261 art. 3§1 (non bloquant mais surfacé) — repris de generate-claim.
  const nonUe = !!(airline && airline.ue === false);
  const afriDep = nonUe ? africanDepartureFromRoute(data.route) : null;
  let eligibiliteAlerte = null;
  if (nonUe) {
    const cie = claim.airlineName;
    eligibiliteAlerte = afriDep
      ? { niveau: 'bloquant', code: 'NON_UE_DEPART_AFRIQUE',
          message: `${cie} (non-UE) au départ de ${afriDep.city} (${afriDep.iata}) : vol probablement NON couvert par le CE 261 (art. 3§1). Vérifier le sens du vol AVANT envoi.` }
      : { niveau: 'avertissement', code: 'NON_UE_VERIFIER_DEPART',
          message: `${cie} (non-UE) : le CE 261 ne s'applique qu'AU DÉPART d'un aéroport UE (art. 3§1). Vérifier le départ avant envoi.` };
  }

  // PDF : LRAR (récupérée ou régénérée) + mandat signé (s'il existe).
  const lrar = await getOrBuildLrarPdf(event, ref, claim);
  const mandat = await getMandatPdf(event, ref);

  // Noms de fichiers « côté compagnie ».
  const docInput = { nom: data.nom, prenom: data.prenom, vol: data.vol, ref };
  const attachments = [];
  if (mandat) {
    attachments.push({ filename: nomFichierCompagnie(docInput, 'mandat'), blobKey: mandat.key, store: SIGNATURES_STORE, bytes: mandat.buffer.length });
  }
  attachments.push({ filename: nomFichierCompagnie(docInput, 'med'), blobKey: lrar.key, store: CLAIMS_STORE, bytes: lrar.buffer.length });

  // Routage par canal.
  const entryMode = (airline && airline.entryMode) || 'form';
  const isEmail = entryMode === 'email';
  const recipient = isEmail
    ? ((airline && airline.emailReclamations) || (airline && airline.adresseAR) || '')
    : ((airline && airline.formUrl) || '');

  // Blockers possibles (ordre de priorité).
  let blocker = null;
  if (!airline) blocker = 'Compagnie inconnue dans le référentiel (airlines-claims.js) — dépôt manuel.';
  else if (!isEmail) blocker = 'Dépôt manuel requis (formulaire web, pas de scraping).';
  else if (!recipient) blocker = "Canal email mais aucune adresse de réclamation connue — à compléter dans airlines-claims.js.";
  else if (!mandat) blocker = 'Mandat signé introuvable (pdf/{ref}) — signature requise avant envoi à la compagnie.';

  // Idempotence : déjà envoyé ?
  let alreadySent = false;
  try {
    const claimsStore = getBlobStore(event, CLAIMS_STORE);
    if (claimsStore) {
      const sent = await claimsStore.get(`sent/${safeRef(ref)}.json`, { type: 'json' });
      if (sent) alreadySent = true;
    }
  } catch (_) {}
  if (alreadySent && !blocker) blocker = 'Réclamation déjà envoyée (sent/{ref}.json présent) — relance manuelle si nécessaire.';

  const readyToSend = isEmail && !blocker;

  return {
    ref,
    recordId: rec.id,
    airline: claim.airlineName,
    airlineIata: airline ? airlineIataFromFlight(data.vol || data.compagnie) : null,
    entryMode,
    recipient,
    recipientType: isEmail ? 'email' : 'form_url',
    subject: buildSubject(data),
    bodyText: buildBodyText(data, claim, airline),
    attachments,
    montant: claim.montant,
    exigerCash: claim.exigerCash,
    conversion: claim.conversion,
    neb: claim.neb,
    eligibiliteAlerte,
    lrarRegenerated: lrar.regenerated,
    mandatPresent: !!mandat,
    alreadySent,
    readyToSend,
    blocker,
    // Buffers attachés en interne pour sendClaimEmail (jamais sérialisés vers le client HTTP).
    _buffers: { lrar: lrar.buffer, mandat: mandat ? mandat.buffer : null },
  };
}

async function sendResendEmail(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, error: data.message || String(r.status) };
  }
  return { ok: true, id: data.id };
}

/**
 * Envoie l'email de réclamation à la compagnie — UNIQUEMENT avec confirm === 'SEND'.
 * @param {object} pkg    le package retourné par prepareClaimPackage
 * @param {object} opts   { confirm, event, force }
 * @returns {Promise<object>} { sent, reason?, messageId?, recipient? }
 */
async function sendClaimEmail(pkg, opts = {}) {
  const { confirm, event, force = false } = opts;

  // ── DOUBLE VERROU DE SÉCURITÉ ──────────────────────────────────────────────
  if (confirm !== 'SEND') return { sent: false, reason: "confirm:'SEND' requis (mode brouillon par défaut)" };
  if (process.env.AIRLINE_AUTOSEND === '0') return { sent: false, reason: 'AIRLINE_AUTOSEND=0 (kill-switch ops actif)' };
  if (!pkg) return { sent: false, reason: 'package manquant' };
  if (pkg.entryMode !== 'email') return { sent: false, reason: `canal ${pkg.entryMode} : envoi manuel requis (pas d'email automatisable)` };
  if (!pkg.recipient) return { sent: false, reason: 'aucun destinataire email' };
  if (pkg.blocker && !(force && pkg.alreadySent)) return { sent: false, reason: pkg.blocker };

  // Idempotence (revérifiée à l'instant t — évite la course entre prepare et send).
  const claimsStore = getBlobStore(event, CLAIMS_STORE);
  const sentKey = `sent/${safeRef(pkg.ref)}.json`;
  if (claimsStore && !force) {
    try {
      const already = await claimsStore.get(sentKey, { type: 'json' });
      if (already) return { sent: false, reason: 'déjà envoyé (idempotence)', alreadySent: true };
    } catch (_) {}
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY manquante' };

  const buffers = pkg._buffers || {};
  const attachments = [];
  pkg.attachments.forEach((a) => {
    const buf = a.store === SIGNATURES_STORE ? buffers.mandat : buffers.lrar;
    if (buf) attachments.push({ filename: a.filename, content: buf.toString('base64') });
  });

  const from = (process.env.CLAIM_EMAIL_FROM || process.env.MANDAT_EMAIL_FROM || 'Robin des Airs <reclamations@robindesairs.eu>').trim();
  const replyTo = (process.env.CLAIM_EMAIL_REPLY_TO || 'expert@robindesairs.eu').trim();
  const payload = {
    from,
    to: pkg.recipient.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
    subject: pkg.subject,
    text: pkg.bodyText,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(attachments.length ? { attachments } : {}),
  };

  const res = await sendResendEmail(apiKey, payload);
  if (!res.ok) return { sent: false, reason: 'Resend: ' + (res.error || 'échec') };

  // ── Preuve d'envoi (Blobs robin-claims sent/{ref}.json) ──────────────────────
  const proof = {
    ref: pkg.ref,
    recipient: pkg.recipient,
    subject: pkg.subject,
    messageId: res.id || null,
    sentAt: new Date().toISOString(),
    attachments: pkg.attachments.map((a) => {
      const buf = a.store === SIGNATURES_STORE ? buffers.mandat : buffers.lrar;
      return { filename: a.filename, bytes: buf ? buf.length : 0, sha256: buf ? sha256(buf) : null };
    }),
  };
  if (claimsStore) {
    try { await claimsStore.setJSON(sentKey, proof); }
    catch (e) { console.error('airline-auto-submit: archive preuve d\'envoi échouée:', e.message); }
  }

  // ── Airtable : statut « LRAR envoyée » + remarque horodatée ──────────────────
  try {
    const cfg = airtableCfg();
    if (cfg && pkg.recordId) {
      const note = `LRAR envoyée ${proof.sentAt.slice(0, 16).replace('T', ' ')} → ${pkg.recipient} (msg ${res.id || '—'})`;
      const recList = await airtableFindByRef(cfg, pkg.ref);
      const prev = (recList[0] && recList[0].fields && recList[0].fields[cfg.fRemarques]) || '';
      let remark = prev ? `${prev} | ${note}` : note;
      if (remark.length > 900) remark = remark.slice(-900);
      const fields = { [cfg.fRemarques]: remark };
      if (cfg.fStatutSuivi) fields[cfg.fStatutSuivi] = 'LRAR envoyée';
      await airtablePatch(cfg, pkg.recordId, fields);
    }
  } catch (e) { console.error('airline-auto-submit: Airtable patch envoi échoué:', e.message); }

  // ── Notif owner (best-effort) ────────────────────────────────────────────────
  if (notifyOwner) {
    try {
      await notifyOwner(
        `📤 LRAR envoyée — ${pkg.ref} (${pkg.airline})`,
        `Réclamation CE 261 envoyée à ${pkg.recipient}\n` +
        `Objet : ${pkg.subject}\n` +
        `Montant : ${pkg.montant} €${pkg.exigerCash ? ' (CASH exigé)' : ''}\n` +
        `Pièces : ${pkg.attachments.map((a) => a.filename).join(', ')}\n` +
        `Message Resend : ${res.id || '—'}`
      );
    } catch (_) {}
  }

  return { sent: true, recipient: pkg.recipient, messageId: res.id || null, sentAt: proof.sentAt };
}

module.exports = { prepareClaimPackage, sendClaimEmail };
