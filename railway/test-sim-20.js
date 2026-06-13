/**
 * Simulation : 20 conversations EN PARALLÈLE sur le bot, en local, sans rien envoyer en vrai.
 *  - Faux serveur WATI (port 4055) : capture toutes les réponses du bot (texte/boutons/liste).
 *  - Le vrai bot (server.js) tourne en local (port 3955), pointé sur le faux WATI.
 *  - 20 « clients » (numéros distincts) déroulent des scénarios variés EN MÊME TEMPS.
 * But : prouver la CONCURRENCE, l'ISOLATION d'état par numéro, l'absence de crash, et le
 * bon branchement (éligible continue / non-éligible reçoit la RELANCE « autre vol »).
 * (Le chemin photo nécessite la clé OpenAI → on s'arrête avant les documents.)
 *   node test-sim-20.js
 */
'use strict';
const http = require('http');

const BOT_PORT = 3955, WATI_PORT = 4055, SECRET = 'simsecret';
process.env.WATI_WEBHOOK_SECRET = SECRET;
process.env.WATI_API_TOKEN = 'dummy-sim';
process.env.WATI_API_BASE = `http://127.0.0.1:${WATI_PORT}`;
process.env.WATI_CHANNEL_PHONE = '33756863730';
process.env.PORT = String(BOT_PORT);

// ── Faux WATI : capture les réponses sortantes du bot ──────────────────────────
const REPLIES = new Map(); // digits → [{kind, text}]
const digits = (s) => String(s || '').replace(/\D/g, '');
function record(phone, kind, text) { const k = digits(phone); if (!REPLIES.has(k)) REPLIES.set(k, []); REPLIES.get(k).push({ kind, text: String(text || '').replace(/\s+/g, ' ').slice(0, 320) }); }
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    try {
      const u = new URL(req.url, `http://x`);
      let j = {}; try { j = JSON.parse(body || '{}'); } catch (_) {}
      if (/\/sendSessionMessage\//.test(u.pathname)) {
        const phone = u.pathname.split('/sendSessionMessage/')[1];
        record(phone, 'text', u.searchParams.get('messageText'));
      } else if (/sendInteractiveButtonsMessage/.test(u.pathname)) {
        record(u.searchParams.get('whatsappNumber'), 'buttons', (j.body || '') + ' [btn:' + (j.buttons || []).map((b) => b.text).join('|') + ']');
      } else if (/conversations\/messages\/interactive/.test(u.pathname)) {
        const lm = j.list_message || {}; const rows = (lm.sections || []).flatMap((s) => (s.rows || []).map((r) => r.title));
        record(j.target, 'list', (lm.body || lm.text || '') + ' [list:' + rows.join('|') + ']');
      }
    } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ result: true, ok: true }));
  });
}).listen(WATI_PORT);

// ── Démarre le bot en local ─────────────────────────────────────────────────────
require('./server.js');

// ── Outils driver ────────────────────────────────────────────────────────────────
let MID = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(phone, text, replyId) {
  const msg = { waId: phone, whatsappMessageId: 'sim-' + (++MID) };
  if (replyId) msg.interactiveButtonReply = { id: replyId, text }; else msg.text = text;
  await fetch(`http://127.0.0.1:${BOT_PORT}/api/wati-webhook?s=${SECRET}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [msg] }),
  }).catch(() => {});
}
// Envoie une entrée puis attend qu'une nouvelle réponse arrive (ou timeout).
async function step(phone, text, replyId) {
  const before = (REPLIES.get(digits(phone)) || []).length;
  await post(phone, text, replyId);
  for (let i = 0; i < 18; i++) { await sleep(100); if ((REPLIES.get(digits(phone)) || []).length > before) break; }
}
async function runScenario(phone, inputs) {
  for (const inp of inputs) { await step(phone, inp.t, inp.id); await sleep(40); }
}

// ── 20 scénarios ──────────────────────────────────────────────────────────────────
const FR = { t: 'Français' };
const scen = [];
const add = (n, type, inputs) => { for (let i = 0; i < n; i++) scen.push({ type, inputs }); };
// 8 éligibles (retard 3h+) → vont jusqu'à l'étape vol/photo
add(8, 'eligible', [{ t: 'bonjour' }, FR, { t: 'départ' }, { t: 'retard' }, { t: 'plus de 3 heures' }, { t: '2' }, { t: 'direct' }]);
// 4 non-éligibles < 3h → doivent recevoir la RELANCE
add(4, 'nonelig_3h', [{ t: 'bonjour' }, FR, { t: 'départ' }, { t: 'retard' }, { t: 'moins de 3h' }]);
// 3 annulation notifiée > 14 j → RELANCE
add(3, 'nonelig_annul', [{ t: 'bonjour' }, FR, { t: 'départ' }, { t: 'annulation' }, { t: 'plus de 14 jours' }]);
// 3 hors Europe → RELANCE
add(3, 'nonelig_horseu', [{ t: 'bonjour' }, FR, { t: 'aucun des deux' }]);
// 2 non-éligibles puis « ✈️ Vérifier un autre vol » → doit relancer l'accueil
add(2, 'relance_restart', [{ t: 'bonjour' }, FR, { t: 'départ' }, { t: 'retard' }, { t: 'moins de 3h' }, { t: 'Vérifier un autre vol', id: 'autre_vol' }]);

// ── Lancement ──────────────────────────────────────────────────────────────────────
(async () => {
  // attendre le boot du bot
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${BOT_PORT}/health`); if (r.ok) break; } catch (_) {} await sleep(100); }
  const users = scen.map((s, i) => ({ ...s, phone: '22177' + String(1000000 + i) }));
  const t0 = Date.now();
  await Promise.all(users.map((u) => runScenario(u.phone, u.inputs))); // ← 20 EN PARALLÈLE
  const ms = Date.now() - t0;
  await sleep(400);

  // ── Analyse ──
  const RELANCE = /autre vol|5 ans|600 €|jusqu'à 600/i;
  let okBranch = 0, koBranch = 0; const samples = {};
  for (const u of users) {
    const rep = REPLIES.get(digits(u.phone)) || [];
    const all = rep.map((r) => r.text).join(' || ');
    let ok;
    if (u.type === 'eligible') ok = /passager|direct ou avec escale|photo|e-billet|combien/i.test(all);
    else if (u.type === 'relance_restart') ok = RELANCE.test(all) && /Bienvenue|indemnité/i.test(rep.slice(-2).map((r) => r.text).join(' '));
    else ok = RELANCE.test(all); // non-éligibles → relance attendue
    if (ok) okBranch++; else { koBranch++; }
    if (!samples[u.type]) samples[u.type] = { phone: u.phone, n: rep.length, last: rep.slice(-1)[0] };
  }
  const health = await fetch(`http://127.0.0.1:${BOT_PORT}/health`).then((r) => r.json()).catch(() => ({}));
  const totalReplies = [...REPLIES.values()].reduce((a, v) => a + v.length, 0);

  console.log('\n═══ SIMULATION : 20 CONVERSATIONS EN PARALLÈLE ═══\n');
  console.log(`Durée totale (20 en //) : ${ms} ms`);
  console.log(`Numéros distincts répondus : ${REPLIES.size}/20`);
  console.log(`Réponses bot capturées (total) : ${totalReplies}`);
  console.log(`/health → sessions actives: ${health.sessions}, dossiers: ${health.dossiers}, leads: ${health.leads}, dedup: ${health.dedup}`);
  console.log(`\nBranchement correct : ${okBranch}/20  ${koBranch ? '❌ ' + koBranch + ' KO' : '✅'}`);
  console.log('\n— Échantillon par type (dernière réponse reçue) —');
  for (const [type, s] of Object.entries(samples)) console.log(`  • ${type.padEnd(16)} ${s.phone}  (${s.n} msgs)  → [${s.last.kind}] ${s.last.text}`);

  // transcript complet d'1 éligible + 1 non-éligible
  const showOne = (type) => { const u = users.find((x) => x.type === type); const rep = REPLIES.get(digits(u.phone)) || []; console.log(`\n— Transcript ${type} (${u.phone}) —`); rep.forEach((r, i) => console.log(`  ${i + 1}. [${r.kind}] ${r.text}`)); };
  showOne('eligible'); showOne('nonelig_3h');

  console.log(`\n${okBranch === 20 && REPLIES.size === 20 ? '✅ 20/20 — concurrence OK, états isolés, branches correctes' : '⚠️ voir écarts ci-dessus'}`);
  process.exit(okBranch === 20 && REPLIES.size === 20 ? 0 : 1);
})();
