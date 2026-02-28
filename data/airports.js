/**
 * Aéroports commerciaux — Nom ville + Code IATA
 * Priorisés en tête : Paris CDG/ORY, Dakar DSS, Lyon, Marseille, Casablanca, Bruxelles
 * Valeur envoyée au webhook : code IATA (value)
 */
(function() {
  var PRIO = [
    { value: "CDG", text: "Paris — CDG", city: "Paris", country: "France" },
    { value: "ORY", text: "Paris — ORY", city: "Paris", country: "France" },
    { value: "DSS", text: "Dakar — DSS", city: "Dakar", country: "Sénégal" },
    { value: "LYS", text: "Lyon — LYS", city: "Lyon", country: "France" },
    { value: "MRS", text: "Marseille — MRS", city: "Marseille", country: "France" },
    { value: "CMN", text: "Casablanca — CMN", city: "Casablanca", country: "Maroc" },
    { value: "BRU", text: "Bruxelles — BRU", city: "Bruxelles", country: "Belgique" }
  ];
  var REST = [
    { value: "DKR", text: "Dakar — DKR", city: "Dakar", country: "Sénégal" },
    { value: "NCE", text: "Nice — NCE", city: "Nice", country: "France" },
    { value: "TLS", text: "Toulouse — TLS", city: "Toulouse", country: "France" },
    { value: "BOD", text: "Bordeaux — BOD", city: "Bordeaux", country: "France" },
    { value: "NTE", text: "Nantes — NTE", city: "Nantes", country: "France" },
    { value: "GVA", text: "Genève — GVA", city: "Genève", country: "Suisse" },
    { value: "LHR", text: "Londres — LHR", city: "Londres", country: "Royaume-Uni" },
    { value: "LGW", text: "Londres — LGW", city: "Londres", country: "Royaume-Uni" },
    { value: "AMS", text: "Amsterdam — AMS", city: "Amsterdam", country: "Pays-Bas" },
    { value: "FRA", text: "Francfort — FRA", city: "Francfort", country: "Allemagne" },
    { value: "MAD", text: "Madrid — MAD", city: "Madrid", country: "Espagne" },
    { value: "BCN", text: "Barcelone — BCN", city: "Barcelone", country: "Espagne" },
    { value: "LIS", text: "Lisbonne — LIS", city: "Lisbonne", country: "Portugal" },
    { value: "FCO", text: "Rome — FCO", city: "Rome", country: "Italie" },
    { value: "MXP", text: "Milan — MXP", city: "Milan", country: "Italie" },
    { value: "VIE", text: "Vienne — VIE", city: "Vienne", country: "Autriche" },
    { value: "ZRH", text: "Zurich — ZRH", city: "Zurich", country: "Suisse" },
    { value: "CPH", text: "Copenhague — CPH", city: "Copenhague", country: "Danemark" },
    { value: "OSL", text: "Oslo — OSL", city: "Oslo", country: "Norvège" },
    { value: "ARN", text: "Stockholm — ARN", city: "Stockholm", country: "Suède" },
    { value: "HEL", text: "Helsinki — HEL", city: "Helsinki", country: "Finlande" },
    { value: "DUB", text: "Dublin — DUB", city: "Dublin", country: "Irlande" },
    { value: "OPO", text: "Porto — OPO", city: "Porto", country: "Portugal" },
    { value: "ATH", text: "Athènes — ATH", city: "Athènes", country: "Grèce" },
    { value: "IST", text: "Istanbul — IST", city: "Istanbul", country: "Turquie" },
    { value: "ABJ", text: "Abidjan — ABJ", city: "Abidjan", country: "Côte d'Ivoire" },
    { value: "ACC", text: "Accra — ACC", city: "Accra", country: "Ghana" },
    { value: "LOS", text: "Lagos — LOS", city: "Lagos", country: "Nigeria" },
    { value: "ABV", text: "Abuja — ABV", city: "Abuja", country: "Nigeria" },
    { value: "RAK", text: "Marrakech — RAK", city: "Marrakech", country: "Maroc" },
    { value: "ALG", text: "Alger — ALG", city: "Alger", country: "Algérie" },
    { value: "TUN", text: "Tunis — TUN", city: "Tunis", country: "Tunisie" },
    { value: "CAI", text: "Le Caire — CAI", city: "Le Caire", country: "Égypte" },
    { value: "ADD", text: "Addis-Abeba — ADD", city: "Addis-Abeba", country: "Éthiopie" },
    { value: "NBO", text: "Nairobi — NBO", city: "Nairobi", country: "Kenya" },
    { value: "DAR", text: "Dar es Salaam — DAR", city: "Dar es Salaam", country: "Tanzanie" },
    { value: "JNB", text: "Johannesburg — JNB", city: "Johannesburg", country: "Afrique du Sud" },
    { value: "CPT", text: "Le Cap — CPT", city: "Le Cap", country: "Afrique du Sud" },
    { value: "DLA", text: "Douala — DLA", city: "Douala", country: "Cameroun" },
    { value: "NSI", text: "Yaoundé — NSI", city: "Yaoundé", country: "Cameroun" },
    { value: "LBV", text: "Libreville — LBV", city: "Libreville", country: "Gabon" },
    { value: "BZV", text: "Brazzaville — BZV", city: "Brazzaville", country: "Congo" },
    { value: "FIH", text: "Kinshasa — FIH", city: "Kinshasa", country: "RD Congo" },
    { value: "BKO", text: "Bamako — BKO", city: "Bamako", country: "Mali" },
    { value: "OUA", text: "Ouagadougou — OUA", city: "Ouagadougou", country: "Burkina Faso" },
    { value: "NIM", text: "Niamey — NIM", city: "Niamey", country: "Niger" },
    { value: "NDJ", text: "Ndjamena — NDJ", city: "Ndjamena", country: "Tchad" },
    { value: "COO", text: "Cotonou — COO", city: "Cotonou", country: "Bénin" },
    { value: "LFW", text: "Lomé — LFW", city: "Lomé", country: "Togo" },
    { value: "CKY", text: "Conakry — CKY", city: "Conakry", country: "Guinée" },
    { value: "BJL", text: "Banjul — BJL", city: "Banjul", country: "Gambie" },
    { value: "RUN", text: "Saint-Denis — RUN", city: "La Réunion", country: "Réunion" },
    { value: "PTP", text: "Pointe-à-Pitre — PTP", city: "Pointe-à-Pitre", country: "Guadeloupe" },
    { value: "FDF", text: "Fort-de-France — FDF", city: "Fort-de-France", country: "Martinique" },
    { value: "MRU", text: "Port-Louis — MRU", city: "Maurice", country: "Île Maurice" },
    { value: "TNR", text: "Antananarivo — TNR", city: "Antananarivo", country: "Madagascar" },
    { value: "MPM", text: "Maputo — MPM", city: "Maputo", country: "Mozambique" },
    { value: "DXB", text: "Dubaï — DXB", city: "Dubaï", country: "Émirats arabes unis" },
    { value: "DOH", text: "Doha — DOH", city: "Doha", country: "Qatar" },
    { value: "JFK", text: "New York — JFK", city: "New York", country: "États-Unis" },
    { value: "EWR", text: "Newark — EWR", city: "Newark", country: "États-Unis" },
    { value: "MIA", text: "Miami — MIA", city: "Miami", country: "États-Unis" },
    { value: "ATL", text: "Atlanta — ATL", city: "Atlanta", country: "États-Unis" },
    { value: "LAX", text: "Los Angeles — LAX", city: "Los Angeles", country: "États-Unis" },
    { value: "ORD", text: "Chicago — ORD", city: "Chicago", country: "États-Unis" },
    { value: "YYZ", text: "Toronto — YYZ", city: "Toronto", country: "Canada" },
    { value: "YUL", text: "Montréal — YUL", city: "Montréal", country: "Canada" },
    { value: "LGW", text: "Londres Gatwick — LGW", city: "Londres", country: "Royaume-Uni" },
    { value: "BEY", text: "Beyrouth — BEY", city: "Beyrouth", country: "Liban" },
    { value: "NKC", text: "Nouakchott — NKC", city: "Nouakchott", country: "Mauritanie" },
    { value: "SSG", text: "Malabo — SSG", city: "Malabo", country: "Guinée équatoriale" }
  ];
  var seen = {};
  window.AIRPORTS_DATA = [];
  PRIO.forEach(function(a) { seen[a.value] = true; window.AIRPORTS_DATA.push(a); });
  REST.forEach(function(a) { if (!seen[a.value]) { seen[a.value] = true; window.AIRPORTS_DATA.push(a); } });
  window.AIRPORTS_DATA.forEach(function(a) {
    a.search = (a.city + " " + a.country + " " + a.value + " " + (a.text || "")).toLowerCase();
  });
})();
