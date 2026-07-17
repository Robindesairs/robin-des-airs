/**
 * notification-creance-pdf — COURRIER de NOTIFICATION DE CESSION DE CRÉANCE (une page A4, FR).
 *
 * Document DISTINCT de l'acte de cession :
 *   - l'acte de cession (acte-cession-pdf) = le contrat/preuve du transfert (bilingue, deux colonnes) ;
 *   - CE courrier = la LETTRE formelle adressée à la compagnie qui NOTIFIE la cession (art. 1324 C. civ.),
 *     enjoint de ne payer qu'entre les mains du Cessionnaire (compte dédié) et rappelle l'inopposabilité
 *     des clauses anti-cession. Il accompagne / renvoie à l'acte de cession.
 *
 * Généré APRÈS la signature uniquement (l'endpoint vérifie signed/<ref>). Déterministe, aucun texte IA.
 * Branding aligné sur acte-cession-pdf.js / claim-pdf.js.
 *
 * Tant que la SASU n'est pas immatriculée (env RDA_SIREN absent) → filigrane BROUILLON + mention
 * « en cours d'immatriculation » (ne pas envoyer tel quel). Se lève dès RDA_SIREN posé.
 *
 *   const { genererNotificationCreancePdf } = require('./lib/notification-creance-pdf');
 *   const buffer = await genererNotificationCreancePdf(d);
 */

const PDFDocument = require('pdfkit');

const NAVY = '#0B1F3A';
const NEON = '#00C87A';
const OFF = '#F7F8FA';
const TEXT = '#1a2436';
const GRAY = '#6B7A90';
const BORDER = '#D8DEE8';

function incidentLabel(code) {
  const c = String(code || '').toLowerCase();
  if (c.includes('cancel') || c.includes('annul')) return 'annulation';
  if (c.includes('denied') || c.includes('refus') || c.includes('surbook')) return "refus d'embarquement";
  if (c.includes('miss') || c.includes('correspond')) return 'correspondance manquée';
  return 'retard de plus de trois heures';
}
function incidentLabelEn(code) {
  const c = String(code || '').toLowerCase();
  if (c.includes('cancel') || c.includes('annul')) return 'cancellation';
  if (c.includes('denied') || c.includes('refus') || c.includes('surbook')) return 'denied boarding';
  if (c.includes('miss') || c.includes('correspond')) return 'missed connection';
  return 'delay of more than three hours';
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
 *   ref, certId, signedAt,                       // ISO signature (GATE en amont)
 *   passengers: [{ name, dob, birth, minor, legalRepName }],
 *   airline, flightNum, flightDate, pnr, route, depAirport, arrAirport, incident,
 *   montantPerPax,                               // € par passager (250/400/600) — OBLIGATOIRE, jamais deviné
 *   siren,                                       // '' → BROUILLON ; sinon lève le filigrane
 *   siege,                                       // adresse du siège (art. R.123-237) — requis hors brouillon
 *   signataireNom, signataireQualite,            // personne physique signataire — requis (art. L.210-6)
 *   iban, bankName,                              // compte dédié — requis hors brouillon (art. 1342-6)
 * }
 * @returns {Promise<Buffer>}
 */
function genererNotificationCreancePdf(d) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 46, size: 'A4' });
    doc.on('data', (x) => chunks.push(x));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const left = 46;
    const contentW = W - 92;

    const pax = Array.isArray(d.passengers) && d.passengers.length ? d.passengers : [{ name: d.name || '—' }];
    const isMulti = pax.length > 1;
    const sigFr = fmtDate(d.signedAt, 'fr');
    const sigEn = fmtDate(d.signedAt, 'en');
    const routeTxt = [d.depAirport, d.arrAirport].filter(Boolean).join(' – ') || (d.route || '—');
    const incFr = incidentLabel(d.incident);
    const incEn = incidentLabelEn(d.incident);
    const airline = d.airline || 'la compagnie aérienne';
    const contactEmail = `${String(d.ref || '').trim() || 'contact'}@robindesairs.eu`;
    const siren = String(d.siren || '').trim();
    const draft = !siren;
    const siege = String(d.siege || '').trim();
    const siegePhrase = siege ? `, dont le siège social est situé ${siege}` : '';
    const identiteRDA = siren
      ? `Robin des Airs, SASU au capital social variable, immatriculée au RCS de Paris sous le n° ${siren}${siegePhrase}`
      : `Robin des Airs, SASU en cours d'immatriculation au RCS de Paris${siegePhrase}`;

    // Montant : JAMAIS deviné. Un montant faux (ex. 600 € réclamés sur un vol à 250 €) est plus
    // dommageable qu'une absence de montant : il décrédibilise la lettre et fonde un rejet.
    // L'appelant DOIT le fournir ; à défaut on n'écrit aucun chiffre.
    const mpp = Number(d.montantPerPax);
    const hasMontant = !!mpp && !Number.isNaN(mpp) && mpp > 0;
    const nbPax = pax.length;
    const montantTotal = hasMontant ? mpp * nbPax : 0;
    const montantPhrase = hasMontant
      ? (nbPax > 1
          ? `, soit un montant principal de ${montantTotal} € (${nbPax} passagers × ${mpp} €)`
          : `, soit un montant principal de ${montantTotal} €`)
      : '';

    const cedantPhrase = isMulti
      ? `les passagers désignés ci-dessous (ci-après les « Cédants »)`
      : `${pax[0].name || 'le passager désigné ci-dessous'} (ci-après le « Cédant »)`;
    const ontCede = isMulti ? 'nous ont cédé' : 'nous a cédé';
    const leurSa = isMulti ? 'leurs créances' : 'sa créance';

    // Coordonnées bancaires du compte dédié
    const ibanTxt = String(d.iban || '').trim();
    const bankTxt = String(d.bankName || '').trim();
    const banquePhrase = ibanTxt
      ? `${bankTxt ? bankTxt + ' — ' : ''}IBAN ${ibanTxt}`
      : `coordonnées bancaires du compte dédié communiquées sur simple demande à l'adresse ci-dessus`;

    // ── En-tête (identique à l'acte : marque à gauche, réf + date à droite, filet vert)
    doc.moveTo(left, 42).lineTo(left + 22, 52).lineWidth(2.5).stroke(NEON);
    doc.polygon([left + 22, 52], [left + 15.5, 48], [left + 17, 55.5]).fill(NEON);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(19).text('Robin des Airs', left + 30, 38);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Cessionnaire — Recouvrement d\'indemnités aériennes CE 261/2004', left + 31, 62, { width: contentW - 150 });
    doc.fillColor(GRAY).font('Helvetica').fontSize(7.5).text('RÉF. DOSSIER', left, 40, { width: contentW, align: 'right', characterSpacing: 0.5 });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(`${d.ref || '—'}`, left, 50, { width: contentW, align: 'right' });
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(`Fait le : ${sigFr}`, left, 64, { width: contentW, align: 'right' });
    doc.moveTo(left, 86).lineTo(W - left, 86).lineWidth(1.2).stroke(NEON);

    // ── Destinataire
    doc.y = 100;
    doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text('À l\'attention du Service Réclamations / Service Client', left, doc.y, { width: contentW });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(airline, left, doc.y + 1, { width: contentW });

    // ── Objet
    doc.y += 10;
    const objTop = doc.y;
    doc.roundedRect(left, objTop, contentW, 30, 5).fillAndStroke(OFF, BORDER);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5)
      .text(`Objet : Notification de cession de créance — art. 1324 du Code civil`, left + 12, objTop + 7, { width: contentW - 24 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(8.6)
      .text(`Vol ${d.flightNum || '—'} du ${d.flightDate || '—'} · ${routeTxt}${d.pnr ? ` · PNR ${d.pnr}` : ''}${hasMontant ? ` · ${montantTotal} €` : ''} · Réf. ${d.ref || '—'}`, left + 12, objTop + 19, { width: contentW - 24 });
    doc.y = objTop + 30 + 14;

    // ── Corps (paragraphes justifiés)
    const FS = 9.2;
    const LG = 1.6;
    const para = (txt, opts) => {
      doc.fillColor(TEXT).font('Helvetica').fontSize(FS)
        .text(txt, left, doc.y, Object.assign({ width: contentW, align: 'justify', lineGap: LG }, opts || {}));
      doc.y += 7;
    };

    doc.fillColor(TEXT).font('Helvetica').fontSize(FS).text('Madame, Monsieur,', left, doc.y, { width: contentW });
    doc.y += 8;

    para(`Par la présente, ${identiteRDA} (ci-après le « Cessionnaire »), vous notifie qu'aux termes d'un contrat de cession de créance signé électroniquement le ${sigFr} (via Yousign, prestataire de services de confiance au sens du Règlement eIDAS, art. 25 ; art. 1366 C. civ.)${d.certId ? `, certificat n° ${d.certId}` : ''}, ${cedantPhrase} ${ontCede}, avec effet immédiat, l'intégralité de ${leurSa} détenue${isMulti ? 's' : ''} à votre encontre au titre du Règlement (CE) n° 261/2004, née de l'irrégularité (${incFr}) du vol ${d.flightNum || '—'} du ${d.flightDate || '—'} reliant ${routeTxt}${montantPhrase}.`);

    para(`La cession porte sur l'intégralité de la créance et de ses accessoires : l'indemnité forfaitaire de l'article 7, le droit au remboursement et au réacheminement de l'article 8, la prise en charge et le remboursement des frais de l'article 9, l'indemnisation complémentaire de l'article 12 du Règlement, ainsi que les intérêts et tous accessoires attachés à cette créance (art. 1321 al. 3 du Code civil).`);

    para(`Conformément aux articles 1321 à 1324 du Code civil, la présente notification rend cette cession opposable à votre compagnie. En conséquence, à compter de sa réception, vous ne pourrez valablement vous acquitter de votre dette qu'entre les mains du Cessionnaire, Robin des Airs, à l'exclusion du ou des cédant(s) : seul un paiement effectué au Cessionnaire sera libératoire. À toutes fins utiles, et quelle que soit la loi applicable au contrat de transport, la présente notification satisfait aux conditions d'opposabilité de la cession au débiteur cédé.`);

    para(`Tout règlement devra être effectué${hasMontant ? `, à hauteur de ${montantTotal} € en principal,` : ''} par virement au bénéfice de Robin des Airs sur le compte suivant : ${banquePhrase}. Toute correspondance, demande de pièces ou proposition de règlement relative à ce dossier est à adresser à ${contactEmail}.`);

    para(`Nous vous rappelons que toute stipulation de vos conditions générales de transport qui restreindrait ou exclurait la cession des créances nées du Règlement (CE) n° 261/2004 vous est inopposable (art. 15 du Règlement ; CJUE, 29 février 2024, aff. C-11/23).`);

    para(`Le contrat de cession de créance et le certificat de signature électronique sont joints à la présente, ou disponibles sur simple demande. Nous vous remercions de bien vouloir prendre acte de la présente cession et vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`);

    // ── Bloc signataire : une PERSONNE PHYSIQUE nommée, jamais un bloc institutionnel anonyme.
    // Avant immatriculation, l'art. L.210-6 al. 2 C. com. ne permet la reprise des actes par la société
    // QUE s'ils ont été accomplis « par des personnes pour le compte de la société en formation ».
    // Une société inexistante qui contracte en son propre nom n'engage personne → rien à reprendre → nullité.
    // D'où la formule « agissant au nom et pour le compte de la société en formation » tant que draft.
    doc.y += 2;
    const qualite = String(d.signataireQualite || '').trim() || (draft ? 'fondateur' : 'Président');
    const signataire = String(d.signataireNom || '').trim();
    const ligneSignataire = signataire
      ? (draft
          ? `${signataire}, ${qualite}, agissant au nom et pour le compte de la SASU Robin des Airs en formation`
          : `${signataire}, ${qualite} de la SASU Robin des Airs`)
      : 'Robin des Airs — Cessionnaire';
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text(ligneSignataire, left, doc.y, { width: contentW });
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Service recouvrement · ' + contactEmail, left, doc.y + 1, { width: contentW });

    // ── Cédant(s) : nom + DDN pour permettre à la compagnie de rapprocher le passager
    doc.y += 12;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.5).text(isMulti ? 'Cédants (passagers)' : 'Cédant (passager)', left, doc.y, { width: contentW });
    doc.y += 4;
    pax.forEach((p) => {
      const yR = doc.y;
      const bits = [];
      if (p.dob) bits.push(`né(e) le ${p.dob}${p.birth ? ` à ${p.birth}` : ''}`);
      if (p.minor) bits.push(`mineur(e), représenté(e) par ${p.legalRepName || 'son représentant légal'}`);
      const line2 = [bits.join(' · '), `contrat signé électroniquement le ${sigFr}`].filter(Boolean).join(' — ');
      doc.font('Helvetica').fontSize(7.6);
      const h = 11 + doc.heightOfString(line2, { width: contentW - 20 }) + 8;
      doc.roundedRect(left, yR, contentW, h, 4).fillAndStroke('#FFFFFF', BORDER);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.4).text(p.name || '—', left + 10, yR + 6, { width: contentW - 20 });
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.6).text(line2, left + 10, yR + 6 + 11, { width: contentW - 20 });
      doc.y = yR + h + 4;
    });

    // ── Résumé de courtoisie en anglais (compagnies anglophones)
    doc.y += 4;
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(7.6).text(
      `English (courtesy summary): Robin des Airs hereby gives you formal notice that, by an electronically signed assignment agreement dated ${sigEn}, the passenger(s) listed above assigned to us all their claims under Regulation (EC) No 261/2004 (Art. 7 compensation, Art. 8 reimbursement/re-routing, Art. 9 care and expenses, Art. 12 further compensation, together with interest and all accessories) arising from the ${incEn} of flight ${d.flightNum || '—'} on ${d.flightDate || '—'} (${routeTxt})${hasMontant ? `, in a principal amount of EUR ${montantTotal}` : ''}. Under Art. 1321-1324 of the French Civil Code, from receipt of this notice only payment to Robin des Airs is discharging; this notice satisfies the conditions for enforceability against the debtor whichever law governs the contract of carriage. Any clause restricting the assignment of EC 261/2004 claims is unenforceable (Art. 15; CJEU, 29 Feb. 2024, C-11/23). Assignment deed and e-signature certificate enclosed or available on request.`,
      left, doc.y, { width: contentW, align: 'justify', lineGap: 1.3 }
    );

    // ── Filigrane BROUILLON tant que la SASU n'est pas immatriculée
    if (draft) {
      doc.save();
      doc.rotate(-32, { origin: [W / 2, H / 2] });
      doc.fillColor('#E23B3B').opacity(0.10).font('Helvetica-Bold').fontSize(96)
        .text('BROUILLON', 0, H / 2 - 70, { width: W, align: 'center' });
      doc.opacity(1).restore();
    }

    // ── Pied de page
    doc.page.margins.bottom = 0;
    const footY = H - 34;
    doc.rect(0, footY - 8, W, 42).fill(OFF);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7)
      .text(
        `Robin des Airs — Notification de cession de créance CE 261/2004 · robindesairs.eu · ${contactEmail}` +
          (draft ? ' · DOCUMENT PROVISOIRE — SASU en cours d\'immatriculation, ne pas envoyer' : ''),
        left, footY, { width: contentW, align: 'center', lineBreak: false }
      );

    doc.end();
  });
}

module.exports = { genererNotificationCreancePdf };
