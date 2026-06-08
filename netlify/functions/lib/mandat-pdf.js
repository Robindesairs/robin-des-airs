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

    // ── Certificat de signature électronique (eIDAS) — piste de preuve détaillée ──
    sectionTitle('Certificat de signature électronique (eIDAS)');
    const certLine = (label, val) => {
      ensure(13); const y = doc.y;
      doc.fillColor(GRAY).fontSize(8.5).font('Helvetica-Bold').text(label, left, y, { width: 178 });
      doc.fillColor(TEXT).font('Helvetica').fontSize(8.5).text(String(val == null || val === '' ? '—' : val), left + 182, y, { width: contentW - 182 });
      doc.y = Math.max(doc.y, y + 12);
    };
    certLine('Type de signature', 'Signature électronique simple (SES) — règl. (UE) 910/2014, art. 25');
    certLine('Signataire', [[record.firstName, record.lastName].filter(Boolean).join(' '), record.email, record.whatsapp].filter(Boolean).join('  ·  ') || '—');
    certLine('Référence dossier', ref);
    certLine('Identifiant du certificat', record.cert_id);
    certLine('Document signé le', `${fmtDate(record.signed_at)} (heure de Paris)`);
    certLine('Adresse IP (empreinte)', record.ip_hash);
    certLine('Appareil / navigateur', record.user_agent);
    if (record.mandat_version) certLine('Version du mandat', record.mandat_version);
    // Empreinte SHA-256 complète (64 caractères) — auto-vérifiable
    ensure(28);
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica-Bold').text("Empreinte d'intégrité (SHA-256)", left, doc.y);
    doc.fillColor(TEXT).fontSize(8).font('Courier').text(record.doc_hash || '—', left, doc.y + 1, { width: contentW });
    doc.moveDown(0.4);
    // Journal de preuve (horodatages)
    ensure(54);
    doc.fillColor(NAVY).fontSize(8.5).font('Helvetica-Bold').text('Journal de preuve', left, doc.y); doc.moveDown(0.2);
    [
      record.link_sent_at ? `Mandat transmis au signataire — ${fmtDate(record.link_sent_at)}` : null,
      `Document consulté et signé par le Mandant — ${fmtDate(record.signed_at)}`,
      `Acceptation du Mandataire (Robin des Airs) — ${fmtDate(record.mandataireAcceptedAt || record.signed_at)}`,
    ].filter(Boolean).forEach((e) => {
      ensure(13); const y = doc.y;
      doc.fillColor(NEON).fontSize(8.5).font('Helvetica-Bold').text('•', left, y);
      doc.fillColor(TEXT).fontSize(8.5).font('Helvetica').text(e, left + 12, y, { width: contentW - 12 });
      doc.y = Math.max(doc.y, y + 12);
    });
    ensure(16);
    doc.fillColor(GRAY).fontSize(7.5).font('Helvetica-Oblique')
      .text("Toute modification ultérieure du document altère l'empreinte SHA-256 ci-dessus : la falsification est ainsi détectable. La présente copie vaut preuve de la signature électronique au sens de l'art. 1367 du Code civil.", left, doc.y + 2, { width: contentW });
    doc.moveDown(0.6);

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
    kv('Itinéraire', [record.depAirport, record.arrAirport].filter(Boolean).join(' -> ') || record.route);
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
      .text(`Texte intégral des 12 articles : robindesairs.eu/mandat.html (réf. ${ref}).`, left, doc.y, { width: contentW });
    doc.moveDown(0.6);

    // ── Consentements recueillis (cases cochées par le signataire) ──
    sectionTitle('Consentements recueillis');
    const consent = (ok, t) => {
      ensure(16); const y = doc.y;
      if (ok) {
        doc.rect(left, y, 10, 10).fill(NEON);
        doc.moveTo(left + 2, y + 5).lineTo(left + 4, y + 7.5).lineTo(left + 8.2, y + 2.5).lineWidth(1.4).stroke('white');
      } else {
        doc.rect(left, y, 10, 10).lineWidth(1).strokeColor(BORDER).stroke();
      }
      doc.fillColor(TEXT).fontSize(8.5).font('Helvetica').text(t, left + 16, y - 1, { width: contentW - 16 });
      doc.y = Math.max(doc.y, y + 13);
    };
    consent(true, "Déclaration sur l'honneur : avoir été passager(e) du vol indiqué, à la date mentionnée, et avoir subi le préjudice déclaré.");
    consent(true, "Lecture et acceptation du mandat de représentation ; cession de la créance aux fins de recouvrement (Article 5 bis).");
    consent(record.eligibilityAcknowledged !== false, "Compréhension : l'indemnité n'est pas garantie — obligation de moyens, sous réserve d'éligibilité (CE 261/2004) et de paiement effectif par la compagnie.");
    consent(!!record.startNow, "Demande de démarrage immédiat du dossier, sans attendre le délai de rétractation de 14 jours (Art. L.221-25 C. conso.).");
    if ((record.pax || 1) > 1) consent(!!record.coPassAgreement, "Accord de tous les co-passagers (et du représentant légal pour chaque passager mineur).");
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
    doc.page.margins.bottom = 0; // pied en position absolue : empêche un saut de page parasite
    doc.fillColor(NEON_B).fontSize(8).font('Helvetica-Bold')
      .text('Robin des Airs — robindesairs.eu', left, piedY + 10, { align: 'center', width: contentW, lineBreak: false });
    doc.fillColor('white').fontSize(7.5).font('Helvetica')
      .text('Copie du mandat signé électroniquement — à conserver. Suivi : robindesairs.eu/suivi-dossier.html', left, piedY + 24, { align: 'center', width: contentW, lineBreak: false });

    doc.end();
  });
}

const INCIDENT_LABEL_EN = { delay: 'Delay 3h+ at arrival', cancel: 'Cancellation', denied: 'Denied boarding' };

/**
 * Génère le PDF BILINGUE FR/EN du mandat (instrument bilingue, le FR fait foi).
 * Destiné aux compagnies non francophones (Vueling, Iberia, Lufthansa...).
 * Le mandat signé est un instrument bilingue (clause « Langue », Art. 1) : la
 * signature couvre les deux langues, elle n'apparaît donc qu'UNE fois.
 */
function genererMandatBilinguePdf(record) {
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

    function ensure(h) { if (doc.y + h > bottom) doc.addPage(); }
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

    function renderBody(lang) {
      const fr = lang === 'fr';
      sectionTitle(fr ? 'Les parties' : 'The parties');
      kv(fr ? 'Le Mandant' : 'The Client', [record.firstName, record.lastName].filter(Boolean).join(' ') || '—');
      kv(fr ? 'Adresse' : 'Address', record.address);
      kv('WhatsApp', record.whatsapp);
      kv(fr ? 'Email dossier' : 'Case email', record.email);
      kv(fr ? 'Le Mandataire' : 'The Agent', 'Robin des Airs — Service juridique CE 261/2004');
      kv('', '66 av. des Champs-Élysées, Paris · contact@robindesairs.eu');
      doc.moveDown(0.4);

      sectionTitle(fr ? 'Le vol concerné' : 'The flight concerned');
      kv(fr ? 'Compagnie (billet)' : 'Airline (ticket)', record.airline);
      if (record.operatedBy) kv(fr ? 'Opéré par (réel)' : 'Operated by (actual)', record.operatedBy);
      kv(fr ? 'N° de vol' : 'Flight no.', record.flightNum);
      kv(fr ? 'Date du vol' : 'Flight date', record.flightDate);
      kv('PNR', record.pnr);
      kv(fr ? 'Itinéraire' : 'Itinerary', [record.depAirport, record.arrAirport].filter(Boolean).join(' -> ') || record.route);
      if (record.connecting) kv(fr ? 'Correspondance(s)' : 'Connection(s)', record.connecting);
      kv(fr ? 'Incident' : 'Disruption', (fr ? INCIDENT_LABEL : INCIDENT_LABEL_EN)[record.incident] || record.incident);
      doc.moveDown(0.4);

      sectionTitle(fr ? 'Conditions essentielles' : 'Key terms');
      const terms = fr ? [
        'Double régime (Art. 1 & 1 bis) : mandat de représentation (art. 1984 C. civ.) par défaut, et option de cession de créance à titre de recouvrement (art. 1321) que Robin des Airs peut lever pour le contentieux.',
        'Honoraires : 25% TTC, uniquement en cas de succès (No Win No Fee), sur l\'ensemble des sommes recouvrées (indemnité, frais, préjudices). Aucun frais si échec.',
        'Versement de votre part nette (75%) sous 48h ouvrées après encaissement.',
        'Durée : 24 mois. Droit de rétractation : 14 jours (contact@robindesairs.eu).',
      ] : [
        'Two-tier regime (Art. 1 & 1 bis): a representation mandate (art. 1984 French Civil Code) by default, and an option to assign the claim for recovery purposes (art. 1321) that Robin des Airs may exercise for litigation.',
        'Fee: 25% incl. tax, only if successful (No Win No Fee), on all sums recovered (compensation, expenses, damages). No fee if unsuccessful.',
        'Payment of your net share (75%) within 48 business hours after collection.',
        'Term: 24 months. Right of withdrawal: 14 days (contact@robindesairs.eu).',
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
        .text(fr
          ? `Texte intégral des articles : robindesairs.eu/mandat.html (réf. ${ref}).`
          : `Full text of the articles: robindesairs.eu/mandat-en.html (ref. ${ref}).`, left, doc.y, { width: contentW });
      doc.moveDown(0.6);
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

    // ── Bannière bilingue ──
    ensure(64);
    const by = doc.y;
    doc.rect(left, by, contentW, 52).fill(NAVY);
    doc.fillColor(NEON_B).fontSize(10).font('Helvetica-Bold')
      .text('INSTRUMENT BILINGUE · BILINGUAL INSTRUMENT', left + 12, by + 9, { width: contentW - 24 });
    doc.fillColor('white').fontSize(8).font('Helvetica')
      .text('Le texte français est la seule version faisant foi. · The French text is the only authoritative version and prevails in case of any discrepancy.', left + 12, by + 25, { width: contentW - 24 });
    doc.y = by + 64;

    // ── Certificat ──
    ensure(82);
    const cy = doc.y;
    doc.rect(left, cy, contentW, 72).fill(OFF);
    doc.rect(left, cy, 3, 72).fill(NEON);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text('SIGNATURE ÉLECTRONIQUE CERTIFIÉE (eIDAS) · CERTIFIED E-SIGNATURE', left + 14, cy + 9);
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica')
      .text(`Référence dossier / Case ref. : ${ref}`, left + 14, cy + 24)
      .text(`Certificat : ${record.cert_id || '—'}    ·    Signé le / Signed on : ${fmtDate(record.signed_at)}`, left + 14, cy + 36)
      .text(`Empreinte technique / Technical hash : ${record.ip_hash || '—'}`, left + 14, cy + 48);
    doc.fillColor(GRAY).fontSize(7.5).font('Helvetica')
      .text(`Empreinte SHA-256 / Doc hash : ${record.doc_hash ? record.doc_hash.slice(0, 40) + '…' : '—'}`, left + 14, cy + 60);
    doc.y = cy + 84;

    // ── Version française (fait foi) ──
    doc.fillColor(NAVY).fontSize(15).font('Helvetica-Bold').text('Mandat de Représentation — version française (fait foi)', left, doc.y, { width: contentW, align: 'center' });
    doc.moveDown(0.5);
    renderBody('fr');

    // ── Version anglaise (traduction) ──
    doc.addPage();
    doc.fillColor(NAVY).fontSize(15).font('Helvetica-Bold').text('Representation Mandate — English version (courtesy translation)', left, doc.y, { width: contentW, align: 'center' });
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica-Oblique').text('Faithful translation of the French instrument above. The signed French version prevails.', left, doc.y + 2, { width: contentW, align: 'center' });
    doc.moveDown(0.8);
    renderBody('en');

    // ── Signature(s) — instrument bilingue (une seule fois) ──
    sectionTitle('Signature(s) — instrument bilingue · bilingual instrument');
    passengers.forEach((p, i) => {
      ensure(96);
      const y = doc.y;
      doc.fillColor(NAVY).fontSize(9.5).font('Helvetica-Bold')
        .text(`${p.name || 'Passager ' + (i + 1)}${p.minor ? ' (mineur / minor)' : ''}${i === 0 ? ' — signataire principal / main signatory' : ''}`, left, y);
      if (p.legalRepName) {
        doc.fillColor(GRAY).fontSize(8.5).font('Helvetica').text(`Représentant légal / Legal representative : ${p.legalRepName}`, left, doc.y + 2);
      }
      const boxY = doc.y + 6;
      doc.rect(left, boxY, 240, 70).strokeColor(BORDER).lineWidth(1).stroke();
      const buf = sigBuffer(p.signatureImg);
      if (buf) {
        try { doc.image(buf, left + 6, boxY + 6, { fit: [228, 58] }); }
        catch (_) { doc.fillColor(GRAY).fontSize(8).font('Helvetica-Oblique').text('(signature enregistrée)', left + 8, boxY + 28); }
      } else {
        doc.fillColor(GRAY).fontSize(8).font('Helvetica-Oblique').text('(signature enregistrée au dossier / on file)', left + 8, boxY + 28);
      }
      doc.y = boxY + 80;
    });

    // ── Acceptation mandataire ──
    ensure(46);
    const ay = doc.y;
    doc.rect(left, ay, contentW, 38).fill(OFF);
    doc.rect(left, ay, 3, 38).fill(NEON);
    doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text('Acceptation du Mandataire · Agent\'s acceptance — Robin des Airs', left + 14, ay + 8);
    doc.fillColor(GRAY).fontSize(8.5).font('Helvetica')
      .text(`${record.mandataireName || 'Robin des Airs — Service juridique CE 261/2004'} · le / on ${fmtDate(record.mandataireAcceptedAt || record.signed_at)}`, left + 14, ay + 22);
    doc.y = ay + 50;

    // ── Pied de page ──
    const piedH = 44;
    const piedY = doc.page.height - piedH;
    doc.rect(0, piedY, W, piedH).fill(NAVY);
    doc.rect(0, piedY, W, 2).fill(NEON);
    doc.page.margins.bottom = 0; // pied en position absolue : empêche un saut de page parasite
    doc.fillColor(NEON_B).fontSize(8).font('Helvetica-Bold')
      .text('Robin des Airs — robindesairs.eu', left, piedY + 10, { align: 'center', width: contentW, lineBreak: false });
    doc.fillColor('white').fontSize(7.5).font('Helvetica')
      .text('Instrument bilingue FR/EN — le texte français fait foi. · Bilingual FR/EN instrument — the French text prevails.', left, piedY + 24, { align: 'center', width: contentW, lineBreak: false });

    doc.end();
  });
}

module.exports = { genererMandatPdf, genererMandatBilinguePdf };
