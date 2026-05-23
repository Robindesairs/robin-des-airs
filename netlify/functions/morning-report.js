/**
 * Rapport matinal Robin des Airs — WhatsApp 9h15 Paris.
 * Scheduled : netlify.toml → 15 7 * * * (= 9h15 CEST été / 10h15 CET hiver)
 *
 * Sources :
 *   1. Plausible Analytics  — visiteurs + pays hier (PLAUSIBLE_API_KEY)
 *   2. Airtable CRM         — mandats nouveaux / signés / pipeline (AIRTABLE_API_KEY)
 *   3. Netlify Blobs robin-wa         — contacts WhatsApp uniques totaux
 *   4. Netlify Blobs robin-radar-ticker — stats radar + banneau actuel
 *
 * Test manuel :
 *   GET /api/morning-report?force=1
 */

'use strict';

const { getStore } = require('@netlify/blobs');
const { sendCallMeBot } = require('./lib/callmebot');
const { getParisParts } = require('./lib/radar-monitor-config');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers date
// ─────────────────────────────────────────────────────────────────────────────

/** Hier en heure Paris → YYYY-MM-DD */
function getYesterdayParisYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - 24 * 3600 * 1000));
}

/** Aujourd'hui en heure Paris → libellé lisible (ex: "Samedi 24 mai 2026") */
function getTodayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Plausible Analytics
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS = {
  FR:'🇫🇷', SN:'🇸🇳', CI:'🇨🇮', CM:'🇨🇲', ML:'🇲🇱', GN:'🇬🇳', NG:'🇳🇬',
  GH:'🇬🇭', BE:'🇧🇪', GB:'🇬🇧', DE:'🇩🇪', ES:'🇪🇸', MA:'🇲🇦', DZ:'🇩🇿',
  CD:'🇨🇩', GA:'🇬🇦', MG:'🇲🇬', BF:'🇧🇫', TG:'🇹🇬', BJ:'🇧🇯', NE:'🇳🇪',
  MR:'🇲🇷', GM:'🇬🇲', IT:'🇮🇹', PT:'🇵🇹', NL:'🇳🇱', CH:'🇨🇭', US:'🇺🇸',
  CA:'🇨🇦', LU:'🇱🇺', RE:'🇷🇪', GP:'🇬🇵', MQ:'🇲🇶', GF:'🇬🇫',
};
function flag(code) { return COUNTRY_FLAGS[(code || '').toUpperCase()] || '🌍'; }

async function fetchPlausibleStats(dateYmd) {
  const apiKey = process.env.PLAUSIBLE_API_KEY;
  if (!apiKey) return null;

  const siteId = process.env.PLAUSIBLE_SITE_ID || 'robindesairs.eu';
  const base = 'https://plausible.io/api/v1/stats';
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const qs = `site_id=${encodeURIComponent(siteId)}&period=day&date=${dateYmd}`;

  try {
    const [aggRes, breakdownRes] = await Promise.all([
      fetch(`${base}/aggregate?${qs}&metrics=visitors,pageviews,bounce_rate,visit_duration`, { headers }),
      fetch(`${base}/breakdown?${qs}&property=visit:country&metrics=visitors&limit=5`, { headers }),
    ]);

    const [agg, breakdown] = await Promise.all([aggRes.json(), breakdownRes.json()]);

    const r = agg.results || {};
    return {
      visitors:     r.visitors?.value     || 0,
      pageviews:    r.pageviews?.value    || 0,
      bounceRate:   Math.round(r.bounce_rate?.value    || 0),
      avgDuration:  Math.round((r.visit_duration?.value || 0) / 60), // en minutes
      topCountries: (breakdown.results || []).slice(0, 4).map(c => ({
        code: c.country,
        visitors: c.visitors,
      })),
    };
  } catch (e) {
    console.warn('[morning-report] Plausible error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Airtable — mandats & pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function airtableFetch(formula, fields) {
  const apiKey  = process.env.AIRTABLE_API_KEY;
  const baseId  = process.env.AIRTABLE_BASE_ID  || 'appv72lKbQtjt7EIP';
  const tableId = process.env.AIRTABLE_TABLE_ID || 'tblfg688AGxaywi7O';
  if (!apiKey) return null;

  const headers = { Authorization: `Bearer ${apiKey}` };
  const allRecords = [];
  let offset = '';

  do {
    const params = new URLSearchParams({ filterByFormula: formula });
    for (const f of fields) params.append('fields[]', f);
    if (offset) params.set('offset', offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`,
      { headers }
    );
    if (!res.ok) { console.warn('[morning-report] Airtable', res.status); return null; }
    const data = await res.json();
    allRecords.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);

  return allRecords;
}

async function fetchMandateStats(yesterdayYmd) {
  const TERMINAL = ['Payé client', 'Refus définitif', 'Abandon', 'Prescrit'];
  const FIELDS = [
    'Statut du Dossier Suivi',
    "Montant de l'indemnité",
    'Commission RDA (30%)',
    'Type d\'incident',
  ];

  try {
    const [yesterdayRecs, pipelineRecs] = await Promise.all([
      airtableFetch(`{Date Dossier}='${yesterdayYmd}'`, FIELDS),
      airtableFetch(
        `NOT(OR(${TERMINAL.map(s => `{Statut du Dossier Suivi}='${s}'`).join(',')}))`,
        FIELDS
      ),
    ]);

    if (!yesterdayRecs || !pipelineRecs) return null;

    const signedYesterday = yesterdayRecs.filter(
      r => r.fields['Statut du Dossier Suivi'] === 'Mandat signé'
    ).length;

    let pipelineGross = 0, pipelineRobin = 0;
    const statusCount = {};
    for (const r of pipelineRecs) {
      pipelineGross += Number(r.fields["Montant de l'indemnité"] || 0);
      pipelineRobin += Number(r.fields['Commission RDA (30%)']   || 0);
      const s = r.fields['Statut du Dossier Suivi'] || 'Inconnu';
      statusCount[s] = (statusCount[s] || 0) + 1;
    }

    const topStatuses = Object.entries(statusCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      newYesterday:   yesterdayRecs.length,
      signedYesterday,
      totalActive:    pipelineRecs.length,
      pipelineGross:  Math.round(pipelineGross),
      pipelineRobin:  Math.round(pipelineRobin),
      topStatuses,
    };
  } catch (e) {
    console.warn('[morning-report] Airtable error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WhatsApp contacts (Netlify Blobs robin-wa)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWhatsAppStats() {
  try {
    const store  = getStore('robin-wa');
    const listed = await store.list({ prefix: 'convo/' });
    const total  = (listed.blobs || []).length;

    // Nouveaux contacts hier : on lit les 50 derniers blobs pour estimer
    // (lecture complète trop coûteuse si >1000 contacts)
    let newYesterday = null;
    try {
      const yesterdayYmd = getYesterdayParisYmd();
      const sample = (listed.blobs || []).slice(-100);
      let count = 0;
      await Promise.all(
        sample.map(async (b) => {
          const raw = await store.get(b.key).catch(() => null);
          if (!raw) return;
          const msgs = JSON.parse(raw);
          const first = msgs && msgs[0] && msgs[0].timestamp;
          if (first && String(first).slice(0, 10) === yesterdayYmd) count++;
        })
      );
      newYesterday = count;
    } catch (_) { /* skip */ }

    return { totalContacts: total, newYesterday };
  } catch (e) {
    console.warn('[morning-report] WhatsApp stats error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Radar stats (Netlify Blobs robin-radar-ticker)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRadarStats(yesterdayYmd) {
  try {
    const store = getStore('robin-radar-ticker');
    const [indexRaw, bannerRaw] = await Promise.all([
      store.get('stats/index.json').catch(() => null),
      store.get('banner/latest.json').catch(() => null),
    ]);

    const index   = indexRaw  ? JSON.parse(indexRaw)  : [];
    const banner  = bannerRaw ? JSON.parse(bannerRaw) : null;
    const yesterday = (index || []).find(d => d.dateYmd === yesterdayYmd) || null;

    return {
      yesterday,
      bannerCount:   banner ? (banner.count || 0) : 0,
      bannerFlights: banner ? (banner.flights || []).slice(0, 3) : [],
      updatedAt:     banner ? banner.updatedAt : null,
    };
  } catch (e) {
    console.warn('[morning-report] Radar stats error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatage du message WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('fr-FR');
}
function eur(n) {
  if (!n && n !== 0) return '—';
  return `${fmt(Math.round(n))} €`;
}

function buildMessage({ today, yesterday, plausible, mandates, whatsapp, radar }) {
  const lines = [];

  lines.push(`🌅 Rapport Robin des Airs`);
  lines.push(`📅 ${today}`);
  lines.push('');

  // ── Visiteurs ──
  lines.push(`🌐 SITE WEB (hier)`);
  if (plausible) {
    lines.push(`• Visiteurs  : ${fmt(plausible.visitors)}`);
    lines.push(`• Pages vues : ${fmt(plausible.pageviews)}`);
    lines.push(`• Taux rebond: ${plausible.bounceRate}%`);
    if (plausible.avgDuration) {
      lines.push(`• Durée moy. : ${plausible.avgDuration} min`);
    }
    if (plausible.topCountries.length) {
      lines.push(`• Top pays   : ${plausible.topCountries.map(c => `${flag(c.code)} ${fmt(c.visitors)}`).join(' · ')}`);
    }
  } else {
    lines.push(`• Configurer PLAUSIBLE_API_KEY pour activer`);
  }
  lines.push('');

  // ── WhatsApp ──
  lines.push(`📱 WHATSAPP`);
  if (whatsapp) {
    lines.push(`• Contacts totaux : ${fmt(whatsapp.totalContacts)}`);
    if (whatsapp.newYesterday != null) {
      lines.push(`• Nouveaux hier   : ~${whatsapp.newYesterday}`);
    }
  } else {
    lines.push(`• Données indisponibles`);
  }
  lines.push('');

  // ── Mandats ──
  lines.push(`📋 MANDATS`);
  if (mandates) {
    lines.push(`• Nouveaux hier    : ${mandates.newYesterday}`);
    lines.push(`• Signés hier      : ${mandates.signedYesterday}`);
    lines.push(`• Dossiers actifs  : ${mandates.totalActive}`);
    lines.push(`• Pipeline brut    : ${eur(mandates.pipelineGross)}`);
    if (mandates.pipelineRobin) {
      lines.push(`• Cible Robin (30%): ${eur(mandates.pipelineRobin)}`);
    }
    if (mandates.topStatuses.length) {
      const top = mandates.topStatuses.map(([s, n]) => `${s} (${n})`).join(', ');
      lines.push(`• Top statuts      : ${top}`);
    }
  } else {
    lines.push(`• Configurer AIRTABLE_API_KEY pour activer`);
  }
  lines.push('');

  // ── Radar ──
  lines.push(`✈️ RADAR`);
  if (radar) {
    lines.push(`• Bandeau actuel : ${radar.bannerCount} vol(s) perturbé(s)`);
    if (radar.bannerFlights.length) {
      for (const f of radar.bannerFlights) {
        const delay = f.cancelled
          ? '🚫 Annulé'
          : f.delayMinutes != null
          ? `+${Math.round(f.delayMinutes / 60)}h`
          : '';
        lines.push(`  › ${f.flight || '?'} ${f.dep || '?'}→${f.arr || '?'} ${delay}`);
      }
    }
    if (radar.yesterday) {
      const y = radar.yesterday;
      lines.push(`• Vols impactés hier  : ${y.impactedSeen || 0}`);
      lines.push(`• Retards ≥3h         : ${y.delayGte180 || 0}`);
      lines.push(`• Annulations         : ${y.cancelled || 0}`);
      lines.push(`• Scans radar         : ${y.scanRuns || 0}`);
      lines.push(`• Appels API          : ${y.apiRequests || 0}`);
    }
  } else {
    lines.push(`• Données radar indisponibles`);
  }
  lines.push('');

  lines.push(`🔗 robindesairs.eu/radar-vols-v2`);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const force = (event.queryStringParameters?.force || '').trim();

  // Sécurité : hors cron, exiger ?force=1
  const isCron = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isCron && !force) {
    return {
      statusCode: 403,
      body: JSON.stringify({ ok: false, error: 'Ajouter ?force=1 pour tester manuellement' }),
    };
  }

  const yesterdayYmd = getYesterdayParisYmd();
  const todayLabel   = getTodayLabel();

  // Toutes les sources en parallèle
  const [plausible, mandates, whatsapp, radar] = await Promise.all([
    fetchPlausibleStats(yesterdayYmd),
    fetchMandateStats(yesterdayYmd),
    fetchWhatsAppStats(),
    fetchRadarStats(yesterdayYmd),
  ]);

  const message = buildMessage({
    today: todayLabel,
    yesterday: yesterdayYmd,
    plausible,
    mandates,
    whatsapp,
    radar,
  });

  const callmebot = await sendCallMeBot(message);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, callmebot, yesterdayYmd, message }),
  };
};
