/**
 * Hubs veille serveur — alignés sur radar-scan-scheduler.js (décalage +5 min).
 */

const ALLER_ROUTES = [
  { key: 'paris_cdg', label: 'Paris CDG', group: '1', minute: 0 },
  { key: 'paris_ory', label: 'Paris Orly', group: '18', minute: 45 },
  { key: 'bru', label: 'Bruxelles', group: '5', minute: 5 },
  { key: 'ams', label: 'Amsterdam', group: '6', minute: 10 },
  { key: 'fco', label: 'Rome', group: '13', minute: 15 },
  { key: 'mxp', label: 'Milan', group: '14', minute: 20 },
  { key: 'lis', label: 'Lisbonne', group: '7', minute: 25 },
  { key: 'mad', label: 'Madrid', group: '15', minute: 30 },
  { key: 'bcn', label: 'Barcelone', group: '16', minute: 35 },
  { key: 'fra', label: 'Francfort', group: '17', minute: 40 },
];

const RETURN_ROUTES = [
  { key: 'paris', label: 'Paris CDG', hub: 'CDG', group: '1', minute: 5 },
  { key: 'ory', label: 'Paris Orly', hub: 'ORY', group: '18', minute: 50 },
  { key: 'bru', label: 'Bruxelles', hub: 'BRU', group: '5', minute: 10 },
  { key: 'ams', label: 'Amsterdam', hub: 'AMS', group: '6', minute: 15 },
  { key: 'fra', label: 'Francfort', hub: 'FRA', group: '17', minute: 20 },
  { key: 'south_it_fco', label: 'Rome', hub: 'FCO', group: '13', minute: 25 },
  { key: 'south_it_mxp', label: 'Milan', hub: 'MXP', group: '14', minute: 30 },
  { key: 'south_ib_lis', label: 'Lisbonne', hub: 'LIS', group: '7', minute: 35 },
  { key: 'south_ib_mad', label: 'Madrid', hub: 'MAD', group: '15', minute: 40 },
  { key: 'south_ib_bcn', label: 'Barcelone', hub: 'BCN', group: '16', minute: 45 },
];

const ALLER_CYCLE_MS = 2 * 60 * 60 * 1000;
const RETURN_CYCLE_MS = 30 * 60 * 1000;

function parisNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
}

function isAllerWindow(now) {
  const h = (now || parisNow()).getHours();
  return h >= 8 && h < 18;
}

function isReturnWindow(now) {
  const h = (now || parisNow()).getHours();
  return h >= 18 || h < 3;
}

function activeKind(now) {
  const n = now || parisNow();
  if (isReturnWindow(n) && !isAllerWindow(n)) return 'return';
  if (isAllerWindow(n)) return 'aller';
  return null;
}

function isRouteDue(route, kind, lastRuns, now) {
  const n = now || parisNow();
  const kindOk = kind === 'aller' ? isAllerWindow(n) : isReturnWindow(n);
  if (!kindOk) return false;
  if (kind === 'aller' && isReturnWindow(n)) return false;

  const cycleMs = kind === 'aller' ? ALLER_CYCLE_MS : RETURN_CYCLE_MS;
  const runKey = `${kind}_${route.key}`;
  const last = lastRuns[runKey] || 0;
  if (Date.now() - last < cycleMs - 6 * 60 * 1000) return false;

  const m = n.getMinutes();
  const target = route.minute % 60;
  const diff = (m - target + 60) % 60;
  return diff <= 6;
}

function pickDueRoute(kind, lastRuns, now) {
  const routes = kind === 'aller' ? ALLER_ROUTES : RETURN_ROUTES;
  for (const route of routes) {
    if (isRouteDue(route, kind, lastRuns, now)) return route;
  }
  return null;
}

module.exports = {
  ALLER_ROUTES,
  RETURN_ROUTES,
  ALLER_CYCLE_MS,
  RETURN_CYCLE_MS,
  parisNow,
  isAllerWindow,
  isReturnWindow,
  activeKind,
  isRouteDue,
  pickDueRoute,
};
