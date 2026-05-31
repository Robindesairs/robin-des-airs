/**
 * Radar Robin des Airs — données réelles via /.netlify/functions/radar (AeroDataBox).
 * Attend le même DOM que radar.html (ids metrics, radar-tbody, modals, etc.).
 */
(function () {
  'use strict';

  // Base 44 destinations (hubs) – simplifie l'outil et évite les faux positifs.
  const AF_AIRPORTS = [
    { code: 'ABJ', ville: 'Abidjan', pays: "Côte d'Ivoire" },
    { code: 'ABV', ville: 'Abuja', pays: 'Nigeria' },
    { code: 'ACC', ville: 'Accra', pays: 'Ghana' },
    { code: 'ADD', ville: 'Addis-Abeba', pays: 'Éthiopie' },
    { code: 'TNR', ville: 'Antananarivo', pays: 'Madagascar' },
    { code: 'BKO', ville: 'Bamako', pays: 'Mali' },
    { code: 'BGF', ville: 'Bangui', pays: 'RCA' },
    { code: 'BJL', ville: 'Banjul', pays: 'Gambie' },
    { code: 'OXB', ville: 'Bissau', pays: 'Guinée-Bissau' },
    { code: 'BZV', ville: 'Brazzaville', pays: 'Congo' },
    { code: 'BJM', ville: 'Bujumbura', pays: 'Burundi' },
    { code: 'CPT', ville: 'Cape Town', pays: 'Afrique du Sud' },
    { code: 'CKY', ville: 'Conakry', pays: 'Guinée' },
    { code: 'COO', ville: 'Cotonou', pays: 'Bénin' },
    { code: 'DSS', ville: 'Dakar', pays: 'Sénégal' },
    { code: 'DAR', ville: 'Dar es Salaam', pays: 'Tanzanie' },
    { code: 'JIB', ville: 'Djibouti', pays: 'Djibouti' },
    { code: 'DLA', ville: 'Douala', pays: 'Cameroun' },
    { code: 'EBB', ville: 'Entebbe', pays: 'Ouganda' },
    { code: 'FNA', ville: 'Freetown', pays: 'Sierra Leone' },
    { code: 'GOM', ville: 'Goma', pays: 'RDC' },
    { code: 'JNB', ville: 'Johannesburg', pays: 'Afrique du Sud' },
    { code: 'KGL', ville: 'Kigali', pays: 'Rwanda' },
    { code: 'JRO', ville: 'Kilimandjaro', pays: 'Tanzanie' },
    { code: 'FIH', ville: 'Kinshasa', pays: 'RDC' },
    { code: 'LOS', ville: 'Lagos', pays: 'Nigeria' },
    { code: 'LBV', ville: 'Libreville', pays: 'Gabon' },
    { code: 'LFW', ville: 'Lomé', pays: 'Togo' },
    { code: 'LAD', ville: 'Luanda', pays: 'Angola' },
    { code: 'SSG', ville: 'Malabo', pays: 'Guinée Équatoriale' },
    { code: 'MPM', ville: 'Maputo', pays: 'Mozambique' },
    { code: 'MRU', ville: 'Maurice', pays: 'Maurice' },
    { code: 'MBA', ville: 'Mombasa', pays: 'Kenya' },
    { code: 'NDJ', ville: "N'Djamena", pays: 'Tchad' },
    { code: 'NBO', ville: 'Nairobi', pays: 'Kenya' },
    { code: 'NIM', ville: 'Niamey', pays: 'Niger' },
    { code: 'OUA', ville: 'Ouagadougou', pays: 'Burkina Faso' },
    { code: 'PNR', ville: 'Pointe-Noire', pays: 'Congo' },
    { code: 'PHC', ville: 'Port Harcourt', pays: 'Nigeria' },
    { code: 'WDH', ville: 'Windhoek', pays: 'Namibie' },
    { code: 'NSI', ville: 'Yaoundé', pays: 'Cameroun' },
    { code: 'ZNZ', ville: 'Zanzibar', pays: 'Tanzanie' },
    { code: 'FBM', ville: 'Lubumbashi', pays: 'RDC' },
    { code: 'HRE', ville: 'Harare', pays: 'Zimbabwe' },
  ];
  const EU_AIRPORTS = [
    { code: 'CDG', ville: 'Paris CDG' },
    { code: 'ORY', ville: 'Paris Orly' },
    { code: 'BRU', ville: 'Bruxelles' },
    { code: 'AMS', ville: 'Amsterdam' },
    { code: 'FCO', ville: 'Rome' },
    { code: 'MXP', ville: 'Milan' },
    { code: 'MAD', ville: 'Madrid' },
    { code: 'LIS', ville: 'Lisbonne' },
    { code: 'ZRH', ville: 'Zurich' },
    { code: 'GVA', ville: 'Genève' },
    { code: 'LHR', ville: 'Londres' },
    { code: 'FRA', ville: 'Francfort' },
    { code: 'NCE', ville: 'Nice' },
    { code: 'LYS', ville: 'Lyon' },
    { code: 'MRS', ville: 'Marseille' },
    { code: 'TLS', ville: 'Toulouse' },
    { code: 'BOD', ville: 'Bordeaux' },
    { code: 'NTE', ville: 'Nantes' },
    { code: 'LGW', ville: 'Londres Gatwick' },
    { code: 'BCN', ville: 'Barcelone' },
    { code: 'MUC', ville: 'Munich' },
    { code: 'CPH', ville: 'Copenhague' },
    { code: 'OSL', ville: 'Oslo' },
    { code: 'DUB', ville: 'Dublin' },
    { code: 'VIE', ville: 'Vienne' },
    { code: 'ATH', ville: 'Athènes' },
    { code: 'LIN', ville: 'Milan Linate' },
  ];

  const AIRLINE_IATA_NAME = {
    AF: 'Air France',
    KL: 'KLM',
    SN: 'Brussels Airlines',
    TP: 'TAP Air Portugal',
    IB: 'Iberia',
    FR: 'Ryanair',
    U2: 'easyJet',
    VY: 'Vueling',
    TO: 'Transavia',
    DS: 'Corsair',
    LH: 'Lufthansa',
    LX: 'Swiss',
    OS: 'Austrian Airlines',
    EI: 'Aer Lingus',
    AT: 'Royal Air Maroc',
    ET: 'Ethiopian Airlines',
    TK: 'Turkish Airlines',
    QR: 'Qatar Airways',
    MS: 'EgyptAir',
    SA: 'South African Airways',
    DT: 'TAAG',
    WB: 'RwandAir',
    HM: 'Air Seychelles',
    MD: 'Air Madagascar',
    P4: 'Air Peace',
    AW: 'Africa World Airlines',
    HF: "Air Côte d'Ivoire",
    KP: 'ASKY',
    SS: 'Corsair',
    IT: 'ITA Airways'
  };

  const CAUSES = ['METEO', 'TECHNIQUE', 'GREVE_INTERNE', 'TRAFIC', 'INCONNUE'];
  const CAUSE_LBL = { METEO: 'Météo', TECHNIQUE: 'Panne technique', GREVE_INTERNE: 'Grève interne', TRAFIC: 'Trafic', INCONNUE: 'Inconnue' };
  const CAUSE_CLS = { METEO: 'cause-meteo', TECHNIQUE: 'cause-technique', GREVE_INTERNE: 'cause-greve', TRAFIC: 'cause-trafic', INCONNUE: 'cause-inconnue' };
  const PHASE_LBL = { TAXI: 'Taxi', DEPART: 'Décollage', VOL: 'En vol', APPROCHE: 'Approche', ATTERRI: 'Atterri', ANNULE: 'Annulé' };
  const PHASE_CLS = { TAXI: 'ph-taxi', DEPART: 'ph-depart', VOL: 'ph-vol', APPROCHE: 'ph-approche', ATTERRI: 'ph-atterri', ANNULE: 'ph-annule' };
  const PRIO_LBL = { URGENT: '🔴 Urgent', HIGH: '🟠 Haute', NORMAL: '🔵 Normal', LOW: '⚪ Basse' };
  const PRIO_CLS = { URGENT: 'prio-urgent', HIGH: 'prio-high', NORMAL: 'prio-normal', LOW: 'prio-low' };

  const EU_IATA_SET = new Set(EU_AIRPORTS.map((a) => a.code));
  const AF_IATA_SET = new Set(AF_AIRPORTS.map((a) => a.code));

  let VOLS = [];
  let ELIGIBLES = [];
  let currentPeriod = 'jour';
  let countdownSec = 25 * 60;
  let currentPubVol = null;
  let metricQuickFilter = null;
  /** @type {{ updatedAt?: string, viewDate?: string, dataSource?: string }|null} */
  let RADAR_META = null;
  let RADAR_ERROR = null;
  let RADAR_LOAD_MODE = 'live';
  let RADAR_DATA_LABEL = '';
  /** @type {Record<string, unknown>|null} */
  let RADAR_LAST_SCAN = null;
  let RETURN_HUB_DISPLAY = 'paris';
  let LAST_SCAN_ZONE_KEY = null;
  var SCAN_LOCK = false;
  var ZONE_LABELS = {
    paris_cdg: 'Paris CDG',
    bru: 'Bruxelles',
    ams: 'Amsterdam',
    eu_south_it: 'Rome · Milan',
    eu_south_ib: 'Lisbonne · Madrid · Barcelone',
    frankfurt: 'Francfort',
  };
  function zoneLabel(key) {
    return ZONE_LABELS[String(key || '').trim()] || String(key || 'Hub');
  }
  function scanRateLimited(scan) {
    if (!scan) return false;
    if (scan.rateLimited || scan.apiHttpStatus === 429) return true;
    if (scan.httpErrors && scan.httpErrors.length) {
      for (var i = 0; i < scan.httpErrors.length; i++) {
        if (scan.httpErrors[i] && scan.httpErrors[i].status === 429) return true;
      }
    }
    return false;
  }
  function scanRateLimitMessage() {
    return (
      'Quota API AeroDataBox / RapidAPI dépassé (HTTP 429). Attendez 1–2 minutes avant un nouveau scan, ' +
      'évitez les scans en rafale (veille + manuel), ou vérifiez votre plan sur rapidapi.com.'
    );
  }

  function formatScanDebug(scan) {
    if (!scan) return '';
    var mode = String(scan.mode || '');
    var parts = [];
    var apiRows = scan.apiRowsFetched != null ? scan.apiRowsFetched : null;
    if (mode === 'return') {
      if (apiRows != null) parts.push(String(apiRows) + ' lignes API (brut)');
      var arrN = scan.rawArrivalCount != null ? scan.rawArrivalCount : scan.rawDepartureCount;
      if (arrN != null) parts.push(String(arrN) + ' parsées');
    } else {
      if (scan.rawDepartureCount != null) parts.push(String(scan.rawDepartureCount) + ' départs API');
      if (scan.rawArrivalCount != null) parts.push(String(scan.rawArrivalCount) + ' arrivées API');
    }
    if (scan.matchedCount != null) parts.push(String(scan.matchedCount) + ' retenus Afrique↔EU');
    if (scan.hub) parts.push('hub ' + scan.hub);
    if (scan.returnSlot) parts.push('créneau ' + scan.returnSlot);
    if (scan.windows && scan.windows.length) {
      var winTxt = scan.windows
        .map(function (w) {
          return w && w.length >= 2 ? w[0] + '→' + w[1] : '';
        })
        .filter(Boolean)
        .join(' ; ');
      if (winTxt) parts.push('fenêtres ' + winTxt);
    }
    if (scanRateLimited(scan)) parts.push('quota 429');
    if (scan.apiRowsFetched === 0 && scan.apiProbeCDG != null && !scanRateLimited(scan)) {
      parts.push('sonde CDG ' + scan.apiProbeCDG + ' vol(s)');
    }
    if (scan.apiError) parts.push('API: ' + scan.apiError);
    if (scan.apiHttpStatus && scan.apiHttpStatus !== 429) parts.push('HTTP ' + scan.apiHttpStatus);
    else if (scan.apiHttpStatus === 429) parts.push('HTTP 429');
    if (scan.httpErrors && scan.httpErrors.length) parts.push('HTTP ' + scan.httpErrors[0].status);
    return parts.join(' · ');
  }

  function resetRadarSensFilter() {
    var sensSel = document.getElementById('r-sens');
    if (sensSel) sensSel.value = '';
    metricQuickFilter = null;
  }

  function setAllerScanStatus(msg, isErr, scanOpt) {
    var el = document.getElementById('aller-scan-status');
    if (!el) return;
    var scan = scanOpt || RADAR_LAST_SCAN;
    var debug = formatScanDebug(scan);
    var text = msg || '';
    if (debug && text.indexOf(debug) < 0) text = text ? text + ' · ' + debug : debug;
    el.textContent = text;
    el.style.color = isErr ? 'var(--red)' : 'var(--text2)';
  }

  function setReturnScanStatusWithDebug(msg, isErr, scanOpt) {
    if (!window.setReturnScanStatus) return;
    var scan = scanOpt || RADAR_LAST_SCAN;
    var debug = formatScanDebug(scan);
    var text = msg || '';
    if (debug && text.indexOf(debug) < 0) text = text ? text + ' · ' + debug : debug;
    window.setReturnScanStatus(text, isErr);
  }

  /** Aligné sur Netlify radar timeout 26s + marge réseau. */
  var RADAR_HTTP_TIMEOUT_MS = 28000;

  function radarFetchInit(extra) {
    var opts = Object.assign({ cache: 'no-store' }, extra || {});
    var ms = (extra && extra.timeoutMs) || RADAR_HTTP_TIMEOUT_MS;
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms);
    }
    return opts;
  }

  function radarFetchErrorMessage(e, kind) {
    if (!e) return 'Erreur réseau';
    var msg = String(e.message || '');
    if (e.name === 'AbortError' || e.name === 'TimeoutError' || msg.toLowerCase().indexOf('abort') >= 0) {
      if (kind === 'return') {
        return 'Scan retour interrompu (délai ~28 s). Réessayez dans 1 min — un seul hub à la fois (ex. Bruxelles).';
      }
      return 'Délai dépassé (~28 s) — réessayez ou un hub à la fois.';
    }
    return msg || 'Erreur réseau';
  }

  window.__radarIsScanning = function () { return SCAN_LOCK; };
  const ZONE_ELIGIBLE_COUNT = {};

  const RETURN_HUB_IATA = {
    paris: new Set(['CDG']),
    bru: new Set(['BRU']),
    ams: new Set(['AMS']),
    fra: new Set(['FRA']),
    south_it: new Set(['FCO', 'MXP', 'LIN']),
    south_ib: new Set(['LIS', 'MAD', 'BCN']),
  };

  function returnHubSetForDisplay(key) {
    var k = String(key || '').trim();
    if (!k || k === 'all') return null;
    return RETURN_HUB_IATA[k] || null;
  }

  function matchesReturnHubFilter(v) {
    var sens = (document.getElementById('r-sens') && document.getElementById('r-sens').value) || '';
    if (sens !== 'AF_EU') return true;
    var set = returnHubSetForDisplay(RETURN_HUB_DISPLAY);
    if (!set) return true;
    if (!v || v.sens !== 'AF_EU') return false;
    return set.has(String(v.arr || '').toUpperCase());
  }

  function isReturnWatchVol(v) {
    if (!v || v.sens !== 'AF_EU') return false;
    if (v.statut === 'ANNULE') return true;
    if (v.statut === 'RETARD' && v.retardMin >= 120) return true;
    if (v.elig === 'OUI' && v.retardMin >= 60) return true;
    return false;
  }
  const DEMO_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search || '').get('demo') === '1';

  const AFRICA_WEST_SET = new Set([
    'DSS','DKR','ABJ','BKO','COO','LFW','ACC','LOS','ABV','OUA','NIM','CKY','BJL','FNA','ROB','OXB','RAI','VXE','NKC','NDJ','BGF','SSG','LBV','BZV','FIH','DLA','NSI','PHC'
  ]);
  const AFRICA_EAST_SET = new Set([
    'ADD','NBO','DAR','EBB','KGL','JIB','ASM','MGQ','MBA','JRO','ZNZ','HAH'
  ]);
  const AFRICA_INDIAN_SET = new Set([
    'RUN','MRU','SEZ','TNR','MPM','DZA'
  ]);

  function africanSideIataForVol(v) {
    if (!v) return '';
    if (v.sens === 'EU_AF') return String(v.arr || '').toUpperCase();
    if (v.sens === 'AF_EU') return String(v.dep || '').toUpperCase();
    return '';
  }

  function africaRegionForIata(iata) {
    var c = String(iata || '').toUpperCase();
    if (!c) return 'other';
    if (AFRICA_WEST_SET.has(c)) return 'west';
    if (AFRICA_EAST_SET.has(c)) return 'east';
    if (AFRICA_INDIAN_SET.has(c)) return 'indian';
    if (AF_IATA_SET.has(c)) return 'other';
    return 'other';
  }

  function apiRadarOrigin() {
    var o = window.location.origin || '';
    if (!o || o === 'file://' || o === 'null' || /^https?:\/\/localhost(:\d+)?$/i.test(o)) return 'https://robindesairs.eu';
    return o;
  }

  function airportLabel(code) {
    var c = (code || '').toUpperCase();
    var af = AF_AIRPORTS.find(function (x) { return x.code === c; });
    if (af) return af.ville;
    var eu = EU_AIRPORTS.find(function (x) { return x.code === c; });
    if (eu) return eu.ville;
    return c || '—';
  }

  function afPaysFor(dep, arr) {
    var a = (arr || '').toUpperCase();
    var d = (dep || '').toUpperCase();
    var hit = AF_AIRPORTS.find(function (x) { return x.code === a; }) || AF_AIRPORTS.find(function (x) { return x.code === d; });
    return hit ? hit.pays : '—';
  }

  function sensFromIata(dep, arr) {
    var d = (dep || '').toUpperCase();
    var a = (arr || '').toUpperCase();
    var dEu = EU_IATA_SET.has(d);
    var aEu = EU_IATA_SET.has(a);
    var dAf = AF_IATA_SET.has(d);
    var aAf = AF_IATA_SET.has(a);
    if (dEu && aAf) return 'EU_AF';
    if (dAf && aEu) return 'AF_EU';
    return 'OTHER';
  }

  function sensBadge(sens) {
    if (sens === 'EU_AF') return '<span class="badge b-eu">EU→AF</span>';
    if (sens === 'AF_EU') return '<span class="badge b-af">AF→EU</span>';
    return '<span class="badge" style="background:#F0F0F0;color:#555">Autre</span>';
  }

  function airlineLabel(iata) {
    var x = (iata || '').toUpperCase();
    return AIRLINE_IATA_NAME[x] || x || '—';
  }

  function zuluToHhmm(z) {
    if (!z || z === '—') return '—';
    var s = String(z);
    var m = s.match(/(\d{1,2}):(\d{2})/);
    return m ? String(parseInt(m[1], 10)).padStart(2, '0') + ':' + m[2] : s.slice(0, 8);
  }

  function formatDateFr(ymd) {
    if (!ymd) return '—';
    var p = String(ymd).slice(0, 10).split('-');
    if (p.length !== 3) return String(ymd);
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function statusVisuHtml(v) {
    if (v.statut === 'ANNULE') {
      return '<div class="radar-visu radar-visu-cancel" title="Vol annulé"><span class="radar-visu-dot"></span><span>Annulé</span></div>';
    }
    if (v.statut === 'RETARD' && v.retardMin >= 180) {
      return '<div class="radar-visu radar-visu-crit" title="Retard ≥ 3h"><span class="radar-visu-dot"></span><span>3h+</span></div>';
    }
    if (v.statut === 'RETARD' && v.retardMin >= 60) {
      return '<div class="radar-visu radar-visu-warn" title="Retard important"><span class="radar-visu-dot"></span><span>' + retardH(v.retardMin) + '</span></div>';
    }
    if (v.statut === 'RETARD') {
      return '<div class="radar-visu radar-visu-mild" title="Retard"><span class="radar-visu-dot"></span><span>' + retardH(v.retardMin) + '</span></div>';
    }
    return "<div class=\"radar-visu radar-visu-ok\" title=\"À l'heure\"><span class=\"radar-visu-dot\"></span><span>OK</span></div>";
  }

  var TICKER_MANUAL_KEY = 'robin_vol_ticker_manual';

  function loadTickerManual() {
    try {
      var raw = localStorage.getItem(TICKER_MANUAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e0) {
      return [];
    }
  }

  function saveTickerManual(list) {
    try {
      localStorage.setItem(TICKER_MANUAL_KEY, JSON.stringify((list || []).slice(0, 9)));
      sessionStorage.removeItem('robin_vol_ticker');
      sessionStorage.removeItem('robin_vol_ticker_ts');
    } catch (e1) {}
  }

  function isVolPinnedToTicker(v) {
    if (!v) return false;
    var fn = String(v.vol || '').replace(/\s/g, '');
    var route = v.dep + ' → ' + v.arr;
    return loadTickerManual().some(function (x) {
      return String(x.flight || '').replace(/\s/g, '') === fn && x.route === route;
    });
  }

  function setVolPinnedToTicker(v, on) {
    if (!v) return false;
    var fn = String(v.vol || '').replace(/\s/g, '');
    var route = v.dep + ' → ' + v.arr;
    var list = loadTickerManual().filter(function (x) {
      return !(String(x.flight || '').replace(/\s/g, '') === fn && x.route === route);
    });
    if (on) {
      list.unshift({
        flight: fn,
        route: route,
        kind: v.statut === 'ANNULE' ? 'cancel' : 'delay',
        detail: v.statut === 'ANNULE' ? '' : retardH(v.retardMin),
        date: v.date || new Date().toISOString().slice(0, 10),
        amountEur: 600,
        pinnedFrom: 'radar',
        pinnedAt: new Date().toISOString(),
      });
    }
    saveTickerManual(list);
    return !!on;
  }

  function buildGenericWaPubText(v) {
    if (!v) return '';
    var dateTxt = v.dateLabel && v.dateLabel !== '—' ? ' le ' + v.dateLabel : '';
    var stat =
      v.statut === 'ANNULE'
        ? 'a été annulé'
        : 'accuse ' + retardH(v.retardMin) + ' de retard';
    return (
      'Bonjour ! Le vol ' +
      v.vol +
      ' (' +
      v.dep +
      ' → ' +
      v.arr +
      ')' +
      dateTxt +
      ' ' +
      stat +
      '.\n\n' +
      'Vous pouvez avoir droit à une indemnité jusqu\'à 600 € (règlement CE 261).\n' +
      'Robin des Airs vérifie votre dossier gratuitement :\n' +
      'https://robindesairs.eu\n\n' +
      'Répondez avec votre nom, date du vol et numéro de réservation.'
    );
  }

  function openGenericWaPub(v) {
    var text = buildGenericWaPubText(v);
    if (!text) return;
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  function scoreColor(s) {
    return s >= 80 ? 'var(--green)' : s >= 55 ? 'var(--orange)' : 'var(--red)';
  }

  function priorityFromVol(v) {
    if (v.statut === 'ANNULE') return 'URGENT';
    if (v.statut === 'RETARD' && v.retardMin >= 180 && v.elig === 'OUI') return 'URGENT';
    if (v.statut === 'RETARD' && v.retardMin >= 180) return 'HIGH';
    if (v.statut === 'RETARD' && v.retardMin >= 120) return 'HIGH';
    if (v.statut === 'RETARD' && v.retardMin >= 60) return 'NORMAL';
    return 'LOW';
  }

  function phaseFromApi(f, statut) {
    if (f.cancelled) return 'ANNULE';
    var sf = (f.statusFr || '').toLowerCase();
    if (sf.indexOf('atterri') >= 0 || f.landedAtZulu) return 'ATTERRI';
    if (sf.indexOf('vol') >= 0 || (f.flightStatus || '') === 'departed') return 'VOL';
    if (sf.indexOf('annul') >= 0) return 'ANNULE';
    if (statut === 'RETARD') return 'DEPART';
    return 'TAXI';
  }

  function normalizeApiFlight(f) {
    if (!f || f.delayMinutes != null || f.scheduledDeparture) return f;
    return {
      flight: f.flight,
      airline: f.airline,
      dep: f.dep,
      arr: f.arr,
      cancelled: !!f.cancelled,
      delayMinutes: f.cancelled ? null : Number(f.retardMin || 0),
      scheduledDeparture: f.schedDep,
      scheduledArrival: f.schedArr,
      scheduledDate: f.date,
      actualDeparture: f.actualDeparture,
      registration: f.registration,
      statusFr: f.status,
      eligible: f.eligible !== false,
    };
  }

  function mapApiFlightToVol(f, idx) {
    f = normalizeApiFlight(f);
    var cancelled = !!f.cancelled;
    var dm = f.delayMinutes != null ? Number(f.delayMinutes) : 0;
    var statut = 'A_LHEURE';
    if (cancelled) statut = 'ANNULE';
    else if (dm >= 15) statut = 'RETARD';

    var elig = 'NON';
    if (f.eligible) {
      if (cancelled || dm >= 180) elig = 'OUI';
      else if (dm >= 120) elig = 'PEUT_ETRE';
    }

    var score = 0;
    if (elig === 'OUI') score = cancelled ? 72 : dm >= 180 ? 78 : 68;
    else if (elig === 'PEUT_ETRE') score = 52;

    var dep = (f.dep || '').toUpperCase();
    var arr = (f.arr || '').toUpperCase();
    var sens = sensFromIata(dep, arr);
    var vol = {
      id: 'r' + idx,
      vol: f.flight || '—',
      comp: airlineLabel(f.airline),
      airlineIata: (f.airline || '').toUpperCase(),
      sens: sens,
      dep: dep,
      dep_ville: airportLabel(dep),
      arr: arr,
      arr_ville: airportLabel(arr),
      date: f.scheduledDate || null,
      dateLabel: formatDateFr(f.scheduledDate),
      std: zuluToHhmm(f.scheduledDeparture),
      atd: zuluToHhmm(f.actualDeparture) !== '—' ? zuluToHhmm(f.actualDeparture) : '—',
      sta: zuluToHhmm(f.scheduledArrival),
      eta: zuluToHhmm(f.landedAtZulu || f.estimatedArrival || f.scheduledArrival),
      etd: zuluToHhmm(f.estimatedDeparture || f.scheduledDeparture),
      statut: statut,
      retardMin: cancelled ? 0 : dm,
      cause: null,
      elig: elig,
      score: score,
      phase: phaseFromApi(f, statut),
      immat: (f.registration && String(f.registration).trim()) || '—',
      type: '—',
      af_pays: afPaysFor(dep, arr),
      trackerUrl: f.trackerUrl || '',
      statusFr: f.statusFr || '',
      surveillanceRetour: !!f.surveillanceRetour,
      dataSource: 'aerodatabox'
    };
    vol.prio = priorityFromVol(vol);
    return vol;
  }

  function hostFixHint(errMsg) {
    var m = String(errMsg || '');
    if (m.indexOf('Netlify Blobs') >= 0 || m.indexOf('not been configured') >= 0) {
      return (
        ' <br><br><strong>Cache matin :</strong> Netlify → <em>Storage</em> → activer <strong>Blobs</strong>, puis redéployer. ' +
        'En attendant : bouton <strong>Scan live</strong> (AeroDataBox direct, sans Blobs).'
      );
    }
    if (m.indexOf('fetch failed') >= 0) {
      return (
        ' <br><br><strong>Cause fréquente :</strong> variable Netlify <code>AERODATABOX_RAPIDAPI_HOST</code> incorrecte ' +
        '(doit être <code>aerodatabox.p.rapidapi.com</code>, pas un fragment de clé). Supprimez-la ou corrigez-la, puis redéployez.'
      );
    }
    return '';
  }

  function updateApiAlert() {
    var el = document.getElementById('radar-api-alert');
    if (!el) return;
    if (RADAR_ERROR) {
      el.style.display = 'block';
      el.innerHTML =
        '<strong>Radar indisponible ou incomplet.</strong> ' +
        String(RADAR_ERROR) +
        hostFixHint(RADAR_ERROR) +
        ' — Vérifiez <code>RAPIDAPI_KEY</code> et l’abonnement AeroDataBox sur RapidAPI.';
    } else if (!VOLS.length && RADAR_LOAD_MODE === 'snapshot') {
      el.style.display = 'block';
      el.innerHTML =
        '<strong>Cache matin vide.</strong> Le snapshot de 8h n’a pas encore été généré (Blobs + cron). ' +
        'Cliquez sur <strong>Scan live</strong> pour un chargement direct (recommandé si Blobs est en cours d’activation).';
      el.style.background = '#fef9e7';
      el.style.borderColor = '#f6c847';
      el.style.color = '#7d6608';
    } else {
      el.style.display = 'none';
      el.innerHTML = '';
    }
    var badge = document.getElementById('data-source-badge');
    if (badge) {
      if (RADAR_DATA_LABEL) {
        badge.style.display = 'inline-flex';
        badge.textContent = RADAR_DATA_LABEL;
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function applyRadarPayload(data, label, opts) {
    opts = opts || {};
    if (!data) {
      RADAR_ERROR = 'Réponse vide';
      if (!opts.merge) VOLS = [];
      return;
    }
    if (data.error && (!data.flights || !data.flights.length)) {
      RADAR_ERROR = data.error;
      RADAR_META = { updatedAt: data.updatedAt, dataSource: data.dataSource, viewDate: data.viewDate || data.date };
      if (!opts.merge) VOLS = [];
      return;
    }
    RADAR_ERROR = data.error || null;
    RADAR_META = {
      updatedAt: data.updatedAt,
      dataSource: data.dataSource,
      viewDate: data.viewDate || data.date,
    };
    var incoming = (data.flights || []).map(mapApiFlightToVol);
    if (opts.merge && VOLS.length) {
      var byId = new Map();
      VOLS.forEach(function (v) { byId.set(v.id, v); });
      incoming.forEach(function (v) { byId.set(v.id, v); });
      VOLS = Array.from(byId.values());
    } else {
      VOLS = incoming;
    }
    RADAR_DATA_LABEL = label || '';
    RADAR_LAST_SCAN = data.scan || RADAR_LAST_SCAN;
  }

  function isAutoEligible(v) {
    if (!v) return false;
    return v.statut === 'ANNULE' || (v.statut === 'RETARD' && v.retardMin >= 180);
  }

  function autoAddEligiblesFromCurrentVols() {
    var added = 0;
    var existed = new Set(ELIGIBLES.map(function (x) { return x.id; }));
    VOLS.forEach(function (v) {
      if (!isAutoEligible(v)) return;
      if (existed.has(v.id)) return;
      ELIGIBLES.unshift(v);
      existed.add(v.id);
      added += 1;
    });
    if (added > 0) {
      document.getElementById('elig-count-badge').textContent = String(ELIGIBLES.length);
      renderElig();
    }
    return added;
  }

  function countAutoEligibleInCurrentVols() {
    var n = 0;
    VOLS.forEach(function (v) { if (isAutoEligible(v)) n += 1; });
    return n;
  }

  function markZoneEligible(zoneKey, eligibleCount) {
    if (!zoneKey) return;
    ZONE_ELIGIBLE_COUNT[zoneKey] = Math.max(ZONE_ELIGIBLE_COUNT[zoneKey] || 0, eligibleCount || 0);
    updateZoneBlinking();
  }

  function updateZoneBlinking() {
    document.querySelectorAll('.radar-zone-btn').forEach(function (btn) {
      var zoneKey = String(btn.getAttribute('data-zone') || '').trim();
      if (!zoneKey) return;
      var c = ZONE_ELIGIBLE_COUNT[zoneKey] || 0;
      if (c > 0) btn.classList.add('radar-zone-eligible');
      else btn.classList.remove('radar-zone-eligible');
    });
  }

  function mergeFlightsDedup(flights) {
    var out = [];
    var seen = new Set();
    (flights || []).forEach(function (f) {
      if (!f) return;
      var key =
        String((f.flight && (f.flight.iata || f.flight.number)) || f.flight || '') +
        '|' + String(((f.departure && f.departure.iataCode) || f.dep || '')).toUpperCase() +
        '|' + String(((f.arrival && f.arrival.iataCode) || f.arr || '')).toUpperCase() +
        '|' + String((f.departure && (f.departure.scheduledTime || f.departure.scheduledTimeUtc || f.departure.scheduledTimeLocal)) || f.scheduledDeparture || f.schedDep || '');
      if (seen.has(key)) return;
      seen.add(key);
      out.push(f);
    });
    return out;
  }

  function parseRadarResponse(r, text) {
    var data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(r.ok ? 'Réponse JSON invalide' : 'HTTP ' + r.status);
    }
    return data;
  }

  function fetchRadarSnapshot() {
    var url = apiRadarOrigin() + '/api/radar-snapshot?_=' + Date.now();
    return fetch(url, radarFetchInit())
      .then(function (r) {
        return r.text().then(function (text) {
          var data = parseRadarResponse(r, text);
          applyRadarPayload(data, 'Cache matin · ' + (data.flights ? data.flights.length : 0) + ' vols');
        });
      })
      .catch(function (e) {
        RADAR_ERROR = radarFetchErrorMessage(e) || 'Snapshot inaccessible';
        VOLS = [];
      });
  }

  function fetchRadarLive() {
    var groups = window.__RADAR_HUB_GROUPS__ && window.__RADAR_HUB_GROUPS__.length
      ? window.__RADAR_HUB_GROUPS__.slice()
      : [window.__RADAR_HUB_GROUP__ || '1'];

    function fetchOne(group) {
      var url = apiRadarOrigin() + '/.netlify/functions/radar?group=' + encodeURIComponent(group) + '&_=' + Date.now();
      return fetch(url, radarFetchInit({ credentials: 'include' }))
        .then(function (r) {
          return r.text().then(function (text) {
            var data = parseRadarResponse(r, text);
            return data;
          });
        });
    }

    // 1 seul groupe => comportement identique
    if (groups.length <= 1) {
      var g1 = groups[0];
      return fetchOne(g1)
        .then(function (data) {
          var hubs =
            data && data.scan && data.scan.hubs && data.scan.hubs.length
              ? ' · ' + data.scan.hubs.join(',')
              : '';
          applyRadarPayload(
            data,
            'Scan live · ' + (data.flights ? data.flights.length : 0) + ' vols' + hubs +
              (data && data.scan ? ' · ' + formatScanDebug(data.scan) : '')
          );
          if (window.__radarMarkHubScanned && LAST_SCAN_ZONE_KEY) window.__radarMarkHubScanned('aller', LAST_SCAN_ZONE_KEY);
        })
        .catch(function (e) {
          RADAR_ERROR = radarFetchErrorMessage(e);
          VOLS = [];
        });
    }

    // Multi-group (scan en chaîne) => merge + dédup
    var merged = [];
    var scanHubs = [];
    var meta = { updatedAt: null, viewDate: null, dataSource: 'live' };
    return groups
      .reduce(function (p, g) {
        return p.then(function () {
          return fetchOne(g).then(function (data) {
            if (data && data.flights && data.flights.length) merged = merged.concat(data.flights);
            if (data && data.scan && data.scan.hubs && data.scan.hubs.length) scanHubs = scanHubs.concat(data.scan.hubs);
            if (data && data.updatedAt) meta.updatedAt = meta.updatedAt || data.updatedAt;
            if (data && (data.viewDate || data.date)) meta.viewDate = meta.viewDate || data.viewDate || data.date;
          });
        });
      }, Promise.resolve())
      .then(function () {
        var mergedFlights = mergeFlightsDedup(merged);
        var uniqueHubs = Array.from(new Set(scanHubs.map(function (h) { return String(h || '').toUpperCase(); }).filter(Boolean)));
        var payload = {
          flights: mergedFlights,
          updatedAt: meta.updatedAt,
          dataSource: meta.dataSource,
          viewDate: meta.viewDate,
          scan: { hubs: uniqueHubs },
        };
        applyRadarPayload(payload, 'Scan live · ' + mergedFlights.length + ' vols · ' + groups.length + ' zones');
        if (window.__radarMarkHubScanned && LAST_SCAN_ZONE_KEY) window.__radarMarkHubScanned('aller', LAST_SCAN_ZONE_KEY);
      })
      .catch(function (e) {
        RADAR_ERROR = radarFetchErrorMessage(e);
        VOLS = [];
      });
  }



  function pinVolToTickerBanner(v) {
    return setVolPinnedToTicker(v, true);
  }
  window.__radarPinToTicker = pinVolToTickerBanner;
  window.__radarToggleTickerPin = function (id, checked) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    setVolPinnedToTicker(v, !!checked);
    renderRadar();
    if (window.setReturnScanStatus) {
      window.setReturnScanStatus(
        checked ? 'Vol ' + v.vol + ' ajouté au bandeau accueil (cochez pour retirer).' : 'Vol retiré du bandeau.',
        false
      );
    }
  };


  var ALLER_DEMO_ZONE = {
    fco: 'rome', mxp: 'milan', lis: 'lisbon', mad: 'madrid', bcn: 'barcelona', fra: 'frankfurt',
  };
  window.__radarRunAllerScan = function (zoneKey, groups) {
    window.__RADAR_HUB_GROUPS__ = (groups || []).slice();
    window.__RADAR_HUB_GROUP__ = window.__RADAR_HUB_GROUPS__[0] || '1';
    LAST_SCAN_ZONE_KEY = ALLER_DEMO_ZONE[zoneKey] || zoneKey;
    return refreshAll().then(function () { return VOLS.length; });
  };

  function fetchRadarReturnSlot(hubIata, group, slot) {
    var hub = String(hubIata || '').toUpperCase();
    var g = String(group || '1');
    var url =
      apiRadarOrigin() +
      '/.netlify/functions/radar?scanMode=return&hub=' +
      encodeURIComponent(hub) +
      '&group=' +
      encodeURIComponent(g) +
      '&returnSlot=' +
      encodeURIComponent(String(slot)) +
      '&_=' +
      Date.now();
    return fetch(url, radarFetchInit({ credentials: 'include', timeoutMs: 24000 })).then(function (r) {
      return r.text().then(function (text) {
        return parseRadarResponse(r, text);
      });
    });
  }

  function fetchRadarReturnHub(hubIata, group) {
    var hub = String(hubIata || '').toUpperCase();
    var g = String(group || '1');
    if (DEMO_MODE) {
      return Promise.resolve().then(function () {
        var demo = [
          { flight: 'AF717', airline: 'AF', dep: 'DSS', arr: hub, cancelled: false, retardMin: 190, schedDep: '15:00', schedArr: '21:10', status: 'Retard' },
          { flight: 'SN203', airline: 'SN', dep: 'FIH', arr: 'BRU', cancelled: true, retardMin: 0, schedDep: '18:30', schedArr: '23:55', status: 'Annulé' },
        ].filter(function (f) { return String(f.arr || '').toUpperCase() === hub; });
        if (!demo.length) {
          demo = [{ flight: 'ET705', airline: 'ET', dep: 'ADD', arr: hub, cancelled: false, retardMin: 205, schedDep: '19:10', schedArr: '01:05', status: 'Retard' }];
        }
        applyRadarPayload({ flights: demo, updatedAt: new Date().toISOString(), dataSource: 'demo-return' }, 'Démo retour ' + hub, { merge: true });
        autoAddEligiblesFromCurrentVols();
        renderMetrics();
        renderCompFilter();
        renderRadar();
        if (window.__radarMarkHubScanned) window.__radarMarkHubScanned('return', hub);
        return demo.length;
      });
    }
    if (window.setReturnScanStatus) window.setReturnScanStatus('Retour ' + hub + ' · matin 00h–11h59…');
    function radarPause(ms) {
      return new Promise(function (resolve) {
        setTimeout(resolve, ms);
      });
    }
    return fetchRadarReturnSlot(hub, g, '1')
      .then(function (d1) {
        var slot1Limited = d1.scan && (d1.scan.rateLimited || d1.scan.apiHttpStatus === 429);
        var pauseMs = slot1Limited ? 0 : 1200;
        if (slot1Limited && window.setReturnScanStatus) {
          window.setReturnScanStatus(scanRateLimitMessage(), true);
        } else if (window.setReturnScanStatus) {
          window.setReturnScanStatus('Retour ' + hub + ' · après-midi 12h–23h59…');
        }
        if (slot1Limited) {
          var onlyMeta = {
            flights: d1.flights || [],
            updatedAt: d1.updatedAt || new Date().toISOString(),
            dataSource: 'aerodatabox',
            viewDate: d1.viewDate,
            scan: Object.assign({ mode: 'return', hub: hub, returnSlots: ['1'] }, d1.scan || {}, {
              rateLimited: true,
            }),
          };
          applyRadarPayload(onlyMeta, 'Retour ' + hub + ' · quota API', { merge: true });
          resetRadarSensFilter();
          setReturnScanStatusWithDebug(scanRateLimitMessage(), true, onlyMeta.scan);
          renderMetrics();
          renderCompFilter();
          renderRadar();
          return Promise.reject(new Error('HTTP 429'));
        }
        return radarPause(pauseMs).then(function () {
          return fetchRadarReturnSlot(hub, g, '2');
        }).then(function (d2) {
          var merged = mergeFlightsDedup((d1.flights || []).concat(d2.flights || []));
          var meta = {
            flights: merged,
            updatedAt: (d2.updatedAt || d1.updatedAt || new Date().toISOString()),
            dataSource: 'aerodatabox',
            viewDate: d2.viewDate || d1.viewDate,
            scan: {
              mode: 'return',
              hub: hub,
              returnSlots: ['1', '2'],
              apiRowsFetched:
                ((d1.scan && d1.scan.apiRowsFetched) || 0) + ((d2.scan && d2.scan.apiRowsFetched) || 0),
              rawArrivalCount:
                ((d1.scan && (d1.scan.rawArrivalCount != null ? d1.scan.rawArrivalCount : d1.scan.rawDepartureCount)) || 0) +
                ((d2.scan && (d2.scan.rawArrivalCount != null ? d2.scan.rawArrivalCount : d2.scan.rawDepartureCount)) || 0),
              rawDepartureCount: 0,
              matchedCount: merged.length,
              windows: []
                .concat((d1.scan && d1.scan.windows) || [])
                .concat((d2.scan && d2.scan.windows) || []),
              apiProbeCDG:
                d2.scan && d2.scan.apiProbeCDG != null
                  ? d2.scan.apiProbeCDG
                  : d1.scan && d1.scan.apiProbeCDG != null
                    ? d1.scan.apiProbeCDG
                    : undefined,
              apiError: (d2.scan && d2.scan.apiError) || (d1.scan && d1.scan.apiError),
              apiHttpStatus: (d2.scan && d2.scan.apiHttpStatus) || (d1.scan && d1.scan.apiHttpStatus),
              httpErrors: []
                .concat((d1.scan && d1.scan.httpErrors) || [])
                .concat((d2.scan && d2.scan.httpErrors) || []),
              rateLimited:
                (d1.scan && (d1.scan.rateLimited || d1.scan.apiHttpStatus === 429)) ||
                (d2.scan && (d2.scan.rateLimited || d2.scan.apiHttpStatus === 429)),
            },
          };
          var label =
            'Retour ' +
            hub +
            ' · ' +
            merged.length +
            ' vol(s) · 2 créneaux';
          applyRadarPayload(meta, label, { merge: true });
          autoAddEligiblesFromCurrentVols();
          renderMetrics();
          renderCompFilter();
          renderRadar();
          if (window.__radarMarkHubScanned) window.__radarMarkHubScanned('return', hub);
          resetRadarSensFilter();
          if (scanRateLimited(meta.scan)) {
            setReturnScanStatusWithDebug(scanRateLimitMessage(), true, meta.scan);
          } else {
            setReturnScanStatusWithDebug(
              'Retour ' + hub + ' : ' + merged.length + ' vol(s) listés · ' + VOLS.length + ' au total',
              false,
              meta.scan
            );
          }
          return merged.length;
        });
      })
      .catch(function (e) {
        if (e && String(e.message || '') === 'HTTP 429') return 0;
        RADAR_ERROR = radarFetchErrorMessage(e, 'return');
        resetRadarSensFilter();
        setReturnScanStatusWithDebug(RADAR_ERROR, true);
        throw e;
      });
  }

  window.__radarFetchReturnHub = fetchRadarReturnHub;

  function setReturnDisplayFilter(mode, opts) {
    opts = opts || {};
    RETURN_HUB_DISPLAY = String(mode || 'paris').trim() || 'paris';
    var sensSel = document.getElementById('r-sens');
    if (sensSel && opts.filterTable) sensSel.value = 'AF_EU';
    renderMetrics();
    renderRadar();
    renderElig();
    renderReturnWatchPanel();
  }
  window.__radarSetReturnDisplayFilter = setReturnDisplayFilter;

  function renderReturnWatchPanel() {
    var box = document.getElementById('return-watch-panel');
    if (!box) return;
    var list = VOLS.filter(function (v) {
      return v.sens === 'AF_EU' && isReturnWatchVol(v) && matchesReturnHubFilter(v);
    });
    if (!list.length) {
      box.innerHTML = '<p style="margin:0;font-size:12px;color:var(--text3)">Aucun retour problématique pour ce hub (retard ≥2h, annulé, ou éligible ≥1h).</p>';
      return;
    }
    var html = '<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.6">';
    list.slice(0, 12).forEach(function (v) {
      var flag = v.statut === 'ANNULE' ? '🔴 Annulé' : v.retardMin >= 180 ? '🟠 Retard ≥3h' : '⚠️ À surveiller';
      html += '<li><strong>' + v.vol + '</strong> ' + v.dep + '→' + v.arr + ' · ' + flag + ' · ' + retardH(v.retardMin) + ' <button type="button" class="radar-btn radar-btn-sm" onclick="event.stopPropagation();window.__radarPinToTicker&&window.__radarPinToTicker(VOLS.find(function(x){return x.id===\'' + v.id + '\'}))">📣 Bandeau</button></li>';
    });
    if (list.length > 12) html += '<li style="color:var(--text3)">+' + (list.length - 12) + ' autres (voir tableau)</li>';
    html += '</ul>';
    box.innerHTML = html;
  }
  window.__radarRenderReturnWatch = renderReturnWatchPanel;

  function fetchRadarFromNetlify() {
    if (RADAR_LOAD_MODE === 'live') return fetchRadarLive();
    return fetchRadarSnapshot().then(function () {
      if (!VOLS.length && !RADAR_ERROR) return fetchRadarLive().then(function () {
        if (VOLS.length) RADAR_DATA_LABEL = 'Scan live (cache vide)';
      });
    });
  }

  function initZoneButtons() {
    window.__RADAR_HUB_GROUP__ = window.__RADAR_HUB_GROUP__ || '1';
    document.querySelectorAll('.radar-zone-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rawGroups = String(btn.getAttribute('data-groups') || btn.getAttribute('data-group') || '').trim();
        if (!rawGroups) return;
        var groups = rawGroups.split(',').map(function (x) { return String(x).trim(); }).filter(Boolean);
        window.__RADAR_HUB_GROUPS__ = groups;
        window.__RADAR_HUB_GROUP__ = groups[0] || '1';
        LAST_SCAN_ZONE_KEY = String(btn.getAttribute('data-zone') || '').trim() || null;
        document.querySelectorAll('.radar-zone-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var lbl = btn.querySelector('.radar-btn-label');
        var sensSel = document.getElementById('r-sens');
        if (sensSel) sensSel.value = '';
        metricQuickFilter = null;
        setAllerScanStatus('Hub aller : ' + (lbl ? lbl.textContent.trim() : zoneLabel(LAST_SCAN_ZONE_KEY)) + ' — cliquez « Scanner ce hub maintenant ».');
      });
    });
    var allerScanBtn = document.getElementById('btn-aller-scan');
    if (allerScanBtn) {
      allerScanBtn.addEventListener('click', function () {
        if (SCAN_LOCK) {
          setAllerScanStatus('Scan déjà en cours…', true);
          return;
        }
        if (window.__radarReturnScheduler && window.__radarReturnScheduler.isBusy()) {
          setAllerScanStatus('Scan retour en cours — attendez la fin.', true);
          return;
        }
        if (RADAR_LOAD_MODE === 'snapshot') {
          setAllerScanStatus('Mode cache matin : cliquez ↻ Actualiser en haut, ou passez en Scan live.', true);
          refreshAll();
          return;
        }
        setAllerScanStatus('Scan aller en cours…');
        refreshAll();
      });
    }

    // Retour / veille : radar-scan-scheduler.js (sélection + scan)

  }

  function setLoading(on, msg) {
    var el = document.getElementById('radar-loading');
    var msgEl = document.getElementById('radar-loading-msg');
    if (el) el.hidden = !on;
    if (msgEl && msg) msgEl.textContent = msg;
    document.querySelectorAll('.radar-source-btn').forEach(function (b) {
      b.disabled = on;
    });
    var refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) refreshBtn.disabled = on;
    var allerBtn = document.getElementById('btn-aller-scan');
    if (allerBtn) allerBtn.disabled = on;
  }

  function filteredVols() {
    var q = (document.getElementById('r-search') && document.getElementById('r-search').value) || '';
    q = String(q).toLowerCase();
    var sens = (document.getElementById('r-sens') && document.getElementById('r-sens').value) || '';
    var st = (document.getElementById('r-statut') && document.getElementById('r-statut').value) || '';
    var ph = (document.getElementById('r-phase') && document.getElementById('r-phase').value) || '';
    var comp = (document.getElementById('r-comp') && document.getElementById('r-comp').value) || '';
    var elig = (document.getElementById('r-elig') && document.getElementById('r-elig').value) || '';
    var prio = (document.getElementById('r-prio') && document.getElementById('r-prio').value) || '';
    return VOLS.filter(function (v) {
      if (!matchesReturnHubFilter(v)) return false;
      if (metricQuickFilter === 'a_lheure' && v.statut !== 'A_LHEURE') return false;
      if (metricQuickFilter === 'retard_3h' && !(v.statut === 'RETARD' && v.retardMin >= 180)) return false;
      if (metricQuickFilter === 'annule' && v.statut !== 'ANNULE') return false;
      if (metricQuickFilter === 'elig' && v.elig !== 'OUI') return false;
      if (metricQuickFilter === 'urgent' && v.prio !== 'URGENT') return false;
      var txt = (v.vol + ' ' + v.comp + ' ' + v.dep + ' ' + v.arr + ' ' + v.dep_ville + ' ' + v.arr_ville).toLowerCase();
      return (
        (!q || txt.indexOf(q) >= 0) &&
        (!sens || v.sens === sens) &&
        (!st || v.statut === st) &&
        (!ph || v.phase === ph) &&
        (!comp || v.comp === comp) &&
        (!elig || v.elig === elig) &&
        (!prio || v.prio === prio)
      );
    }).sort(function (a, b) {
      var O = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      return (O[a.prio] || 3) - (O[b.prio] || 3);
    });
  }

  function retardH(min) {
    if (min === 0) return "À l'heure";
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h > 0 ? h + 'h' + (m > 0 ? String(m).padStart(2, '0') : '') : m + 'min';
  }

  function renderMetrics() {
    var retardsLong = VOLS.filter(function (v) {
      return v.statut === 'RETARD' && v.retardMin >= 180;
    }).length;
    var annules = VOLS.filter(function (v) {
      return v.statut === 'ANNULE';
    }).length;
    var eligOui = VOLS.filter(function (v) {
      return v.elig === 'OUI';
    }).length;
    var urgents = VOLS.filter(function (v) {
      return v.prio === 'URGENT';
    }).length;
    var pctHeure = VOLS.length ? Math.round((VOLS.filter(function (v) { return v.statut === 'A_LHEURE'; }).length / VOLS.length) * 100) : 0;
    var subAll = 'Hubs FR · AeroDataBox';
    if (RADAR_META && RADAR_META.viewDate) subAll += ' · jour ' + RADAR_META.viewDate;
    function mcc(key) {
      var on =
        (key === 'all' && !metricQuickFilter) ||
        (key === 'a_lheure' && metricQuickFilter === 'a_lheure') ||
        (key === 'retard_3h' && metricQuickFilter === 'retard_3h') ||
        (key === 'annule' && metricQuickFilter === 'annule') ||
        (key === 'elig' && metricQuickFilter === 'elig') ||
        (key === 'urgent' && metricQuickFilter === 'urgent');
      return 'radar-metric' + (on ? ' radar-metric-active' : '');
    }
    var h = document.getElementById('metrics');
    if (!h) return;
    h.innerHTML =
      '<div class="' +
      mcc('all') +
      '" role="button" tabindex="0" title="Afficher tous les vols" onclick="window.__radarApplyMetric(&quot;all&quot;)" onkeydown="window.__radarMetricKey(event,&quot;all&quot;)"><div class="radar-metric-label">Vols listés</div><div class="radar-metric-val mv-navy">' +
      VOLS.length +
      '</div><div class="radar-metric-sub">' +
      subAll +
      '</div></div>' +
      '<div class="' +
      mcc('a_lheure') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;a_lheure&quot;)" onkeydown="window.__radarMetricKey(event,&quot;a_lheure&quot;)"><div class="radar-metric-label">À l\'heure</div><div class="radar-metric-val mv-green">' +
      VOLS.filter(function (v) { return v.statut === 'A_LHEURE'; }).length +
      '</div><div class="radar-metric-sub">' +
      pctHeure +
      '%</div></div>' +
      '<div class="' +
      mcc('retard_3h') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;retard_3h&quot;)" onkeydown="window.__radarMetricKey(event,&quot;retard_3h&quot;)"><div class="radar-metric-label">Retards ≥ 3h</div><div class="radar-metric-val mv-orange">' +
      retardsLong +
      '</div><div class="radar-metric-sub">CE 261 potentiel</div></div>' +
      '<div class="' +
      mcc('annule') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;annule&quot;)" onkeydown="window.__radarMetricKey(event,&quot;annule&quot;)"><div class="radar-metric-label">Annulés</div><div class="radar-metric-val mv-red">' +
      annules +
      '</div><div class="radar-metric-sub">—</div></div>' +
      '<div class="' +
      mcc('elig') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;elig&quot;)" onkeydown="window.__radarMetricKey(event,&quot;elig&quot;)"><div class="radar-metric-label">Indemnisation (estim.)</div><div class="radar-metric-val mv-gold">' +
      eligOui +
      '</div><div class="radar-metric-sub">retard 3h+ ou annul.</div></div>' +
      '<div class="' +
      mcc('urgent') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;urgent&quot;)" onkeydown="window.__radarMetricKey(event,&quot;urgent&quot;)"><div class="radar-metric-label">🔴 Urgents</div><div class="radar-metric-val mv-purple">' +
      urgents +
      '</div><div class="radar-metric-sub">annul. ou 3h+ élig.</div></div>';
  }

  function renderRadarCards(rows) {
    var cards = document.getElementById('radar-cards');
    if (!cards) return;
    if (!rows.length) {
      cards.innerHTML = '';
      return;
    }
    cards.innerHTML = rows
      .map(function (v) {
        var rowCls = v.prio === 'URGENT' ? (v.statut === 'ANNULE' ? 'row-critical' : 'row-hot') : v.elig === 'OUI' ? 'row-eligible' : '';
        var stat =
          v.statut === 'ANNULE' ? 'Annulé' : v.statut === 'RETARD' ? 'Retard ' + retardH(v.retardMin) : "À l'heure";
        return (
          '<article class="radar-card-item ' +
          rowCls +
          '" data-id="' +
          v.id +
          '"><div class="radar-card-head"><div><strong>' +
          v.vol +
          '</strong> · ' +
          v.comp +
          '<div class="radar-card-route">' +
          v.dep +
          ' ' +
          v.dep_ville +
          ' → ' +
          v.arr +
          ' ' +
          v.arr_ville +
          '</div></div><span class="prio-tag ' +
          PRIO_CLS[v.prio] +
          '">' +
          PRIO_LBL[v.prio] +
          '</span></div><div style="font-size:0.72rem;color:var(--radar-muted)">' +
          stat +
          (v.elig === 'OUI' ? ' · CE 261 à qualifier' : '') +
          '</div></article>'
        );
      })
      .join('');
    cards.querySelectorAll('.radar-card-item').forEach(function (card) {
      card.addEventListener('click', function () {
        window.__radarOpenDetail(card.getAttribute('data-id'));
      });
    });
  }

  function renderRadar() {
    var rows = filteredVols();
    var tbody = document.getElementById('radar-tbody');
    if (!tbody) return;
    if (!rows.length) {
      var emptyMsg = RADAR_ERROR
        ? 'Aucun vol (erreur API).'
        : RADAR_LOAD_MODE === 'snapshot' && !metricQuickFilter
          ? 'Cache vide — essayez Scan live.'
          : VOLS.length
            ? 'Aucun vol ne correspond aux filtres (' +
              VOLS.length +
              ' extraits, sens=' +
              ((document.getElementById('r-sens') && document.getElementById('r-sens').value) || 'tous') +
              '). Remettez Sens = « Tous sens » ou cliquez la carte « Vols listés ».' +
              (formatScanDebug(RADAR_LAST_SCAN) ? ' Debug: ' + formatScanDebug(RADAR_LAST_SCAN) + '.' : '')
            : scanRateLimited(RADAR_LAST_SCAN)
              ? scanRateLimitMessage() +
                (formatScanDebug(RADAR_LAST_SCAN) ? ' Debug: ' + formatScanDebug(RADAR_LAST_SCAN) + '.' : '')
              : 'Aucun vol Afrique→Europe pour ce hub sur la journée (heure locale). Essayez Paris ou Bruxelles, ou relancez un scan live.' +
              (formatScanDebug(RADAR_LAST_SCAN) ? ' Debug: ' + formatScanDebug(RADAR_LAST_SCAN) + '.' : '');
      tbody.innerHTML =
        '<tr><td colspan="14" style="text-align:center;padding:2rem;color:#9CA3AF">' + emptyMsg + '</td></tr>';
      renderRadarCards([]);
      return;
    }
    tbody.innerHTML = rows
      .map(function (v) {
        var sensHtml = sensBadge(v.sens);
        var retardHtml = '<span style="color:var(--green);font-weight:700">0h00</span>';
        if (v.statut === 'RETARD') {
          var cls = v.retardMin >= 180 ? 'retard-crit' : v.retardMin >= 60 ? 'retard-warn' : 'retard-ok';
          retardHtml = '<span class="retard-h ' + cls + '">' + retardH(v.retardMin) + '</span>';
        } else if (v.statut === 'ANNULE') {
          retardHtml = '<span style="color:var(--red);font-weight:700">—</span>';
        }
        var prioHtml = '<span class="prio-tag ' + PRIO_CLS[v.prio] + '">' + PRIO_LBL[v.prio] + '</span>';
        var phaseHtml = '<span class="phase ' + (PHASE_CLS[v.phase] || '') + '">' + (PHASE_LBL[v.phase] || v.phase) + '</span>';
        var visuHtml = statusVisuHtml(v);
        var pinned = isVolPinnedToTicker(v);
        var pinHtml =
          '<label class="radar-pin-label" onclick="event.stopPropagation()" title="Bandeau accueil">' +
          '<input type="checkbox" class="radar-pin-cb"' +
          (pinned ? ' checked' : '') +
          ' onchange="window.__radarToggleTickerPin(&quot;' +
          v.id +
          '&quot;, this.checked)"> Bandeau</label>';
        var rowCls = v.prio === 'URGENT' ? (v.statut === 'ANNULE' ? 'row-critical' : 'row-hot') : v.elig === 'OUI' ? 'row-eligible' : '';
        if (pinned) rowCls += ' row-pinned-ticker';
        var track =
          v.trackerUrl && v.trackerUrl !== '#'
            ? '<a class="btn btn-sm" href="' +
              v.trackerUrl +
              '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Suivi</a> '
            : '';
        var immatHtml =
          v.immat && v.immat !== '—'
            ? '<span class="immat">' + v.immat + '</span>'
            : '<span style="color:#9CA3AF;font-size:10px">—</span>';
        return (
          '<tr class="' +
          rowCls +
          '" onclick="window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)"><td style="text-align:center">' +
          pinHtml +
          '</td><td>' +
          prioHtml +
          '</td><td style="font-weight:700;color:var(--navy);font-size:12px">' +
          v.vol +
          '</td><td style="font-size:12px">' +
          v.comp +
          '</td><td>' +
          sensHtml +
          '</td><td><strong>' +
          v.dep +
          '</strong><div style="font-size:10px;color:#9CA3AF">' +
          v.dep_ville +
          '</div></td><td><strong>' +
          v.arr +
          '</strong><div style="font-size:10px;color:#9CA3AF">' +
          v.arr_ville +
          '</div></td><td style="font-family:monospace;font-size:12px;white-space:nowrap">' +
          (v.dateLabel || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          v.std +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.atd || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.sta || '—') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.eta || (v.statut === 'ANNULE' ? '<span style="color:var(--red)">—</span>' : '—')) +
          '</td><td>' +
          retardHtml +
          '</td><td>' +
          phaseHtml +
          '</td><td>' +
          visuHtml +
          '</td><td>' +
          immatHtml +
          '</td><td style="white-space:nowrap">' +
          track +
          '<button class="radar-btn radar-btn-sm" onclick="event.stopPropagation();window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)" title="Détail">🔍</button> ' +
          '<button class="btn-wa radar-btn-sm" onclick="event.stopPropagation();window.__radarOpenPub(&quot;' +
          v.id +
          '&quot;)" title="WhatsApp">💬</button></td></tr>'
        );
      })
      .join('');
    renderReturnWatchPanel();
  }

  function renderCompFilter() {
    var comps = [];
    var seen = {};
    VOLS.forEach(function (v) {
      if (!seen[v.comp]) {
        seen[v.comp] = true;
        comps.push(v.comp);
      }
    });
    comps.sort();
    var sel = document.getElementById('r-comp');
    if (!sel) return;
    sel.innerHTML = '<option value="">Toutes compagnies</option>' + comps.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
  }

  function statsForPeriod(p) {
    var mult = { jour: 1, semaine: 7, mois: 30, annee: 365 };
    var m = mult[p] || 1;
    var r = VOLS.filter(function (v) { return v.statut === 'RETARD'; }).length;
    var rLong = VOLS.filter(function (v) { return v.statut === 'RETARD' && v.retardMin >= 180; }).length;
    var an = VOLS.filter(function (v) { return v.statut === 'ANNULE'; }).length;
    var elig = VOLS.filter(function (v) { return v.elig === 'OUI'; }).length;
    var total = VOLS.length;
    return {
      mult: m,
      total: Math.round(total * m),
      retards: Math.round(r * m),
      retardsLong: Math.round(rLong * m),
      annules: Math.round(an * m),
      eligibles: Math.round(elig * m),
      ca: Math.round(elig * m * 450),
      taux: total ? Math.round(((r + an) / total) * 100) : 0,
      tauxLong: total ? Math.round((rLong / total) * 100) : 0,
      byComp: (function () {
        var out = {};
        var comps = [];
        VOLS.forEach(function (v) { if (comps.indexOf(v.comp) < 0) comps.push(v.comp); });
        comps.forEach(function (c) {
          var cv = VOLS.filter(function (v) { return v.comp === c; });
          var ci = cv.filter(function (v) { return v.statut === 'RETARD' || v.statut === 'ANNULE'; }).length;
          out[c] = {
            total: Math.round(cv.length * m),
            incidents: Math.round(ci * m)
          };
        });
        return out;
      })(),
      byCause: (function () {
        var o = {};
        CAUSES.forEach(function (c) {
          o[c] = Math.round(VOLS.filter(function (v) { return v.cause === c; }).length * m);
        });
        return o;
      })()
    };
  }

  function renderStats() {
    var s = statsForPeriod(currentPeriod);
    var periodLabel = { jour: "le dernier scan", semaine: 'projection ×7 (indicative)', mois: 'projection ×30 (indicative)', annee: 'projection ×365 (indicative)' }[currentPeriod];
    var topComps = Object.entries(s.byComp)
      .sort(function (a, b) { return b[1].incidents - a[1].incidents; })
      .slice(0, 8);
    var totalInc = Object.values(s.byCause).reduce(function (a, b) { return a + b; }, 0) || 1;
    var warn =
      currentPeriod !== 'jour'
        ? '<p style="font-size:11px;color:var(--orange);margin:0 0 12px">Les périodes 7j / 30j / 12 mois multiplient les compteurs du <strong>dernier chargement</strong> (pas d\'historique agrégé dans l\'API).</p>'
        : '<p style="font-size:11px;color:var(--text2);margin:0 0 12px">Chiffres issus du dernier appel radar (jour civil Europe/Paris côté serveur).</p>';
    var body = document.getElementById('stats-body');
    if (!body) return;
    body.innerHTML =
      warn +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--navy)">' +
      s.total.toLocaleString('fr-FR') +
      '</div><div class="stat-card-label">Vols (indicatif) ' +
      periodLabel +
      '</div></div>' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--orange)">' +
      s.retardsLong.toLocaleString('fr-FR') +
      '</div><div class="stat-card-label">Retards ≥ 3h (indicatif)</div></div>' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--red)">' +
      s.annules.toLocaleString('fr-FR') +
      '</div><div class="stat-card-label">Annulations (indicatif)</div></div>' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--gold)">' +
      s.eligibles.toLocaleString('fr-FR') +
      '</div><div class="stat-card-label">Cas à qualifier (indicatif)</div></div>' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--green)">' +
      s.ca.toLocaleString('fr-FR') +
      ' €</div><div class="stat-card-label">Potentiel CA théorique (× montant)</div></div>' +
      '<div class="stat-card"><div class="stat-card-val" style="color:var(--red)">' +
      s.taux +
      '%</div><div class="stat-card-label">Taux incident (scan actuel)</div></div>' +
      '</div><div class="grid2" style="margin-bottom:14px"><div class="info-box"><div class="info-box-title">Compagnies — incidents (indicatif)</div>' +
      topComps
        .map(function (ent) {
          var comp = ent[0];
          var d = ent[1];
          var pct = d.total > 0 ? Math.round((d.incidents / d.total) * 100) : 0;
          var col = pct > 30 ? 'var(--red)' : pct > 15 ? 'var(--orange)' : 'var(--green)';
          return (
            '<div class="stat-bar-row"><div class="stat-bar-label" title="' +
            comp +
            '">' +
            comp +
            '</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' +
            Math.min(pct * 2.5, 100) +
            '%;background:' +
            col +
            '"></div></div><div class="stat-bar-val" style="color:' +
            col +
            '">' +
            d.incidents +
            '</div></div>'
          );
        })
        .join('') +
      '</div><div class="info-box"><div class="info-box-title">Causes (non fournies par l\'API vol)</div>' +
      '<p style="font-size:11px;color:var(--text2);margin-bottom:8px">La cause d\'incident n\'est pas dans les données temps réel ; pour une analyse juridique, complétez manuellement.</p>' +
      CAUSES.map(function (c) {
        var n = s.byCause[c] || 0;
        var pct = Math.round((n / totalInc) * 100);
        return (
          '<div class="stat-bar-row"><div class="stat-bar-label"><span class="cause-pill ' +
          CAUSE_CLS[c] +
          '">' +
          CAUSE_LBL[c] +
          '</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' +
          pct +
          '%;background:var(--text3)"></div></div><div class="stat-bar-val">' +
          n +
          '</div></div>'
        );
      }).join('') +
      '</div></div>';
  }

  function openDetail(id) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    var autresVols = VOLS.filter(function (x) { return x.dep === v.dep && x.id !== v.id && x.statut === 'A_LHEURE'; }).slice(0, 3);
    var eligV = '';
    if (v.elig === 'OUI')
      eligV =
        '<div class="elig-verdict elig-green">✅ Périmètre favorable (retard long ou annulation) — <strong style="font-size:17px;color:#0a7a40">indemnisation à confirmer au dossier</strong> · Estimation score : ' +
        v.score +
        '/100<div style="margin-top:6px;font-size:11px;font-weight:400;color:#145A32">Robin ne garantit pas le montant — analyse CE 261 sur preuves.</div></div>';
    else if (v.elig === 'PEUT_ETRE')
      eligV = '<div class="elig-verdict elig-orange">⚠️ À qualifier — retard 2h–3h ou autre · Estimation : ' + v.score + '/100</div>';
    else eligV = '<div class="elig-verdict elig-red">✗ Hors critères affichés ou retard &lt; seuil — ' + v.retardMin + ' min</div>';

    var trackRow = v.trackerUrl
      ? '<div class="info-row"><span class="info-label">Suivi compagnie</span><span class="info-val"><a href="' +
        v.trackerUrl +
        '" target="_blank" rel="noopener">Ouvrir le traqueur</a></span></div>'
      : '';

    document.getElementById('md-title').textContent = v.vol + ' — ' + v.comp + ' · ' + v.dep + '→' + v.arr;
    document.getElementById('md-elig-btn').onclick = function () { addElig(id); };
    document.getElementById('md-pub-btn').onclick = function () { closeModals(); openPub(id); };
    var mdWa = document.getElementById('md-wa-btn');
    if (mdWa) mdWa.onclick = function () { openGenericWaPub(v); };
    document.getElementById('md-body').innerHTML =
      '<div class="grid2" style="margin-bottom:12px"><div class="info-box"><div class="info-box-title">Vol (AeroDataBox)</div>' +
      '<div class="info-row"><span class="info-label">Date du vol</span><span class="info-val">' +
      (v.dateLabel || '—') +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">N° vol</span><span class="info-val">' +
      v.vol +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Compagnie</span><span class="info-val">' +
      v.comp +
      ' (' +
      v.airlineIata +
      ')</span></div>' +
      '<div class="info-row"><span class="info-label">Statut (API)</span><span class="info-val">' +
      (v.statusFr || '—') +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Départ</span><span class="info-val">' +
      v.dep +
      ' — ' +
      v.dep_ville +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Arrivée</span><span class="info-val">' +
      v.arr +
      ' — ' +
      v.arr_ville +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Décollage effectif (Z)</span><span class="info-val">' +
      (v.atd || '—') +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Départ prévu (Z)</span><span class="info-val">' +
      v.std +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Départ estimé / réel (Z)</span><span class="info-val">' +
      (v.etd || '—') +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Arrivée prévue (Z)</span><span class="info-val">' +
      (v.sta || '—') +
      '</span></div>' +
      '<div class="info-row"><span class="info-label">Arrivée estimée / réelle (Z)</span><span class="info-val" style="' +
      (v.retardMin >= 180 ? 'color:var(--red);font-weight:700' : '') +
      '">' +
      (v.eta || '<span style="color:var(--red)">—</span>') +
      '</span></div>' +
      (v.retardMin > 0 && v.statut !== 'ANNULE'
        ? '<div class="info-row"><span class="info-label">Retard affiché</span><span class="info-val" style="color:var(--red);font-weight:700">' + retardH(v.retardMin) + '</span></div>'
        : '') +
      trackRow +
      '<div class="info-row"><span class="info-label">Cause déclarée</span><span class="info-val">Non fournie par la source temps réel</span></div></div>' +
      '<div><div class="meteo-box" style="margin-bottom:8px"><div class="meteo-box-title">Données annexes</div><div style="font-size:12px">Pas de météo ni METAR simulés sur cette fiche — uniquement les horaires issus du radar.</div></div>' +
      '<div class="info-box"><div class="info-box-title">Score indicatif</div><div style="font-size:26px;font-weight:700;color:' +
      scoreColor(v.score) +
      ';text-align:center;margin:8px 0">' +
      v.score +
      '<span style="font-size:14px">/100</span></div><div style="font-size:10px;color:var(--text2);text-align:center">Estimation interne Robin (pas une décision juridique).</div></div></div></div>' +
      (autresVols.length > 0
        ? '<div class="evidence-box"><div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:8px">Autres vols à l\'heure depuis ' +
          v.dep +
          ' (même scan)</div><div class="ev-item">' +
          autresVols.map(function (x) { return x.vol + ' (' + x.comp + ')'; }).join(' · ') +
          '</div></div>'
        : '') +
      eligV;
    openModal('modal-detail');
  }

  function addElig(id) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    if (!ELIGIBLES.find(function (x) { return x.id === id; })) ELIGIBLES.unshift(v);
    document.getElementById('elig-count-badge').textContent = String(ELIGIBLES.length);
    renderElig();
    closeModals();
    switchTab(document.querySelector('[data-tab="t-eligible"]'), 't-eligible');
  }

  function removeElig(id) {
    ELIGIBLES = ELIGIBLES.filter(function (x) { return x.id !== id; });
    document.getElementById('elig-count-badge').textContent = String(ELIGIBLES.length);
    renderElig();
  }

  function clearElig() {
    ELIGIBLES = [];
    document.getElementById('elig-count-badge').textContent = '0';
    renderElig();
  }

  function renderElig() {
    var el = document.getElementById('elig-list');
    if (!el) return;
    if (!ELIGIBLES.length) {
      el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text2)">Aucun vol éligible sauvegardé</div>';
      return;
    }
    el.innerHTML = ELIGIBLES.map(function (v) {
      return (
        '<div class="elig-card" onclick="window.__radarOpenDetail(&quot;' +
        v.id +
        '&quot;)"><div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--navy)">' +
        v.vol +
        ' — ' +
        v.comp +
        ' <span style="font-size:11px;font-weight:400;color:var(--text2)">' +
        v.dep_ville +
        ' → ' +
        v.arr_ville +
        '</span></div><div style="font-size:11px;color:var(--text2);margin-top:3px">' +
        (v.statut === 'ANNULE' ? 'Annulé' : 'Retard ' + retardH(v.retardMin)) +
        ' · Estim. ' +
        v.score +
        '/100 · ' +
        v.dep +
        '→' +
        v.arr +
        '</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="amount-badge" style="flex-direction:column;line-height:1.2;padding:6px 14px"><span style="font-size:10px;font-weight:600;opacity:.7">à dossier</span><span style="font-size:16px">CE 261</span></span><button class="radar-btn radar-btn-gold radar-btn-sm" onclick="event.stopPropagation();window.__radarOpenPub(&quot;' +
        v.id +
        '&quot;)">📣 Pub</button><button class="radar-btn radar-btn-sm" onclick="event.stopPropagation();window.__radarRemoveElig(&quot;' +
        v.id +
        '&quot;)">✕</button></div></div>'
      );
    }).join('');
  }

  function openPub(id) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    currentPubVol = v;
    var info = document.getElementById('pub-info');
    if (info) {
      info.textContent =
        v.vol + ' · ' + v.dep + ' → ' + v.arr + ' · ' + (v.dateLabel || '—') + ' · ' +
        (v.statut === 'ANNULE' ? '🔴 Annulé' : '🟠 Retard ' + retardH(v.retardMin));
    }
    var cityEl = document.getElementById('pub-city-label');
    if (cityEl) cityEl.textContent = (v.af_ville || v.arr || '?');
    // Fallback WhatsApp
    var waBtn = document.getElementById('btn-wa-fallback');
    if (waBtn) waBtn.onclick = function () { openGenericWaPub(v); };
    // Reset status
    var st = document.getElementById('pub-status');
    if (st) { st.style.display = 'none'; st.textContent = ''; }
    updBudget();
    openModal('modal-pub');
  }

  function updBudget() {
    var val = parseInt((document.getElementById('budget-sl') || {}).value || '10', 10);
    var disp = document.getElementById('budget-disp');
    var reach = document.getElementById('budget-reach');
    if (disp) disp.textContent = val + ' €';
    if (reach) reach.textContent = '~' + Math.round(val / 0.05).toLocaleString('fr-FR') + ' personnes';
  }

  function lancerPub() {
    if (!currentPubVol) return;
    var v = currentPubVol;
    var btn = document.getElementById('btn-lancer-pub');
    var st  = document.getElementById('pub-status');
    var budget = parseInt((document.getElementById('budget-sl') || {}).value || '10', 10);

    // Toujours cibler l'aéroport africain (où sont les passagers qui attendent)
    // EU→AF : passagers bloqués côté EU, mais la cible comm. est l'arrivée AF
    // AF→EU : passagers bloqués à l'aéroport AF de départ → cibler le départ
    var airport = AF_IATA_SET.has(v.arr)
      ? v.arr  // EU→AF : arrivée est africaine (DSS, ABJ…)
      : AF_IATA_SET.has(v.dep)
        ? v.dep // AF→EU : départ est africain → les passagers attendent là
        : v.arr || v.dep; // fallback

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Publication…'; }
    if (st)  { st.style.display = 'block'; st.style.background = '#FFF8E1'; st.style.color = '#7B5800'; st.textContent = 'Envoi vers Meta Ads…'; }

    fetch('/.netlify/functions/ad-launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airport: airport,
        vol:       v.vol       || '',
        dep:       v.dep       || '',
        arr:       v.arr       || '',
        retardMin: v.retardMin || 0,
        statut:    v.statut    || 'RETARD',
        dateLabel: v.dateLabel || '',
        budget:    budget,
      }),
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
    .then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Lancer sur Meta'; }
      if (res.ok && res.data && res.data.ok) {
        var d = res.data;
        if (st) {
          st.style.background = '#E8F5E9';
          st.style.color = '#1B5E20';
          st.innerHTML =
            '✅ Campagne lancée · ' + (d.city || airport) + ' · ' + (d.budget || budget + ' €/j') +
            ' · ' + (d.formats || []).length + ' formats' +
            (d.campaignId ? ' · <a href="https://www.facebook.com/adsmanager" target="_blank" style="color:inherit">Voir dans Meta ↗</a>' : '');
        }
      } else {
        var msg = (res.data && (res.data.error || res.data.detail)) || 'Erreur inconnue';
        if (st) { st.style.background = '#FFEBEE'; st.style.color = '#B71C1C'; st.textContent = '❌ ' + msg; }
      }
    })
    .catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Lancer sur Meta'; }
      if (st)  { st.style.background = '#FFEBEE'; st.style.color = '#B71C1C'; st.textContent = '❌ ' + err.message; }
    });
  }

  function switchTab(el, id) {
    document.querySelectorAll('.radar-tab, .tab-btn').forEach(function (t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
    document.querySelectorAll('.radar-pane, .tab-pane').forEach(function (t) { t.classList.remove('active'); });
    var pane = document.getElementById(id);
    if (pane) pane.classList.add('active');
    if (id === 't-stats') renderStats();
    if (id === 't-eligible') renderElig();
  }

  function closeModals() {
    var d = document.getElementById('modal-detail');
    var p = document.getElementById('modal-pub');
    if (d) { d.style.display = 'none'; d.hidden = true; }
    if (p) { p.style.display = 'none'; p.hidden = true; }
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (m) { m.hidden = false; m.style.display = 'flex'; }
  }

  function setSourceMode(mode) {
    RADAR_LOAD_MODE = mode === 'live' ? 'live' : 'snapshot';
    document.querySelectorAll('.radar-source-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === RADAR_LOAD_MODE);
    });
  }

  function onRadarStatutEligPrioChange() {
    metricQuickFilter = null;
    renderMetrics();
    renderRadar();
  }

  function metricKey(ev, key) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      applyMetricFilter(key);
    }
  }

  function applyMetricFilter(key) {
    var map = { all: null, a_lheure: 'a_lheure', retard_3h: 'retard_3h', annule: 'annule', elig: 'elig', urgent: 'urgent' };
    var target = key === 'all' ? null : map[key];
    if (key === 'all') metricQuickFilter = null;
    else metricQuickFilter = metricQuickFilter === target ? null : target;
    if (metricQuickFilter) {
      var st = document.getElementById('r-statut');
      var el = document.getElementById('r-elig');
      var pr = document.getElementById('r-prio');
      if (st) st.value = '';
      if (el) el.value = '';
      if (pr) pr.value = '';
    }
    renderMetrics();
    renderRadar();
  }

  function refreshAll() {
    if (SCAN_LOCK) {
      setAllerScanStatus('Scan déjà en cours…', true);
      return Promise.resolve();
    }
    SCAN_LOCK = true;
    metricQuickFilter = null;
    var tbody = document.getElementById('radar-tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="15" style="text-align:center;padding:2rem;color:#9CA3AF">Chargement…</td></tr>';
    }
    var loadMsg = RADAR_LOAD_MODE === 'live' ? 'Scan live AeroDataBox (peut prendre ~1 min)…' : 'Lecture cache matin…';
    setLoading(true, loadMsg);

    function demoReturnLegs() {
      return [
        { flight: 'AF717', airline: 'AF', dep: 'DSS', arr: 'CDG', cancelled: false, retardMin: 190, schedDep: '15:00', schedArr: '21:10', status: 'Retard' },
        { flight: 'SN203', airline: 'SN', dep: 'FIH', arr: 'BRU', cancelled: true, retardMin: 0, schedDep: '18:30', schedArr: '23:55', status: 'Annulé' },
        { flight: 'KL590', airline: 'KL', dep: 'LOS', arr: 'AMS', cancelled: false, retardMin: 205, schedDep: '22:10', schedArr: '05:40', status: 'Retard' },
        { flight: 'AZ853', airline: 'AZ', dep: 'ABJ', arr: 'FCO', cancelled: false, retardMin: 175, schedDep: '09:00', schedArr: '15:20', status: 'Retard' },
        { flight: 'AZ825', airline: 'AZ', dep: 'DSS', arr: 'MXP', cancelled: false, retardMin: 198, schedDep: '16:00', schedArr: '22:10', status: 'Retard' },
        { flight: 'TP1474', airline: 'TP', dep: 'DSS', arr: 'LIS', cancelled: false, retardMin: 210, schedDep: '13:20', schedArr: '17:05', status: 'Retard' },
      ];
    }
    function demoFlightsForZone(zoneKey) {
      // Europe sud — aligné sur data/radar-south-departure-routes.js
      if (zoneKey === 'rome') {
        return [
          { flight: 'AZ852', airline: 'AZ', dep: 'FCO', arr: 'ABJ', cancelled: false, retardMin: 195, schedDep: '09:40', schedArr: '15:10', status: 'Retard' },
          { flight: 'AZ854', airline: 'AZ', dep: 'FCO', arr: 'DSS', cancelled: false, retardMin: 45, schedDep: '11:15', schedArr: '15:20', status: 'Retard' },
          { flight: 'UX1091', airline: 'UX', dep: 'FCO', arr: 'JNB', cancelled: true, retardMin: 0, schedDep: '22:05', schedArr: '08:50', status: 'Annulé' },
          { flight: 'AZ610', airline: 'AZ', dep: 'FCO', arr: 'NBO', cancelled: false, retardMin: 210, schedDep: '13:30', schedArr: '21:00', status: 'Retard' },
        ];
      }
      if (zoneKey === 'milan') {
        return [
          { flight: 'AZ824', airline: 'AZ', dep: 'MXP', arr: 'DSS', cancelled: false, retardMin: 220, schedDep: '10:20', schedArr: '14:35', status: 'Retard' },
          { flight: 'AZ832', airline: 'AZ', dep: 'MXP', arr: 'ABJ', cancelled: false, retardMin: 35, schedDep: '15:10', schedArr: '20:40', status: 'Retard' },
        ];
      }
      if (zoneKey === 'lisbon') {
        return [
          { flight: 'TP1473', airline: 'TP', dep: 'LIS', arr: 'DSS', cancelled: false, retardMin: 185, schedDep: '08:55', schedArr: '12:40', status: 'Retard' },
          { flight: 'TP1527', airline: 'TP', dep: 'LIS', arr: 'ACC', cancelled: true, retardMin: 0, schedDep: '12:00', schedArr: '16:30', status: 'Annulé' },
          { flight: 'TP280', airline: 'TP', dep: 'LIS', arr: 'LAD', cancelled: false, retardMin: 0, schedDep: '23:10', schedArr: '06:15', status: "À l'heure" },
          { flight: 'TP1052', airline: 'TP', dep: 'LIS', arr: 'OXB', cancelled: false, retardMin: 55, schedDep: '17:40', schedArr: '21:05', status: 'Retard' },
        ];
      }
      if (zoneKey === 'madrid') {
        return [
          { flight: 'IB637', airline: 'IB', dep: 'MAD', arr: 'DSS', cancelled: false, retardMin: 205, schedDep: '10:30', schedArr: '14:15', status: 'Retard' },
          { flight: 'IB532', airline: 'IB', dep: 'MAD', arr: 'ABJ', cancelled: false, retardMin: 50, schedDep: '16:00', schedArr: '21:10', status: 'Retard' },
          { flight: 'IB211', airline: 'IB', dep: 'MAD', arr: 'JNB', cancelled: true, retardMin: 0, schedDep: '21:45', schedArr: '08:20', status: 'Annulé' },
        ];
      }
      if (zoneKey === 'eu_south_it') {
        return [
          { flight: 'AZ852', airline: 'AZ', dep: 'FCO', arr: 'ABJ', cancelled: false, retardMin: 195, schedDep: '09:40', schedArr: '15:10', status: 'Retard' },
          { flight: 'AZ824', airline: 'AZ', dep: 'MXP', arr: 'DSS', cancelled: false, retardMin: 220, schedDep: '10:20', schedArr: '14:35', status: 'Retard' },
          { flight: 'UX1091', airline: 'UX', dep: 'FCO', arr: 'JNB', cancelled: true, retardMin: 0, schedDep: '22:05', schedArr: '08:50', status: 'Annulé' },
        ];
      }
      if (zoneKey === 'eu_south_ib') {
        return [
          { flight: 'TP1473', airline: 'TP', dep: 'LIS', arr: 'DSS', cancelled: false, retardMin: 185, schedDep: '08:55', schedArr: '12:40', status: 'Retard' },
          { flight: 'IB637', airline: 'IB', dep: 'MAD', arr: 'DSS', cancelled: false, retardMin: 205, schedDep: '10:30', schedArr: '14:15', status: 'Retard' },
          { flight: 'VY8475', airline: 'VY', dep: 'BCN', arr: 'DSS', cancelled: false, retardMin: 200, schedDep: '07:50', schedArr: '11:35', status: 'Retard' },
          { flight: 'VY8174', airline: 'VY', dep: 'BCN', arr: 'BJL', cancelled: true, retardMin: 0, schedDep: '14:20', schedArr: '18:05', status: 'Annulé' },
        ];
      }
      if (zoneKey === 'barcelona') {
        return [
          { flight: 'VY8475', airline: 'VY', dep: 'BCN', arr: 'DSS', cancelled: false, retardMin: 200, schedDep: '07:50', schedArr: '11:35', status: 'Retard' },
          { flight: 'VY8174', airline: 'VY', dep: 'BCN', arr: 'BJL', cancelled: false, retardMin: 40, schedDep: '14:20', schedArr: '18:05', status: 'Retard' },
        ];
      }
      if (zoneKey === 'bru') {
        return [
          { flight: 'SN204', airline: 'SN', dep: 'BRU', arr: 'FIH', cancelled: false, retardMin: 200, schedDep: '10:10', schedArr: '17:05', status: 'Retard' },
          { flight: 'SN255', airline: 'SN', dep: 'BRU', arr: 'DLA', cancelled: false, retardMin: 65, schedDep: '12:40', schedArr: '19:10', status: 'Retard' },
          { flight: 'SN901', airline: 'SN', dep: 'BRU', arr: 'ABJ', cancelled: true, retardMin: 0, schedDep: '16:20', schedArr: '21:30', status: 'Annulé' },
        ];
      }
      if (zoneKey === 'frankfurt') {
        return [
          { flight: 'LH582', airline: 'LH', dep: 'FRA', arr: 'ADD', cancelled: false, retardMin: 210, schedDep: '14:10', schedArr: '22:30', status: 'Retard' },
          { flight: 'LH564', airline: 'LH', dep: 'FRA', arr: 'JNB', cancelled: true, retardMin: 0, schedDep: '20:45', schedArr: '07:10', status: 'Annulé' },
          { flight: 'LH588', airline: 'LH', dep: 'FRA', arr: 'DSS', cancelled: false, retardMin: 55, schedDep: '11:00', schedArr: '14:20', status: 'Retard' },
        ];
      }
      if (zoneKey === 'ams') {
        return [
          { flight: 'KL597', airline: 'KL', dep: 'AMS', arr: 'ACC', cancelled: false, retardMin: 35, schedDep: '09:25', schedArr: '14:55', status: 'Retard' },
          { flight: 'KL589', airline: 'KL', dep: 'AMS', arr: 'LOS', cancelled: false, retardMin: 185, schedDep: '11:05', schedArr: '17:20', status: 'Retard' },
          { flight: 'KL566', airline: 'KL', dep: 'AMS', arr: 'NBO', cancelled: false, retardMin: 0, schedDep: '20:40', schedArr: '05:45', status: "À l'heure" },
        ];
      }
      return [
        { flight: 'AF718', airline: 'AF', dep: 'CDG', arr: 'DSS', cancelled: false, retardMin: 210, schedDep: '10:00', schedArr: '14:00', status: 'Retard' },
        { flight: 'AF706', airline: 'AF', dep: 'CDG', arr: 'ABJ', cancelled: false, retardMin: 55, schedDep: '11:30', schedArr: '16:40', status: 'Retard' },
        { flight: 'AF556', airline: 'AF', dep: 'CDG', arr: 'JNB', cancelled: true, retardMin: 0, schedDep: '22:15', schedArr: '09:10', status: 'Annulé' },
      ].concat(demoReturnLegs());
    }

    var loadPromise = DEMO_MODE
      ? Promise.resolve().then(function () {
          var zone = LAST_SCAN_ZONE_KEY || 'paris_cdg';
          var demoFlights = demoFlightsForZone(zone);
          var payload = {
            flights: demoFlights.map(function (f) {
              return {
                flight: f.flight,
                airline: f.airline,
                dep: f.dep,
                arr: f.arr,
                cancelled: f.cancelled,
                retardMin: f.retardMin,
                schedDep: f.schedDep,
                schedArr: f.schedArr,
                status: f.status,
                eligible: true,
              };
            }),
            updatedAt: new Date().toISOString(),
            dataSource: 'demo',
            viewDate: new Date().toISOString().slice(0, 10),
            scan: { hubs: [String((window.__RADAR_HUB_GROUPS__ && window.__RADAR_HUB_GROUPS__[0]) || window.__RADAR_HUB_GROUP__ || '1')] },
          };
          applyRadarPayload(payload, 'Démo · ' + demoFlights.length + ' vols · ' + zoneLabel(zone));
        })
      : fetchRadarFromNetlify();

    return loadPromise
      .then(function () {
        updateApiAlert();
        // Auto-routage des éligibles + clignotement zone
        var added = autoAddEligiblesFromCurrentVols();
        var eligCount = countAutoEligibleInCurrentVols();
        if (LAST_SCAN_ZONE_KEY) markZoneEligible(LAST_SCAN_ZONE_KEY, eligCount);
        if (!RADAR_ERROR && LAST_SCAN_ZONE_KEY && window.__radarMarkHubScanned) {
          window.__radarMarkHubScanned('aller', LAST_SCAN_ZONE_KEY);
        }
        if (!RADAR_ERROR) {
          resetRadarSensFilter();
          var otherSens = 0;
          VOLS.forEach(function (v) {
            if (v.sens === 'OTHER') otherSens += 1;
          });
          var extra =
            otherSens > 0
              ? ' · ' + otherSens + ' vol(s) hors EU↔AF (hub non reconnu — voir Sens « Autre »)'
              : '';
          setAllerScanStatus(
            'Scan terminé · ' + VOLS.length + ' vol(s) au tableau · ' + zoneLabel(LAST_SCAN_ZONE_KEY) + extra,
            false,
            RADAR_LAST_SCAN
          );
        } else {
          resetRadarSensFilter();
        }
        renderMetrics();
        renderRadar();
        renderCompFilter();
        if (currentPeriod) renderStats();
        // renderElig déjà fait si ajout
        if (!added) renderElig();
        countdownSec = 25 * 60;
        var n = new Date();
        var el = document.getElementById('last-refresh');
        if (el) {
          var extra = RADAR_META && RADAR_META.updatedAt
            ? ' · ' + new Date(RADAR_META.updatedAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '';
          el.textContent = 'Maj ' + String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + extra;
        }
      })
      .finally(function () {
        setLoading(false);
        SCAN_LOCK = false;
      });
  }

  window.__radarOpenDetail = openDetail;
  window.__radarAddElig = addElig;
  window.__radarRemoveElig = removeElig;
  window.__radarOpenPub = openPub;
  window.__radarApplyMetric = applyMetricFilter;
  window.__radarMetricKey = metricKey;

  document.querySelectorAll('.radar-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab, tab.getAttribute('data-tab'));
    });
  });
  document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.period-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentPeriod = btn.getAttribute('data-period') || 'jour';
      renderStats();
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', closeModals);
  });
  document.getElementById('modal-detail') &&
    document.getElementById('modal-detail').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeModals();
    });
  document.getElementById('modal-pub') &&
    document.getElementById('modal-pub').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeModals();
    });
  document.getElementById('btn-refresh') && document.getElementById('btn-refresh').addEventListener('click', refreshAll);
  document.getElementById('btn-clear-elig') && document.getElementById('btn-clear-elig').addEventListener('click', clearElig);
  document.getElementById('btn-lancer-pub') && document.getElementById('btn-lancer-pub').addEventListener('click', lancerPub);
  document.getElementById('budget-sl') && document.getElementById('budget-sl').addEventListener('input', updBudget);
  document.querySelectorAll('.pub-platform').forEach(function (p) {
    p.addEventListener('click', function () { p.classList.toggle('selected'); });
  });
  document.querySelectorAll('.radar-source-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      if (mode === RADAR_LOAD_MODE) return;
      setSourceMode(mode);
      refreshAll();
    });
  });

  initZoneButtons();

  document.getElementById('r-search') && (document.getElementById('r-search').oninput = renderRadar);
  document.getElementById('r-sens') && (document.getElementById('r-sens').onchange = renderRadar);

  // Pré-filtrer par aéroport via ?airport=DSS (utilisé dans les liens publicitaires)
  var _airportParam = new URLSearchParams(window.location.search).get('airport');
  if (_airportParam) {
    var _searchEl = document.getElementById('r-search');
    if (_searchEl) _searchEl.value = _airportParam.toUpperCase();
  }
  document.getElementById('r-statut') && (document.getElementById('r-statut').onchange = onRadarStatutEligPrioChange);
  document.getElementById('r-phase') && (document.getElementById('r-phase').onchange = renderRadar);
  document.getElementById('r-comp') && (document.getElementById('r-comp').onchange = renderRadar);
  document.getElementById('r-elig') && (document.getElementById('r-elig').onchange = onRadarStatutEligPrioChange);
  document.getElementById('r-prio') && (document.getElementById('r-prio').onchange = onRadarStatutEligPrioChange);

  window.refreshAll = refreshAll;
  window.switchTab = switchTab;
  window.switchPeriod = function (el, p) {
    document.querySelectorAll('.period-btn').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
    currentPeriod = p;
    renderStats();
  };
  window.closeModals = closeModals;
  window.addElig = addElig;
  window.removeElig = removeElig;
  window.clearElig = clearElig;
  window.openDetail = openDetail;
  window.openPub = openPub;
  window.updBudget = updBudget;
  window.lancerPub = lancerPub;

  setInterval(function () {
    countdownSec = Math.max(0, countdownSec - 1);
    var m = Math.floor(countdownSec / 60);
    var s = countdownSec % 60;
    var el = document.getElementById('countdown');
    if (el) el.textContent = '↻ ' + m + ':' + String(s).padStart(2, '0');
    if (countdownSec === 0 && !(window.__radarReturnScheduler && window.__radarReturnScheduler.isBusy())) refreshAll();
  }, 1000);

  refreshAll();
})();
