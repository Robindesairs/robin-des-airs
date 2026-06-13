/**
 * Chaos/fuzz + matrice d'éligibilité du tunnel (bot local + faux WATI, rien envoyé en vrai).
 *  A) CHAOS : inputs absurdes, hors-séquence, doublons, commandes (go/menu/reset), langue qui
 *     change → prouve : aucun crash, aucun cul-de-sac (le bot répond toujours), états isolés.
 *  B) DÉDUP : même messageId livré 3× → traité une seule fois.
 *  C) ÉLIGIBILITÉ : verdicts attendus (éligible continue / non-éligible → relance), dont la
 *     PRESCRIPTION aux bornes (vol > 5 ans → relance ; vol récent → continue).
 *   node test-robustness.js
 */
'use strict';
const http = require('http');
const BOT = 3977, WATI = 4077, SECRET = 'robsecret';
process.env.WATI_WEBHOOK_SECRET = SECRET; process.env.WATI_API_TOKEN = 'd'; process.env.WATI_API_BASE = `http://127.0.0.1:${WATI}`;
process.env.WATI_CHANNEL_PHONE = '33756863730'; process.env.PORT = String(BOT);
process.env.STATE_FILE = '/tmp/rob-state.json'; process.env.DOSSIERS_FILE = '/tmp/rob-dossiers.json'; process.env.LEADS_FILE = '/tmp/rob-leads.json';
require('fs').writeFileSync('/tmp/rob-state.json', '{}'); // départ propre

let UNHANDLED = 0; process.on('unhandledRejection', () => UNHANDLED++); process.on('uncaughtException', () => UNHANDLED++);

const REP = new Map(); const dig = (s) => String(s).replace(/\D/g, '');
const rec = (p, t) => { const k = dig(p); if (!REP.has(k)) REP.set(k, []); REP.get(k).push(String(t || '').replace(/\s+/g, ' ').slice(0, 200)); };
http.createServer((req, res) => { let b = ''; req.on('data', (c) => b += c); req.on('end', () => {
  try { const u = new URL(req.url, 'http://x'); let j = {}; try { j = JSON.parse(b || '{}'); } catch (_) {}
    if (/sendSessionMessage\//.test(u.pathname)) rec(u.pathname.split('sendSessionMessage/')[1], u.searchParams.get('messageText'));
    else if (/ButtonsMessage/.test(u.pathname)) rec(u.searchParams.get('whatsappNumber'), j.body);
    else if (/interactive/.test(u.pathname)) rec(j.target, (j.list_message || {}).body); } catch (_) {}
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"result":true,"ok":true}'); }); }).listen(WATI);
require('./server.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let MID = 0;
async function post(phone, text, id, dupId) {
  const m = { waId: phone, whatsappMessageId: dupId || ('r-' + (++MID)) };
  if (id) m.interactiveButtonReply = { id, text }; else m.text = text;
  await fetch(`http://127.0.0.1:${BOT}/api/wati-webhook?s=${SECRET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [m] }) }).catch(() => {});
}
async function step(phone, text, id, dupId) { const n = (REP.get(dig(phone)) || []).length; await post(phone, text, id, dupId); for (let i = 0; i < 20; i++) { await sleep(90); if ((REP.get(dig(phone)) || []).length > n) break; } }
const txt = (p) => (REP.get(dig(p)) || []).join(' || ');
const RELANCE = /autre vol|5 ans|rétroactiv|refermez/i;

(async () => {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${BOT}/health`)).ok) break; } catch (_) {} await sleep(100); }
  let pass = 0, fail = 0; const ko = []; const ok = (c, m) => { if (c) pass++; else { fail++; ko.push(m); } };

  // ── A) CHAOS : 10 conversations avec garbage interleavé ──
  const GARBAGE = ['😀😀😀😀', 'a'.repeat(2500), "'; DROP TABLE users; <script>alert(1)</script>", 'azerty qsdfgh wxcvbn', '99999', '👋🏿✈️🇸🇳', '....', 'PLUS DE 3H???', 'je sais pas trop en fait', '0'];
  const chaosUsers = [];
  for (let i = 0; i < 10; i++) {
    const p = '221780' + (100000 + i); chaosUsers.push(p);
    await step(p, 'bonjour');                          // → accueil
    await step(p, GARBAGE[i % GARBAGE.length]);        // garbage à l'étape langue
    await step(p, 'Français');                          // langue
    await step(p, GARBAGE[(i + 3) % GARBAGE.length]);  // garbage à route_zone
    await step(p, 'départ');                            // route_zone
    await step(p, GARBAGE[(i + 6) % GARBAGE.length]);  // garbage à incident
    await step(p, i % 2 ? 'menu' : 'retard');          // commande ou incident
    await step(p, 'plus de 3 heures');
    await step(p, '2');
  }
  // assertions chaos : chaque user a reçu plusieurs réponses (bot toujours réactif), funnel avancé
  for (const p of chaosUsers) {
    const n = (REP.get(dig(p)) || []).length;
    ok(n >= 5, `chaos ${p}: réactif (${n} réponses)`);
    ok(/passager|direct ou avec escale|vol|incident|langue|départ d'europe/i.test(txt(p)), `chaos ${p}: funnel a progressé malgré le garbage`);
  }

  // ── B) DÉDUP : même messageId livré 3× ──
  const dp = '221780900001';
  await step(dp, 'bonjour'); await step(dp, 'Français'); await step(dp, 'départ');
  const before = (REP.get(dig(dp)) || []).length;
  await post(dp, 'retard', null, 'DUP-FIX-1'); await post(dp, 'retard', null, 'DUP-FIX-1'); await post(dp, 'retard', null, 'DUP-FIX-1');
  await sleep(700);
  const added = (REP.get(dig(dp)) || []).length - before;
  ok(added <= 1, `dédup: 3× même messageId → ${added} réponse (≤1 attendu)`);

  // ── C) ÉLIGIBILITÉ : verdicts attendus ──
  const elig = async (p, inputs) => { for (const x of inputs) await step(p, x.t, x.id); };
  const cases = [
    { p: '221781000001', label: 'éligible retard 3h+ → CONTINUE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'départ' }, { t: 'retard' }, { t: 'plus de 3 heures' }, { t: '2' }, { t: 'direct' }], expectRelance: false, mustReach: /passager|photo|e-billet|escale/i },
    { p: '221781000002', label: 'non-élig <3h → RELANCE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'départ' }, { t: 'retard' }, { t: 'moins de 3h' }], expectRelance: true },
    { p: '221781000003', label: 'non-élig annulation >14j → RELANCE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'départ' }, { t: 'annulation' }, { t: 'plus de 14 jours' }], expectRelance: true },
    { p: '221781000004', label: 'non-élig hors-UE → RELANCE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'aucun des deux' }], expectRelance: true },
    { p: '221781000005', label: 'PRESCRIPTION vol >5 ans → RELANCE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'départ' }, { t: 'retard' }, { t: 'plus de 3 heures' }, { t: '1' }, { t: 'direct' }, { t: 'saisir à la main', id: 'scan_manuel' }, { t: 'AF718' }, { t: '01/01/2018' }], expectRelance: true, presc: true },
    { p: '221781000006', label: 'date récente (<5 ans) → CONTINUE', inputs: [{ t: 'bonjour' }, { t: 'Français' }, { t: 'départ' }, { t: 'retard' }, { t: 'plus de 3 heures' }, { t: '1' }, { t: 'direct' }, { t: 'saisir à la main', id: 'scan_manuel' }, { t: 'AF718' }, { t: '15/03/2025' }], expectRelance: false },
  ];
  for (const c of cases) {
    await elig(c.p, c.inputs);
    const t = txt(c.p); const sawRel = RELANCE.test(t);
    ok(sawRel === c.expectRelance, `${c.label} (relance vu=${sawRel}, attendu=${c.expectRelance})`);
    if (c.presc) ok(/5 ans|prescription|délai|dépasse/i.test(t), `  ↳ motif prescription présent`);
    if (c.mustReach) ok(c.mustReach.test(t), `  ↳ a atteint l'étape attendue`);
  }

  await sleep(300);
  const health = await fetch(`http://127.0.0.1:${BOT}/health`).then((r) => r.json()).catch(() => ({}));
  console.log('\n═══ ROBUSTESSE : chaos + dédup + éligibilité ═══\n');
  console.log(`Erreurs fatales (unhandledRejection/uncaughtException) : ${UNHANDLED}`);
  console.log(`/health → sessions: ${health.sessions}, dedup: ${health.dedup}, numéros répondus: ${REP.size}`);
  console.log(`\nAssertions : ${pass} ✅  ${fail ? fail + ' ❌' : ''}`);
  if (ko.length) { console.log('\nÉchecs :'); ko.forEach((m) => console.log('  ✗ ' + m)); }
  console.log(`\n${fail === 0 && UNHANDLED === 0 ? '✅ ROBUSTE : aucun crash, aucun cul-de-sac, dédup OK, verdicts corrects' : '⚠️ voir ci-dessus'}`);
  process.exit(fail === 0 && UNHANDLED === 0 ? 0 : 1);
})();
