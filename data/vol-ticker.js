/* Fallback si le radar Netlify (Aviation Edge) est indisponible ou ne renvoie aucun vol filtré.
 * Sur robindesairs.eu, index.html appelle /.netlify/functions/radar puis remplace ce bandeau par des vols réels
 * (éligibles Robin, retard ≥ 3 h ou annulé). Rotation quotidienne pour ce fallback uniquement.
 * Dates recalculées au chargement : aujourd’hui, hier, avant-hier uniquement (affichage « proche » du réel).
 * `route` : codes IATA — villes affichées via AIRPORT_CITY dans index.html. */
(function () {
  function isoDaysAgo(daysBack) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysBack);
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + day;
  }
  var t0 = isoDaysAgo(0);
  var t1 = isoDaysAgo(1);
  var t2 = isoDaysAgo(2);
  window.VOL_TICKER_FLIGHTS = [
    { flight: 'AF718', route: 'CDG → DKR', kind: 'delay', detail: '+4h20', date: t0 },
    { flight: 'SN255', route: 'BRU → DKR', kind: 'delay', detail: '+5h05', date: t0 },
    { flight: 'AT700', route: 'CDG → DKR', kind: 'cancel', detail: '', date: t0 },
    { flight: 'SS892', route: 'DKR → CDG', kind: 'delay', detail: '+3h50', date: t0 },
    { flight: 'ET704', route: 'CDG → ADD', kind: 'delay', detail: '+6h10', date: t0 },
    { flight: 'AF756', route: 'CDG → FIH', kind: 'cancel', detail: '', date: t1 },
    { flight: 'DS780', route: 'ORY → DLA', kind: 'delay', detail: '+4h', date: t1 },
    { flight: 'TO850', route: 'ORY → DKR', kind: 'delay', detail: '+3h35', date: t1 },
    { flight: 'AF703', route: 'DKR → CDG', kind: 'delay', detail: '+7h', date: t1 },
    { flight: 'AF732', route: 'CDG → BKO', kind: 'delay', detail: '+5h40', date: t2 },
    { flight: 'SN401', route: 'BRU → FIH', kind: 'delay', detail: '+4h15', date: t2 },
    { flight: 'AF742', route: 'CDG → DSS', kind: 'cancel', detail: '', date: t2 }
  ];
})();
