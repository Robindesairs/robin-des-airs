/**
 * extract-eticket.js — Extraction structurée d'un e-billet / confirmation de réservation.
 *
 * Donne, à partir des OCTETS d'un document (PDF ou image), tout ce dont le MANDAT a besoin :
 *   route, date, n° de vol, PNR, ET la liste des passagers (noms) — ce que l'OCR carte
 *   d'embarquement existant refusait de lire.
 *
 * Deux moteurs, zéro nouvelle dépendance (fetch global Node ≥18) :
 *   • image/*          → OpenAI gpt-4o Vision   (OPENAI_API_KEY)     — chemin déjà éprouvé en prod
 *   • application/pdf  → Claude (bloc document) (ANTHROPIC_API_KEY)  — gpt-4o ne lit pas les PDF
 *
 * `normalize()` est PUR (aucun réseau) et exporté → testable hors-ligne sur un JSON modèle.
 */
'use strict';

const PROMPT = `Tu lis un E-BILLET / une CONFIRMATION DE RÉSERVATION d'avion (souvent PLUSIEURS passagers et/ou PLUSIEURS vols).
Extrais TOUTES les informations nécessaires à un mandat de réclamation. Réponds UNIQUEMENT en JSON, ce schéma exact :
{"vol":"","compagnie":"","date":"","pnr":"","depart":"","arrivee":"","escale":false,
 "segments":[{"vol":"","depart":"","arrivee":"","date":""}],
 "passagers":[{"nom":"","prenom":"","date_naissance":""}]}
Règles STRICTES :
- vol : numéro du vol en MAJUSCULES sans espace (ex. AF718, AT540). Pour le niveau racine, mets le 1er vol.
- compagnie : nom complet de la compagnie (déduis du code IATA du vol si besoin, ex. AF → Air France).
- date : date du 1er vol. "JJ/MM/AAAA" si l'année est imprimée ; "JJ/MM" si l'année N'EST PAS écrite. NE JAMAIS deviner ni inventer l'année.
- pnr : référence de réservation / record locator (libellés : PNR, Booking ref, Réf, Confirmation) — 5 à 8 caractères ALPHANUMÉRIQUES. Si vraiment absente, "".
- depart : code IATA 3 lettres du point de départ INITIAL. arrivee : code IATA de la destination FINALE.
- escale : true s'il y a PLUS D'UN vol (correspondance), sinon false.
- segments : UN objet par vol/coupon, dans l'ordre du voyage (depart → arrivee + n° de vol + date de ce vol).
- passagers : la LISTE de TOUS les passagers nommés sur le billet. nom = nom de famille en MAJUSCULES ; prenom = prénom(s). Les noms sont souvent écrits "NOM / Prénom".
- date_naissance : SEULEMENT si elle est imprimée sur le billet (rare) au format JJ/MM/AAAA, sinon "".
- Champ inconnu = "". Ne JAMAIS inventer.`;

// ── Normalisation (pure) ──────────────────────────────────────────────────────
function up(x) { return String(x || '').toUpperCase().replace(/\s+/g, ''); }
function iata(x) { x = String(x || '').trim(); const m = x.toUpperCase().match(/\b[A-Z]{3}\b/); return m ? m[0] : x; }
function dateNorm(x) {
  x = String(x || '').trim();
  let m = x.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`; }
  m = x.match(/^(\d{1,2})[\/\-.](\d{1,2})$/); // JJ/MM (année non imprimée — autorisé)
  if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
  return '';
}
// {nom, prenom} → "PRENOM NOM" en MAJUSCULES. Gère aussi "NOM / Prénom" collé dans `nom`.
function paxName(x) {
  if (!x) return '';
  let nom = String(x.nom || '').trim(), prenom = String(x.prenom || '').trim();
  if (!prenom && nom.includes('/')) { const [a, b] = nom.split('/'); nom = (a || '').trim(); prenom = (b || '').trim(); }
  return [prenom, nom].filter(Boolean).join(' ').toUpperCase().replace(/\s+/g, ' ').trim();
}

function normalize(raw) {
  raw = raw || {};
  const segs = (Array.isArray(raw.segments) ? raw.segments : [])
    .map((s) => ({ vol: up(s.vol), depart: iata(s.depart), arrivee: iata(s.arrivee), date: dateNorm(s.date) }))
    .filter((s) => s.vol || s.depart || s.arrivee);
  const escale = !!raw.escale || segs.length > 1;
  const depart = iata(raw.depart) || (segs[0] && segs[0].depart) || '';
  const arrivee = iata(raw.arrivee) || (segs.length ? segs[segs.length - 1].arrivee : '');
  let route = '';
  if (segs.length) { const ap = []; segs.forEach((l, i) => { if (i === 0 && l.depart) ap.push(l.depart); if (l.arrivee) ap.push(l.arrivee); }); route = ap.filter(Boolean).join(' → '); }
  if (!route && depart && arrivee) route = `${depart} → ${arrivee}`;
  const vol = segs.length > 1 ? segs.map((s) => s.vol).filter(Boolean).join(' + ') : (up(raw.vol) || (segs[0] && segs[0].vol) || '');
  const pnrRaw = String(raw.pnr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pnr = /^[A-Z0-9]{5,8}$/.test(pnrRaw) ? pnrRaw : '';
  const passengers = (Array.isArray(raw.passagers) ? raw.passagers : [])
    .map((p) => ({ name: paxName(p), dob: dateNorm(p.date_naissance) }))
    .filter((p) => p.name);
  return { vol, compagnie: String(raw.compagnie || '').trim(), date: dateNorm(raw.date), pnr, depart, arrivee, route, escale, segments: segs, passengers, pax: passengers.length || 0 };
}

// ── Moteurs (réseau) ──────────────────────────────────────────────────────────
async function callOpenAIVision(b64, mime, key) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ETICKET_OPENAI_MODEL || 'gpt-4o',
      max_tokens: 900, temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mime || 'image/jpeg'};base64,${b64}` } }] }],
    }),
  });
  const data = await res.json();
  if (!data.choices) return null;
  return JSON.parse(data.choices[0].message.content);
}

async function callClaudeDoc(b64, mime, key, model) {
  const isPdf = /pdf/i.test(mime || '');
  const media = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : { type: 'image', source: { type: 'base64', media_type: mime || 'image/jpeg', data: b64 } };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: [media, { type: 'text', text: PROMPT }] }] }),
  });
  const data = await res.json();
  const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

function looksLikePdf(bytes) { try { return Buffer.from(bytes.slice(0, 5)).toString('latin1').startsWith('%PDF'); } catch (_) { return false; } }

/**
 * @param {Buffer|Uint8Array} bytes  octets bruts du document
 * @param {string} mime              content-type (ex. 'application/pdf', 'image/jpeg')
 * @param {object} [opts]            { openaiKey, anthropicKey, model }
 * @returns {Promise<object|null>}   objet normalisé (voir normalize) ou null si échec / pas de clé
 */
async function extractEticket(bytes, mime, opts = {}) {
  try {
    const b64 = Buffer.from(bytes).toString('base64');
    const isPdf = /pdf/i.test(mime || '') || (!/^image\//i.test(mime || '') && looksLikePdf(bytes));
    const openaiKey = opts.openaiKey || process.env.OPENAI_API_KEY;
    const anthropicKey = opts.anthropicKey || process.env.ANTHROPIC_API_KEY;
    const model = opts.model || process.env.ETICKET_MODEL || process.env.RADAR_ENQUETE_MODEL || 'claude-sonnet-4-5';
    let raw = null;
    if (isPdf) {
      if (!anthropicKey) return null; // un PDF exige Claude (gpt-4o Vision ne lit pas les PDF)
      raw = await callClaudeDoc(b64, 'application/pdf', anthropicKey, model);
    } else if (openaiKey) {
      raw = await callOpenAIVision(b64, mime, openaiKey);
    } else if (anthropicKey) {
      raw = await callClaudeDoc(b64, mime || 'image/jpeg', anthropicKey, model);
    } else {
      return null;
    }
    return raw ? normalize(raw) : null;
  } catch (e) {
    return null;
  }
}

module.exports = { extractEticket, normalize, PROMPT };
