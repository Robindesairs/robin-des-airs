/**
 * Coordonnées GPS des hubs africains subsahariens pour geofencing Meta Ads.
 * Source : coordonnées officielles aéroports (IATA).
 */
const AIRPORT_COORDS = {
  // Afrique de l'Ouest
  DSS: { lat: 14.6700, lng: -17.0731, name: 'Dakar-Diass', city: 'Dakar' },
  DKR: { lat: 14.7397, lng: -17.4902, name: 'Dakar-Yoff', city: 'Dakar' },
  BKO: { lat: 12.5335, lng: -7.9499,  name: 'Bamako-Sénou', city: 'Bamako' },
  OUA: { lat: 12.3532, lng: -1.5124,  name: 'Ouagadougou', city: 'Ouagadougou' },
  NIM: { lat: 13.4815, lng: 2.1836,   name: 'Diori Hamani', city: 'Niamey' },
  CKY: { lat: 9.5789,  lng: -13.6120, name: 'Conakry', city: 'Conakry' },
  FNA: { lat: 8.6165,  lng: -13.1955, name: 'Lungi', city: 'Freetown' },
  ROB: { lat: 6.2338,  lng: -10.3623, name: 'Roberts Intl', city: 'Monrovia' },
  ABJ: { lat: 5.2613,  lng: -3.9263,  name: 'Félix Houphouët-Boigny', city: 'Abidjan' },
  COO: { lat: 6.3573,  lng: 2.3845,   name: 'Cadjehoun', city: 'Cotonou' },
  LFW: { lat: 6.1656,  lng: 1.2545,   name: 'Lomé-Tokoin', city: 'Lomé' },
  ACC: { lat: 5.6052,  lng: -0.1668,  name: 'Kotoka Intl', city: 'Accra' },
  BJL: { lat: 13.3380, lng: -16.6522, name: 'Banjul Intl', city: 'Banjul' },
  OXB: { lat: 11.8948, lng: -15.6536, name: 'Osvaldo Vieira', city: 'Bissau' },
  NKC: { lat: 18.0980, lng: -15.9479, name: 'Nouakchott-Oumtounsy', city: 'Nouakchott' },

  // Nigeria
  LOS: { lat: 6.5774,  lng: 3.3211,   name: 'Murtala Muhammed', city: 'Lagos' },
  ABV: { lat: 9.0068,  lng: 7.2631,   name: 'Nnamdi Azikiwe', city: 'Abuja' },
  KAN: { lat: 12.0476, lng: 8.5246,   name: 'Mallam Aminu Kano', city: 'Kano' },
  PHC: { lat: 5.0155,  lng: 6.9496,   name: 'Port Harcourt Intl', city: 'Port Harcourt' },

  // Cameroun & Afrique centrale
  DLA: { lat: 4.0061,  lng: 9.7195,   name: 'Douala Intl', city: 'Douala' },
  NSI: { lat: 3.7226,  lng: 11.5533,  name: 'Nsimalen', city: 'Yaoundé' },
  LBV: { lat: 0.4586,  lng: 9.4123,   name: 'Léon-Mba', city: 'Libreville' },
  BZV: { lat: -4.2517, lng: 15.2531,  name: 'Maya-Maya', city: 'Brazzaville' },
  PNR: { lat: -4.8160, lng: 11.8866,  name: 'Pointe-Noire', city: 'Pointe-Noire' },
  FIH: { lat: -4.3858, lng: 15.4446,  name: 'N\'Djili', city: 'Kinshasa' },
  FKI: { lat: 0.4817,  lng: 25.3380,  name: 'Bangoka', city: 'Kisangani' },
  FBM: { lat: -11.5913, lng: 27.5309, name: 'Lubumbashi Intl', city: 'Lubumbashi' },
  GOM: { lat: -1.6708, lng: 29.2385,  name: 'Goma Intl', city: 'Goma' },
  LAD: { lat: -8.8583, lng: 13.2312,  name: 'Quatro de Fevereiro', city: 'Luanda' },
  NDJ: { lat: 12.1337, lng: 15.0340,  name: 'Hassan Djamous', city: 'N\'Djamena' },
  BGF: { lat: 4.3985,  lng: 18.5188,  name: 'Bangui M\'Poko', city: 'Bangui' },
  SSG: { lat: 3.7527,  lng: 8.7087,   name: 'Santa Isabel', city: 'Malabo' },

  // Afrique de l'Est & Corne
  ADD: { lat: 8.9779,  lng: 38.7993,  name: 'Addis Abeba Bole', city: 'Addis-Abeba' },
  NBO: { lat: -1.3192, lng: 36.9275,  name: 'Jomo Kenyatta', city: 'Nairobi' },
  MBA: { lat: -4.0348, lng: 39.5942,  name: 'Mombasa Moi', city: 'Mombasa' },
  EBB: { lat: 0.0424,  lng: 32.4433,  name: 'Entebbe Intl', city: 'Kampala' },
  KGL: { lat: -1.9686, lng: 30.1395,  name: 'Kigali Intl', city: 'Kigali' },
  DAR: { lat: -6.8781, lng: 39.2026,  name: 'Julius Nyerere', city: 'Dar es Salaam' },
  JRO: { lat: -3.4295, lng: 37.0695,  name: 'Kilimanjaro Intl', city: 'Kilimanjaro' },
  ZNZ: { lat: -6.2220, lng: 39.2249,  name: 'Zanzibar Abeid Karume', city: 'Zanzibar' },
  JIB: { lat: 11.5473, lng: 43.1595,  name: 'Djibouti-Ambouli', city: 'Djibouti' },

  // Afrique australe & îles
  TNR: { lat: -18.7969, lng: 47.4788, name: 'Ivato Intl', city: 'Antananarivo' },
  MRU: { lat: -20.4302, lng: 57.6836, name: 'Sir Seewoosagur Ramgoolam', city: 'Maurice' },
  MPM: { lat: -25.9208, lng: 32.5726, name: 'Maputo Intl', city: 'Maputo' },
  LUN: { lat: -15.3308, lng: 28.4526, name: 'Kenneth Kaunda', city: 'Lusaka' },
  HRE: { lat: -17.9318, lng: 31.0928, name: 'Robert Gabriel Mugabe', city: 'Harare' },
  JNB: { lat: -26.1392, lng: 28.2460, name: 'O.R. Tambo', city: 'Johannesburg' },
  CPT: { lat: -33.9648, lng: 18.6017, name: 'Cape Town Intl', city: 'Le Cap' },
  DUR: { lat: -29.6144, lng: 31.1197, name: 'King Shaka Intl', city: 'Durban' },
  WDH: { lat: -22.4799, lng: 17.4709, name: 'Hosea Kutako', city: 'Windhoek' },
};

/**
 * Retourne les coordonnées d'un aéroport par son code IATA.
 * Retourne null si inconnu.
 */
function getAirportCoords(iata) {
  return AIRPORT_COORDS[(iata || '').toUpperCase()] || null;
}

/**
 * Détecte si l'aéroport de DÉPART d'un itinéraire (texte libre) est un hub africain connu.
 * Garde-fou CE 261 art. 3§1 : un transporteur NON communautaire n'est redevable qu'AU DÉPART
 * d'un aéroport UE. Un départ africain sur transporteur non-UE = vol non couvert.
 * Parse le premier segment de la route : « Dakar → Paris », « DSS-CDG », « Abidjan/Paris »…
 * Biaisé vers la détection (sur-alerter un humain coûte moins cher que rater un dossier mort).
 * @returns {object|null} { iata, lat, lng, name, city } si départ africain identifié, sinon null.
 */
function africanDepartureFromRoute(route) {
  const raw = String(route || '').trim();
  if (!raw) return null;
  // Premier segment avant un séparateur d'itinéraire (→ - – — > / , « to » « vers »).
  const first = raw.split(/\s*(?:→|->|–|—|>|\/|-|,|\bto\b|\bvers\b)\s*/i)[0].trim();
  if (!first) return null;
  // 1) Code IATA explicite (3 lettres).
  const code = first.toUpperCase().match(/\b([A-Z]{3})\b/);
  if (code && AIRPORT_COORDS[code[1]]) return { iata: code[1], ...AIRPORT_COORDS[code[1]] };
  // 2) Nom de ville connu (Dakar, Abidjan, Bamako…).
  const low = first.toLowerCase();
  for (const [iata, hub] of Object.entries(AIRPORT_COORDS)) {
    if (hub.city && low.includes(hub.city.toLowerCase())) return { iata, ...hub };
  }
  return null;
}

module.exports = { AIRPORT_COORDS, getAirportCoords, africanDepartureFromRoute };
