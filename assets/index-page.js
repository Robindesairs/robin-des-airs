/* ════════════════════════════════════════════════════
   ROBIN DES AIRS — Full JS (DB/PFX via flights-db.js)
════════════════════════════════════════════════════ */

function robinWhenDomReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}
window.robinWhenDomReady = robinWhenDomReady;

const COMMISSION_RATE = 0.25; /* 25% no win no fee */
const WHATSAPP_NUMBER = '33756863630';
window.WHATSAPP_NUMBER = WHATSAPP_NUMBER;
/** Lien WhatsApp fiable (mobile + texte long) — api.whatsapp.com préserve mieux le message que wa.me sur certains appareils */
function buildWhatsAppSendUrl(messageText) {
  var num = String(typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '33756863630').replace(/\D/g, '');
  var t = String(messageText || '');
  if (t.length > 3500) t = t.slice(0, 3497) + '...';
  return 'https://api.whatsapp.com/send?phone=' + encodeURIComponent(num) + '&text=' + encodeURIComponent(t);
}
function openWhatsAppSendUrl(url) {
  var ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isMobile) {
    window.location.href = url;
    return;
  }
  var w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w || w.closed) window.location.href = url;
}
const DLABEL = { 600:'Long-courrier · +3 500 km', 400:'Moyen-courrier · 1 500–3 500 km', 250:'Court-courrier · <1 500 km' };
const DISTANCE_LINE = { 600:'Vol Long-Courrier (>3 500 km) → Indemnité de 600€', 400:'Vol Moyen-Courrier (1 500–3 500 km) → Indemnité de 400€', 250:'Vol Court-Courrier (<1 500 km) → Indemnité de 250€' };
function applyDistanceLineCurrency(el) {
  if (!el || !window.I18N || typeof I18N.applyCurrencyWalk !== 'function' || !I18N.getCurrency) return;
  if (I18N.getCurrency() !== 'eur') I18N.applyCurrencyWalk(el);
}
/* Destinations couvertes à 600€ (long-courrier) — base site + SEO meta */
/* Destinations 600€ (long-courrier) — base site + SEO meta */
const DESTINATIONS_600 = { ABJ:'Abidjan', ABV:'Abuja', ACC:'Accra', ADD:'Addis-Abeba', TNR:'Antananarivo', BKO:'Bamako', BGF:'Bangui', BJL:'Banjul', BZV:'Brazzaville', BJM:'Bujumbura', CKY:'Conakry', COO:'Cotonou', DSS:'Dakar', DAR:'Dar es Salaam', JIB:'Djibouti', DLA:'Douala', EBB:'Entebbe', FNA:'Freetown', JNB:'Johannesburg', KGL:'Kigali', JRO:'Arusha', FIH:'Kinshasa', LOS:'Lagos', CPT:'Le Cap', LBV:'Libreville', LFW:'Lomé', LAD:'Luanda', SSG:'Malabo', MRU:'Île Maurice', ROB:'Monrovia', NDJ:'Ndjamena', NBO:'Nairobi', NIM:'Niamey', OUA:'Ouagadougou', PHC:'Port Harcourt', RUN:'La Réunion', WDH:'Windhoek', NSI:'Yaoundé', ZNZ:'Zanzibar' };
/* Aéroport → Ville (pour affichage Départ | Arrivée) */
const AIRPORT_CITY = { CDG:'Paris', ORY:'Paris', LYS:'Lyon', MRS:'Marseille', NCE:'Nice', TLS:'Toulouse', BOD:'Bordeaux', NTE:'Nantes', LIS:'Lisbonne', OPO:'Porto', MAD:'Madrid', BCN:'Barcelone', FCO:'Rome', NAP:'Naples', MXP:'Milan', VIE:'Vienne', BRU:'Bruxelles', AMS:'Amsterdam', FRA:'Francfort', MUC:'Munich', LHR:'Londres', DUB:'Dublin', GVA:'Genève', ADD:'Addis-Abeba', ABJ:'Abidjan', BKO:'Bamako', DKR:'Dakar', DLA:'Douala', LBV:'Libreville', NIM:'Niamey', OUA:'Ouagadougou', LFW:'Lomé', COO:'Cotonou', DSS:'Dakar', NDJ:'Ndjamena', BGF:'Bangui', BZV:'Brazzaville', FIH:'Kinshasa', JNB:'Johannesburg', CPT:'Le Cap', CMN:'Casablanca', ALG:'Alger', TUN:'Tunis', CAI:'Le Caire', NBO:'Nairobi', LAG:'Lagos', NKC:'Nouakchott', TIP:'Tripoli', PTP:'Pointe-à-Pitre', FDF:'Fort-de-France', CAY:'Cayenne', DOH:'Doha', DXB:'Dubaï', IST:'Istanbul', NRT:'Tokyo', MIA:'Miami', CRL:'Charleroi', NSI:'Yaoundé' };
/* Même grille — noms affichés en anglais (bandeau vols, langue EN) */
const AIRPORT_CITY_EN = { CDG:'Paris', ORY:'Paris', LYS:'Lyon', MRS:'Marseille', NCE:'Nice', TLS:'Toulouse', BOD:'Bordeaux', NTE:'Nantes', LIS:'Lisbon', OPO:'Porto', MAD:'Madrid', BCN:'Barcelona', FCO:'Rome', NAP:'Naples', MXP:'Milan', VIE:'Vienna', BRU:'Brussels', AMS:'Amsterdam', FRA:'Frankfurt', MUC:'Munich', LHR:'London', DUB:'Dublin', GVA:'Geneva', ADD:'Addis Ababa', ABJ:'Abidjan', BKO:'Bamako', DKR:'Dakar', DLA:'Douala', LBV:'Libreville', NIM:'Niamey', OUA:'Ouagadougou', LFW:'Lomé', COO:'Cotonou', DSS:'Dakar', NDJ:'Ndjamena', BGF:'Bangui', BZV:'Brazzaville', FIH:'Kinshasa', JNB:'Johannesburg', CPT:'Cape Town', CMN:'Casablanca', ALG:'Algiers', TUN:'Tunis', CAI:'Cairo', NBO:'Nairobi', LAG:'Lagos', NKC:'Nouakchott', TIP:'Tripoli', PTP:'Pointe-à-Pitre', FDF:'Fort-de-France', CAY:'Cayenne', DOH:'Doha', DXB:'Dubai', IST:'Istanbul', NRT:'Tokyo', MIA:'Miami', CRL:'Charleroi', NSI:'Yaoundé' };
const ROUTE_AMOUNT = {};
var _routeAmountBuilt = false;
function ensureRouteAmountBuilt() {
  if (_routeAmountBuilt) return;
  if (typeof DB === 'undefined' || !DB) return;
  _routeAmountBuilt = true;
  for (var k in DB) {
    var r = DB[k].r.replace('→', '-');
    ROUTE_AMOUNT[r] = DB[k].c;
    var rev = r.split('-').reverse().join('-');
    if (!ROUTE_AMOUNT[rev]) ROUTE_AMOUNT[rev] = DB[k].c;
  }
}
function distanceKmToAmount(km) { if (km < 1500) return 250; if (km <= 3500) return 400; return 600; }
function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}
/* Villes pour fallback manuel (ordre: France, Europe, Afrique, Autres) */
const VILLES_OPTIONS = [
  { n:'Paris (CDG/ORY)', c:'CDG' }, { n:'Lyon', c:'LYS' }, { n:'Marseille', c:'MRS' }, { n:'Nice', c:'NCE' }, { n:'Toulouse', c:'TLS' }, { n:'Bordeaux', c:'BOD' }, { n:'Nantes', c:'NTE' },
  { n:'Bruxelles', c:'BRU' }, { n:'Amsterdam', c:'AMS' }, { n:'Londres', c:'LHR' }, { n:'Francfort', c:'FRA' }, { n:'Madrid', c:'MAD' }, { n:'Barcelone', c:'BCN' }, { n:'Lisbonne', c:'LIS' }, { n:'Porto', c:'OPO' }, { n:'Rome', c:'FCO' }, { n:'Genève', c:'GVA' }, { n:'Vienne', c:'VIE' },
  { n:'Dakar', c:'DKR' }, { n:'Abidjan', c:'ABJ' }, { n:'Bamako', c:'BKO' }, { n:'Casablanca', c:'CMN' }, { n:'Alger', c:'ALG' }, { n:'Tunis', c:'TUN' }, { n:'Douala', c:'DLA' }, { n:'Yaoundé', c:'NSI' }, { n:'Libreville', c:'LBV' }, { n:'Cotonou', c:'COO' }, { n:'Lomé', c:'LFW' }, { n:'Niamey', c:'NIM' }, { n:'Ouagadougou', c:'OUA' }, { n:'Ndjamena', c:'NDJ' }, { n:'Kinshasa', c:'FIH' }, { n:'Addis-Abeba', c:'ADD' }, { n:'Nairobi', c:'NBO' }, { n:'Johannesburg', c:'JNB' }, { n:'Le Caire', c:'CAI' }, { n:'Lagos', c:'LAG' }, { n:'Nouakchott', c:'NKC' }, { n:'Pointe-à-Pitre', c:'PTP' }, { n:'Fort-de-France', c:'FDF' },
  { n:'Istanbul', c:'IST' }, { n:'Dubaï', c:'DXB' }, { n:'Doha', c:'DOH' }, { n:'Miami', c:'MIA' }
];

const RAISON_LABELS = {
  meteo: { t:'Météo / Conditions climatiques', n:'⚡ Invoquée souvent à tort — notre dossier METAR le démontre dans 80% des cas.' },
  technique: { t:'Problème technique / Panne', n:'🔧 Défaillance technique ? La compagnie reste responsable de l\'entretien.' },
  greve: { t:'Grève', n:'✊ Si grève interne à la compagnie : indemnisation due. Grève externe : cas par cas.' },
  securite: { t:'Raison de sécurité', n:'🛡️ Motif légitime possible — mais souvent invoqué abusivement.' },
  sansraison: { t:'Aucune explication donnée', n:'⚠️ Sans justification valide, la loi CE 261 s\'applique pleinement.' },
  nesaispas: { t:'Non précisé', n:'💡 Peu importe — votre droit à l\'indemnisation ne dépend pas de la raison.' },
};

/* ── State ── */
const S = {
  motif: null,
  raison: 'nesaispas',
  trajet: null,
  crumbs: []
};

/* ═══ NAV SCROLL ═══ */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

function toggleMobileNav() {
  const d = document.getElementById('nav-drawer');
  const b = document.getElementById('nav-burger');
  const open = d.classList.toggle('open');
  b.classList.toggle('open', open);
}
function closeMobileNav() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('nav-burger').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('nav') && !e.target.closest('.nav-drawer')) closeMobileNav();
});

/* ═══ LANG SELECTOR ═══ */
function toggleLangMenu() {
  document.getElementById('lang-menu').classList.toggle('open');
}
function switchLang(code, flag) {
  document.getElementById('current-flag').textContent = flag;
  document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
  var opt = document.querySelector('.lang-option[data-lang="' + (code || 'fr').toLowerCase() + '"]');
  if (opt) opt.classList.add('active');
  document.getElementById('lang-menu').classList.remove('open');
  if (window.I18N) window.I18N.setLang(code);
  requestAnimationFrame(function() { requestAnimationFrame(updateSiteHeaderOffset); });
}

function toggleCurrencyMenu() {
  var m = document.getElementById('currency-menu');
  if (m) m.classList.toggle('open');
}

function switchCurrency(code) {
  if (window.I18N) window.I18N.setCurrency(code);
  var cm = document.getElementById('currency-menu');
  if (cm) cm.classList.remove('open');
  requestAnimationFrame(function() { requestAnimationFrame(updateSiteHeaderOffset); });
}

/** Bandeau vols : texte régénéré à chaque changement de langue */
function volTickerEscapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** "CDG → DKR" ou "CDG - DKR" → villes (bandeau diaspora / préremplissage) */
function volTickerRouteToDisplay(routeStr, isEn) {
  if (!routeStr || typeof routeStr !== 'string') return routeStr || '';
  var map = isEn ? AIRPORT_CITY_EN : AIRPORT_CITY;
  var parts = routeStr.split(/\s*[→\-]\s*/).map(function (x) { return String(x).trim().toUpperCase(); });
  function city(code) {
    if (!code) return '';
    return (map && map[code]) || code;
  }
  if (parts.length >= 2) return city(parts[0]) + ' → ' + city(parts[1]);
  return routeStr;
}
function volTickerDaySeed() {
  var d = new Date();
  return d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
}
function volTickerSortRowsByDateDesc(arr) {
  return arr.slice().sort(function (a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  });
}
function volTickerShuffle(arr, seed) {
  var a = arr.slice();
  var s = seed >>> 0;
  for (var i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    var j = s % (i + 1);
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
function volTickerFormatDateISO(iso) {
  if (!iso || typeof iso !== 'string') return '';
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var y = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, d = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return iso;
  var dt = new Date(y, m, d);
  var en = window.I18N && window.I18N.getLang && window.I18N.getLang() === 'en';
  return dt.toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
/** Date bandeau type « 15 mars » / « 15 Mar ». */
function volTickerFormatDateDayMonth(iso, en) {
  if (!iso || typeof iso !== 'string') return '';
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var y = parseInt(p[0], 10),
    mo = parseInt(p[1], 10) - 1,
    d = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return iso;
  var dt = new Date(y, mo, d);
  if (en) return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
/** Montant palier pour pastille (DB routes ou 600 par défaut). */
function volTickerEligibleAmountForRow(row) {
  ensureRouteAmountBuilt();
  if (row && row.amountEur != null && !isNaN(Number(row.amountEur))) return Number(row.amountEur);
  var parts = String((row && row.route) || '').split(/\s*[→\-]\s*/);
  if (parts.length >= 2 && typeof ROUTE_AMOUNT !== 'undefined') {
    var a = parts[0].trim().toUpperCase();
    var b = parts[1].trim().toUpperCase();
    var amt = ROUTE_AMOUNT[a + '-' + b] || ROUTE_AMOUNT[b + '-' + a];
    if (amt) return amt;
  }
  return 600;
}
function volTickerDetailPlain(detail) {
  return String(detail || '')
    .replace(/^\+/, '')
    .trim();
}
/** Affichage homogène des retards : 4h → 4h00, 4h5 → 4h05, 4h20 inchangé. */
function volTickerNormalizeDelayDisplay(plain) {
  var s = String(plain || '').trim();
  if (!s) return '';
  var m = s.match(/^(\d+)\s*h\s*(\d{1,2})?$/i);
  if (m) {
    var h = parseInt(m[1], 10);
    if (isNaN(h)) return s;
    if (m[2] != null && m[2] !== '') {
      var min = parseInt(m[2], 10);
      if (!isNaN(min)) return h + 'h' + String(min).padStart(2, '0');
    }
    return h + 'h00';
  }
  return s;
}
/** Retard affiché type +3h40 (données radar, attributs / interne). */
function volTickerFormatDelayMinutes(m) {
  if (m == null || m < 1) return '';
  var h = Math.floor(m / 60);
  var min = m % 60;
  if (h > 0 && min > 0) return '+' + h + 'h' + (min < 10 ? '0' : '') + min;
  if (h > 0) return '+' + h + 'h';
  return '+' + m + 'min';
}
/**
 * Transforme la réponse JSON de /.netlify/functions/radar en lignes bandeau.
 * Filtre : trajets éligibles Robin (EU↔Afrique selon radar) + annulation ou retard ≥ 3 h (seuil type CE 261 retard important ; basé sur les retards exposés par l’API radar).
 * Les données peuvent couvrir les **14 derniers jours** (mode ticker-history / flightsHistory) ou le **timetable** du jour.
 */
function volTickerRowsFromRadar(data) {
  ensureRouteAmountBuilt();
  if (!data || !Array.isArray(data.flights) || !data.flights.length) return null;
  var viewDate = data.viewDate || new Date().toISOString().slice(0, 10);
  var minDelayCe261 = 180; /* 3 h — retard important (indicatif : données = horaires API, pas jugement juridique) */
  var rows = data.flights.filter(function (f) {
    if (!f || !f.eligible) return false;
    if (f.cancelled) return true;
    var d = f.delayMinutes;
    return d != null && d >= minDelayCe261;
  });
  if (!rows.length) return null;
  rows.sort(function (a, b) {
    if (!!a.cancelled !== !!b.cancelled) return a.cancelled ? -1 : 1;
    return (b.delayMinutes || 0) - (a.delayMinutes || 0);
  });
  return rows.slice(0, 48).map(function (f) {
    var fn = String(f.flight || '').replace(/\s/g, '');
    var dep = (f.dep || '').toUpperCase();
    var arr = (f.arr || '').toUpperCase();
    var key = dep + '-' + arr;
    var keyRev = arr + '-' + dep;
    var amountEur =
      typeof ROUTE_AMOUNT !== 'undefined' && (ROUTE_AMOUNT[key] || ROUTE_AMOUNT[keyRev])
        ? ROUTE_AMOUNT[key] || ROUTE_AMOUNT[keyRev]
        : 600;
    return {
      flight: fn,
      route: dep + ' → ' + arr,
      kind: f.cancelled ? 'cancel' : 'delay',
      detail: f.cancelled ? '' : volTickerFormatDelayMinutes(f.delayMinutes),
      date: f.scheduledDate || viewDate,
      amountEur: amountEur,
    };
  });
}
var VOL_TICKER_RADAR_TTL_MS = 8 * 60 * 1000;
function volTickerFetchRadar(cb) {
  try {
    var raw = sessionStorage.getItem('robin_radar_ticker');
    var ts = parseInt(sessionStorage.getItem('robin_radar_ticker_ts'), 10);
    if (raw && !isNaN(ts) && Date.now() - ts < VOL_TICKER_RADAR_TTL_MS) {
      try {
        cb(JSON.parse(raw));
        return;
      } catch (e0) {}
    }
  } catch (e) {}
  var origin = window.location.origin;
  if (!origin || origin === 'null') {
    cb(null);
    return;
  }
  function cacheAndCb(data) {
    try {
      sessionStorage.setItem('robin_radar_ticker', JSON.stringify(data));
      sessionStorage.setItem('robin_radar_ticker_ts', String(Date.now()));
    } catch (e2) {}
    cb(data);
  }
  var histUrl = origin + '/.netlify/functions/radar?mode=ticker-history&_=' + Date.now();
  var liveUrl = origin + '/.netlify/functions/radar?_=' + Date.now();
  fetch(histUrl)
    .then(function (r) {
      return r.json();
    })
    .then(function (histData) {
      var rowsH = volTickerRowsFromRadar(histData);
      if (rowsH && rowsH.length >= 1) {
        cacheAndCb(histData);
        return null;
      }
      return fetch(liveUrl).then(function (r2) {
        return r2.json();
      });
    })
    .then(function (liveData) {
      if (liveData === null) return;
      if (liveData && Array.isArray(liveData.flights)) cacheAndCb(liveData);
      else cb(null);
    })
    .catch(function () {
      fetch(liveUrl)
        .then(function (r) {
          return r.json();
        })
        .then(function (liveData) {
          if (liveData && liveData.flights) cacheAndCb(liveData);
          else cb(null);
        })
        .catch(function () {
          cb(null);
        });
    });
}
/** iOS / Android : le défilement CSS du bandeau peut se figer (onglet en arrière-plan, économie d’énergie). */
var volTickerMarqueeRestartTimer = null;
function volTickerScheduleMarqueeRestart() {
  clearTimeout(volTickerMarqueeRestartTimer);
  volTickerMarqueeRestartTimer = setTimeout(function () {
    volTickerMarqueeRestartTimer = null;
    var rail = document.getElementById('vol-ticker-rail');
    if (!rail) return;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e0) {}
    rail.style.webkitAnimation = 'none';
    rail.style.animation = 'none';
    void rail.offsetHeight;
    rail.style.removeProperty('-webkit-animation');
    rail.style.removeProperty('animation');
  }, 40);
}
function volTickerRenderList(list) {
  if (!list || !list.length || !window.I18N) return;
  var g1 = document.getElementById('vol-ticker-g1');
  var g2 = document.getElementById('vol-ticker-g2');
  if (!g1 || !g2) return;
  var get = window.I18N.get.bind(window.I18N);
  var tR = get('vol_ticker_retard');
  var tA = get('vol_ticker_annul');
  var titleRaw = get('vol_ticker_chip_title');
  var titleAttrBase = String(titleRaw).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  /* Prioriser les dates les plus récentes avant rotation (pool élargi puis 9 pastilles). */
  var recentPool = volTickerSortRowsByDateDesc(list).slice(0, Math.min(28, list.length));
  var picked = volTickerShuffle(recentPool, volTickerDaySeed()).slice(0, 9);
  var en = window.I18N && window.I18N.getLang && window.I18N.getLang() === 'en';
  var sepDot = ' · ';
  var parts = picked.map(function (row) {
    var flightEsc = volTickerEscapeHtml(row.flight);
    var routePlain = volTickerRouteToDisplay(row.route || '', en);
    var routeEsc = volTickerEscapeHtml(routePlain);
    var dIso = volTickerEscapeHtml(row.date || '');
    var kind = row.kind === 'cancel' ? 'cancel' : 'delay';
    var detPlain = volTickerNormalizeDelayDisplay(volTickerDetailPlain(row.detail));
    var detAttr = volTickerEscapeHtml(row.detail || '');
    var dateBand = volTickerFormatDateDayMonth(row.date || '', en);
    var dateBandEsc = volTickerEscapeHtml(dateBand);
    var amount = volTickerEligibleAmountForRow(row);
    var amtDisp =
      window.I18N && typeof I18N.formatFromEur === 'function' ? I18N.formatFromEur(amount) : String(amount) + '€';
    var eligStr = get('vol_ticker_eligible_pax').replace(/\{amount\}/g, amtDisp);
    var eligEsc = volTickerEscapeHtml(eligStr);
    var statusPartEsc =
      kind === 'cancel'
        ? volTickerEscapeHtml(tA)
        : volTickerEscapeHtml(tR + ' ' + detPlain);
    /* Infobulle courte ; détail source données du bandeau → pied de page (#footer-vol-ticker-data). */
    var titleAttr = titleAttrBase;
    var dotHtml = '<span class="vol-ticker-chip-dot vol-ticker-chip-dot--live" aria-hidden="true"></span>';
    return (
      '<button type="button" class="vol-ticker-chip" title="' +
      titleAttr +
      '" data-flight="' +
      flightEsc +
      '" data-date="' +
      dIso +
      '" data-route="' +
      routeEsc +
      '" data-kind="' +
      kind +
      '" data-detail="' +
      detAttr +
      '">' +
      dotHtml +
      '<span class="vol-ticker-chip-line"><strong class="vol-ticker-chip-flight">' +
      flightEsc +
      '</strong><span class="vol-ticker-chip-muted"> ' +
      routeEsc +
      '<span class="vol-ticker-sep" aria-hidden="true">' +
      sepDot +
      '</span>' +
      dateBandEsc +
      '<span class="vol-ticker-sep" aria-hidden="true">' +
      sepDot +
      '</span></span><span class="vol-ticker-chip-status">' +
      statusPartEsc +
      '</span><span class="vol-ticker-sep" aria-hidden="true">' +
      sepDot +
      '</span><span class="vol-ticker-chip-elig">' +
      eligEsc +
      '</span></span></button>'
    );
  });
  var html = parts.join('');
  g1.innerHTML = html;
  g2.innerHTML = html;
  /* g2 est décoratif (marquee) + aria-hidden : pas de focus clavier sur le clone (a11y). */
  g2.querySelectorAll('button.vol-ticker-chip').forEach(function (btn) {
    btn.setAttribute('tabindex', '-1');
  });
  volTickerScheduleMarqueeRestart();
}
/** Bandeau : d’abord exemples statiques, puis remplacement par le radar temps réel si assez de vols. */
window.refreshVolTicker = function () {
  var fallback = window.VOL_TICKER_FLIGHTS || [];
  if (fallback.length && window.I18N) volTickerRenderList(fallback);
  function fetchRadar() {
    volTickerFetchRadar(function (data) {
      var live = volTickerRowsFromRadar(data);
      if (live && live.length >= 1) volTickerRenderList(live);
    });
  }
  /* Mobile : le radar Netlify peut monopoliser la file (Lighthouse ~9s) ; le fallback statique suffit au LCP. */
  if (window.__ROBIN_DEFER_FUNNEL__) setTimeout(fetchRadar, 2600);
  else fetchRadar();
};
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) volTickerScheduleMarqueeRestart();
});
window.addEventListener('pageshow', function () {
  volTickerScheduleMarqueeRestart();
});
(function volTickerMarqueeWatch() {
  if (typeof IntersectionObserver === 'undefined') return;
  var el = document.getElementById('vol-ticker');
  if (!el) return;
  var lastIoRestart = 0;
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || en.intersectionRatio < 0.05) return;
        var now = Date.now();
        if (now - lastIoRestart < 2800) return;
        lastIoRestart = now;
        volTickerScheduleMarqueeRestart();
      });
    },
    { threshold: [0, 0.1, 0.25] }
  );
  io.observe(el);
})();
document.addEventListener('click', (e) => {
  if (!e.target.closest('#lang-dropdown')) {
    var lm = document.getElementById('lang-menu');
    if (lm) lm.classList.remove('open');
  }
  if (!e.target.closest('#currency-dropdown')) {
    var cm = document.getElementById('currency-menu');
    if (cm) cm.classList.remove('open');
  }
});

/* ── Scroll vers calculateur + animation visible (même si la carte est déjà à l’écran à côté du texte) ── */
function scrollToFunnelAndHighlight() {
  var box = document.getElementById('funnel-box');
  if (!box) return;

  /* Recentrer la carte dans la fenêtre : sur desktop ça peut peu défiler, sur mobile ça amène le formulaire */
  box.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  box.classList.remove('calc-highlight');
  void box.offsetWidth;
  box.classList.add('calc-highlight');
  setTimeout(function() { box.classList.remove('calc-highlight'); }, 1300);

  /* Curseur dans le champ « vol » du parcours rapide → interaction claire */
  setTimeout(function() {
    var longEl = document.getElementById('funnel-long');
    var shortVol = document.getElementById('short-vol');
    var longOpen = longEl && window.getComputedStyle(longEl).display !== 'none';
    if (shortVol && !longOpen) {
      try {
        shortVol.focus({ preventScroll: true });
      } catch (err) {
        shortVol.focus();
      }
    }
  }, 520);
}
function scrollToCalcWithAnimation(e) {
  function go() {
    if (e && e.preventDefault) e.preventDefault();
    var fb = document.getElementById('funnel-box');
    if (fb) fb.classList.remove('funnel-from-vol-chip');
    scrollToFunnelAndHighlight();
  }
  if (window.__ROBIN_DEFER_FUNNEL__ && !window.__ROBIN_FUNNEL_READY__ && typeof window.robinEnsureFunnelAssets === 'function') {
    window.robinEnsureFunnelAssets(go);
    return;
  }
  go();
}

/* ═══ PAX COUNTER ═══ */
function changePax(valId, delta) {
  const el = document.getElementById(valId);
  const current = parseInt(el.textContent) || 1;
  const next = Math.max(1, current + delta);
  el.textContent = next;
  // Show "groupe" label if > 5
  el.style.color = next >= 5 ? 'var(--neon-b)' : 'white';
}

/* ═══ FUNNEL NAVIGATION ═══ */
var STEP_TO_NUM = { 'step-1':1, 'step-1b':1, 'step-1c':1, 'step-2':2, 'step-3a':3, 'step-3b':3, 'step-loader':4, 'step-result':5, 'step-nope':5 };
/** @param scrollIntoFunnel passer false au chargement initial pour ne pas masquer le hero (mobile). */
function goTo(stepId, pct, scrollIntoFunnel) {
  if (
    (stepId === 'step-3a' || stepId === 'step-3b') &&
    window.__ROBIN_DEFER_FUNNEL__ &&
    !window.__ROBIN_FUNNEL_READY__ &&
    typeof window.robinEnsureFunnelAssets === 'function'
  ) {
    window.robinEnsureFunnelAssets(function () {
      goTo(stepId, pct, scrollIntoFunnel);
    });
    return;
  }
  document.querySelectorAll('.fstep').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
  var stepNum = STEP_TO_NUM[stepId] != null ? STEP_TO_NUM[stepId] : 1;
  var pctBar = stepNum * 20;
  var barEl = document.getElementById('funnel-progress-bar');
  if (barEl) barEl.style.width = pctBar + '%';
  var labelEl = document.getElementById('funnel-step-label');
  if (labelEl) labelEl.textContent = 'Étape ' + stepNum + ' sur 5';
  var funnelBox = document.getElementById('funnel-box');
  if (funnelBox) {
    if (stepId === 'step-3a') funnelBox.classList.add('step-3a-active');
    else funnelBox.classList.remove('step-3a-active');
  }
  if (stepId === 'step-3a') {
    var daDist = document.getElementById('da-dist');
    var daLine = document.getElementById('da-distance-line');
    if (daDist && (!daDist.value || daDist.value === '')) {
      daDist.value = '600';
      if (daLine && typeof DISTANCE_LINE !== 'undefined') {
        daLine.textContent = DISTANCE_LINE[600] || '';
        applyDistanceLineCurrency(daLine);
      }
    }
    // Rafraîchir les Tom Select aéroports une fois l’étape visible (sinon le dropdown peut rester vide)
    setTimeout(function() {
      if (window.tomSelectDaVilleDep && window.tomSelectDaVilleDep.sync) window.tomSelectDaVilleDep.sync();
      if (window.tomSelectDaVilleArr && window.tomSelectDaVilleArr.sync) window.tomSelectDaVilleArr.sync();
    }, 100);
  }
  if (stepId === 'step-3b') {
    setTimeout(function() {
      [1, 2, 3].forEach(function(i) {
        var d = document.getElementById('eb-ville-depart-' + i); var a = document.getElementById('eb-ville-arrivee-' + i);
        if (d && d.tomselect && d.tomselect.sync) d.tomselect.sync();
        if (a && a.tomselect && a.tomselect.sync) a.tomselect.sync();
      });
    }, 100);
  }
  if (stepId === 'step-nope') {
    var reasonEl = document.getElementById('step-nope-reason');
    var defaultReason = "L'annulation a été communiquée plus de 14 jours avant le départ. La loi CE 261 n'impose pas d'indemnisation dans ce cas. Vous avez cependant droit au <strong>remboursement intégral de votre billet.</strong>";
    if (reasonEl) reasonEl.innerHTML = (typeof window.nopeReason === 'string' && window.nopeReason) ? window.nopeReason : defaultReason;
  }
  if (scrollIntoFunnel !== false) {
    setTimeout(() => {
      var fb = document.getElementById('funnel-box');
      if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  }
}

function setCrumbs() {
  const MAP = {
    retard: '⏱ Retard', annulation: '❌ Annulation', surbook: '🚫 Surbooking', correspondance: '🔄 Vol manqué',
    direct: '✈ Direct', escale: '🔄 Escale'
  };
  document.getElementById('funnel-crumbs').textContent =
    S.crumbs.map(k => MAP[k]).filter(Boolean).join(' › ');
}

/* ── Étape 1 : motif ── */
function pickMotif(m) {
  S.motif = m;
  S.crumbs = [m];
  setCrumbs();
  if (m === 'annulation') {
    goTo('step-1b', 20);
  } else {
    goTo('step-1c', 33); // retard, surbook, correspondance
    document.getElementById('back1c').onclick = () => goTo('step-1', 12);
    document.getElementById('back2').onclick   = () => goTo('step-1c', 33);
  }
}

/* ── Étape 1c : raison ── */
function pickRaison(r) {
  S.raison = r;
  document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  var msg = document.getElementById('step1c-nesaispas-msg');
  if (msg) msg.style.display = (r === 'nesaispas') ? 'block' : 'none';
  setTimeout(() => goTo('step-2', 50), 300);
  document.getElementById('back2').onclick = () => goTo('step-1c', 33);
}

/* ── Étape 1b : préavis annulation ── */
function pickAnnDelai(val) {
  if (val === 'early') {
    window.nopeReason = "L'annulation a été communiquée plus de 14 jours avant le départ. La loi CE 261 n'impose pas d'indemnisation dans ce cas. Vous avez cependant droit au <strong>remboursement intégral de votre billet.</strong>";
    goTo('step-nope', 100);
  } else {
    goTo('step-1c', 33);
    document.getElementById('back1c').onclick = () => goTo('step-1b', 20);
    document.getElementById('back2').onclick   = () => goTo('step-1c', 33);
  }
}

/* ── Étape 2 : trajet ── */
function pickTrajet(t) {
  S.trajet = t;
  S.crumbs.push(t);
  setCrumbs();
  goTo(t === 'direct' ? 'step-3a' : 'step-3b', 75);
}

/* ── WhatsApp direct ── */
function goWaDirect() {
  openWhatsAppSendUrl(buildWhatsAppSendUrl('[FR] Bonjour Robin des Airs !\n\nJe souhaite vous parler directement.\n\nMon prénom :\nMon vol :\nCe qui s\'est passé :\n'));
}

/* ═══ PARCOURS RAPIDE — ouverture WhatsApp directe (pas d’étape téléphone) ═══ */
function goToShortStep() {
  var el1 = document.getElementById('step-short-1');
  if (el1) el1.style.display = 'block';
  var labelEl = document.getElementById('funnel-step-label');
  if (labelEl) labelEl.textContent = '';
}
/** Ouvre WhatsApp avec le message : le client envoie depuis son app → vous voyez son numéro et le texte. */
function openShortWhatsApp() {
  var volEl = document.getElementById('short-vol');
  var vol = (volEl && volEl.value) || '';
  var get = window.I18N && window.I18N.get ? window.I18N.get.bind(window.I18N) : function () { return ''; };
  var body = String(vol).trim();
  var msg;
  if (!body) {
    msg = get('wa_eligibility_prefill') || 'Bonjour Robin ! Je veux vérifier si mon vol est éligible.\nNuméro de vol :\nDate :';
  } else {
    var tpl = get('short_submit_wa_template');
    if (tpl && String(tpl).indexOf('{vol}') !== -1) {
      msg = String(tpl).replace(/\{vol\}/g, body);
    } else {
      msg = 'Bonjour Robin,\n\n' + body;
    }
  }
  var waNum = (typeof WHATSAPP_NUMBER !== 'undefined' && WHATSAPP_NUMBER) ? String(WHATSAPP_NUMBER).replace(/\D/g, '') : '33756863630';
  var url = buildWhatsAppSendUrl(msg);
  openWhatsAppSendUrl(url);
}
function showLongFunnel() {
  var box = document.getElementById('funnel-box');
  if (box) {
    box.classList.remove('funnel-from-vol-chip');
    box.classList.add('funnel-box--detailed');
  }
  var progWrap = document.getElementById('funnel-progress-wrap');
  if (progWrap) progWrap.setAttribute('aria-hidden', 'false');
  document.getElementById('funnel-short').style.display = 'none';
  document.getElementById('funnel-long').style.display = 'block';
  var waShortcut = document.querySelector('.funnel-wa-shortcut');
  if (waShortcut) waShortcut.style.display = 'none';
  var detailLink = document.querySelector('.funnel-detail-link');
  if (detailLink) detailLink.style.display = 'none';
  goTo('step-1', 12);
}
/** Clic pastille bandeau : parcours minimal (textarea + bouton), sans en-tête ni autres raccourcis WhatsApp. */
function showShortFunnelFromVolTicker() {
  var box = document.getElementById('funnel-box');
  if (box) box.classList.add('funnel-from-vol-chip');
  var fs = document.getElementById('funnel-short');
  var fl = document.getElementById('funnel-long');
  if (fl) fl.style.display = 'none';
  if (fs) fs.style.display = 'block';
  var crumbs = document.getElementById('funnel-crumbs');
  if (crumbs) crumbs.textContent = '';
  if (typeof goToShortStep === 'function') goToShortStep();
}

robinWhenDomReady(function () {
  var linkDetail = document.getElementById('link-diagnostic-detail');
  if (linkDetail)
    linkDetail.addEventListener('click', function (e) {
      e.preventDefault();
      function open() {
        showLongFunnel();
      }
      if (typeof window.robinEnsureFunnelAssets === 'function') window.robinEnsureFunnelAssets(open);
      else open();
    });
});

/* ── Restart ── */
function restartFunnel() {
  S.motif = null; S.trajet = null; S.raison = 'nesaispas'; S.crumbs = [];
  document.getElementById('funnel-crumbs').textContent = '';
  ['eb-vol1','eb-vol2','eb-vol3'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['eb-chip1','eb-chip2'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('show'); });
  var block3 = document.getElementById('eb-vol-block-3');
  if (block3) block3.style.display = 'none';
  var addVolBtn = document.getElementById('eb-add-vol-btn');
  if (addVolBtn) addVolBtn.textContent = '+ Ajouter un 3e vol';
  [1,2,3].forEach(function(i) {
    ['eb-ville-depart-'+i,'eb-ville-arrivee-'+i].forEach(function(id) {
      var el = document.getElementById(id);
      var ts = (el && el.tomselect) || (el && el.parentNode && el.parentNode.tomselect);
      if (ts) ts.clear();
    });
  });
  ['da-distance-line'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = ''; });
  window.lastCalculatedDistanceKm = null;
  var fn = document.getElementById('flight_number');
  if (fn) fn.value = '';
  var pv = document.getElementById('da-principaux-vols');
  if (pv) pv.style.display = 'none';
  var fns = document.getElementById('flight_number_status');
  if (fns) { fns.textContent = ''; fns.className = 'flight-status'; }
  if (window.tomSelectDaVilleDep) window.tomSelectDaVilleDep.clear();
  if (window.tomSelectDaVilleArr) window.tomSelectDaVilleArr.clear();
  updateManualDist('da');
  ['da-dist','eb-dist'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['da-dist-wrap','eb-dist-wrap'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
  document.querySelectorAll('.dist-pill').forEach(p => p.classList.remove('active'));
  ['da-pax-val','eb-pax-val'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '1'; });
  var fbox = document.getElementById('funnel-box');
  if (fbox) fbox.classList.remove('funnel-from-vol-chip');
  goTo('step-1', 12);
}

function setDist(inputId, value, btn) {
  window.lastCalculatedDistanceKm = null;
  const el = document.getElementById(inputId);
  if (el) el.value = String(value);
  const wrap = btn.closest('.calc-field');
  if (wrap) wrap.querySelectorAll('.dist-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  var line = document.getElementById('da-distance-line');
  if (line) {
    line.textContent = DISTANCE_LINE[value] || '';
    applyDistanceLineCurrency(line);
  }
}

/** Remplit le diagnostic vol direct à partir de la base locale (DB). Utilisé pour les principaux vols AF/SS Afrique. */
function applyFlightFromDb(code) {
  if (typeof DB === 'undefined' || !DB[code]) return false;
  var match = DB[code];
  var parts = match.r.split(/\s*[\u2192\-]\s*/);
  if (parts.length !== 2) return false;
  var depIata = parts[0].trim();
  var arrIata = parts[1].trim();
  var depText = (typeof AIRPORT_CITY !== 'undefined' && AIRPORT_CITY[depIata]) ? AIRPORT_CITY[depIata] + ' \u2014 ' + depIata : depIata;
  var arrText = (typeof AIRPORT_CITY !== 'undefined' && AIRPORT_CITY[arrIata]) ? AIRPORT_CITY[arrIata] + ' \u2014 ' + arrIata : arrIata;
  if (window.tomSelectDaVilleDep && depIata) {
    window.tomSelectDaVilleDep.addOption({ value: depIata, text: depText });
    window.tomSelectDaVilleDep.addItem(depIata, true);
  }
  if (window.tomSelectDaVilleArr && arrIata) {
    window.tomSelectDaVilleArr.addOption({ value: arrIata, text: arrText });
    window.tomSelectDaVilleArr.addItem(arrIata, true);
  }
  updateManualDist('da');
  var distIn = document.getElementById('da-dist');
  var lineEl = document.getElementById('da-distance-line');
  if (distIn) distIn.value = String(match.c);
  if (lineEl && typeof DISTANCE_LINE !== 'undefined') {
    lineEl.textContent = DISTANCE_LINE[match.c] || '';
    applyDistanceLineCurrency(lineEl);
  }
  var distWrap = document.getElementById('da-dist-wrap');
  if (distWrap) { distWrap.style.display = 'none'; distWrap.querySelectorAll('.dist-pill').forEach(function(p) { p.classList.remove('active'); }); }
  var st = document.getElementById('flight_number_status');
  if (st) { st.className = 'flight-status'; st.textContent = 'Vol trouv\u00e9 \u2014 D\u00e9part et arriv\u00e9e renseign\u00e9s'; }
  return true;
}

/** Clic bandeau vols : parcours rapide sur le site (textarea + Continuer sur WhatsApp), pas le diagnostic détaillé. */
function volTickerApplyFlight(chip) {
  if (!chip) return;
  function doApply() {
  var flight = (chip.getAttribute('data-flight') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  var dateIso = (chip.getAttribute('data-date') || '').trim();
  var route = chip.getAttribute('data-route') || '';
  var kind = chip.getAttribute('data-kind') || 'delay';
  var get = window.I18N && window.I18N.get ? window.I18N.get.bind(window.I18N) : function (k) { return k; };
  var dateDisp = typeof volTickerFormatDateISO === 'function' ? volTickerFormatDateISO(dateIso) : dateIso;
  var incident = kind === 'cancel' ? get('vol_click_incident_cancel') : get('vol_click_incident_delay');
  var bodyTpl = get('vol_click_eligibility_body');
  var line = (bodyTpl && String(bodyTpl).indexOf('{flight}') !== -1)
    ? String(bodyTpl)
      .replace(/\{flight\}/g, flight || '___')
      .replace(/\{date\}/g, dateDisp || '___')
      .replace(/\{incident\}/g, incident || (kind === 'cancel' ? 'annulé' : 'retardé'))
    : [flight, route, dateDisp, kind === 'cancel' ? get('vol_ticker_annul') : get('vol_ticker_retard')].filter(Boolean).join(' · ');

  showShortFunnelFromVolTicker();

  var sv = document.getElementById('short-vol');
  if (sv) sv.value = line;

  var fn = document.getElementById('flight_number');
  if (fn) {
    fn.value = flight;
    if (typeof applyFlightFromDb === 'function') applyFlightFromDb(flight);
    try { fn.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
  }

  var da = document.getElementById('da-date');
  if (da && dateIso) {
    da.value = dateIso;
    if (da._flatpickr && typeof da._flatpickr.setDate === 'function') {
      try { da._flatpickr.setDate(dateIso, true); } catch (e2) {}
    }
  }

  if (typeof closeMobileNav === 'function') closeMobileNav();
  scrollToFunnelAndHighlight();
  if (sv && typeof sv.focus === 'function') {
    try { sv.focus(); sv.setSelectionRange(sv.value.length, sv.value.length); } catch (errF) {}
  }
  }
  if (window.__ROBIN_DEFER_FUNNEL__ && !window.__ROBIN_FUNNEL_READY__ && typeof window.robinEnsureFunnelAssets === 'function') {
    window.robinEnsureFunnelAssets(doApply);
    return;
  }
  doApply();
}

(function volTickerBindClicks() {
  var root = document.getElementById('vol-ticker');
  if (!root) return;
  root.addEventListener('click', function(e) {
    var chip = e.target.closest('.vol-ticker-chip');
    if (!chip || !chip.getAttribute('data-flight')) return;
    e.preventDefault();
    volTickerApplyFlight(chip);
  });
})();

function updateManualDist(prefix) {
  ensureRouteAmountBuilt();
  var dep = document.getElementById(prefix + '-ville-depart');
  var arr = document.getElementById(prefix + '-ville-arrivee');
  var distIn = document.getElementById(prefix + '-dist');
  var distWrap = document.getElementById(prefix + '-dist-wrap');
  var line = document.getElementById(prefix + '-distance-line');
  if (!distIn) return;
  var c1 = (prefix === 'da' && window.tomSelectDaVilleDep) ? window.tomSelectDaVilleDep.getValue() : (dep ? dep.value : '');
  var c2 = (prefix === 'da' && window.tomSelectDaVilleArr) ? window.tomSelectDaVilleArr.getValue() : (arr ? arr.value : '');
  if (!c1 || !c2) {
    line.textContent = '';
    distIn.value = '';
    if (distWrap) distWrap.style.display = 'none';
    return;
  }
  var key = c1 + '-' + c2, keyRev = c2 + '-' + c1;
  var amount = ROUTE_AMOUNT[key] || ROUTE_AMOUNT[keyRev];
  if (amount) {
    distIn.value = String(amount);
    if (line) {
      line.textContent = DISTANCE_LINE[amount] || '';
      applyDistanceLineCurrency(line);
    }
    if (distWrap) distWrap.style.display = 'none';
    window.lastCalculatedDistanceKm = null;
  } else {
    distIn.value = '600';
    if (line) {
      line.textContent = (typeof DISTANCE_LINE !== 'undefined' && DISTANCE_LINE[600]) || '';
      applyDistanceLineCurrency(line);
    }
    if (distWrap) distWrap.style.display = 'none';
  }
}

/* ═══ VOL LOOKUP ═══ */
function volLookup(input, chipId, distWrapId, distId) {
  const raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  input.value = raw;

  const chipEl = document.getElementById(chipId);
  const distWrap = distWrapId ? document.getElementById(distWrapId) : null;
  const distSel = distId ? document.getElementById(distId) : null;
  const routeLine = document.getElementById('da-route-line');
  const distanceLine = document.getElementById('da-distance-line');
  const manualWrap = document.getElementById('da-manual-wrap');

  if (typeof DB === 'undefined' || !DB) return;
  const match = DB[raw];
  const prefix = raw.slice(0, 2);

  if (match) {
    var parts = match.r.split('→');
    var depCity = AIRPORT_CITY[parts[0].trim()] || parts[0];
    var arrCity = AIRPORT_CITY[parts[1].trim()] || parts[1];
    if (routeLine) routeLine.textContent = 'Départ : ' + depCity + ' | Arrivée : ' + arrCity;
    if (chipEl) {
      document.getElementById(chipId + '-route').textContent = match.a + ' · ' + match.r;
      document.getElementById(chipId + '-dist').textContent = DLABEL[match.c];
      var badge = document.getElementById(chipId + '-badge');
      badge.textContent =
        window.I18N && typeof I18N.formatFromEur === 'function' ? I18N.formatFromEur(match.c) : match.c + '€';
      badge.className = 'chip-badge ' + ({ 600:'badge-long', 400:'badge-mid', 250:'badge-short' }[match.c]);
      chipEl.style.display = 'flex';
    }
    if (distanceLine) {
      distanceLine.textContent = DISTANCE_LINE[match.c] || '';
      applyDistanceLineCurrency(distanceLine);
    }
    if (distSel) distSel.value = String(match.c);
    if (distWrap) distWrap.style.display = 'none';
    if (manualWrap) manualWrap.style.display = 'none';
  } else {
    if (routeLine) routeLine.textContent = '';
    if (chipEl) chipEl.style.display = 'none';
    if (distSel && raw.length === 0) distSel.value = '';
    if (distanceLine) distanceLine.textContent = '';
    if (distWrap) { distWrap.style.display = 'none'; distWrap.querySelectorAll('.dist-pill').forEach(p => p.classList.remove('active')); }
    if (PFX[prefix] && raw.length >= 4) {
      if (manualWrap) manualWrap.style.display = 'block';
    } else {
      if (manualWrap) manualWrap.style.display = 'none';
    }
  }
}

/* ═══ LOADER SUSPENSE ═══ */
const LOADER_MSGS = [
  'Consultation des données de vol...',
  'Analyse Eurocontrol...',
  'Vérification CE 261/2004...',
  'Calcul de votre indemnité...',
];

function showLoader(callback) {
  goTo('step-loader', 95);
  let i = 0;
  const loaderTxt  = document.getElementById('loader-text');
  const interval = setInterval(() => {
    i++;
    if (i < LOADER_MSGS.length) loaderTxt.textContent = LOADER_MSGS[i];
  }, 500);
  setTimeout(() => {
    clearInterval(interval);
    callback();
  }, 2200);
}

/* ═══ Count-up montant net (requestAnimationFrame, 1.5s) ═══ */
function animateValue(id, start, end, duration, onDone) {
  var el = document.getElementById(id);
  if (!el) return;
  var startTime = null;
  function step(timestamp) {
    if (startTime === null) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(1, elapsed / duration);
    var current = Math.round(start + (end - start) * progress);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(step);
    else if (typeof onDone === 'function') onDone();
  }
  requestAnimationFrame(step);
}

function buildCalcDetailText(totals) {
  if (!totals) return '';
  var pax = totals.pax;
  var brut = totals.brut;
  var totalBrut = totals.totalBrut;
  var totalFee = totals.totalFee;
  var totalNet = totals.totalNet;
  if (!window.I18N || typeof I18N.formatFromEur !== 'function') {
    return (
      totalBrut +
      '€ (indemnité légale' +
      (pax > 1 ? ' · ' + brut + '€ × ' + pax + ' pass.' : '') +
      ') − 25% Robin (' +
      totalFee +
      '€) = ' +
      totalNet +
      '€ net'
    );
  }
  var f = function (n) {
    return I18N.formatFromEur(n);
  };
  return (
    f(totalBrut) +
    ' (indemnité légale' +
    (pax > 1 ? ' · ' + f(brut) + ' × ' + pax + ' pass.' : '') +
    ') − 25% Robin (' +
    f(totalFee) +
    ') = ' +
    f(totalNet) +
    ' net'
  );
}

function refreshCalcResultView() {
  var t = window.__lastCalcTotals;
  if (!t || !window.I18N) return;
  var step = document.getElementById('step-result');
  if (!step || !step.classList.contains('active')) return;
  var cur = I18N.getCurrency ? I18N.getCurrency() : 'eur';
  var big = document.getElementById('res-net-big');
  if (big) {
    if (cur === 'eur') {
      big.innerHTML = '<span id="res-net-value">' + t.totalNet + '</span><span>€</span>';
    } else {
      big.innerHTML = '<span id="res-net-value">' + I18N.formatFromEur(t.totalNet) + '</span>';
    }
  }
  var calcDetailEl = document.getElementById('res-calc-detail');
  if (calcDetailEl) calcDetailEl.textContent = buildCalcDetailText(t);
  var stickyAmountEl = document.getElementById('sticky-cta-amount');
  if (stickyAmountEl && typeof I18N.formatFromEur === 'function') {
    stickyAmountEl.textContent =
      (I18N.getLang && I18N.getLang() === 'en' ? 'RECOVER ' : 'RÉCUPÉRER ') + I18N.formatFromEur(t.totalNet);
  }
}

document.addEventListener('robin-locale-change', function () {
  refreshCalcResultView();
});

/* ═══ CALCUL ═══ */
function doCalc(dist, paxVal, volRef, dateStr, vol1Str) {
  if (!dist) return false;

  const ind      = parseInt(dist);
  const brut     = ind; /* montant légal CE 261 */
  const fee      = Math.round(brut * COMMISSION_RATE);
  const net      = brut - fee;
  const pax      = parseInt(paxVal) || 1;
  const totalBrut = brut * pax;
  const totalNet  = net  * pax;
  const totalFee  = fee  * pax;

  const motifTxt = { retard:'Retard +3h', annulation:'Annulation', surbook:"Refus d'embarquement", correspondance:"J'ai raté ma correspondance à cause d'un retard" }[S.motif] || '';
  const match    = DB[(volRef || '').toUpperCase()];
  var routeStr   = '—';
  if (match && match.r) {
    var parts = match.r.split('→');
    var depIata = (parts[0] || '').trim();
    var arrIata = (parts[1] || '').trim();
    routeStr = depIata + ' ➔ ' + arrIata + ' • ' + pax + (pax > 1 ? ' Passagers' : ' Passager');
  } else if (volRef) {
    routeStr = volRef.replace(' → ', ' ➔ ') + ' • ' + pax + (pax > 1 ? ' Passagers' : ' Passager');
  }
  window.__lastCalcTotals = { totalBrut: totalBrut, totalFee: totalFee, totalNet: totalNet, brut: brut, pax: pax };
  var cur0 = window.I18N && I18N.getCurrency ? I18N.getCurrency() : 'eur';
  var bigEl = document.getElementById('res-net-big');
  if (bigEl) {
    if (cur0 === 'eur') {
      bigEl.innerHTML = '<span id="res-net-value">0</span><span>€</span>';
    } else {
      bigEl.innerHTML =
        '<span id="res-net-value">' +
        (window.I18N && I18N.formatFromEur ? I18N.formatFromEur(0) : '0') +
        '</span>';
    }
  }
  document.getElementById('res-route').textContent = routeStr;
  var badgeEl = document.getElementById('res-motif-badge');
  if (badgeEl) {
    badgeEl.textContent = motifTxt;
    badgeEl.style.display = motifTxt ? '' : 'none';
  }
  var calcDetailEl = document.getElementById('res-calc-detail');
  if (calcDetailEl) {
    calcDetailEl.textContent = buildCalcDetailText(window.__lastCalcTotals);
    calcDetailEl.style.display = 'block';
  }

  const raisonInfo = RAISON_LABELS[S.raison] || RAISON_LABELS.nesaispas;
  document.getElementById('res-raison-txt').textContent  = raisonInfo.t;
  document.getElementById('res-raison-note').textContent = raisonInfo.n;

  var flightNumberInput = document.getElementById('flight_number');
  var flightNum = (flightNumberInput && flightNumberInput.value && flightNumberInput.value.trim()) ? flightNumberInput.value.trim().toUpperCase() : (volRef || '—');
  var waMsg = 'Bonjour Robin ! Je viens de faire le diagnostic sur votre site.\nMon vol : ' + flightNum + '\nDate : ' + (dateStr || '') + '\nJe suis éligible et je veux lancer mon dossier.';
  var waHref = buildWhatsAppSendUrl(waMsg);
  var stickyWa = document.getElementById('sticky-wa-cta');
  if (stickyWa) stickyWa.href = waHref;
  var stickyAmountEl = document.getElementById('sticky-cta-amount');
  if (stickyAmountEl) {
    if (window.I18N && typeof I18N.formatFromEur === 'function') {
      stickyAmountEl.textContent =
        (I18N.getLang && I18N.getLang() === 'en' ? 'RECOVER ' : 'RÉCUPÉRER ') + I18N.formatFromEur(totalNet);
    } else {
      stickyAmountEl.textContent = 'RÉCUPÉRER MES ' + totalNet + ' EUROS';
    }
  }

  return totalNet;
}

function calcDirect() {
  const depCode = (window.tomSelectDaVilleDep && window.tomSelectDaVilleDep.getValue()) || '';
  const arrCode = (window.tomSelectDaVilleArr && window.tomSelectDaVilleArr.getValue()) || '';
  const dist = document.getElementById('da-dist').value;
  const pax  = document.getElementById('da-pax-val').textContent;
  const date = document.getElementById('da-date').value;
  if (!depCode || !arrCode) { flash('da-manual-wrap'); return; }
  if (!dist) { flash('da-manual-wrap'); return; }
  const routeRef = depCode && arrCode ? depCode + ' → ' + arrCode : '';
  showLoader(() => {
    var totalNet = doCalc(dist, pax, routeRef, date, null);
    goTo('step-result', 100);
    if (totalNet) {
      var curA = window.I18N && I18N.getCurrency ? I18N.getCurrency() : 'eur';
      if (curA === 'eur') {
        requestAnimationFrame(function () {
          animateValue('res-net-value', 0, totalNet, 1500);
        });
      } else {
        var elN = document.getElementById('res-net-value');
        if (elN && window.I18N && I18N.formatFromEur) elN.textContent = I18N.formatFromEur(totalNet);
      }
    }
  });
}

function calcEscale() {
  updateEscaleDist();
  const vol1 = (document.getElementById('eb-vol1').value || '').trim().toUpperCase();
  const vol2 = (document.getElementById('eb-vol2').value || '').trim().toUpperCase();
  const vol3El = document.getElementById('eb-vol3');
  const vol3 = (vol3El && vol3El.value) ? (vol3El.value || '').trim().toUpperCase() : '';
  const block3 = document.getElementById('eb-vol-block-3');
  const lastVol = (block3 && block3.style.display !== 'none' && vol3) ? vol3 : vol2;
  const dist = document.getElementById('eb-dist').value;
  const pax  = document.getElementById('eb-pax-val').textContent;
  const date = document.getElementById('eb-date').value;
  if (!dist) { flash('eb-vol-block-2'); return; }
  showLoader(() => {
    var totalNet = doCalc(dist, pax, lastVol || vol1, date, vol1);
    goTo('step-result', 100);
    if (totalNet) {
      var curB = window.I18N && I18N.getCurrency ? I18N.getCurrency() : 'eur';
      if (curB === 'eur') {
        requestAnimationFrame(function () {
          animateValue('res-net-value', 0, totalNet, 1500);
        });
      } else {
        var elN2 = document.getElementById('res-net-value');
        if (elN2 && window.I18N && I18N.formatFromEur) elN2.textContent = I18N.formatFromEur(totalNet);
      }
    }
  });
}

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('flash');
  if (el.focus) el.focus();
  setTimeout(() => el.classList.remove('flash'), 2200);
}

/* Dépôt dossier → page dédiée dossier.html */

/* ═══ SLIDER TÉMOIGNAGES — groupes de 3 ═══ */
let currentSlide = 0;
const TESTI_GROUPS = 2;

function goSlide(n) {
  currentSlide = n;
  // Masque tous, affiche groupe n
  document.querySelectorAll('.testi-card').forEach(c => {
    c.style.display = parseInt(c.dataset.group) === n ? '' : 'none';
  });
  document.querySelectorAll('.testi-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

function slideTestis(dir) {
  goSlide((currentSlide + dir + TESTI_GROUPS) % TESTI_GROUPS);
}

setInterval(() => slideTestis(1), 7000);

/* ═══ FAQ ═══ */
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-question.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.style.maxHeight = null;
  });
  if (!isOpen) {
    el.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

/* ═══ SCROLL REVEAL ═══ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ═══ INIT ═══ */
/** Hauteur du bloc header fixe (diaspora + nav) → padding hero & drawer */
function updateSiteHeaderOffset() {
  var el = document.getElementById('site-header');
  if (!el) return;
  var h = Math.ceil(el.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--site-header-height', h + 'px');
}
window.addEventListener('resize', updateSiteHeaderOffset);
window.addEventListener('load', function() { updateSiteHeaderOffset(); });

robinWhenDomReady(() => {
  // Appliquer la langue sauvegardée (ou FR) et mettre à jour le drapeau
  if (window.I18N) {
    var lang = window.I18N.getLang();
    var flags = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', nl: '🇳🇱', pt: '🇵🇹', de: '🇩🇪' };
    var cf = document.getElementById('current-flag');
    if (cf && flags[lang]) { cf.textContent = flags[lang]; }
    document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
    var opt = document.querySelector('.lang-option[data-lang="' + lang + '"]');
    if (opt) opt.classList.add('active');
    window.I18N.apply();
  }
  updateSiteHeaderOffset();
  var siteHeader = document.getElementById('site-header');
  if (siteHeader && typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function() { updateSiteHeaderOffset(); });
    ro.observe(siteHeader);
  }
  // Un seul numéro WhatsApp : remplace le numéro sans perdre ?text= (wa.me + api.whatsapp.com)
  var phoneNorm = String(WHATSAPP_NUMBER).replace(/\D/g, '');
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
    try {
      var raw = a.getAttribute('href');
      if (!raw) return;
      var u = new URL(raw, window.location.href);
      if (!/^wa\.me$/i.test(u.hostname.replace(/^www\./, ''))) return;
      u.pathname = '/' + phoneNorm;
      a.href = u.toString();
    } catch (err) {}
  });
  document.querySelectorAll('a[href*="api.whatsapp.com/send"]').forEach(function (a) {
    try {
      var raw = a.getAttribute('href');
      if (!raw) return;
      var u = new URL(raw, window.location.href);
      if (!/api\.whatsapp\.com$/i.test(u.hostname.replace(/^www\./, ''))) return;
      u.searchParams.set('phone', phoneNorm);
      a.href = u.toString();
    } catch (err) {}
  });
  function shortVolLooksLikeFlightMessage(body) {
    if (!body) return false;
    if (body.length >= 8) return true;
    if (document.getElementById('funnel-box') && document.getElementById('funnel-box').classList.contains('funnel-from-vol-chip')) return true;
    return /\b[A-Z]{2,3}\s*\d{2,4}\b/i.test(body);
  }
  /* Bulle flottante : si le vol du bandeau a prérempli le champ, utiliser ce texte (pas le href générique) */
  var waFloatEl = document.getElementById('wa-float');
  if (waFloatEl) {
    waFloatEl.addEventListener('click', function (e) {
      var sv = document.getElementById('short-vol');
      var body = sv && String(sv.value || '').trim();
      if (!shortVolLooksLikeFlightMessage(body)) return;
      e.preventDefault();
      openShortWhatsApp();
    }, true);
  }
  // Date par défaut : aujourd'hui − 10j
  const d = new Date();
  d.setDate(d.getDate() - 10);
  const ds = d.toISOString().split('T')[0];
  ['da-date','eb-date'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ds; });
  goTo('step-1', 12, false);

  window.robinInitFunnelHeavy = function robinInitFunnelHeavy() {
    if (window.robinInitFunnelHeavyDone) return;
    window.robinInitFunnelHeavyDone = true;
    var dInit = new Date();
    dInit.setDate(dInit.getDate() - 10);
    var dsHeavy = dInit.toISOString().split('T')[0];
    if (window.flatpickr) {
      var fpOpt = {
        locale: 'fr',
        dateFormat: 'd.m.Y',
        defaultDate: dsHeavy,
        maxDate: 'today',
        allowInput: true
      };
      var da = document.getElementById('da-date');
      var eb = document.getElementById('eb-date');
      if (da) window.flatpickr(da, fpOpt);
      if (eb) window.flatpickr(eb, Object.assign({}, fpOpt));
    }

    // Tom Select — Aéroports Départ / Arrivée : liste complète au chargement + recherche API à 2 caractères
    if (typeof TomSelect !== 'undefined') {
      var airportSearchApi = (typeof window.AIRPORT_SEARCH_API !== 'undefined' && window.AIRPORT_SEARCH_API) ? window.AIRPORT_SEARCH_API : (window.location.origin + '/.netlify/functions/airport-search');
      var airportsRaw = window.AIRPORTS_DATA && window.AIRPORTS_DATA.length ? window.AIRPORTS_DATA : [
        { value: 'CDG', text: 'Paris — CDG', city: 'Paris' }, { value: 'ORY', text: 'Paris — ORY', city: 'Paris' },
        { value: 'DSS', text: 'Dakar — DSS', city: 'Dakar' }, { value: 'LYS', text: 'Lyon — LYS', city: 'Lyon' },
        { value: 'MRS', text: 'Marseille — MRS', city: 'Marseille' }, { value: 'CMN', text: 'Casablanca — CMN', city: 'Casablanca' },
        { value: 'BRU', text: 'Bruxelles — BRU', city: 'Bruxelles' }
      ];
      var allAirportsOptions = airportsRaw.map(function(a) { return { value: a.value, text: a.text || (a.city + ' — ' + a.value) }; });
      var aopts = {
        options: allAirportsOptions,
        valueField: 'value',
        labelField: 'text',
        searchField: ['text', 'value'],
        maxItems: 1,
        placeholder: 'Choisir ou taper (ville ou code IATA)…',
        create: false,
        allowEmptyOption: true,
        openOnFocus: false,
        load: function(query, callback) {
          var qLower = (query || '').toLowerCase().trim();
          if (qLower.length < 1) {
            callback([]);
            return;
          }
          if (qLower.length < 2) {
            callback(allAirportsOptions.filter(function(o) {
              var s = (o.text + ' ' + o.value).toLowerCase();
              return s.indexOf(qLower) !== -1;
            }));
            return;
          }
          var q = encodeURIComponent(query);
          var staticList = airportsRaw.map(function(a) { return { value: a.value, text: a.text || (a.city + ' — ' + a.value) }; }).filter(function(a) {
            var s = (a.text + ' ' + a.value).toLowerCase();
            return s.indexOf(query.toLowerCase()) !== -1;
          });
          fetch(airportSearchApi + '?keyword=' + q).then(function(r) { return r.ok ? r.json() : Promise.reject(r); }).then(function(data) {
            var api = data || [];
            var seen = {};
            api.forEach(function(o) { seen[o.value] = true; });
            staticList.forEach(function(o) { if (!seen[o.value]) { seen[o.value] = true; api.push(o); } });
            callback(api);
          }).catch(function() {
            callback(staticList.length ? staticList : allAirportsOptions);
          });
        }
      };
      var saveVilleStorage = function(key, value, text) {
        try {
          if (value) { localStorage.setItem('robin_' + key, value); localStorage.setItem('robin_' + key + '_text', text || value); }
          else { localStorage.removeItem('robin_' + key); localStorage.removeItem('robin_' + key + '_text'); }
        } catch (e) {}
      };
      var daDep = document.getElementById('da-ville-depart');
      var daArr = document.getElementById('da-ville-arrivee');
      if (daDep && !daDep.tomselect) {
        window.tomSelectDaVilleDep = new TomSelect('#da-ville-depart', aopts);
        window.tomSelectDaVilleDep.on('change', function(v) {
          updateManualDist('da');
          var t = (window.tomSelectDaVilleDep.options && window.tomSelectDaVilleDep.options[v]) ? window.tomSelectDaVilleDep.options[v].text : v;
          saveVilleStorage('ville_depart', v, t);
        });
      }
      if (daArr && !daArr.tomselect) {
        window.tomSelectDaVilleArr = new TomSelect('#da-ville-arrivee', aopts);
        window.tomSelectDaVilleArr.on('change', function(v) {
          updateManualDist('da');
          var t = (window.tomSelectDaVilleArr.options && window.tomSelectDaVilleArr.options[v]) ? window.tomSelectDaVilleArr.options[v].text : v;
          saveVilleStorage('ville_arrivee', v, t);
          var guideDakar = document.getElementById('funnel-guide-dakar');
          if (guideDakar) guideDakar.style.display = (v === 'DSS' || v === 'DKR') ? 'block' : 'none';
        });
      }

      var btnNoVol = document.getElementById('btn-je-ne-trouve-pas-mon-vol');
      var principauxVolsWrap = document.getElementById('da-principaux-vols');
      if (btnNoVol) {
        btnNoVol.addEventListener('click', function() {
          if (principauxVolsWrap) {
            principauxVolsWrap.style.display = principauxVolsWrap.style.display === 'none' ? 'block' : 'none';
            if (principauxVolsWrap.style.display === 'block') principauxVolsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (principauxVolsWrap && principauxVolsWrap.style.display === 'none') {
            var wrap = document.getElementById('da-manual-wrap');
            if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (window.tomSelectDaVilleDep && window.tomSelectDaVilleDep.control) window.tomSelectDaVilleDep.focus();
          }
        });
      }
      document.querySelectorAll('.principaux-vol-chip').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var code = this.getAttribute('data-code');
          if (!code) return;
          var fnInput = document.getElementById('flight_number');
          if (fnInput) fnInput.value = code;
          if (typeof applyFlightFromDb === 'function') applyFlightFromDb(code);
        });
      });

      var flightNumberInput = document.getElementById('flight_number');
      var flightStatusEl = document.getElementById('flight_number_status');
      var flightCheckTimeout = null;
      if (flightNumberInput && flightStatusEl) {
        flightNumberInput.addEventListener('input', function() {
          var raw = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          this.value = raw;
          if (flightCheckTimeout) clearTimeout(flightCheckTimeout);
          flightStatusEl.textContent = '';
          flightStatusEl.className = 'flight-status';
          if (raw.length < 5) return;
          flightStatusEl.className = 'flight-status loading';
          flightStatusEl.textContent = 'Vérification des radars... ✈️';
          flightCheckTimeout = setTimeout(function() {
            raw = raw.replace(/\s/g, ''); // Diaspora : "AF 718" → "AF718" pour maximiser les retrouvailles
            if (typeof DB !== 'undefined' && DB[raw]) {
              if (applyFlightFromDb(raw)) return;
            }
            var apiUrl = window.location.origin + '/.netlify/functions/flight-info?flight=' + encodeURIComponent(raw);
            fetch(apiUrl).then(function(r) { return r.json(); }).then(function(data) {
              if (data && data.error) {
                console.error('flight-info API error:', data.error);
                flightStatusEl.className = 'flight-status';
                flightStatusEl.textContent = 'Vol non trouvé. Indiquez les villes ci-dessous.';
                return;
              }
              var list = Array.isArray(data) ? data : [];
              if (list.length === 0) {
                console.error('flight-info: données vides', data);
                flightStatusEl.className = 'flight-status';
                flightStatusEl.textContent = 'Vol non trouvé. Indiquez les villes ci-dessous.';
                return;
              }
              var f = list[0];
              var dep = f.departure || {};
              var arr = f.arrival || {};
              var depIata = String(dep.iataCode || (dep.airport && dep.airport.iataCode) || '').toUpperCase();
              var arrIata = String(arr.iataCode || (arr.airport && arr.airport.iataCode) || '').toUpperCase();
              if (!depIata || !arrIata) {
                console.error('flight-info: departure/arrival.iataCode manquants', f);
                flightStatusEl.className = 'flight-status';
                flightStatusEl.textContent = 'Vol non trouvé. Indiquez les villes ci-dessous.';
                return;
              }
              var depName = (dep.airport && dep.airport.name) || dep.city || depIata;
              var arrName = (arr.airport && arr.airport.name) || arr.city || arrIata;
              var depText = depName + ' (' + depIata + ') - ' + ((dep.airport && dep.airport.name) || depName);
              var arrText = arrName + ' (' + arrIata + ') - ' + ((arr.airport && arr.airport.name) || arrName);
              if (window.tomSelectDaVilleDep && depIata) {
                window.tomSelectDaVilleDep.addOption({ value: depIata, text: depText });
                window.tomSelectDaVilleDep.addItem(depIata, true);
              }
              if (window.tomSelectDaVilleArr && arrIata) {
                window.tomSelectDaVilleArr.addOption({ value: arrIata, text: arrText });
                window.tomSelectDaVilleArr.addItem(arrIata, true);
              }
              updateManualDist('da');
              var distIn = document.getElementById('da-dist');
              var distWrap = document.getElementById('da-dist-wrap');
              var lineEl = document.getElementById('da-distance-line');
              if (distIn && (!distIn.value || distIn.value === '')) {
                var km = null;
                if (f.geography && typeof f.geography.distance === 'number') km = f.geography.distance;
                else if (typeof f.distance === 'number') km = f.distance;
                else if (f.distance && typeof f.distance === 'string') km = parseInt(f.distance.replace(/\D/g, ''), 10);
                if (km == null && dep && arr) {
                  var lat1 = dep.latitude != null ? Number(dep.latitude) : (dep.airport && dep.airport.latitude != null) ? Number(dep.airport.latitude) : NaN;
                  var lon1 = dep.longitude != null ? Number(dep.longitude) : (dep.airport && dep.airport.longitude != null) ? Number(dep.airport.longitude) : NaN;
                  var lat2 = arr.latitude != null ? Number(arr.latitude) : (arr.airport && arr.airport.latitude != null) ? Number(arr.airport.latitude) : NaN;
                  var lon2 = arr.longitude != null ? Number(arr.longitude) : (arr.airport && arr.airport.longitude != null) ? Number(arr.airport.longitude) : NaN;
                  if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) km = haversineKm(lat1, lon1, lat2, lon2);
                }
                if (km != null && !isNaN(km)) {
                  var amount = distanceKmToAmount(km);
                  distIn.value = String(amount);
                  if (lineEl) {
                    lineEl.textContent = (typeof DISTANCE_LINE !== 'undefined' && DISTANCE_LINE[amount]) || '';
                    applyDistanceLineCurrency(lineEl);
                  }
                  if (distWrap) { distWrap.style.display = 'none'; distWrap.querySelectorAll('.dist-pill').forEach(function(p) { p.classList.remove('active'); }); }
                  window.lastCalculatedDistanceKm = km;
                }
              }
              var delayMin = arr.delay != null ? Number(arr.delay) : (arr.duration ? parseInt(String(arr.duration).replace(/\D/g, ''), 10) : 0);
              if (delayMin > 180) {
                flightStatusEl.className = 'flight-status success';
                flightStatusEl.textContent = 'Indemnité potentielle confirmée';
              } else {
                flightStatusEl.className = 'flight-status';
                flightStatusEl.textContent = 'Vol trouvé — Départ et arrivée renseignés';
              }
            }).catch(function(err) {
              console.error('flight-info fetch error:', err);
              flightStatusEl.className = 'flight-status';
              flightStatusEl.textContent = 'Vol non trouvé. Indiquez les villes ci-dessous.';
            });
          }, 400);
        });
      }
    }

    // Tom Select — Escale : Vol 1, 2, 3 (villes départ/arrivée — liste complète comme vol direct)
    if (typeof TomSelect !== 'undefined') {
      var airportSearchApiEscale = (typeof window.AIRPORT_SEARCH_API !== 'undefined' && window.AIRPORT_SEARCH_API) ? window.AIRPORT_SEARCH_API : (window.location.origin + '/.netlify/functions/airport-search');
      var airportsRawEscale = window.AIRPORTS_DATA && window.AIRPORTS_DATA.length ? window.AIRPORTS_DATA : [
        { value: 'CDG', text: 'Paris — CDG', city: 'Paris' }, { value: 'ORY', text: 'Paris — ORY', city: 'Paris' },
        { value: 'DSS', text: 'Dakar — DSS', city: 'Dakar' }, { value: 'LYS', text: 'Lyon — LYS', city: 'Lyon' },
        { value: 'MRS', text: 'Marseille — MRS', city: 'Marseille' }, { value: 'CMN', text: 'Casablanca — CMN', city: 'Casablanca' },
        { value: 'BRU', text: 'Bruxelles — BRU', city: 'Bruxelles' }
      ];
      var allAirportsOptionsEscale = airportsRawEscale.map(function(a) { return { value: a.value, text: a.text || (a.city + ' — ' + a.value) }; });
      var tsVilleOpts = {
        options: allAirportsOptionsEscale,
        valueField: 'value',
        labelField: 'text',
        searchField: ['text', 'value'],
        maxItems: 1,
        placeholder: 'Choisir ou taper (ville ou IATA)…',
        create: false,
        allowEmptyOption: true,
        openOnFocus: false,
        load: function(query, callback) {
          var qLower = (query || '').toLowerCase().trim();
          if (qLower.length < 1) {
            callback([]);
            return;
          }
          if (qLower.length < 2) {
            callback(allAirportsOptionsEscale.filter(function(o) {
              var s = (o.text + ' ' + o.value).toLowerCase();
              return s.indexOf(qLower) !== -1;
            }));
            return;
          }
          var q = encodeURIComponent(query);
          var staticList = airportsRawEscale.map(function(a) { return { value: a.value, text: a.text || (a.city + ' — ' + a.value) }; }).filter(function(a) {
            var s = (a.text + ' ' + a.value).toLowerCase();
            return s.indexOf(qLower) !== -1;
          });
          fetch(airportSearchApiEscale + '?keyword=' + q).then(function(r) { return r.ok ? r.json() : Promise.reject(r); }).then(function(data) {
            var api = data || [];
            var seen = {};
            api.forEach(function(o) { seen[o.value] = true; });
            staticList.forEach(function(o) { if (!seen[o.value]) { seen[o.value] = true; api.push(o); } });
            callback(api);
          }).catch(function() {
            callback(staticList.length ? staticList : allAirportsOptionsEscale);
          });
        }
      };
      var saveEscaleVille = function(prefix, value, text) {
        try {
          if (value) { localStorage.setItem('robin_' + prefix, value); localStorage.setItem('robin_' + prefix + '_text', text || value); }
          else { localStorage.removeItem('robin_' + prefix); localStorage.removeItem('robin_' + prefix + '_text'); }
        } catch (e) {}
      };
      [1, 2, 3].forEach(function(i) {
        var d = document.getElementById('eb-ville-depart-' + i);
        if (d && !d.tomselect) {
          var tsDep = new TomSelect('#eb-ville-depart-' + i, tsVilleOpts);
          tsDep.on('change', function() {
            updateEscaleDist();
            var v = tsDep.getValue(); var o = tsDep.options && tsDep.options[v]; saveEscaleVille('eb_ville_depart_' + i, v, o ? o.text : v);
          });
        }
        var a = document.getElementById('eb-ville-arrivee-' + i);
        if (a && !a.tomselect) {
          var tsArr = new TomSelect('#eb-ville-arrivee-' + i, tsVilleOpts);
          tsArr.on('change', function() {
            updateEscaleDist();
            var v = tsArr.getValue(); var o = tsArr.options && tsArr.options[v]; saveEscaleVille('eb_ville_arrivee_' + i, v, o ? o.text : v);
          });
        }
      });
    }
  };
  if (!window.__ROBIN_DEFER_FUNNEL__) window.robinInitFunnelHeavy();
});

function getEscaleSelectValue(id) {
  var el = document.getElementById(id);
  if (!el) return '';
  if (el.tomselect && el.tomselect.getValue) return el.tomselect.getValue() || '';
  return el.value || '';
}
function updateEscaleDist() {
  ensureRouteAmountBuilt();
  var block3 = document.getElementById('eb-vol-block-3');
  var dep1 = getEscaleSelectValue('eb-ville-depart-1');
  var arrLast = '';
  if (block3 && block3.style.display !== 'none') arrLast = getEscaleSelectValue('eb-ville-arrivee-3');
  if (!arrLast) arrLast = getEscaleSelectValue('eb-ville-arrivee-2');
  var distIn = document.getElementById('eb-dist');
  if (!distIn) return;
  if (!dep1 || !arrLast) { distIn.value = ''; return; }
  var key = dep1 + '-' + arrLast, keyRev = arrLast + '-' + dep1;
  var amount = (typeof ROUTE_AMOUNT !== 'undefined' && ROUTE_AMOUNT[key]) || (typeof ROUTE_AMOUNT !== 'undefined' && ROUTE_AMOUNT[keyRev]);
  if (amount) distIn.value = String(amount);
  else distIn.value = '600';
}

function toggleEscaleVol3() {
  var block = document.getElementById('eb-vol-block-3');
  var btn = document.getElementById('eb-add-vol-btn');
  if (!block || !btn) return;
  if (block.style.display === 'none') {
    block.style.display = 'block';
    btn.textContent = '− Masquer le 3e vol';
    updateEscaleDist();
  } else {
    block.style.display = 'none';
    btn.textContent = '+ Ajouter un 3e vol';
    updateEscaleDist();
  }
}
