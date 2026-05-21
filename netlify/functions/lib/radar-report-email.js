/**
 * Rapport email matin — radar / bandeau (Resend).
 */

const SITE_URL = (process.env.URL || 'https://robindesairs.eu').replace(/\/$/, '');
const DEFAULT_RADAR_REPORT_EMAIL = 'expert@robindesairs.eu';

async function sendRadarMorningReport({ banner, dayLog, slotSummary, parisDate, parisHour }) {
  const to = (
    process.env.RADAR_REPORT_EMAIL ||
    process.env.MANDAT_NOTIFY_EMAIL ||
    process.env.PARTNER_AGREEMENT_NOTIFY_EMAIL ||
    DEFAULT_RADAR_REPORT_EMAIL
  ).trim();
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!to || !key) {
    return { ok: false, skipped: true, reason: 'RADAR_REPORT_EMAIL ou RESEND_API_KEY manquant' };
  }

  const flights = (banner && banner.flights) || [];
  const lines = flights.map(
    (f) =>
      `• ${f.flight} ${f.dep}→${f.arr} ${f.scheduledDate || ''} — ${
        f.cancelled ? 'ANNULÉ' : f.delayMinutes != null ? `retard ${f.delayMinutes} min` : '—'
      }`
  );

  const slotLines = (slotSummary || []).map(
    (s) => `• [${s.slot} ${s.hour}h] ${s.impacted} vol(s) à surveiller — ${(s.top || []).join('; ')}`
  );

  const text = [
    `Robin des Airs — Rapport radar ${parisDate} (${parisHour}h Paris)`,
    '',
    '══ Bandeau site (10 derniers vols impactés EU ↔ Afrique) ══',
    lines.length ? lines.join('\n') : '(aucun vol impacté en cache — vérifier RAPIDAPI_KEY / quota)',
    '',
    '══ Créneaux dernières 24h ══',
    slotLines.length ? slotLines.join('\n') : '(pas encore de logs créneaux)',
    '',
    `Bandeau : ${SITE_URL}`,
    `Relance snapshot : ${SITE_URL}/api/daily-radar-snapshot`,
    '',
    'Créneaux automatiques :',
    '• 08h — bandeau + ce rapport',
    '• 16h–17h — départs Europe → Afrique (anticipation retour)',
    '• 18h–02h (chaque heure) — départs Afrique / escales → Europe',
  ].join('\n');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MANDAT_NOTIFY_FROM || 'Robin des Airs <contact@robindesairs.eu>',
      to: [to],
      subject: `Radar matin ${parisDate} — ${flights.length} vol(s) bandeau`,
      text,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return { ok: false, error: `Resend ${r.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

module.exports = { sendRadarMorningReport };
