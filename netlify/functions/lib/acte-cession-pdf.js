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

    // ── En-tête : reprise EXACTE de la présentation de contrat.html, que le fondateur
    // a validée comme référence. Bandeau bleu nuit plein, marque, titre, sous-titre,
    // ligne de référence en mono. Le document imprimé et l'écran doivent se ressembler :
    // un client qui a lu l'écran doit reconnaître ce qu'il signe.
    const HEAD_H = 134;
    doc.roundedRect(left, 40, contentW, HEAD_H, 10).fill(NAVY);

    // Pastille de marque + chevron (même signe que l'écran)
    // Le hibou de la marque, pas un chevron abstrait : c'est le signe que le client
    // reconnait depuis WhatsApp et le site. Repli sur la pastille verte si le fichier
    // manque (le PDF ne doit jamais echouer pour une image).
    try {
      // Version DETOUREE : favicon.png a les coins du carre arrondi remplis de blanc opaque,
      // ce qui dessinait quatre triangles blancs sur le bandeau bleu nuit.
      const _logo = require('path').join(__dirname, '..', '..', '..', 'assets', 'images', 'robin-hibou-transparent.png');
      require('fs').accessSync(_logo);
      doc.image(_logo, left + 18, 50, { fit: [26, 26] });
    } catch (_) {
      doc.roundedRect(left + 18, 52, 22, 22, 6).fill(NEON);
      doc.moveTo(left + 24, 59).lineTo(left + 32, 63).lineWidth(1.8).stroke(NAVY);
      doc.polygon([left + 34, 64], [left + 28.5, 61], [left + 29.5, 68]).fill(NAVY);
    }

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('Robin des Airs', left + 47, 57);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(19)
      .text('Contrat de cession de créance', left + 18, 78, { width: contentW - 36 });
    doc.fillColor('#9FB2CC').font('Helvetica').fontSize(9.5)
      .text('Assignment of claim agreement · Règlement (CE) n° 261/2004 · Articles 1321 et suivants du Code civil',
            left + 18, 100, { width: contentW - 36 });
    // Traduction en clair du titre juridique. Les DEUX taux sont annonces : « vous recevez
    // 75 % » seul serait trompeur des que le tribunal est saisi, et c'est precisement le
    // defaut qui avait fait supprimer le bandeau des chiffres.
    const _clairFr = "En clair : vous nous vendez votre indemnité, nous la récupérons à nos frais, vous recevez 75 % (60 % au tribunal).";
    const _clairEn = "In short: you sell us your compensation, we recover it at our own cost, you receive 75 % (60 % in court).";
    doc.font('Helvetica-Bold').fontSize(8.6);
    const _hFr = doc.heightOfString(_clairFr, { width: contentW - 36 });
    doc.fillColor(NEON_B).text(_clairFr, left + 18, 114, { width: contentW - 36 });
    doc.fillColor('#8FA3BE').font('Helvetica-Oblique').fontSize(7.4)
      .text(_clairEn, left + 18, 114 + _hFr + 1, { width: contentW - 36 });

    doc.fillColor('#C3D0E0').font('Courier').fontSize(8)
      .text(`Dossier ${d.ref || '—'} · établi le / issued on ${headDateFr}`, left + 18, 114 + _hFr + 13, { width: contentW - 36 });

    // ── Les deux parties, côte à côte, séparées d'un filet (comme l'écran)
    let y = 40 + HEAD_H + 12;
    const pcW = (contentW - 24) / 2;
    const party = (x, label, labelEn, nom, lignes) => {
      doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.2)
        .text(`${label} / ${labelEn}`, x, y, { width: pcW, characterSpacing: 0.6 });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text(nom, x, y + 12, { width: pcW });
      doc.fillColor(GRAY).font('Helvetica').fontSize(8.2)
        .text(lignes.filter(Boolean).join('\n'), x, y + 28, { width: pcW, lineGap: 1.2 });
    };
    const cedantNom = (pax[0] && pax[0].name) || d.name || '—';
    const cedantAdr = d.showAddress && pax[0] && pax[0].adresse ? String(pax[0].adresse) : '';
    party(left, 'LE CÉDANT', 'THE ASSIGNOR', cedantNom,
      [cedantAdr, pax.length > 1 ? `et ${pax.length - 1} autre(s) passager(s) ci-dessous / and ${pax.length - 1} more below` : '']);
    party(left + pcW + 24, 'LE CESSIONNAIRE', 'THE ASSIGNEE', 'Robin des Airs',
      ["SASU en cours d'immatriculation au RCS de Paris",
       'Service recouvrement CE 261/2004 · agit en son nom propre',
       'contact@robindesairs.eu']);
    const pH = Math.max(
      doc.heightOfString([cedantAdr].filter(Boolean).join('\n'), { width: pcW }),
      doc.heightOfString("SASU en cours d'immatriculation au RCS de Paris\nService recouvrement CE 261/2004 · agit en son nom propre\ncontact@robindesairs.eu", { width: pcW, lineGap: 1.2 })
    );
    doc.moveTo(left + pcW + 12, y - 2).lineTo(left + pcW + 12, y + 28 + pH).lineWidth(0.8).stroke(BORDER);
    y += 28 + pH + 12;

    // ── Carte « Le dossier, en clair » : grille de 6 cases, reprise de l'écran
    const cardTop = y;
    const cellW = (contentW - 2) / 2, cellH = 29;
    const cells = [
      ['TRAJET / ROUTE', routeTxt],
      ['VOYAGE COMMENÇANT LE / JOURNEY FROM', d.flightDate || '—'],
      ['VOL(S) / FLIGHT(S)', d.flightNum || '—'],
      ['RÉSERVATION / BOOKING', d.pnr || '—'],
      // Le debiteur de la creance est le transporteur EFFECTIF (art. 2 b du reglement,
      // arret Wirth C-532/17), pas celui qui a vendu le billet. Sur un partage de code, un
      // Paris-Dakar vendu sous numero American Airlines mais opere par Air France a pour
      // debiteur Air France. Le libelle nomme donc la bonne qualite, ce qui protege l'acte
      // meme si la saisie a retenu le transporteur commercial.
      // On n'inscrit JAMAIS de nom de societe : sur un partage de code, le systeme deduit la
      // compagnie du numero de vol et retiendrait le transporteur COMMERCIAL. Un nom faux sur
      // un acte signe se plaide ; un nom absent ne coute rien, la clause designant deja le vol.
      ['TRANSPORTEUR(S) EFFECTIF(S) / OPERATING CARRIER(S)',
       'voir le voyage ci-dessus / see journey above'],
      ['INDEMNITÉ VISÉE / SOUGHT', "jusqu'à 600 € / up to €600"],
    ];
    const cardH = 22 + cellH * (cells.length / 2);
    doc.roundedRect(left, cardTop, contentW, cardH, 8).fillAndStroke(OFF, BORDER);
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.6)
      .text('LE DOSSIER, EN CLAIR / YOUR FILE AT A GLANCE', left + 14, cardTop + 9, { width: contentW - 28, characterSpacing: 0.6 });
    cells.forEach((c, k) => {
      const cx = left + (k % 2) * cellW;
      const cy = cardTop + 26 + Math.floor(k / 2) * cellH;
      doc.rect(cx, cy, cellW, cellH).stroke(BORDER);
      doc.fillColor(GRAY).font('Helvetica').fontSize(6.6).text(c[0], cx + 12, cy + 7, { width: cellW - 24, characterSpacing: 0.4 });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(c[1], cx + 12, cy + 17, { width: cellW - 24, lineBreak: false });
    });
    doc.y = cardTop + cardH + 10;

    // Irrégularité : motif GÉNÉRIQUE, jamais le motif exact (la cause est souvent inconnue
    // au moment de la signature, et une cause erronée sur l'acte se retourne contre nous).
    doc.fillColor(TEXT).font('Helvetica').fontSize(8)
      .text("Irrégularité / Disruption : retard, annulation ou refus d'embarquement / delay, cancellation or denied boarding",
            left, doc.y, { width: contentW });
    doc.y += 11;
    // La créance est identifiée par LE VOL, jamais par un nom de société. Sur un partage de
    // code, le billet porte le numéro du transporteur commercial alors que le débiteur est
    // l'opérateur réel : nommer une société à la signature reviendrait à figer une erreur
    // dans un acte qu'on ne peut plus corriger. Le nom affiché n'est donc qu'indicatif.
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.4)
      .text("La créance cédée est celle détenue contre le ou les transporteurs ayant effectivement opéré le voyage identifié ci-dessus (numéros de vol, date, trajet), quel que soit le transporteur commercial figurant sur le billet. Sous réservation unique, la cession couvre tout le voyage et peut être exercée contre le transporteur du premier segment (CJUE, C-11/11 et C-502/18). / The assigned claim is held against the carrier or carriers that actually operated the journey identified above (flight numbers, date, route), whatever the marketing carrier on the ticket. Under a single booking, the assignment covers the whole journey and may be enforced against the carrier of the first leg (CJEU, C-11/11 and C-502/18).",
            left, doc.y, { width: contentW, align: 'justify', lineGap: 0.4 });
    doc.y += 30;


    // ── En-têtes de colonnes
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.2);
    doc.text('VERSION FRANÇAISE (FAIT FOI)', x1, doc.y, { width: colW, characterSpacing: 0.4 });
    doc.text('ENGLISH VERSION (COURTESY TRANSLATION)', x2, doc.y - doc.currentLineHeight(), { width: colW, characterSpacing: 0.4 });
    doc.y += 8;

    // ── Paragraphes bilingues synchronisés (aérés : lineGap + espace inter-sections)
    const FS = 8.5;
    const LG = 0.8;
    function bilingual(frTitle, frBody, enTitle, enBody) {
      let yStart = doc.y;
      const titleH = 12;
      doc.font('Helvetica').fontSize(FS);
      const hFr = doc.heightOfString(frBody, { width: colW, align: 'justify', lineGap: LG });
      const hEn = doc.heightOfString(enBody, { width: colW, align: 'justify', lineGap: LG });
      // Un bloc bilingue ne doit JAMAIS se couper : sinon pdfkit pagine au milieu et la
      // colonne francaise se retrouve sur une page, l'anglaise sur la suivante. On decide
      // du saut AVANT de dessiner, hauteur des deux colonnes connue.
      if (yStart + titleH + Math.max(hFr, hEn) > doc.page.height - 46) {
        doc.addPage(); doc.y = 46; yStart = doc.y;
      }
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
        ? `Par le présent acte, les Cédants cèdent au Cessionnaire, qui accepte, avec effet immédiat, l'intégralité de leurs créances, nées ou à naître, au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire art. 7, remboursement des frais art. 9) se rapportant à l'irrégularité du vol identifié ci-dessus (numéro, date, trajet), ainsi que tous droits et actions accessoires. Le Cessionnaire devient seul titulaire de ces créances et agit en son nom propre et pour son propre compte (art. 1321 à 1324 C. civ.). Le prix de cession et ses modalités figurent aux Conditions générales, acceptées par les Cédants et annexées au présent acte.`
        : `Par contrat signé électroniquement, les Cédants ont cédé au Cessionnaire, avec effet immédiat, toutes leurs créances et prétentions, nées ou à naître, au titre du Règlement (CE) n° 261/2004 (indemnité forfaitaire art. 7, remboursement des frais art. 9) se rapportant à l'irrégularité du vol ci-dessus. Le Cessionnaire agit en son nom propre (art. 1321 à 1324 C. civ.).`,
      '2. Assignment',
      presign
        ? `By this deed, the Assignors assign to the Assignee, who accepts, with immediate effect, all of their claims, present or future, under Regulation (EC) No 261/2004 (compensation Art. 7, expense reimbursement Art. 9) relating to the disruption of the flight identified above (number, date, route), together with all ancillary rights and actions. The Assignee becomes the sole holder of those claims and acts in its own name and on its own behalf (Art. 1321-1324 French Civil Code). The assignment price and its terms are set out in the Terms and Conditions, accepted by the Assignors and appended to this deed.`
        : `By an electronically signed agreement, the Assignors assigned to the Assignee, with immediate effect, all their claims and rights, present or future, under Regulation (EC) No 261/2004 (compensation Art. 7, expense reimbursement Art. 9) arising from the disruption of the flight above. The Assignee acts in its own name (Art. 1321-1324 French Civil Code).`
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

    // Le pavé eIDAS n'a aucune valeur pédagogique pour le signataire : il alourdit et refroidit.
    // En presign il est remplacé par une phrase unique posée sous les zones de signature.
    if (!presign) bilingual(
      '4. Signature électronique',
      presign
        ? `Le présent acte est signé électroniquement par chaque cédant via Yousign, prestataire de services de confiance (Règlement eIDAS, art. 25 ; art. 1366 C. civ.). La date et le certificat de signature figurent dans le dossier de preuve Yousign, disponible sur demande.`
        : `Signé électroniquement le ${sigFr} via Yousign (eIDAS art. 25 ; art. 1366 C. civ.).${d.certId ? ` Certificat n° ${d.certId}.` : ''} Dossier de preuve sur demande.`,
      '4. Electronic signature',
      presign
        ? `This deed is signed electronically by each assignor via Yousign, a qualified trust service provider (eIDAS Regulation, Art. 25; Art. 1366 French Civil Code). The signing date and certificate are recorded in the Yousign evidence file, available upon request.`
        : `Signed electronically on ${sigEn} via Yousign (eIDAS Art. 25; Art. 1366 French Civil Code).${d.certId ? ` Certificate No ${d.certId}.` : ''} Evidence file on request.`
    );

    {
      // ══════════ PAGE 2 : ce qui protège le client, dans les DEUX variantes.
      // Sur l'acte signé, la page 2 ne contenait que la clause finale : quelques lignes
      // perdues sur une feuille blanche. Les garanties la remplissent et donnent au
      // document sa raison d'être côté client.
      doc.addPage(); doc.y = 46;
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('Vos garanties', left, doc.y, { width: contentW });
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text('Your safeguards', left, doc.y + 2, { width: contentW });
      doc.y += 12;

      // Une garantie = un encadré pleine largeur, coupé en DEUX COLONNES : français à gauche,
      // anglais à droite, exactement l'idiome du reste du document. Le client anglophone lit
      // ses protections dans sa langue, et la compagnie destinataire aussi.
      const gar = [
        ['14 jours pour changer d\'avis',
         "Vous pouvez vous rétracter sans motif ni frais dans les quatorze jours (art. L.221-18 du Code de la consommation). Le formulaire figure dans les Conditions générales.",
         'Fourteen days to change your mind',
         'You may withdraw within fourteen days, without giving reasons and at no cost (Art. L.221-18 French Consumer Code). The form is set out in the Terms and Conditions.'],
        ['Vous ne payez jamais de votre poche',
         "Aucune somme ne vous est demandée, ni à la signature, ni pendant la procédure, ni si l'affaire est perdue. Nous sommes rémunérés uniquement sur ce qui est effectivement récupéré.",
         'You never pay out of pocket',
         'No sum is ever asked of you: not at signature, not during the proceedings, not if the case is lost. We are paid solely out of what is actually recovered.'],
        ['Votre argent est isolé',
         "Les sommes récupérées transitent par un compte dédié aux fonds clients, distinct de nos comptes d'exploitation, et vous sont reversées par virement ou mobile money.",
         'Your money is ring-fenced',
         'Recovered sums pass through a dedicated client account, separate from our operating accounts, and are paid to you by bank transfer or mobile money.'],
        ['Vos documents sont effacés',
         "Vos pièces d'identité et justificatifs sont supprimés automatiquement trente jours après la clôture du dossier, conformément au RGPD.",
         'Your documents are erased',
         'Your identity papers and supporting documents are deleted automatically thirty days after the file is closed, in accordance with the GDPR.'],
      ];
      const gcW = (contentW - 26) / 2;
      gar.forEach((g) => {
        const hFr = doc.heightOfString(g[1], { width: gcW - 24, lineGap: 0.6 });
        const hEn = doc.heightOfString(g[3], { width: gcW - 24, lineGap: 0.6 });
        const gh = 23 + Math.max(hFr, hEn);
        if (doc.y + gh > doc.page.height - 60) { doc.addPage(); doc.y = 46; }
        const gy = doc.y;
        doc.roundedRect(left, gy, contentW, gh, 6).fillAndStroke('#FFFFFF', BORDER);
        doc.circle(left + 16, gy + 15, 5).fill(NEON);
        doc.moveTo(left + gcW + 13, gy + 10).lineTo(left + gcW + 13, gy + gh - 10).lineWidth(0.7).stroke(BORDER);
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.2).text(g[0], left + 28, gy + 10, { width: gcW - 40 });
        doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(g[1], left + 12, gy + 24, { width: gcW - 24, align: 'justify', lineGap: 0.6 });
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.2).text(g[2], left + gcW + 26, gy + 10, { width: gcW - 26 });
        doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(g[3], left + gcW + 26, gy + 24, { width: gcW - 26, align: 'justify', lineGap: 0.6 });
        doc.y = gy + gh + 5;
      });

      // Ce qui se passe maintenant
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('Ce qui se passe maintenant', left, doc.y, { width: contentW });
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text('What happens next', left, doc.y + 2, { width: contentW });
      doc.y += 13;
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
        doc.y = ey + 12 + doc.heightOfString(e[2], { width: contentW - 36, lineGap: 0.5 }) + 4;
      });

      // Renvoi CGV horodaté + langue faisant foi
      doc.y += 4;
      doc.roundedRect(left, doc.y, contentW, 40, 5).fillAndStroke(OFF, BORDER);
      doc.fillColor(TEXT).font('Helvetica').fontSize(7.6).text(
        `Les Conditions générales en vigueur au ${headDateFr}, publiées sur robindesairs.eu/cgv, font partie intégrante du présent acte et sont acceptées lors de la signature. Elles définissent le prix de cession, ses modalités de versement et le droit de rétractation. En cas de divergence, la version française prévaut sur la version anglaise.`,
        left + 12, doc.y + 8, { width: contentW - 24, align: 'justify', lineGap: 0.6 });
      doc.y += 48;
    }

    // ══════════ SIGNATURES : reportees APRES les garanties pour que tout tienne
    // sur deux pages. Le client lit l'acte, ses protections, puis signe. Au-dela de cinq ou
    // six cedants, le tableau deborde naturellement sur une page supplementaire.
    // ── Tableau des cédants (pleine largeur, entêtes bilingues)
    doc.y += 5;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text('Cédants / Assignors', left, doc.y, { width: contentW });
    doc.y += 5;
    const rowPad = 6;
    // pdfkit pagine TOUT SEUL dès qu'un doc.text() dépasse la marge basse, mais les
    // roundedRect() dessinés en absolu restent sur la page précédente : la ligne se retrouve
    // coupée en deux. On neutralise la pagination auto le temps du tableau et on décide des
    // sauts nous-mêmes, hauteur de ligne calculée AVANT de dessiner.
    const _mb = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    // Au-dela de 2 cedants, les lignes passent sur DEUX COLONNES : une famille de 5 ou 6
    // tient alors sur la meme page que les garanties, ce qui maintient l'acte a 2 pages.
    const deuxCol = pax.filter((x) => !x.minor).length > 2;
    let _yRow = 0;
    pax.forEach((p, idx) => {
      let yR = doc.y;
      const nomTxt = p.name || '—';
      const infoBits = [];
      if (p.dob) infoBits.push(`né(e) le / born ${p.dob}${p.birth ? ` à / in ${p.birth}` : ''}`);
      if (d.showAddress && p.adresse) infoBits.push(`domicile / address : ${String(p.adresse).replace(/\s*\n\s*/g, ', ')}`);
      const sigTxt = p.minor
        ? (presign
            ? `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} · part non cédée, encaissement selon l'art. 9 bis des CGV / share not assigned, collected under Art. 9 bis of the T&C`
            : `Mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'} / Minor, rep. by ${p.legalRepName || 'legal guardian'} · signature du représentant / signed by the representative`)
        : (presign
            ? `Signature électronique ci-dessous / Electronic signature below`
            : `Signé électroniquement le ${sigFr} / Signed electronically on ${sigEn}`);
      doc.font('Helvetica').fontSize(deuxCol ? 7 : 7.8);
      // Signature dessinée (mode post-signature) : tamponnée à droite de la ligne de l'adulte.
      const sig = (!presign && !p.minor) ? sigBuffer(p.signatureImg) : null;
      // PRESIGN : la zone de signature est POSÉE DANS LA LIGNE du cédant, pas dans un bloc séparé
      // en fin de document. Le signataire voit son nom et l'endroit où signer au même endroit, et
      // on économise la page entière que consommait l'ancienne bande de signatures.
      const inlineSig = presign && !p.minor;
      const SIGW = deuxCol ? 92 : 158, SIGH = deuxCol ? 30 : 36;
      const rowW = deuxCol ? (contentW - 10) / 2 : contentW;
      const textW = (sig || inlineSig) ? rowW - SIGW - 30 : rowW - 20;
      const line2 = [infoBits.join(' · '), sigTxt].filter(Boolean).join('   ·   ');
      const h = Math.max(sig ? 46 : 0, inlineSig ? SIGH + 10 : 0, 11 + doc.heightOfString(line2, { width: textW, lineGap: deuxCol ? -0.3 : 0 }) + rowPad * 2 - 5);
      // En deux colonnes, un cédant sur deux ouvre une nouvelle rangée ; l'autre se pose
      // à sa droite, à la même hauteur (yRow figé, doc.y ne bougeant qu'en fin de rangée).
      const col = deuxCol ? (idx % 2) : 0;
      if (col === 0) {
        if (yR + h > doc.page.height - 52) { doc.addPage(); yR = 46; doc.y = yR; }
        _yRow = yR;
      } else {
        yR = _yRow;
      }
      const rx = left + col * (rowW + 10);
      doc.roundedRect(rx, yR, rowW, h, 4).fillAndStroke(inlineSig ? MINT : '#FFFFFF', inlineSig ? NEON : BORDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.8).text(nomTxt, rx + 10, yR + rowPad, { width: textW });
      doc.fillColor(GRAY).font('Helvetica').fontSize(deuxCol ? 7 : 7.8).text(line2, rx + 10, yR + rowPad + 10, { width: textW, lineGap: -0.3 });
      if (sig) { try { doc.image(sig, rx + rowW - 128, yR + (h - 30) / 2, { fit: [116, 30] }); } catch (_) {} }
      if (inlineSig) {
        const bx = rx + rowW - SIGW - 12, by = yR + (h - SIGH) / 2;
        doc.roundedRect(bx, by, SIGW, SIGH, 4).fillAndStroke('#FFFFFF', NEON);
        doc.fillColor(GRAY).font('Helvetica').fontSize(6.5).text('Signez ici / Sign here', bx, by + SIGH - 10, { width: SIGW, align: 'center' });
        sigZones.push({ name: p.name || '', page: pageNo, x: Math.round(bx), y: Math.round(by + 4), w: SIGW, h: SIGH - 13 });
      }
      if (!deuxCol || col === 1 || idx === pax.length - 1) doc.y = yR + h + 5;
    });
    doc.page.margins.bottom = _mb;

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
    // (part non cédée, art. 9 bis) : leur parent adulte signataire couvre l'encaissement de leur part.
    if (presign) {
      // Une seule phrase à la place du pavé eIDAS.
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.6).text(
        "Signature électronique sécurisée via Yousign, qui en conserve la preuve. / Secure electronic signature via Yousign, which retains the evidence.",
        left, Math.min(doc.y + 2, doc.page.height - 58), { width: contentW, align: 'center', lineBreak: false });
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
