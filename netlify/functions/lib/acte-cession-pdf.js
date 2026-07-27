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

// Décode une signature dessinée (data URL base64) en Buffer image, ou null si absente/invalide.
function sigBuffer(dataUrl) {
  try {
    const m = String(dataUrl || '').match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    return m ? Buffer.from(m[2], 'base64') : null;
  } catch (_) { return null; }
}

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
    const doc = new PDFDocument({ margin: 46, size: 'A4' });
    // Mode « presign » : l'acte est envoyé à Yousign AVANT signature (2e document de l'enveloppe).
    // Il porte alors des ZONES de signature (une par cédant adulte) dont on rapporte les coordonnées
    // exactes à l'appelant (yousign-init place les widgets dessus). Sinon : rendu classique post-signature.
    const presign = !!d.presign;
    const sigZones = [];   // [{ name, page, x, y, w, h }] — rempli en presign
    let pageNo = 1;        // suivi de la page courante (Yousign place par page)
    doc.on('pageAdded', () => { pageNo += 1; });
    doc.on('data', (x) => chunks.push(x));
    doc.on('end', () => resolve(presign ? { buffer: Buffer.concat(chunks), sigZones } : Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const left = 46;
    const contentW = W - 92;
    const gap = 20;
    const colW = (contentW - gap) / 2;
    const x1 = left;
    const x2 = left + colW + gap;

    const pax = Array.isArray(d.passengers) && d.passengers.length
      ? d.passengers
      : [{ name: d.name || '—' }];
    const inc = incidentLabels(d.incident);
    const sigFr = fmtDate(d.signedAt, 'fr');
    const sigEn = fmtDate(d.signedAt, 'en');
    // En presign, aucune date de signature n'existe encore : l'en-tête porte la date d'établissement (aujourd'hui).
    const _todayIso = new Date().toISOString();
    const headDateFr = presign ? fmtDate(_todayIso, 'fr') : sigFr;
    const routeTxt = [d.depAirport, d.arrAirport].filter(Boolean).join(' - ') || (d.route || '—');

    // ── En-tête épuré (document officiel, pas bannière web) : marque à gauche,
    //    réf + date à droite, filet vert, beaucoup d'air.
    doc.moveTo(left, 42).lineTo(left + 22, 52).lineWidth(2.5).stroke(NEON);
    doc.polygon([left + 22, 52], [left + 15.5, 48], [left + 17, 55.5]).fill(NEON);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(19).text('Robin des Airs', left + 30, 38);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text("Cessionnaire / Assignee — Recouvrement d'indemnités aériennes CE 261/2004", left + 31, 62, { width: contentW - 150 });
    doc.fillColor(GRAY).font('Helvetica').fontSize(7.5).text('RÉF. DOSSIER / FILE REF', left, 40, { width: contentW, align: 'right', characterSpacing: 0.5 });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(`${d.ref || '—'}`, left, 50, { width: contentW, align: 'right' });
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(`Fait le / Date : ${headDateFr}`, left, 64, { width: contentW, align: 'right' });
    doc.moveTo(left, 86).lineTo(W - left, 86).lineWidth(1.2).stroke(NEON);

    // ── Titre
    doc.y = 104;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(15)
      .text('CESSION DE CRÉANCES ET PRÉTENTIONS', left, doc.y, { width: contentW, align: 'center', characterSpacing: 0.3 });
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(10.5)
      .text('Assignment of claims and rights', left, doc.y + 3, { width: contentW, align: 'center' });

    // ── Encadré vol
    doc.y += 14;
    const volTop = doc.y;
    const volH = 40;
    doc.roundedRect(left, volTop, contentW, volH, 5).fillAndStroke(OFF, BORDER);
    const volLine1 = `Vol / Flight ${d.flightNum || '—'}   ·   ${d.flightDate || '—'}   ·   ${routeTxt}${d.pnr ? `   ·   PNR ${d.pnr}` : ''}`;
    const volLine2 = `Compagnie / Air carrier : ${d.airline || '—'}   ·   Irrégularité / Disruption : ${inc.fr} / ${inc.en}`;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(volLine1, left + 12, volTop + 9, { width: contentW - 24 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(8.8).text(volLine2, left + 12, volTop + 23, { width: contentW - 24 });
    doc.y = volTop + volH + 16;

    // ── En-têtes de colonnes
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.2);
    doc.text('VERSION FRANÇAISE — FAIT FOI', x1, doc.y, { width: colW, characterSpacing: 0.4 });
    doc.text('ENGLISH VERSION — COURTESY TRANSLATION', x2, doc.y - doc.currentLineHeight(), { width: colW, characterSpacing: 0.4 });
    doc.y += 8;

    // ── Paragraphes bilingues synchronisés (aérés : lineGap + espace inter-sections)
    const FS = 8.5;
    const LG = 0.8;
    function bilingual(frTitle, frBody, enTitle, enBody) {
      const yStart = doc.y;
      const titleH = 12;
      doc.font('Helvetica').fontSize(FS);
      const hFr = doc.heightOfString(frBody, { width: colW, align: 'justify', lineGap: LG });
      const hEn = doc.heightOfString(enBody, { width: colW, align: 'justify', lineGap: LG });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(FS + 0.5).text(frTitle, x1, yStart, { width: colW });
      doc.fillColor(TEXT).font('Helvetica').fontSize(FS).text(frBody, x1, yStart + titleH, { width: colW, align: 'justify', lineGap: LG });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(FS + 0.5).text(enTitle, x2, yStart, { width: colW });
      doc.fillColor(TEXT).font('Helvetica').fontSize(FS).text(enBody, x2, yStart + titleH, { width: colW, align: 'justify', lineGap: LG });
      doc.y = yStart + titleH + Math.max(hFr, hEn) + 9;
    }

    bilingual(
      '1. Parties',
      `D'une part, les passagers désignés ci-dessous (les « Cédants ») ; d'autre part, Robin des Airs, SASU en cours d'immatriculation au RCS de Paris, service de recouvrement d'indemnités aériennes (le « Cessionnaire »).`,
      '1. Parties',
      `On the one hand, the passengers listed below (the "Assignors"); on the other hand, Robin des Airs, a French simplified joint-stock company (SASU) being registered with the Paris Trade & Companies Register, an air-passenger claims recovery service (the "Assignee").`
    );

    bilingual(
      '2. Cession',
      `Par contrat signé électroniquement, les Cédants ont cédé au Cessionnaire, avec effet immédiat, toutes leurs créances et prétentions au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire art. 7, remboursement des frais art. 9) nées de l'irrégularité du vol ci-dessus. Le Cessionnaire agit en son nom propre (art. 1321 à 1324 C. civ.).`,
      '2. Assignment',
      `By an electronically signed agreement, the Assignors assigned to the Assignee, with immediate effect, all their claims and rights under Regulation (EC) No 261/2004 (compensation Art. 7, expense reimbursement Art. 9) arising from the disruption of the flight above. The Assignee acts in its own name (Art. 1321-1324 French Civil Code).`
    );

    bilingual(
      '3. Signature électronique',
      presign
        ? `Le présent acte est signé électroniquement par chaque cédant via Yousign, prestataire de services de confiance (Règlement eIDAS, art. 25 ; art. 1366 C. civ.). La date et le certificat de signature figurent dans le dossier de preuve Yousign, disponible sur demande.`
        : `Contrat signé électroniquement le ${sigFr} via Yousign, prestataire de services de confiance (Règlement eIDAS, art. 25 ; art. 1366 C. civ.).${d.certId ? ` Certificat n° ${d.certId}.` : ''} Dossier de preuve et copie intégrale du contrat disponibles sur demande.`,
      '3. Electronic signature',
      presign
        ? `This deed is signed electronically by each assignor via Yousign, a qualified trust service provider (eIDAS Regulation, Art. 25; Art. 1366 French Civil Code). The signing date and certificate are recorded in the Yousign evidence file, available upon request.`
        : `Agreement signed electronically on ${sigEn} via Yousign, a qualified trust service provider (eIDAS Regulation, Art. 25; Art. 1366 French Civil Code).${d.certId ? ` Certificate No ${d.certId}.` : ''} Evidence file and full copy of the agreement available upon request.`
    );

    const contactEmail = `${String(d.ref || '').trim() || 'contact'}@robindesairs.eu`;
    bilingual(
      '4. Notification (art. 1324 C. civ.)',
      `Le présent document vaut notification de la cession à la compagnie : à compter de sa réception, seul un paiement effectué au Cessionnaire est libératoire. Correspondance : ${contactEmail}. Les clauses restreignant la cession des créances CE 261/2004 sont inopposables (art. 15 du Règlement ; CJUE, 6 févr. 2025, C-11/23).`,
      '4. Notice (Art. 1324 Civil Code)',
      `This document is formal notice of the assignment to the carrier: upon receipt, only payment made to the Assignee discharges the debtor. Correspondence: ${contactEmail}. Clauses restricting the assignment of EC 261/2004 claims are unenforceable (Art. 15; CJEU, 29 Feb. 2024, C-11/23).`
    );

    // ── Tableau des cédants (pleine largeur, entêtes bilingues)
    doc.y += 5;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text('Cédants / Assignors', left, doc.y, { width: contentW });
    doc.y += 5;
    const rowPad = 6;
    pax.forEach((p) => {
      const yR = doc.y;
      const nomTxt = p.name || '—';
      const infoBits = [];
      if (p.dob) infoBits.push(`né(e) le / born ${p.dob}${p.birth ? ` à / in ${p.birth}` : ''}`);
      if (d.showAddress && p.adresse) infoBits.push(`domicile / address : ${String(p.adresse).replace(/\s*\n\s*/g, ', ')}`);
      const sigTxt = p.minor
        ? (presign
            ? `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} — part non cédée (mandat, art. 9 bis)`
            : `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} — signé élec. le ${sigFr}`)
        : (presign
            ? `Signature électronique ci-dessous / Electronic signature below`
            : `Signé électroniquement le ${sigFr} / Signed electronically on ${sigEn}`);
      doc.font('Helvetica').fontSize(7.8);
      // Signature dessinée (mode post-signature) : tamponnée à droite de la ligne de l'adulte.
      const sig = (!presign && !p.minor) ? sigBuffer(p.signatureImg) : null;
      const textW = sig ? contentW - 150 : contentW - 20;
      const line2 = [infoBits.join(' · '), sigTxt].filter(Boolean).join(' — ');
      const h = Math.max(sig ? 46 : 0, 12 + doc.heightOfString(line2, { width: textW }) + rowPad * 2 - 4);
      doc.roundedRect(left, yR, contentW, h, 4).fillAndStroke('#FFFFFF', BORDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.8).text(nomTxt, left + 10, yR + rowPad, { width: textW });
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.8).text(line2, left + 10, yR + rowPad + 11, { width: textW });
      if (sig) { try { doc.image(sig, left + contentW - 128, yR + (h - 30) / 2, { fit: [116, 30] }); } catch (_) {} }
      doc.y = yR + h + 5;
    });

    // ── Clause finale (langue faisant foi)
    doc.y += 6;
    doc.fillColor(TEXT).font('Helvetica-Oblique').fontSize(7.8).text(
      "Fait à distance, par voie électronique. En cas de divergence d'interprétation, la version française prévaut sur la version anglaise. / Executed remotely by electronic means. In the event of any discrepancy, the French version shall prevail over the English version.",
      left, doc.y, { width: contentW, align: 'center', lineGap: 1.5 }
    );
    // ── Renvoi CGV (façon AirHelp)
    doc.y += 5;
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.2).text(
      "* Les termes de ce document ont la signification définie dans les Conditions générales sur robindesairs.eu, acceptées par les Cédants. / * Terms herein have the meaning defined in the Terms & Conditions on robindesairs.eu, accepted by the Assignors.",
      left, doc.y, { width: contentW, align: 'center', lineGap: 1.5 }
    );

    // ── PRESIGN : bande de signatures (une zone par cédant ADULTE), coordonnées rapportées à yousign-init.
    // Chaque zone = boîte étiquetée où Yousign posera le widget signature. Les mineurs ne signent pas
    // (part non cédée, art. 9 bis) : leur parent adulte signataire couvre le mandat d'encaissement.
    if (presign) {
      const adultes = pax.filter((p) => !p.minor);
      const boxW = 210, boxH = 58, labelH = 12, blockH = labelH + boxH + 14;
      doc.y += 14;
      if (doc.y + 18 + blockH > doc.page.height - 46) { doc.addPage(); doc.y = 46; }
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text("Signatures des cédants / Assignors' signatures", left, doc.y, { width: contentW });
      doc.y += 6;
      let rowTop = doc.y; // top de la rangée courante, STABLE (doc.text ferait dériver doc.y entre colonnes)
      adultes.forEach((p, k) => {
        if (k % 2 === 0) { // début d'une nouvelle rangée
          if (rowTop + blockH > doc.page.height - 40) { doc.addPage(); rowTop = 46; }
        }
        const bx = left + (k % 2) * (colW + gap);
        const boxY = rowTop + labelH;
        doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(`Signature de ${p.name || '—'}`, bx, rowTop, { width: boxW });
        doc.roundedRect(bx, boxY, boxW, boxH, 5).lineWidth(1).stroke(BORDER);
        // Coordonnées PDF (origine haut-gauche, points) rapportées telles quelles → Yousign v3.
        sigZones.push({ name: p.name || '', page: pageNo, x: Math.round(bx), y: Math.round(boxY + 6), w: boxW, h: boxH - 12 });
        // Fin de rangée (2e colonne ou dernier) → on descend d'un bloc.
        if (k % 2 === 1 || k === adultes.length - 1) { rowTop = boxY + boxH + 12; doc.y = rowTop; }
      });
    }

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
