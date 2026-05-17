/**
 * Webhook Airtable → Netlify
 * Déclencher depuis une automation Airtable (changement de statut, etc.)
 *
 * POST /api/airtable-webhook
 * Header ou body : secret = AIRTABLE_WEBHOOK_SECRET
 *
 * Body attendu (exemple automation) :
 * {
 *   "secret": "...",
 *   "recordId": "recXXXXXXXX",
 *   "action": "mandat_a_envoyer"   // optionnel, sinon déduit du statut
 * }
 *
 * Si Statut du Dossier Suivi = « Mandat à envoyer » :
 *   - renvoie mandat_url
 *   - optionnel : envoi WhatsApp (send-whatsapp) si WHATSAPP_* configuré
 *   - met à jour Airtable → « Signature en attente »
 */

const {
  airtableCfg,
  recordFromAirtableFields,
  buildMandatUrl,
  airtableGetRecord,
  airtablePatch,
  verifySecret,
} = require('./lib/airtable-robin');
const { sendWhatsAppTextMessage } = require('./lib/whatsapp-send-core');
const { notifyAttenteIncidentConfirmed } = require('./lib/robin-notify');
const { INCIDENT_ATTENTE_LABEL } = require('./lib/agency-airtable');

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Airtable-Secret',
};

async function sendMandatWhatsApp(phone, text) {
  return sendWhatsAppTextMessage(phone, text);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'POST uniquement' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const auth = verifySecret(body, event.headers || {});
  if (!auth.ok) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: auth.error }) };
  }

  const cfg = airtableCfg();
  if (!cfg) {
    return {
      statusCode: 503,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Airtable non configuré (AIRTABLE_API_KEY, BASE, TABLE)' }),
    };
  }

  const recordId = (body.recordId || body.record_id || body.id || '').trim();
  if (!recordId) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'recordId obligatoire' }) };
  }

  try {
    const rec = await airtableGetRecord(cfg, recordId);
    const fields = rec.fields || {};
    const data = recordFromAirtableFields(cfg, fields);
    const mandat_url = buildMandatUrl(data, 'airtable-webhook');

    const action = (body.action || '').trim().toLowerCase();
    const statut = (data.statutSuivi || '').trim();
    const isMandatAEnvoyer =
      action === 'mandat_a_envoyer' ||
      statut === cfg.statutMandatAEnvoyer;

    const result = {
      ok: true,
      recordId,
      ref: data.ref,
      mandat_url,
      statut_avant: statut,
    };
    const prevIncident = String(body.previousIncident || body.incident_avant || '').trim();
    const nowIncident = String(data.motif || '').trim();
    const wasAttente =
      /attente d'incident|billet vendu/i.test(prevIncident) ||
      prevIncident === INCIDENT_ATTENTE_LABEL;
    const isNowReal =
      nowIncident && !/attente d'incident|billet vendu/i.test(nowIncident);

    if (action === 'incident_confirmed' || (wasAttente && isNowReal)) {
      result.attente_incident_confirmed = true;
      notifyAttenteIncidentConfirmed({
        ref: data.ref,
        name: data.name,
        incident: nowIncident,
        statutSuivi: statut,
      }).catch((e) => console.warn('airtable-webhook: notify attente', e.message));
    }

    if (isMandatAEnvoyer) {
      if (data.whatsapp && (body.sendWhatsApp !== false)) {
        const prenom = data.prenom || 'Bonjour';
        const msg =
          `Bonjour ${prenom},\n\nVoici votre lien pour signer votre mandat Robin des Airs (2 min) :\n\n${mandat_url}\n\nUne fois signé, nous traitons votre dossier immédiatement. 🏹`;
        result.whatsapp = await sendMandatWhatsApp(data.whatsapp, msg);
      }

      const note = `Lien mandat envoyé via Netlify le ${new Date().toISOString()}`;
      const remarques = data.remarques ? `${data.remarques} | ${note}` : note;
      await airtablePatch(cfg, recordId, {
        [cfg.labels.statutSuivi]: cfg.statutSignatureAttente,
        [cfg.labels.remarques]: remarques,
      });
      result.statut_apres = cfg.statutSignatureAttente;
      result.airtable_updated = true;
    }

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(result) };
  } catch (e) {
    console.error('airtable-webhook:', e.message);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
