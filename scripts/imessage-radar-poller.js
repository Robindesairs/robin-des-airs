#!/usr/bin/env node
/**
 * Poller iMessage — alertes radar Robin des Airs sur ton Mac.
 *
 * Pourquoi un script local : l'iMessage ne peut PAS partir du serveur Netlify
 * (il faut macOS + Messages.app). Ce script tourne sur ton Mac (via LaunchAgent,
 * voir scripts/IMESSAGE-RADAR.md), interroge /api/radar-today, et t'envoie un
 * iMessage pour chaque vol frais : ANNULÉ (avec report au lendemain) ou retard ≥3h.
 *
 * WhatsApp/Telegram/email partent déjà du serveur 24/7 — ceci est le canal EN PLUS.
 *
 * Config (env ou scripts/.imessage-radar.env) :
 *   ROBIN_IMESSAGE_TO   numéro/Apple ID destinataire (ex: +33612345678)  [requis]
 *   ROBIN_RADAR_URL     défaut https://robindesairs.eu/api/radar-today
 *   ROBIN_MIN_DELAY     retard mini en minutes (défaut 180 = 3h)
 *   ROBIN_TODAY_ONLY    "1" (défaut) = seulement les vols du jour (Paris)
 *
 * Usage :
 *   node imessage-radar-poller.js            # cycle normal (1ʳᵉ exécution = amorçage sans envoi)
 *   node imessage-radar-poller.js --dry-run  # affiche ce qui serait envoyé, n'envoie pas
 *   node imessage-radar-poller.js --send-backlog  # envoie aussi les vols déjà présents
 *   node imessage-radar-poller.js --test "coucou"  # envoie un iMessage de test et quitte
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

// ── Config ──────────────────────────────────────────────────────────────────
loadDotEnv(path.join(__dirname, '.imessage-radar.env'));

const TO = (process.env.ROBIN_IMESSAGE_TO || '').trim();
const RADAR_URL = (process.env.ROBIN_RADAR_URL || 'https://robindesairs.eu/api/radar-today').trim();
const MIN_DELAY = parseInt(process.env.ROBIN_MIN_DELAY || '180', 10) || 180;
const TODAY_ONLY = (process.env.ROBIN_TODAY_ONLY || '1') !== '0';

const STATE_DIR = path.join(os.homedir(), '.robin-radar');
const STATE_FILE = path.join(STATE_DIR, 'imessage-sent.json');
const APPLESCRIPT = path.join(__dirname, 'imessage-send.applescript');
const KEEP_DAYS = 3;

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SEND_BACKLOG = args.includes('--send-backlog');
const TEST_IDX = args.indexOf('--test');

// ── Hubs africains (marqueur 🌍 + priorité départ Afrique) ───────────────────
const AFRICA_IATA = new Set([
  'DSS', 'DKR', 'ABJ', 'ACC', 'LOS', 'ABV', 'CMN', 'RAK', 'TNG', 'NDR', 'BJL', 'NKC',
  'COO', 'LFW', 'DLA', 'NSI', 'SSG', 'BKO', 'OUA', 'NIM', 'CKY', 'FNA', 'ROB', 'BSG',
  'RAI', 'SID', 'DKR', 'BGF', 'NDJ', 'LBV', 'PNR', 'BZV', 'FIH', 'LAD', 'ALG', 'ORN',
  'TUN', 'DJE', 'CAI', 'NBO', 'ADD', 'DAR', 'EBB', 'KGL', 'JNB', 'CPT', 'MRU', 'RUN',
  'TNR', 'ANR', 'MBA', 'BJM', 'OUA', 'TIP', 'KRT',
]);

function isAfricaDep(f) {
  return AFRICA_IATA.has(String(f.dep || '').toUpperCase());
}

// ── Main ──────────────────────────────────────────────────────────────────--
(async function main() {
  // Mode test : envoie un iMessage et quitte.
  if (TEST_IDX >= 0) {
    const msg = args[TEST_IDX + 1] || '✅ Test radar Robin des Airs — iMessage opérationnel.';
    if (!TO) return fail('ROBIN_IMESSAGE_TO non défini (voir scripts/IMESSAGE-RADAR.md).');
    try {
      await sendIMessage(TO, msg);
      console.log(`[imessage] test envoyé à ${TO}`);
    } catch (e) {
      return fail('échec envoi test : ' + e.message);
    }
    return;
  }

  if (!TO) return fail('ROBIN_IMESSAGE_TO non défini (voir scripts/IMESSAGE-RADAR.md).');
  if (typeof fetch !== 'function') return fail('fetch indisponible — Node 18+ requis.');

  let data;
  try {
    const res = await fetch(RADAR_URL + (RADAR_URL.includes('?') ? '&' : '?') + '_=' + Date.now(), {
      headers: { Accept: 'application/json' },
    });
    data = await res.json();
  } catch (e) {
    return fail('radar injoignable : ' + e.message);
  }
  const flights = (data && Array.isArray(data.flights)) ? data.flights : [];

  const actionable = flights.filter(isActionable);
  // Plus urgent d'abord : annulé > retard décroissant ; départ Afrique remonte.
  actionable.sort(rank);

  const state = loadState();
  const firstRun = !state.seededAt;

  const toSend = [];
  for (const f of actionable) {
    const key = flightKey(f);
    if (state.keys[key]) continue;
    toSend.push({ f, key });
  }

  // 1ʳᵉ exécution : on amorce sans rien envoyer (sinon on inonde avec le backlog).
  if (firstRun && !SEND_BACKLOG) {
    for (const { key } of toSend) state.keys[key] = nowIso();
    state.seededAt = nowIso();
    saveState(state);
    console.log(`[imessage] amorçage : ${toSend.length} vol(s) marqué(s) comme vus, aucun envoi (1ʳᵉ exécution).`);
    console.log('[imessage] les PROCHAINS nouveaux vols déclencheront un iMessage.');
    return;
  }

  if (!toSend.length) {
    console.log(`[imessage] rien de nouveau (${actionable.length} vol(s) éligible(s) déjà vus).`);
    pruneState(state);
    saveState(state);
    return;
  }

  let sent = 0;
  for (const { f, key } of toSend) {
    const msg = buildMessage(f);
    if (DRY) {
      console.log('---- [dry-run] ----\n' + msg + '\n');
      state.keys[key] = nowIso();
      sent += 1;
      continue;
    }
    try {
      await sendIMessage(TO, msg);
      state.keys[key] = nowIso();
      sent += 1;
      saveState(state); // persister au fur et à mesure (robuste si interruption)
      await sleep(1500);
    } catch (e) {
      console.error('[imessage] échec envoi ' + (f.flight || '') + ' : ' + e.message);
    }
  }
  if (!state.seededAt) state.seededAt = nowIso();
  pruneState(state);
  saveState(state);
  console.log(`[imessage] ${DRY ? '(dry-run) ' : ''}${sent} iMessage(s) ${DRY ? 'simulé(s)' : 'envoyé(s)'} à ${TO}.`);
})().catch((e) => fail(e && e.message ? e.message : String(e)));

// ── Logique vol ─────────────────────────────────────────────────────────────
function isActionable(f) {
  if (!f || f.eligible === false) return false;
  const cancelled = !!f.cancelled || f.statut === 'ANNULE';
  const dm = f.delayMinutes != null ? Number(f.delayMinutes) : (f.retardMin != null ? Number(f.retardMin) : null);
  if (!cancelled && !(dm != null && dm >= MIN_DELAY)) return false;
  if (TODAY_ONLY) {
    const d = String(f.date || f.scheduledDate || '').slice(0, 10);
    if (d && d < parisToday()) return false; // garde aujourd'hui + futur, écarte la veille
  }
  return true;
}

function rank(a, b) {
  const ca = (a.cancelled || a.statut === 'ANNULE') ? 0 : 1;
  const cb = (b.cancelled || b.statut === 'ANNULE') ? 0 : 1;
  if (ca !== cb) return ca - cb;
  const aa = isAfricaDep(a) ? 0 : 1, ab = isAfricaDep(b) ? 0 : 1;
  if (aa !== ab) return aa - ab;
  return (delayOf(b) || 0) - (delayOf(a) || 0);
}

function delayOf(f) {
  return f.delayMinutes != null ? Number(f.delayMinutes) : (f.retardMin != null ? Number(f.retardMin) : 0);
}

function flightKey(f) {
  const cancelled = !!f.cancelled || f.statut === 'ANNULE';
  return [
    String(f.flight || f.vol || 'UNK').replace(/\s/g, '').toUpperCase(),
    String(f.dep || '').toUpperCase(),
    String(f.arr || '').toUpperCase(),
    String(f.date || f.scheduledDate || '').slice(0, 10),
    cancelled ? 'X' : 'D' + Math.floor((delayOf(f) || 0) / 60), // re-alerte si change de palier horaire / passe annulé
  ].join('|');
}

function buildMessage(f) {
  const flight = f.flight || f.vol || '—';
  const route = `${(f.dep || '?').toUpperCase()}→${(f.arr || '?').toUpperCase()}`;
  const eu = f.compensation || 600;
  const af = isAfricaDep(f) ? '🌍 ' : '';
  const cancelled = !!f.cancelled || f.statut === 'ANNULE';

  const lines = [];
  if (cancelled) {
    lines.push(`🚫 ${af}${flight} ${route} ANNULÉ`);
    if (f.rescheduledTo) {
      lines.push(`🔄 Reporté : ${f.rescheduledTo}${f.rescheduledRoute ? ` (${f.rescheduledRoute})` : ''}`);
    } else if (f.nextFlightFound === false) {
      lines.push(`🔄 Prochain vol non trouvé (rebooking à confirmer)`);
    }
    if (f.cancelDetectedAt) lines.push(`🆕 Détecté ${String(f.cancelDetectedAt).slice(11, 16)} UTC`);
  } else {
    lines.push(`✈️ ${af}${flight} ${route} ${fmtDelay(delayOf(f))}`);
  }
  lines.push(`${eu} € · CE261 · lancer la pub`);
  if (f.trackerUrl) lines.push(f.trackerUrl);
  return lines.join('\n');
}

function fmtDelay(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `+${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `+${m}min`;
}

// ── iMessage via AppleScript ─────────────────────────────────────────────────
function sendIMessage(to, message) {
  return new Promise((resolve, reject) => {
    execFile('osascript', [APPLESCRIPT, to, message], { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || '').trim()));
      resolve(stdout);
    });
  });
}

// ── État local ───────────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') return { keys: s.keys || {}, seededAt: s.seededAt || null };
  } catch (_) {}
  return { keys: {}, seededAt: null };
}

function saveState(state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 0));
  } catch (e) {
    console.error('[imessage] écriture état impossible : ' + e.message);
  }
}

function pruneState(state) {
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  for (const k of Object.keys(state.keys)) {
    const t = Date.parse(state.keys[k]);
    if (!Number.isNaN(t) && t < cutoff) delete state.keys[k];
  }
}

// ── Utils ────────────────────────────────────────────────────────────────────
function parisToday() {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function nowIso() { return new Date().toISOString(); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function loadDotEnv(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return; }
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v;
  }
}

function fail(msg) {
  console.error('[imessage] ' + msg);
  process.exitCode = 1;
}
