/**
 * submit-partner-agreement — signature contrat agence partenaire
 * POST /api/submit-partner-agreement
 */

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {}

const STORE_NAME = 'robin-partner-agreements';
const { resolvePartnerCommissionTier } = require('./lib/agency-commission-tiers');
const { checkRateLimit } = require('./lib/rate-limit');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };
  }

  const rl = await checkRateLimit(event, { key: 'submit-partner', max: 3, windowSec: 60 });
  if (!rl.ok) return rl.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const ref = (body.ref || '').trim();
  const agencyCode = (body.agencyCode || '').trim();
  const agencyName = (body.agencyName || '').trim();
  if (!ref || !agencyCode || !agencyName) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'ref, agencyCode and agencyName required' }),
    };
  }

  const ts = body.signedAt || new Date().toISOString();
  const lang = body.lang || 'fr';
  const tier = resolvePartnerCommissionTier(ts, lang);
  const record = {
    ref,
    signed_at: ts,
    commissionGmd: body.commissionGmd != null ? Number(body.commissionGmd) : tier.commissionGmd,
    commissionTier: body.commissionTier || tier.tierId,
    commissionTierLabel: body.commissionTierLabel || tier.tierLabel,
    agencyName,
    agencyCode,
    signName: body.signName || '',
    signRole: body.signRole || '',
    signAuthority: body.signAuthority || '',
    companyReg: body.companyReg || '',
    whatsapp: body.whatsapp || '',
    email: body.email || '',
    country: body.country || '',
    address: body.address || '',
    payout: body.payout || '',
    sigCity: body.sigCity || '',
    signatureImg: body.signatureImg || '',
    source: body.source || 'partner-agreement',
  };

  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const key = `agreement/${agencyCode}/${ref}`.replace(/[^a-zA-Z0-9/_-]/g, '_');
      await store.setJSON(key, record);
    } catch (e) {
      console.error('submit-partner-agreement: Blobs', e.message);
    }
  }

  const notifyEmail = (process.env.PARTNER_AGREEMENT_NOTIFY_EMAIL || process.env.MANDAT_NOTIFY_EMAIL || '').trim();
  if (notifyEmail && process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.MANDAT_NOTIFY_FROM || 'Robin des Airs <contact@robindesairs.eu>',
          to: [notifyEmail],
          subject: `Contrat partenaire signé — ${agencyName} (${agencyCode})`,
          text: `Réf. ${ref}\nAgence: ${agencyName}\nCode: ${agencyCode}\nCommission palier date (indicatif): ${record.commissionGmd} GMD (${record.commissionTierLabel})\n\n→ AGENCY_ACCOUNTS : "commissionGmd": …, "commissionTier": "founding" (4 000) OU "${record.commissionTier}", "partnerSignedAt": "${ts}"\n→ Si parmi les 3 premières agences ET signature avant le 31/08/2026 : 4 000 GMD acquis à vie (manuel).\n\nSignataire: ${record.signName} (${record.signRole})\nWhatsApp: ${record.whatsapp}\nEmail: ${record.email}\nPays: ${record.country}`,
        }),
      });
    } catch (e) {
      console.error('submit-partner-agreement: email', e.message);
    }
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      ref,
      commissionGmd: record.commissionGmd,
      commissionTier: record.commissionTier,
      commissionTierLabel: record.commissionTierLabel,
    }),
  };
};
