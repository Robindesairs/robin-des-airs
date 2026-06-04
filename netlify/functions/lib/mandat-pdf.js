/**
 * mandat-pdf — génère le PDF du mandat signé (copie client).
 * Reprend le branding Robin des Airs de send-preuve-pdf.js.
 *
 *   const { genererMandatPdf } = require('./lib/mandat-pdf');
 *   const buffer = await genererMandatPdf(record);  // record = payload submit-mandat
 */

const PDFDocument = require('pdfkit');

const NAVY = '#0B1F3A';
const NEON = '#00C87A';
const NEON_B = '#00E5A0';
const OFF = '#F7F8FA';
const BORDER = '#E2E6EE';
const TEXT = '#1a2436';
const GRAY = '#6B7A90';

const INCIDENT_LABEL = { delay: 'Retard +3h à l\'arrivée', cancel: 'Annulation', denied: 'Refus d\'embarquement' };

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
  } catch (_) {
    return String(iso);
  }
}

/** Convertit un data:image/png;base64,... en Buffer (ou null). */
function sigBuffer(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], 'base64');
  } catch (_) {
    return null;
  }
}

function genererMandatPdf(record) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const left = 50;
    const contentW = W - 100;
    const bottom = doc.page.height - 60;

    const ref = record.ref || record.cert_id || '—';
    const passengers = Array.isArray(record.passengersData) && record.passengersData.length
      ? record.passengersData
      : [{ name: [record.firstName, record.lastName].filter(Boolean).join(' '), signatureImg: record.signatureImg }];

    // S'assure qu'il reste de la place, sinon nouvelle page
    function ensure(h) {
      if (doc.y + h > bottom) doc.addPage();
    }
    function sectionTitle(t) {
      ensure(34);
      doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold').text(t, left, doc.y);
      doc.rect(left, doc.y + 2, contentW, 2).fill(NEON);
      doc.y += 12;
      doc.fillColor(TEXT).font('Helvetica').fontSize(10);
    }
    function kv(label, value) {
      ensure(18);
      const y = doc.y;
      doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold').text(label, left, y, { width: 150 });
      doc.fillColor(TEXT).font('Helvetica').fontSize(10).text(String(value == null || value === '' ? '—' : value), left + 160, y, { width: contentW - 160 });
      doc.y = Math.max(doc.y, y + 16);
    }

    // ── En-tête ──
    const headerH = 84;
    doc.rect(0, 0, W, headerH).fill(NAVY);
    const lx = left, ly = 24;
    doc.moveTo(lx, ly + 6).lineTo(lx + 26, ly + 18).lineWidth(3).stroke(NEON);
    doc.polygon([lx + 26, ly + 18], [lx + 18, ly + 13], [lx + 20, ly + 22]).fill(NEON);
    doc.fillColor('white').fontSize(19).font('Helvetica-Bold').text('Robin des Airs', lx + 34, ly + 4);
    doc.fillColor(NEON_B).fontSize(9).font('Helvetica').text('Indemnisation aérienne — CE 261/2004', lx + 35, ly + 28);
    doc.rect(0, headerH, W, 3).fill(NEON);
    doc.y = headerH + 22;

    // ── Titre ──
    doc.fillColor(NAVY).fontSize(18).font('Helvetica-Bold').text('Mandat de Représentation — copie signée', left, doc.y, { width: contentW, align: 'center' });
    doc.moveDown(0.6);

    // ── Bloc certificat ──
    ensure(70);
    const cy = doc.y;
    doc.rect(left, cy, contentW, 60).fill(OFF);
    doc.rect(left, cy, 3, 60).fill(NEON);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text('SIGNATURE ÉLECTRONIQUE CERTIFIÉE', left + 14, cy + 9);
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica')
      .text(`Référence dossier : ${ref}`, left + 14, cy + 24)
      .text(`Certificat : ${record.cert_id || '—'}    ·    Signé le : ${fmtDate(record.signed_at)}`, left + 14, cy + 36)
      .text(`Empreinte technique : ${record.ip_hash || '—'}`, left + 14, cy + 48);
    doc.y = cy + 72;

    // ── Parties ──
    sectionTitle('Les parties');
    kv('Le Mandant', [record.firstName, record.lastName].filter(Boolean).join(' ') || '—');
    kv('Adresse', record.address);
    kv('WhatsApp', record.whatsapp);
    kv('Email dossier', record.email);
    kv('Le Mandataire', 'Robin des Airs — Service juridique CE 261/2004');
    kv('', '66 av. des Champs-Élysées, Paris · contact@robindesairs.eu');
    doc.moveDown(0.4);

    // ── Vol ──
    sectionTitle('Le vol concerné');
    kv('Compagnie (billet)', record.airline);
    if (record.operatedBy) kv('Opéré par (réel)', record.operatedBy);
    kv('N° de vol', record.flightNum);
    kv('Date du vol', record.flightDate);
    kv('PNR', record.pnr);
    kv('Itinéraire', [record.depAirport, record.arrAirport].filter(Boolean).join(' -> '));
    if (record.connecting) kv('Correspondance(s)', record.connecting);
    kv('Incident', INCIDENT_LABEL[record.incident] || record.incident);
    doc.moveDown(0.4);

    // ── Conditions essentielles ──
    sectionTitle('Conditions essentielles');
    const terms = [
      'Double régime (Art. 1 & 1 bis) : mandat de représentation (art. 1984 C. civ.) par défaut, et option de cession de créance à titre de recouvrement (art. 1321) que Robin des Airs peut lever pour le contentieux.',
      'Honoraires : 25% TTC, uniquement en cas de succès (No Win No Fee), sur l\'ensemble des sommes recouvrées (indemnité, frais, préjudices). Aucun frais si échec.',
      'Versement de votre part nette (75%) sous 48h ouvrées après encaissement.',
      'Durée : 24 mois. Droit de rétractation : 14 jours (contact@robindesairs.eu).',
    ];
    terms.forEach((t) => {
      ensure(28);
      const y = doc.y;
      doc.fillColor(NEON).fontSize(10).font('Helvetica-Bold').text('•', left, y);
      doc.fillColor(TEXT).fontSize(9.5).font('Helvetica').text(t, left + 14, y, { width: contentW - 14 });
      doc.y += 4;
    });
    ensure(20);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
      .text(`Texte intégral des 12 articles : robindesairs.eu/autorisation.html (réf. ${ref}).`, left, doc.y, { width: contentW });
    doc.moveDown(0.6);

    // ── Signatures ──
    sectionTitle('Signature(s)');
    passengers.forEach((p, i) => {
      ensure(96);
      const y = doc.y;
      doc.fillColor(NAVY).fontSize(9.5).font('Helvetica-Bold')
        .text(`${p.name || 'Passager ' + (i + 1)}${p.minor ? ' (mineur)' : ''}${i === 0 ? ' — signataire principal' : ''}`, left, y);
      if (p.legalRepName) {
        doc.fillColor(GRAY).fontSize(8.5).font('Helvetica').text(`Représentant légal : ${p.legalRepName}`, left, doc.y + 2);
      }
      const boxY = doc.y + 6;
      doc.rect(left, boxY, 240, 70).strokeColor(BORDER).lineWidth(1).stroke();
      const buf = sigBuffer(p.signatureImg);
      if (buf) {
        try {
          doc.image(buf, left + 6, boxY + 6, { fit: [228, 58] });
        } catch (_) {
          doc.fillColor(GRAY).fontSize(8).font('Helvetica-Oblique').text('(signature enregistrée)', left + 8, boxY + 28);
        }
      } else {
        doc.fillColor(GRAY).fontSize(8).font('Helvetica-Oblique').text('(signature enregistrée au dossier)', left + 8, boxY + 28);
      }
      doc.y = boxY + 80;
    });

    // ── Acceptation mandataire ──
    ensure(46);
    const ay = doc.y;
    doc.rect(left, ay, contentW, 38).fill(OFF);
    doc.rect(left, ay, 3, 38).fill(NEON);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text('Acceptation du Mandataire — Robin des Airs', left + 14, ay + 8);
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica')
      .text(`${record.mandataireName || 'Robin des Airs — Service juridique CE 261/2004'} · le ${fmtDate(record.mandataireAcceptedAt || record.signed_at)}`, left + 14, ay + 22);
    doc.y = ay + 50;

    // ── Pied de page ──
    const piedH = 44;
    const piedY = doc.page.height - piedH;
    doc.rect(0, piedY, W, piedH).fill(NAVY);
    doc.rect(0, piedY, W, 2).fill(NEON);
    doc.fillColor(NEON_B).fontSize(8).font('Helvetica-Bold')
      .text('Robin des Airs — robindesairs.eu', left, piedY + 10, { align: 'center', width: contentW });
    doc.fillColor('white').fontSize(7.5).font('Helvetica')
      .text('Copie du mandat signé électroniquement — à conserver. Suivi : robindesairs.eu/suivi-dossier.html', left, piedY + 24, { align: 'center', width: contentW });

    doc.end();
  });
}

module.exports = { genererMandatPdf };
