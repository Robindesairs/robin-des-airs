/**
 * Radar Robin des Airs — données réelles via /.netlify/functions/radar (AeroDataBox).
 * Attend le même DOM que radar.html (ids metrics, radar-tbody, modals, etc.).
 */
(function () {
  'use strict';

  const AF_AIRPORTS = [
    { code: 'DSS', ville: 'Dakar', pays: 'Sénégal' },
    { code: 'ABJ', ville: 'Abidjan', pays: "Côte d'Ivoire" },
    { code: 'FIH', ville: 'Kinshasa', pays: 'RDC' },
    { code: 'BKO', ville: 'Bamako', pays: 'Mali' },
    { code: 'DLA', ville: 'Douala', pays: 'Cameroun' },
    { code: 'NSI', ville: 'Yaoundé', pays: 'Cameroun' },
    { code: 'COO', ville: 'Cotonou', pays: 'Bénin' },
    { code: 'LOS', ville: 'Lagos', pays: 'Nigeria' },
    { code: 'ACC', ville: 'Accra', pays: 'Ghana' },
    { code: 'LFW', ville: 'Lomé', pays: 'Togo' },
    { code: 'OUA', ville: 'Ouagadougou', pays: 'Burkina' },
    { code: 'NIM', ville: 'Niamey', pays: 'Niger' },
    { code: 'LBV', ville: 'Libreville', pays: 'Gabon' },
    { code: 'BZV', ville: 'Brazzaville', pays: 'Congo' },
    { code: 'RAK', ville: 'Marrakech', pays: 'Maroc' },
    { code: 'CMN', ville: 'Casablanca', pays: 'Maroc' },
    { code: 'ALG', ville: 'Alger', pays: 'Algérie' },
    { code: 'ORN', ville: 'Oran', pays: 'Algérie' },
    { code: 'TUN', ville: 'Tunis', pays: 'Tunisie' },
    { code: 'CAI', ville: 'Le Caire', pays: 'Égypte' },
    { code: 'ADD', ville: 'Addis-Abeba', pays: 'Éthiopie' },
    { code: 'NBO', ville: 'Nairobi', pays: 'Kenya' },
    { code: 'JNB', ville: 'Johannesburg', pays: 'Afrique du Sud' },
    { code: 'MRU', ville: 'Maurice', pays: 'Maurice' },
    { code: 'RUN', ville: 'La Réunion', pays: 'Réunion' },
    { code: 'TNR', ville: 'Antananarivo', pays: 'Madagascar' },
    { code: 'BJL', ville: 'Banjul', pays: 'Gambie' },
    { code: 'CKY', ville: 'Conakry', pays: 'Guinée' },
    { code: 'FNA', ville: 'Freetown', pays: 'Sierra Leone' },
    { code: 'ABV', ville: 'Abuja', pays: 'Nigeria' },
    { code: 'NDJ', ville: "N'Djamena", pays: 'Tchad' },
    { code: 'KGL', ville: 'Kigali', pays: 'Rwanda' },
    { code: 'EBB', ville: 'Entebbe', pays: 'Ouganda' },
    { code: 'DAR', ville: 'Dar es Salaam', pays: 'Tanzanie' },
    { code: 'GOA', ville: 'Goma', pays: 'RDC' },
    { code: 'HAH', ville: 'Moroni', pays: 'Comores' },
    { code: 'PHC', ville: 'Port Harcourt', pays: 'Nigeria' },
    { code: 'BGF', ville: 'Bangui', pays: 'RCA' },
    { code: 'SSG', ville: 'Malabo', pays: 'Guinée Éq.' },
    { code: 'VXE', ville: 'São Vicente', pays: 'Cap-Vert' },
    { code: 'RAI', ville: 'Praia', pays: 'Cap-Vert' },
    { code: 'OXB', ville: 'Bissau', pays: 'Guinée-Bissau' },
    { code: 'MGQ', ville: 'Mogadiscio', pays: 'Somalie' },
    { code: 'JIB', ville: 'Djibouti', pays: 'Djibouti' },
    { code: 'ASM', ville: 'Asmara', pays: 'Érythrée' },
    { code: 'SEZ', ville: 'Mahé', pays: 'Seychelles' },
    { code: 'CPT', ville: 'Le Cap', pays: 'Afrique du Sud' },
    { code: 'MPM', ville: 'Maputo', pays: 'Mozambique' }
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
    { code: 'NTE', ville: 'Nantes' }
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

  function mapApiFlightToVol(f, idx) {
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
      std: zuluToHhmm(f.scheduledDeparture),
      sta: zuluToHhmm(f.scheduledArrival),
      eta: zuluToHhmm(f.landedAtZulu || f.estimatedArrival || f.scheduledArrival),
      etd: zuluToHhmm(f.estimatedDeparture || f.scheduledDeparture),
      statut: statut,
      retardMin: cancelled ? 0 : dm,
      cause: null,
      elig: elig,
      score: score,
      phase: phaseFromApi(f, statut),
      immat: '—',
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

  function updateApiAlert() {
    var el = document.getElementById('radar-api-alert');
    if (!el) return;
    if (RADAR_ERROR) {
      el.style.display = 'block';
      el.innerHTML =
        '<strong>Radar indisponible ou incomplet.</strong> ' +
        String(RADAR_ERROR) +
        ' — Vérifiez sur Netlify la variable <code style="font-size:11px">RAPIDAPI_KEY</code> ou <code style="font-size:11px">AERODATABOX_RAPIDAPI_KEY</code>, puis redéployez.';
    } else {
      el.style.display = 'none';
      el.innerHTML = '';
    }
  }

  function fetchRadarFromNetlify() {
    var url = apiRadarOrigin() + '/.netlify/functions/radar?_=' + Date.now();
    return fetch(url, { cache: 'no-store' })
      .then(function (r) {
        return r.text().then(function (text) {
          var data = {};
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error(r.ok ? 'Réponse JSON invalide du serveur' : 'Erreur HTTP ' + r.status + ' (réponse non JSON)');
          }
          if (!r.ok && data.error) {
            RADAR_ERROR = data.error;
            RADAR_META = { updatedAt: data.updatedAt, dataSource: data.dataSource, viewDate: data.viewDate };
            VOLS = [];
            return;
          }
          if (data.error && (!data.flights || !data.flights.length)) {
            RADAR_ERROR = data.error;
            RADAR_META = { updatedAt: data.updatedAt, dataSource: data.dataSource, viewDate: data.viewDate };
            VOLS = [];
            return;
          }
          RADAR_ERROR = data.error || null;
          RADAR_META = { updatedAt: data.updatedAt, dataSource: data.dataSource, viewDate: data.viewDate };
          VOLS = (data.flights || []).map(mapApiFlightToVol);
        });
      })
      .catch(function (e) {
        RADAR_ERROR = e.message || 'Erreur réseau';
        VOLS = [];
      });
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
      return 'metric metric-clickable' + (on ? ' metric-active' : '');
    }
    var h = document.getElementById('metrics');
    if (!h) return;
    h.innerHTML =
      '<div class="' +
      mcc('all') +
      '" role="button" tabindex="0" title="Afficher tous les vols" onclick="window.__radarApplyMetric(&quot;all&quot;)" onkeydown="window.__radarMetricKey(event,&quot;all&quot;)"><div class="metric-label">Vols listés</div><div class="metric-val navy">' +
      VOLS.length +
      '</div><div class="metric-sub">' +
      subAll +
      '</div></div>' +
      '<div class="' +
      mcc('a_lheure') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;a_lheure&quot;)" onkeydown="window.__radarMetricKey(event,&quot;a_lheure&quot;)"><div class="metric-label">À l\'heure</div><div class="metric-val green">' +
      VOLS.filter(function (v) { return v.statut === 'A_LHEURE'; }).length +
      '</div><div class="metric-sub">' +
      pctHeure +
      '%</div></div>' +
      '<div class="' +
      mcc('retard_3h') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;retard_3h&quot;)" onkeydown="window.__radarMetricKey(event,&quot;retard_3h&quot;)"><div class="metric-label">Retards ≥ 3h</div><div class="metric-val orange">' +
      retardsLong +
      '</div><div class="metric-sub">CE 261 potentiel</div></div>' +
      '<div class="' +
      mcc('annule') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;annule&quot;)" onkeydown="window.__radarMetricKey(event,&quot;annule&quot;)"><div class="metric-label">Annulés</div><div class="metric-val red">' +
      annules +
      '</div><div class="metric-sub">—</div></div>' +
      '<div class="' +
      mcc('elig') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;elig&quot;)" onkeydown="window.__radarMetricKey(event,&quot;elig&quot;)"><div class="metric-label">Indemnisation (estim.)</div><div class="metric-val gold">' +
      eligOui +
      '</div><div class="metric-sub">retard 3h+ ou annul.</div></div>' +
      '<div class="' +
      mcc('urgent') +
      '" role="button" tabindex="0" onclick="window.__radarApplyMetric(&quot;urgent&quot;)" onkeydown="window.__radarMetricKey(event,&quot;urgent&quot;)"><div class="metric-label">🔴 Urgents</div><div class="metric-val purple">' +
      urgents +
      '</div><div class="metric-sub">annul. ou 3h+ élig.</div></div>';
  }

  function renderRadar() {
    var rows = filteredVols();
    var tbody = document.getElementById('radar-tbody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="15" style="text-align:center;padding:2rem;color:#9CA3AF">' +
        (RADAR_ERROR ? 'Aucun vol (erreur API). Corrigez la configuration Netlify.' : 'Aucun vol ne correspond aux filtres.') +
        '</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map(function (v) {
        var sensHtml = sensBadge(v.sens);
        var statutHtml;
        var retardHtml = '<span style="color:var(--green);font-weight:700">0h00</span>';
        if (v.statut === 'A_LHEURE') statutHtml = '<span class="badge b-ok">✓ À l\'heure</span>';
        else if (v.statut === 'RETARD') {
          statutHtml = '<span class="badge b-retard">Retard</span>';
          var cls = v.retardMin >= 180 ? 'retard-crit' : v.retardMin >= 60 ? 'retard-warn' : 'retard-ok';
          retardHtml = '<span class="retard-h ' + cls + '">' + retardH(v.retardMin) + '</span>';
        } else {
          statutHtml = '<span class="badge b-annule">Annulé</span>';
          retardHtml = '<span style="color:var(--red);font-weight:700">—</span>';
        }
        var causeHtml = v.cause ? '<span class="cause-pill ' + CAUSE_CLS[v.cause] + '">' + CAUSE_LBL[v.cause] + '</span>' : '<span style="color:#9CA3AF;font-size:11px">—</span>';
        var scoreHtml =
          v.score > 0
            ? '<div class="score-bar"><div class="score-bg"><div class="score-fill" style="width:' +
              v.score +
              '%;background:' +
              scoreColor(v.score) +
              '"></div></div><span class="score-num" style="color:' +
              scoreColor(v.score) +
              '">' +
              v.score +
              '</span></div>'
            : '<span style="color:#9CA3AF;font-size:11px">—</span>';
        var prioHtml = '<span class="prio-tag ' + PRIO_CLS[v.prio] + '">' + PRIO_LBL[v.prio] + '</span>';
        var phaseHtml = '<span class="phase ' + (PHASE_CLS[v.phase] || '') + '">' + (PHASE_LBL[v.phase] || v.phase) + '</span>';
        var eligBadge =
          v.elig === 'OUI'
            ? '<div style="font-size:10px;font-weight:700;color:#145A32;background:#D5F5E3;border-radius:4px;padding:1px 5px;margin-top:2px">à qualifier</div>'
            : '';
        var rowCls = v.prio === 'URGENT' ? (v.statut === 'ANNULE' ? 'row-critical' : 'row-hot') : v.elig === 'OUI' ? 'row-eligible' : '';
        var track =
          v.trackerUrl && v.trackerUrl !== '#'
            ? '<a class="btn btn-sm" href="' +
              v.trackerUrl +
              '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Suivi</a> '
            : '';
        return (
          '<tr class="' +
          rowCls +
          '" onclick="window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)"><td>' +
          prioHtml +
          '</td><td style="font-weight:700;color:var(--navy);font-size:12px">' +
          v.vol +
          eligBadge +
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
          '</div></td><td style="font-family:monospace;font-size:12px">' +
          v.std +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.sta || '<span style="color:var(--red)">—</span>') +
          '</td><td style="font-family:monospace;font-size:12px">' +
          (v.eta || '<span style="color:var(--red)">Annulé</span>') +
          '</td><td>' +
          retardHtml +
          '</td><td>' +
          phaseHtml +
          '</td><td>' +
          causeHtml +
          '</td><td>' +
          scoreHtml +
          '</td><td><span class="immat">' +
          v.immat +
          '</span><div style="font-size:10px;color:#9CA3AF">' +
          (v.surveillanceRetour ? 'Surv. retour' : v.type) +
          '</div></td><td style="white-space:nowrap">' +
          track +
          '<button class="btn btn-sm" onclick="event.stopPropagation();window.__radarOpenDetail(&quot;' +
          v.id +
          '&quot;)" title="Détail">🔍</button>' +
          (v.elig === 'OUI' || v.elig === 'PEUT_ETRE'
            ? '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.__radarAddElig(&quot;' + v.id + '&quot;)" title="Éligible">✓</button>'
            : '') +
          '<button class="btn btn-gold btn-sm" onclick="event.stopPropagation();window.__radarOpenPub(&quot;' +
          v.id +
          '&quot;)" title="Pub">📣</button></td></tr>'
        );
      })
      .join('');
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
    document.getElementById('md-body').innerHTML =
      '<div class="grid2" style="margin-bottom:12px"><div class="info-box"><div class="info-box-title">Vol (AeroDataBox)</div>' +
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
    document.getElementById('modal-detail').style.display = 'flex';
  }

  function addElig(id) {
    var v = VOLS.find(function (x) { return x.id === id; });
    if (!v) return;
    if (!ELIGIBLES.find(function (x) { return x.id === id; })) ELIGIBLES.unshift(v);
    document.getElementById('elig-count-badge').textContent = String(ELIGIBLES.length);
    renderElig();
    closeModals();
    switchTab(document.querySelector('[onclick*="t-eligible"]'), 't-eligible');
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
        '</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="amount-badge" style="flex-direction:column;line-height:1.2;padding:6px 14px"><span style="font-size:10px;font-weight:600;opacity:.7">à dossier</span><span style="font-size:16px">CE 261</span></span><button class="btn btn-gold btn-sm" onclick="event.stopPropagation();window.__radarOpenPub(&quot;' +
        v.id +
        '&quot;)">📣 Pub</button><button class="btn btn-sm" onclick="event.stopPropagation();window.__radarRemoveElig(&quot;' +
        v.id +
        '&quot;)">✕</button></div></div>'
      );
    }).join('');
  }

  function openPub(id) {
    currentPubVol = VOLS.find(function (x) { return x.id === id; });
    if (!currentPubVol) return;
    document.getElementById('pub-info').textContent =
      currentPubVol.vol +
      ' — ' +
      currentPubVol.comp +
      ' — ' +
      currentPubVol.dep_ville +
      ' → ' +
      currentPubVol.arr_ville +
      ' · ' +
      (currentPubVol.statut === 'ANNULE' ? 'Annulé' : 'Retard ' + retardH(currentPubVol.retardMin));
    updBudget();
    document.getElementById('modal-pub').style.display = 'flex';
  }

  function updBudget() {
    var v = parseInt(document.getElementById('budget-sl') && document.getElementById('budget-sl').value, 10) || 10;
    document.getElementById('budget-disp').textContent = v + ' €';
    document.getElementById('pub-total').textContent = v + ' €';
    document.getElementById('budget-reach').textContent =
      '~' + Math.round(v / 0.05).toLocaleString('fr-FR') + ' personnes · Diaspora ' + (currentPubVol && currentPubVol.af_pays) + ' · Aéroport ' + ((currentPubVol && currentPubVol.dep) || 'concerné');
  }

  function lancerPub() {
    var v = parseInt(document.getElementById('budget-sl').value, 10) || 10;
    var plats = [].slice.call(document.querySelectorAll('.pub-platform.selected')).map(function (e) { return e.dataset.p; }).join(', ');
    if (!plats) {
      alert('Sélectionne au moins une plateforme.');
      return;
    }
    alert(
      '✅ Simulation campagne.\n\nVol : ' +
        (currentPubVol && currentPubVol.vol) +
        ' — ' +
        (currentPubVol && currentPubVol.comp) +
        '\n' +
        (currentPubVol && currentPubVol.dep_ville) +
        ' → ' +
        (currentPubVol && currentPubVol.arr_ville) +
        '\nBudget : ' +
        v +
        ' €\nPlateformes : ' +
        plats
    );
    closeModals();
  }

  function switchTab(el, id) {
    document.querySelectorAll('.tab-btn').forEach(function (t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(function (t) { t.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    if (id === 't-stats') renderStats();
    if (id === 't-eligible') renderElig();
  }

  function closeModals() {
    document.getElementById('modal-detail').style.display = 'none';
    document.getElementById('modal-pub').style.display = 'none';
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
    metricQuickFilter = null;
    var tbody = document.getElementById('radar-tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="15" style="text-align:center;padding:2rem;color:#9CA3AF">Chargement des vols depuis le serveur…</td></tr>';
    }
    fetchRadarFromNetlify().then(function () {
      updateApiAlert();
      renderMetrics();
      renderRadar();
      renderCompFilter();
      if (currentPeriod) renderStats();
      renderElig();
      countdownSec = 25 * 60;
      var n = new Date();
      var el = document.getElementById('last-refresh');
      if (el) {
        var extra = RADAR_META && RADAR_META.updatedAt ? ' · API ' + new Date(RADAR_META.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        el.textContent = 'Dernière actu : ' + String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + extra;
      }
    });
  }

  window.__radarOpenDetail = openDetail;
  window.__radarAddElig = addElig;
  window.__radarRemoveElig = removeElig;
  window.__radarOpenPub = openPub;
  window.__radarApplyMetric = applyMetricFilter;
  window.__radarMetricKey = metricKey;

  document.getElementById('r-search') && (document.getElementById('r-search').oninput = renderRadar);
  document.getElementById('r-sens') && (document.getElementById('r-sens').onchange = renderRadar);
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
    if (countdownSec === 0) refreshAll();
  }, 1000);

  refreshAll();
})();
