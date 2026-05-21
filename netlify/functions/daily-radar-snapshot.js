/**
 * daily-radar-snapshot — Robin des Airs
 *
 * Tâche planifiée : chaque matin à 8h (heure de Paris).
 * Netlify cron : "0 6 * * *"  (= 8h CEST / 7h CET — couvre les deux)
 *
 * Récupère les vols impactés du jour via AeroDataBox,
 * filtre les 10 pires (annulés > retard desc) sur routes Europe↔Afrique,
 * et stocke le résultat dans Netlify Blobs (clé : radar-daily-snapshot).
 *
 * Le bandeau du site lit ce snapshot via /api/radar-snapshot.
 */

let blobs = null;
try { blobs = require('@netlify/blobs'); } catch (_) {}

const STORE_NAME = 'robin-radar';

// ─── Même logique de pays que radar.js ──────────────────────────────────────
const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','CH','GB']);
const AF = new Set(['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW','RE','GP','MQ']);

const AIRPORT_COUNTRY = {
  // ── France métropole + DOM ──
  CDG:'FR',ORY:'FR',MRS:'FR',LYS:'FR',NCE:'FR',BOD:'FR',TLS:'FR',NTE:'FR',
  LIL:'FR',SXB:'FR',RUN:'RE',PTP:'GP',FDF:'MQ',DZA:'FR',
  // ── Europe — hub avec lignes Afrique directes ──
  BRU:'BE',CRL:'BE',                          // Belgique
  AMS:'NL',EIN:'NL',                          // Pays-Bas
  LHR:'GB',LGW:'GB',STN:'GB',MAN:'GB',        // Royaume-Uni
  FRA:'DE',MUC:'DE',DUS:'DE',BER:'DE',HAM:'DE',// Allemagne
  MAD:'ES',BCN:'ES',PMI:'ES',AGP:'ES',VLC:'ES',// Espagne
  LIS:'PT',OPO:'PT',FAO:'PT',                 // Portugal
  FCO:'IT',MXP:'IT',LIN:'IT',NAP:'IT',        // Italie
  GVA:'CH',ZRH:'CH',BSL:'CH',                 // Suisse
  VIE:'AT',                                   // Autriche
  CPH:'DK',                                   // Danemark
  OSL:'NO',                                   // Norvège
  ARN:'SE',GOT:'SE',                          // Suède
  HEL:'FI',                                   // Finlande
  DUB:'IE',                                   // Irlande
  ATH:'GR',HER:'GR',                          // Grèce
  WAW:'PL',KRK:'PL',                          // Pologne
  PRG:'CZ',                                   // République tchèque
  BUD:'HU',                                   // Hongrie
  IST:'TR',SAW:'TR',                          // Turquie (hub majeur Afrique)
  // ── Afrique du Nord (mapping pays uniquement — hubs non interrogés, <3500 km) ──
  CMN:'MA',RAK:'MA',TNG:'MA',AGA:'MA',        // Maroc
  ALG:'DZ',ORN:'DZ',CZL:'DZ',                 // Algérie
  TUN:'TN',SFA:'TN',                          // Tunisie
  CAI:'EG',HBE:'EG',SSH:'EG',                 // Égypte
  TIP:'LY',MJI:'LY',                          // Libye
  // ── Afrique subsaharienne — Ouest ──
  DSS:'SN',DKR:'SN',                          // Sénégal
  ABJ:'CI',                                   // Côte d'Ivoire
  BKO:'ML',                                   // Mali
  NIM:'NE',                                   // Niger
  OUA:'BF',                                   // Burkina Faso
  NDJ:'TD',                                   // Tchad
  COO:'BJ',                                   // Bénin
  LFW:'TG',                                   // Togo
  CKY:'GN',                                   // Guinée Conakry
  OXB:'GW',                                   // Guinée-Bissau
  BJL:'GM',                                   // Gambie
  FNA:'SL',                                   // Sierra Leone
  ROB:'LR',                                   // Libéria
  ACC:'GH',                                   // Ghana
  LOS:'NG',ABV:'NG',KAN:'NG',                 // Nigeria
  // ── Afrique centrale ──
  DLA:'CM',NSI:'CM',                          // Cameroun
  LBV:'GA',                                   // Gabon
  BZV:'CG',                                   // Congo Brazzaville
  FIH:'CD',MNB:'CD',                          // Congo Kinshasa
  BGF:'CF',                                   // Centrafrique
  SSG:'GQ',                                   // Guinée Équatoriale
  SID:'CV',                                   // Cap-Vert
  // ── Afrique de l'Est ──
  ADD:'ET',DIR:'ET',                          // Éthiopie
  NBO:'KE',MBA:'KE',                          // Kenya
  DAR:'TZ',ZNZ:'TZ',JRO:'TZ',                 // Tanzanie
  EBB:'UG',                                   // Ouganda
  KGL:'RW',                                   // Rwanda
  BJM:'BI',                                   // Burundi
  JIB:'DJ',                                   // Djibouti
  HGA:'SO',MGQ:'SO',                          // Somalie
  // ── Afrique australe ──
  JNB:'ZA',CPT:'ZA',DUR:'ZA',PLZ:'ZA',        // Afrique du Sud
  LAD:'AO',                                   // Angola
  MPM:'MZ',                                   // Mozambique
  LUN:'ZM',                                   // Zambie
  HRE:'ZW',BUQ:'ZW',                          // Zimbabwe
  GBE:'BW',                                   // Botswana
  WDH:'NA',                                   // Namibie
  MTS:'SZ',                                   // Eswatini
  // ── Océan Indien + îles ──
  TNR:'MG',MOQ:'MG',                          // Madagascar
  MRU:'MU',                                   // Maurice
  SEZ:'SC',                                   // Seychelles
  NKC:'MR',                                   // Mauritanie
};

function country(iata) { return AIRPORT_COUNTRY[(iata||'').toUpperCase()] || null; }
function isEuAfRoute(dep, arr) {
  const dc = country(dep), ac = country(arr);
  if (!dc || !ac) return false;
  return (EU.has(dc) && AF.has(ac)) || (AF.has(dc) && EU.has(ac));
}

// ─── Hubs interrogés via AeroDataBox ─────────────────────────────────────────
// Afrique du Nord EXCLUE (distances < 3500 km → indemnité max 250€, pas 600€)
const HUBS = [
  // ── France métropole + DOM ──
  { iata:'CDG', icao:'LFPG' }, { iata:'ORY', icao:'LFPO' }, { iata:'MRS', icao:'LFML' },
  { iata:'LYS', icao:'LFLL' }, { iata:'NCE', icao:'LFMN' }, { iata:'BOD', icao:'LFBD' },
  { iata:'TLS', icao:'LFBO' }, { iata:'NTE', icao:'LFRS' }, { iata:'RUN', icao:'FMEE' },
  // ── Europe — hubs avec vols Afrique sub-saharienne ──
  { iata:'BRU', icao:'EBBR' }, { iata:'AMS', icao:'EHAM' },
  { iata:'LHR', icao:'EGLL' }, { iata:'LGW', icao:'EGKK' },
  { iata:'FRA', icao:'EDDF' }, { iata:'MUC', icao:'EDDM' },
  { iata:'MAD', icao:'LEMD' }, { iata:'BCN', icao:'LEBL' },
  { iata:'LIS', icao:'LPPT' }, { iata:'OPO', icao:'LPPR' },
  { iata:'FCO', icao:'LIRF' }, { iata:'MXP', icao:'LIMC' },
  { iata:'GVA', icao:'LSGG' }, { iata:'ZRH', icao:'LSZH' },
  { iata:'VIE', icao:'LOWW' },
  // IST (Istanbul) NON interrogé : TK n'est pas compagnie UE → vols IST→Afrique hors CE 261.
  // Les vols EU→IST (ex: CDG→IST) sont déjà capturés via CDG, FRA, AMS, etc.
  // ── Afrique subsaharienne Ouest ──
  { iata:'DSS', icao:'GOBD' }, { iata:'ABJ', icao:'DIAP' },
  { iata:'ACC', icao:'DGAA' }, { iata:'LOS', icao:'DNMM' },
  { iata:'BKO', icao:'GABS' }, { iata:'OUA', icao:'DFFD' },
  { iata:'CKY', icao:'GUCY' }, { iata:'COO', icao:'DBBB' },
  { iata:'DLA', icao:'FKKD' }, { iata:'BJL', icao:'GBYD' },
  { iata:'LFW', icao:'DXXX' }, { iata:'FNA', icao:'GFLL' },
  { iata:'SID', icao:'GVNP' },                               // Cap-Vert
  // ── Afrique centrale ──
  { iata:'LBV', icao:'FOOL' }, { iata:'BZV', icao:'FCBB' },
  { iata:'FIH', icao:'FZAA' }, { iata:'NSI', icao:'FKYS' },
  // ── Afrique de l'Est ──
  { iata:'ADD', icao:'HAAB' }, { iata:'NBO', icao:'HKJK' },
  { iata:'DAR', icao:'HTDA' }, { iata:'EBB', icao:'HUEN' },
  { iata:'KGL', icao:'HRYR' }, { iata:'JIB', icao:'HDAM' },
  // ── Afrique australe ──
  { iata:'JNB', icao:'FAOR' }, { iata:'CPT', icao:'FACT' },
  { iata:'LAD', icao:'FNLU' }, { iata:'MPM', icao:'FQMA' },
  { iata:'LUN', icao:'FLLS' }, { iata:'WDH', icao:'FYWH' },
  // ── Océan Indien + îles ──
  { iata:'TNR', icao:'FMMI' }, { iata:'MRU', icao:'FIMP' },
  { iata:'SEZ', icao:'FSIA' },
];

function parisYmd() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
  return parts.find(p=>p.type==='year').value + '-' + parts.find(p=>p.type==='month').value + '-' + parts.find(p=>p.type==='day').value;
}

async function fetchHub(icao, from, to, dir, key) {
  const host = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com';
  const params = new URLSearchParams({ withLeg:'true', direction:dir, withCancelled:'true', withCodeshared:'false', withCargo:'false', withPrivate:'false', withLocation:'false' });
  const url = `https://${host}/flights/airports/icao/${icao}/${from}/${to}?${params}`;
  try {
    const r = await fetch(url, { headers:{ 'x-rapidapi-host':host, 'x-rapidapi-key':key, Accept:'application/json' } });
    if (!r.ok) {
      console.error(`fetchHub ${icao} ${dir} HTTP ${r.status}: ${await r.text().catch(()=>'')}`);
      return [];
    }
    const j = await r.json().catch(()=>({}));
    const k = dir==='Arrival'?'arrivals':'departures';
    return Array.isArray(j[k]) ? j[k] : [];
  } catch (err) {
    console.error(`fetchHub ${icao} ${dir} NETWORK ERROR: ${err.message}`);
    return [];
  }
}

function delayMin(sched, actual) {
  if (!sched || !actual) return 0;
  const d = (new Date(actual) - new Date(sched)) / 60000;
  return d > 0 ? Math.round(d) : 0;
}

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dep = raw.departure || {}, arr = raw.arrival || {};
  const depAp = dep.airport || {}, arrAp = arr.airport || {};
  const depIata = String(depAp.iata || dep.iataCode || '').toUpperCase().slice(0,3);
  const arrIata = String(arrAp.iata || arr.iataCode || '').toUpperCase().slice(0,3);
  if (!depIata || !arrIata) return null;

  const airline = raw.airline || {};
  let num = String(raw.number || raw.flightNumber || '').replace(/\s/g,'');
  const airlineIata = String(airline.iata || '').toUpperCase().slice(0,2);
  if (!num && airlineIata) num = airlineIata;
  const flightIata = num.toUpperCase() || '—';

  const cancelled = /cancel/i.test(String(raw.status||''));
  const schedDep = dep.scheduledTimeUtc || dep.scheduledTimeLocal;
  const actDep   = dep.actualTimeUtc   || dep.actualTimeLocal   || dep.estimatedTimeUtc;
  const schedArr = arr.scheduledTimeUtc || arr.scheduledTimeLocal;
  const actArr   = arr.actualTimeUtc   || arr.actualTimeLocal   || arr.estimatedTimeUtc;

  let retardMin = typeof dep.delay==='number' ? dep.delay : typeof arr.delay==='number' ? arr.delay : delayMin(schedDep, actDep);
  if (!retardMin && actArr) retardMin = delayMin(schedArr, actArr);

  return {
    flight:    flightIata,
    airline:   airlineIata || flightIata.slice(0,2),
    dep:       depIata,
    arr:       arrIata,
    depNom:    depAp.name || depIata,
    arrNom:    arrAp.name || arrIata,
    cancelled,
    retardMin: cancelled ? null : (retardMin > 0 ? retardMin : 0),
    schedDep,
    schedArr,
    date:      (schedDep||'').slice(0,10),
    status:    raw.status || '—',
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const rapidKey = process.env.RAPIDAPI_KEY || process.env.AERODATABOX_RAPIDAPI_KEY || '';
  if (!rapidKey) {
    console.error('daily-radar-snapshot: RAPIDAPI_KEY manquant');
    return { statusCode: 500, body: 'RAPIDAPI_KEY manquant' };
  }
  console.log(`daily-radar-snapshot: clé détectée (finit par ...${rapidKey.slice(-4)}), host=${process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com'}, hubs=${HUBS.length}`);

  const dateStr = parisYmd();
  const windows = [
    [`${dateStr}T00:00`, `${dateStr}T11:59`],
    [`${dateStr}T12:00`, `${dateStr}T23:59`],
  ];

  // Rate limit RapidAPI Pro = 1 req/sec → appels séquentiels espacés de 1.1s
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rawFlights = [];
  for (const hub of HUBS) {
    for (const [a, b] of windows) {
      const deps = await fetchHub(hub.icao, a, b, 'Departure', rapidKey);
      await sleep(1100);
      const arrs = await fetchHub(hub.icao, a, b, 'Arrival', rapidKey);
      await sleep(1100);
      for (const r of [...deps, ...arrs]) {
        const n = normalise(r);
        if (n) rawFlights.push(n);
      }
    }
  }

  // Dédoublonner par (flight + dep + arr + date)
  const seen = new Set();
  const unique = rawFlights.filter(f => {
    const k = `${f.flight}|${f.dep}|${f.arr}|${f.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Filtrer : routes Europe↔Afrique, annulés OU retard ≥ 30 min
  const impacted = unique.filter(f =>
    isEuAfRoute(f.dep, f.arr) &&
    (f.cancelled || (f.retardMin != null && f.retardMin >= 30))
  );

  // Trier : annulés en tête, puis retard décroissant
  impacted.sort((a, b) => {
    if (a.cancelled && !b.cancelled) return -1;
    if (!a.cancelled && b.cancelled) return 1;
    return (b.retardMin || 0) - (a.retardMin || 0);
  });

  // Top 10
  const top10 = impacted.slice(0, 10);

  const snapshot = {
    flights:     top10,
    date:        dateStr,
    updatedAt:   new Date().toISOString(),
    total:       impacted.length,
    dataSource:  'aerodatabox',
  };

  // Enregistrer dans Netlify Blobs
  if (blobs) {
    try {
      if (blobs.connectLambda && event) blobs.connectLambda(event);
      const store = blobs.getStore(STORE_NAME);
      await store.setJSON('radar-daily-snapshot', snapshot);
      console.log(`daily-radar-snapshot: ${top10.length} vols stockés (${dateStr})`);
    } catch (e) {
      console.error('daily-radar-snapshot: blobs error', e.message);
    }
  } else {
    console.warn('daily-radar-snapshot: Netlify Blobs non disponible');
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, date: dateStr, count: top10.length }),
  };
};
