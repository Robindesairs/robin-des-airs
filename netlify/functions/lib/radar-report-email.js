/**
 * Rapport email matin — radar / bandeau + statistiques (Resend).
 */

const SITE_URL = (process.env.URL || 'https://robindesairs.eu').replace(/\/$/, '');
const DEFAULT_RADAR_REPORT_EMAIL = 'expert@robindesairs.eu';

function formatStatsSection(statsReport) {
  if (!statsReport || !statsReport.index) return '(statistiques non disponibles — Blobs)';

  const lines = [];
  const indexDays = statsReport.index.days || [];
  if (!indexDays.length) {
    return '(pas encore de statistiques journalières — attendre quelques créneaux 8h / 16h / soir)';
  }

  lines.push('Résumé par jour (EU ↔ Afrique subsaharienne, hors Maghreb) :');
  for (const row of indexDays.slice(0, 14)) {
    lines.push(
      `• ${row.dateYmd} — bandeau ${row.bannerCount} | scans ${row.scanRuns} | vols vus ${row.impactedSeen} | annul. ${row.cancelled} | ≥3h ${row.delayGte180} | API ~${row.apiRequests} req`
    );
  }

  const today = statsReport.days && statsReport.days[0];
  if (today && today.routes && Object.keys(today.routes).length) {
    const topRoutes = Object.entries(today.routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([r, n]) => `${r} (${n})`);
    lines.push('');
    lines.push(`Trajets les plus touchés aujourd’hui (${today.dateYmd}) : ${topRoutes.join(', ')}`);
  }

  return lines.join('\n');
}

async function sendRadarMorningReport({
  banner,
  dayLog,
  slotSummary,
  statsReport,
  parisDate,
  parisHour,
}) {
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
    (s) => `• [${s.slot} ${s.hour}h] ${s.impacted} vol(s) — ${(s.top || []).join('; ')}`
  );

  const statsBlock = formatStatsSection(statsReport);
  const statsDays = parseInt(process.env.RADAR_STATS_DAYS || '14', 10) || 14;

  const text = [
    `Robin des Airs — Rapport radar ${parisDate} (${parisHour}h Paris)`,
    '',
    '══ Bandeau site (jusqu’à 9 vols EU ↔ Afrique subsaharienne, ≥ 3 h ou annulé) ══',
    lines.length ? lines.join('\n') : '(aucun vol éligible bandeau ce matin)',
    '',
    `══ Statistiques (${statsDays} derniers jours, stockées Netlify Blobs) ══`,
    statsBlock,
    '',
    '══ Créneaux veille / matin (logs horaires) ══',
    slotLines.length ? slotLines.join('\n') : '(pas encore de logs créneaux)',
    '',
    `Site : ${SITE_URL}`,
    `Stats JSON : ${SITE_URL}/api/radar-stats`,
    `Relance matin : POST ${SITE_URL}/api/daily-radar-snapshot`,
    '',
    'Planification :',
    '• 08h — bandeau + ce rapport + stats jour',
    '• 16h–17h — départs Europe → Afrique',
    '• 18h–02h — départs Afrique → Europe',
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
      subject: `Radar ${parisDate} — ${flights.length} vol(s) bandeau · stats`,
      text,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return { ok: false, error: `Resend ${r.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

module.exports = { sendRadarMorningReport, formatStatsSection };
