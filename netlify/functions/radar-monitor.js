/**
 * Monitoring radar par créneaux (Europe/Paris).
 *
 * - 08h : bandeau 10 vols + rapport email
 * - 16h–17h : départs EU → Afrique (anticipation vol retour)
 * - 18h–02h (chaque heure) : départs Afrique / escales → Europe
 *
 * Planifié : netlify.toml → radar-monitor (5 * * * *)
 * Manuel : POST /api/radar-monitor?force=morning|eu|africa
 */

const {
  getParisParts,
  detectSlot,
  slotTimeWindows,
  EU_AFTERNOON_HUBS,
  AFRICA_EVENING_HUBS,
  getMonitorHubs,
} = require('./lib/radar-monitor-config');

const { sendCallMeBot } = require('./lib/callmebot');
const { getStore } = require('@netlify/blobs');

const {
  fetchRadarSlot,
  filterImpactedEuAfricaFlights,
  filterEuAfternoonDepartures,
  filterAfricaEveningDepartures,
  sortImpactedForTicker,
  summarizeFlight,
} = require('./lib/radar-fetch-slot');

const { parisDateYmd, parisDateAddDays, fetchBannerImpactedFlights } = require('./radar');

const { saveBanner, appendSlotLog, loadDayLogs } = require('./lib/radar-monitor-store');
const { sendRadarMorningReport } = require('./lib/radar-report-email');
const { recordMorningBanner, recordSlotScan, loadStatsReport } = require('./lib/radar-stats-store');

async function buildMorningBanner() {
  const payload = await fetchBannerImpactedFlights({ maxDaysThisRun: 2, hubRunIndex: 0 });
  const bannerFlights = payload.flights || [];
  return {
    flights: bannerFlights,
    allImpacted: payload.allImpacted || bannerFlights,
    viewDate: payload.viewDate || parisDateYmd(),
    updatedAt: new Date().toISOString(),
    dataSource: 'aerodatabox',
    tickerMode: 'eu-africa-subsaharan-impacted',
    count: bannerFlights.length,
  };
}

async function runSlotScan({ slot, hubs, filterFn, parisHour, dateYmd, windows }) {
  let payload = { flights: [], apiRequests: 0 };
  try {
    payload = await fetchRadarSlot({
      dateYmd,
      hubs,
      windows,
      directions: ['Departure'],
    });
  } catch (e) {
    console.warn('runSlotScan fetch:', e.message);
    return {
      slot,
      parisHour,
      dateYmd,
      at: new Date().toISOString(),
      apiRequests: 0,
      impactedCount: 0,
      alerts: [],
      flights: [],
      fetchError: e.message,
    };
  }
  const filtered = filterFn(payload.flights || []);
  const sorted = sortImpactedForTicker(filtered);
  const alerts = sorted.slice(0, 15).map(summarizeFlight);
  return {
    slot,
    parisHour,
    dateYmd,
    at: new Date().toISOString(),
    apiRequests: payload.apiRequests,
    impactedCount: sorted.length,
    alerts,
    flights: sorted.slice(0, 25),
  };
}

async function runMorning(event, parisHour, dateYmd) {
  let cache;
  try {
    cache = await buildMorningBanner();
  } catch (e) {
    console.error('runMorning buildBanner:', e.message);
    cache = {
      flights: [],
      count: 0,
      viewDate: dateYmd,
      updatedAt: new Date().toISOString(),
      dataSource: 'error',
      buildError: e.message,
    };
  }
  const blob = await saveBanner(event, cache);

  const yesterday = parisDateAddDays(-1);
  const dayLog = await loadDayLogs(event, yesterday);
  const todayLog = await loadDayLogs(event, dateYmd);
  const slots = [...(dayLog && dayLog.slots) || [], ...(todayLog && todayLog.slots) || []];
  const slotSummary = slots.slice(-12).map((s) => ({
    slot: s.slot,
    hour: s.hour,
    impacted: s.impacted,
    top: (s.alerts || []).slice(0, 3),
  }));

  const statsDays = parseInt(process.env.RADAR_STATS_DAYS || '14', 10) || 14;
  await recordMorningBanner(event, { dateYmd, banner: cache });
  const statsReport = await loadStatsReport(event, statsDays);

  const email = await sendRadarMorningReport({
    banner: cache,
    dayLog,
    slotSummary,
    statsReport,
    parisDate: dateYmd,
    parisHour,
  });

  await appendSlotLog(event, {
    slot: 'morning',
    parisHour,
    dateYmd,
    at: new Date().toISOString(),
    impactedCount: cache.count,
    alerts: cache.flights.map(summarizeFlight),
  });

  return { cache, blob, email };
}

/**
 * Envoie une alerte WhatsApp pour chaque vol avec retard ≥ seuil (défaut 180 min = 3h).
 * Déduplication via Netlify Blobs : un seul message par vol par jour.
 *
 * @param {Array}  flights   Vols filtrés par filterAfricaEveningDepartures.
 * @param {string} dateYmd   Date Paris courante (YYYY-MM-DD).
 */
async function sendDelayAlerts(flights, dateYmd) {
  const minDelay = parseInt(process.env.MONITOR_ALERT_MIN_DELAY || '180', 10) || 180;
  const toAlert = (flights || []).filter(
    (f) => f.cancelled || (f.delayMinutes != null && f.delayMinutes >= minDelay)
  );
  if (!toAlert.length) return;

  let store;
  try {
    store = getStore('radar-delay-alerts');
  } catch (e) {
    console.warn('[alerts] getStore error:', e.message);
    return;
  }

  for (const f of toAlert) {
    const key = `${f.flight || 'UNK'}-${dateYmd}`;
    try {
      const existing = await store.get(key);
      if (existing) continue; // déjà alerté aujourd'hui

      // Marquer comme alerté (TTL 30h pour couvrir la nuit)
      await store.set(
        key,
        JSON.stringify({ alertedAt: new Date().toISOString(), delayMinutes: f.delayMinutes }),
        { ttl: 30 * 3600 }
      );
    } catch (e) {
      console.warn(`[alerts] blob error pour ${key}:`, e.message);
      // On continue quand même pour ne pas bloquer les autres alertes
    }

    const schedHour = f.scheduledDeparture
      ? new Date(f.scheduledDeparture).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })
      : '?';

    const ce261 = f.eligible ? '✅ CE261 éligible' : '⚠️ Vérifier éligibilité';

    let msg;
    if (f.cancelled) {
      const cancelHour = f.cancelledAt
        ? new Date(f.cancelledAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          })
        : '?';
      msg = [
        `🚫 VOL ANNULÉ — Robin des Airs`,
        ``,
        `Vol    : ${f.flight || '—'}`,
        `Trajet : ${f.dep || '?'} → ${f.arr || '?'}`,
        `Prévu  : ${schedHour} UTC`,
        `Annulé : ${cancelHour} UTC`,
        ``,
        ce261,
        ``,
        `👉 Lancer le dossier CE261 maintenant`,
      ].join('\n');
    } else {
      const delayH = Math.floor(f.delayMinutes / 60);
      const delayM = f.delayMinutes % 60;
      const delayStr = delayM > 0 ? `+${delayH}h${delayM}min` : `+${delayH}h`;
      const estHour = f.estimatedDeparture
        ? new Date(f.estimatedDeparture).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          })
        : '?';
      msg = [
        `✈️ RETARD DÉTECTÉ — Robin des Airs`,
        ``,
        `Vol    : ${f.flight || '—'}`,
        `Trajet : ${f.dep || '?'} → ${f.arr || '?'}`,
        `Prévu  : ${schedHour} UTC`,
        `Nouveau: ${estHour} UTC`,
        `Retard : ${delayStr}`,
        ``,
        ce261,
        ``,
        `👉 Lancer le dossier CE261 maintenant`,
      ].join('\n');
    }

    try {
      await sendCallMeBot(msg);
      // Pause de 2s entre messages pour éviter le spam CallMeBot
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error('[alerts] sendCallMeBot error:', e.message);
    }
  }
}

exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }),
    };
  }

  const force = (event.queryStringParameters?.force || '').trim().toLowerCase();
  const { dateYmd, hour: parisHour } = getParisParts();
  let slot = detectSlot(parisHour);
  if (force === 'morning') slot = 'morning';
  if (force === 'eu' || force === 'eu-afternoon') slot = 'eu-afternoon';
  if (force === 'africa' || force === 'africa-evening') slot = 'africa-evening';

  if (slot === 'idle' && !force) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        skipped: true,
        parisHour,
        message: 'Hors créneau (8h / 16-17h / 18h-2h Paris)',
      }),
    };
  }

  try {
    const windows = slotTimeWindows(parisHour, dateYmd);
    let result = {};

    if (slot === 'morning') {
      result = await runMorning(event, parisHour, dateYmd);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          slot: 'morning',
          parisHour,
          bannerCount: result.cache.count,
          blobSaved: result.blob.ok,
          email: result.email,
          flights: result.cache.flights,
        }),
      };
    }

    if (slot === 'eu-afternoon') {
      const entry = await runSlotScan({
        slot: 'eu-afternoon',
        hubs: EU_AFTERNOON_HUBS,
        filterFn: filterEuAfternoonDepartures,
        parisHour,
        dateYmd,
        windows,
      });
      await appendSlotLog(event, entry);
      await recordSlotScan(event, entry);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, ...entry }),
      };
    }

    if (slot === 'africa-evening') {
      // Hubs configurables via MONITOR_HUBS (ex: "DSS,ABJ" au démarrage).
      const monitorHubs = getMonitorHubs();

      // Scan jour entier : windows déjà élargies par slotTimeWindows pour africa-evening.
      const entry = await runSlotScan({
        slot: 'africa-evening',
        hubs: monitorHubs,
        filterFn: filterAfricaEveningDepartures,
        parisHour,
        dateYmd,
        windows,
      });
      await appendSlotLog(event, entry);
      await recordSlotScan(event, entry);

      // ── Alertes WhatsApp (CallMeBot) pour retards ≥ 3h ──────────────────
      await sendDelayAlerts(entry.flights || [], dateYmd);
      // ─────────────────────────────────────────────────────────────────────

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, ...entry }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, slot }) };
  } catch (e) {
    console.error('radar-monitor:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: e.message,
        errorType: e.name,
        slot,
        parisHour,
        hint:
          'fetch failed = réseau Netlify→RapidAPI ou clé/abonnement AeroDataBox. Tester scripts/test-rapidapi-key.mjs',
      }),
    };
  }
};
