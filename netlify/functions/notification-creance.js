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

const J = (code, obj) => ({
  statusCode: code,
  headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return J(405, { error: 'GET uniquement' });

  const auth = checkCrmAccess(event);
  if (!auth.ok) return J(401, { error: 'Accès CRM requis' });

  const q = event.queryStringParameters || {};
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
      siren: (process.env.RDA_SIREN || '').trim(),
      iban: (process.env.RDA_IBAN_RECOUVREMENT || '').trim(),
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
