/**
 * Notification au PROPRIÉTAIRE quand un client écrit sur WhatsApp (WATI).
 * Canaux : email (Resend) + Telegram (si TELEGRAM_CHAT_ID configuré).
 * Anti-spam : 1 notif max par numéro toutes les 30 min (Netlify Blobs).
 *
 * Variables d'env utiles :
 *   RESEND_API_KEY        — déjà configurée
 *   OWNER_EMAIL           — destinataire (défaut : expert@robindesairs.eu)
 *   MANDAT_NOTIFY_FROM    — expéditeur validé (défaut : Robin des Airs <contact@robindesairs.eu>)
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — pour la notif Telegram instantanée (optionnel)
 *   OWNER_NOTIFY_THROTTLE_MIN — fenêtre anti-spam en minutes (défaut 30)
 */

const { sendTelegramText } = require('./robin-notify');

function throttleMs() {
  const m = parseInt(process.env.OWNER_NOTIFY_THROTTLE_MIN || '30', 10);
  return (Number.isFinite(m) ? m : 30) * 60 * 1000;
}

// true si on doit notifier (pas notifié pour ce numéro dans la fenêtre)
async function shouldNotify(phone) {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('owner-notify');
    const last = await store.get(phone, { type: 'json' });
    const now = Date.now();
    if (last && last.t && now - last.t < throttleMs()) return false;
    await store.setJSON(phone, { t: now });
    return true;
  } catch (e) {
    return true; // Blobs indispo → on notifie quand même (mieux vaut un doublon qu'un client raté)
  }
}

async function sendEmail(subject, text) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, reason: 'no_resend' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MANDAT_NOTIFY_FROM || 'Robin des Airs <contact@robindesairs.eu>',
        to: [process.env.OWNER_EMAIL || process.env.RADAR_REPORT_EMAIL || 'expert@robindesairs.eu'],
        subject,
        text,
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error('owner-notify email:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Notifie le propriétaire qu'un client a écrit sur WhatsApp.
 * @param {string} phone - numéro du client (sans +)
 * @param {string} text  - message reçu
 */
async function notifyOwnerWhatsApp(phone, text) {
  if (!phone) return { ok: false, reason: 'no_phone' };
  if (!(await shouldNotify(phone))) return { ok: true, skipped: 'throttled' };

  const extrait = String(text || '').trim().slice(0, 300) || '(message non textuel)';
  const msg =
    `📲 Nouveau client WhatsApp\n\n` +
    `Numéro : +${phone}\n` +
    `Message : « ${extrait} »\n\n` +
    `Le bot Robin lui répond automatiquement. Réponds-lui dans WATI si besoin.\n` +
    `Inbox : https://app.wati.io/`;

  // Telegram (instantané, no-op si TELEGRAM_CHAT_ID manquant)
  try { await sendTelegramText(msg); } catch (e) { /* ignore */ }
  // Email
  await sendEmail(`📲 Client WhatsApp : +${phone}`, msg);

  return { ok: true };
}

/**
 * Notification générique au propriétaire (Telegram + email), sans throttle.
 * Utilisée par le radar pour les alertes vol (déjà dédupliquées en amont).
 */
async function notifyOwner(subject, text) {
  try { await sendTelegramText(text); } catch (e) { /* ignore */ }
  await sendEmail(subject, text);
  return { ok: true };
}

module.exports = { notifyOwnerWhatsApp, notifyOwner };
