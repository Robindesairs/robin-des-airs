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
const MINT   = '#EFF9F4';   // fond vert pale (encarts rassurants)
const GREEN_T= '#047857';   // vert TEXTE lisible (contraste AA sur fond clair)

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
    const headDateEn = presign ? fmtDate(_todayIso, 'en') : sigEn;
    const routeTxt = [d.depAirport, d.arrAirport].filter(Boolean).join(' - ') || (d.route || '—');

    // ── En-tête épuré (document officiel, pas bannière web) : marque à gauche,
    //    réf + date à droite, filet vert, beaucoup d'air.
    doc.moveTo(left, 42).lineTo(left + 22, 52).lineWidth(2.5).stroke(NEON);
    doc.polygon([left + 22, 52], [left + 15.5, 48], [left + 17, 55.5]).fill(NEON);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(19).text('Robin des Airs', left + 30, 38);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text("Cessionnaire / Assignee · Recouvrement d'indemnités aériennes (Règlement CE 261/2004)", left + 31, 62, { width: contentW - 150 });
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
    const volLine2 = `Compagnie / Air carrier : ${d.airline || '—'}   ·   Irrégularité / Disruption : retard, annulation ou refus d'embarquement / delay, cancellation or denied boarding`;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(volLine1, left + 12, volTop + 9, { width: contentW - 24 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(8.8).text(volLine2, left + 12, volTop + 23, { width: contentW - 24 });
    doc.y = volTop + volH + 14;

    // ── PRESIGN : bandeau d'engagement. Le client doit voir CE QU'IL GAGNE avant le
    // vocabulaire juridique. Trois chiffres, rien d'autre.
    if (presign) {
      const bT = doc.y, bH = 70, cw = (contentW - 16) / 3;
      doc.roundedRect(left, bT, contentW, bH, 6).fillAndStroke(MINT, NEON);
      // Le taux DÉPEND de la voie suivie : 75 % à l'amiable, 60 % si le tribunal est saisi.
      // Afficher le seul 75 % sur le document contractuel serait une allégation trompeuse.
      // Les deux taux sont donc annoncés, et la contrepartie du 60 % (frais de procédure à
      // notre charge) est explicitée juste en dessous : la vérité reste un bon argument.
      const tiles = [
        ['75 %', "des sommes récupérées, à l'amiable", 'of amounts recovered, amicable stage'],
        ['60 %', 'si le tribunal doit être saisi', 'if court proceedings are required'],
        ['0 €', "à avancer, et 0 € si rien n'est récupéré", 'upfront, and 0 if nothing is recovered'],
      ];
      tiles.forEach((t, i) => {
        const cx = left + i * (cw + 8);
        doc.fillColor(GREEN_T).font('Helvetica-Bold').fontSize(20).text(t[0], cx + 8, bT + 9, { width: cw - 16, align: 'center' });
        doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(7.4).text(t[1], cx + 8, bT + 34, { width: cw - 16, align: 'center' });
        doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(6.8).text(t[2], cx + 8, bT + 54, { width: cw - 16, align: 'center' });
        if (i < 2) doc.moveTo(cx + cw + 4, bT + 12).lineTo(cx + cw + 4, bT + bH - 12).lineWidth(0.7).stroke(BORDER);
      });
      // Contrepartie du taux réduit, dite noir sur blanc juste sous les chiffres.
      doc.fillColor(TEXT).font('Helvetica').fontSize(7.6).text(
        "Le taux de 60 % s'applique uniquement si la compagnie nous contraint à saisir le tribunal. Les honoraires d'avocat et les frais de procédure sont alors à notre charge, jamais à la vôtre. / The 60 % rate applies only where the carrier forces us to go to court; legal fees and court costs are then borne by us, never by you.",
        left, bT + bH + 6, { width: contentW, align: 'center', lineGap: 0.8 });
      doc.y = bT + bH + 6 + doc.heightOfString("x", { width: contentW }) * 3 + 8;
    }

    // ── En-têtes de colonnes
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.2);
    doc.text('VERSION FRANÇAISE (FAIT FOI)', x1, doc.y, { width: colW, characterSpacing: 0.4 });
    doc.text('ENGLISH VERSION (COURTESY TRANSLATION)', x2, doc.y - doc.currentLineHeight(), { width: colW, characterSpacing: 0.4 });
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
      presign
        ? `D'une part, les passagers désignés ci-dessous (les « Cédants ») ; d'autre part, Robin des Airs, service de recouvrement d'indemnités aériennes basé à Paris, contact@robindesairs.eu (le « Cessionnaire »), agissant en son nom propre et pour son propre compte.`
        : `D'une part, les passagers désignés ci-dessous (les « Cédants ») ; d'autre part, Robin des Airs, SASU en cours d'immatriculation au RCS de Paris, service de recouvrement d'indemnités aériennes, sise 66 avenue des Champs-Élysées, 75008 Paris, contact@robindesairs.eu (le « Cessionnaire »), agissant en son nom propre et pour son propre compte.`,
      '1. Parties',
      presign
        ? `On the one hand, the passengers listed below (the "Assignors"); on the other hand, Robin des Airs, an air-passenger claims recovery service based in Paris, contact@robindesairs.eu (the "Assignee"), acting in its own name and on its own behalf.`
        : `On the one hand, the passengers listed below (the "Assignors"); on the other hand, Robin des Airs, a French simplified joint-stock company (SASU) being registered with the Paris Trade & Companies Register, an air-passenger claims recovery service, registered office at 66 avenue des Champs-Élysées, 75008 Paris, contact@robindesairs.eu (the "Assignee"), acting in its own name and on its own behalf.`
    );

    // PRESIGN : l'acte est l'instrument SIGNÉ par le client, sa rédaction doit être performative
    // (« les Cédants cèdent »), pas un récit d'un contrat antérieur. La créance est visée « née ou
    // à naître » (art. 1323 al. 2) : la capture peut intervenir AVANT le vol, la créance n'existe
    // alors pas encore. Hors presign, le document redevient le récapitulatif notifié à la compagnie.
    bilingual(
      '2. Cession',
      presign
        ? `Par le présent acte, les Cédants cèdent au Cessionnaire, qui accepte, avec effet immédiat, l'intégralité de leurs créances, nées ou à naître, au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire art. 7, remboursement des frais art. 9) se rapportant à l'irrégularité du vol désigné ci-dessus, ainsi que tous droits et actions accessoires. Le Cessionnaire devient seul titulaire de ces créances et agit en son nom propre et pour son propre compte (art. 1321 à 1324 C. civ.). Le prix de cession et ses modalités figurent aux Conditions générales, acceptées par les Cédants et annexées au présent acte.`
        : `Par contrat signé électroniquement, les Cédants ont cédé au Cessionnaire, avec effet immédiat, toutes leurs créances et prétentions, nées ou à naître, au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire art. 7, remboursement des frais art. 9) se rapportant à l'irrégularité du vol ci-dessus. Le Cessionnaire agit en son nom propre (art. 1321 à 1324 C. civ.).`,
      '2. Assignment',
      presign
        ? `By this deed, the Assignors assign to the Assignee, who accepts, with immediate effect, all of their claims, present or future, under Regulation (EC) No 261/2004 (compensation Art. 7, expense reimbursement Art. 9) relating to the disruption of the flight identified above, together with all ancillary rights and actions. The Assignee becomes the sole holder of those claims and acts in its own name and on its own behalf (Art. 1321-1324 French Civil Code). The assignment price and its terms are set out in the Terms and Conditions, accepted by the Assignors and appended to this deed.`
        : `By an electronically signed agreement, the Assignors assigned to the Assignee, with immediate effect, all their claims and rights, present or future, under Regulation (EC) No 261/2004 (compensation Art. 7, expense reimbursement Art. 9) arising from the disruption of the flight above. The Assignee acts in its own name (Art. 1321-1324 French Civil Code).`
    );

    // Le pavé eIDAS n'a aucune valeur pédagogique pour le signataire : il alourdit et refroidit.
    // En presign il est remplacé par une phrase unique posée sous les zones de signature.
    if (!presign) bilingual(
      '4. Signature électronique',
      presign
        ? `Le présent acte est signé électroniquement par chaque cédant via Yousign, prestataire de services de confiance (Règlement eIDAS, art. 25 ; art. 1366 C. civ.). La date et le certificat de signature figurent dans le dossier de preuve Yousign, disponible sur demande.`
        : `Contrat signé électroniquement le ${sigFr} via Yousign, prestataire de services de confiance (Règlement eIDAS, art. 25 ; art. 1366 C. civ.).${d.certId ? ` Certificat n° ${d.certId}.` : ''} Dossier de preuve et copie intégrale du contrat disponibles sur demande.`,
      '4. Electronic signature',
      presign
        ? `This deed is signed electronically by each assignor via Yousign, a qualified trust service provider (eIDAS Regulation, Art. 25; Art. 1366 French Civil Code). The signing date and certificate are recorded in the Yousign evidence file, available upon request.`
        : `Agreement signed electronically on ${sigEn} via Yousign, a qualified trust service provider (eIDAS Regulation, Art. 25; Art. 1366 French Civil Code).${d.certId ? ` Certificate No ${d.certId}.` : ''} Evidence file and full copy of the agreement available upon request.`
    );

    const contactEmail = `${String(d.ref || '').trim() || 'contact'}@robindesairs.eu`;
    // La section 4 diffère selon le destinataire réel du document :
    //  - presign  → le CÉDANT signe : on lui rappelle son droit de rétractation (L.221-18 C. conso).
    //    Une notification adressée à la compagnie n'a aucun sens sur l'acte qu'il signe.
    //  - sinon    → le document part à la COMPAGNIE : il vaut notification (art. 1324 C. civ.).
    // Section 4 : réservée au document envoyé à la COMPAGNIE. Sur l'acte que le client signe,
    // une notification adressée au débiteur n'a pas sa place, et le droit de rétractation est
    // exposé en page 2 (« Vos garanties ») dans une langue qu'il comprend.
    if (!presign) {
      bilingual(
        '3. Notification (art. 1324 C. civ.)',
        `Le présent document vaut notification de la cession à la compagnie : à compter de sa réception, seul un paiement effectué au Cessionnaire est libératoire. Correspondance : ${contactEmail}. Les clauses restreignant la cession des créances CE 261/2004 sont inopposables (art. 15 du Règlement ; CJUE, 6 févr. 2025, C-11/23).`,
        '3. Notice (Art. 1324 Civil Code)',
        `This document is formal notice of the assignment to the carrier: upon receipt, only payment made to the Assignee discharges the debtor. Correspondence: ${contactEmail}. Clauses restricting the assignment of EC 261/2004 claims are unenforceable (Art. 15; CJEU, 29 Feb. 2024, C-11/23).`
      );
    }

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
            ? `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} · part non cédée (mandat, art. 9 bis)`
            : `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} · signature du représentant / signed by the representative`)
        : (presign
            ? `Signature électronique ci-dessous / Electronic signature below`
            : `Signé électroniquement le ${sigFr} / Signed electronically on ${sigEn}`);
      doc.font('Helvetica').fontSize(7.8);
      // Signature dessinée (mode post-signature) : tamponnée à droite de la ligne de l'adulte.
      const sig = (!presign && !p.minor) ? sigBuffer(p.signatureImg) : null;
      // PRESIGN : la zone de signature est POSÉE DANS LA LIGNE du cédant, pas dans un bloc séparé
      // en fin de document. Le signataire voit son nom et l'endroit où signer au même endroit, et
      // on économise la page entière que consommait l'ancienne bande de signatures.
      const inlineSig = presign && !p.minor;
      const SIGW = 168, SIGH = 44;
      const textW = (sig || inlineSig) ? contentW - SIGW - 34 : contentW - 20;
      const line2 = [infoBits.join(' · '), sigTxt].filter(Boolean).join('   ·   ');
      const h = Math.max(sig ? 46 : 0, inlineSig ? SIGH + 12 : 0, 12 + doc.heightOfString(line2, { width: textW }) + rowPad * 2 - 4);
      doc.roundedRect(left, yR, contentW, h, 4).fillAndStroke(inlineSig ? MINT : '#FFFFFF', inlineSig ? NEON : BORDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.8).text(nomTxt, left + 10, yR + rowPad, { width: textW });
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.8).text(line2, left + 10, yR + rowPad + 11, { width: textW });
      if (sig) { try { doc.image(sig, left + contentW - 128, yR + (h - 30) / 2, { fit: [116, 30] }); } catch (_) {} }
      if (inlineSig) {
        const bx = left + contentW - SIGW - 12, by = yR + (h - SIGH) / 2;
        doc.roundedRect(bx, by, SIGW, SIGH, 4).fillAndStroke('#FFFFFF', NEON);
        doc.fillColor(GRAY).font('Helvetica').fontSize(6.8).text('Signez ici / Sign here', bx, by + SIGH - 11, { width: SIGW, align: 'center' });
        sigZones.push({ name: p.name || '', page: pageNo, x: Math.round(bx), y: Math.round(by + 4), w: SIGW, h: SIGH - 14 });
      }
      doc.y = yR + h + 5;
    });

    // ── Clause finale (langue faisant foi)
    doc.y += 6;
    if (!presign) doc.fillColor(TEXT).font('Helvetica-Oblique').fontSize(7.8).text(
      "Fait à distance, par voie électronique. En cas de divergence d'interprétation, la version française prévaut sur la version anglaise. / Executed remotely by electronic means. In the event of any discrepancy, the French version shall prevail over the English version.",
      left, doc.y, { width: contentW, align: 'center', lineGap: 1.5 }
    );
    // ── Renvoi CGV (en presign : reporté en page 2 avec les garanties)
    doc.y += 5;
    if (!presign) doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.2).text(
      (presign
        ? `* Les Conditions générales en vigueur au ${headDateFr}, publiées sur robindesairs.eu/cgv, font partie intégrante du présent acte et sont acceptées par les Cédants au moment de la signature. Elles définissent le prix de cession, ses modalités de versement et le droit de rétractation. / * The Terms and Conditions in force on ${headDateEn}, published at robindesairs.eu/cgv, form an integral part of this deed and are accepted by the Assignors upon signature. They set out the assignment price, payment terms and right of withdrawal.`
        : "* Les termes de ce document ont la signification définie dans les Conditions générales sur robindesairs.eu, acceptées par les Cédants. / * Terms herein have the meaning defined in the Terms & Conditions on robindesairs.eu, accepted by the Assignors."),
      left, doc.y, { width: contentW, align: 'center', lineGap: 1.5 }
    );

    // ── PRESIGN : bande de signatures (une zone par cédant ADULTE), coordonnées rapportées à yousign-init.
    // Chaque zone = boîte étiquetée où Yousign posera le widget signature. Les mineurs ne signent pas
    // (part non cédée, art. 9 bis) : leur parent adulte signataire couvre le mandat d'encaissement.
    if (presign) {
      // Une seule phrase à la place du pavé eIDAS.
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.6).text(
        "Signature électronique sécurisée via Yousign, qui en conserve la preuve. / Secure electronic signature via Yousign, which retains the evidence.",
        left, doc.y + 2, { width: contentW, align: 'center' });

      // ══════════ PAGE 2 : ce qui protège le client. Il la garde, elle ne sert pas à signer.
      doc.addPage(); doc.y = 46;
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text('Vos garanties', left, doc.y, { width: contentW });
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text('Your safeguards', left, doc.y + 2, { width: contentW });
      doc.y += 12;

      const gar = [
        ['14 jours pour changer d\'avis', "Vous pouvez vous rétracter sans motif ni frais dans les quatorze jours (art. L.221-18 du Code de la consommation). Le formulaire figure dans les Conditions générales.", 'Fourteen days to withdraw, no reason, no cost.'],
        ['Vous ne payez jamais de votre poche', "Aucune somme ne vous est demandée, ni à la signature, ni pendant la procédure, ni si l'affaire est perdue. Nous sommes rémunérés uniquement sur ce qui est effectivement récupéré.", 'You never pay out of pocket, whatever the outcome.'],
        ['Votre argent est isolé', "Les sommes récupérées transitent par un compte dédié aux fonds clients, distinct de nos comptes d'exploitation, et vous sont reversées par virement ou mobile money.", 'Recovered funds are held in a dedicated client account.'],
        ['Vos documents sont effacés', "Vos pièces d'identité et justificatifs sont supprimés automatiquement trente jours après la clôture du dossier, conformément au RGPD.", 'Your documents are erased 30 days after closure (GDPR).'],
      ];
      const gW = (contentW - 14) / 2;
      const gTop = doc.y;   // base FIGÉE : doc.text() ci-dessous ferait dériver doc.y
      gar.forEach((g, i) => {
        const gx = left + (i % 2) * (gW + 14);
        const gy = gTop + Math.floor(i / 2) * 92;
        doc.roundedRect(gx, gy, gW, 84, 6).fillAndStroke('#FFFFFF', BORDER);
        doc.circle(gx + 16, gy + 17, 6).fill(NEON);
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(g[0], gx + 28, gy + 11, { width: gW - 38 });
        doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(g[1], gx + 12, gy + 32, { width: gW - 24, align: 'justify', lineGap: 0.6 });
        doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.2).text(g[2], gx + 12, gy + 70, { width: gW - 24 });
      });
      doc.y = gTop + 92 * Math.ceil(gar.length / 2) + 10;

      // Ce qui se passe maintenant
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text('Ce qui se passe maintenant', left, doc.y, { width: contentW });
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text('What happens next', left, doc.y + 2, { width: contentW });
      doc.y += 16;
      const etapes = [
        ['1', 'Nous réclamons', "Nous écrivons à la compagnie en notre nom et lui notifions la cession : elle ne peut plus payer qu'entre nos mains."],
        ['2', 'Nous relançons', "Si elle refuse ou garde le silence, nous contestons. Vous n'avez aucune démarche à faire."],
        ['3', 'Nous saisissons le tribunal', "Si nécessaire, notre avocate engage la procédure. Les frais sont à notre charge, jamais à la vôtre."],
        ['4', 'Vous recevez votre argent', "Dès encaissement, votre part vous est versée : 75 % à l'amiable, 60 % si le tribunal a dû être saisi."],
      ];
      etapes.forEach((e) => {
        const ey = doc.y;
        doc.circle(left + 10, ey + 9, 9).fill(NAVY);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(e[0], left + 5, ey + 5, { width: 10, align: 'center' });
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(e[1], left + 26, ey + 1, { width: contentW - 36 });
        doc.fillColor(TEXT).font('Helvetica').fontSize(8.2).text(e[2], left + 26, ey + 13, { width: contentW - 36, lineGap: 0.5 });
        doc.y = ey + 13 + doc.heightOfString(e[2], { width: contentW - 36, lineGap: 0.5 }) + 9;
      });

      // Renvoi CGV horodaté + langue faisant foi
      doc.y += 4;
      doc.roundedRect(left, doc.y, contentW, 46, 5).fillAndStroke(OFF, BORDER);
      doc.fillColor(TEXT).font('Helvetica').fontSize(7.6).text(
        `Les Conditions générales en vigueur au ${headDateFr}, publiées sur robindesairs.eu/cgv, font partie intégrante du présent acte et sont acceptées lors de la signature. Elles définissent le prix de cession, ses modalités de versement et le droit de rétractation. En cas de divergence, la version française prévaut sur la version anglaise.`,
        left + 12, doc.y + 8, { width: contentW - 24, align: 'justify', lineGap: 0.6 });
      doc.y += 54;
    }

    // Pied de page : margins.bottom = 0 pour dessiner sous la zone de texte SANS déclencher
    // la pagination automatique de pdfkit (sinon le footer part seul en page 2).
    doc.page.margins.bottom = 0;
    const footY = doc.page.height - 34;
    doc.rect(0, footY - 8, W, 42).fill(OFF);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7)
      .text(`Robin des Airs · Cession de créance CE 261/2004 · robindesairs.eu · ${contactEmail}` + (d.certId ? ` · Certificat ${d.certId}` : ''), left, footY, { width: contentW, align: 'center', lineBreak: false });

    doc.end();
  });
}

module.exports = { genererActeCessionPdf };
