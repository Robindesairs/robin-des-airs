/**
 * Notifications équipe Robin (Telegram).
 */

async function sendTelegramText(text, opts = {}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  let chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (opts.chatId) chatId = String(opts.chatId).trim();
  if (!token || !chatId) {
    return { ok: false, reason: 'telegram_not_configured' };
  }
  const body = String(text || '').slice(0, 4000);
  if (!body) return { ok: false, reason: 'empty_message' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: body,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error('robin-notify:', data);
      return { ok: false, error: data.description || 'telegram_error' };
    }
    return { ok: true };
  } catch (e) {
    console.error('robin-notify:', e.message);
    return { ok: false, error: e.message };
  }
}

async function notifyAgencyDossierCreated(agency, dossier, opts = {}) {
  const attente = opts.attenteIncident;
  const title = attente
    ? "⏳ Billet vendu — en attente d'incident"
    : '📋 Nouveau dossier agence';
  const lines = [
    title,
    '',
    `Agence : ${agency.code} — ${agency.name}`,
    `Réf. : ${dossier.ref || '—'}`,
    `Passager : ${[dossier.prenom, dossier.nom].filter(Boolean).join(' ')}`,
    `Vol : ${dossier.vol || '—'} · PNR ${dossier.pnr || '—'}`,
    `Problème : ${dossier.probleme || '—'}`,
    '',
    '🏹 Robin des Airs — espace agence',
  ];
  return sendTelegramText(lines.join('\n'));
}

async function notifyAttenteIncidentConfirmed(data) {
  const lines = [
    '🔔 Incident confirmé (ex-billet en attente)',
    '',
    `Réf. : ${data.ref || '—'}`,
    `Passager : ${data.name || '—'}`,
    `Incident : ${data.incident || '—'}`,
    `Statut : ${data.statutSuivi || '—'}`,
    '',
    '→ Traiter le dossier EU 261 dans Airtable / CRM.',
  ];
  return sendTelegramText(lines.join('\n'));
}

module.exports = {
  sendTelegramText,
  notifyAgencyDossierCreated,
  notifyAttenteIncidentConfirmed,
};
