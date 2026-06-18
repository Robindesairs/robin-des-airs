/**
 * Dictionnaire statique numéro de vol → tronçons.
 * Consulté EN PREMIER avant AeroDataBox et le LLM.
 *
 * Format : { 'XX999': [{dep:'AAA', arr:'BBB', route:'Ville A → Ville B', airline:'Nom'}] }
 * - 1 objet  = vol direct ou 1 tronçon
 * - N objets = milk-run (plusieurs tronçons possibles sous le même numéro)
 *
 * Conventions :
 * - Numéros sans espace, MAJUSCULES (AF718, SN277)
 * - Aller ET retour listés séparément (AF718 ≠ AF717)
 * - Pour les milk-runs : lister les TRONÇONS puis le TRAJET COMPLET en dernier
 * - Mettre à jour à chaque changement de saison IATA (mars et octobre)
 */

const ROUTES = {
  // ─── AIR FRANCE (AF) ────────────────────────────────────────────────────────
  // Dakar
  AF700:  [{ dep:'CDG', arr:'DSS', route:'Paris → Dakar', airline:'Air France' }],
  AF701:  [{ dep:'DSS', arr:'CDG', route:'Dakar → Paris', airline:'Air France' }],
  AF718:  [{ dep:'DSS', arr:'CDG', route:'Dakar → Paris', airline:'Air France' }],
  AF719:  [{ dep:'CDG', arr:'DSS', route:'Paris → Dakar', airline:'Air France' }],
  // Abidjan
  AF502:  [{ dep:'CDG', arr:'ABJ', route:'Paris → Abidjan', airline:'Air France' }],
  AF503:  [{ dep:'ABJ', arr:'CDG', route:'Abidjan → Paris', airline:'Air France' }],
  // Lagos
  AF506:  [{ dep:'CDG', arr:'LOS', route:'Paris → Lagos', airline:'Air France' }],
  AF507:  [{ dep:'LOS', arr:'CDG', route:'Lagos → Paris', airline:'Air France' }],
  // Douala
  AF500:  [{ dep:'CDG', arr:'DLA', route:'Paris → Douala', airline:'Air France' }],
  AF501:  [{ dep:'DLA', arr:'CDG', route:'Douala → Paris', airline:'Air France' }],
  // Yaoundé
  AF910:  [{ dep:'CDG', arr:'NSI', route:'Paris → Yaoundé', airline:'Air France' }],
  AF911:  [{ dep:'NSI', arr:'CDG', route:'Yaoundé → Paris', airline:'Air France' }],
  // Libreville
  AF760:  [{ dep:'CDG', arr:'LBV', route:'Paris → Libreville', airline:'Air France' }],
  AF761:  [{ dep:'LBV', arr:'CDG', route:'Libreville → Paris', airline:'Air France' }],
  // Kinshasa
  AF862:  [{ dep:'CDG', arr:'FIH', route:'Paris → Kinshasa', airline:'Air France' }],
  AF863:  [{ dep:'FIH', arr:'CDG', route:'Kinshasa → Paris', airline:'Air France' }],
  // Nairobi
  AF866:  [{ dep:'CDG', arr:'NBO', route:'Paris → Nairobi', airline:'Air France' }],
  AF867:  [{ dep:'NBO', arr:'CDG', route:'Nairobi → Paris', airline:'Air France' }],
  // Johannesburg
  AF990:  [{ dep:'CDG', arr:'JNB', route:'Paris → Johannesburg', airline:'Air France' }],
  AF991:  [{ dep:'JNB', arr:'CDG', route:'Johannesburg → Paris', airline:'Air France' }],
  // Bamako
  AF794:  [{ dep:'CDG', arr:'BKO', route:'Paris → Bamako', airline:'Air France' }],
  AF795:  [{ dep:'BKO', arr:'CDG', route:'Bamako → Paris', airline:'Air France' }],
  // Conakry
  AF798:  [{ dep:'CDG', arr:'CKY', route:'Paris → Conakry', airline:'Air France' }],
  AF799:  [{ dep:'CKY', arr:'CDG', route:'Conakry → Paris', airline:'Air France' }],
  // Cotonou
  AF786:  [{ dep:'CDG', arr:'COO', route:'Paris → Cotonou', airline:'Air France' }],
  AF787:  [{ dep:'COO', arr:'CDG', route:'Cotonou → Paris', airline:'Air France' }],

  // ─── BRUSSELS AIRLINES (SN) ─────────────────────────────────────────────────
  // Règle : on n'inscrit que les routes VÉRIFIÉES. Les autres tombent sur AeroDataBox/LLM.
  // Changer le numéro incorrect → supprimer l'entrée (ne pas garder un mauvais numéro).

  // Dakar → Banjul (milk-run BRU→DSS→BJL, confirmé flightera/aviability)
  SN203:  [
    { dep:'BRU', arr:'DSS', route:'Bruxelles → Dakar',  airline:'Brussels Airlines' },
    { dep:'DSS', arr:'BJL', route:'Dakar → Banjul',      airline:'Brussels Airlines' },
    { dep:'BRU', arr:'BJL', route:'Bruxelles → Banjul',  airline:'Brussels Airlines' },
  ],
  SN204:  [
    { dep:'BJL', arr:'DSS', route:'Banjul → Dakar',       airline:'Brussels Airlines' },
    { dep:'DSS', arr:'BRU', route:'Dakar → Bruxelles',    airline:'Brussels Airlines' },
    { dep:'BJL', arr:'BRU', route:'Banjul → Bruxelles',   airline:'Brussels Airlines' },
  ],

  // Accra + Lomé (milk-run BRU→ACC→LFW, confirmé par test prod)
  SN277:  [
    { dep:'BRU', arr:'ACC', route:'Bruxelles → Accra', airline:'Brussels Airlines' },
    { dep:'ACC', arr:'LFW', route:'Accra → Lomé',       airline:'Brussels Airlines' },
    { dep:'BRU', arr:'LFW', route:'Bruxelles → Lomé',   airline:'Brussels Airlines' },
  ],
  SN278:  [
    { dep:'LFW', arr:'ACC', route:'Lomé → Accra',          airline:'Brussels Airlines' },
    { dep:'ACC', arr:'BRU', route:'Accra → Bruxelles',     airline:'Brussels Airlines' },
    { dep:'LFW', arr:'BRU', route:'Lomé → Bruxelles',      airline:'Brussels Airlines' },
  ],

  // Cotonou + Abidjan (milk-run BRU→COO→ABJ, structure réseau connue)
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

  // Kinshasa (confirmé flightaware BEL357/358)
  SN357:  [{ dep:'BRU', arr:'FIH', route:'Bruxelles → Kinshasa', airline:'Brussels Airlines' }],
  SN358:  [{ dep:'FIH', arr:'BRU', route:'Kinshasa → Bruxelles', airline:'Brussels Airlines' }],

  // ─── KLM (KL) ───────────────────────────────────────────────────────────────
  KL571:  [{ dep:'AMS', arr:'ABJ', route:'Amsterdam → Abidjan', airline:'KLM' }],
  KL572:  [{ dep:'ABJ', arr:'AMS', route:'Abidjan → Amsterdam', airline:'KLM' }],
  KL585:  [{ dep:'AMS', arr:'ACC', route:'Amsterdam → Accra', airline:'KLM' }],
  KL586:  [{ dep:'ACC', arr:'AMS', route:'Accra → Amsterdam', airline:'KLM' }],
  KL587:  [{ dep:'AMS', arr:'LOS', route:'Amsterdam → Lagos', airline:'KLM' }],
  KL588:  [{ dep:'LOS', arr:'AMS', route:'Lagos → Amsterdam', airline:'KLM' }],
  KL589:  [{ dep:'AMS', arr:'NBO', route:'Amsterdam → Nairobi', airline:'KLM' }],
  KL590:  [{ dep:'NBO', arr:'AMS', route:'Nairobi → Amsterdam', airline:'KLM' }],
  KL591:  [{ dep:'AMS', arr:'DSS', route:'Amsterdam → Dakar', airline:'KLM' }],
  KL592:  [{ dep:'DSS', arr:'AMS', route:'Dakar → Amsterdam', airline:'KLM' }],
  KL575:  [{ dep:'AMS', arr:'DLA', route:'Amsterdam → Douala', airline:'KLM' }],
  KL576:  [{ dep:'DLA', arr:'AMS', route:'Douala → Amsterdam', airline:'KLM' }],
  KL579:  [{ dep:'AMS', arr:'JNB', route:'Amsterdam → Johannesburg', airline:'KLM' }],
  KL580:  [{ dep:'JNB', arr:'AMS', route:'Johannesburg → Amsterdam', airline:'KLM' }],

  // ─── ROYAL AIR MAROC (AT) ───────────────────────────────────────────────────
  AT702:  [{ dep:'CDG', arr:'CMN', route:'Paris → Casablanca', airline:'Royal Air Maroc' }],
  AT703:  [{ dep:'CMN', arr:'CDG', route:'Casablanca → Paris', airline:'Royal Air Maroc' }],
  AT700:  [{ dep:'CMN', arr:'DSS', route:'Casablanca → Dakar', airline:'Royal Air Maroc' }],
  AT701:  [{ dep:'DSS', arr:'CMN', route:'Dakar → Casablanca', airline:'Royal Air Maroc' }],
  AT520:  [{ dep:'CMN', arr:'ABJ', route:'Casablanca → Abidjan', airline:'Royal Air Maroc' }],
  AT521:  [{ dep:'ABJ', arr:'CMN', route:'Abidjan → Casablanca', airline:'Royal Air Maroc' }],
  AT530:  [{ dep:'CMN', arr:'LOS', route:'Casablanca → Lagos', airline:'Royal Air Maroc' }],
  AT531:  [{ dep:'LOS', arr:'CMN', route:'Lagos → Casablanca', airline:'Royal Air Maroc' }],
  AT540:  [{ dep:'CMN', arr:'ACC', route:'Casablanca → Accra', airline:'Royal Air Maroc' }],
  AT541:  [{ dep:'ACC', arr:'CMN', route:'Accra → Casablanca', airline:'Royal Air Maroc' }],
  AT672:  [{ dep:'CMN', arr:'DLA', route:'Casablanca → Douala', airline:'Royal Air Maroc' }],
  AT673:  [{ dep:'DLA', arr:'CMN', route:'Douala → Casablanca', airline:'Royal Air Maroc' }],
  AT627:  [{ dep:'CMN', arr:'BKO', route:'Casablanca → Bamako', airline:'Royal Air Maroc' }],
  AT628:  [{ dep:'BKO', arr:'CMN', route:'Bamako → Casablanca', airline:'Royal Air Maroc' }],

  // ─── AIR SÉNÉGAL (HC) ───────────────────────────────────────────────────────
  HC401:  [{ dep:'DSS', arr:'CDG', route:'Dakar → Paris', airline:'Air Sénégal' }],
  HC402:  [{ dep:'CDG', arr:'DSS', route:'Paris → Dakar', airline:'Air Sénégal' }],
  HC403:  [{ dep:'DSS', arr:'ORY', route:'Dakar → Paris (Orly)', airline:'Air Sénégal' }],
  HC404:  [{ dep:'ORY', arr:'DSS', route:'Paris (Orly) → Dakar', airline:'Air Sénégal' }],
  HC421:  [{ dep:'DSS', arr:'ABJ', route:'Dakar → Abidjan', airline:'Air Sénégal' }],
  HC422:  [{ dep:'ABJ', arr:'DSS', route:'Abidjan → Dakar', airline:'Air Sénégal' }],
  HC431:  [{ dep:'DSS', arr:'BKO', route:'Dakar → Bamako', airline:'Air Sénégal' }],
  HC432:  [{ dep:'BKO', arr:'DSS', route:'Bamako → Dakar', airline:'Air Sénégal' }],

  // ─── ASKY (KP) ──────────────────────────────────────────────────────────────
  KP201:  [{ dep:'LFW', arr:'CDG', route:'Lomé → Paris', airline:'ASKY' }],
  KP202:  [{ dep:'CDG', arr:'LFW', route:'Paris → Lomé', airline:'ASKY' }],
  KP211:  [{ dep:'LFW', arr:'DSS', route:'Lomé → Dakar', airline:'ASKY' }],
  KP212:  [{ dep:'DSS', arr:'LFW', route:'Dakar → Lomé', airline:'ASKY' }],
  KP221:  [{ dep:'LFW', arr:'ABJ', route:'Lomé → Abidjan', airline:'ASKY' }],
  KP222:  [{ dep:'ABJ', arr:'LFW', route:'Abidjan → Lomé', airline:'ASKY' }],
  KP231:  [{ dep:'LFW', arr:'ACC', route:'Lomé → Accra', airline:'ASKY' }],
  KP232:  [{ dep:'ACC', arr:'LFW', route:'Accra → Lomé', airline:'ASKY' }],

  // ─── ETHIOPIAN AIRLINES (ET) ────────────────────────────────────────────────
  ET700:  [{ dep:'CDG', arr:'ADD', route:'Paris → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET701:  [{ dep:'ADD', arr:'CDG', route:'Addis-Abeba → Paris', airline:'Ethiopian Airlines' }],
  ET702:  [{ dep:'BRU', arr:'ADD', route:'Bruxelles → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET703:  [{ dep:'ADD', arr:'BRU', route:'Addis-Abeba → Bruxelles', airline:'Ethiopian Airlines' }],
  ET730:  [{ dep:'ADD', arr:'NBO', route:'Addis-Abeba → Nairobi', airline:'Ethiopian Airlines' }],
  ET731:  [{ dep:'NBO', arr:'ADD', route:'Nairobi → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET306:  [{ dep:'ADD', arr:'DSS', route:'Addis-Abeba → Dakar', airline:'Ethiopian Airlines' }],
  ET307:  [{ dep:'DSS', arr:'ADD', route:'Dakar → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET312:  [{ dep:'ADD', arr:'ABJ', route:'Addis-Abeba → Abidjan', airline:'Ethiopian Airlines' }],
  ET313:  [{ dep:'ABJ', arr:'ADD', route:'Abidjan → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET316:  [{ dep:'ADD', arr:'LOS', route:'Addis-Abeba → Lagos', airline:'Ethiopian Airlines' }],
  ET317:  [{ dep:'LOS', arr:'ADD', route:'Lagos → Addis-Abeba', airline:'Ethiopian Airlines' }],
  ET322:  [{ dep:'ADD', arr:'FIH', route:'Addis-Abeba → Kinshasa', airline:'Ethiopian Airlines' }],
  ET323:  [{ dep:'FIH', arr:'ADD', route:'Kinshasa → Addis-Abeba', airline:'Ethiopian Airlines' }],

  // ─── TURKISH AIRLINES (TK) ──────────────────────────────────────────────────
  TK1783: [{ dep:'IST', arr:'DSS', route:'Istanbul → Dakar', airline:'Turkish Airlines' }],
  TK1784: [{ dep:'DSS', arr:'IST', route:'Dakar → Istanbul', airline:'Turkish Airlines' }],
  TK593:  [{ dep:'IST', arr:'ABJ', route:'Istanbul → Abidjan', airline:'Turkish Airlines' }],
  TK594:  [{ dep:'ABJ', arr:'IST', route:'Abidjan → Istanbul', airline:'Turkish Airlines' }],
  TK643:  [{ dep:'IST', arr:'LOS', route:'Istanbul → Lagos', airline:'Turkish Airlines' }],
  TK644:  [{ dep:'LOS', arr:'IST', route:'Lagos → Istanbul', airline:'Turkish Airlines' }],
  TK609:  [{ dep:'IST', arr:'NBO', route:'Istanbul → Nairobi', airline:'Turkish Airlines' }],
  TK610:  [{ dep:'NBO', arr:'IST', route:'Nairobi → Istanbul', airline:'Turkish Airlines' }],
  TK651:  [{ dep:'IST', arr:'ACC', route:'Istanbul → Accra', airline:'Turkish Airlines' }],
  TK652:  [{ dep:'ACC', arr:'IST', route:'Accra → Istanbul', airline:'Turkish Airlines' }],
  TK591:  [{ dep:'IST', arr:'DLA', route:'Istanbul → Douala', airline:'Turkish Airlines' }],
  TK592:  [{ dep:'DLA', arr:'IST', route:'Douala → Istanbul', airline:'Turkish Airlines' }],

  // ─── TRANSAVIA (TO) ─────────────────────────────────────────────────────────
  TO760:  [{ dep:'ORY', arr:'CMN', route:'Paris (Orly) → Casablanca', airline:'Transavia' }],
  TO761:  [{ dep:'CMN', arr:'ORY', route:'Casablanca → Paris (Orly)', airline:'Transavia' }],
  TO762:  [{ dep:'ORY', arr:'RAK', route:'Paris (Orly) → Marrakech', airline:'Transavia' }],
  TO763:  [{ dep:'RAK', arr:'ORY', route:'Marrakech → Paris (Orly)', airline:'Transavia' }],
  TO764:  [{ dep:'ORY', arr:'AGA', route:'Paris (Orly) → Agadir', airline:'Transavia' }],
  TO765:  [{ dep:'AGA', arr:'ORY', route:'Agadir → Paris (Orly)', airline:'Transavia' }],
  TO800:  [{ dep:'ORY', arr:'TUN', route:'Paris (Orly) → Tunis', airline:'Transavia' }],
  TO801:  [{ dep:'TUN', arr:'ORY', route:'Tunis → Paris (Orly)', airline:'Transavia' }],
  TO802:  [{ dep:'ORY', arr:'ALG', route:'Paris (Orly) → Alger', airline:'Transavia' }],
  TO803:  [{ dep:'ALG', arr:'ORY', route:'Alger → Paris (Orly)', airline:'Transavia' }],
  TO804:  [{ dep:'ORY', arr:'DSS', route:'Paris (Orly) → Dakar', airline:'Transavia' }],
  TO805:  [{ dep:'DSS', arr:'ORY', route:'Dakar → Paris (Orly)', airline:'Transavia' }],

  // ─── KENYA AIRWAYS (KQ) ─────────────────────────────────────────────────────
  KQ101:  [{ dep:'NBO', arr:'CDG', route:'Nairobi → Paris', airline:'Kenya Airways' }],
  KQ102:  [{ dep:'CDG', arr:'NBO', route:'Paris → Nairobi', airline:'Kenya Airways' }],
  KQ117:  [{ dep:'NBO', arr:'LOS', route:'Nairobi → Lagos', airline:'Kenya Airways' }],
  KQ118:  [{ dep:'LOS', arr:'NBO', route:'Lagos → Nairobi', airline:'Kenya Airways' }],
  KQ421:  [{ dep:'NBO', arr:'BJM', route:'Nairobi → Bujumbura', airline:'Kenya Airways' }],
  KQ422:  [{ dep:'BJM', arr:'NBO', route:'Bujumbura → Nairobi', airline:'Kenya Airways' }],
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
