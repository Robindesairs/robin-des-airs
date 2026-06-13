/**
 * Sofia — prospection d'agences de voyage partenaires (corridor diaspora Afrique).
 *
 * Source : OpenStreetMap via Overpass (shop=travel_agency / office=travel_agent).
 * 100 % données RÉELLES (établissements cartographiés, avec nom/tél/site quand dispo),
 * gratuit, sans clé API. Aucune agence inventée (cf. règle « pas de bureaux fictifs »).
 *
 * Logique PURE ici (requêtes + parsing + filtres + dédup). Le fetch réseau + l'écriture
 * Airtable sont dans sofia-prospect.js (le handler).
 *
 * On démarre par : Sénégal (Dakar), Côte d'Ivoire (Abidjan), Gambie (Banjul/Serrekunda).
 */

'use strict';

// Villes cibles (centre-ville, PAS l'aéroport : les agences sont en ville). Rayon en mètres.
const TARGET_CITIES = {
  SN: [{ ville: 'Dakar', lat: 14.6928, lng: -17.4467, radius: 11000 }],
  CI: [{ ville: 'Abidjan', lat: 5.3599, lng: -4.0083, radius: 13000 }],
  GM: [{ ville: 'Serrekunda / Banjul', lat: 13.4399, lng: -16.6781, radius: 15000 }],
};
const COUNTRY_NAMES = { SN: 'Sénégal', CI: 'Côte d’Ivoire', GM: 'Gambie' };
const COUNTRY_FLAG = { SN: '🇸🇳', CI: '🇨🇮', GM: '🇬🇲' };

/** Requête Overpass QL pour une ville (agences de voyage + bureaux d'agents de voyage). */
function buildOverpassQL(city) {
  const a = `around:${Math.round(city.radius)},${city.lat},${city.lng}`;
  return (
    '[out:json][timeout:25];(' +
    `node["shop"="travel_agency"](${a});` +
    `way["shop"="travel_agency"](${a});` +
    `node["office"="travel_agent"](${a});` +
    `way["office"="travel_agent"](${a});` +
    ');out center tags;'
  );
}

/** Bureau de compagnie aérienne (à exclure : ce n'est pas un partenaire à recruter). */
function isAirlineOffice(name) {
  const n = String(name || '');
  if (/\b(airlines?|airways)\b/i.test(n)) return true;
  if (/\bair\b/i.test(n)) return true; // « Air Mali », « Royal Air Maroc », « Air Côte d'Ivoire »…
  if (/\b(asky|corsair|tunisair|egyptair|ethiopian|emirates|qatar|turkish|transavia|ryanair|easyjet|vueling|brussels|iberia|lufthansa|klm|tap)\b/i.test(n)) return true;
  return false;
}

function tag(tags, ...keys) {
  for (const k of keys) if (tags && tags[k]) return String(tags[k]).trim();
  return '';
}

/** Adresse lisible depuis les tags addr:* (sinon ville + pays). */
function buildAddress(tags, ville, pays) {
  const parts = [
    [tag(tags, 'addr:housenumber'), tag(tags, 'addr:street')].filter(Boolean).join(' '),
    tag(tags, 'addr:suburb', 'addr:neighbourhood'),
    tag(tags, 'addr:city') || ville,
  ].filter(Boolean);
  const a = parts.join(', ');
  return a || `${ville}, ${COUNTRY_NAMES[pays] || pays}`;
}

/** Normalise un nom pour la déduplication (minuscules, sans accents/ponctuation). */
function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
/** Normalise un téléphone (chiffres + éventuel +). */
function normPhone(s) {
  const d = String(s || '').replace(/[^\d+]/g, '');
  return d.length >= 6 ? d : '';
}

/** Éléments Overpass → prospects normalisés (filtre compagnies aériennes + sans nom). */
function parseElements(elements, ctx) {
  const ville = ctx.ville;
  const pays = ctx.pays;
  const out = [];
  for (const el of elements || []) {
    const tags = el.tags || {};
    const name = tag(tags, 'name', 'official_name', 'brand');
    if (!name) continue;
    if (isAirlineOffice(name)) continue;
    const phone = normPhone(tag(tags, 'phone', 'contact:phone', 'contact:mobile', 'mobile'));
    const website = tag(tags, 'website', 'contact:website', 'url');
    const email = tag(tags, 'email', 'contact:email');
    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lng = el.lon != null ? el.lon : el.center && el.center.lon;
    out.push({
      name,
      phone,
      website,
      email,
      address: buildAddress(tags, ville, pays),
      ville,
      pays,
      paysNom: COUNTRY_NAMES[pays] || pays,
      osm: `${el.type}/${el.id}`,
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
      contactable: !!(phone || website || email),
    });
  }
  return out;
}

/** Dédoublonne une liste de prospects (par nom normalisé, ou téléphone). */
function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const keyN = normName(p.name);
    const keyP = normPhone(p.phone);
    const key = keyN || keyP || p.osm;
    if (seen.has(key) || (keyP && seen.has('t:' + keyP))) continue;
    seen.add(key);
    if (keyP) seen.add('t:' + keyP);
    out.push(p);
  }
  return out;
}

/** Ne garde que les prospects ABSENTS du CRM (par nom normalisé ou téléphone). */
function filterNew(prospects, existing) {
  const names = new Set((existing && existing.names ? existing.names : []).map(normName).filter(Boolean));
  const phones = new Set((existing && existing.phones ? existing.phones : []).map(normPhone).filter(Boolean));
  return prospects.filter((p) => {
    const n = normName(p.name);
    const t = normPhone(p.phone);
    if (n && names.has(n)) return false;
    if (t && phones.has(t)) return false;
    return true;
  });
}

/** Contactables d'abord, puis ordre alphabétique. */
function sortProspects(list) {
  return list.slice().sort((a, b) => {
    if (a.contactable !== b.contactable) return a.contactable ? -1 : 1;
    return normName(a.name).localeCompare(normName(b.name));
  });
}

/** Pays demandés → liste de villes à interroger (défaut : SN, CI, GM). */
function citiesFor(paysArg) {
  const codes = paysArg && paysArg.length ? paysArg : ['SN', 'CI', 'GM'];
  const cities = [];
  for (const code of codes) {
    const up = String(code || '').toUpperCase().trim();
    for (const c of TARGET_CITIES[up] || []) cities.push({ ...c, pays: up });
  }
  return cities;
}

module.exports = {
  TARGET_CITIES,
  COUNTRY_NAMES,
  COUNTRY_FLAG,
  buildOverpassQL,
  isAirlineOffice,
  parseElements,
  dedupe,
  filterNew,
  sortProspects,
  citiesFor,
  normName,
  normPhone,
};
