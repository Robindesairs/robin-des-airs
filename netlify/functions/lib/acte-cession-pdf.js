/**
 * acte-cession-pdf — ACTE DE CESSION une page, bilingue FR | EN (deux colonnes).
 *
 * C'est LE document envoyé à la compagnie pour notifier la cession (art. 1324 C. civ.),
 * calqué sur le standard du métier (cf. contrat Flightright) :
 *   - une seule page A4, propre, sections numérotées ;
 *   - colonne gauche = français (version qui prévaut), colonne droite = anglais ;
 *   - AUCUNE mention de commission (information commerciale inutile au débiteur cédé) ;
 *   - signatures : mention « signé électroniquement le … » par cédant (le contrat détaillé
 *     signé Yousign + dossier de preuve restent disponibles sur demande).
 *
 * Généré APRÈS la signature uniquement (l'endpoint vérifie signed/<ref>).
 * Déterministe, aucun texte IA. Branding aligné sur claim-pdf.js / mandat-pdf.js.
 *
 *   const { genererActeCessionPdf } = require('./lib/acte-cession-pdf');
 *   const buffer = await genererActeCessionPdf(d);
 */

const PDFDocument = require('pdfkit');

const NAVY = '#0B1F3A';
const NEON = '#00C87A';
const NEON_B = '#00E5A0';
const OFF = '#F7F8FA';
const TEXT = '#1a2436';
const GRAY = '#6B7A90';
const BORDER = '#D8DEE8';

// WinAnsi only (fontes standard pdfkit) : pas d'emoji ni de flèches unicode.
function incidentLabels(code) {
  const c = String(code || '').toLowerCase();
  if (c.includes('cancel') || c.includes('annul')) return { fr: 'annulation', en: 'cancellation' };
  if (c.includes('denied') || c.includes('refus') || c.includes('surbook')) return { fr: "refus d'embarquement", en: 'denied boarding' };
  if (c.includes('miss') || c.includes('correspond')) return { fr: 'correspondance manquée', en: 'missed connection' };
  return { fr: 'retard de plus de 3 heures', en: 'delay of more than 3 hours' };
}

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso, lang) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso || '—');
  const d = parseInt(m[3], 10), mo = parseInt(m[2], 10) - 1, y = m[1];
  return lang === 'en' ? `${d} ${MONTHS_EN[mo]} ${y}` : `${d} ${MOIS_FR[mo]} ${y}`;
}

/**
 * @param {object} d {
 *   ref, certId, signedAt,                       // ISO signature
 *   passengers: [{ name, dob, birth, minor, legalRepName }],
 *   airline, flightNum, flightDate, pnr,
 *   depAirport, arrAirport, incident,            // code: delay|cancel|denied|…
 * }
 * @returns {Promise<Buffer>}
 */
function genererActeCessionPdf(d) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 42, size: 'A4' });
    doc.on('data', (x) => chunks.push(x));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const left = 42;
    const contentW = W - 84;
    const gap = 16;
    const colW = (contentW - gap) / 2;
    const x1 = left;
    const x2 = left + colW + gap;

    const pax = Array.isArray(d.passengers) && d.passengers.length
      ? d.passengers
      : [{ name: d.name || '—' }];
    const inc = incidentLabels(d.incident);
    const sigFr = fmtDate(d.signedAt, 'fr');
    const sigEn = fmtDate(d.signedAt, 'en');
    const routeTxt = [d.depAirport, d.arrAirport].filter(Boolean).join(' - ') || (d.route || '—');

    // ── En-tête (branding maison)
    const headerH = 62;
    doc.rect(0, 0, W, headerH).fill(NAVY);
    doc.moveTo(left, 24).lineTo(left + 24, 35).lineWidth(3).stroke(NEON);
    doc.polygon([left + 24, 35], [left + 17, 30.5], [left + 18.5, 39]).fill(NEON);
    doc.fillColor('white').fontSize(17).font('Helvetica-Bold').text('Robin des Airs', left + 32, 21);
    doc.fillColor(NEON_B).fontSize(8).font('Helvetica').text('Cessionnaire / Assignee — Indemnisation aérienne CE 261/2004', left + 33, 42);
    doc.fillColor('white').fontSize(8).font('Helvetica').text(`Réf. dossier / File ref : ${d.ref || '—'}`, left, 28, { width: contentW, align: 'right' });
    doc.rect(0, headerH, W, 3).fill(NEON);

    // ── Titre
    doc.y = headerH + 16;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13.5)
      .text('CESSION DE CRÉANCES ET PRÉTENTIONS', left, doc.y, { width: contentW, align: 'center' });
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(10)
      .text('Assignment of claims and rights', left, doc.y + 1, { width: contentW, align: 'center' });

    // ── Encadré vol
    doc.y += 8;
    const volTop = doc.y;
    const volH = 34;
    doc.roundedRect(left, volTop, contentW, volH, 4).fillAndStroke(OFF, BORDER);
    const volLine1 = `Vol / Flight ${d.flightNum || '—'}   ·   ${d.flightDate || '—'}   ·   ${routeTxt}${d.pnr ? `   ·   PNR ${d.pnr}` : ''}`;
    const volLine2 = `Compagnie / Air carrier : ${d.airline || '—'}   ·   Irrégularité / Disruption : ${inc.fr} / ${inc.en}`;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text(volLine1, left + 10, volTop + 6, { width: contentW - 20 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(8.5).text(volLine2, left + 10, volTop + 19, { width: contentW - 20 });
    doc.y = volTop + volH + 10;

    // ── En-têtes de colonnes
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7);
    doc.text('VERSION FRANÇAISE (fait foi)', x1, doc.y, { width: colW });
    doc.text('ENGLISH VERSION (courtesy translation)', x2, doc.y - doc.currentLineHeight(), { width: colW });
    doc.y += 4;

    // ── Paragraphes bilingues synchronisés
    const FS = 8.2;
    function bilingual(frTitle, frBody, enTitle, enBody) {
      const yStart = doc.y;
      const titleH = 10;
      doc.font('Helvetica').fontSize(FS);
      const hFr = doc.heightOfString(frBody, { width: colW, align: 'justify' });
      const hEn = doc.heightOfString(enBody, { width: colW, align: 'justify' });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(FS).text(frTitle, x1, yStart, { width: colW });
      doc.fillColor(TEXT).font('Helvetica').fontSize(FS).text(frBody, x1, yStart + titleH, { width: colW, align: 'justify' });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(FS).text(enTitle, x2, yStart, { width: colW });
      doc.fillColor(TEXT).font('Helvetica').fontSize(FS).text(enBody, x2, yStart + titleH, { width: colW, align: 'justify' });
      doc.y = yStart + titleH + Math.max(hFr, hEn) + 7;
    }

    const cedantsFr = pax.map((p) => p.name || '—').join(', ');

    bilingual(
      '1. Parties',
      `D'une part, les passagers désignés ci-dessous : ${cedantsFr} (les « Cédants ») ; d'autre part, Robin des Airs, SASU en cours d'immatriculation au RCS de Paris, service de recouvrement d'indemnités aériennes (le « Cessionnaire »).`,
      '1. Parties',
      `On the one hand, the passengers listed below: ${cedantsFr} (the "Assignors"); on the other hand, Robin des Airs, a French simplified joint-stock company (SASU) in the course of registration with the Paris Trade and Companies Register, an air passenger claims recovery service (the "Assignee").`
    );

    bilingual(
      '2. Cession',
      `Par contrat signé électroniquement, les Cédants ont cédé au Cessionnaire, avec effet immédiat, l'intégralité de leurs créances et prétentions au titre du Règlement (CE) n° 261/2004 et de la jurisprudence y afférente — notamment l'indemnité forfaitaire (art. 7) et le remboursement des frais (art. 9) — nées de l'irrégularité du vol identifié ci-dessus. Le Cessionnaire agit en son nom propre et pour son propre compte (art. 1321 à 1324 du Code civil).`,
      '2. Assignment',
      `By an electronically signed agreement, the Assignors assigned to the Assignee, with immediate effect, all of their claims and rights under Regulation (EC) No 261/2004 and the related case law — in particular the lump-sum compensation (Art. 7) and the reimbursement of expenses (Art. 9) — arising from the disruption of the flight identified above. The Assignee acts in its own name and on its own behalf (Art. 1321 to 1324 of the French Civil Code).`
    );

    bilingual(
      '3. Signature électronique',
      `Le contrat de cession a été signé électroniquement le ${sigFr} via Yousign, prestataire de services de confiance (Règlement eIDAS n° 910/2014, art. 25 ; art. 1366 C. civ.).${d.certId ? ` Certificat n° ${d.certId}.` : ''} Le dossier de preuve (horodatage, journal de signature, empreinte d'intégrité) et la copie intégrale du contrat sont disponibles sur demande.`,
      '3. Electronic signature',
      `The assignment agreement was signed electronically on ${sigEn} via Yousign, a qualified trust service provider (eIDAS Regulation No 910/2014, Art. 25; Art. 1366 French Civil Code).${d.certId ? ` Certificate No ${d.certId}.` : ''} The evidence file (timestamps, signature log, integrity fingerprint) and a full copy of the agreement are available upon request.`
    );

    const contactEmail = `${String(d.ref || '').trim() || 'contact'}@robindesairs.eu`;
    bilingual(
      '4. Notification (art. 1324 C. civ.)',
      `Le présent document vaut notification de la cession à la compagnie aérienne. À compter de sa réception, seul un paiement effectué entre les mains du Cessionnaire est libératoire. Toute correspondance relative à ce dossier doit être adressée à : ${contactEmail}. Il est rappelé que les clauses restreignant la cession des créances issues du Règlement (CE) n° 261/2004 sont inopposables (art. 15 du Règlement ; CJUE, 6 février 2025, aff. C-11/23).`,
      '4. Notice (Art. 1324 French Civil Code)',
      `This document constitutes formal notice of the assignment to the air carrier. Upon receipt, only payment made to the Assignee discharges the debtor. All correspondence regarding this file must be sent to: ${contactEmail}. As a reminder, clauses restricting the assignment of claims under Regulation (EC) No 261/2004 are unenforceable (Art. 15 of the Regulation; CJEU, 6 February 2025, Case C-11/23).`
    );

    // ── Tableau des cédants (pleine largeur, entêtes bilingues)
    doc.y += 2;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.6).text('Cédants / Assignors', left, doc.y, { width: contentW });
    doc.y += 3;
    const rowPad = 5;
    pax.forEach((p) => {
      const yR = doc.y;
      const nomTxt = p.name || '—';
      const infoBits = [];
      if (p.dob) infoBits.push(`né(e) le / born ${p.dob}${p.birth ? ` à / in ${p.birth}` : ''}`);
      const sigTxt = p.minor
        ? `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, represented by ${p.legalRepName || 'their legal guardian'} — signé électroniquement le ${sigFr}`
        : `Signé électroniquement le ${sigFr} / Signed electronically on ${sigEn}`;
      doc.font('Helvetica').fontSize(7.8);
      const line2 = [infoBits.join(' · '), sigTxt].filter(Boolean).join(' — ');
      const h = 12 + doc.heightOfString(line2, { width: contentW - 16 }) + rowPad * 2 - 6;
      doc.roundedRect(left, yR, contentW, h, 3).fillAndStroke('#FFFFFF', BORDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.6).text(nomTxt, left + 8, yR + rowPad, { width: contentW - 16 });
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.8).text(line2, left + 8, yR + rowPad + 11, { width: contentW - 16 });
      doc.y = yR + h + 4;
    });

    // ── Clauses finales + pied
    doc.y += 2;
    doc.fillColor(TEXT).font('Helvetica-Oblique').fontSize(7.6).text(
      "Fait à distance, par voie électronique. En cas de divergence d'interprétation, la version française prévaut sur la version anglaise. / Executed remotely by electronic means. In the event of any discrepancy, the French version shall prevail over the English version.",
      left, doc.y, { width: contentW, align: 'center' }
    );

    // Pied de page : margins.bottom = 0 pour dessiner sous la zone de texte SANS déclencher
    // la pagination automatique de pdfkit (sinon le footer part seul en page 2).
    doc.page.margins.bottom = 0;
    const footY = doc.page.height - 34;
    doc.rect(0, footY - 8, W, 42).fill(OFF);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7)
      .text(`Robin des Airs — Cession de créance CE 261/2004 · robindesairs.eu · ${contactEmail}` + (d.certId ? ` · Certificat ${d.certId}` : ''), left, footY, { width: contentW, align: 'center', lineBreak: false });

    doc.end();
  });
}

module.exports = { genererActeCessionPdf };
