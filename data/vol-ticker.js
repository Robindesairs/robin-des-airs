/* Lignes Europe ↔ Afrique — scénarios « du moment » (illustratifs, rotation quotidienne).
 * Champ date ISO (YYYY-MM-DD) pour préremplir le diagnostic.
 * `route` : codes IATA (ex. CDG → DKR) — l’affichage bandeau utilise les villes via AIRPORT_CITY dans index.html. */
window.VOL_TICKER_FLIGHTS = [
  { flight: 'AF718', route: 'CDG → DKR', kind: 'delay', detail: '+4h20', date: '2026-03-08' },
  { flight: 'SN255', route: 'BRU → DKR', kind: 'delay', detail: '+5h05', date: '2026-03-08' },
  { flight: 'AT700', route: 'CDG → DKR', kind: 'cancel', detail: '', date: '2026-03-07' },
  { flight: 'SS892', route: 'DKR → CDG', kind: 'delay', detail: '+3h50', date: '2026-03-07' },
  { flight: 'ET704', route: 'CDG → ADD', kind: 'delay', detail: '+6h10', date: '2026-03-06' },
  { flight: 'AF756', route: 'CDG → FIH', kind: 'cancel', detail: '', date: '2026-03-06' },
  { flight: 'DS780', route: 'ORY → DLA', kind: 'delay', detail: '+4h', date: '2026-03-05' },
  { flight: 'TO850', route: 'ORY → DKR', kind: 'delay', detail: '+3h35', date: '2026-03-05' },
  { flight: 'AF703', route: 'DKR → CDG', kind: 'delay', detail: '+7h', date: '2026-03-04' },
  { flight: 'AF732', route: 'CDG → BKO', kind: 'delay', detail: '+5h40', date: '2026-03-04' },
  { flight: 'SN401', route: 'BRU → FIH', kind: 'delay', detail: '+4h15', date: '2026-03-03' },
  { flight: 'AF742', route: 'CDG → DSS', kind: 'cancel', detail: '', date: '2026-03-03' }
];
