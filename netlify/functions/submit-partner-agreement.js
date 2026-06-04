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
    mandataireAccepted: body.mandataireAccepted !== false,
    mandataireName: body.mandataireName || 'Robin des Airs — Partenariats',
    mandataireAcceptedAt: body.mandataireAcceptedAt || ts,
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
          subject: `✅ Partner agreement signed — ${agencyName} (${agencyCode})`,
          html: `<h2>New partner agreement signed</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
  <tr><td style="padding:4px 12px 4px 0;color:#666">Reference</td><td><strong>${ref}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Agency</td><td><strong>${agencyName}</strong> (${agencyCode})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Signatory</td><td>${record.signName} — ${record.signRole}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Country</td><td>${record.country}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">WhatsApp</td><td>${record.whatsapp}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${record.email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Payout method</td><td>${record.payout || '—'}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Commission</td><td><strong>${record.commissionGmd} GMD / pax</strong> (${record.commissionTierLabel}) — locked for life</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Signed at</td><td>${record.sigCity} · ${new Date(ts).toLocaleString('en-GB')}</td></tr>
</table>
${record.signatureImg ? `<p style="margin-top:16px;font-family:sans-serif;font-size:13px;color:#666">Signature:</p><img src="${record.signatureImg}" style="border:1px solid #ccc;max-width:400px">` : ''}
<p style="margin-top:20px;font-family:sans-serif;font-size:13px;color:#999">Ref: ${ref}</p>`,
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
