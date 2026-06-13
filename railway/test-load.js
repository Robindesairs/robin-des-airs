/**
 * Montée en charge : combien de conversations SIMULTANÉES le bot encaisse avant de saturer.
 * Rampe N = 50 → 100 → 250 → 500 → 1000 → 2000, scénario court (hors-UE → relance),
 * en vagues synchronisées. Mesure : débit, latence/vague, couverture des réponses,
 * relances émises, erreurs, RSS mémoire, /health. Faux WATI local, rien envoyé en vrai.
 *   node test-load.js
 */
'use strict';
const http = require('http');
const fs = require('fs');

const BOT_PORT = 3966, WATI_PORT = 4066, SECRET = 'loadsecret';
process.env.WATI_WEBHOOK_SECRET = SECRET;
process.env.WATI_API_TOKEN = 'dummy';
process.env.WATI_API_BASE = `http://127.0.0.1:${WATI_PORT}`;
process.env.WATI_CHANNEL_PHONE = '33756863730';
process.env.PORT = String(BOT_PORT);
// fichiers d'état jetables (départ propre, ne touche pas l'état de la sim)
for (const f of ['/tmp/load-state.json', '/tmp/load-dossiers.json', '/tmp/load-leads.json']) { try { fs.unlinkSync(f); } catch (_) {} }
process.env.STATE_FILE = '/tmp/load-state.json';
process.env.DOSSIERS_FILE = '/tmp/load-dossiers.json';
process.env.LEADS_FILE = '/tmp/load-leads.json';

// ── Faux WATI : compte les réponses + détecte la relance (léger, pas de stockage texte) ──
let REPLY_TOTAL = 0, RELANCE_TOTAL = 0;
const RELANCE = /autre vol|5 ans|rétroactiv|refermez/i; // marqueurs propres à la relance (PAS le « 600 € » de l'accueil)
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    REPLY_TOTAL++;
    try {
      const u = new URL(req.url, 'http://x');
      const txt = u.searchParams.get('messageText') || body || '';
      if (RELANCE.test(txt)) RELANCE_TOTAL++;
    } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"result":true,"ok":true}');
  });
}).listen(WATI_PORT);

require('./server.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// envoie en parallèle mais par paquets (évite l'épuisement de sockets)
async function sendChunked(items, fn, chunk) {
  let errs = 0;
  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk);
    const r = await Promise.all(slice.map((x) => fn(x).then(() => 0).catch(() => 1)));
    errs += r.reduce((a, b) => a + b, 0);
  }
  return errs;
}
let MID = 0;
function postOne(phone, text) {
  return fetch(`http://127.0.0.1:${BOT_PORT}/api/wati-webhook?s=${SECRET}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ waId: phone, text, whatsappMessageId: 'ld-' + (++MID) }] }),
  });
}
// attend que le flux de réponses se stabilise (plus de nouvelle réponse pendant ~350 ms)
async function waitQuiescent(maxMs) {
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    await sleep(150);
    if (REPLY_TOTAL === last) { if (++stable >= 2) return; } else { stable = 0; last = REPLY_TOTAL; }
  }
}

const INPUTS = ['bonjour', 'Français', 'aucun des deux']; // 3 vagues → hors-UE → relance
const LEVELS = (process.env.LOAD_LEVELS || '50,100,250,500,1000,2000').split(',').map(Number);

(async () => {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${BOT_PORT}/health`)).ok) break; } catch (_) {} await sleep(100); }
  console.log('\n═══ MONTÉE EN CHARGE — conversations simultanées ═══\n');
  console.log('  N     vagues  durée    débit(msg/s) réponses  couv%  relances  erreurs  RSS(MB)  sessions');
  let base = 800000000; let saturated = false;
  for (const N of LEVELS) {
    const phones = Array.from({ length: N }, (_, k) => '221' + (base + k)); base += N + 1000;
    const startTotal = REPLY_TOTAL, startRel = RELANCE_TOTAL;
    let errs = 0; const t0 = Date.now();
    for (const inp of INPUTS) {
      errs += await sendChunked(phones, (p) => postOne(p, inp), 150);
      await waitQuiescent(Math.min(20000, 60 * N));
    }
    const ms = Date.now() - t0;
    const replies = REPLY_TOTAL - startTotal, rel = RELANCE_TOTAL - startRel;
    const expected = N; // ~1 relance attendue par conversation
    const cov = Math.round((rel / expected) * 100);
    const rss = Math.round(process.memoryUsage().rss / 1e6);
    const health = await fetch(`http://127.0.0.1:${BOT_PORT}/health`).then((r) => r.json()).catch(() => ({}));
    const thru = Math.round((replies / ms) * 1000);
    console.log(
      `  ${String(N).padEnd(5)} ${String(INPUTS.length).padEnd(6)} ${String(ms + 'ms').padEnd(8)} ${String(thru).padEnd(12)} ${String(replies).padEnd(9)} ${String(cov).padEnd(6)} ${String(rel).padEnd(9)} ${String(errs).padEnd(8)} ${String(rss).padEnd(8)} ${health.sessions ?? '?'}`
    );
    if (cov < 85 || errs > N * 0.02) { console.log(`\n⚠️  SATURATION détectée à N=${N} (couverture ${cov}% / ${errs} erreurs) — on s'arrête.`); saturated = true; break; }
    await sleep(500);
  }
  console.log(`\n${saturated ? 'Point de saturation atteint ci-dessus.' : '✅ Aucune saturation jusqu\'à N=' + LEVELS[LEVELS.length - 1] + ' (couverture ≥85%, ~0 erreur).'}`);
  console.log('Note : tout tourne dans UN process Node mono-thread (bot + faux WATI + injecteur) → en prod le bot est seul sur son CPU, donc plus de marge.');
  process.exit(0);
})();
