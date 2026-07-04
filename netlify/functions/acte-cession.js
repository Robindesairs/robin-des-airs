/**
 * GET /api/acte-cession?r=REF        → PDF inline de l'ACTE DE CESSION une page, bilingue FR|EN.
 *     /api/acte-cession?r=REF&dl=1   → téléchargement.
 *
 * C'est le document envoyé à la compagnie pour notifier la cession (art. 1324 C. civ.).
 * Généré APRÈS la signature uniquement : refuse (409) tant que signed/<ref> n'existe pas.
 *
 * Sources (cascade) :
 *   1) store 'robin-signatures' → signed/<ref>  : preuve de signature {signed_at, cert_id} (GATE)
 *   2) store 'mandats'          → m/<ref>       : dossier (vol, compagnie, route, passengers[]
 *      mergés par submit-mandat avec les données exactes du contrat signé : dob, birth, minor,
 *      adresse, legalRepName)
 *
 * Auth : opérateur CRM (cookie rda_crm / X-CRM-Code) — document interne destiné à la compagnie,
 * jamais exposé au client. Même modèle que crm-dossier-pdf.js.
 */
'use strict';

const { genererActeCessionPdf } = require('./lib/acte-cession-pdf');
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
    // 1) GATE : l'acte n'existe qu'APRÈS la signature.
    const sigStore = getBlobStore(event, 'robin-signatures');
    if (!sigStore) return J(500, { error: 'store signatures indisponible' });
    const signed = await sigStore.get('signed/' + ref, { type: 'json' });
    if (!signed || !signed.signed_at) {
      return J(409, { error: 'Contrat non signé pour cette référence — acte de cession indisponible.' });
    }

    // 2) Dossier (vol + passagers avec les données du contrat, mergées par submit-mandat).
    const mandats = getBlobStore(event, 'mandats');
    const dossier = (mandats && (await mandats.get('m/' + ref, { type: 'json' }))) || {};

    const pdf = await genererActeCessionPdf({
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
    });

    const nomPrincipal = String((dossier.passengers && dossier.passengers[0] && dossier.passengers[0].name) || dossier.name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Dossier';
    const filename = `Cession-${nomPrincipal}-${String(dossier.vol || '').replace(/[^A-Za-z0-9]/g, '') || 'VOL'}-${codeFromRef(ref)}.pdf`;

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
    console.error('acte-cession:', e.message);
    return J(500, { error: e.message });
  }
};
