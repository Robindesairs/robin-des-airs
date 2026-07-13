/**
 * /api/ocr-eticket — lecture OCR d'un E-BILLET / carte d'embarquement depuis la VOIE WEB
 * (depot-express.html). Pré-remplit le contrat sans erreur de saisie : n° de vol, trajet,
 * date, PNR, escales, passagers — MÊME moteur que le bot WhatsApp (PROMPT + normalize()
 * copiés depuis railway/lib/extract-eticket.js, partie PURE, sans la dépendance PDF mupdf :
 * cette fonction traite les IMAGES ; un PDF est déposé sans lecture auto côté web).
 *
 * POST { dataBase64, mime } (image jpeg/png/webp)
 * → 200 { ok:true, eticket:{ flightNum, dep, arr, dateFr, dateIso, pnr, escale, legs[], passengers[], pax, allerRetour } }
 * → 200 { ok:false } si illisible (le tunnel bascule en saisie manuelle — jamais bloquant)
 *
 * Sécurité/coûts : CORS site uniquement, image ≤ ~4 Mo, aucun stockage ici.
 */

const SITE_ORIGINS = ['https://robindesairs.eu', 'https://www.robindesairs.eu'];
const corsFor = (event) => {
  const o = String((event && event.headers && (event.headers.origin || event.headers.Origin)) || '').trim();
  const allow = SITE_ORIGINS.includes(o) ? o : 'https://robindesairs.eu';
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allow, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type' };
};

// ── PROMPT IDENTIQUE au bot (railway/lib/extract-eticket.js) ──
const PROMPT = `Tu lis un E-BILLET / une CONFIRMATION DE RÉSERVATION d'avion (souvent PLUSIEURS passagers, et parfois un ALLER + un RETOUR).
Extrais TOUTES les informations nécessaires à un mandat de réclamation. Réponds UNIQUEMENT en JSON, ce schéma exact :
{"lisible":true,"confidence":1.0,"multi_pnr":false,"compagnie":"","pnr":"","numero_billet":"","aller_retour":false,
 "trajets":[{"sens":"aller","date":"","depart":"","arrivee":"","ville_depart":"","ville_arrivee":"","segments":[{"vol":"","depart":"","arrivee":"","ville_depart":"","ville_arrivee":"","date":"","heure":"","operateur":""}]}],
 "passagers":[{"nom":"","prenom":"","date_naissance":"","type":"","gratuit":false}]}
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
- segments : TOUS les tronçons, chacun avec vol (MAJUSCULES sans espace, ex. AF718), depart/arrivee (IATA 3 lettres), date du segment. ⚠️ Une MÊME carte d'embarquement / un MÊME billet peut contenir PLUSIEURS tronçons (2 ou 3 : ex. DKR→CMN→CDG) — liste-les TOUS, n'en oublie aucun. Une mention « VIA <ville> » / « CORRESPONDANCE » / « CONNECTING » signale une ESCALE : décompose-la en deux tronçons (départ→escale, puis escale→arrivée finale), n'oublie jamais la ville « via ».
- ville_depart / ville_arrivee (par segment ET par trajet) : le NOM DE LA VILLE tel qu'il est IMPRIMÉ sur le billet, à côté ou au-dessus du code IATA. Exemples : "Paris", "Casablanca", "Dakar", "Le Cap", "Rome". NE JAMAIS deviner : si la ville n'est PAS écrite en clair sur le billet (seul le code IATA apparaît), laisse "". Utile pour l'affichage client (préféré au code aéroport nu). Ne mets JAMAIS le nom d'aéroport (« Charles de Gaulle », « Mohammed V ») — seulement la VILLE.
- heure : heure de DÉPART du tronçon au format HH:MM sur 24h, si elle est imprimée (aide à remettre les vols dans l'ordre). Sinon "". Ne devine jamais.
- operateur : UNIQUEMENT si le billet indique EXPLICITEMENT que ce segment est « opéré par / operated by / vol opéré par / realizado por / durchgeführt von » une compagnie DIFFÉRENTE de celle du numéro de vol (cas CODE-SHARE). Renvoie alors le CODE IATA 2 lettres de la compagnie qui OPÈRE RÉELLEMENT ce vol (ex. « AF703 — operated by Kenya Airways » → "KQ" ; « KL567 operated by Kenya Airways » → "KQ"). Si la mention « opéré par » nomme la MÊME compagnie que le numéro de vol, ou s'il n'y a AUCUNE mention « opéré par », laisse "" (le transporteur est alors celui du numéro de vol). Ne DEVINE jamais un opérateur.
- date : "JJ/MM/AAAA" si l'année est imprimée, sinon "JJ/MM". NE JAMAIS deviner ni inventer l'année.
- passagers : TOUS les passagers nommés. nom = nom de famille (surname) en MAJUSCULES ; prenom = prénom(s) (given name).
- ⚠️ SÉPARATION NOM / PRÉNOM par les LIBELLÉS imprimés (fiable, c'est écrit sur le billet) : « Surname / Last name / Family name / Nom / Apellido / Nachname / Nom de famille » → nom ; « Given name(s) / First name / Forename / Prénom / Nombre / Vorname » → prenom. Respecte cette répartition, ne l'inverse pas. Si un SEUL champ « Name / Passenger / Nom du passager » au format « NOM/Prénom » ou « NOM Prénom », le bloc en MAJUSCULES (souvent avant le « / ») = nom, le reste = prenom.
- date_naissance : la DATE DE NAISSANCE de CHAQUE passager, UNIQUEMENT si elle est IMPRIMÉE, au format JJ/MM/AAAA. Libellés : « Date of birth / DOB / D.O.B / Date de naissance / Né(e) le / Born / Birth date / Geburtsdatum / Fecha de nacimiento / Data de nascimento ». Elle figure souvent sur les e-billets et cartes d'embarquement internationales : extrais-la quand elle est là. NE LA CONFONDS PAS avec la date du vol ni la date d'émission. Si absente, "". Ne devine JAMAIS.
- ⚠️ UN NOM = UN passager. Une carte d'embarquement ne contient QU'UN SEUL passager. Un nom écrit "NOM PRENOM", "NOM/PRENOM", "NOM PRENOM1 PRENOM2" ou "PRENOM NOM" sur UNE MÊME LIGNE / dans UN MÊME champ nom passager = UN SEUL passager (à répartir entre nom et prenom), JAMAIS deux. Ne crée DEUX passagers QUE si le document liste DEUX personnes DISTINCTES (deux lignes/blocs passager séparés, ou deux cartes d'embarquement). Exemples :
   • « SECK SEYNABOU » (un seul champ nom) → UN passager nom="SECK", prenom="SEYNABOU" (JAMAIS deux passagers "SECK" et "SEYNABOU")
   • « DIALLO/MAMADOU » → UN passager nom="DIALLO", prenom="MAMADOU"
   • deux lignes « 1. DIALLO Mamadou » et « 2. NDIAYE Fatou » → DEUX passagers
- ⚠️ TITRES DE COURTOISIE : SUPPRIME TOUJOURS les titres du nom et du prénom (ils ne font PAS partie de l'identité). Titres à IGNORER (toutes graphies, avec ou sans point, majuscules ou minuscules) :
   • FR : M / M. / MR / MR. / MONSIEUR / MME / MME. / MADAME / MLLE / MLLE. / MADEMOISELLE / DR / DR. / DOCTEUR / PR / PR. / PROF / PROFESSEUR / ME / MAÎTRE
   • EN : MR / MR. / MRS / MRS. / MS / MS. / MISS / MASTER / MSTR / SIR / MADAM / DR / DR. / DOCTOR / PROF / PROF.
   • ES/PT : SR / SR. / SRA / SRA. / SRTA / SEÑOR / SEÑORA / SEÑORITA / SENHOR / SENHORA
   • DE : HERR / FRAU / DR. / PROF.
   Exemples :
   • billet « ASIAMAH MRS COMFORT » → nom="ASIAMAH", prenom="COMFORT" (SANS "MRS")
   • billet « M. DIALLO Mamadou » → nom="DIALLO", prenom="Mamadou"
   • billet « Mrs Sarah SMITH » → nom="SMITH", prenom="Sarah"
   • billet « Dr Aicha BAH » → nom="BAH", prenom="Aicha"
- ⚠️ DATE PAR SEGMENT : chaque tronçon a sa PROPRE date (ex. Dakar→Casa le 15/06, puis Casa→Paris le 16/06 le lendemain matin — escale de NUIT fréquente sur les retours d'Afrique). Lis la date SPÉCIFIQUE de CHAQUE segment sur le billet — NE COPIE PAS la date du 1er segment sur les suivants. Si la date d'un segment n'est PAS imprimée séparément, laisse "" (mieux que faux).
- type : le TYPE de passager s'il est indiqué (colonne "Type", ou mention à côté du nom) → renvoie "adulte", "enfant" ou "bebe". Indices : Adulte/Adult/ADT → "adulte" ; Enfant/Child/CHD/CNN → "enfant" ; Bébé/Bebe/Infant/INF/Nourrisson → "bebe". Si rien d'indiqué, "".
- gratuit : true UNIQUEMENT si le billet indique EXPLICITEMENT que ce passager voyage à titre GRATUIT (tarif 0, « gratuit », « free of charge / FOC », bébé sur les genoux SANS aucun tarif ni taxe). Un bébé/INF avec un tarif OU des taxes, même faibles → false. Dans le doute → false (on réclame).
- Plusieurs images/pages d'un MÊME billet : FUSIONNE en UN seul résultat ; ne liste chaque passager qu'UNE fois (pas de doublon entre pages).
- Champ inconnu = "". Ne JAMAIS inventer.`;

// ── Normalisation (pure) — copiée de railway/lib/extract-eticket.js ──
function up(x) { return String(x || '').toUpperCase().replace(/\s+/g, ''); }
function iata(x) { x = String(x || '').trim(); const m = x.toUpperCase().match(/\b[A-Z]{3}\b/); return m ? m[0] : x; }
function opCode(x) { const m = String(x || '').toUpperCase().replace(/\s+/g, '').match(/^[0-9A-Z]{2}$/); return m ? m[0] : ''; }
function hhmm(x) { const m = String(x || '').trim().match(/^(\d{1,2})[:hH.](\d{2})$/); if (!m) return ''; const h = +m[1], mi = +m[2]; return (h < 24 && mi < 60) ? `${String(h).padStart(2, '0')}:${m[2]}` : ''; }
function chainSegments(segs) {
  if (!Array.isArray(segs) || segs.length < 2) return segs;
  const norm = (x) => String(x || '').toUpperCase().trim();
  if (segs.some((l) => !norm(l.depart) || !norm(l.arrivee))) return segs;
  const start = segs.find((l) => !segs.some((o) => o !== l && norm(o.arrivee) === norm(l.depart)));
  if (!start) return segs;
  const chain = [start]; let rem = segs.filter((l) => l !== start);
  while (rem.length) {
    const last = chain[chain.length - 1];
    const next = rem.find((l) => norm(l.depart) === norm(last.arrivee));
    if (!next) return segs;
    chain.push(next); rem = rem.filter((l) => l !== next);
  }
  return chain;
}
function dateNorm(x) {
  x = String(x || '').trim();
  let m = x.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) { const yy = m[3].length === 2 ? '20' + m[3] : m[3]; return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${yy}`; }
  m = x.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
  return '';
}
const _TITLE_RE = /(?:^|\s|\.)(?:M(?:R|ME|LLE|\.)|MR|MR\.|MRS|MRS\.|MS|MS\.|MISS|MADAM|MADAME|MADEMOISELLE|MASTER|MSTR|SIR|SR|SR\.|SRA|SRA\.|SRTA|SEÑOR|SEÑORA|SEÑORITA|SENHOR|SENHORA|HERR|FRAU|MONSIEUR|DR|DR\.|DOCTEUR|DOCTOR|PR|PR\.|PROF|PROF\.|PROFESSEUR|MAÎTRE|MAITRE|ME)(?=\s|\.|$)/gi;
function stripTitles(x) { return String(x || '').replace(_TITLE_RE, ' ').replace(/\s+/g, ' ').replace(/\s*\.\s*/g, ' ').trim(); }
function paxName(x) {
  if (!x) return '';
  let nom = stripTitles(String(x.nom || '').trim()), prenom = stripTitles(String(x.prenom || '').trim());
  if (!prenom && nom.includes('/')) { const [a, b] = nom.split('/'); nom = stripTitles((a || '').trim()); prenom = stripTitles((b || '').trim()); }
  return [prenom, nom].filter(Boolean).join(' ').toUpperCase().replace(/\s+/g, ' ').trim();
}
function cleanCity(x) { return String(x || '').trim().replace(/\s+/g, ' '); }
function tripFromSegments(segs, fb) {
  fb = fb || {};
  segs = chainSegments(segs);
  const depart = (segs[0] && segs[0].depart) || iata(fb.depart) || '';
  const arrivee = (segs.length ? segs[segs.length - 1].arrivee : '') || iata(fb.arrivee) || '';
  const ville_depart = (segs[0] && segs[0].ville_depart) || cleanCity(fb.ville_depart) || '';
  const ville_arrivee = (segs.length ? segs[segs.length - 1].ville_arrivee : '') || cleanCity(fb.ville_arrivee) || '';
  const label = (seg, which) => (seg[`ville_${which}`] || seg[which] || '').trim();
  let route = '';
  if (segs.length) {
    const ap = [];
    segs.forEach((l, i) => { if (i === 0) { const dep = label(l, 'depart'); if (dep) ap.push(dep); } const arr = label(l, 'arrivee'); if (arr) ap.push(arr); });
    route = ap.filter(Boolean).join(' → ');
  }
  if (!route && depart && arrivee) route = `${ville_depart || depart} → ${ville_arrivee || arrivee}`;
  const vol = segs.length > 1 ? segs.map((s) => s.vol).filter(Boolean).join(' + ') : ((segs[0] && segs[0].vol) || up(fb.vol) || '');
  const date = (segs[0] && segs[0].date) || dateNorm(fb.date) || '';
  const operePar = (segs.length && segs[segs.length - 1].operateur) || (segs.find((x) => x.operateur) || {}).operateur || '';
  return { sens: String(fb.sens || '').toLowerCase(), date, depart, arrivee, ville_depart, ville_arrivee, route, vol, operePar, escale: segs.length > 1, segments: segs };
}
function _ymd(d) { const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function dayGap(a, b) { const da = _ymd(a), db = _ymd(b); return (da && db) ? Math.round(Math.abs(db - da) / 86400000) : 0; }
function groupFlatSegments(segs) {
  const groups = []; let cur = [];
  for (const s of segs) { const prev = cur[cur.length - 1]; if (prev && dayGap(prev.date, s.date) >= 2) { groups.push(cur); cur = []; } cur.push(s); }
  if (cur.length) groups.push(cur);
  return groups.map((g, i) => tripFromSegments(g, { sens: i === 0 ? 'aller' : (i === 1 ? 'retour' : '') }));
}
function normalize(raw) {
  raw = raw || {};
  const normSeg = (s) => ({ vol: up(s.vol), depart: iata(s.depart), arrivee: iata(s.arrivee), ville_depart: cleanCity(s.ville_depart), ville_arrivee: cleanCity(s.ville_arrivee), date: dateNorm(s.date), heure: hhmm(s.heure), operateur: opCode(s.operateur) });
  let trajets = [];
  if (Array.isArray(raw.trajets) && raw.trajets.length) {
    trajets = raw.trajets.map((t) => {
      let segs = (Array.isArray(t.segments) ? t.segments : []).map(normSeg).filter((x) => x.vol || x.depart || x.arrivee);
      if (!segs.length && (t.vol || t.depart || t.arrivee)) segs = [normSeg({ vol: t.vol, depart: t.depart, arrivee: t.arrivee, ville_depart: t.ville_depart, ville_arrivee: t.ville_arrivee, date: t.date })];
      return tripFromSegments(segs, { sens: t.sens, depart: t.depart, arrivee: t.arrivee, ville_depart: t.ville_depart, ville_arrivee: t.ville_arrivee, date: t.date, vol: t.vol });
    }).filter((t) => t.depart || t.arrivee || t.vol);
  }
  if (!trajets.length) {
    const flat = (Array.isArray(raw.segments) ? raw.segments : []).map(normSeg).filter((x) => x.vol || x.depart || x.arrivee);
    if (flat.length) trajets = groupFlatSegments(flat);
    else if (raw.depart || raw.arrivee || raw.vol) trajets = [tripFromSegments([], { sens: 'aller', depart: raw.depart, arrivee: raw.arrivee, date: raw.date, vol: raw.vol })];
  }
  if (trajets[0] && !trajets[0].sens) trajets[0].sens = 'aller';
  if (trajets[1] && !trajets[1].sens) trajets[1].sens = 'retour';
  const main = trajets[0] || { sens: '', date: '', depart: '', arrivee: '', route: '', vol: '', escale: false, segments: [] };
  const pnrRaw = String(raw.pnr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pnr = (/^[A-Z0-9]{5,8}$/.test(pnrRaw) && /[A-Z]/.test(pnrRaw)) ? pnrRaw : '';
  const billetRaw = String(raw.numero_billet || '').replace(/\D/g, '');
  const billet = /^\d{13,14}$/.test(billetRaw) ? billetRaw : '';
  const reference = pnr || billet;
  const byName = new Map();
  for (const p of (Array.isArray(raw.passagers) ? raw.passagers : [])) {
    const name = paxName(p); if (!name) continue;
    const dob = dateNorm(p.date_naissance); const k = name.toUpperCase();
    const minorByType = /enfant|b[ée]b[ée]|bebe|child|infant|nourrisson|\bchd\b|\bcnn\b|\binf\b/i.test(String(p.type || ''));
    const isBebe = /b[ée]b[ée]|bebe|infant|nourrisson|\binf\b/i.test(String(p.type || ''));
    const gratuit = p.gratuit === true || p.gratuit === 'true';
    if (byName.has(k)) { const ex = byName.get(k); if (!ex.dob && dob) ex.dob = dob; if (minorByType) ex.minor = true; if (isBebe) ex.bebe = true; if (gratuit) ex.gratuit = true; }
    else { const o = { name, dob }; if (minorByType) o.minor = true; if (isBebe) o.bebe = true; if (gratuit) o.gratuit = true; byName.set(k, o); }
  }
  const passengers = [...byName.values()];
  return {
    vol: main.vol, compagnie: String(raw.compagnie || '').trim(), date: main.date, pnr: reference,
    depart: main.depart, arrivee: main.arrivee, route: main.route, escale: main.escale, segments: main.segments,
    allerRetour: trajets.length > 1, trajets, passengers, pax: passengers.length || 0,
    lisible: raw.lisible !== false,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : (raw.lisible === false ? 0.3 : 1),
    multiPNR: !!raw.multi_pnr,
  };
}

async function visionClaude(b64, mime) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim(); if (!key) return null;
  try {
    const model = process.env.ETICKET_CLAUDE_MODEL || process.env.PASSPORT_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(24000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0, messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: PROMPT },
      ] }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null;
  } catch (_) { return null; }
}
async function visionGpt(b64, mime) {
  const key = (process.env.OPENAI_API_KEY || '').trim(); if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(24000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 1500, temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [ { type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } } ] }] }),
    });
    const data = await res.json(); if (!data.choices) return null;
    return JSON.parse(data.choices[0].message.content);
  } catch (_) { return null; }
}

exports.handler = async (event) => {
  const H = corsFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'POST only' }) };
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'bad json' }) }; }
  const mime = String(b.mime || '').toLowerCase();
  const data = String(b.dataBase64 || '');
  if (!data) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'image requise' }) };
  if (!/^image\/(jpe?g|png|webp)$/.test(mime)) return { statusCode: 415, headers: H, body: JSON.stringify({ error: 'Envoyez une photo (JPEG/PNG).' }) };
  if (data.length > 5_600_000) return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'Photo trop volumineuse (max ~4 Mo).' }) };
  const raw = (await visionClaude(data, mime)) || (await visionGpt(data, mime));
  const n = raw ? normalize(raw) : null;
  if (!n || !n.lisible || n.confidence < 0.4 || (!n.vol && !n.route)) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false }) };
  const segs = n.segments || [];
  const legs = segs.length > 1 ? segs.map((s) => ({ num: s.vol || '', dep: s.ville_depart || s.depart || '', arr: s.ville_arrivee || s.arrivee || '' })) : [];
  const dm = (n.date || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const dateIso = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : '';
  const firstSeg = segs[0] || {}, lastSeg = segs[segs.length - 1] || {};
  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, eticket: {
    flightNum: n.vol, compagnie: n.compagnie, route: n.route,
    dep: firstSeg.ville_depart || n.depart || '', arr: lastSeg.ville_arrivee || n.arrivee || '',
    dateFr: n.date, dateIso, pnr: n.pnr, escale: n.escale && legs.length > 1, legs,
    passengers: n.passengers, pax: n.pax, allerRetour: n.allerRetour, multiPNR: n.multiPNR,
  } }) };
};
