/**
 * 100 scénarios d'extraction (couche normalize() — post-OCR, sans clé API).
 * Couvre : solo, couple, familles, enfants/bébés, correspondances, escale de nuit,
 * aller-retour, multi-PNR, réf agence vs PNR, n° de billet, dédup, cartes multiples,
 * billets illisibles. Chaque scénario : on FABRIQUE l'entrée + la vérité-terrain, puis
 * on compare ce que normalize() produit réellement.   →   node test-scenarios-100.js
 */
'use strict';
const { normalize } = require('./lib/extract-eticket');

// PRNG déterministe (reproductible : un échec est rejouable à l'identique)
let _seed = 987654321;
const rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const AIRLINES = [['AF', 'Air France'], ['SN', 'Brussels Airlines'], ['AT', 'Royal Air Maroc'], ['TK', 'Turkish Airlines'], ['KL', 'KLM'], ['LH', 'Lufthansa'], ['SS', 'Corsair'], ['ET', 'Ethiopian Airlines'], ['HC', 'Air Senegal']];
const AIRPORTS = ['CDG', 'ORY', 'MRS', 'LYS', 'BRU', 'AMS', 'FRA', 'IST', 'CMN', 'LIS', 'DSS', 'ABJ', 'BKO', 'NSI', 'COO', 'LFW', 'OUA', 'CKY'];
const HUBS = ['CDG', 'BRU', 'IST', 'CMN', 'AMS', 'FRA', 'LIS'];
const SURN = ['DIALLO', 'KODJO', 'TRAORE', 'NDIAYE', 'KEITA', 'TOURE', 'CISSE', 'BAH', 'SOW', 'CAMARA', 'KONE', 'OUATTARA', 'MENSAH', 'OKAFOR', 'DRAME'];
const FIRST = ['Aminata', 'Ousmane', 'Fatou', 'Mariam', 'Ibrahima', 'Awa', 'Moussa', 'Aissatou', 'Cheikh', 'Mamadou', 'Khadija', 'Sekou', 'Bineta', 'Lamine', 'Rokhaya', 'Daouda', 'Adama', 'Nafi'];
const CHILD = ['Enfant', 'Child', 'CHD', 'CNN'];
const INFANT = ['Bébé', 'Bebe', 'Infant', 'INF', 'Nourrisson'];
const ADULT = ['Adulte', 'Adult', 'ADT', ''];

const vol = (code) => `${code}${ri(100, 999)}`;
const dmy = () => `${String(ri(1, 28)).padStart(2, '0')}/${String(ri(1, 12)).padStart(2, '0')}/202${ri(4, 6)}`;
const pnrGood = () => { let s = ''; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', AN = A + '0123456789'; s += pick(A.split('')); for (let i = 0; i < 5; i++) s += pick(AN.split('')); return s; };
function members(n, withKids) {
  // n passagers d'une même famille : prénoms distincts, kids = combien d'enfants/bébés
  const sur = pick(SURN); const used = new Set(); const out = [];
  for (let i = 0; i < n; i++) { let f; do { f = pick(FIRST); } while (used.has(f)); used.add(f); out.push({ sur, first: f }); }
  const kids = withKids || 0;
  return out.map((m, i) => {
    const isKid = i >= n - kids;
    const type = isKid ? (rnd() < 0.5 ? pick(CHILD) : pick(INFANT)) : pick(ADULT);
    return { nom: m.sur, prenom: m.first, date_naissance: '', type, _minor: isKid };
  });
}
const seg = (code, dep, arr, date) => ({ vol: vol(code), depart: dep, arrivee: arr, date });
const routeOf = (segs) => { const ap = []; segs.forEach((s, i) => { if (i === 0) ap.push(s.depart); ap.push(s.arrivee); }); return ap.join(' → '); };
const volOf = (segs) => segs.length > 1 ? segs.map((s) => s.vol).join(' + ') : segs[0].vol;

// ── Constructeurs de scénarios : renvoient { label, raw, expect } ──────────────
function direct(label, nPax, kids) {
  const [code, name] = pick(AIRLINES); const dep = pick(AIRPORTS); let arr; do { arr = pick(AIRPORTS); } while (arr === dep);
  const d = dmy(); const s = [seg(code, dep, arr, d)]; const pax = members(nPax, kids); const pnr = pnrGood();
  return { label, raw: { lisible: true, confidence: 1, compagnie: name, pnr, trajets: [{ sens: 'aller', date: d, depart: dep, arrivee: arr, segments: s }], passagers: pax },
    expect: { pax: nPax, minors: pax.filter((p) => p._minor).length, escale: false, allerRetour: false, route: routeOf(s), vol: volOf(s), pnr, refType: 'pnr', multiPNR: false, lisible: true } };
}
function escale(label, stops, nPax, kids, night) {
  const [code, name] = pick(AIRLINES); const dep = pick(AIRPORTS); let arr; do { arr = pick(AIRPORTS); } while (arr === dep);
  const vias = []; for (let i = 0; i < stops; i++) { let v; do { v = pick(HUBS); } while (v === dep || v === arr || vias.includes(v)); vias.push(v); }
  const pts = [dep, ...vias, arr]; const d = dmy(); const segs = [];
  for (let i = 0; i < pts.length - 1; i++) { const sd = (night && i === pts.length - 2) ? nextDay(d) : d; segs.push(seg(code, pts[i], pts[i + 1], sd)); }
  const pax = members(nPax, kids); const pnr = pnrGood();
  return { label, raw: { lisible: true, confidence: 1, compagnie: name, pnr, trajets: [{ sens: 'aller', date: d, depart: dep, arrivee: arr, segments: segs }], passagers: pax },
    expect: { pax: nPax, minors: pax.filter((p) => p._minor).length, escale: true, allerRetour: false, route: routeOf(segs), vol: volOf(segs), pnr, refType: 'pnr', multiPNR: false, lisible: true } };
}
function nextDay(d) { const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); const dt = new Date(+m[3], +m[2] - 1, +m[1] + 1); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; }
function plusDays(d, n) { const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); const dt = new Date(+m[3], +m[2] - 1, +m[1] + n); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; }
function allerRetour(label, withEscale, nPax) {
  const [code, name] = pick(AIRLINES); const A = pick(AIRPORTS); let B; do { B = pick(AIRPORTS); } while (B === A);
  const d1 = dmy(); const d2 = plusDays(d1, ri(7, 21));
  const sA = [seg(code, A, B, d1)], sR = [seg(code, B, A, d2)]; const pax = members(nPax, 0); const pnr = pnrGood();
  return { label, raw: { lisible: true, confidence: 1, compagnie: name, pnr, aller_retour: true,
      trajets: [{ sens: 'aller', date: d1, depart: A, arrivee: B, segments: sA }, { sens: 'retour', date: d2, depart: B, arrivee: A, segments: sR }], passagers: pax },
    expect: { pax: nPax, minors: 0, escale: false, allerRetour: true, route: routeOf(sA), vol: volOf(sA), pnr, refType: 'pnr', multiPNR: false, lisible: true } };
}

const BUILDERS = [
  () => direct('Solo adulte', 1, 0),
  () => direct('Couple', 2, 0),
  () => direct('Petite famille (2 ad + 1 enfant)', 3, 1),
  () => direct('Petite famille (2 ad + 2 enfants)', 4, 2),
  () => direct('Grosse famille (2 ad + 4 enfants)', 6, 4),
  () => direct('Très grosse famille (2 ad + 6 enfants)', 8, 6),
  () => direct('Bébé seul avec parent', 2, 1),
  () => escale('Correspondance 1 escale (couple)', 1, 2, 0, false),
  () => escale('Correspondance 1 escale (famille+enfants)', 1, 4, 2, false),
  () => escale('Correspondance 2 escales', 2, 3, 1, false),
  () => escale('Escale de NUIT (J+1) = 1 trajet', 1, 2, 0, true),
  () => allerRetour('Aller-retour direct', false, 2),
  () => allerRetour('Aller-retour (famille)', false, 4),
  // E-billet groupe (plusieurs pax, 1 vol)
  () => direct('E-billet groupe (5 pax)', 5, 1),
  // Cartes d'embarquement multiples fusionnées (N pax distincts, 1 vol)
  () => { const s = direct('Cartes embarquement multiples (4)', 4, 0); s.raw.compagnie = s.raw.compagnie; return s; },
  // Multi-PNR : deux réservations distinctes signalées
  () => { const s = direct('Multi-PNR (2 réservations)', 2, 0); s.raw.multi_pnr = true; s.expect.multiPNR = true; return s; },
  // Réf agence PUREMENT NUMÉRIQUE → doit être rejetée comme PNR
  () => { const s = direct('Réf agence numérique (rejetée)', 2, 0); s.raw.pnr = String(ri(1000000, 9999999)); s.expect.pnr = ''; s.expect.refType = ''; return s; },
  // Pas de PNR mais n° de billet 13 chiffres → refType billet
  () => { const s = direct('N° de billet en secours (pas de PNR)', 1, 0); delete s.raw.pnr; const b = '057' + String(ri(1000000000, 9999999999)); s.raw.numero_billet = b; s.expect.pnr = b; s.expect.refType = 'billet'; return s; },
  // Dédup : même passager listé 2 fois (2 pages photographiées)
  () => { const s = direct('Dédup passager (2 pages)', 3, 0); const dupe = s.raw.passagers[0]; s.raw.passagers.push({ ...dupe }); return s; /* expect.pax reste 3 */ },
  // Billet ILLISIBLE (flou) → lisible:false propagé
  () => { const s = direct('Billet illisible (flou)', 2, 0); s.raw.lisible = false; s.raw.confidence = 0.25; s.expect.lisible = false; return s; },
  // Enfant avec DATE DE NAISSANCE imprimée (type vide) — normalize ne pose PAS minor (c'est server.js via DDN) : on vérifie la DDN captée
  () => { const s = direct('Enfant avec DDN imprimée (type vide)', 3, 0); const kid = s.raw.passagers[2]; kid.type = ''; kid.date_naissance = '12/05/2019'; s.expect.minors = 0; s.expect.dobOf = { name: kid.prenom, dob: '12/05/2019' }; return s; },
  // Aller-retour dont l'ALLER a une escale (vérifie escale=true ET allerRetour=true)
  () => { const [code, name] = pick(AIRLINES); const A = pick(AIRPORTS); let B; do { B = pick(AIRPORTS); } while (B === A); let V; do { V = pick(HUBS); } while (V === A || V === B); const d1 = dmy(); const d2 = plusDays(d1, ri(7, 20)); const sA = [seg(code, A, V, d1), seg(code, V, B, d1)]; const sR = [seg(code, B, A, d2)]; const pax = members(ri(1, 4), 0); const pnr = pnrGood(); return { label: 'Aller-retour AVEC escale à l\'aller', raw: { lisible: true, confidence: 1, compagnie: name, pnr, aller_retour: true, trajets: [{ sens: 'aller', date: d1, depart: A, arrivee: B, segments: sA }, { sens: 'retour', date: d2, depart: B, arrivee: A, segments: sR }], passagers: pax }, expect: { pax: pax.length, minors: 0, escale: true, allerRetour: true, route: routeOf(sA), vol: volOf(sA), pnr, refType: 'pnr', multiPNR: false, lisible: true } }; },
  // Escale de NUIT via segments À PLAT (pas de trajets[]) → groupFlatSegments doit garder 1 SEUL trajet
  () => { const [code, name] = pick(AIRLINES); const A = pick(AIRPORTS); let B; do { B = pick(AIRPORTS); } while (B === A); let V; do { V = pick(HUBS); } while (V === A || V === B); const d1 = dmy(); const flat = [seg(code, A, V, d1), seg(code, V, B, nextDay(d1))]; const pax = members(2, 0); const pnr = pnrGood(); return { label: 'Escale de nuit (segments à plat) = 1 trajet', raw: { lisible: true, confidence: 1, compagnie: name, pnr, segments: flat, passagers: pax }, expect: { pax: 2, minors: 0, escale: true, allerRetour: false, route: routeOf(flat), vol: volOf(flat), pnr, refType: 'pnr', multiPNR: false, lisible: true } }; },
  // Aller-retour via segments À PLAT (≥2 jours d'écart) → groupFlatSegments doit SÉPARER en 2 trajets
  () => { const [code, name] = pick(AIRLINES); const A = pick(AIRPORTS); let B; do { B = pick(AIRPORTS); } while (B === A); const d1 = dmy(); const d2 = plusDays(d1, ri(5, 18)); const sA = [seg(code, A, B, d1)]; const flat = [sA[0], seg(code, B, A, d2)]; const pax = members(ri(1, 3), 0); const pnr = pnrGood(); return { label: 'Aller-retour (segments à plat)', raw: { lisible: true, confidence: 1, compagnie: name, pnr, segments: flat, passagers: pax }, expect: { pax: pax.length, minors: 0, escale: false, allerRetour: true, route: routeOf(sA), vol: volOf(sA), pnr, refType: 'pnr', multiPNR: false, lisible: true } }; },
  // Nom collé « NOM / Prénom » dans le champ nom (prenom vide) → doit être parsé en « PRENOM NOM »
  () => { const [code, name] = pick(AIRLINES); const dep = pick(AIRPORTS); let arr; do { arr = pick(AIRPORTS); } while (arr === dep); const d = dmy(); const s = [seg(code, dep, arr, d)]; const sur = pick(SURN); const f = pick(FIRST); const pnr = pnrGood(); return { label: 'Nom collé "NOM / Prénom"', raw: { lisible: true, confidence: 1, compagnie: name, pnr, trajets: [{ sens: 'aller', date: d, depart: dep, arrivee: arr, segments: s }], passagers: [{ nom: `${sur} / ${f}`, prenom: '', date_naissance: '', type: 'Adulte' }] }, expect: { pax: 1, minors: 0, escale: false, allerRetour: false, route: routeOf(s), vol: volOf(s), pnr, refType: 'pnr', multiPNR: false, lisible: true, hasName: `${f.toUpperCase()} ${sur}` } }; },
];

// ── Exécution ──────────────────────────────────────────────────────────────────
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let pass = 0, fail = 0; const fails = []; const byCat = {};
for (let i = 0; i < 100; i++) {
  const sc = BUILDERS[i % BUILDERS.length]();
  const r = normalize(sc.raw); const e = sc.expect; const errs = [];
  if (r.pax !== e.pax) errs.push(`pax ${r.pax}≠${e.pax}`);
  if (r.passengers.filter((p) => p.minor).length !== e.minors) errs.push(`mineurs ${r.passengers.filter((p) => p.minor).length}≠${e.minors}`);
  if (r.escale !== e.escale) errs.push(`escale ${r.escale}≠${e.escale}`);
  if (r.allerRetour !== e.allerRetour) errs.push(`AR ${r.allerRetour}≠${e.allerRetour}`);
  if (r.route !== e.route) errs.push(`route "${r.route}"≠"${e.route}"`);
  if (r.vol !== e.vol) errs.push(`vol "${r.vol}"≠"${e.vol}"`);
  if (e.pnr !== undefined && r.pnr !== e.pnr) errs.push(`pnr "${r.pnr}"≠"${e.pnr}"`);
  if (e.refType !== undefined && r.refType !== e.refType) errs.push(`refType "${r.refType}"≠"${e.refType}"`);
  if (e.multiPNR !== undefined && r.multiPNR !== e.multiPNR) errs.push(`multiPNR ${r.multiPNR}≠${e.multiPNR}`);
  if (e.lisible !== undefined && r.lisible !== e.lisible) errs.push(`lisible ${r.lisible}≠${e.lisible}`);
  if (e.dobOf) { const p = r.passengers.find((x) => new RegExp(e.dobOf.name, 'i').test(x.name)); if (!p || p.dob !== e.dobOf.dob) errs.push(`dob "${p && p.dob}"≠"${e.dobOf.dob}"`); }
  if (e.hasName && !r.passengers.some((p) => p.name === e.hasName)) errs.push(`nom "${e.hasName}" absent (obtenu: ${r.passengers.map((p) => p.name).join(', ')})`);
  const cat = sc.label.replace(/\s*\(.*$/, '');
  byCat[cat] = byCat[cat] || { ok: 0, ko: 0 };
  if (errs.length) { fail++; byCat[cat].ko++; fails.push({ i, label: sc.label, errs, got: { pax: r.pax, route: r.route, vol: r.vol, minors: r.passengers.filter((p) => p.minor).length, pnr: r.pnr, refType: r.refType, allerRetour: r.allerRetour, multiPNR: r.multiPNR, lisible: r.lisible } }); }
  else { pass++; byCat[cat].ok++; }
}

console.log('\n═══ 100 SCÉNARIOS D\'EXTRACTION (normalize) ═══\n');
console.log('Catégorie'.padEnd(46), 'OK  KO');
Object.keys(byCat).sort().forEach((c) => console.log(c.padEnd(46), String(byCat[c].ok).padStart(3), String(byCat[c].ko).padStart(3)));
console.log('\n' + (fail === 0 ? `✅ ${pass}/100 PASSÉS — aucun échec` : `❌ ${pass}/100 passés, ${fail} ÉCHEC(S) :`));
fails.slice(0, 20).forEach((f) => console.log(`  #${f.i} ${f.label}\n     ${f.errs.join(' · ')}\n     obtenu: ${JSON.stringify(f.got)}`));
process.exit(fail === 0 ? 0 : 1);
