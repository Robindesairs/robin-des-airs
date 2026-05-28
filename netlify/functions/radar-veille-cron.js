/**
 * Veille radar serveur — aller (8h–18h /2h) + retour (18h–03h /30min).
 * Planifié : netlify.toml (toutes les 5 min)
 * Un hub par exécution · décalage 5 min · pas de chevauchement aller/retour.
 */

const { runGroupScan, parisDateYmd } = require('./radar');
const { activeKind, pickDueRoute, parisNow } = require('./lib/radar-veille-routes');
const {
  loadConfig,
  loadState,
  saveState,
  effectiveFlags,
} = require('./lib/radar-veille-store');
const { getBlobStore } = require('./lib/netlify-blobs-store');
const {
  isNetlifyScheduled,
  requireCronOrInternalSecret,
  publicCorsHeaders,
  denyResponse,
} = require('./lib/internal-auth');

const STORE = 'robin-radar-veille';
const LOCK_MS = 4 * 60 * 1000;

async function cacheScanResult(event, kind, route, payload) {
  const store = getBlobStore(event, STORE);
  if (!store) return;
  const key = `cache/${kind}_${route.key}.json`;
  await store.set(
    key,
    JSON.stringify({
      kind,
      routeKey: route.key,
      label: route.label,
      flightCount: (payload.flights || []).length,
      updatedAt: payload.updatedAt,
      scan: payload.scan,
    }),
    { metadata: { ttl: 48 * 3600 } }
  );
}

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: publicCorsHeaders(), body: '' };
  }

  const auth = requireCronOrInternalSecret(event, {});
  if (!auth.ok && !isNetlifyScheduled(event)) {
    return denyResponse(401, auth.error || 'Non autorisé', 'public');
  }

  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) {
    return {
      statusCode: 503,
      headers: publicCorsHeaders(),
      body: JSON.stringify({ ok: false, error: 'RAPIDAPI_KEY manquant' }),
    };
  }

  try {
    const config = await loadConfig(event);
    const flags = effectiveFlags(config);
    const state = await loadState(event);
    const now = parisNow();

    if (state.scanLockUntil && Date.now() < state.scanLockUntil) {
      return {
        statusCode: 200,
        headers: publicCorsHeaders(),
        body: JSON.stringify({
          ok: true,
          skipped: 'lock',
          until: state.scanLockUntil,
          flags,
        }),
      };
    }

    const kind = activeKind(now);
    if (!kind) {
      return {
        statusCode: 200,
        headers: publicCorsHeaders(),
        body: JSON.stringify({ ok: true, skipped: 'idle', parisHour: now.getHours(), flags }),
      };
    }

    if (kind === 'aller' && !flags.allerEnabled) {
      return {
        statusCode: 200,
        headers: publicCorsHeaders(),
        body: JSON.stringify({ ok: true, skipped: 'aller_disabled', flags }),
      };
    }
    if (kind === 'return' && !flags.returnEnabled) {
      return {
        statusCode: 200,
        headers: publicCorsHeaders(),
        body: JSON.stringify({ ok: true, skipped: 'return_disabled', flags }),
      };
    }

    const route = pickDueRoute(kind, state.lastRuns || {}, now);
    if (!route) {
      return {
        statusCode: 200,
        headers: publicCorsHeaders(),
        body: JSON.stringify({
          ok: true,
          skipped: 'none_due',
          kind,
          parisTime: now.toISOString(),
          flags,
        }),
      };
    }

    state.scanLockUntil = Date.now() + LOCK_MS;
    await saveState(event, state);

    const scanMode = kind === 'return' ? 'return' : '';
    const hub = kind === 'return' ? route.hub : undefined;
    const payload = await runGroupScan(rapidKey, {
      group: route.group,
      scanMode,
      hub,
    });

    const runKey = `${kind}_${route.key}`;
    state.lastRuns = state.lastRuns || {};
    state.lastRuns[runKey] = Date.now();
    state.scanLockUntil = 0;
    state.lastScan = {
      kind,
      routeKey: route.key,
      label: route.label,
      at: new Date().toISOString(),
      flightCount: (payload.flights || []).length,
      viewDate: payload.viewDate || parisDateYmd(),
    };
    await saveState(event, state);
    await cacheScanResult(event, kind, route, payload);

    console.log(
      `radar-veille-cron: ${kind} ${route.label} → ${(payload.flights || []).length} vols`
    );

    return {
      statusCode: 200,
      headers: publicCorsHeaders(),
      body: JSON.stringify({
        ok: true,
        kind,
        route: route.key,
        label: route.label,
        flightCount: (payload.flights || []).length,
        flags,
        lastScan: state.lastScan,
      }),
    };
  } catch (e) {
    console.error('radar-veille-cron:', e);
    try {
      const state = await loadState(event);
      state.scanLockUntil = 0;
      await saveState(event, state);
    } catch (_) {}
    return {
      statusCode: 500,
      headers: publicCorsHeaders(),
      body: JSON.stringify({ ok: false, error: e.message || 'Erreur veille' }),
    };
  }
};
