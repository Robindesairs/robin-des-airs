/**
 * send-preuve-pdf — Robin des Airs
 *
 * Génère un PDF de preuve de vol (CE 261/2004) et l'envoie au passager via WhatsApp.
 *
 * POST /api/send-preuve-pdf
 * Body JSON:
 *   {
 *     phone:       "33612345678",   // obligatoire
 *     numVol:      "AF1234",        // obligatoire
 *     passager:    "Marie Diallo",  // optionnel
 *     dep:         "CDG",
 *     arr:         "ABJ",
 *     depPrevu:    "2026-05-21T06:15:00Z",
 *     depReel:     "2026-05-21T09:47:00Z",
 *     arrPrevu:    "2026-05-21T10:05:00Z",
 *     arrReelle:   "2026-05-21T13:39:00Z",
 *     retardMin:   214,
 *     statut:      "Atterri",       // ou "Annulé"
 *     secret:      "..."            // si WHATSAPP_WEBHOOK_SECRET défini
 *   }
 */

const PDFDocument = require('pdfkit');
const { watiSendFile, watiCfg } = require('./lib/wati-api');
const { corsHeaders, isProduction } = require('./lib/auth-config');
const { safeEqualString } = require('./lib/safe-compare');

// ─── Branding Robin des Airs (tokens officiels de /assets/main.css) ──────────
const NAVY      = '#0B1F3A';   // --navy    : fond header, textes forts
const NAVY2     = '#0d2445';   // --navy2   : variante fond
const NEON      = '#00C87A';   // --neon    : vert signature Robin
const NEON_B    = '#00E5A0';   // --neon-b  : vert vif, accents
const NEON_DARK = '#009960';   // --neon-dark
const OFF       = '#F7F8FA';   // --off     : fond clair
const BORDER    = '#E2E6EE';   // --border
const TEXT      = '#1a2436';   // --text
const GRAY      = '#6B7A90';   // --gray
const ORANGE    = '#d97706';   // retard modéré
const ROUGE     = '#dc2626';   // annulation / retard majeur

const CORS_HEADERS = corsHeaders();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(status, body) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function formatHeure(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    }).replace(',', ' à') + ' (Paris)';
  } catch { return iso; }
}

function retardLabel(min) {
  if (min == null) return '—';
  if (min === 0)   return 'À l\'heure';
  if (min >= 180)  return `${min} min — Retard majeur (≥ 3h)`;
  if (min >= 120)  return `${min} min — Retard significatif (≥ 2h)`;
  return `${min} min`;
}

function retardCouleur(min, annule) {
  if (annule)     return ROUGE;
  if (min >= 180) return ROUGE;
  if (min >= 60)  return ORANGE;
  if (min > 0)    return ORANGE;
  return NEON;
}

// ─── Génération PDF ───────────────────────────────────────────────────────────

function genererPdf(data) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    const annule   = /annul/i.test(data.statut || '');
    const retard   = typeof data.retardMin === 'number' ? data.retardMin : 0;
    const eligible = annule || retard >= 180;
    const capturedAt = new Date().toISOString();

    // ── En-tête Navy avec logo Robin des Airs ──
    const headerH = 90;
    doc.rect(0, 0, doc.page.width, headerH).fill(NAVY);

    // Logo : flèche verte (inspiré du SVG du site)
    const lx = 50, ly = 22;
    doc.save();
    // Trait diagonal → flèche
    doc.moveTo(lx, ly + 6).lineTo(lx + 28, ly + 20)
       .stroke(NEON).lineWidth(3);
    doc.polygon(
      [lx + 28, ly + 20],
      [lx + 20, ly + 15],
      [lx + 22, ly + 24]
    ).fill(NEON);
    doc.restore();

    // Nom de la marque
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
       .text('Robin des Airs', lx + 36, ly + 6);

    // Tagline
    doc.fillColor(NEON_B).fontSize(10).font('Helvetica')
       .text('Justice aérienne pour l\'Afrique', lx + 37, ly + 30);

    // Ligne neon sous le header
    doc.rect(0, headerH, doc.page.width, 3).fill(NEON);

    doc.y = headerH + 22;

    // ── Titre vol ──
    doc.fillColor(NAVY).fontSize(20).font('Helvetica-Bold')
       .text(`Vol ${data.numVol}`, { align: 'center' });

    doc.moveDown(0.25);

    // ── Badge statut ──
    const badgeCouleur = retardCouleur(retard, annule);
    const badgeTexte   = annule
      ? 'VOL ANNULE'
      : retard >= 180 ? `RETARD ${retard} MIN — CE 261 ELIGIBLE`
      : retard > 0    ? `RETARD ${retard} MIN`
      : 'A L\'HEURE';

    // Fond coloré pour le badge
    const badgeW = 300, badgeH = 28;
    const badgeX = (doc.page.width - badgeW) / 2;
    doc.rect(badgeX, doc.y, badgeW, badgeH).fill(badgeCouleur);
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
       .text(badgeTexte, badgeX, doc.y - badgeH + 8, { width: badgeW, align: 'center' });

    doc.y += 18;
    doc.moveDown(0.8);

    // ── Bloc certification (fond OFF) ──
    const certY = doc.y;
    doc.rect(50, certY, doc.page.width - 100, 54).fill(OFF);
    // Barre neon à gauche
    doc.rect(50, certY, 3, 54).fill(NEON);

    doc.fillColor(NAVY).fontSize(8.5).font('Helvetica-Bold')
       .text('DOCUMENT CERTIFIE — ROBIN DES AIRS', 62, certY + 8);
    doc.fillColor(GRAY).font('Helvetica')
       .text(`Genere le : ${formatHeure(capturedAt)}`, 62, certY + 22)
       .text(`Source : AeroDataBox / RapidAPI — donnees IATA officielles`, 62, certY + 34)
       .text(`Ref. : RDA-${data.numVol}-${capturedAt.slice(0,10).replace(/-/g,'')}`, 62, certY + 46);

    doc.y = certY + 66;

    // ── Tableau données vol ──
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 255;
    const rowH  = 26;

    const lignes = [
      ['Numero de vol',    data.numVol                                    ],
      ['Passager',         data.passager || '—'                           ],
      ['Statut',           data.statut   || '—'                           ],
      ['Trajet',           `${data.dep || '—'} -> ${data.arr || '—'}`    ],
      ['Depart prevu',     formatHeure(data.depPrevu)                     ],
      ['Depart reel',      formatHeure(data.depReel)                      ],
      ['Arrivee prevue',   formatHeure(data.arrPrevu)                     ],
      ['Arrivee reelle',   formatHeure(data.arrReelle)                    ],
      ['Retard depart',    retardLabel(data.retardDepMin)                 ],
      ['Retard arrivee',   retardLabel(data.retardMin)                    ],
    ];

    lignes.forEach(([label, valeur], i) => {
      const y = tableTop + i * rowH;
      // Fond alterné
      doc.rect(col1, y, doc.page.width - 100, rowH)
         .fill(i % 2 === 0 ? OFF : 'white');
      // Barre neon sur la ligne header (première)
      if (i === 0) {
        doc.rect(col1, y, 3, rowH).fill(NEON);
      }
      doc.fillColor(NAVY).fontSize(9.5).font('Helvetica-Bold')
         .text(label, col1 + 10, y + 8, { width: 190 });
      doc.fillColor(TEXT).font('Helvetica')
         .text(String(valeur), col2, y + 8, { width: doc.page.width - col2 - 55 });
    });

    // Ligne de séparation neon sous le tableau
    doc.y = tableTop + lignes.length * rowH + 4;
    doc.rect(50, doc.y, doc.page.width - 100, 2).fill(NEON);
    doc.y += 14;

    // ── Bloc éligibilité (style Robin des Airs) ──
    if (eligible) {
      const boxY = doc.y;
      const boxH = 78;
      // Fond navy foncé
      doc.rect(50, boxY, doc.page.width - 100, boxH).fill(NAVY);
      // Barre neon gauche
      doc.rect(50, boxY, 4, boxH).fill(NEON);

      doc.fillColor(NEON_B).fontSize(11).font('Helvetica-Bold')
         .text('CE 261/2004 — Eligibilite probable', 64, boxY + 10);
      doc.fillColor('white').fontSize(9.5).font('Helvetica')
         .text(
           annule
             ? 'Vol annule : indemnisation jusqu\'a 600 EUR/passager selon la distance.'
             : `Retard de ${retard} min : indemnisation jusqu\'a 600 EUR/passager.`,
           64, boxY + 28, { width: doc.page.width - 128 }
         );
      doc.fillColor(NEON).fontSize(9.5).font('Helvetica-Bold')
         .text('Zéro frais si Robin ne gagne pas — robindesairs.eu', 64, boxY + 50);

      doc.y = boxY + boxH + 14;
    }

    // ── Pied de page Navy ──
    const piedH = 52;
    const piedY = doc.page.height - piedH;
    doc.rect(0, piedY, doc.page.width, piedH).fill(NAVY);
    // Ligne neon au-dessus du pied
    doc.rect(0, piedY, doc.page.width, 2).fill(NEON);
    doc.fillColor(NEON_B).fontSize(8.5).font('Helvetica-Bold')
       .text('Robin des Airs — robindesairs.eu', 50, piedY + 10, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(
         'Document genere automatiquement — donnees IATA officielles AeroDataBox / RapidAPI',
         50, piedY + 24, { align: 'center', width: doc.page.width - 100 }
       )
       .text(
         'Piece complementaire pour dossier de reclamation aerienne CE 261/2004',
         50, piedY + 36, { align: 'center', width: doc.page.width - 100 }
       );

    doc.end();
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Corps JSON invalide' }); }

  const webhookSecret = (process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    if (isProduction()) {
      return json(503, {
        error: 'WHATSAPP_WEBHOOK_SECRET requis en production (Netlify → Environment variables)',
      });
    }
  } else if (!safeEqualString(String(body.secret || ''), webhookSecret)) {
    return json(403, { error: 'Secret invalide' });
  }

  const { phone, numVol } = body;
  if (!phone) return json(400, { error: '"phone" obligatoire' });
  if (!numVol) return json(400, { error: '"numVol" obligatoire' });

  // Vérifier Wati configuré
  if (!watiCfg()) {
    return json(503, { error: 'Wati non configuré (WATI_API_BASE + WATI_API_TOKEN)' });
  }

  // Générer le PDF
  let pdfBuffer;
  try {
    pdfBuffer = await genererPdf(body);
  } catch (e) {
    console.error('send-preuve-pdf: erreur PDF', e.message);
    return json(500, { error: 'Erreur génération PDF', details: e.message });
  }

  // Envoyer via Wati
  const vNumUp   = String(numVol).toUpperCase();
  const dateTag  = new Date().toISOString().slice(0, 10);
  const fileName = `RobinDesAirs-Preuve-${vNumUp}-${dateTag}.pdf`;

  const annule   = /annul/i.test(body.statut || '');
  const retard   = typeof body.retardMin === 'number' ? body.retardMin : 0;
  const eligible = annule || retard >= 180;

  const statutEmoji = annule ? '🚫' : retard >= 180 ? '⚠️' : retard > 0 ? '🟠' : '✅';
  const statutTexte = annule
    ? `Vol annulé`
    : retard > 0 ? `Retard ${retard} min`
    : `À l'heure`;

  // Message WhatsApp brandé Robin des Airs
  const caption = [
    `✈️ *Robin des Airs* — Preuve officielle`,
    ``,
    `Vol *${vNumUp}* · ${body.dep || ''}→${body.arr || ''}`,
    `${statutEmoji} ${statutTexte}`,
    eligible
      ? `⚖️ CE 261/2004 — jusqu'à *600 €* par passager`
      : ``,
    ``,
    `Conservez ce document pour votre dossier 📋`,
    `👉 robindesairs.eu`,
  ].filter(l => l !== undefined).join('\n').trim();

  const result = await watiSendFile(phone, pdfBuffer, fileName, caption);

  if (!result.ok) {
    console.error('send-preuve-pdf: erreur Wati', result.error);
    return json(502, { error: result.error, details: result.details });
  }

  return json(200, {
    ok: true,
    messageId: result.messageId,
    fileName,
    pdfSizeKb: Math.round(pdfBuffer.length / 1024),
  });
};
