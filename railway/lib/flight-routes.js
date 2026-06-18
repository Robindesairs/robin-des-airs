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
 */

const ROUTES = {

  // ─── AIR FRANCE (AF) ────────────────────────────────────────────────────────
  // Source : flightera.net AF718 + AF702 confirmés

  // Dakar (les deux numéros coexistent selon le jour)
  AF718:  [{ dep:'DSS', arr:'CDG', route:'Dakar → Paris',   airline:'Air France' }],
  AF719:  [{ dep:'CDG', arr:'DSS', route:'Paris → Dakar',   airline:'Air France' }],

  // Abidjan
  AF702:  [{ dep:'CDG', arr:'ABJ', route:'Paris → Abidjan', airline:'Air France' }],
  AF703:  [{ dep:'ABJ', arr:'CDG', route:'Abidjan → Paris', airline:'Air France' }],

  // AF700 = Cotonou (PAS Dakar) — ne pas confondre
  AF700:  [{ dep:'CDG', arr:'COO', route:'Paris → Cotonou', airline:'Air France' }],
  AF701:  [{ dep:'COO', arr:'CDG', route:'Cotonou → Paris', airline:'Air France' }],


  // ─── BRUSSELS AIRLINES (SN) ─────────────────────────────────────────────────
  // Source : test prod (SN277/278) + aviability.com (SN203/204) + flightaware BEL357

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

  // Bruxelles → Cotonou → Abidjan (milk-run, structure réseau connue)
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
  // Source : airportia.com AT501/503 (Dakar) + AT533/532 (Abidjan)

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
