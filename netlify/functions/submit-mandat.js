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
    fIncident: (process.env.AIRTABLE_F_TYPE_INCIDENT || 'fldci5VnHb0HpOoKL').trim(),
    fItineraire: (process.env.AIRTABLE_F_ITINERAIRE || 'fldtCISegQZ58Yvrl').trim(),
    statutSuiviSigne: (process.env.AIRTABLE_STATUT_SUIVI_MANDAT_SIGNE || 'Mandat signé').trim(),
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
  const signedNote = `Mandat signé le ${record.signed_at || new Date().toISOString()} (cert ${record.cert_id || '—'})`;
  const addr = (record.address || '').trim();
  const itin = [record.depAirport, record.arrAirport].filter(Boolean).join(' → ');
  const incidentLabel = INCIDENT_AT[record.incident] || record.incident || '';
  const remarquesExtra = [
    signedNote,
    addr ? `Adresse: ${addr}` : '',
    record.email ? `Email: ${record.email}` : '',
    (record.passengerNames && record.passengerNames.length) ? `Passagers: ${record.passengerNames.join(', ')}` : '',
    record.operatedBy ? `Opéré par: ${record.operatedBy}` : '',
    record.connecting ? `Correspondance: ${record.connecting}` : '',
  ].filter(Boolean).join(' | ');

  const common = {};
  if (cfg.fStatutSuivi && cfg.statutSuiviSigne) common[cfg.fStatutSuivi] = cfg.statutSuiviSigne;
  if (cfg.fCompagnie && record.airline) common[cfg.fCompagnie] = record.airline;
  if (cfg.fVol && record.flightNum) common[cfg.fVol] = record.flightNum;
  const fd = flightDateForAirtable(record.flightDate);
  if (cfg.fDateVol && fd) common[cfg.fDateVol] = fd;
  if (cfg.fPnr && record.pnr) common[cfg.fPnr] = String(record.pnr).trim().toUpperCase();
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
<p style="margin:0 0 16px">Un mandat de représentation vient d’être <strong>signé</strong> sur robindesairs.eu.</p>
<table style="border-collapse:collapse">${htmlRows}</table>
<p style="margin:20px 0 0;font-size:12px;color:#888">Robin des Airs — notification automatique</p>
</body></html>`;
  return { subject: `Mandat signé — ${record.ref || record.cert_id || 'dossier'} — ${name}`, text, html };
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
    'Nous avons bien enregistré la signature de votre mandat de représentation Robin des Airs.',
    '',
    `Référence dossier : ${ref}`,
    `Vol : ${vol} — ${date}`,
    `Compagnie : ${cie}`,
    pnr !== '—' ? `PNR : ${pnr}` : '',
    `Signé le : ${signed}`,
    '',
    'Prochaines étapes :',
    '• Confirmation de votre dossier sous 24 h (WhatsApp ou email)',
    '• Mise en demeure à la compagnie sous 48 h',
    '• Suivi : https://robindesairs.eu/suivi-dossier.html',
    '',
    'Droit de rétractation : 14 jours — contact@robindesairs.eu (objet : Je me rétracte — Réf. ' + ref + ')',
    '',
    'Questions : expert@robindesairs.eu — WhatsApp +33 7 56 86 36 30',
    'https://wa.me/33756863630',
    '',
    'Robin des Airs — Votre droit, notre mission.',
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px;line-height:1.55">
<p>Bonjour <strong>${escapeHtml(hello)}</strong>,</p>
<p>Nous avons bien enregistré la <strong>signature de votre mandat</strong> de représentation Robin des Airs.</p>
<table style="border-collapse:collapse;margin:16px 0;background:#f8f6f0;border:1px solid #e0dcc8">
<tr><td style="padding:8px 12px;color:#666;font-size:13px">Référence</td><td style="padding:8px 12px;font-size:13px"><strong>${escapeHtml(ref)}</strong></td></tr>
<tr><td style="padding:8px 12px;color:#666;font-size:13px">Vol</td><td style="padding:8px 12px;font-size:13px"><strong>${escapeHtml(vol)}</strong> — ${escapeHtml(date)}</td></tr>
<tr><td style="padding:8px 12px;color:#666;font-size:13px">Compagnie</td><td style="padding:8px 12px;font-size:13px">${escapeHtml(cie)}</td></tr>
${pnr !== '—' ? `<tr><td style="padding:8px 12px;color:#666;font-size:13px">PNR</td><td style="padding:8px 12px;font-size:13px">${escapeHtml(pnr)}</td></tr>` : ''}
<tr><td style="padding:8px 12px;color:#666;font-size:13px">Signé le</td><td style="padding:8px 12px;font-size:13px">${escapeHtml(signed)}</td></tr>
</table>
<p><strong>Prochaines étapes</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:14px">
<li>Confirmation de votre dossier sous 24 h</li>
<li>Mise en demeure à la compagnie sous 48 h</li>
<li><a href="https://robindesairs.eu/suivi-dossier.html">Suivre mon dossier</a></li>
</ul>
<p style="font-size:13px;color:#555">Rétractation possible sous 14 jours : <a href="mailto:contact@robindesairs.eu?subject=${encodeURIComponent('Rétractation — Réf. ' + ref)}">contact@robindesairs.eu</a></p>
<p style="font-size:13px">Questions : <a href="mailto:expert@robindesairs.eu">expert@robindesairs.eu</a> — <a href="https://wa.me/33756863630">WhatsApp</a></p>
<p style="margin-top:24px;font-size:12px;color:#888">Robin des Airs — Votre droit, notre mission.</p>
</body></html>`;

  return {
    subject: `Confirmation — mandat signé — ${ref}`,
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
        filename: `Mandat-bilingue-FR-EN-${(record.ref || 'mandat').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        content: pdfBilingueBuffer.toString('base64'),
      });
    }
    if (teamAttachments.length) teamPayload.attachments = teamAttachments;
    result.team = await sendResendEmail(apiKey, teamPayload);
  } else {
    result.team = { skipped: true, reason: 'no MANDAT_NOTIFY_EMAIL' };
  }

  const clientEmail = (record.email || '').trim();
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
      const fileRef = (record.ref || 'dossier').replace(/[^A-Za-z0-9_-]/g, '_');
      clientPayload.attachments = [{ filename: `Mandat-${fileRef}.pdf`, content: pdfBuffer.toString('base64') }];
    }
    result.client = await sendResendEmail(apiKey, clientPayload);
  } else {
    result.client = { skipped: true, reason: clientEmail ? 'invalid email' : 'no client email' };
  }

  return result;
}

async function forwardBotWebhook(record) {
  const url = (process.env.MANDAT_SIGNED_WEBHOOK_URL || '').trim();
  if (!url) return;
  const secret = (process.env.MANDAT_SIGNED_WEBHOOK_SECRET || '').trim();
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
  const fileName = `Mandat-${String(ref).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
  const caption = `✅ Mandat signé — merci de votre confiance ! (réf. ${ref})\n\nVotre dossier passe maintenant entre les mains de notre équipe : à partir d'ici, c'est nous qui parlons à la compagnie, plus vous. 0 € si on ne gagne pas, 25 % uniquement si vous êtes indemnisé.\n\nVoici votre copie à conserver. On revient vers vous dès qu'il y a du nouveau. 🏹\nL'équipe Robin des Airs`;
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
    email: (body.email || '').trim() || clientEmailForRef(ref),
    address: body.address || '',
    startNow: !!body.startNow,
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
    record.signed_at, record.signatureImg || '', JSON.stringify(record.passengersData || []),
  ].join('|'));

  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const phoneKey = phone.replace(/\D/g, '');
      await store.setJSON(`sig/${phoneKey}/${ref}`, record);

      let index = [];
      try { index = await store.getJSON('__index') || []; } catch { index = []; }
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
  // Génère le PDF bilingue FR/EN (pour les compagnies étrangères) — joint à la notif équipe
  let pdfBilingueBuffer = null;
  if (genererMandatBilinguePdf) {
    try { pdfBilingueBuffer = await genererMandatBilinguePdf(record); }
    catch (e) { console.error('submit-mandat: génération PDF bilingue échouée:', e.message); }
  }

  const [webhookResult, emailResult, waCopyResult] = await Promise.all([
    forwardBotWebhook(record).then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e.message })),
    notifyMandatSignedByEmail(record, pdfBuffer, pdfBilingueBuffer),
    sendMandatWhatsappCopy(record, pdfBuffer),
  ]);

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
