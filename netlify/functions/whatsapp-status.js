/**
 * Statut de la connexion WhatsApp (360dialog).
 * GET /api/whatsapp-status — indique si les variables sont configurées (sans exposer les clés).
 */

exports.handler = async () => {
  const hasVerifyToken = Boolean(process.env.WHATSAPP_API_KEY);
  const has360DialogKey = Boolean(process.env.WHATSAPP_360DIALOG_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const tunnelEnabled = process.env.ROBIN_TUNNEL_ENABLED === 'true' || (hasGemini && process.env.ROBIN_TUNNEL_ENABLED !== 'false');

  const connected = hasVerifyToken && has360DialogKey;
  const status = connected ? 'ok' : 'config_missing';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      whatsapp: status,
      message: connected
        ? 'WhatsApp est connecté (webhook + envoi configurés).'
        : 'Configuration incomplète : vérifiez WHATSAPP_API_KEY et WHATSAPP_360DIALOG_API_KEY sur Netlify.',
      webhook_verify_configured: hasVerifyToken,
      can_send_replies: has360DialogKey,
      tunnel_available: hasGemini,
      tunnel_enabled: tunnelEnabled,
    }),
  };
};
