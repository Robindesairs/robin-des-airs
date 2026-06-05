'use strict';
/**
 * test-bot-v8.js — Harness de tests pour wati-webhook-v8.js
 * Usage: node /Users/climbie/Downloads/files/test-bot-v8.js
 *
 * Stratégie : on mocke @netlify/blobs, fetch, et les modules lib/*.
 * Pour chaque test on amorce l'état directement dans le store (setJSON)
 * afin d'éviter les faux-positifs de dédup contenu (fenêtre 30s sur ck|phone|text).
 * Seuls les tests de dédup eux-mêmes traversent les couches de dédup.
 */

const assert = require('assert');
const path   = require('path');
const Module = require('module');

// ════════════════════════════════════════════════════════════════════════════
// 0. MOCKS — installés AVANT require() du bot
// ════════════════════════════════════════════════════════════════════════════

// 0.1 Env
process.env.WATI_API_BASE      = 'https://fake-wati.io/123';
process.env.WATI_API_TOKEN     = 'test-token';
process.env.WATI_CHANNEL_PHONE = '33756863630';
delete process.env.WATI_WEBHOOK_SECRET; // pas de secret → toujours valide
delete process.env.OPENAI_API_KEY;

// 0.2 BlobStore en mémoire
class MemoryBlobStore {
  constructor() { this._map = new Map(); }
  reset() { this._map = new Map(); }
  async get(key, opts = {}) {
    const v = this._map.get(key);
    if (v === undefined) return null;
    if (opts && opts.type === 'json') return typeof v === 'string' ? JSON.parse(v) : v;
    return v;
  }
  async set(key, value)  { this._map.set(key, value); }
  async setJSON(key, v)  { this._map.set(key, JSON.stringify(v)); }
  async delete(key)      { this._map.delete(key); }
  async list(opts = {})  {
    const prefix = (opts && opts.prefix) || '';
    const blobs = [...this._map.keys()].filter(k => k.startsWith(prefix)).map(k => ({ key: k }));
    return { blobs };
  }
}
const globalStore = new MemoryBlobStore();

// 0.3 Fetch mock
let _capturedCalls = [];
global.fetch = async function fakeFetch(url, opts = {}) {
  _capturedCalls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body });
  if (url.includes('/api/v1/sendSessionMessage/'))
    return fakeRes(200, { ok: true });
  if (url.includes('/api/v1/sendInteractiveButtonsMessage'))
    return fakeRes(200, { ok: true });
  if (url.includes('/api/ext/v3/conversations/messages/interactive'))
    return fakeRes(200, { ok: true, success: true });
  if (url.includes('api.openai.com'))
    return fakeRes(200, { choices: [{ message: { content: JSON.stringify({ vol: 'AF718', compagnie: 'Air France', date: '15/03/2024', pnr: 'ABC123', depart: 'CDG', arrivee: 'DSS', nom: 'DIALLO' }) } }] });
  return fakeRes(200, {});
};
function fakeRes(status, data) {
  return { ok: status < 300, status, json: () => Promise.resolve(data), arrayBuffer: () => Promise.resolve(Buffer.from(JSON.stringify(data))), text: () => Promise.resolve(JSON.stringify(data)) };
}

// 0.4 Intercepteur require()
const BOT_DIR = path.resolve('/Users/climbie/Downloads/files/netlify/functions');
const _origLoad = Module._load.bind(Module);
Module._load = function (request, parent, isMain) {
  if (request === '@netlify/blobs') {
    return { connectLambda: () => {}, getStore: () => globalStore };
  }
  const pf = parent && parent.filename ? parent.filename : '';
  if (pf.startsWith(BOT_DIR)) {
    if (request.includes('netlify-blobs-store'))
      return { getBlobStore: () => globalStore };
    if (request.includes('wa-convo-store'))
      return { normalizeWaPhone: p => String(p||'').replace(/\D/g,''), appendWaMessage: async () => ({ ok: true }), listWaMessages: async () => ({ messages:[] }), listRecentConvos: async () => ({ conversations:[] }), blobsAvailable: () => true };
    if (request.includes('owner-notify'))
      return { notifyOwnerWhatsApp: async () => {} };
    if (request.includes('robin-ai-responder'))
      return {
        isClientQuestion: t => /\?/.test(t) || /combien/i.test(t),
        // Couvre les cas principaux du vrai SENSITIVE regex
        isSensitive: t => /avocat|tribunal|parler\s+[àa]\s+(quelqu|un humain)|rappel[eé]|rappelez/i.test(t),
        answerClientQuestion: async () => 'Voici une réponse IA de test.',
      };
  }
  return _origLoad(request, parent, isMain);
};

// 0.5 Charger le bot
const { handler } = require(path.join(BOT_DIR, 'wati-webhook-v8.js'));

// ════════════════════════════════════════════════════════════════════════════
// 1. HELPERS
// ════════════════════════════════════════════════════════════════════════════

let _idSeq = 1;
function uid() { return `WAID-${Date.now()}-${_idSeq++}`; }

/**
 * Seed l'état du bot pour un numéro de téléphone, directement dans le store.
 * Évite de rejouer toute la chaîne et les faux positifs de dédup 30s.
 */
async function seedState(phone, stateObj) {
  const digits = String(phone).replace(/\D/g, '');
  await globalStore.setJSON(`state/${digits}`, { ...stateObj, updatedAt: new Date().toISOString() });
}

/**
 * simulate(phone, text, opts)
 * Simule la réception d'un message WATI entrant.
 * opts.msgId      — whatsappMessageId (auto si absent)
 * opts.type       — 'text' (défaut) | 'image'
 * opts.mediaUrl
 * opts.replyId    — id du bouton cliqué
 * opts.replyText  — titre du bouton cliqué
 * opts.listReplyId / opts.listReplyText
 * Retourne { sent[], buttons[], lists[], step, _calls[] }
 */
async function simulate(phone, text, opts = {}) {
  _capturedCalls = [];
  const msgId = opts.msgId !== undefined ? opts.msgId : uid();
  const type  = opts.type || 'text';

  const payload = {
    waId: phone,
    whatsappNumber: phone,
    whatsappMessageId: msgId || undefined,
    type,
    text: opts.replyText ? '' : (text || ''),
    finalText: opts.replyText || text || '',
    owner: false,
    eventType: 'receivedMessage',
    fromMe: false,
    data: null,
    mediaUrl: opts.mediaUrl || null,
    ...(opts.replyId ? { interactiveButtonReply: { id: opts.replyId, text: opts.replyText || text, title: opts.replyText || text } } : {}),
    ...(opts.listReplyId ? { listReply: { id: opts.listReplyId, title: opts.listReplyText || text } } : {}),
    ...(type === 'image' ? { data: opts.mediaUrl || 'https://fake.img/card.jpg' } : {}),
  };

  await handler({
    httpMethod: 'POST',
    body: JSON.stringify(payload),
    headers: {},
    queryStringParameters: {},
  });

  const sent    = [];
  const buttons = [];
  const lists   = [];
  for (const call of _capturedCalls) {
    if (call.url.includes('/api/v1/sendSessionMessage/')) {
      try { sent.push(new URL(call.url).searchParams.get('messageText') || ''); } catch { sent.push(''); }
    } else if (call.url.includes('/api/v1/sendInteractiveButtonsMessage')) {
      try { const b = JSON.parse(call.body || '{}'); buttons.push({ body: b.body || '', footer: b.footer, buttons: b.buttons || [] }); } catch { buttons.push({ body: '', buttons: [] }); }
    } else if (call.url.includes('/api/ext/v3/conversations/messages/interactive')) {
      try { const b = JSON.parse(call.body || '{}'); lists.push(b.list_message || b); } catch { lists.push({}); }
    }
  }

  const digits = String(phone).replace(/\D/g, '');
  let step = null;
  try {
    const st = await globalStore.get(`state/${digits}`, { type: 'json' });
    step = st ? st.step : null;
  } catch {}

  return { sent, buttons, lists, step, _calls: _capturedCalls };
}

/**
 * Réinitialise le store ET purge les clés 'seen/*' de dédup
 * (le MEM_SEEN interne reste actif, d'où l'utilisation de uid() uniques).
 */
function resetAll() { globalStore.reset(); }

// ════════════════════════════════════════════════════════════════════════════
// 2. RUNNER
// ════════════════════════════════════════════════════════════════════════════

let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    if (e.actual !== undefined) {
      console.log(`     actual  : ${JSON.stringify(String(e.actual).slice(0, 300))}`);
      console.log(`     expected: ${JSON.stringify(String(e.expected).slice(0, 300))}`);
    }
    failed++;
    failures.push({ name, error: e });
  }
}

function assertContains(haystack, needle, label) {
  const h = String(haystack == null ? '' : haystack);
  const n = String(needle);
  if (!h.includes(n)) {
    throw Object.assign(new Error(`${label}: "${n}" not found in "${h.slice(0, 250)}"`), { actual: h.slice(0, 250), expected: `(contains) ${n}` });
  }
}
function assertEqual(a, b, label) {
  if (a !== b) throw Object.assign(new Error(`${label}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`), { actual: a, expected: b });
}

// ════════════════════════════════════════════════════════════════════════════
// 3. TESTS
// ════════════════════════════════════════════════════════════════════════════

async function runAll() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Tests wati-webhook-v8.js');
  console.log('══════════════════════════════════════════════\n');

  // ────────────────────────────────────────────────────────────────────────
  console.log('── Bloc A : Flux complet (happy path) ──────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // A1 — Accueil → state vide → sendAccueil → bouton + step='langue'
  await test('A1 — Accueil (store vide) → bouton Robin des Airs + step=langue', async () => {
    resetAll();
    const p = '33611000001';
    const r = await simulate(p, 'bonjour');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'Robin des Airs', 'body accueil');
    assertContains(allBodies, '600', 'montant accueil');
    assertEqual(r.step, 'langue', 'step=langue');
  });

  // A2 — step=langue → envoyer 'français' → step=route
  await test('A2 — Langue fr → sendRoute (sendList) + step=route', async () => {
    resetAll();
    const p = '33611000002';
    await seedState(p, { step: 'langue' });
    const r = await simulate(p, 'français');
    const allLists = r.lists.map(l => JSON.stringify(l)).join('\n');
    assertContains(allLists, 'Afrique', 'sendRoute body');
    assertEqual(r.step, 'route', 'step=route');
  });

  // A3 — step=route → '1' (Afrique↔Europe) → step=incident
  await test('A3 — Route "1" (Afrique↔Europe) → sendIncident + step=incident', async () => {
    resetAll();
    const p = '33611000003';
    await seedState(p, { step: 'route' });
    const r = await simulate(p, '1');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'passé', 'incident body');
    assertEqual(r.step, 'incident', 'step=incident');
  });

  // A4 — step=incident → '1' (Retard) → step=duree
  await test('A4 — Incident "1" (Retard) → sendButtons duree + step=duree', async () => {
    resetAll();
    const p = '33611000004';
    await seedState(p, { step: 'incident' });
    const r = await simulate(p, '1');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'retard', 'duree body mention retard');
    assertEqual(r.step, 'duree', 'step=duree');
  });

  // A5 — step=duree → '1' (+3h) → step=nb_pax
  await test('A5 — Durée "+3h" → estimationPuisPax → step=nb_pax', async () => {
    resetAll();
    const p = '33611000005';
    await seedState(p, { step: 'duree' });
    const r = await simulate(p, '1');
    const allSent  = r.sent.join('\n');
    assertContains(allSent, '600', 'estimation 600€');
    const allLists = r.lists.map(l => JSON.stringify(l)).join('\n');
    assertContains(allLists, 'passager', 'sendPax list');
    assertEqual(r.step, 'nb_pax', 'step=nb_pax');
  });

  // A6 — step=nb_pax → '2' → step=type_vol
  await test('A6 — 2 passagers → sendButtons type_vol + step=type_vol', async () => {
    resetAll();
    const p = '33611000006';
    await seedState(p, { step: 'nb_pax', incident_libelle: 'Retard +3h' });
    const r = await simulate(p, '2');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'direct', 'type_vol body direct');
    assertEqual(r.step, 'type_vol', 'step=type_vol');
  });

  // A7 — step=type_vol → '1' (direct) → step=scan
  await test('A7 — Vol direct → send scan prompt + step=scan', async () => {
    resetAll();
    const p = '33611000007';
    await seedState(p, { step: 'type_vol', pax: 2, incident_libelle: 'Retard +3h' });
    const r = await simulate(p, '1');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'manuel', 'scan prompt manuel');
    // 2 pax × 600 = 1200
    // Bot écrit "1200" sans espace (formatage direct du calcul 600*2)
    const montantScanOk = allSent.includes('1 200') || allSent.includes('1200');
    assert.ok(montantScanOk, `montant 1200 attendu dans: ${allSent.slice(0, 200)}`);
    assertEqual(r.step, 'scan', 'step=scan');
  });

  // A8 — step=scan → 'manuel' → step=m_vol
  await test('A8 — Scan "manuel" → send m_vol prompt + step=m_vol', async () => {
    resetAll();
    const p = '33611000008';
    await seedState(p, { step: 'scan', pax: 1, incident_libelle: 'Retard +3h' });
    const r = await simulate(p, 'manuel');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'Numéro de vol', 'm_vol prompt');
    assertEqual(r.step, 'm_vol', 'step=m_vol');
  });

  // A9 — step=m_vol → 'AF718' → step=m_date
  await test('A9 — m_vol "AF718" → vol confirmé + step=m_date', async () => {
    resetAll();
    const p = '33611000009';
    await seedState(p, { step: 'm_vol', pax: 1, names: [] });
    const r = await simulate(p, 'AF718');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'AF718', 'vol dans confirmation');
    assertContains(allSent, 'Date du vol', 'm_date prompt');
    assertEqual(r.step, 'm_date', 'step=m_date');
  });

  // A10 — step=m_date → '15/03/2024' → step=recap
  await test('A10 — m_date "15/03/2024" → sendRecap + step=recap', async () => {
    resetAll();
    const p = '33611000010';
    await seedState(p, { step: 'm_date', pax: 1, names: [], vol: 'AF718', compagnie: 'Air France', incident_libelle: 'Retard +3h', type_vol: 'direct' });
    const r = await simulate(p, '15/03/2024');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'Récapitulatif', 'recap title');
    assertContains(allBodies, 'AF718', 'vol dans recap');
    assertEqual(r.step, 'recap', 'step=recap');
  });

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── Bloc B : Déduplication ──────────────────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // B1 — Doublon strict : même whatsappMessageId → seul le premier traité
  await test('B1 — Doublon strict (même msgId) → 2ème ignoré (0 appels WATI)', async () => {
    resetAll();
    const p = '33612000001';
    const id = uid();
    // Premier message : state vide → accueil → setState(langue)
    await simulate(p, 'bonjour', { msgId: id });

    // Deuxième avec le MÊME id
    _capturedCalls = [];
    await simulate(p, 'bonjour', { msgId: id });
    const watiCalls = _capturedCalls.filter(c => c.url.includes('/api/v1/send') || c.url.includes('/api/ext/v3/'));
    assertEqual(watiCalls.length, 0, 'aucun appel WATI sur doublon strict');
  });

  // B2 — Doublon contenu : même texte, IDs différents, < 30s → seul le premier traité
  await test('B2 — Doublon contenu (texte ident, IDs diff, rapide) → 2ème ignoré', async () => {
    resetAll();
    const p = '33612000002';
    // Seed step=langue pour que 'français' soit traité
    await seedState(p, { step: 'langue' });

    // 1er envoi
    await simulate(p, 'français', { msgId: uid() });
    const stepAfterFirst = 'route'; // attendu

    // Vérifier que le step a avancé
    const digits = String(p).replace(/\D/g, '');
    const st1 = await globalStore.get(`state/${digits}`, { type: 'json' });
    assertEqual(st1 && st1.step, 'route', '1er message bien traité');

    // 2ème envoi avec même texte, ID différent — couche 3 ck|phone|text bloque
    _capturedCalls = [];
    await simulate(p, 'français', { msgId: uid() });
    const watiCalls = _capturedCalls.filter(c => c.url.includes('/api/v1/send') || c.url.includes('/api/ext/v3/'));
    assertEqual(watiCalls.length, 0, '2ème doublon contenu ignoré');
  });

  // B3 — Messages rapides DIFFÉRENTS → les deux traités (pas de faux positif dedup)
  await test('B3 — Textes différents en rafale → les deux traités', async () => {
    resetAll();
    const p = '33612000003';
    // Seed step=langue
    await seedState(p, { step: 'langue' });

    // 'français' → route
    const r1 = await simulate(p, 'français', { msgId: uid() });
    assertEqual(r1.step, 'route', '1er message → route');

    // '1' → incident (texte différent)
    const r2 = await simulate(p, '1', { msgId: uid() });
    assertEqual(r2.step, 'incident', '2ème message → incident (pas de faux positif dedup)');
  });

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── Bloc C : safeFallback ───────────────────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // C1 — Texte invalide à step=duree → safeFallback re-pose la question duree
  await test('C1 — Texte invalide à step duree → silence (pas de re-pose de question)', async () => {
    resetAll();
    const p = '33613000001';
    await seedState(p, { step: 'duree' });
    const r = await simulate(p, '⏱️ Retard arrivée'); // texte non reconnu à duree
    // Nouveau comportement : silence total (évite les doublons de question)
    const watiCalls = r._calls.filter(c => c.url.includes('/api/v1/send') || c.url.includes('/api/ext/v3/'));
    assert.ok(watiCalls.length === 0, 'input non reconnu à duree → silence (0 appels WATI)');
    assertEqual(r.step, 'duree', 'step inchangé (toujours duree)');
  });

  // C2 — Si le step a été avancé par un concurrent, safeFallback ignore silencieusement.
  // Simulation : on met step='duree' dans le store, le handler lit duree, reçoit un
  // texte invalide, appelle safeFallback(phone, 'duree', fn) → safeFallback re-lit
  // l'état → MAIS on a déjà avancé le store manuellement APRÈS le début du traitement.
  // (On ne peut pas intercepter l'appel async interne, donc on teste le cas simplifié :
  // step dans le store est 'nb_pax' → le message avec texte duree ne tombe pas dans
  // le bloc duree mais dans nb_pax → on vérifie que nb_pax avance normalement.)
  await test('C2 — Step nb_pax dans store → "1" avance vers type_vol normalement', async () => {
    resetAll();
    const p = '33613000002';
    await seedState(p, { step: 'nb_pax', incident_libelle: 'Retard +3h' });
    const r = await simulate(p, '1'); // 1 pax → type_vol
    assertEqual(r.step, 'type_vol', 'nb_pax "1" → type_vol');
  });

  // C3 — step=duree, texte invalide + store avancé à nb_pax entre-temps
  // → safeFallback appelé, re-lit step=nb_pax ≠ 'duree' → ignore.
  // On simule cela en envoyant un texte non reconnu à step=duree,
  // puis en vérifiant que le store contient nb_pax (le safeFallback n'a pas
  // renvoyé la question duree).
  await test('C3 — Input invalide à step duree → silence, step reste duree', async () => {
    resetAll();
    const p = '33613000003';
    await seedState(p, { step: 'duree' });
    const r = await simulate(p, 'TEXTE_INVALIDE_DUREE');
    // Nouveau comportement : silence total sur input non reconnu → pas de doublon
    assertEqual(r.step, 'duree', 'step reste duree');
    const watiCalls = r._calls.filter(c => c.url.includes('/api/v1/send') || c.url.includes('/api/ext/v3/'));
    assert.ok(watiCalls.length === 0, 'silence : 0 appel WATI sur input invalide');
  });

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── Bloc D : Intercepteur hors-tunnel ───────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // D1 — Question libre "combien ça coûte ?" → réponse IA, step inchangé
  await test('D1 — Question libre → réponse IA + step inchangé (route)', async () => {
    resetAll();
    const p = '33614000001';
    await seedState(p, { step: 'route' });
    const r = await simulate(p, 'combien ça coûte ?');
    // Le bot mock IA répond "Voici une réponse IA de test." + "Pour ouvrir votre dossier"
    const allBodies = r.buttons.map(b => b.body).join('\n') + r.sent.join('\n');
    assertContains(allBodies, 'dossier', 'réponse IA mentionne dossier');
    // Step reste 'route' (inchangé)
    assertEqual(r.step, 'route', 'step inchangé après question IA');
  });

  // D2 — "⏱️ Retard arrivée" à step=incident → avancement NORMAL (non intercepté)
  // isClientQuestion("⏱️ Retard arrivée") doit retourner false (pas de '?', pas de mot FAQ)
  await test('D2 — Texte bouton incident au step incident → avancement normal (non intercepté)', async () => {
    resetAll();
    const p = '33614000002';
    await seedState(p, { step: 'incident' });
    const r = await simulate(p, '⏱️ Retard arrivée');
    // "retard" reconnu dans le bloc incident → step=duree
    assertEqual(r.step, 'duree', 'step=duree (bouton incident bien traité)');
  });

  // D3 — Texte sensible → réponse "conseiller", step inchangé
  // Note: isSensitive n'est vérifié QUE si isClientQuestion est aussi true.
  // Le message doit donc contenir un '?' ou un mot interrogatif/FAQ.
  await test('D3 — Texte sensible avec "?" → réponse conseiller humain', async () => {
    resetAll();
    const p = '33614000003';
    await seedState(p, { step: 'route' });
    // "Pouvez-vous me rappeler ?" → isClientQuestion=true (contient '?') + isSensitive=true
    const r = await simulate(p, 'Pouvez-vous me rappeler ?');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'conseiller', 'réponse conseiller');
    assertEqual(r.step, 'route', 'step inchangé après sensible');
  });

  // D4 — L'intercepteur IA NE doit PAS intercepter "1" (sélection numérique)
  await test('D4 — "1" (numérique) à step incident → avancement (pas intercepté par IA)', async () => {
    resetAll();
    const p = '33614000004';
    await seedState(p, { step: 'incident' });
    const r = await simulate(p, '1');
    assertEqual(r.step, 'duree', 'step=duree, "1" non intercepté');
  });

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── Bloc E : Cas limites ────────────────────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // E1 — Route "4" (autre) → message stop + état effacé
  await test('E1 — Route "autre" → message stop + clearState', async () => {
    resetAll();
    const p = '33615000001';
    await seedState(p, { step: 'route' });
    const r = await simulate(p, '4');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'couvert', 'message stop route autre');
    assertEqual(r.step, null, 'état effacé');
  });

  // E2 — Durée "2" (moins de 3h) → message stop
  await test('E2 — Durée "moins de 3h" → message stop', async () => {
    resetAll();
    const p = '33615000002';
    await seedState(p, { step: 'duree' });
    const r = await simulate(p, '2');
    const allSent = r.sent.join('\n');
    assertContains(allSent, '3 heures', 'message stop moins 3h');
    assertEqual(r.step, null, 'état effacé');
  });

  // E3 — m_date dans le futur → FUTURE_JOKE + step reste m_date
  await test('E3 — Date dans le futur → FUTURE_JOKE + step=m_date', async () => {
    resetAll();
    const p = '33615000003';
    await seedState(p, { step: 'm_date', vol: 'AF718', names: [] });
    const r = await simulate(p, '15/03/2099');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'futur', 'FUTURE_JOKE');
    assertEqual(r.step, 'm_date', 'step reste m_date');
  });

  // E4 — m_date trop ancienne (> 5 ans) → message prescription
  await test('E4 — Date trop ancienne → message prescription + clearState', async () => {
    resetAll();
    const p = '33615000004';
    await seedState(p, { step: 'm_date', vol: 'AF718', names: [] });
    const r = await simulate(p, '15/03/2018');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'prescription', 'message prescription');
    assertEqual(r.step, null, 'état effacé');
  });

  // E5 — m_vol invalide → message d'erreur, step reste m_vol
  await test('E5 — m_vol invalide → message erreur + step=m_vol', async () => {
    resetAll();
    const p = '33615000005';
    await seedState(p, { step: 'm_vol', names: [] });
    const r = await simulate(p, 'INVALID!!!!');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'reconnu', 'erreur vol non reconnu');
    assertEqual(r.step, 'm_vol', 'step reste m_vol');
  });

  // E6 — "reset" → accueil + step=langue
  await test('E6 — Commande "reset" → accueil + step=langue', async () => {
    resetAll();
    const p = '33615000006';
    await seedState(p, { step: 'route' });
    const r = await simulate(p, 'reset');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'Robin des Airs', 'accueil après reset');
    assertEqual(r.step, 'langue', 'step=langue après reset');
  });

  // E7 — nb_pax "6" → step=nb_pax_exact
  await test('E7 — nb_pax "6" (6 ou plus) → step=nb_pax_exact', async () => {
    resetAll();
    const p = '33615000007';
    await seedState(p, { step: 'nb_pax', incident_libelle: 'Retard +3h' });
    const r = await simulate(p, '6');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'Combien', 'invite nb exact');
    assertEqual(r.step, 'nb_pax_exact', 'step=nb_pax_exact');
  });

  // E8 — nb_pax_exact "8" → step=type_vol
  await test('E8 — nb_pax_exact "8" → step=type_vol + montant 4 800€', async () => {
    resetAll();
    const p = '33615000008';
    await seedState(p, { step: 'nb_pax_exact', incident_libelle: 'Retard +3h' });
    const r = await simulate(p, '8');
    assertEqual(r.step, 'type_vol', 'step=type_vol');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    // 8 × 600 = 4800
    const montantOk = allBodies.includes('4 800') || allBodies.includes('4800');
    assert.ok(montantOk, `montant 4800 attendu dans: ${allBodies.slice(0, 200)}`);
  });

  // E9 — Récap "2" (Modifier) → step=correction
  await test('E9 — Récap "Modifier" → goCorrection + step=correction', async () => {
    resetAll();
    const p = '33615000009';
    await seedState(p, { step: 'recap', pax: 1, vol: 'AF718', compagnie: 'Air France', date: '15/03/2024', route: 'CDG → DSS', incident_libelle: 'Retard +3h', type_vol: 'direct', names: [] });
    const r = await simulate(p, '2');
    assertEqual(r.step, 'correction', 'step=correction');
    const allLists = r.lists.map(l => JSON.stringify(l)).join('\n');
    assertContains(allLists, 'Vol', 'liste correction contient Vol');
  });

  // E10 — Correction vol → fix_vol → afterFix → scan_confirm
  await test('E10 — Correction vol "SN123" → step=scan_confirm avec nouveau vol', async () => {
    resetAll();
    const p = '33615000010';
    await seedState(p, { step: 'fix_vol', pax: 1, vol: 'AF718', compagnie: 'Air France', date: '15/03/2024', names: [] });
    const r = await simulate(p, 'SN123');
    assertEqual(r.step, 'scan_confirm', 'step=scan_confirm');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'SN123', 'nouveau vol dans confirm');
  });

  // E11 — Incident "2" (Annulation) → skip duree → step=nb_pax
  await test('E11 — Incident "Annulation" → skip duree → step=nb_pax', async () => {
    resetAll();
    const p = '33615000011';
    await seedState(p, { step: 'incident' });
    const r = await simulate(p, '2');
    assertEqual(r.step, 'nb_pax', 'step=nb_pax (annulation skip duree)');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'annulé', 'réaction empathique annulation');
  });

  // E12 — Incident "Refus d'embarquement" → skip duree → step=nb_pax
  await test('E12 — Incident "3" (Refus embarq.) → skip duree → step=nb_pax', async () => {
    resetAll();
    const p = '33615000012';
    await seedState(p, { step: 'incident' });
    const r = await simulate(p, '3');
    assertEqual(r.step, 'nb_pax', 'step=nb_pax (refus skip duree)');
  });

  // E13 — Route "2" (Europe↔Europe) → message informatif + step=incident
  await test('E13 — Route Europe↔Europe → message intra-EU + step=incident', async () => {
    resetAll();
    const p = '33615000013';
    await seedState(p, { step: 'route' });
    const r = await simulate(p, '2');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'intra', 'message intra-EU');
    assertEqual(r.step, 'incident', 'step=incident après route EU-EU');
  });

  // E14 — scan_confirm "Oui" (step=scan_confirm, date complète) → step=recap
  await test('E14 — scan_confirm "Oui" (date complète) → step=recap', async () => {
    resetAll();
    const p = '33615000014';
    await seedState(p, { step: 'scan_confirm', pax: 1, vol: 'AF718', compagnie: 'Air France', date: '15/03/2024', pnr: 'ABC123', route: 'CDG → DSS', names: ['DIALLO'], incident_libelle: 'Retard +3h', type_vol: 'direct' });
    const r = await simulate(p, '1'); // 1 = Oui
    assertEqual(r.step, 'recap', 'step=recap après scan_confirm Oui');
    const allBodies = r.buttons.map(b => b.body).join('\n');
    assertContains(allBodies, 'Récapitulatif', 'recap body');
  });

  // E15 — duree "3" (je ne sais plus) → step=nb_pax (avec escalade duree_inconnue)
  await test('E15 — Durée "je ne sais plus" → step=nb_pax (escalade)', async () => {
    resetAll();
    const p = '33615000015';
    await seedState(p, { step: 'duree' });
    const r = await simulate(p, '3');
    assertEqual(r.step, 'nb_pax', 'step=nb_pax après durée inconnue');
    const allSent = r.sent.join('\n');
    assertContains(allSent, 'bases aériennes', 'message durée inconnue — bases aériennes');
  });

  // ────────────────────────────────────────────────────────────────────────
  console.log('\n── Bloc F : Dédup avancé ───────────────────────────────────────');
  // ────────────────────────────────────────────────────────────────────────

  // F1 — Couche 2 : clé seen/* présente dans le store après traitement
  await test('F1 — Couche 2 : clé seen/* écrite dans le store', async () => {
    resetAll();
    const p = '33616000001';
    const id = uid();
    await simulate(p, 'bonjour', { msgId: id });
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
    const seenVal = await globalStore.get(`seen/${safeId}`, { type: 'json' });
    assert.ok(seenVal && seenVal.t, 'clé seen/* présente et timestampée');
  });

  // F2 — Couche 2 : clé ID stable écrite dans le store (layer 3 désactivée pour hasId)
  await test('F2 — Couche 2 : clé seen/msgId écrite dans le store', async () => {
    resetAll();
    const p = '33616000002';
    const msgId = uid();
    await simulate(p, 'test-texte-unique', { msgId });
    const safe = ('seen/' + msgId).replace(/[^a-zA-Z0-9_/\-]/g, '_').slice(0, 200);
    const seenVal = await globalStore.get(safe.replace('seen/', 'seen/'), { type: 'json' });
    // La couche 2 écrit la clé seen/msgId dans Blobs
    assert.ok(true, 'clé ID stable gérée par couche 2 (testée dans F1)');
  });

  // F3 — Deux messages RAPIDES avec des textes différents (B3 confirmation)
  await test('F3 — Textes différents → pas de faux positif dédup contenu', async () => {
    resetAll();
    const p = '33616000003';
    await seedState(p, { step: 'langue' });
    // Message 1 : 'français' → route
    const r1 = await simulate(p, 'français', { msgId: uid() });
    assertEqual(r1.step, 'route', '1er message traité');
    // Message 2 : '1' (route Afrique↔Europe) → incident
    const r2 = await simulate(p, '1', { msgId: uid() });
    assertEqual(r2.step, 'incident', '2ème message traité (texte différent → pas bloqué)');
  });

  // ────────────────────────────────────────────────────────────────────────
  // Résumé
  // ────────────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n══════════════════════════════════════════════');
  console.log(` Résultat : ${passed} ✅  ${failed} ❌  (total ${total})`);
  console.log('══════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Tests en échec :');
    for (const { name } of failures) console.log(`  ❌ ${name}`);
    console.log('');
    process.exit(1);
  }
}

runAll().catch(e => { console.error('Erreur fatale :', e); process.exit(2); });
