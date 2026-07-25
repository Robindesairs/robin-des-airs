/**
 * lib/bcbp — décodeur déterministe de carte d'embarquement (IATA BCBP, format « M »,
 * Resolution 792). La chaîne codée (imprimée près du code-barres PDF417/Aztec, ou
 * transcrite par le LLM) commence par « M1 » / « M2 »… et encode nom, PNR, trajet,
 * vol, jour du vol — SANS ambiguïté. On la parse ici pour valider/compléter la
 * lecture visuelle du billet (le n° de vol et le PNR sont alors CERTAINS).
 *
 * parseBcbp(text) → {
 *   valid: bool,
 *   nom, prenom,               // depuis « SURNAME/GIVEN »
 *   pnr,                       // record locator (alphanumérique, contient des lettres)
 *   from, to,                  // IATA 3 lettres
 *   carrier,                   // code compagnie 2 lettres
 *   flightNum,                 // ex. « AF718 »
 *   dateFr,                    // « JJ/MM » (le BCBP n'encode PAS l'année → inférée en aval)
 * }
 *
 * On reste conservateur : renvoie valid=false si la structure ne colle pas
 * (préfère alors la lecture visuelle du LLM plutôt qu'un faux décodage).
 */

'use strict';

const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // jours cumulés (année non bissextile)

function julianToJJMM(j) {
  j = parseInt(j, 10);
  if (!(j >= 1 && j <= 366)) return '';
  if (j === 366) return '31/12'; // 31 déc. d'une année bissextile
  let month = 1, day = j;
  for (let m = 11; m >= 0; m--) {
    if (j > CUM[m]) { month = m + 1; day = j - CUM[m]; break; }
  }
  if (day < 1 || day > 31) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

function parseBcbp(text) {
  const out = { valid: false, nom: '', prenom: '', pnr: '', from: '', to: '', carrier: '', flightNum: '', dateFr: '' };
  if (!text) return out;
  // Isole la chaîne BCBP : commence par M + nb de legs (1-9). Garde la casse/espaces
  // internes (les champs sont à position FIXE, calés sur des espaces).
  const raw = String(text).replace(/\r?\n/g, '').replace(/^[^M]*/, '');
  const m = /^M([1-9])(.*)$/s.exec(raw);
  if (!m) return out;
  const s = raw;
  if (s.length < 40) return out; // trop court pour porter les champs uniques du 1er leg

  // Champs uniques (position fixe, 0-based) :
  //  2..21 nom (20)  ·  22 e-ticket  ·  23..29 PNR (7)  ·  30..32 from  ·  33..35 to
  //  36..38 carrier  ·  39..43 flight (5)  ·  44..46 date julienne (3)
  const nameField = s.slice(2, 22);
  const pnrField = s.slice(23, 30);
  const fromField = s.slice(30, 33);
  const toField = s.slice(33, 36);
  const carrierField = s.slice(36, 39);
  const flightField = s.slice(39, 44);
  const dateField = s.slice(44, 47);

  // Nom « SURNAME/GIVEN »
  const nm = nameField.trim();
  if (nm.includes('/')) {
    const [a, b = ''] = nm.split('/');
    out.nom = a.trim().toUpperCase();
    out.prenom = b.trim().toUpperCase();
  } else {
    out.nom = nm.toUpperCase();
  }

  // PNR : 5-7 alphanumériques AVEC au moins une lettre (sinon c'est une réf agence numérique)
  const pnr = pnrField.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (/^[A-Z0-9]{5,7}$/.test(pnr) && /[A-Z]/.test(pnr)) out.pnr = pnr;

  // Aéroports IATA
  if (/^[A-Z]{3}$/i.test(fromField)) out.from = fromField.toUpperCase();
  if (/^[A-Z]{3}$/i.test(toField)) out.to = toField.toUpperCase();

  // Compagnie + n° de vol → « AF718 »
  const carrier = carrierField.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (/^[A-Z0-9]{2,3}$/.test(carrier)) out.carrier = carrier.slice(0, 2);
  const fnum = flightField.replace(/[^0-9]/g, '').replace(/^0+/, '');
  if (out.carrier && fnum) out.flightNum = out.carrier + fnum;

  // Date (jour julien de l'année) → JJ/MM (année inconnue, inférée en aval)
  if (/^\d{3}$/.test(dateField)) out.dateFr = julianToJJMM(dateField);

  // Valide si on a au moins un trajet cohérent OU un vol : la structure « colle ».
  out.valid = !!((out.from && out.to) || out.flightNum);
  return out;
}

module.exports = { parseBcbp };
