/**
 * crm-dossier-pdf — assemble UN SEUL PDF « dossier complet » prêt à envoyer à la compagnie :
 *   1) Page de garde bilingue FR/EN (réf, passager, vol, incident, montant CE 261, fondement, checklist)
 *   2) Mandat de représentation signé (version BILINGUE si archivée, sinon FR)
 *   3) Pièces justificatives (carte d'embarquement, e-billet, pièce d'identité…) — images redimensionnées
 *
 * GET /api/crm-dossier-pdf?r=REF  (auth CRM : cookie rda_crm ou X-CRM-Code)
 *   → application/pdf (inline) · ?dl=1 → téléchargement
 *
 * Fusion via pdf-lib (pur JS). Images réduites via sharp pour rester sous le plafond de réponse Netlify.
 */
'use strict';

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');
const { airtableCfg, airtableFindByRef, recordFromAirtableFields } = require('./lib/airtable-robin');
const { nomFichierCompagnie } = require('./lib/doc-filename');

const J = (code, obj) => ({ statusCode: code, headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const A4 = [595.28, 841.89];

function digits(x) { const n = parseInt(String(x || '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : 0; }

// Légende lisible d'une pièce selon ses métadonnées (mêmes règles que crm-pieces).
function pieceLabel(kind, filename) {
  const s = `${kind || ''} ${filename || ''}`.toLowerCase();
  if (/passe?port|cni|identit|ident|sejour|séjour/.test(s)) return { fr: "Pièce d'identité", en: 'ID document' };
  if (/embarq|boarding|carte/.test(s)) return { fr: "Carte d'embarquement", en: 'Boarding pass' };
  if (/billet|ticket|booking|reservation|réservation|voyage|ebillet/.test(s)) return { fr: 'E-billet / réservation', en: 'E-ticket / booking' };
  if (/certif|retard|attest/.test(s)) return { fr: 'Certificat / attestation', en: 'Certificate' };
  if (/frais|reçu|recu/.test(s)) return { fr: 'Justificatif de frais', en: 'Expense receipt' };
  return { fr: 'Pièce jointe', en: 'Attachment' };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: auth.error || 'Accès CRM requis' });

  const q = event.queryStringParameters || {};
  let body = {}; if (event.httpMethod === 'POST') { try { body = JSON.parse(event.body || '{}'); } catch (_) {} }
  // Pièces cochées dans le CRM. null (paramètre absent) = toutes les pièces ; [] = aucune.
  const selectedKeys = Array.isArray(body.keys) ? new Set(body.keys.map(String)) : null;
  const ref = String(q.r || q.ref || body.r || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return J(400, { error: 'r (référence) requis' });

  try {
    // ── Données du dossier (Airtable + blob mandats pour téléphone/passagers) ──
    let rec = {};
    try {
      const cfg = airtableCfg();
      if (cfg) { const found = await airtableFindByRef(cfg, ref); if (found.length) rec = recordFromAirtableFields(cfg, found[0].cellValuesByFieldId || found[0].fields || {}); }
    } catch (_) {}

    let dossier = null, phoneKey = '';
    try {
      const mandats = getBlobStore(event, 'mandats');
      dossier = mandats && (await mandats.get('m/' + ref, { type: 'json' }));
      if (dossier && dossier.phone) phoneKey = String(dossier.phone).replace(/\D/g, '');
    } catch (_) {}

    const passengers = (dossier && dossier.passengers && dossier.passengers.length)
      ? dossier.passengers.map((p) => p.name).filter(Boolean)
      : [rec.name || (dossier && dossier.name) || ''].filter(Boolean);
    const vol = rec.vol || (dossier && dossier.vol) || '—';
    const date = rec.date || (dossier && dossier.date) || '—';
    const route = rec.route || (dossier && dossier.route) || '—';
    const compagnie = rec.compagnie || (dossier && dossier.compagnie) || '—';
    const incident = rec.motif || (dossier && dossier.incident) || '—';
    const brut = digits(rec.indemnite) || (digits(rec.montantClient) ? Math.round(digits(rec.montantClient) / 0.75) : 600);

    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.Helvetica);
    const bold = await out.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(0.04, 0.12, 0.23), gray = rgb(0.4, 0.45, 0.5), green = rgb(0.02, 0.47, 0.34);

    // ── 1) PAGE DE GARDE bilingue ──
    const cover = out.addPage(A4);
    let y = 800;
    const line = (txt, { size = 11, f = font, color = navy, gap = 16, x = 50 } = {}) => { cover.drawText(String(txt), { x, y, size, font: f, color }); y -= gap; };
    line('DOSSIER D’INDEMNISATION — Règlement (CE) n° 261/2004', { size: 15, f: bold, gap: 18 });
    line('COMPENSATION CLAIM FILE — Regulation (EC) No 261/2004', { size: 11, f: bold, color: gray, gap: 26 });
    line(`Réf. dossier / File ref : ${ref}`, { f: bold, gap: 20 });
    line(`Passager(s) / Passenger(s) : ${passengers.join(', ') || '—'}`);
    line(`Vol / Flight : ${vol}   •   Date : ${date}`);
    line(`Trajet / Route : ${route}`);
    line(`Compagnie / Airline : ${compagnie}`);
    line(`Incident : ${incident}`);
    line(`Montant réclamé / Amount claimed : jusqu’à / up to ${brut} €`, { f: bold, color: green, gap: 24 });
    line('Représentant légal / Legal representative : Robin des Airs', { gap: 14 });
    line('Le passager mandate Robin des Airs (mandat signé ci-joint) pour réclamer en son nom.', { size: 10, color: gray, gap: 12 });
    line('The passenger mandates Robin des Airs (signed mandate enclosed) to claim on their behalf.', { size: 10, color: gray, gap: 24 });
    line('Documents inclus / Enclosed documents :', { f: bold, gap: 16 });
    ['Mandat de représentation signé / Signed mandate',
     'Carte(s) d’embarquement / Boarding pass(es)',
     'Pièce(s) d’identité / ID document(s)',
     'E-billet / réservation — si fourni / E-ticket — if provided',
    ].forEach((d) => line('•  ' + d, { size: 10, gap: 14 }));
    y -= 8;
    line('Contact : expert@robindesairs.eu   •   robindesairs.eu', { size: 10, color: gray });

    const included = []; // pour journaliser ce qui a réellement été ajouté

    // ── 2) MANDAT signé (bilingue si dispo, sinon FR) ──
    try {
      const sig = getBlobStore(event, 'robin-signatures');
      let b64 = sig && (await sig.get('pdf-bilingue/' + ref, { type: 'text' }));
      if (!b64 && sig) b64 = await sig.get('pdf/' + ref, { type: 'text' });
      if (b64) {
        const src = await PDFDocument.load(Buffer.from(b64, 'base64'));
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        included.push('mandat');
      }
    } catch (_) {}

    // ── 3) PIÈCES (web p/ref/ + WhatsApp wa/phone/) ──
    let sharp = null; try { sharp = require('sharp'); } catch (_) { sharp = null; }
    const pieces = getBlobStore(event, 'pieces');
    let keys = [];
    if (pieces) {
      try { const web = await pieces.list({ prefix: 'p/' + ref + '/' }); (web.blobs || []).forEach((b) => keys.push(b.key)); } catch (_) {}
      if (phoneKey) { try { const bot = await pieces.list({ prefix: 'wa/' + phoneKey + '/' }); (bot.blobs || []).forEach((b) => keys.push(b.key)); } catch (_) {} }
    }
    if (selectedKeys) keys = keys.filter((k) => selectedKeys.has(k)); // CRM : ne garder que les pièces cochées
    for (const key of keys) {
      try {
        const res = await pieces.getWithMetadata(key, { type: 'arrayBuffer' });
        if (!res || !res.data) continue;
        const md = res.metadata || {};
        const mime = String(md.mime || '').toLowerCase();
        const lab = pieceLabel(md.kind, md.filename || key.split('/').pop());
        let buf = Buffer.from(res.data);
        if (/^image\//.test(mime) || (!/pdf/.test(mime) && sharp)) {
          if (!sharp) continue;
          const jpg = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1500, height: 1500, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
          const img = await out.embedJpg(jpg);
          const pg = out.addPage(A4);
          pg.drawText(`${lab.fr} / ${lab.en}${md.passenger ? ' — ' + md.passenger : ''}`, { x: 50, y: 805, size: 11, font: bold, color: navy });
          const maxW = A4[0] - 100, maxH = A4[1] - 130;
          const sc = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * sc, h = img.height * sc;
          pg.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - 90 - h), width: w, height: h });
          included.push('piece:' + (md.kind || 'img'));
        } else if (/pdf/.test(mime)) {
          const src = await PDFDocument.load(buf, { ignoreEncryption: true });
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
          included.push('piece-pdf:' + (md.kind || 'pdf'));
        }
      } catch (_) { /* pièce illisible : on saute, le pack reste valide */ }
    }

    const bytes = await out.save();
    const b64out = Buffer.from(bytes).toString('base64');
    if (b64out.length > 5_900_000) {
      return J(413, { error: 'Dossier trop volumineux (trop de pièces). Réduisez le nombre de pièces ou téléchargez-les séparément.' });
    }
    const filename = nomFichierCompagnie({ nom: rec.nom || '', prenom: rec.prenom || '', vol, ref }, 'dossier') || `Dossier-Robin-des-Airs-${ref}.pdf`;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${q.dl === '1' ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        ...corsHeaders(),
      },
      body: b64out,
      isBase64Encoded: true,
    };
  } catch (e) {
    return J(500, { error: e.message });
  }
};
