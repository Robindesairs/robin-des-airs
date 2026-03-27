/**
 * Log des clics WhatsApp en tant que prospects CRM.
 *
 * Route attendue (via redirect Netlify): /api/wa-click-prospect
 * Environnement:
 * - ROBIN_LOG_WEBHOOK_URL (optionnel mais recommandé): webhook Make/CRM
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  let payload = {};
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  } catch (_) {
    payload = {};
  }

  const logWebhookUrl = process.env.ROBIN_LOG_WEBHOOK_URL;
  const ip =
    event.headers?.['x-forwarded-for'] ||
    event.headers?.['client-ip'] ||
    '';
  const userAgent = event.headers?.['user-agent'] || '';
  const nowIso = new Date().toISOString();

  const logPayload = {
    event_type: 'whatsapp_click',
    statut: 'prospect_anonyme',
    lead_stage: 'prospect_anonyme',
    source: payload.source || 'site',
    page: payload.page || '/',
    href: payload.href || '',
    referrer: payload.referrer || '',
    ts: nowIso,
    date: nowIso,
    direction: 'in',
    message_type: 'event',
    body_text: 'Prospect: clic WhatsApp site',
    wa_id: null,
    from_phone: null,
    message_id: `wa_click_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    raw_payload: JSON.stringify({
      ip,
      userAgent,
      page: payload.page || '/',
      href: payload.href || '',
      source: payload.source || 'site',
      referrer: payload.referrer || ''
    })
  };

  if (logWebhookUrl) {
    try {
      await fetch(logWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload)
      });
    } catch (_) {
      // Ne jamais bloquer l'utilisateur sur un échec de log.
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
