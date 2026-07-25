/**
 * lib/mrz — vérificateur MRZ déterministe (ICAO 9303).
 *
 * La MRZ (les 2 lignes du passeport TD3, ou 3 lignes de la CNI/titre TD1) est
 * lisible-machine et porte des CHIFFRES DE CONTRÔLE. On ne « devine » rien : si
 * le check digit d'un champ tombe juste, la valeur est CERTAINE et on peut
 * corriger/valider ce que le LLM a lu sur la zone visuelle.
 *
 * Le LLM nous fournit la MRZ recopiée verbatim ; ici on la parse et on valide
 * champ par champ. On n'écrase JAMAIS un champ dont le check digit ne passe pas
 * (on préfère laisser la lecture visuelle du LLM).
 *
 * parseMrz(text) → {
 *   type: 'TD3'|'TD1'|null,
 *   dob:        'JJ/MM/AAAA' | '',   // rempli seulement si check digit OK
 *   expiry:     'JJ/MM/AAAA' | '',
 *   sexe:       'M'|'F'|'',
 *   docNumber:  string | '',         // n° passeport/pièce, si check OK
 *   nationality:string | '',         // code pays 3 lettres (ICAO)
 *   surnameMrz: string | '',         // nom MRZ (SANS accents) — pour recoupement
 *   givenMrz:   string | '',
 *   fields:     { dob:bool, expiry:bool, docNumber:bool }, // quels checks ont passé
 *   any: bool                        // au moins un champ validé
 * }
 */

'use strict';

function charVal(c) {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55; // A=10 … Z=35
  if (c === '<') return 0;
  return -1; // caractère hors alphabet MRZ → invalide
}

// Chiffre de contrôle ICAO : poids 7,3,1 cycliques, somme mod 10.
function checkDigit(str) {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const v = charVal(str[i]);
    if (v < 0) return -1;
    sum += v * w[i % 3];
  }
  return sum % 10;
}

function digitsOk(field, cd) {
  if (!/^\d$/.test(cd)) return false;
  const c = checkDigit(field);
  return c >= 0 && c === +cd;
}

// YYMMDD → JJ/MM/AAAA. La MRZ n'encode pas le siècle : on l'infère.
function mrzDate(yymmdd, kind) {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(yymmdd);
  if (!m) return '';
  const yy = +m[1], mm = +m[2], dd = +m[3];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
  const nowYY = new Date().getFullYear() % 100;
  let year;
  if (kind === 'birth') {
    // Naissance : toujours dans le passé. 20YY si plausible (≤ année en cours), sinon 19YY.
    year = (yy <= nowYY) ? 2000 + yy : 1900 + yy;
  } else {
    // Expiration : quasi toujours 20YY (les passeports courent sur ~10 ans).
    year = (yy < 80) ? 2000 + yy : 1900 + yy;
  }
  return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${year}`;
}

// Découpe le champ nom MRZ « SURNAME<<GIVEN<NAMES » en {surname, given}, « < » → espace.
function splitMrzName(nameField) {
  const s = String(nameField || '');
  const [surRaw, givRaw = ''] = s.split('<<');
  const clean = (x) => x.replace(/</g, ' ').replace(/\s+/g, ' ').trim();
  return { surname: clean(surRaw), given: clean(givRaw) };
}

function sexOf(c) { return (c === 'M' || c === 'F') ? c : ''; }

// TD3 = passeport : 2 lignes de 44.
function parseTD3(l1, l2) {
  const out = { type: 'TD3', dob: '', expiry: '', sexe: '', docNumber: '', nationality: '', surnameMrz: '', givenMrz: '', fields: {}, any: false };
  if (l2.length < 44) return null;
  const docNum = l2.slice(0, 9);
  const docCd = l2[9];
  const nat = l2.slice(10, 13);
  const birth = l2.slice(13, 19);
  const birthCd = l2[19];
  const sex = l2[20];
  const exp = l2.slice(21, 27);
  const expCd = l2[27];

  if (digitsOk(docNum, docCd)) { out.docNumber = docNum.replace(/</g, '').trim(); out.fields.docNumber = true; }
  if (digitsOk(birth, birthCd)) { out.dob = mrzDate(birth, 'birth'); out.fields.dob = !!out.dob; }
  if (digitsOk(exp, expCd)) { out.expiry = mrzDate(exp, 'expiry'); out.fields.expiry = !!out.expiry; }
  out.sexe = sexOf(sex);
  if (/^[A-Z<]{3}$/.test(nat)) out.nationality = nat.replace(/</g, '');

  if (l1.length >= 6) {
    const { surname, given } = splitMrzName(l1.slice(5));
    out.surnameMrz = surname; out.givenMrz = given;
  }
  out.any = !!(out.fields.dob || out.fields.expiry || out.fields.docNumber);
  return out;
}

// TD1 = CNI / titre de séjour : 3 lignes de 30.
function parseTD1(l1, l2, l3) {
  const out = { type: 'TD1', dob: '', expiry: '', sexe: '', docNumber: '', nationality: '', surnameMrz: '', givenMrz: '', fields: {}, any: false };
  if (l1.length < 15 || l2.length < 15) return null;
  const docNum = l1.slice(5, 14);
  const docCd = l1[14];
  const birth = l2.slice(0, 6);
  const birthCd = l2[6];
  const sex = l2[7];
  const exp = l2.slice(8, 14);
  const expCd = l2[14];
  const nat = l2.slice(15, 18);

  if (digitsOk(docNum, docCd)) { out.docNumber = docNum.replace(/</g, '').trim(); out.fields.docNumber = true; }
  if (digitsOk(birth, birthCd)) { out.dob = mrzDate(birth, 'birth'); out.fields.dob = !!out.dob; }
  if (digitsOk(exp, expCd)) { out.expiry = mrzDate(exp, 'expiry'); out.fields.expiry = !!out.expiry; }
  out.sexe = sexOf(sex);
  if (/^[A-Z<]{3}$/.test(nat)) out.nationality = nat.replace(/</g, '');

  if (l3 && l3.length >= 1) {
    const { surname, given } = splitMrzName(l3);
    out.surnameMrz = surname; out.givenMrz = given;
  }
  out.any = !!(out.fields.dob || out.fields.expiry || out.fields.docNumber);
  return out;
}

function parseMrz(text) {
  const empty = { type: null, dob: '', expiry: '', sexe: '', docNumber: '', nationality: '', surnameMrz: '', givenMrz: '', fields: {}, any: false };
  if (!text) return empty;
  // Normalise : majuscules, garde A-Z 0-9 < et retours ligne ; enlève espaces.
  const norm = String(text).toUpperCase().replace(/[ \t]+/g, '');
  let lines = norm.split(/[\r\n]+/).map((x) => x.replace(/[^A-Z0-9<]/g, '')).filter(Boolean);
  // Si tout est venu sur une seule ligne, on retombe sur les longueurs standard.
  if (lines.length === 1) {
    const s = lines[0];
    if (s.length === 88) lines = [s.slice(0, 44), s.slice(44)];
    else if (s.length === 90) lines = [s.slice(0, 30), s.slice(30, 60), s.slice(60)];
  }
  try {
    if (lines.length >= 2 && lines[0].length >= 30 && lines[1].length >= 30) {
      const r = parseTD3(lines[0], lines[1]);
      if (r && r.any) return r;
    }
    if (lines.length >= 3) {
      const r = parseTD1(lines[0], lines[1], lines[2]);
      if (r && r.any) return r;
    }
    // dernier essai : TD3 même si la ligne 1 est courte (on ne se sert que de la ligne 2 pour les checks)
    if (lines.length >= 2 && lines[1].length >= 28) {
      const r = parseTD3(lines[0] || '', lines[1]);
      if (r && r.any) return r;
    }
  } catch (_) { /* MRZ illisible → on laisse la lecture visuelle */ }
  return empty;
}

module.exports = { parseMrz, checkDigit };
