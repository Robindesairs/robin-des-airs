/**
 * GET /api/notification-creance?r=REF        → PDF inline du COURRIER DE NOTIFICATION DE CESSION DE CRÉANCE.
 *     /api/notification-creance?r=REF&dl=1   → téléchargement.
 *
 * Lettre formelle adressée à la compagnie qui NOTIFIE la cession (art. 1324 C. civ.) et enjoint de ne
 * régler qu'entre les mains du Cessionnaire. Distincte de l'acte de cession (le contrat/preuve) et de
 * la mise en demeure (la sommation de payer). Généré APRÈS la signature (refuse 409 sans signed/<ref>).
 *
 * Sources : store 'robin-signatures' → signed/<ref> (GATE) ; store 'mandats' → m/<ref> (dossier).
 * Env : RDA_SIREN (lève le filigrane BROUILLON dès immatriculation), RDA_IBAN_RECOUVREMENT + RDA_BANK_NAME
 *       (compte dédié ; absents → « communiqué sur demande »).
 *
 * Auth : opérateur CRM (cookie rda_crm / X-CRM-Code) — document interne destiné à la compagnie.
 */
'use strict';

const { genererNotificationCreancePdf } = require('./lib/notification-creance-pdf');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const { checkCrmAccess } = require('./lib/crm-access');
const { corsHeaders } = require('./lib/auth-config');
const { codeFromRef } = require('./lib/doc-filename');
const { buildClientEmail } = require('./lib/client-emails');
const { sendWhatsAppTextMessage, canSendWhatsApp } = require('./lib/whatsapp-send-core');
const { appendWaMessage } = require('./lib/wa-convo-store');

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  // POST = envoi de la COPIE AU CLIENT (cf. bloc « copie client » plus bas). Le GET reste
  // l'aperçu/téléchargement opérateur. Aucun des deux n'envoie quoi que ce soit à la compagnie :
  // cet envoi-là reste manuel et humain, tant que le pipeline aval n'est pas construit.
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return J(405, { error: 'GET ou POST' });
  const isPost = event.httpMethod === 'POST';
  let bodyIn = {};
  if (isPost) { try { bodyIn = JSON.parse(event.body || '{}'); } catch (_) { return J(400, { error: 'JSON invalide' }); } }

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: 'Accès CRM requis' });

  const q = { ...(event.queryStringParameters || {}), ...(isPost ? bodyIn : {}) };
  const ref = String(q.r || q.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (!ref) return J(400, { error: 'r requis' });

  try {
    // 1) GATE : la notification n'existe qu'APRÈS la signature.
    const sigStore = getBlobStore(event, 'robin-signatures');
    if (!sigStore) return J(500, { error: 'store signatures indisponible' });
    const signed = await sigStore.get('signed/' + ref, { type: 'json' });
    if (!signed || !signed.signed_at) {
      return J(409, { error: 'Contrat non signé pour cette référence — notification indisponible.' });
    }

    // 2) Dossier (vol + passagers avec les données du contrat, mergées par submit-mandat).
    const mandats = getBlobStore(event, 'mandats');
    const dossier = (mandats && (await mandats.get('m/' + ref, { type: 'json' }))) || {};

    // 3) GATE ENVOI — un filigrane BROUILLON n'a jamais empêché personne d'envoyer le PDF (c'est arrivé).
    //    Tant que la SASU n'est pas immatriculée, l'aperçu exige ?draft=1 EXPLICITE : impossible d'obtenir
    //    par accident un document qui a l'air définitif. Une notification émise par une entité sans
    //    personnalité morale est nulle (rien à reprendre au sens de l'art. L.210-6 al. 2 C. com.).
    const siren = (process.env.RDA_SIREN || '').trim();
    const draftOk = q.draft === '1' || q.draft === 'true';
    if (!siren && !draftOk) {
      return J(409, {
        error: 'SASU non immatriculée (RDA_SIREN absent) : notification non émettable.',
        detail: 'Une notification émise par une entité sans personnalité morale est nulle et non reprenable (art. L.210-6 al. 2 C. com.). Ajoutez ?draft=1 pour un aperçu filigrané non destiné à l\'envoi.',
      });
    }

    // 4) Montant : OBLIGATOIRE et explicite. Jamais dérivé d'une heuristique — bareme.js renvoie 600 €
    //    par défaut et ne détecte le Maghreb que par nom de ville : sur un vol court (<1500 km = 250 €)
    //    il produirait une réclamation surévaluée, qui décrédibilise la lettre et fonde un rejet.
    const montantPerPax = Number(q.montant || q.m || dossier.montantPerPax || 0);
    if (!draftOk && !(montantPerPax > 0)) {
      return J(400, {
        error: 'Montant par passager requis.',
        detail: 'Passez ?montant=250|400|600 selon la distance orthodromique du vol (art. 7 §1 CE 261/2004). Le montant n\'est jamais deviné : une lettre chiffrée faux est plus attaquable qu\'une lettre sans chiffre.',
      });
    }

    // 5) Coordonnées de paiement : sans IBAN, la dette reste quérable (art. 1342-6 C. civ.), la lettre
    //    ne vaut pas mise en demeure (art. 1344) et le débiteur peut se libérer par consignation
    //    (art. 1345-1). On refuse donc d'émettre une notification définitive sans compte de paiement.
    const ibanEnv = (process.env.RDA_IBAN_RECOUVREMENT || '').trim();
    if (!draftOk && !ibanEnv) {
      return J(409, {
        error: 'IBAN du compte dédié absent (RDA_IBAN_RECOUVREMENT).',
        detail: 'Une notification sans coordonnées de paiement n\'interpelle pas valablement le débiteur et l\'autorise à consigner (art. 1345-1 C. civ.).',
      });
    }

    // 6) Signataire : une personne physique nommée est indispensable avant immatriculation (reprise
    //    des actes, art. L.210-6 al. 2 C. com.) et reste requise après (identification du représentant).
    const signataireNom = (process.env.RDA_SIGNATAIRE || '').trim();
    if (!draftOk && !signataireNom) {
      return J(409, {
        error: 'Signataire absent (RDA_SIGNATAIRE).',
        detail: 'Un acte signé par personne n\'engage personne. Renseignez le nom du représentant légal.',
      });
    }

    const pdf = await genererNotificationCreancePdf({
      ref,
      certId: signed.cert_id || '',
      signedAt: signed.signed_at,
      passengers: Array.isArray(dossier.passengers) && dossier.passengers.length
        ? dossier.passengers.map((p) => ({
            name: p.name || '',
            dob: p.dob || '',
            birth: p.birth || p.lieuNaissance || '',
            minor: !!p.minor,
            legalRepName: p.legalRepName || '',
            // Art. 3 §3 : un passager voyageant a titre GRATUIT n'ouvre aucun droit. Le drapeau
            // vient de l'extraction e-billet et DOIT traverser jusqu'au generateur, sinon le
            // montant reclame compte un bebe sur les genoux comme un passager payant.
            bebe: !!p.bebe,
            gratuit: p.gratuit === true,
          }))
        : [{ name: dossier.name || '' }],
      name: dossier.name || '',
      airline: dossier.compagnie || dossier.airline || '',
      flightNum: dossier.vol || dossier.flightNum || '',
      flightDate: dossier.date || dossier.flightDate || '',
      pnr: dossier.pnr || '',
      depAirport: dossier.depAirport || '',
      arrAirport: dossier.arrAirport || '',
      route: dossier.route || '',
      incident: dossier.incident || '',
      montantPerPax,
      siren,
      siege: (process.env.RDA_SIEGE || '').trim(),
      signataireNom,
      signataireQualite: (process.env.RDA_SIGNATAIRE_QUALITE || '').trim(),
      iban: ibanEnv,
      bankName: (process.env.RDA_BANK_NAME || '').trim(),
    });

    const nomPrincipal = String((dossier.passengers && dossier.passengers[0] && dossier.passengers[0].name) || dossier.name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Dossier';
    const filename = `Notification-cession-${nomPrincipal}-${String(dossier.vol || '').replace(/[^A-Za-z0-9]/g, '') || 'VOL'}-${codeFromRef(ref)}.pdf`;

    // ARCHIVE au dossier (store 'robin-claims', clé claim/<ref>/notification-cession.pdf) → la notification
    // apparaît dans la liste des documents du CRM, comme la mise en demeure (claim/<ref>/lrar.pdf).
    // Avant, elle était générée puis renvoyée sans jamais être archivée → absente du dossier.
    // Best-effort : si l'archivage échoue, on renvoie quand même le PDF (ne casse pas la génération).
    try {
      const claims = getBlobStore(event, 'robin-claims');
      if (claims) {
        await claims.set(`claim/${ref}/notification-cession.pdf`, pdf, {
          metadata: { ref, filename, mime: 'application/pdf', kind: 'notification_cession', generatedAt: new Date().toISOString() },
        });
      }
    } catch (_) { /* archivage best-effort : ne bloque jamais la génération */ }

    // ── COPIE AU CLIENT ───────────────────────────────────────────────────────
    // Le client n'est plus créancier depuis la cession : il n'est pas partie à ce courrier.
    // On lui en adresse malgré tout la copie exacte. Ses données personnelles partent vers un
    // tiers, il a le droit de savoir lesquelles ; et aucun concurrent ne montre ce qu'il écrit.
    // Verrous : jamais de BROUILLON envoyé à un client, et confirm:'SEND' explicite — un POST
    // accidentel depuis le CRM ne doit pas écrire à un vrai client.
    if (isPost) {
      if (draftOk || !siren) return J(409, { error: "Copie client refusée sur un document BROUILLON." });
      if (bodyIn.confirm !== 'SEND') return J(400, { error: "confirm:'SEND' requis." });

      const out = { ref, email: null, whatsapp: null };
      const prenom = String(dossier.prenom || String(dossier.name || '').split(' ')[0] || '').trim();
      const clientEmail = String(dossier.contactEmail || dossier.email || '').trim();
      const clientPhone = String(dossier.phone || dossier.telephone || dossier.wa || '').replace(/[^0-9]/g, '');

      // 1) E-mail avec la copie en pièce jointe
      const key = (process.env.RESEND_API_KEY || '').trim();
      if (!clientEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) {
        out.email = { sent: false, reason: 'aucune adresse client exploitable' };
      } else if (!key) {
        out.email = { sent: false, reason: 'RESEND_API_KEY absente' };
      } else {
        const mail = buildClientEmail('notification_compagnie', {
          prenom, ref, compagnie: dossier.compagnie || dossier.airline || '', vol: dossier.vol || dossier.flightNum || '',
        });
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: (process.env.RDA_MAIL_FROM || 'Robin des Airs <expert@robindesairs.eu>'),
            to: [clientEmail], subject: mail.subject, html: mail.html, text: mail.text,
            attachments: [{ filename, content: pdf.toString('base64') }],
          }),
        });
        const data = await r.json().catch(() => ({}));
        out.email = r.ok ? { sent: true, id: data.id, to: clientEmail } : { sent: false, reason: data.message || String(r.status) };
      }

      // 2) WhatsApp — best-effort, ne fait jamais échouer l'appel : l'e-mail porte la pièce.
      //    Même chemin d'envoi que le CRM (whatsapp-send-core), et le message est journalisé
      //    dans la conversation pour que l'opérateur voie ce que le client a reçu.
      if (!clientPhone) {
        out.whatsapp = { sent: false, reason: 'pas de numéro au dossier' };
      } else if (!canSendWhatsApp()) {
        out.whatsapp = { sent: false, reason: 'WhatsApp non configuré' };
      } else {
        const cieTxt = dossier.compagnie || dossier.airline || 'la compagnie';
        const txt = `Bonjour ${prenom || ''}, nous venons de notifier ${cieTxt} : l'indemnité de votre vol nous a été cédée, elle ne peut plus être réglée qu'entre nos mains. La copie exacte du courrier vient de vous être envoyée par e-mail. Vous n'avez rien à faire.`.replace(/\s+/g, ' ').trim();
        const sent = await sendWhatsAppTextMessage(clientPhone, txt);
        out.whatsapp = sent.ok ? { sent: true } : { sent: false, reason: sent.error };
        if (sent.ok) {
          try {
            await appendWaMessage(event, clientPhone, { role: 'assistant', text: txt, source: 'crm', by: 'notification-cession' });
          } catch (_) { /* journalisation best-effort */ }
        }
      }

      // 3) Trace au dossier : date de notification + copie client (idempotence côté CRM).
      try {
        if (mandats) await mandats.setJSON('m/' + ref, { ...dossier, notifiedAt: new Date().toISOString(), notifCopieClient: out });
      } catch (_) { /* best-effort */ }

      return J(200, out);
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${q.dl ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
      body: pdf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('notification-creance:', e.message);
    return J(500, { error: e.message });
  }
};
