/**
 * Hubs bandeau — Afrique subsaharienne (hors Maghreb / Égypte / Libye).
 * IATA + ICAO pour AeroDataBox /flights/airports/icao/{icao}/...
 */

const { getPinnedCorrespondanceHubs } = require('./pinned-flights');

/** Pays Afrique du Nord exclus du bandeau diaspora. */
const AFRICA_NORTH_COUNTRY = new Set(['MA', 'DZ', 'TN', 'EG', 'LY']);

/** Afrique subsaharienne pour filtre trajet (pays ISO). */
function isSubSaharanAfricaCountry(code) {
  const c = (code || '').toUpperCase();
  if (!c || AFRICA_NORTH_COUNTRY.has(c)) return false;
  const SUBSAHARAN = [
    'SN', 'ML', 'CI', 'GN', 'GM', 'GW', 'SL', 'LR', 'BF', 'NE', 'TG', 'BJ', 'NG', 'GH', 'CM', 'GA', 'CG', 'CD',
    'CF', 'TD', 'GQ', 'ST', 'AO', 'ZM', 'ZW', 'MW', 'MZ', 'MG', 'MU', 'SC', 'KM', 'TZ', 'UG', 'KE', 'RW', 'BI',
    'ET', 'DJ', 'ER', 'SO', 'SS', 'SD', 'ZA', 'LS', 'SZ', 'BW', 'NA', 'CV', 'MR',
  ];
  return SUBSAHARAN.includes(c);
}

/** ~40 aéroports subsahariens (capitales + hubs diaspora). */
const TICKER_AFRICA_HUBS = [
  'DSS', 'DKR', 'BKO', 'OUA', 'NIM', 'CKY', 'FNA', 'ROB', 'ABJ', 'COO', 'LFW', 'ACC', 'BJL', 'OXB',
  'LOS', 'ABV', 'KAN', 'PHC', 'DLA', 'NSI', 'LBV', 'BZV', 'PNR', 'FIH', 'FKI', 'FBM', 'GOM', 'LAD',
  'NDJ', 'BGF', 'ADD', 'NBO', 'MBA', 'EBB', 'KGL', 'DAR', 'JRO', 'ZNZ', 'TNR', 'MRU', 'MPM',
  'LUN', 'HRE', 'JNB', 'CPT', 'DUR', 'WDH', 'JIB',
];

const AFRICA_HUB_ICAO = {
  DSS: 'GOBD',
  DKR: 'GOOY',
  BKO: 'GABS',
  OUA: 'DFFD',
  NIM: 'DRRN',
  CKY: 'GUCY',
  FNA: 'GFLL',
  ROB: 'GLRB',
  ABJ: 'DIAP',
  COO: 'DBBB',
  LFW: 'DXXX',
  ACC: 'DGAA',
  BJL: 'GBYD',
  OXB: 'GGOV',
  LOS: 'DNMM',
  ABV: 'DNAA',
  KAN: 'DNKA',
  PHC: 'DNPO',
  DLA: 'FKKD',
  NSI: 'FKYS',
  LBV: 'FOOL',
  BZV: 'FCBB',
  PNR: 'FCPP',
  FIH: 'FZAA',
  FKI: 'FZIC',
  FBM: 'FZQA',
  GOM: 'FZNA',
  LAD: 'FBLA',
  NDJ: 'FTTJ',
  BGF: 'FEFF',
  ADD: 'HAAB',
  NBO: 'HKJK',
  MBA: 'HKMO',
  EBB: 'HUEN',
  KGL: 'HRYR',
  DAR: 'HTDA',
  JRO: 'HTKJ',
  ZNZ: 'HTZA',
  TNR: 'FMMI',
  MRU: 'FIMP',
  MPM: 'FQMA',
  LUN: 'FLLS',
  HRE: 'FVHA',
  JNB: 'FAOR',
  CPT: 'FACT',
  DUR: 'FALE',
  WDH: 'FYWH',
  JIB: 'HDAM',
  /* Hub correspondance (RAM) — scanné quand des routes pinnées sont actives. */
  CMN: 'GMMN',
};

/** Hubs Europe (départs diaspora) — toujours scannés. */
const BANNER_EU_HUBS = ['CDG', 'ORY', 'RUN'];

function parseExtraHubsFromEnv() {
  const raw = process.env.TICKER_EXTRA_AFRICA_HUBS || '';
  if (!raw.trim()) return [];
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase().slice(0, 3))
    .filter((s) => s.length === 3);
}

function getTickerAfricaHubs() {
  const extra = parseExtraHubsFromEnv();
  const seen = new Set();
  const out = [];
  for (const h of [...TICKER_AFRICA_HUBS, ...extra]) {
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out;
}

/** Rotation : chaque run scanne EU + hubs correspondance pinnés + un lot d’aéroports africains. */
function getBannerHubsForRun(runIndex) {
  const africa = getTickerAfricaHubs();
  const perRun = Math.min(
    africa.length,
    Math.max(8, parseInt(process.env.TICKER_AFRICA_HUBS_PER_RUN || '12', 10) || 12)
  );
  const idx = ((runIndex || 0) * perRun) % Math.max(africa.length, 1);
  const slice = [];
  for (let i = 0; i < perRun && i < africa.length; i++) {
    slice.push(africa[(idx + i) % africa.length]);
  }
  /* Hubs correspondance (ex: CMN tant que la suspension RAM Afrique centrale dure) :
   * toujours scannés en plus du lot tournant, pour détecter d'autres annulations
   * sur ces routes au-delà des vols pinnés statiques. */
  const correspondance = getPinnedCorrespondanceHubs();
  return [...BANNER_EU_HUBS, ...correspondance, ...slice];
}

function getBannerHubsFull() {
  return [
    ...BANNER_EU_HUBS,
    ...getPinnedCorrespondanceHubs(),
    ...getTickerAfricaHubs(),
  ];
}

module.exports = {
  AFRICA_NORTH_COUNTRY,
  isSubSaharanAfricaCountry,
  TICKER_AFRICA_HUBS,
  AFRICA_HUB_ICAO,
  BANNER_EU_HUBS,
  getTickerAfricaHubs,
  getBannerHubsForRun,
  getBannerHubsFull,
};
