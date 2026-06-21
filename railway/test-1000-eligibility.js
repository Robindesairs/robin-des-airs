/**
 * 1000 tests d'éligibilité CE261 — villes & situations variées (transporteur effectif, sens, code-share,
 * correspondance, aller-retour, compagnie débitrice). Utilise les VRAIES fonctions de server.js + normalize.
 * Pour CHAQUE cas on calcule la vérité-terrain INDÉPENDAMMENT, puis on compare à ce que le code produit.
 *
 *   node test-1000-eligibility.js
 */
'use strict';
process.env.PORT = process.env.PORT || '4555'; // le require boote le serveur ; on process.exit à la fin
const { normalize } = require('./lib/extract-eticket');
const srv = require('./server');
const { isCarrierUE, isEUAirport, carrierCode, markOperateurEffectif, setEticketFields, applyTrajet, AIRLINES } = srv;

// PRNG déterministe (un échec est rejouable)
let _seed = 20260621;
const rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// Pools : aéroports EUROPÉENS (∈ EU_AIRPORTS) vs AFRICAINS (∉). Carriers UE vs non-UE.
const EU = ['CDG', 'ORY', 'BRU', 'AMS', 'FRA', 'MAD', 'LIS', 'FCO', 'MUC', 'VIE', 'MRS', 'LYS', 'BCN', 'OPO'];
const AFR = ['DKR', 'DSS', 'ABJ', 'ACC', 'LOS', 'BKO', 'OUA', 'COO', 'LFW', 'NIM', 'CKY', 'BJL', 'DLA', 'NSI', 'NBO', 'ADD', 'LBV', 'FIH', 'BZV', 'CMN', 'ABV'];
const C_UE = ['AF', 'KL', 'SN', 'LH', 'IB', 'TP', 'U2', 'FR', 'TO', 'LX', 'OS', 'VY', 'AY', 'SK'];
const C_NONUE = ['KQ', 'HC', 'ET', 'AT', 'KP', 'TK', 'EK', 'MS', 'SA', 'WB', 'ME', 'SV', 'QC'];
const ALLC = C_UE.concat(C_NONUE);

// Sanity : nos pools doivent matcher la classification du code.
for (const a of EU) if (!isEUAirport(a)) throw new Error('Pool EU faux : ' + a + ' non reconnu européen');
for (const a of AFR) if (isEUAirport(a)) throw new Error('Pool AFR faux : ' + a + ' reconnu européen');
for (const c of C_UE) if (!isCarrierUE(c)) throw new Error('Pool C_UE faux : ' + c);
for (const c of C_NONUE) if (isCarrierUE(c)) throw new Error('Pool C_NONUE faux : ' + c);

const volNum = (code) => `${code}${ri(100, 9999)}`;
const dmy = () => `${String(ri(1, 28)).padStart(2, '0')}/${String(ri(1, 12)).padStart(2, '0')}/202${ri(4, 6)}`;
const PAX = [{ nom: 'DIALLO', prenom: 'Aminata', type: 'adulte' }];

// effective carrier ATTENDU d'un trajet (vérité-terrain) = opérateur code-share du DERNIER tronçon sinon préfixe du dernier vol
function expEffective(segs) {
  const last = segs[segs.length - 1];
  return (last.operateur || carrierCode(last.vol) || '').toUpperCase();
}
// europeTouch ATTENDU d'un trajet = part d'Europe / arrive en Europe (selon dep/arr du trajet)
function expTouch(dep, arr) {
  if (isEUAirport(arr) && !isEUAirport(dep)) return 'arrivee';
  if (isEUAirport(dep) && !isEUAirport(arr)) return 'depart';
  return null; // intra-zone : on ne génère pas ce cas ici
}

// Construit un trajet (1 ou 2 tronçons) entre A et B, éventuellement code-share sur le dernier tronçon.
function buildTrajet(sens, A, B, opts = {}) {
  const codeMkt = opts.marketing || pick(ALLC);
  const date = opts.date || dmy();
  let segs;
  if (opts.escale) {
    // A → hub → B : le hub est du côté du DÉPART (même continent que A) pour rester réaliste
    const hub = isEUAirport(A) ? pick(EU.filter((x) => x !== A && x !== B)) : pick(AFR.filter((x) => x !== A && x !== B));
    segs = [
      { vol: volNum(pick(ALLC)), depart: A, arrivee: hub, date },
      { vol: volNum(codeMkt), depart: hub, arrivee: B, date },
    ];
  } else {
    segs = [{ vol: volNum(codeMkt), depart: A, arrivee: B, date }];
  }
  if (opts.operateur) segs[segs.length - 1].operateur = opts.operateur; // code-share sur le tronçon qui compte
  return { sens, date, depart: A, arrivee: B, segments: segs };
}

// ── Générateurs de scénarios (renvoient { ocr, applyLeg, truth }) ──────────────
function genOneWay() {
  const arrEurope = rnd() < 0.5;
  const A = arrEurope ? pick(AFR) : pick(EU);
  const B = arrEurope ? pick(EU) : pick(AFR);
  const escale = rnd() < 0.45;
  const codeshare = rnd() < 0.4;
  const opts = { escale };
  if (codeshare) { opts.marketing = pick(ALLC); opts.operateur = pick(ALLC); }
  const t = buildTrajet('aller', A, B, opts);
  const touch = expTouch(A, B);
  const eff = expEffective(t.segments);
  return {
    label: `OneWay ${escale ? 'escale ' : ''}${codeshare ? 'CS ' : ''}${A}→${B}`,
    ocr: { lisible: true, confidence: 1, compagnie: AIRLINES[carrierCode(t.segments[0].vol)] || '', pnr: 'P' + ri(10000, 99999), trajets: [t], passagers: PAX },
    setTouch: touch,
    applyLeg: null,
    truth: { touch, eff, flagged: touch === 'arrivee' && !isCarrierUE(eff) },
  };
}
function genRoundTrip() {
  const afrFirst = rnd() < 0.5; // le 1er vol part-il d'Afrique ?
  const A = afrFirst ? pick(AFR) : pick(EU);
  const B = afrFirst ? pick(EU) : pick(AFR);
  const escale = rnd() < 0.35;
  const csRetour = rnd() < 0.4;
  const aller = buildTrajet('aller', A, B, { escale });
  const rOpts = { escale };
  if (csRetour) { rOpts.marketing = pick(ALLC); rOpts.operateur = pick(ALLC); }
  const retour = buildTrajet('retour', B, A, rOpts);
  const legChoisie = rnd() < 0.5 ? 0 : 1;
  const t = legChoisie === 0 ? aller : retour;
  const touch = expTouch(t.depart, t.arrivee);
  const eff = expEffective(t.segments);
  return {
    label: `RoundTrip ${afrFirst ? 'AFRfirst ' : ''}${escale ? 'escale ' : ''}${csRetour ? 'CSretour ' : ''}choix=${legChoisie === 0 ? 'aller' : 'retour'} (${t.depart}→${t.arrivee})`,
    ocr: { lisible: true, confidence: 1, compagnie: AIRLINES[carrierCode(aller.segments[0].vol)] || '', pnr: 'P' + ri(10000, 99999), aller_retour: true, trajets: [aller, retour], passagers: PAX },
    setTouch: null,
    applyLeg: legChoisie,
    truth: { touch, eff, flagged: touch === 'arrivee' && !isCarrierUE(eff) },
  };
}

// ── Exécution ──────────────────────────────────────────────────────────────────
const N = 1000;
let pass = 0; const fails = []; const byType = {};
for (let i = 0; i < N; i++) {
  const g = rnd() < 0.5 ? genOneWay() : genRoundTrip();
  const type = g.label.split(' ')[0] + (g.label.includes('CS') ? '+CS' : '') + (g.label.includes('escale') ? '+esc' : '');
  byType[type] = byType[type] || { n: 0, ok: 0 };
  byType[type].n++;
  const e = normalize(g.ocr);
  const s = {};
  if (g.setTouch) s.europeTouch = g.setTouch;
  setEticketFields(s, e);
  if (g.applyLeg !== null) { s.trajets = e.trajets; applyTrajet(s, e.trajets[g.applyLeg]); }
  // Assertions vs vérité-terrain
  const okTouch = s.europeTouch === g.truth.touch;
  const okEff = (s.operateur_code || '') === g.truth.eff;
  const okFlag = !!s.operateurNonUe === g.truth.flagged;
  const okClaim = g.truth.flagged ? true : !!s.compagnie_reclamation; // couvert → un destinataire doit être posé
  if (okTouch && okEff && okFlag && okClaim) { pass++; byType[type].ok++; }
  else if (fails.length < 12) fails.push({ label: g.label, want: g.truth, got: { touch: s.europeTouch, eff: s.operateur_code, flag: !!s.operateurNonUe, claim: s.compagnie_reclamation }, okTouch, okEff, okFlag, okClaim });
}

console.log(`\n═══ 1000 TESTS D'ÉLIGIBILITÉ (villes & situations) ═══\n`);
console.log('Répartition par type (ok/total) :');
for (const [k, v] of Object.entries(byType).sort()) console.log(`  ${String(k).padEnd(22)} ${v.ok}/${v.n}`);
if (fails.length) {
  console.log(`\n❌ ÉCHANTILLON D'ÉCHECS (${fails.length}) :`);
  for (const f of fails) console.log('  •', f.label, '\n     want', JSON.stringify(f.want), '\n     got ', JSON.stringify(f.got), '| okTouch', f.okTouch, 'okEff', f.okEff, 'okFlag', f.okFlag, 'okClaim', f.okClaim);
}
console.log(`\n${pass === N ? '✅' : '❌'} ${pass}/${N} PASSÉS${pass === N ? ' — toutes situations correctes' : ''}\n`);
process.exit(pass === N ? 0 : 1);
