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

const { isRadarBackgroundApiEnabled } = require('./lib/radar-api-policy');

const {
  getParisParts,
  detectSlot,
  slotTimeWindows,
  EU_AFTERNOON_HUBS,
  AFRICA_EVENING_HUBS,
  getMonitorHubs,
} = require('./lib/radar-monitor-config');

const { sendCallMeBot } = require('./lib/callmebot');
const { notifyOwner } = require('./lib/owner-notify');
const { enrichCancellationReschedule } = require('./lib/radar-reschedule');
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
const { mergeFlightsIntoRegistry } = require('./lib/radar-eligible-registry');
const {
  isNetlifyScheduled,
  verifyInternalSecret,
  publicCorsHeaders,
} = require('./lib/internal-auth');

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
  try {
    await mergeFlightsIntoRegistry(event, cache.flights || [], { source: 'radar-monitor-morning' });
  } catch (e) {
    console.warn('registry morning:', e.message);
  }
  // Alertes dès le matin : annulations / retards ≥3h détectés au scan 7h (avant on n'alertait que le soir).
  try {
    await sendDelayAlerts(event, cache.allImpacted || cache.flights || [], dateYmd);
  } catch (e) {
    console.warn('alerts morning:', e.message);
  }
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
/**
 * Envoie une alerte WhatsApp pour chaque vol annulé ou retardé ≥ seuil.
 *
 * Logique de dédup progressive :
 * - Annulation : une seule alerte (jamais répétée même si toujours annulé).
 * - Retard     : alerte à la 1ʳᵉ détection, puis à chaque palier de +30 min
 *                (configurable via MONITOR_ALERT_STEP, défaut 30).
 *   Ex : détecté à +3h → alerte. Scan suivant +3h40 → alerte "en hausse". +3h45 → ignoré.
 *
 * Chaque message inclut un lien FlightRadar24 pour suivi en direct.
 */
async function sendDelayAlerts(event, flights, dateYmd) {
  const minDelay = parseInt(process.env.MONITOR_ALERT_MIN_DELAY || '180', 10) || 180;
  // Palier de ré-alerte en minutes (défaut 30 min)
  const stepDelay = parseInt(process.env.MONITOR_ALERT_STEP || '30', 10) || 30;

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

  // Cache des reports d'annulation (12 h) — évite de re-chercher le prochain vol.
  let rescheduleStore = null;
  try {
    rescheduleStore = getStore('radar-reschedule');
  } catch (_) {
    rescheduleStore = null;
  }

  for (const f of toAlert) {
    const key = `${f.flight || 'UNK'}-${dateYmd}`;

    // ── Récupérer l'état précédent ──────────────────────────────────────
    let prevState = null;
    try {
      const raw = await store.get(key);
      if (raw) prevState = JSON.parse(raw);
    } catch (e) {
      console.warn(`[alerts] blob get error pour ${key}:`, e.message);
    }

    // ── Décision d'alerte ───────────────────────────────────────────────
    if (f.cancelled) {
      // Annulation : une seule alerte par vol par jour
      if (prevState && prevState.cancelled) continue;
    } else {
      const prevDelay = prevState ? (prevState.delayMinutes || 0) : null;
      // Pas encore alerté → OK. Déjà alerté → re-alerter seulement si +stepDelay min
      if (prevDelay !== null && f.delayMinutes - prevDelay < stepDelay) continue;
    }

    // ── Annulation : retrouver le report (prochain vol même numéro) ──────
    if (f.cancelled) {
      try {
        await enrichCancellationReschedule(f, rescheduleStore);
      } catch (e) {
        console.warn('[alerts] reschedule:', e.message);
      }
      f.cancelDetectedAt = new Date().toISOString();
    }

    // ── Sauvegarder le nouvel état (TTL 30h) ────────────────────────────
    try {
      await store.set(
        key,
        JSON.stringify({
          alertedAt: new Date().toISOString(),
          delayMinutes: f.delayMinutes,
          cancelled: f.cancelled || false,
        }),
        { ttl: 30 * 3600 }
      );
    } catch (e) {
      console.warn(`[alerts] blob set error pour ${key}:`, e.message);
    }

    // ── Construire le message ────────────────────────────────────────────
    const fr24 = `https://www.flightradar24.com/${(f.flight || '').toLowerCase()}`;
    const ce261 = f.eligible ? '✅ CE261 éligible' : '⚠️ Vérifier éligibilité';
    const schedHour = f.scheduledDeparture
      ? new Date(f.scheduledDeparture).toLocaleTimeString('fr-FR', {
          hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        })
      : '?';

    let msg;

    if (f.cancelled) {
      // Heure de détection = maintenant (1ʳᵉ fois que le radar voit l'annulation).
      const detectHour = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
      });
      // Fraîcheur : annulation proche de l'heure prévue = passagers encore à l'aéroport.
      const schedMs = f.scheduledDeparture ? Date.parse(f.scheduledDeparture) : null;
      const fresh = schedMs != null && Math.abs(Date.now() - schedMs) <= 3 * 3600 * 1000;
      const freshLine = fresh
        ? `🆕 Annulation fraîche — passagers probablement encore à l'aéroport`
        : null;
      // Report : prochain vol planifié (même numéro), enrichi plus haut.
      const nextLine = f.nextFlightFound && f.rescheduledTo
        ? `🔄 Reporté : ${f.rescheduledTo}${f.rescheduledRoute ? ` (${f.rescheduledRoute})` : ''}`
        : `🔄 Reporté : prochain vol non trouvé (rebooking compagnie à confirmer)`;

      msg = [
        `🚫 VOL ANNULÉ — Robin des Airs`,
        ``,
        `Vol    : ${f.flight || '—'}`,
        `Trajet : ${f.dep || '?'} → ${f.arr || '?'}`,
        `Prévu  : ${schedHour} UTC`,
        `Détecté: ${detectHour} UTC (radar)`,
        freshLine,
        nextLine,
        ``,
        ce261,
        ``,
        `🔍 Suivi : ${fr24}`,
        `👉 Lancer le dossier CE261 maintenant`,
      ].filter(Boolean).join('\n');
    } else {
      const delayH = Math.floor(f.delayMinutes / 60);
      const delayM = f.delayMinutes % 60;
      const delayStr = delayM > 0 ? `+${delayH}h${delayM}min` : `+${delayH}h`;
      const estHour = f.estimatedDeparture
        ? new Date(f.estimatedDeparture).toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })
        : '?';

      // 1ʳᵉ alerte vs mise à jour
      const isUpdate = prevState && !prevState.cancelled;
      const header = isUpdate
        ? `⏰ RETARD EN HAUSSE — Robin des Airs`
        : `✈️ RETARD DÉTECTÉ — Robin des Airs`;

      // Ligne "avant" uniquement sur mise à jour
      const prevDelayLine = isUpdate && prevState.delayMinutes != null
        ? (() => {
            const ph = Math.floor(prevState.delayMinutes / 60);
            const pm = prevState.delayMinutes % 60;
            return `Avant  : +${ph}h${pm > 0 ? pm + 'min' : ''}`;
          })()
        : null;

      msg = [
        header,
        ``,
        `Vol    : ${f.flight || '—'}`,
        `Trajet : ${f.dep || '?'} → ${f.arr || '?'}`,
        `Prévu  : ${schedHour} UTC`,
        `Nouveau: ${estHour} UTC`,
        prevDelayLine,
        `Retard : ${delayStr}`,
        ``,
        ce261,
        ``,
        `🔍 Suivi : ${fr24}`,
        `👉 Lancer le dossier CE261 maintenant`,
      ].filter(Boolean).join('\n');
    }

    try {
      await sendCallMeBot(msg);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error('[alerts] sendCallMeBot error:', e.message);
    }
    // Notif propriétaire : Telegram + email (en plus de CallMeBot)
    try {
      const subj = f.cancelled ? `🚫 Vol annulé — ${f.flight || ''} ${f.dep || ''}→${f.arr || ''}`
                               : `✈️ Retard ${f.flight || ''} ${f.dep || ''}→${f.arr || ''}`;
      await notifyOwner(subj, msg);
    } catch (e) {
      console.error('[alerts] notifyOwner error:', e.message);
    }

    // Remonter report + heure de détection au registre → visible dans le tableau bureau.
    if (event && f.cancelled) {
      try {
        await mergeFlightsIntoRegistry(event, [f], { source: 'reschedule-enrich' });
      } catch (e) {
        console.warn('[alerts] registry reschedule writeback:', e.message);
      }
    }
  }
}

/**
 * Scan « heures chaudes » : départs Afrique → Europe (jour entier) + alertes.
 * Partagé par le handler (créneau africa-evening) et radar-monitor-hot (cron rapproché).
 * Fenêtre forcée sur la journée complète (2×12h) → robuste quelle que soit l'heure/DST.
 */
async function runAfricaEveningScan(event, opts = {}) {
  const { dateYmd, hour: parisHour } = getParisParts();
  const windows = [
    [`${dateYmd}T00:00`, `${dateYmd}T11:59`],
    [`${dateYmd}T12:00`, `${dateYmd}T23:59`],
  ];
  const hubs = opts.hubs && opts.hubs.length ? opts.hubs : getMonitorHubs();
  const source = opts.source || 'radar-monitor-africa-evening';
  const entry = await runSlotScan({
    slot: 'africa-evening',
    hubs,
    filterFn: filterAfricaEveningDepartures,
    parisHour,
    dateYmd,
    windows,
  });
  await appendSlotLog(event, entry);
  await recordSlotScan(event, entry);
  try {
    await mergeFlightsIntoRegistry(event, entry.flights || [], { source });
  } catch (e) {
    console.warn('registry africa-evening:', e.message);
  }
  await sendDelayAlerts(event, entry.flights || [], dateYmd);
  return entry;
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

  if (!isRadarBackgroundApiEnabled() && force !== 'test-whatsapp') {
    return {
      statusCode: 503,
      headers: publicCorsHeaders({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ok: false,
        skipped: 'background_api_disabled',
        hint: 'Seul le scan manuel /.netlify/functions/radar est actif. RADAR_BACKGROUND_API=1 pour monitor/snapshot.',
      }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {}

  if (force && !isNetlifyScheduled(event)) {
    const auth = verifyInternalSecret(event, body);
    if (!auth.ok) {
      return {
        statusCode: 401,
        headers: publicCorsHeaders({ 'Cache-Control': 'no-store' }),
        body: JSON.stringify({ ok: false, error: auth.error }),
      };
    }
  }

  // ── Test CallMeBot : GET /api/radar-monitor?force=test-whatsapp&secret=… ──────
  if (force === 'test-whatsapp') {
    const heureParis = new Date().toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const result = await sendCallMeBot(
      `✅ Test Robin des Airs\n\nCallMeBot fonctionne !\nHeure Paris : ${heureParis}\n\nLes alertes retard et annulation sont actives.`
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, test: 'whatsapp', callmebot: result }),
    };
  }
  // ─────────────────────────────────────────────────────────────────────

  if (!isRadarBackgroundApiEnabled() && isNetlifyScheduled(event)) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, skipped: 'background_api_disabled' }),
    };
  }

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
      try {
        await mergeFlightsIntoRegistry(event, entry.flights || [], { source: 'radar-monitor-eu-afternoon' });
      } catch (e) {
        console.warn('registry eu-afternoon:', e.message);
      }
      // Alertes aussi l'après-midi (départs EU→Afrique annulés / ≥3h), plus seulement le soir.
      await sendDelayAlerts(event, entry.flights || [], dateYmd);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, ...entry }),
      };
    }

    if (slot === 'africa-evening') {
      // Hubs MONITOR_HUBS, scan jour entier + alertes — voir runAfricaEveningScan
      // (mutualisé avec le cron rapproché radar-monitor-hot).
      const entry = await runAfricaEveningScan(event);
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

// Réutilisé par radar-monitor-hot (cron rapproché heures chaudes).
exports.runAfricaEveningScan = runAfricaEveningScan;
