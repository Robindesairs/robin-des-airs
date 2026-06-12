/**
 * Alerte propriétaire côté BOT Railway → pont vers Netlify /api/owner-alert
 * (qui envoie Telegram + email Resend). Best-effort + timeout : ne bloque jamais
 * le parcours client, et un échec d'alerte est silencieux (mais loggé).
 *
 *   notifyOwnerWhatsApp(contextPhone, message)
 *
 * NB : ce fichier MANQUAIT — le require échouait, donc toutes les alertes équipe
 * (« LEAD INTROUVABLE », reçu de frais, pièce à vérifier…) étaient des no-op.
 */
async function notifyOwnerWhatsApp(context, message) {
  try {
    if (!message) return { ok: false };
    const r = await fetch('https://robindesairs.eu/api/owner-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(message),
        context: String(context || ''),
        secret: (process.env.WATI_WEBHOOK_SECRET || '').trim(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: r.ok };
  } catch (e) {
    console.error('owner-notify', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { notifyOwnerWhatsApp };
