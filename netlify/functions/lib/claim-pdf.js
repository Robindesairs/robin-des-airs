/**
 * claim-pdf — génère le PDF d'une MISE EN DEMEURE CE 261/2004 (modèle déterministe).
 * Branding aligné sur mandat-pdf.js. Aucun texte généré par IA.
 *
 *   const { genererClaimPdf } = require('./lib/claim-pdf');
 *   const buffer = await genererClaimPdf(claim);
 */

const PDFDocument = require('pdfkit');

const NAVY = '#0B1F3A';
const NEON = '#00C87A';
const NEON_B = '#00E5A0';
const OFF = '#F7F8FA';
const TEXT = '#1a2436';
const GRAY = '#6B7A90';

function incidentPhrase(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('annul')) return 'a été annulé';
  if (s.includes('refus') || s.includes('surbook') || s.includes('embarq')) return "a fait l'objet d'un refus d'embarquement";
  if (s.includes('correspond')) return 'a entraîné une correspondance manquée';
  return "est arrivé avec un retard de plus de trois (3) heures";
}

function fmtTodayFr() {
  try { return new Date().toLocaleDateString('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }); }
  catch (_) { return new Date().toISOString().slice(0, 10); }
}

/**
 * @param {object} c claim {
 *   ref, passengerName, address, airlineName, neb,
 *   vol, dateVol, pnr, route, incident, montant, exigerCash, art9Note,
 *   delaiJours
 * }
 */
function genererClaimPdf(c) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.on('data', (x) => chunks.push(x));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const left = 50;
    const contentW = W - 100;
    const bottom = doc.page.height - 70;
    const delai = c.delaiJours || 14;
    const montant = c.montant || 600;
    // RÉGIME UNIQUE PAR INSTANCE (mandat.html Art. 1 bis) : 'mandat' pour la phase amiable (défaut),
    // 'cession' UNIQUEMENT quand l'option de cession est levée (contentieux). Jamais les deux à la fois.
    // Défaut = cession (modèle courant depuis le 26/06) ; 'mandat' réservé aux dossiers legacy signés sous l'ancien modèle.
    const regime = c.regime === 'mandat' ? 'mandat' : 'cession';

    function ensure(h) { if (doc.y + h > bottom) doc.addPage(); }
    function para(txt, opts = {}) {
      ensure(28);
      doc.fillColor(TEXT).font('Helvetica').fontSize(10).text(txt, left, doc.y, { width: contentW, align: 'justify', ...opts });
      doc.moveDown(0.5);
    }

    // En-tête
    const headerH = 84;
    doc.rect(0, 0, W, headerH).fill(NAVY);
    doc.moveTo(left, 30).lineTo(left + 26, 42).lineWidth(3).stroke(NEON);
    doc.polygon([left + 26, 42], [left + 18, 37], [left + 20, 46]).fill(NEON);
    doc.fillColor('white').fontSize(19).font('Helvetica-Bold').text('Robin des Airs', left + 34, 28);
    doc.fillColor(NEON_B).fontSize(9).font('Helvetica').text('Service recouvrement — Indemnisation aérienne CE 261/2004', left + 35, 52);
    doc.rect(0, headerH, W, 3).fill(NEON);
    doc.y = headerH + 24;

    // Destinataire + date
    doc.fillColor(TEXT).fontSize(10).font('Helvetica-Bold').text(`À l'attention de : ${c.airlineName || c.compagnie || 'la compagnie aérienne'}`, left, doc.y, { width: contentW });
    doc.font('Helvetica').fillColor(GRAY).fontSize(9).text(`Service Réclamations / Indemnisations`, { width: contentW });
    if (c.adresseAR) doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(c.adresseAR, { width: contentW });
    doc.moveDown(0.4);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`${fmtTodayFr()} — Réf. dossier : ${c.ref || '—'}`, left, doc.y, { width: contentW, align: 'right' });
    doc.moveDown(0.6);

    // Objet
    ensure(40);
    doc.fillColor(NAVY).fontSize(13).font('Helvetica-Bold').text('MISE EN DEMEURE', left, doc.y, { width: contentW, align: 'center' });
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold').text(`Indemnisation au titre du Règlement (CE) n° 261/2004 — vol ${c.vol || ''} du ${c.dateVol || ''}`, { width: contentW, align: 'center' });
    doc.moveDown(0.7);

    // Corps
    para(`Madame, Monsieur,`);
    para(regime === 'cession'
      ? `Robin des Airs, cessionnaire de la créance d'indemnisation de ${c.passengerName || 'notre cédant'}, passager(s) du vol ${c.vol || '—'} du ${c.dateVol || '—'} (réservation ${c.pnr || '—'}${c.route ? `, ${c.route}` : ''}), vous notifie la présente mise en demeure. Conformément à l'article 1324 du Code civil, la présente vaut notification de la cession de créance consentie à notre profit ; l'acte de cession est à votre disposition.`
      : `Agissant en qualité de mandataire de ${c.passengerName || 'notre mandant'}, passager(s) du vol ${c.vol || '—'} du ${c.dateVol || '—'} (réservation ${c.pnr || '—'}${c.route ? `, ${c.route}` : ''}) qui demeure titulaire de sa créance, nous vous notifions la présente mise en demeure. Le mandat de représentation correspondant est à votre disposition.`);
    para(`Ce vol ${incidentPhrase(c.incident)}. Au titre de l'article 7 du Règlement (CE) n° 261/2004, le passager a droit à l'indemnisation forfaitaire de ${montant} € par personne. La charge de la preuve d'une éventuelle circonstance extraordinaire exonératoire vous incombe (art. 5§3 ; CJUE).`);
    if (c.exigerCash) {
      para(`Le passager exige le paiement en numéraire (virement bancaire) et refuse expressément tout bon d'achat, avoir ou miles : conformément à l'article 7§3 du Règlement, une compensation en nature suppose son accord signé, qu'il ne donne pas.`);
    }
    if (c.art9Note) {
      para(`Prise en charge (art. 8 et 9) : ${c.art9Note}`);
    }
    para(regime === 'cession'
      ? `À compter de la présente notification (art. 1324 du Code civil), seul le paiement effectué entre les mains de Robin des Airs, cessionnaire, est libératoire ; tout règlement direct au passager ne vous libère pas de votre obligation. Le paiement doit intervenir exclusivement sur le compte bancaire désigné par Robin des Airs.`
      : `Le passager a donné instruction irrévocable que l'indemnité soit réglée exclusivement entre les mains de Robin des Airs, sur le compte bancaire qu'elle désigne, conformément à l'instruction de paiement figurant au mandat.`);
    para(`Nous vous mettons en demeure de procéder au règlement dans un délai de ${delai} jours à compter de la réception des présentes. Nous vous demandons également de nous communiquer la cause précise de l'irrégularité et une attestation/certificat de retard.`);
    para(`À défaut de règlement satisfaisant dans ce délai, nous saisirons l'organisme national de contrôle compétent${c.neb ? ` (${c.neb})` : ''} et transmettrons le dossier à notre avocat partenaire et/ou au médiateur compétent (Médiation Tourisme et Voyage).`);
    para(`Conformément à l'article R. 124-4 du Code de procédure civile, nous vous précisons que les sommes réclamées au présent stade amiable n'ont pas de caractère exécutoire et que vous conservez la faculté d'en contester le bien-fondé.`);
    para(`Dans l'attente, nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`);

    doc.moveDown(0.3);
    ensure(40);
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold').text('Robin des Airs — Service recouvrement CE 261/2004', left, doc.y, { width: contentW });
    doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`${regime === 'cession' ? 'Cessionnaire de la créance' : 'Mandataire du passager'} — contact@robindesairs.eu`, { width: contentW });

    // Pied de page
    const piedH = 40;
    const piedY = doc.page.height - piedH;
    doc.rect(0, piedY, W, piedH).fill(NAVY);
    doc.rect(0, piedY, W, 2).fill(NEON);
    doc.fillColor('white').fontSize(7.5).font('Helvetica')
      .text(`Mise en demeure générée le ${fmtTodayFr()} — Réf. ${c.ref || '—'} — document à valider et adresser à la compagnie. robindesairs.eu`, left, piedY + 14, { align: 'center', width: contentW });

    doc.end();
  });
}

module.exports = { genererClaimPdf };
