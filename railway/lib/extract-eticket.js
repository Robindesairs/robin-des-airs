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

const PROMPT = `Tu lis un E-BILLET / une CONFIRMATION DE RÉSERVATION d'avion (souvent PLUSIEURS passagers, et parfois un ALLER + un RETOUR).
Extrais TOUTES les informations nécessaires à un mandat de réclamation. Réponds UNIQUEMENT en JSON, ce schéma exact :
{"lisible":true,"confidence":1.0,"multi_pnr":false,"compagnie":"","pnr":"","numero_billet":"","aller_retour":false,
 "trajets":[{"sens":"aller","date":"","depart":"","arrivee":"","segments":[{"vol":"","depart":"","arrivee":"","date":""}]}],
 "passagers":[{"nom":"","prenom":"","date_naissance":"","type":""}]}
Règles STRICTES :
- lisible / confidence : si le document est trop FLOU, SOMBRE, COUPÉ, incliné ou compressé pour lire les champs clés (n° de vol, PNR, noms) avec CERTITUDE → lisible=false, confidence basse (≤0.4) et laisse VIDES les champs incertains. NE DEVINE JAMAIS un n° de vol "probable" pour remplir : mieux vaut vide que faux.
- compagnie : nom complet de la compagnie (déduis du code IATA du vol, ex. AF → Air France).
- pnr : le RECORD LOCATOR de la COMPAGNIE (6 caractères alphanumériques, contient des LETTRES, souvent près du code-barres ou des segments). Libellés possibles : PNR, Booking ref, Réf, Confirmation, Dossier, Record locator, Airline ref, Réf. transporteur, Localizador, Buchungscode, Filekey. PRÉFÈRE-le à la référence de l'AGENCE/OTA (eDreams, Opodo, Gotogate, Wakanow…). IGNORE une référence PUREMENT NUMÉRIQUE (c'est une réf agence, pas un PNR). Si vraiment absent, "".
- numero_billet : le NUMÉRO DE BILLET électronique (e-ticket, ex. 057-1234567890) = 13 chiffres (3 du code compagnie + 10). Libellés : Numéro de billet, Ticket number, e-Ticket, Billet n°, Ticket/Document no. C'est une AUTRE référence EN PLUS du PNR — ne le mets PAS dans pnr (le PNR contient des lettres), et ne le confonds pas avec une réf agence/OTA. Si absent, "".
- multi_pnr : true s'il y a PLUSIEURS réservations DISTINCTES (PNR différents) sur le(s) document(s) — dans ce cas NE FUSIONNE PAS les passagers, signale-le simplement.
- trajets : UN objet par DIRECTION de voyage.
   • Une CORRESPONDANCE (escale) reste DANS LE MÊME trajet, MÊME si le vol suivant part le LENDEMAIN (escale de NUIT — fréquent sur les retours d'Afrique : ex. Dakar→Casablanca le soir puis Casablanca→Paris le lendemain matin = UN SEUL trajet).
   • Un RETOUR = on REVIENT vers le point de départ initial (la destination du retour = le départ de l'aller), en général plusieurs JOURS plus tard → trajet SÉPARÉ. sens="aller" pour le 1er, "retour" pour le retour.
- aller_retour : true s'il y a un trajet aller ET un trajet retour.
- segments : dans l'ordre, chacun avec vol (MAJUSCULES sans espace, ex. AF718), depart/arrivee (IATA 3 lettres), date du segment.
- date : "JJ/MM/AAAA" si l'année est imprimée, sinon "JJ/MM". NE JAMAIS deviner ni inventer l'année.
- passagers : TOUS les passagers nommés. nom = nom de famille en MAJUSCULES ; prenom = prénom(s) (souvent "NOM / Prénom"). date_naissance SEULEMENT si imprimée (JJ/MM/AAAA), sinon "".
- type : le TYPE de passager s'il est indiqué (colonne "Type", ou mention à côté du nom) → renvoie "adulte", "enfant" ou "bebe". Indices : Adulte/Adult/ADT → "adulte" ; Enfant/Child/CHD/CNN → "enfant" ; Bébé/Bebe/Infant/INF/Nourrisson → "bebe". Si rien d'indiqué, "".
- Plusieurs images/pages d'un MÊME billet : FUSIONNE en UN seul résultat ; ne liste chaque passager qu'UNE fois (pas de doublon entre pages).
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

// Un trajet = UNE direction (aller OU retour), avec ses segments chaînés.
function tripFromSegments(segs, fb) {
  fb = fb || {};
  const depart = (segs[0] && segs[0].depart) || iata(fb.depart) || '';
  const arrivee = (segs.length ? segs[segs.length - 1].arrivee : '') || iata(fb.arrivee) || '';
  let route = '';
  if (segs.length) { const ap = []; segs.forEach((l, i) => { if (i === 0 && l.depart) ap.push(l.depart); if (l.arrivee) ap.push(l.arrivee); }); route = ap.filter(Boolean).join(' → '); }
  if (!route && depart && arrivee) route = `${depart} → ${arrivee}`;
  const vol = segs.length > 1 ? segs.map((s) => s.vol).filter(Boolean).join(' + ') : ((segs[0] && segs[0].vol) || up(fb.vol) || '');
  const date = (segs[0] && segs[0].date) || dateNorm(fb.date) || '';
  return { sens: String(fb.sens || '').toLowerCase(), date, depart, arrivee, route, vol, escale: segs.length > 1, segments: segs };
}
// Écart en JOURS entre deux dates "JJ/MM/AAAA" (0 si l'une n'a pas d'année → on ne coupe pas au doute).
function _ymd(d) { const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function dayGap(a, b) { const da = _ymd(a), db = _ymd(b); return (da && db) ? Math.round(Math.abs(db - da) / 86400000) : 0; }
// Repli (si le modèle n'a pas groupé) : segments à plat → trajets. Une escale — MÊME de NUIT (vol
// suivant le lendemain, fréquent sur les retours d'Afrique) — reste un seul trajet ; on ne SÉPARE
// aller / retour que sur un vrai écart ≥ 2 JOURS.
function groupFlatSegments(segs) {
  const groups = []; let cur = [];
  for (const s of segs) {
    const prev = cur[cur.length - 1];
    if (prev && dayGap(prev.date, s.date) >= 2) { groups.push(cur); cur = []; }
    cur.push(s);
  }
  if (cur.length) groups.push(cur);
  return groups.map((g, i) => tripFromSegments(g, { sens: i === 0 ? 'aller' : (i === 1 ? 'retour' : '') }));
}

function normalize(raw) {
  raw = raw || {};
  const normSeg = (s) => ({ vol: up(s.vol), depart: iata(s.depart), arrivee: iata(s.arrivee), date: dateNorm(s.date) });
  let trajets = [];
  if (Array.isArray(raw.trajets) && raw.trajets.length) {
    trajets = raw.trajets.map((t) => {
      let segs = (Array.isArray(t.segments) ? t.segments : []).map(normSeg).filter((x) => x.vol || x.depart || x.arrivee);
      if (!segs.length && (t.vol || t.depart || t.arrivee)) segs = [normSeg({ vol: t.vol, depart: t.depart, arrivee: t.arrivee, date: t.date })];
      return tripFromSegments(segs, { sens: t.sens, depart: t.depart, arrivee: t.arrivee, date: t.date, vol: t.vol });
    }).filter((t) => t.depart || t.arrivee || t.vol);
  }
  if (!trajets.length) {
    // Compat : ancien schéma à plat (segments / depart / arrivee).
    const flat = (Array.isArray(raw.segments) ? raw.segments : []).map(normSeg).filter((x) => x.vol || x.depart || x.arrivee);
    if (flat.length) trajets = groupFlatSegments(flat);
    else if (raw.depart || raw.arrivee || raw.vol) trajets = [tripFromSegments([], { sens: 'aller', depart: raw.depart, arrivee: raw.arrivee, date: raw.date, vol: raw.vol })];
  }
  if (trajets[0] && !trajets[0].sens) trajets[0].sens = 'aller';
  if (trajets[1] && !trajets[1].sens) trajets[1].sens = 'retour';
  const main = trajets[0] || { sens: '', date: '', depart: '', arrivee: '', route: '', vol: '', escale: false, segments: [] };
  const pnrRaw = String(raw.pnr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Un vrai record locator compagnie contient des LETTRES → on rejette un code purement numérique (= réf agence/OTA).
  const pnr = (/^[A-Z0-9]{5,8}$/.test(pnrRaw) && /[A-Z]/.test(pnrRaw)) ? pnrRaw : '';
  // N° de billet e-ticket (13 chiffres) → référence de SECOURS si le PNR est absent : pour la
  // compagnie, le n° de billet identifie la réservation aussi bien que le record locator.
  const billetRaw = String(raw.numero_billet || '').replace(/\D/g, '');
  const billet = /^\d{13,14}$/.test(billetRaw) ? billetRaw : '';
  const reference = pnr || billet; // ce qu'on utilisera comme « PNR » dans le tunnel + le mandat
  // Passagers : dédoublonnés par nom (un même passager peut figurer sur 2 pages photographiées).
  const byName = new Map();
  for (const p of (Array.isArray(raw.passagers) ? raw.passagers : [])) {
    const name = paxName(p); if (!name) continue;
    const dob = dateNorm(p.date_naissance); const k = name.toUpperCase();
    // Type "Enfant/Bébé/Child/Infant" sur le billet → mineur certain, MÊME sans date de naissance imprimée
    // (cas fréquent des familles : l'enfant est sur la réservation, étiqueté, sans DDN).
    const minorByType = /enfant|b[ée]b[ée]|bebe|child|infant|nourrisson|\bchd\b|\bcnn\b|\binf\b/i.test(String(p.type || ''));
    if (byName.has(k)) { const ex = byName.get(k); if (!ex.dob && dob) ex.dob = dob; if (minorByType) ex.minor = true; }
    else { const o = { name, dob }; if (minorByType) o.minor = true; byName.set(k, o); }
  }
  const passengers = [...byName.values()];
  // Champs racine = trajet principal (aller, par défaut) → compat avec le tunnel existant ; + trajets[] pour aller/retour.
  return {
    vol: main.vol, compagnie: String(raw.compagnie || '').trim(), date: main.date, pnr: reference, billet, refType: pnr ? 'pnr' : (billet ? 'billet' : ''),
    depart: main.depart, arrivee: main.arrivee, route: main.route, escale: main.escale, segments: main.segments,
    allerRetour: trajets.length > 1, trajets,
    passengers, pax: passengers.length || 0,
    // Signaux qualité (gate côté serveur) — défaut permissif si le modèle ne les fournit pas.
    lisible: raw.lisible !== false,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : (raw.lisible === false ? 0.3 : 1),
    multiPNR: !!raw.multi_pnr,
  };
}

// ── Moteurs (réseau) — acceptent PLUSIEURS pages/images en UN seul appel ───────
function looksLikePdf(bytes) { try { return Buffer.from(bytes.slice(0, 5)).toString('latin1').startsWith('%PDF'); } catch (_) { return false; } }
function detectMime(bytes, mime) {
  if (mime && /pdf|image\//i.test(mime)) return mime.toLowerCase();
  return looksLikePdf(bytes) ? 'application/pdf' : (mime || 'image/jpeg');
}

// ── Rastérisation PDF → PNG (repli quand pas de clé Claude : gpt-4o lit alors les pages) ──
// mupdf = WASM pur (aucun binaire natif) → import paresseux + cache ; si indispo, on renvoie null
// (l'appelant retombe sur le message honnête « envoyez une capture »).
let _mupdfPromise = null;
function _loadMupdf() { if (!_mupdfPromise) _mupdfPromise = import('mupdf').then((m) => m.default || m).catch(() => null); return _mupdfPromise; }
async function pdfToImages(pdfBytes, opts = {}) {
  const maxPages = opts.maxPages || 5;
  try {
    const mupdf = await _loadMupdf();
    if (!mupdf || !mupdf.Document) return null;
    const doc = mupdf.Document.openDocument(new Uint8Array(pdfBytes), 'application/pdf');
    const n = Math.min(doc.countPages(), maxPages);
    const out = [];
    for (let i = 0; i < n; i++) {
      const page = doc.loadPage(i);
      const pix = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false); // ~144 dpi : net pour l'OCR
      out.push(Buffer.from(pix.asPNG()));
    }
    return out.length ? out : null;
  } catch (e) { return null; }
}

async function callOpenAIVision(items, key) {
  const content = [{ type: 'text', text: PROMPT }];
  for (const it of items) content.push({ type: 'image_url', image_url: { url: `data:${it.mime || 'image/jpeg'};base64,${it.b64}` } });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.ETICKET_OPENAI_MODEL || 'gpt-4o', max_tokens: 1200, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error('openai_http_' + res.status); // 429/5xx → relancé par extractEticketMulti
  const data = await res.json();
  if (!data.choices) return null;
  return JSON.parse(data.choices[0].message.content);
}

async function callClaudeDoc(items, key, model) {
  const content = [];
  for (const it of items) {
    content.push(/pdf/i.test(it.mime || '')
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: it.b64 } }
      : { type: 'image', source: { type: 'base64', media_type: it.mime || 'image/jpeg', data: it.b64 } });
  }
  content.push({ type: 'text', text: PROMPT });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1500, temperature: 0, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error('anthropic_http_' + res.status); // 429/5xx → relancé par extractEticketMulti
  const data = await res.json();
  const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

/**
 * Extraction depuis PLUSIEURS pages/images (e-billet photographié recto/verso/page 2…).
 * Toutes les pages partent en UN seul appel → le modèle FUSIONNE en un résultat cohérent.
 * @param {Array<{bytes:(Buffer|Uint8Array), mime?:string}>} parts
 * @param {object} [opts] { openaiKey, anthropicKey, model }
 * @returns {Promise<object|null>}
 */
async function extractEticketMulti(parts, opts = {}) {
  try {
    const items = (parts || []).filter((p) => p && p.bytes).map((p) => ({ b64: Buffer.from(p.bytes).toString('base64'), mime: detectMime(p.bytes, p.mime) }));
    if (!items.length) return null;
    const anyPdf = items.some((it) => /pdf/i.test(it.mime));
    const openaiKey = opts.openaiKey || process.env.OPENAI_API_KEY;
    const anthropicKey = opts.anthropicKey || process.env.ANTHROPIC_API_KEY;
    const model = opts.model || process.env.ETICKET_MODEL || process.env.RADAR_ENQUETE_MODEL || 'claude-sonnet-4-5';
    let call = null;
    if (anyPdf && anthropicKey) {
      call = () => callClaudeDoc(items, anthropicKey, model);               // PDF natif Claude (meilleure qualité)
    } else if (anyPdf && openaiKey) {
      // Pas de clé Claude → on RASTÉRISE les PDF en images, gpt-4o lit alors les pages.
      const imgItems = [];
      for (const it of items) {
        if (/pdf/i.test(it.mime)) {
          const pages = await pdfToImages(Buffer.from(it.b64, 'base64'), { maxPages: 5 });
          if (!pages) return null;                                          // conversion indispo → repli message honnête en amont
          for (const png of pages) imgItems.push({ b64: png.toString('base64'), mime: 'image/png' });
        } else imgItems.push(it);
      }
      if (!imgItems.length) return null;
      call = () => callOpenAIVision(imgItems, openaiKey);
    } else if (anyPdf) {
      return null;                                                          // PDF mais aucune clé dispo
    } else if (openaiKey) {
      call = () => callOpenAIVision(items, openaiKey);
    } else if (anthropicKey) {
      call = () => callClaudeDoc(items, anthropicKey, model);
    } else {
      return null;
    }
    // 2 tentatives : une erreur transitoire (429 / 5xx / timeout) ne doit pas se traduire en « illisible ».
    let raw = null;
    for (let attempt = 0; attempt < 2 && raw == null; attempt++) {
      try { raw = await call(); }
      catch (e) { if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); else throw e; }
    }
    return raw ? normalize(raw) : null;
  } catch (e) {
    return null;
  }
}

// Convenance : une seule page/image.
async function extractEticket(bytes, mime, opts = {}) {
  return extractEticketMulti([{ bytes, mime }], opts);
}

module.exports = { extractEticket, extractEticketMulti, normalize, pdfToImages, PROMPT };
