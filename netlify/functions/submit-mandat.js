/**
 * submit-mandat — Robin des Airs
 * Enregistrement serveur du mandat signé (formulaire mandat.html).
 *
 * POST /api/submit-mandat
 */

let netlifyBlobsModule = null;
try { netlifyBlobsModule = require('@netlify/blobs'); } catch (e) {}

const STORE_NAME = 'robin-signatures';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://robindesairs.eu',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

function generateCertId(phone, ref, ts) {
  const date = (ts || new Date().toISOString()).substring(0, 10).replace(/-/g, '');
  const shortPhone = (phone || '').replace(/\D/g, '').slice(-4) || 'XXXX';
  const shortRef = (ref || '').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'AAAAAA';
  return `RDA-${date}-${shortPhone}-${shortRef}`;
}

async function forwardWebhook(record) {
  const url = process.env.MANDAT_SIGNED_WEBHOOK_URL;
  if (!url) return;
  const secret = process.env.MANDAT_SIGNED_WEBHOOK_SECRET || '';
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Mandat-Secret': secret } : {}),
      },
      body: JSON.stringify(record),
    });
  } catch (e) {
    console.error('submit-mandat: webhook error:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Corps JSON invalide' }) };
  }

  const phone = (body.whatsapp || body.phone || '').trim();
  const ref = (body.ref || '').trim();
  if (!phone || !ref) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'ref et whatsapp obligatoires' }),
    };
  }

  const ts = body.signedAt || new Date().toISOString();
  const certId = generateCertId(phone, ref, ts);

  const rawIp = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['client-ip']
    || 'unknown';
  const ipHash = hashString(rawIp + ts.substring(0, 10));

  const record = {
    cert_id: certId,
    ref,
    signed_at: ts,
    ip_hash: ipHash,
    user_agent: (event.headers?.['user-agent'] || '').substring(0, 150),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    whatsapp: phone,
    email: body.email || '',
    address: body.address || '',
    startNow: !!body.startNow,
    coPassAgreement: !!body.coPassAgreement,
    airline: body.airline || '',
    flightNum: body.flightNum || '',
    flightDate: body.flightDate || '',
    pnr: body.pnr || '',
    incident: body.incident || '',
    pax: body.pax || 1,
    passengerNames: body.passengerNames || [],
    passengersData: body.passengersData || [],
    depAirport: body.depAirport || '',
    arrAirport: body.arrAirport || '',
    signCity: body.signCity || '',
    signDate: body.signDate || '',
    signatureImg: body.signatureImg || '',
    source: body.source || 'web',
  };

  if (netlifyBlobsModule) {
    try {
      const blobs = netlifyBlobsModule;
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      const phoneKey = phone.replace(/\D/g, '');
      const key = `sig/${phoneKey}/${ref}`;
      await store.setJSON(key, record);

      let index = [];
      try { index = await store.getJSON('__index') || []; } catch { index = []; }
      index.unshift({
        cert_id: certId,
        ref,
        phone_hash: hashString(phone),
        flightNum: record.flightNum,
        signed_at: ts,
      });
      if (index.length > 500) index = index.slice(0, 500);
      await store.setJSON('__index', index);
    } catch (e) {
      console.error('submit-mandat: Blobs error:', e.message);
    }
  } else {
    console.warn('submit-mandat: Netlify Blobs non disponible');
  }

  await forwardWebhook(record);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, cert_id: certId, ref }),
  };
};
