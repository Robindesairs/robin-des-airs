/**
 * Statut WhatsApp — Wati / Meta / 360dialog
 * GET /api/whatsapp-status
 */

const { watiCfg } = require('./lib/wati-api');
const { getProvider, canSendWhatsApp } = require('./lib/whatsapp-send-core');

exports.handler = async () => {
  const wati = watiCfg();
  const provider = getProvider();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const tunnelEnabled =
    process.env.ROBIN_TUNNEL_ENABLED === 'true' ||
    (hasGemini && process.env.ROBIN_TUNNEL_ENABLED !== 'false');
  const blobsHint = 'Netlify Blobs requis pour l’historique CRM';

  const connected = canSendWhatsApp();
  const status = connected ? 'ok' : 'config_missing';

  let message;
  if (provider.name === 'wati') {
    message = connected
      ? 'WhatsApp via Wati — envoi CRM et Make OK.'
      : 'Wati : vérifiez WATI_API_BASE et WATI_API_TOKEN sur Netlify.';
  } else if (provider.name === 'meta') {
    message = connected ? 'WhatsApp via Meta Cloud API.' : 'Meta : token ou phone_number_id manquant.';
  } else if (provider.name === '360dialog') {
    message = connected
      ? 'WhatsApp via 360dialog (legacy).'
      : '360dialog : WHATSAPP_360DIALOG_API_KEY manquant.';
  } else {
    message =
      'Aucun fournisseur actif. Configurez Wati (recommandé) : WATI_API_BASE + WATI_API_TOKEN.';
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      whatsapp: status,
      provider: provider.name || null,
      robin_number: (process.env.WATI_CHANNEL_PHONE || process.env.WHATSAPP_CONTACT_NUMBER || '33756863630').replace(
        /\D/g,
        ''
      ),
      message,
      wati_configured: !!wati,
      wati_api_base_set: !!(process.env.WATI_API_BASE || process.env.WATI_API_ENDPOINT),
      webhook_wati: 'https://robindesairs.eu/api/wati-webhook',
      webhook_legacy_360dialog: 'https://robindesairs.eu/api/whatsapp-webhook',
      can_send_replies: connected,
      crm_inbox: blobsHint,
      tunnel_available: hasGemini,
      tunnel_enabled: tunnelEnabled,
    }),
  };
};
