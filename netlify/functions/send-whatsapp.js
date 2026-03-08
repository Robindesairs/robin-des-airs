/**
 * Envoi de messages WhatsApp automatisés — support Meta Cloud API et 360dialog.
 *
 * Deux fournisseurs possibles (un seul à configurer) :
 *
 * A) 360dialog (https://waba-v2.360dialog.io)
 *    WHATSAPP_PROVIDER = "360dialog"
 *    WHATSAPP_360DIALOG_API_KEY = votre clé API 360dialog (header D360-API-KEY)
 *
 * B) Meta Cloud API (Graph API)
 *    WHATSAPP_ACCESS_TOKEN = token Meta
 *    WHATSAPP_PHONE_NUMBER_ID = ID du numéro WhatsApp Business
 *
 * Optionnel : WHATSAPP_WEBHOOK_SECRET — si défini, le body doit contenir "secret": "<valeur>".
 *
 * POST /.netlify/functions/send-whatsapp
 * Body template : { "to": "33612345678", "template": "dossier_reçu", "templateParams": ["Marie", "RDA-260308-1234"] }
 * Body texte (réponse < 24h) : { "to": "33612345678", "text": "Votre message ici" }
 */

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const D360_BASE = 'https://waba-v2.360dialog.io';

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  if (!digits.startsWith('33') && digits.length <= 9) return '33' + digits;
  return digits;
}

function getProvider() {
  const provider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();
  const d360Key = process.env.WHATSAPP_360DIALOG_API_KEY;
  if (provider === '360dialog' || d360Key) return { name: '360dialog', apiKey: d360Key };
  return {
    name: 'meta',
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  const provider = getProvider();
  if (provider.name === '360dialog' && !provider.apiKey) {
    console.error('send-whatsapp: WHATSAPP_360DIALOG_API_KEY manquant');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Configuration 360dialog manquante (WHATSAPP_360DIALOG_API_KEY)' })
    };
  }
  if (provider.name === 'meta' && (!provider.token || !provider.phoneNumberId)) {
    console.error('send-whatsapp: WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Configuration Meta manquante (variables d’environnement)' })
    };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Body JSON invalide' })
    };
  }

  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (webhookSecret && body.secret !== webhookSecret) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Secret invalide' })
    };
  }

  const to = normalizePhone(body.to);
  const textBody = typeof body.text === 'string' ? body.text.trim() : '';
  const templateName = (body.template || '').trim();
  const templateParams = Array.isArray(body.templateParams) ? body.templateParams : [];

  if (!to || to.length < 10) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Numéro de destinataire invalide (to)' })
    };
  }

  let payload;
  if (textBody) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/^\+/, ''),
      type: 'text',
      text: { body: textBody.slice(0, 4096) }
    };
  } else if (templateName) {
    const components = [];
    if (templateParams.length > 0) {
      components.push({
        type: 'body',
        parameters: templateParams.slice(0, 10).map(t => ({ type: 'text', text: String(t).slice(0, 4096) }))
      });
    }
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: body.language || 'fr' },
        components: components.length ? components : undefined
      }
    };
    if (!payload.template.components || payload.template.components.length === 0) {
      delete payload.template.components;
    }
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Indiquez "text" ou "template" dans le body' })
    };
  }

  try {
    let url, headers;
    if (provider.name === '360dialog') {
      url = `${D360_BASE}/messages`;
      headers = {
        'D360-API-KEY': provider.apiKey,
        'Content-Type': 'application/json'
      };
    } else {
      url = `${META_GRAPH_BASE}/${provider.phoneNumberId}/messages`;
      headers = {
        'Authorization': `Bearer ${provider.token}`,
        'Content-Type': 'application/json'
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('send-whatsapp: erreur API', { provider: provider.name, status: res.status, data });
      return {
        statusCode: res.status >= 500 ? 502 : 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Erreur WhatsApp',
          details: data.error?.message || data
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, messageId: data.messages?.[0]?.id })
    };
  } catch (err) {
    console.error('send-whatsapp:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Erreur serveur', details: err.message })
    };
  }
};
