/**
 * Enquêteur retard — assemble pour un vol retardé/annulé :
 *   1. Faits vol (AeroDataBox brut : ICAO départ/arrivée, immat, statut, retard, horaires)
 *   2. Météo officielle METAR + TAF (NOAA aviationweather.gov, par code ICAO — gratuit)
 *   3. Rotation précédente de l'appareil (l'avion est-il arrivé en retard ? → retard en cascade)
 *   4. Cause probable + qualification « circonstance extraordinaire » via Claude (web_search)
 * Résultat mis en cache (Netlify Blobs) par VOL_DATE — une enquête coûte 1 appel IA, on ne la rejoue pas.
 *
 * Variables Netlify : ANTHROPIC_API_KEY (cause IA), RAPIDAPI_KEY (vol + rotation).
 *   RADAR_ENQUETE_MODEL — modèle Claude (défaut claude-sonnet-4-5 : bon rapport
 *                         qualité/coût pour le raisonnement juridique + web_search).
 *                         claude-haiku-4-5 = encore moins cher ; claude-opus-4-8 = max qualité ;
 *                         claude-fable-5 = qualité max (cher) → réserver via budget mensuel.
 *   RADAR_ENQUETE_BUDGET — plafond MENSUEL d'appels au modèle premium ci-dessus (0/absent = illimité).
 *                          Au-delà, bascule auto sur RADAR_ENQUETE_FALLBACK_MODEL. Ne compte que les
 *                          vrais appels au modèle (un cache-hit n'y arrive jamais). Cap « soft » :
 *                          léger dépassement possible en cas d'appels concurrents.
 *   RADAR_ENQUETE_FALLBACK_MODEL — modèle de repli une fois le budget épuisé (défaut claude-sonnet-4-5).
 *   RADAR_ENQUETE_EFFORT — force l'effort pour tous (low|medium|high|xhigh). Sinon : fable=high,
 *                          haiku=aucun, autres=low.
 */

const { ADB_HOST, rapidApiKey, parisYmd } = require('./aerodatabox-flight');

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE = 'robin-radar-enquetes';
const FRESH_MS = 12 * 3600 * 1000; // une enquête reste valable 12 h
const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

function enqueteModel() {
  return (process.env.RADAR_ENQUETE_MODEL || DEFAULT_MODEL).trim();
}

// ─── Budget mensuel du modèle premium (ex. Fable) ────────────────────────────
// Plafonne le NOMBRE d'enquêtes/mois sur le modèle premium ; au-delà → fallback Sonnet.
// On ne compte que les vrais appels au modèle : un cache-hit retourne avant d'arriver ici.
// Cap « soft » : en cas d'appels concurrents le compteur peut sous-estimer (léger dépassement borné).
function fallbackModel() {
  return (process.env.RADAR_ENQUETE_FALLBACK_MODEL || DEFAULT_MODEL).trim();
}
function premiumBudget() {
  const n = parseInt(process.env.RADAR_ENQUETE_BUDGET || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;            // 0/absent = illimité (comportement historique)
}
function budgetKey() {
  return `_budget_${parisYmd().slice(0, 7)}`;            // _budget_YYYY-MM (mois calendaire Paris)
}
async function budgetCount(event) {
  const store = blobStore(event);
  if (!store) return null;                               // Blobs illisible → compteur inconnu
  try { const v = await store.get(budgetKey(), { type: 'json' }); return (v && typeof v.n === 'number') ? v.n : 0; }
  catch (_) { return null; }
}
async function budgetIncr(event, prev) {
  const store = blobStore(event);
  if (!store) return;
  try { await store.setJSON(budgetKey(), { n: (prev || 0) + 1, at: new Date().toISOString() }); } catch (_) {}
}
// Effort par modèle : Fable mérite « high » (sortie plafonnée à 1200 tokens → coût borné).
function effortFor(model) {
  const override = (process.env.RADAR_ENQUETE_EFFORT || '').trim();
  if (override) return override;
  if (/haiku/i.test(model)) return '';                  // haiku : pas d'effort
  if (/fable/i.test(model)) return 'high';              // fable : raisonnement profond
  return 'low';                                         // sonnet/opus : bon rapport coût/qualité
}

// Page de statut officielle de la compagnie (copie minimale de radar.js, non exporté là-bas).
const AIRLINE_TRACKER = {
  AF: 'https://www.airfrance.fr/flightstatus/search', KL: 'https://www.klm.com/flightstatus',
  SN: 'https://www.brusselsairlines.com/en/flight-status', LH: 'https://www.lufthansa.com/flight-status',
  IB: 'https://www.iberia.com/flight-status', TP: 'https://www.flytap.com/flight-status',
  FR: 'https://www.ryanair.com/flight-status', VY: 'https://www.vueling.com/en/flight-status',
  EI: 'https://www.aerlingus.com/flight-status', LX: 'https://www.swiss.com/flight-status',
  OS: 'https://www.austrian.com/flight-status', DS: 'https://www.corsair.com/fr/suivi-de-vol',
};
function getTracker(iata, fn) {
  const base = AIRLINE_TRACKER[(iata || '').toUpperCase()];
  if (!base) return null;
  const f = (fn || '').replace(/\s/g, '');
  if (base.includes('airfrance')) return base + '?flightNumber=' + encodeURIComponent(f);
  if (base.includes('klm.com')) return base + '?searchKey=' + encodeURIComponent(f);
  return base + (base.includes('?') ? '&' : '?') + 'flight=' + encodeURIComponent(f);
}

function blobStore(event) {
  if (!blobs) return null;
  try {
    if (blobs.connectLambda && event) blobs.connectLambda(event);
    return blobs.getStore(STORE);
  } catch (_) { return null; }
}

function cacheKey(vol, date) {
  return `${String(vol || '').toUpperCase()}_${date}`.replace(/[^A-Z0-9_-]/gi, '_');
}

async function loadCache(event, vol, date) {
  const store = blobStore(event);
  if (!store) return null;
  try { return await store.get(cacheKey(vol, date), { type: 'json' }); }
  catch (_) { return null; }
}

async function saveCache(event, vol, date, data) {
  const store = blobStore(event);
  if (!store) return;
  try { await store.setJSON(cacheKey(vol, date), data); } catch (_) {}
}

// ─── AeroDataBox brut ────────────────────────────────────────────────────────
async function adbFetch(path, key) {
  const url = `https://${ADB_HOST}${path}`;
  try {
    const r = await fetch(url, {
      headers: { 'x-rapidapi-host': ADB_HOST, 'x-rapidapi-key': key, Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    if (Array.isArray(j)) return j;
    for (const k of ['flights', 'data', 'results', 'items']) if (Array.isArray(j && j[k])) return j[k];
    return [];
  } catch (_) { return []; }
}

function tms(timeObj) {
  if (!timeObj) return null;
  const s = timeObj.utc || timeObj.local;
  if (!s) return null;
  const v = Date.parse(String(s).replace(' ', 'T'));
  return Number.isNaN(v) ? null : v;
}

// Retard d'un segment (départ ou arrivée) en minutes, à partir des horaires.
function segDelay(seg) {
  if (!seg) return null;
  if (typeof seg.delay === 'number') return Math.round(seg.delay);
  const sch = tms(seg.scheduledTime);
  const act = tms(seg.actualTime) || tms(seg.revisedTime) || tms(seg.estimatedTime);
  if (sch != null && act != null) return Math.round((act - sch) / 60000);
  return null;
}

function hhmm(timeObj) {
  const ms = tms(timeObj);
  if (ms == null) return null;
  return new Date(ms).toISOString().slice(11, 16) + 'Z';
}

function pickRow(rows, dep, arr) {
  if (!rows.length) return null;
  if (dep || arr) {
    const m = rows.find((r) => {
      const d = (r.departure?.airport?.iata || '').toUpperCase();
      const a = (r.arrival?.airport?.iata || '').toUpperCase();
      return (!dep || d === dep.toUpperCase()) && (!arr || a === arr.toUpperCase());
    });
    if (m) return m;
  }
  return rows[0];
}

// ─── Rotation précédente (par immatriculation) ──────────────────────────────
async function previousRotation(reg, date, depIata, schedDepMs, key) {
  if (!reg || !key) return null;
  // Fenêtre J-1 → J : capte aussi une rotation arrivée la veille au soir.
  const prev = new Date(Date.parse(date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
  const rows = await adbFetch(`/flights/reg/${encodeURIComponent(reg)}/${prev}/${date}`, key);
  if (!rows.length) return null;
  // legs arrivant à notre aéroport de départ, avant notre départ programmé
  let best = null;
  for (const r of rows) {
    const arrIata = (r.arrival?.airport?.iata || '').toUpperCase();
    const arrMs = tms(r.arrival?.scheduledTime);
    if (depIata && arrIata !== depIata.toUpperCase()) continue;
    if (schedDepMs && arrMs && arrMs > schedDepMs) continue;
    if (!best || (arrMs && tms(best.arrival?.scheduledTime) && arrMs > tms(best.arrival?.scheduledTime))) best = r;
  }
  if (!best) return null;
  return {
    flight: best.number || best.callSign || '',
    from: best.departure?.airport?.iata || '',
    to: best.arrival?.airport?.iata || '',
    arrivalDelayMin: segDelay(best.arrival),
    scheduledArrival: hhmm(best.arrival?.scheduledTime),
    actualArrival: hhmm(best.arrival?.actualTime) || hhmm(best.arrival?.revisedTime),
    status: best.status || '',
  };
}

// ─── Comparateur « autres vols même fenêtre » (contre-preuve météo/ATC) ──────
// Beaucoup de départs normaux du même aéroport ⇒ une « circonstance extraordinaire »
// météo/ATC est peu plausible. Preuve clé, surtout quand la rotation est indisponible.
function localWindow(localStr, hBefore, hAfter) {
  if (!localStr) return null;
  const s = String(localStr).replace(' ', 'T');
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(s); // besoin de l'offset local de l'aéroport
  if (!m) return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  const offMin = (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
  const wall = ms + offMin * 60000;
  const fmt = (w) => new Date(w).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm (heure locale aéroport)
  return { from: fmt(wall - hBefore * 3600000), to: fmt(wall + hAfter * 3600000) };
}

function localHHMM(timeObj) {
  const s = timeObj && timeObj.local;
  const m = s ? /[T ](\d{2}:\d{2})/.exec(String(s)) : null;
  return m ? m[1] : (hhmm(timeObj) || '');
}

async function adbAirportFlights(iata, from, to, key, direction) {
  const dir = direction === 'Arrival' ? 'Arrival' : 'Departure';
  const url = `https://${ADB_HOST}/flights/airports/iata/${encodeURIComponent(iata)}/${from}/${to}`
    + `?direction=${dir}&withCancelled=true&withCodeshared=false&withLocation=false`;
  try {
    const r = await fetch(url, { headers: { 'x-rapidapi-host': ADB_HOST, 'x-rapidapi-key': key, Accept: 'application/json' } });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    const k = dir === 'Arrival' ? 'arrivals' : 'departures';
    return Array.isArray(j && j[k]) ? j[k] : (Array.isArray(j) ? j : []);
  } catch (_) { return []; }
}

// direction 'Departure' = vols partis du même aéroport ; 'Arrival' = vols arrivés au même aéroport.
// Documente chaque vol (n°, heure locale programmée, état) → mini-déroulant côté bureau.
async function windowComparator(iata, schedLocalStr, ourVol, key, direction) {
  if (!iata || !key) return null;
  const win = localWindow(schedLocalStr, 2, 2);
  if (!win) return null;
  const list = await adbAirportFlights(iata, win.from, win.to, key, direction);
  if (!list.length) return null;
  const our = (ourVol || '').toUpperCase();
  const isArr = direction === 'Arrival';
  const vols = [];
  let aLHeure = 0, retardes = 0, annules = 0;
  for (const f of list) {
    const num = String(f.number || f.callSign || '').replace(/\s/g, '').toUpperCase();
    if (our && num === our) continue; // exclure notre propre vol
    const seg = isArr ? f.arrival : f.departure;
    const st = String(f.status || '').toLowerCase();
    let etat;
    if (/cancel|annul/.test(st)) { annules += 1; etat = 'annulé'; }
    else {
      const dl = segDelay(seg);
      if (dl != null && dl >= 60) { retardes += 1; etat = '+' + dl + ' min'; }
      else { aLHeure += 1; etat = "à l'heure"; }
    }
    if (vols.length < 30) vols.push({ num: num || '?', h: localHHMM(seg && seg.scheduledTime), etat });
  }
  const total = aLHeure + retardes + annules;
  if (!total) return null;
  return { fenetre: `${win.from.slice(11)}–${win.to.slice(11)}`, total, aLHeure, retardes, annules, vols };
}

// ─── Météo METAR (par ICAO, NOAA) ────────────────────────────────────────────
async function fetchMetar(icaos) {
  const ids = [...new Set((icaos || []).filter((x) => /^[A-Z]{4}$/.test(x)))];
  if (!ids.length) return [];
  try {
    const r = await fetch(`https://aviationweather.gov/api/data/metar?ids=${ids.join(',')}&format=json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'RobinDesAirs-Enquete/1.0' },
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => []);
    return (Array.isArray(j) ? j : []).map((m) => ({
      id: m.icaoId || m.stationId || '?',
      raw: String(m.rawOb || m.rawText || '').slice(0, 300),
      obs: m.obsTime || m.reportTime || '',
    }));
  } catch (_) { return []; }
}

// ─── Cause probable via Claude (web_search) ──────────────────────────────────
const SYSTEM = `Tu es l'Enquêteur retard de Robin des Airs (indemnisation CE 261/2004). À partir des FAITS d'un vol retardé ou annulé, tu détermines la CAUSE PROBABLE et si elle constitue une « circonstance extraordinaire » exonérant la compagnie.

QUALIFICATION (décisif pour l'indemnisation) :
- NON extraordinaire (compagnie REDEVABLE — bon pour le passager) : problème technique courant de l'appareil, retard en cascade (avion arrivé en retard de sa rotation précédente), surbooking, manque/retard d'équipage, problème d'organisation interne.
- Extraordinaire (compagnie EXONÉRÉE) : météo dangereuse avérée, grève EXTERNE (contrôleurs aériens, aéroport), décision/restriction ATC, sûreté/sécurité, instabilité politique, catastrophe.
- LA ROTATION PRÉCÉDENTE EST DÉCISIVE : si l'avion est arrivé en retard de son vol précédent, le retard est très probablement EN CASCADE → NON extraordinaire, SAUF si la cause amont était elle-même extraordinaire (à vérifier).

MÉTHODE (utilise web_search, croise plusieurs sources, cite chaque URL) :
1. PAGE STATUT OFFICIELLE DE LA COMPAGNIE (URL fournie dans les FAITS) : cherche le motif déclaré pour CE numéro de vol à cette date (statut, nouvel horaire, raison invoquée).
2. EUROCONTROL — régulations ATFM du jour sur l'aéroport/zone (motif : météo, capacité/staffing ATC, grève contrôleurs…) : signal fort. Une décision/restriction ATC ou une grève EXTERNE de contrôleurs = extraordinaire ; une saturation/organisation interne = non.
3. NOTAM de l'aéroport (piste/espace fermé, équipement HS) + actualité grève/incident (contrôleurs, compagnie, aéroport) à la date.
4. Croise avec le METAR fourni et la rotation précédente. Si les sources se contredisent, dis-le.
5. HÔTELS (seulement si annulation ou retard avec nuitée probable) : cite 2-3 hôtels proches de l'aéroport de départ où les passagers sont susceptibles d'être logés, + l'hôtel habituel de la compagnie en cas d'irrégularité si tu le trouves (indicatif, pas l'hôtel exact).

STRATÉGIE DE RÉPONSE (anticipe la défense de la compagnie, donne le contre-argument et l'arrêt CJEU). Trois principes : (1) la CHARGE DE LA PREUVE pèse sur la compagnie ; (2) même extraordinaire, une cause n'exonère que si la compagnie prouve AUSSI avoir pris « toutes les mesures raisonnables » (art. 5§3) ; (3) le retard se mesure à l'ARRIVÉE FINALE (Sturgeon/Nelson C-402/07 & C-581/10 ; Folkerts C-11/11) — clé sur les vols avec escale.
RÉFÉRENTIEL cause → catégorie → arrêt-pivot → angle :
- Technique courant → REDEVABLE → Wallentin-Hermann C-549/07 + van der Lans C-257/14 → inhérent à l'activité (sauf défaut caché signalé par le constructeur/une autorité).
- Rotation / retard en cascade → REDEVABLE → TAP c. LE C-74/19 (a contrario) → remonter à la cause-racine ; extraordinaire seulement si la cause amont l'était ET mesures raisonnables prises.
- Météo → EXONÉRÉE en principe → Pešková C-315/15 → casser le lien de causalité (comparateur ±2 h) + mesures raisonnables ; le surplus de retard après l'épisode n'est plus imputable.
- Grève INTERNE (pilotes/PNC/sol compagnie, même légale, avec préavis) → REDEVABLE → Airhelp c. SAS C-28/20 (Grande Chambre) + Krüsemann C-195/17 → gestion normale de l'entreprise.
- Grève EXTERNE (contrôleurs/aéroport) → EXONÉRÉE en principe → attaquer l'anticipation (préavis) + la causalité.
- Restriction/décision ATC, slot → EXONÉRÉE en principe → exiger le NOTAM/EUROCONTROL officiel + causalité (Moens C-159/18).
- Manque/retard d'équipage → REDEVABLE → Krüsemann C-195/17 + Wallentin-Hermann → organisation interne (équipages de réserve).
- Surbooking / refus d'embarquement → REDEVABLE → art. 4 & 7 (droit forfaitaire automatique) ; refuser tout bon/avoir, exiger le cash.

RÉPONDS EN FRANÇAIS, BREF, EXACTEMENT dans ce format (une ligne par champ) :
CAUSE: <1-2 phrases>
EXTRAORDINAIRE: OUI | NON | INCERTAIN — <raison en 1 phrase>
DÉFENSE: <l'exonération que la compagnie va probablement invoquer>
CONTRE: <comment la casser + preuves à exiger (METAR, comparateur ±2 h, rapport technique, code retard IATA, NOTAM…)>
JURISPRUDENCE: <Arrêt, C-xxx/xx, année — principe en 1 phrase (depuis le référentiel ci-dessus)>
ROTATION: <ce que montre la rotation précédente de l'appareil pour ce retard>
AUTRES: <autres vols perturbés au même aéroport ce jour-là, sinon ->
HÔTELS: <2-3 hôtels proches de l'aéroport de départ / hôtel habituel compagnie, sinon ->
SOURCES: <url1 ; url2>`;

async function callClaude(apiKey, model, userText) {
  const body = {
    model,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: 'user', content: userText }],
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
  };
  const eff = effortFor(model);
  if (eff) body.output_config = { effort: eff };

  let res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = await res.json();
  if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);

  // Boucle outil serveur (web_search) : pause_turn → relancer avec l'historique.
  let guard = 0;
  const convo = [{ role: 'user', content: userText }];
  while (json.stop_reason === 'pause_turn' && guard < 4) {
    convo.push({ role: 'assistant', content: json.content });
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, messages: convo }),
    });
    json = await res.json();
    if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);
    guard += 1;
  }
  return (Array.isArray(json.content) ? json.content : [])
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
}

// ─── Gemini (Google Search grounding) — secours sans crédits Anthropic ────────
async function callGemini(userText) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) throw new Error('GEMINI_API_KEY absent');
  const model = (process.env.ENQUETE_GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    tools: [{ google_search: {} }], // recherche Google native (équivalent web_search)
    generationConfig: { temperature: 0.2, maxOutputTokens: 1400 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);
  const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
  return parts.filter((p) => p && typeof p.text === 'string').map((p) => p.text).join('').trim();
}

// ─── OpenAI (sans recherche web) — dernier recours, raisonne sur les FAITS ────
async function callOpenAI(userText) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) throw new Error('OPENAI_API_KEY absent');
  const model = (process.env.ENQUETE_OPENAI_MODEL || 'gpt-4o-mini').trim();
  const sys = SYSTEM + "\n\n(IMPORTANT : tu n'as PAS d'accès web ici. Raisonne uniquement sur les FAITS fournis — rotation précédente, METAR, comparateur « même fenêtre ». Si une vérification web serait nécessaire pour trancher, mets EXTRAORDINAIRE: INCERTAIN et laisse SOURCES vide.)";
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: userText }],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json && json.error && json.error.message) || `HTTP ${res.status}`);
  return ((json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '').trim();
}

/**
 * Cause IA avec bascule automatique de fournisseur (résilience multi-LLM).
 * Ordre configurable via ENQUETE_LLM_ORDER (défaut : anthropic,gemini,openai —
 * Anthropic d'abord = qualité Opus + clé rechargée ; bascule auto si épuisé).
 * État des clés (juin 2026) : Anthropic = recharger ; Gemini = activer facturation
 * Google (free tier=0 en UE) ; OpenAI = clé à régénérer (401). Mettre en tête le
 * fournisseur réellement approvisionné évite un appel raté inutile.
 * @returns {{ text, provider, model }}
 */
async function callEnqueteLLM(userText, event) {
  const order = (process.env.ENQUETE_LLM_ORDER || 'anthropic,gemini,openai')
    .split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const errs = [];
  for (const p of order) {
    try {
      if (p === 'anthropic') {
        const k = (process.env.ANTHROPIC_API_KEY || '').trim();
        if (!k) { errs.push('anthropic: clé absente'); continue; }
        // Sélection modèle avec budget mensuel : premium tant qu'il reste du quota, sinon fallback.
        const primary = enqueteModel();
        const fb = fallbackModel();
        const budget = premiumBudget();
        let model = primary, slot = null;
        if (budget && primary !== fb) {
          const used = await budgetCount(event);
          // Compteur illisible OU quota épuisé → repli SÛR sur le fallback (jamais de premium non plafonné).
          if (used == null || used >= budget) model = fb;
          else slot = used;                              // quota dispo → premium, on incrémente après succès
        }
        const text = await callClaude(k, model, userText);
        if (slot != null) await budgetIncr(event, slot); // incrément après succès seulement
        return { text, provider: 'anthropic', model };
      }
      if (p === 'gemini') {
        return { text: await callGemini(userText), provider: 'gemini', model: (process.env.ENQUETE_GEMINI_MODEL || 'gemini-2.0-flash').trim() };
      }
      if (p === 'openai') {
        return { text: await callOpenAI(userText), provider: 'openai', model: (process.env.ENQUETE_OPENAI_MODEL || 'gpt-4o-mini').trim() };
      }
    } catch (e) {
      errs.push(`${p}: ${e.message}`);
    }
  }
  throw new Error('aucun fournisseur IA dispo — ' + (errs.join(' | ') || 'aucune clé'));
}

function field(text, label) {
  const m = new RegExp(`^${label}:\\s*(.+)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function parseReply(text) {
  const extraLine = field(text, 'EXTRAORDINAIRE');
  let extra = 'INCERTAIN';
  if (/^\s*non/i.test(extraLine)) extra = 'NON';
  else if (/^\s*oui/i.test(extraLine)) extra = 'OUI';
  const sources = (field(text, 'SOURCES') || '')
    .split(/[;\n]/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)).slice(0, 5);
  return {
    cause: field(text, 'CAUSE') || (text || '').slice(0, 300),
    extraordinaire: extra,
    extraordinaireRaison: extraLine.replace(/^(oui|non|incertain)\s*[—-]?\s*/i, '').trim(),
    defenseProbable: field(text, 'DÉFENSE') || field(text, 'DEFENSE'),
    contreArgument: field(text, 'CONTRE'),
    jurisprudence: field(text, 'JURISPRUDENCE'),
    rotationAnalyse: field(text, 'ROTATION'),
    autres: field(text, 'AUTRES'),
    hotelsProbables: field(text, 'HÔTELS') || field(text, 'HOTELS'),
    sources,
    rawText: text || '',
  };
}

/**
 * Lance (ou retourne en cache) l'enquête d'un vol.
 * @returns enquête { vol, date, route, statut, retardMin, meteo[], rotation, cause, extraordinaire, ... }
 */
async function runEnquete(event, input, opts = {}) {
  const vol = String(input.vol || '').toUpperCase().replace(/\s/g, '');
  const date = /^\d{4}-\d{2}-\d{2}/.test(String(input.date)) ? String(input.date).slice(0, 10) : parisYmd();
  if (!vol) return { ok: false, error: 'vol requis' };

  if (!opts.force) {
    const cached = await loadCache(event, vol, date);
    if (cached && cached.analyzedAt && Date.now() - Date.parse(cached.analyzedAt) < FRESH_MS) {
      return { ...cached, cached: true };
    }
  }

  const key = rapidApiKey();
  const airline = (input.airline || vol.slice(0, 2)).toUpperCase();
  const trackerOfficiel = getTracker(airline, vol);
  const sources = [];
  const errors = [];

  // 1) Faits vol (ICAO, immat, retard, horaires)
  let dep = (input.dep || '').toUpperCase();
  let arr = (input.arr || '').toUpperCase();
  let depIcao = '', arrIcao = '', reg = '', statut = input.cancelled ? 'Annulé' : '';
  let retardMin = input.delayMin != null ? input.delayMin : null;
  let schedDepMs = null, schedDepLocal = '', schedArrLocal = '', aircraftModel = '';
  if (key) {
    const rows = await adbFetch(`/flights/number/${encodeURIComponent(vol)}/${date}/${date}`, key);
    const row = pickRow(rows, dep, arr);
    if (row) {
      sources.push('aerodatabox');
      dep = dep || (row.departure?.airport?.iata || '').toUpperCase();
      arr = arr || (row.arrival?.airport?.iata || '').toUpperCase();
      depIcao = (row.departure?.airport?.icao || '').toUpperCase();
      arrIcao = (row.arrival?.airport?.icao || '').toUpperCase();
      reg = row.aircraft?.reg || row.aircraft?.registration || '';
      aircraftModel = row.aircraft?.model || '';
      statut = row.status || statut;
      schedDepMs = tms(row.departure?.scheduledTime);
      schedDepLocal = row.departure?.scheduledTime?.local || '';
      schedArrLocal = row.arrival?.scheduledTime?.local || '';
      const d = segDelay(row.arrival);
      if (d != null) retardMin = d;
    } else {
      errors.push('vol introuvable AeroDataBox');
    }
  } else {
    errors.push('RAPIDAPI_KEY absent — vol/rotation/ICAO indisponibles');
  }

  // 2) Météo METAR (ICAO)
  const meteo = await fetchMetar([depIcao, arrIcao]);
  if (meteo.length) sources.push('aviationweather-metar');

  // 3) Rotation précédente de l'appareil
  let rotation = null;
  if (reg) {
    rotation = await previousRotation(reg, date, dep, schedDepMs, key);
    if (rotation) sources.push('aerodatabox-rotation');
  }

  // 3b) Comparateur « autres vols même fenêtre » — contre-preuve météo/ATC « extraordinaire »
  //     Départs du même aéroport (origine) ET arrivées au même aéroport (destination).
  let volsMemeFenetre = null, volsMemeFenetreArr = null;
  if (dep && schedDepLocal && key) {
    volsMemeFenetre = await windowComparator(dep, schedDepLocal, vol, key, 'Departure');
    if (volsMemeFenetre) sources.push('aerodatabox-departures');
  }
  if (arr && schedArrLocal && key) {
    volsMemeFenetreArr = await windowComparator(arr, schedArrLocal, vol, key, 'Arrival');
    if (volsMemeFenetreArr) sources.push('aerodatabox-arrivals');
  }

  // 4) Cause IA — bascule auto Gemini/Anthropic/OpenAI (ENQUETE_LLM_ORDER)
  const hasLLM = !!((process.env.GEMINI_API_KEY || '').trim() || (process.env.ANTHROPIC_API_KEY || '').trim() || (process.env.OPENAI_API_KEY || '').trim());
  let analysis = null;
  let llmProvider = null, llmModel = null;
  if (hasLLM) {
    const facts = [
      `Vol ${vol} du ${date}`,
      dep && arr ? `Route ${dep} → ${arr}` : null,
      `Compagnie : ${airline}${trackerOfficiel ? ` — page statut officielle à consulter en priorité : ${trackerOfficiel}` : ''}`,
      input.cancelled ? 'Statut : ANNULÉ' : (retardMin != null ? `Retard à l'arrivée : ${retardMin} min` : 'Retard détecté'),
      statut ? `Statut API : ${statut}` : null,
      reg ? `Appareil : ${reg}${aircraftModel ? ' (' + aircraftModel + ')' : ''}` : null,
      rotation
        ? `Rotation précédente : ${rotation.flight || 'vol amont'} ${rotation.from}→${rotation.to}, retard arrivée ${rotation.arrivalDelayMin != null ? rotation.arrivalDelayMin + ' min' : 'inconnu'} (l'appareil ${rotation.arrivalDelayMin > 30 ? 'EST arrivé en retard' : 'est arrivé à l\'heure'} avant ce vol)`
        : "Rotation précédente : non disponible",
      volsMemeFenetre
        ? `Autres DÉPARTS de ${dep} (fenêtre ±2 h, ${volsMemeFenetre.fenetre}) : ${volsMemeFenetre.total} vols — ${volsMemeFenetre.aLHeure} ~à l'heure, ${volsMemeFenetre.retardes} retardés, ${volsMemeFenetre.annules} annulés.`
        : 'Autres départs même fenêtre : non disponible',
      volsMemeFenetreArr
        ? `Autres ARRIVÉES à ${arr} (fenêtre ±2 h, ${volsMemeFenetreArr.fenetre}) : ${volsMemeFenetreArr.total} vols — ${volsMemeFenetreArr.aLHeure} ~à l'heure, ${volsMemeFenetreArr.retardes} retardés, ${volsMemeFenetreArr.annules} annulés.`
        : null,
      "Si beaucoup d'autres vols sont partis/arrivés normalement dans la même fenêtre, une cause météo/ATC « extraordinaire » est peu plausible ou n'explique pas tout le retard.",
      meteo.length
        ? `METAR : ${meteo.map((m) => `${m.id} ${m.raw}`).join(' || ')}`
        : 'METAR : non disponible',
    ].filter(Boolean).join('\n');

    try {
      const out = await callEnqueteLLM(facts, event);
      analysis = parseReply(out.text);
      llmProvider = out.provider;
      llmModel = out.model;
      sources.push(out.provider === 'gemini' ? 'gemini-google_search'
        : out.provider === 'anthropic' ? 'claude-web_search'
        : 'openai');
    } catch (e) {
      errors.push('cause IA : ' + e.message);
    }
  } else {
    errors.push('aucune clé IA (GEMINI/ANTHROPIC/OPENAI) — cause non recherchée');
  }

  // Art. 9 CE 261 — prise en charge due (déterministe, gratuit) : repas dès 2h, hébergement
  // si annulation ou retard impliquant une nuitée. Non fourni → remboursement EN PLUS des 600 €.
  const art9 = {
    repasDu: !!input.cancelled || (retardMin != null && retardMin >= 120),
    hotelDu: !!input.cancelled || (retardMin != null && retardMin >= 300),
    note: '',
  };
  art9.note = art9.hotelDu
    ? 'Hébergement + repas + transferts dus par la compagnie (Art. 9 CE 261) si une nuitée est nécessaire. Si non fourni → remboursement EN PLUS des 600 €.'
    : (art9.repasDu ? 'Repas/rafraîchissements dus par la compagnie (Art. 9 CE 261) ; remboursement des frais avancés.' : '');

  const result = {
    ok: true,
    vol,
    date,
    airline,
    trackerOfficiel,
    route: dep && arr ? `${dep} → ${arr}` : (input.route || ''),
    dep, arr,
    statut,
    retardMin,
    cancelled: !!input.cancelled,
    reg,
    aircraftModel,
    meteo,
    rotation,
    volsMemeFenetre,
    volsMemeFenetreArr,
    art9,
    cause: analysis ? analysis.cause : '',
    extraordinaire: analysis ? analysis.extraordinaire : null,
    extraordinaireRaison: analysis ? analysis.extraordinaireRaison : '',
    defenseProbable: analysis ? analysis.defenseProbable : '',
    contreArgument: analysis ? analysis.contreArgument : '',
    jurisprudence: analysis ? analysis.jurisprudence : '',
    rotationAnalyse: analysis ? analysis.rotationAnalyse : '',
    autres: analysis ? analysis.autres : '',
    hotelsProbables: analysis ? analysis.hotelsProbables : '',
    sources: analysis ? analysis.sources : [],
    apiSources: [...new Set(sources)],
    errors,
    analyzedAt: new Date().toISOString(),
    provider: llmProvider,
    model: llmModel,
  };

  await saveCache(event, vol, date, result);
  return result;
}

module.exports = { runEnquete, loadCache, callEnqueteLLM };
