/**
 * Dictionnaire statique numéro de vol → tronçons.
 * Consulté EN PREMIER avant AeroDataBox et le LLM.
 *
 * Format : { 'XX999': [{dep:'AAA', arr:'BBB', route:'Ville A → Ville B', airline:'Nom'}] }
 * - 1 objet  = vol direct
 * - N objets = milk-run (plusieurs tronçons possibles sous le même numéro)
 *
 * RÈGLE : on n'inscrit que les routes VÉRIFIÉES (source notée en commentaire).
 *   - Un numéro douteux vaut mieux absent (AeroDataBox/LLM prennent le relais).
 *   - Un milk-run mal listé est pire qu'absent (boutons faux = client perdu).
 *   - Mettre à jour à chaque changement de saison IATA (mars et octobre).
 *
 * Dernière mise à jour : juin 2026 (saison été IATA S26)
 */

const ROUTES = {

  // ─── AIR FRANCE (AF) ────────────────────────────────────────────────────────
  // Source : flightera.net + flightaware.com + airportia.com

  // Dakar (les deux numéros coexistent selon le jour)
  AF718:  [{ dep:'DSS', arr:'CDG', route:'Dakar → Paris',   airline:'Air France' }],
  AF719:  [{ dep:'CDG', arr:'DSS', route:'Paris → Dakar',   airline:'Air France' }],

  // Abidjan
  AF702:  [{ dep:'CDG', arr:'ABJ', route:'Paris → Abidjan', airline:'Air France' }],
  AF703:  [{ dep:'ABJ', arr:'CDG', route:'Abidjan → Paris', airline:'Air France' }],

  // Cotonou (AF700 = Cotonou, PAS Dakar — ne pas confondre)
  AF700:  [{ dep:'CDG', arr:'COO', route:'Paris → Cotonou', airline:'Air France' }],
  AF701:  [{ dep:'COO', arr:'CDG', route:'Cotonou → Paris', airline:'Air France' }],

  // Douala (source : flightaware AFR946/947)
  AF946:  [{ dep:'CDG', arr:'DLA', route:'Paris → Douala',  airline:'Air France' }],
  AF947:  [{ dep:'DLA', arr:'CDG', route:'Douala → Paris',  airline:'Air France' }],

  // Libreville (source : flightmapper AF926, seul nonstop CDG-LBV)
  AF926:  [{ dep:'CDG', arr:'LBV', route:'Paris → Libreville', airline:'Air France' }],
  AF977:  [{ dep:'LBV', arr:'CDG', route:'Libreville → Paris', airline:'Air France' }],

  // Bamako (source : flightmapper AF520/521 — vérifier suspension Sahel)
  AF520:  [{ dep:'CDG', arr:'BKO', route:'Paris → Bamako',  airline:'Air France' }],
  AF521:  [{ dep:'BKO', arr:'CDG', route:'Bamako → Paris',  airline:'Air France' }],

  // Conakry (source : airportia AF592 CDG→CKY)
  AF592:  [{ dep:'CDG', arr:'CKY', route:'Paris → Conakry', airline:'Air France' }],
  AF598:  [{ dep:'CKY', arr:'CDG', route:'Conakry → Paris', airline:'Air France' }],

  // Bangui → Yaoundé (milk-run, source : flightera AF775 CDG→BGF→NSI)
  AF775:  [
    { dep:'CDG', arr:'BGF', route:'Paris → Bangui',     airline:'Air France' },
    { dep:'BGF', arr:'NSI', route:'Bangui → Yaoundé',   airline:'Air France' },
    { dep:'CDG', arr:'NSI', route:'Paris → Yaoundé',    airline:'Air France' },
  ],
  AF776:  [
    { dep:'NSI', arr:'BGF', route:'Yaoundé → Bangui',   airline:'Air France' },
    { dep:'BGF', arr:'CDG', route:'Bangui → Paris',     airline:'Air France' },
    { dep:'NSI', arr:'CDG', route:'Yaoundé → Paris',    airline:'Air France' },
  ],

  // Kinshasa + Brazzaville (milk-run triangle, source : flightera AF722/736)
  AF722:  [
    { dep:'CDG', arr:'FIH', route:'Paris → Kinshasa',       airline:'Air France' },
    { dep:'CDG', arr:'BZV', route:'Paris → Brazzaville',    airline:'Air France' },
    { dep:'FIH', arr:'BZV', route:'Kinshasa → Brazzaville', airline:'Air France' },
  ],
  AF736:  [
    { dep:'BZV', arr:'CDG', route:'Brazzaville → Paris',    airline:'Air France' },
    { dep:'FIH', arr:'CDG', route:'Kinshasa → Paris',       airline:'Air France' },
    { dep:'BZV', arr:'FIH', route:'Brazzaville → Kinshasa', airline:'Air France' },
  ],

  // Antananarivo / Madagascar (source : flightmapper AF934, seul nonstop)
  AF934:  [{ dep:'CDG', arr:'TNR', route:'Paris → Antananarivo', airline:'Air France' }],
  AF935:  [{ dep:'TNR', arr:'CDG', route:'Antananarivo → Paris', airline:'Air France' }],

  // Nairobi (source : flightaware AFR814, quotidien)
  AF814:  [{ dep:'CDG', arr:'NBO', route:'Paris → Nairobi', airline:'Air France' }],
  AF815:  [{ dep:'NBO', arr:'CDG', route:'Nairobi → Paris', airline:'Air France' }],

  // Johannesburg (source : flightaware AFR990)
  AF990:  [{ dep:'CDG', arr:'JNB', route:'Paris → Johannesburg', airline:'Air France' }],
  AF991:  [{ dep:'JNB', arr:'CDG', route:'Johannesburg → Paris', airline:'Air France' }],

  // Lagos (source : flightaware AFR148, quotidien)
  AF148:  [{ dep:'CDG', arr:'LOS', route:'Paris → Lagos',   airline:'Air France' }],
  AF149:  [{ dep:'LOS', arr:'CDG', route:'Lagos → Paris',   airline:'Air France' }],

  // Ouagadougou (source : flightaware AFR548 — vérifier suspension Sahel)
  AF548:  [{ dep:'CDG', arr:'OUA', route:'Paris → Ouagadougou', airline:'Air France' }],
  AF549:  [{ dep:'OUA', arr:'CDG', route:'Ouagadougou → Paris', airline:'Air France' }],

  // N'Djamena (source : flightera AF878, milk-run via Abuja certains jours)
  AF878:  [{ dep:'CDG', arr:'NDJ', route:'Paris → N\'Djamena', airline:'Air France' }],
  AF879:  [{ dep:'NDJ', arr:'CDG', route:'N\'Djamena → Paris', airline:'Air France' }],

  // Niamey → Lomé (milk-run, source : flightmapper AF306 — vérifier suspension Sahel)
  AF306:  [
    { dep:'CDG', arr:'NIM', route:'Paris → Niamey', airline:'Air France' },
    { dep:'NIM', arr:'LFW', route:'Niamey → Lomé',  airline:'Air France' },
    { dep:'CDG', arr:'LFW', route:'Paris → Lomé',   airline:'Air France' },
  ],
  AF307:  [
    { dep:'LFW', arr:'NIM', route:'Lomé → Niamey',  airline:'Air France' },
    { dep:'NIM', arr:'CDG', route:'Niamey → Paris',  airline:'Air France' },
    { dep:'LFW', arr:'CDG', route:'Lomé → Paris',    airline:'Air France' },
  ],


  // ─── BRUSSELS AIRLINES (SN) ─────────────────────────────────────────────────
  // Source : test prod + flightaware + flightconnections.com + airportia

  // Bruxelles → Dakar → Banjul (milk-run)
  SN203:  [
    { dep:'BRU', arr:'DSS', route:'Bruxelles → Dakar',   airline:'Brussels Airlines' },
    { dep:'DSS', arr:'BJL', route:'Dakar → Banjul',       airline:'Brussels Airlines' },
    { dep:'BRU', arr:'BJL', route:'Bruxelles → Banjul',   airline:'Brussels Airlines' },
  ],
  SN204:  [
    { dep:'BJL', arr:'DSS', route:'Banjul → Dakar',        airline:'Brussels Airlines' },
    { dep:'DSS', arr:'BRU', route:'Dakar → Bruxelles',     airline:'Brussels Airlines' },
    { dep:'BJL', arr:'BRU', route:'Banjul → Bruxelles',    airline:'Brussels Airlines' },
  ],

  // Bruxelles → Accra → Lomé (milk-run, confirmé test prod)
  SN277:  [
    { dep:'BRU', arr:'ACC', route:'Bruxelles → Accra',   airline:'Brussels Airlines' },
    { dep:'ACC', arr:'LFW', route:'Accra → Lomé',         airline:'Brussels Airlines' },
    { dep:'BRU', arr:'LFW', route:'Bruxelles → Lomé',     airline:'Brussels Airlines' },
  ],
  SN278:  [
    { dep:'LFW', arr:'ACC', route:'Lomé → Accra',          airline:'Brussels Airlines' },
    { dep:'ACC', arr:'BRU', route:'Accra → Bruxelles',     airline:'Brussels Airlines' },
    { dep:'LFW', arr:'BRU', route:'Lomé → Bruxelles',      airline:'Brussels Airlines' },
  ],

  // Bruxelles → Cotonou → Abidjan (milk-run)
  SN287:  [
    { dep:'BRU', arr:'COO', route:'Bruxelles → Cotonou', airline:'Brussels Airlines' },
    { dep:'COO', arr:'ABJ', route:'Cotonou → Abidjan',   airline:'Brussels Airlines' },
    { dep:'BRU', arr:'ABJ', route:'Bruxelles → Abidjan', airline:'Brussels Airlines' },
  ],
  SN288:  [
    { dep:'ABJ', arr:'COO', route:'Abidjan → Cotonou',    airline:'Brussels Airlines' },
    { dep:'COO', arr:'BRU', route:'Cotonou → Bruxelles',  airline:'Brussels Airlines' },
    { dep:'ABJ', arr:'BRU', route:'Abidjan → Bruxelles',  airline:'Brussels Airlines' },
  ],

  // Kinshasa (source : flightaware BEL357/358)
  SN357:  [{ dep:'BRU', arr:'FIH', route:'Bruxelles → Kinshasa', airline:'Brussels Airlines' }],
  SN358:  [{ dep:'FIH', arr:'BRU', route:'Kinshasa → Bruxelles', airline:'Brussels Airlines' }],

  // Douala → Yaoundé (milk-run, source : flightera SN369 BRU→DLA→NSI)
  SN369:  [
    { dep:'BRU', arr:'DLA', route:'Bruxelles → Douala',  airline:'Brussels Airlines' },
    { dep:'DLA', arr:'NSI', route:'Douala → Yaoundé',    airline:'Brussels Airlines' },
    { dep:'BRU', arr:'NSI', route:'Bruxelles → Yaoundé', airline:'Brussels Airlines' },
  ],
  SN370:  [
    { dep:'NSI', arr:'DLA', route:'Yaoundé → Douala',    airline:'Brussels Airlines' },
    { dep:'DLA', arr:'BRU', route:'Douala → Bruxelles',  airline:'Brussels Airlines' },
    { dep:'NSI', arr:'BRU', route:'Yaoundé → Bruxelles', airline:'Brussels Airlines' },
  ],

  // Kigali (source : flightconnections SN465/467/491)
  SN465:  [{ dep:'BRU', arr:'KGL', route:'Bruxelles → Kigali',  airline:'Brussels Airlines' }],
  SN466:  [{ dep:'KGL', arr:'BRU', route:'Kigali → Bruxelles',  airline:'Brussels Airlines' }],
  SN467:  [{ dep:'BRU', arr:'KGL', route:'Bruxelles → Kigali',  airline:'Brussels Airlines' }],

  // Entebbe / Ouganda (source : airportia SN455)
  SN455:  [{ dep:'BRU', arr:'EBB', route:'Bruxelles → Entebbe', airline:'Brussels Airlines' }],
  SN456:  [{ dep:'EBB', arr:'BRU', route:'Entebbe → Bruxelles', airline:'Brussels Airlines' }],

  // Nairobi (source : flightsfrom.com SN481/482)
  SN481:  [{ dep:'BRU', arr:'NBO', route:'Bruxelles → Nairobi', airline:'Brussels Airlines' }],
  SN482:  [{ dep:'NBO', arr:'BRU', route:'Nairobi → Bruxelles', airline:'Brussels Airlines' }],


  // ─── KLM (KL) ───────────────────────────────────────────────────────────────
  // Source : flightera.net KL587 + KL589/586 confirmés

  // Lagos
  KL587:  [{ dep:'AMS', arr:'LOS', route:'Amsterdam → Lagos', airline:'KLM' }],
  KL588:  [{ dep:'LOS', arr:'AMS', route:'Lagos → Amsterdam', airline:'KLM' }],

  // Accra (KL589 aller, KL586 retour — numéros asymétriques)
  KL589:  [{ dep:'AMS', arr:'ACC', route:'Amsterdam → Accra', airline:'KLM' }],
  KL586:  [{ dep:'ACC', arr:'AMS', route:'Accra → Amsterdam', airline:'KLM' }],

  // Nairobi (source : airlineroute.net KL565)
  KL565:  [{ dep:'AMS', arr:'NBO', route:'Amsterdam → Nairobi', airline:'KLM' }],
  KL566:  [{ dep:'NBO', arr:'AMS', route:'Nairobi → Amsterdam', airline:'KLM' }],

  // Kilimanjaro (source : flightera KL571)
  KL571:  [{ dep:'AMS', arr:'JRO', route:'Amsterdam → Kilimandjaro', airline:'KLM' }],
  KL572:  [{ dep:'JRO', arr:'AMS', route:'Kilimandjaro → Amsterdam', airline:'KLM' }],


  // ─── ROYAL AIR MAROC (AT) ───────────────────────────────────────────────────
  // Source : airportia.com + flightera.net

  // Dakar (plusieurs fréquences hebdomadaires = plusieurs numéros)
  AT501:  [{ dep:'CMN', arr:'DSS', route:'Casablanca → Dakar',    airline:'Royal Air Maroc' }],
  AT502:  [{ dep:'DSS', arr:'CMN', route:'Dakar → Casablanca',    airline:'Royal Air Maroc' }],
  AT503:  [{ dep:'CMN', arr:'DSS', route:'Casablanca → Dakar',    airline:'Royal Air Maroc' }],
  AT504:  [{ dep:'DSS', arr:'CMN', route:'Dakar → Casablanca',    airline:'Royal Air Maroc' }],

  // Abidjan
  AT533:  [{ dep:'CMN', arr:'ABJ', route:'Casablanca → Abidjan',  airline:'Royal Air Maroc' }],
  AT532:  [{ dep:'ABJ', arr:'CMN', route:'Abidjan → Casablanca',  airline:'Royal Air Maroc' }],


  // ─── TURKISH AIRLINES (TK) ──────────────────────────────────────────────────
  // Source : flightera TK607 (Nairobi) + airportia TK502/TK504 (Dakar)

  // Dakar
  TK502:  [{ dep:'IST', arr:'DSS', route:'Istanbul → Dakar',   airline:'Turkish Airlines' }],
  TK503:  [{ dep:'DSS', arr:'IST', route:'Dakar → Istanbul',   airline:'Turkish Airlines' }],
  TK504:  [{ dep:'IST', arr:'DSS', route:'Istanbul → Dakar',   airline:'Turkish Airlines' }],
  TK505:  [{ dep:'DSS', arr:'IST', route:'Dakar → Istanbul',   airline:'Turkish Airlines' }],

  // Nairobi
  TK607:  [{ dep:'IST', arr:'NBO', route:'Istanbul → Nairobi', airline:'Turkish Airlines' }],
  TK608:  [{ dep:'NBO', arr:'IST', route:'Nairobi → Istanbul', airline:'Turkish Airlines' }],


  // ─── ETHIOPIAN AIRLINES (ET) ────────────────────────────────────────────────
  // Source : flightera ET901 (Lagos) + ET500 (Paris CDG confirmé)

  // Paris
  ET500:  [{ dep:'ADD', arr:'CDG', route:'Addis-Abeba → Paris', airline:'Ethiopian Airlines' }],
  ET501:  [{ dep:'CDG', arr:'ADD', route:'Paris → Addis-Abeba', airline:'Ethiopian Airlines' }],

  // Lagos
  ET901:  [{ dep:'ADD', arr:'LOS', route:'Addis-Abeba → Lagos', airline:'Ethiopian Airlines' }],
  ET902:  [{ dep:'LOS', arr:'ADD', route:'Lagos → Addis-Abeba', airline:'Ethiopian Airlines' }],

  // London (ET700 = ADD→LHR — PAS Paris, erreur fréquente)
  ET700:  [{ dep:'ADD', arr:'LHR', route:'Addis-Abeba → Londres', airline:'Ethiopian Airlines' }],
  ET701:  [{ dep:'LHR', arr:'ADD', route:'Londres → Addis-Abeba', airline:'Ethiopian Airlines' }],

};

/**
 * Retourne les tronçons d'un vol depuis le dict statique.
 * @param {string} flightNumber  ex. "SN277", "AF718"
 * @returns {Array|null}  tableau [{dep,arr,route,airline}] ou null si inconnu
 */
function lookupFlightRoutes(flightNumber) {
  const key = String(flightNumber || '').toUpperCase().replace(/\s/g, '');
  return ROUTES[key] || null;
}

module.exports = { lookupFlightRoutes };
