/**
 * Radar V2 — veille auto aller (8h–18h, /2h) + retour (18h–03h, /30min).
 * Les deux veilles peuvent être actives en même temps (chevauchement autorisé).
 * Bouton « Tout scanner » : balaye tous les hubs un par un (départs + arrivées fusionnés).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rda_hub_last_scan_v1';
  var STAGGER_MS = 5 * 60 * 1000;
  var ALLER_CYCLE_MS = 2 * 60 * 60 * 1000;
  var RETURN_CYCLE_MS = 30 * 60 * 1000;

  /** Hubs aller atomiques (ordre = décalage +5 min). */
  var ALLER_ROUTES = [
    { zone: 'paris_cdg', label: 'Paris CDG', group: '1', minute: 0 },
    { zone: 'bru', label: 'Bruxelles', group: '5', minute: 5 },
    { zone: 'ams', label: 'Amsterdam', group: '6', minute: 10 },
    { zone: 'fco', label: 'Rome', group: '13', minute: 15 },
    { zone: 'mxp', label: 'Milan', group: '14', minute: 20 },
    { zone: 'lis', label: 'Lisbonne', group: '7', minute: 25 },
    { zone: 'mad', label: 'Madrid', group: '15', minute: 30 },
    { zone: 'bcn', label: 'Barcelone', group: '16', minute: 35 },
    { zone: 'fra', label: 'Francfort', group: '17', minute: 40 },
  ];

  var RETURN_ROUTES = [
    { id: 'paris', label: 'Paris CDG', hub: 'CDG', group: '1', minute: 5 },
    { id: 'bru', label: 'Bruxelles', hub: 'BRU', group: '5', minute: 10 },
    { id: 'ams', label: 'Amsterdam', hub: 'AMS', group: '6', minute: 15 },
    { id: 'fra', label: 'Francfort', hub: 'FRA', group: '17', minute: 20 },
    { id: 'south_it_fco', label: 'Rome', hub: 'FCO', group: '13', minute: 25, parent: 'south_it' },
    { id: 'south_it_mxp', label: 'Milan', hub: 'MXP', group: '14', minute: 30, parent: 'south_it' },
    { id: 'south_ib_lis', label: 'Lisbonne', hub: 'LIS', group: '7', minute: 35, parent: 'south_ib' },
    { id: 'south_ib_mad', label: 'Madrid', hub: 'MAD', group: '15', minute: 40, parent: 'south_ib' },
    { id: 'south_ib_bcn', label: 'Barcelone', hub: 'BCN', group: '16', minute: 45, parent: 'south_ib' },
  ];

  /** Liste unifiée des hubs (aller + retour appariés par groupe) pour le scan global. */
  var ALL_HUBS = [
    { label: 'Paris CDG', zone: 'paris_cdg', group: '1', hub: 'CDG' },
    { label: 'Bruxelles', zone: 'bru', group: '5', hub: 'BRU' },
    { label: 'Amsterdam', zone: 'ams', group: '6', hub: 'AMS' },
    { label: 'Francfort', zone: 'fra', group: '17', hub: 'FRA' },
    { label: 'Rome', zone: 'fco', group: '13', hub: 'FCO' },
    { label: 'Milan', zone: 'mxp', group: '14', hub: 'MXP' },
    { label: 'Lisbonne', zone: 'lis', group: '7', hub: 'LIS' },
    { label: 'Madrid', zone: 'mad', group: '15', hub: 'MAD' },
    { label: 'Barcelone', zone: 'bcn', group: '16', hub: 'BCN' },
  ];
  var SCAN_ALL_GAP_MS = 1500;

  var UI_PARENT = {
    south_it: { id: 'south_it', label: 'Rome · Milan', routes: ['south_it_fco', 'south_it_mxp'] },
    south_ib: { id: 'south_ib', label: 'Lisbonne · Madrid · Barcelone', routes: ['south_ib_lis', 'south_ib_mad', 'south_ib_bcn'] },
  };

  var ALLER_UI_PARENT = {
    eu_south_it: { id: 'eu_south_it', label: 'Rome · Milan', zones: ['fco', 'mxp'] },
    eu_south_ib: { id: 'eu_south_ib', label: 'Lisbonne · Madrid · Barcelone', zones: ['lis', 'mad', 'bcn'] },
  };

  var state = {
    allerAuto: false,
    returnAuto: false,
    scanBusy: false,
    timers: [],
    lastRuns: {},
  };

  function parisNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  }

  function isAllerWindow(now) {
    var h = (now || parisNow()).getHours();
    return h >= 8 && h < 18;
  }

  function isReturnWindow(now) {
    var h = (now || parisNow()).getHours();
    return h >= 18 || h < 3;
  }

  function isScanLocked() {
    return state.scanBusy || (window.__radarIsScanning && window.__radarIsScanning());
  }

  function loadStoredScans() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state.lastRuns = JSON.parse(raw) || {};
    } catch (e) {}
  }

  function saveStoredScans() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lastRuns));
    } catch (e) {}
  }

  function formatScanTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  }

  function updateBadge(key, ts) {
    var el = document.querySelector('.radar-scan-badge[data-scan-key="' + key + '"]');
    if (!el) return;
    var time = formatScanTime(ts);
    el.innerHTML =
      '<span class="radar-scan-badge-label">dernier scan</span>' +
      '<span class="radar-scan-badge-time">' +
      time +
      '</span>';
    el.classList.toggle('is-fresh', !!ts && Date.now() - ts < 35 * 60 * 1000);
    el.classList.toggle('is-empty', !ts);
  }


  var SERVER_BADGE_MAP = {
    aller_paris_cdg: ['aller_paris_cdg', 'paris_cdg'],
    aller_bru: ['aller_bru', 'bru'],
    aller_ams: ['aller_ams', 'ams'],
    aller_fco: ['aller_fco', 'fco'],
    aller_mxp: ['aller_mxp', 'mxp'],
    aller_lis: ['aller_lis', 'lis'],
    aller_mad: ['aller_mad', 'mad'],
    aller_bcn: ['aller_bcn', 'bcn'],
    aller_fra: ['aller_fra', 'fra'],
    return_paris: ['paris', 'paris'],
    return_bru: ['bru', 'bru'],
    return_ams: ['ams', 'ams'],
    return_fra: ['fra', 'fra'],
    return_south_it_fco: ['south_it_fco', 'south_it'],
    return_south_it_mxp: ['south_it_mxp', 'south_it'],
    return_south_ib_lis: ['south_ib_lis', 'south_ib'],
    return_south_ib_mad: ['south_ib_mad', 'south_ib'],
    return_south_ib_bcn: ['south_ib_bcn', 'south_ib'],
  };


  var ALLER_ZONE_BADGE_KEYS = {
    paris_cdg: ['aller_paris_cdg', 'paris_cdg'],
    bru: ['aller_bru', 'bru'],
    ams: ['aller_ams', 'ams'],
    eu_south_it: ['aller_eu_south_it', 'eu_south_it', 'aller_fco', 'aller_mxp', 'fco', 'mxp'],
    eu_south_ib: ['aller_eu_south_ib', 'eu_south_ib', 'aller_lis', 'aller_mad', 'aller_bcn', 'lis', 'mad', 'bcn'],
    frankfurt: ['aller_frankfurt', 'frankfurt', 'aller_fra', 'fra'],
    fco: ['aller_fco', 'fco'],
    mxp: ['aller_mxp', 'mxp'],
    lis: ['aller_lis', 'lis'],
    mad: ['aller_mad', 'mad'],
    bcn: ['aller_bcn', 'bcn'],
    fra: ['aller_fra', 'fra'],
    rome: ['aller_fco', 'fco', 'aller_eu_south_it', 'eu_south_it'],
    milan: ['aller_mxp', 'mxp', 'aller_eu_south_it', 'eu_south_it'],
    lisbon: ['aller_lis', 'lis', 'aller_eu_south_ib', 'eu_south_ib'],
    madrid: ['aller_mad', 'mad', 'aller_eu_south_ib', 'eu_south_ib'],
    barcelona: ['aller_bcn', 'bcn', 'aller_eu_south_ib', 'eu_south_ib'],
  };

  function returnBadgeKeys(hubOrId) {
    var hub = String(hubOrId || '').toUpperCase();
    var byHub = {
      CDG: ['paris'],
      BRU: ['bru'],
      AMS: ['ams'],
      FRA: ['fra'],
      FCO: ['south_it_fco', 'south_it'],
      MXP: ['south_it_mxp', 'south_it'],
      LIS: ['south_ib_lis', 'south_ib'],
      MAD: ['south_ib_mad', 'south_ib'],
      BCN: ['south_ib_bcn', 'south_ib'],
    };
    if (byHub[hub]) return byHub[hub];
    var id = String(hubOrId || '').trim();
    if (UI_PARENT[id]) return [id];
    return [id];
  }

  window.__radarMarkHubScanned = function (kind, zoneOrHub) {
    var keys =
      kind === 'aller'
        ? ALLER_ZONE_BADGE_KEYS[zoneOrHub] || ['aller_' + zoneOrHub, zoneOrHub]
        : returnBadgeKeys(zoneOrHub);
    recordScan(keys);
  };


  window.__radarSyncServerScanBadges = function (lastRuns) {
    if (!lastRuns) return;
    Object.keys(lastRuns).forEach(function (runKey) {
      var ts = lastRuns[runKey];
      var keys = SERVER_BADGE_MAP[runKey] || [runKey.replace(/^aller_/, ''), runKey.replace(/^return_/, '')];
      recordScan(keys, ts);
    });
  };

  function recordScan(keys, ts) {
    var t = ts || Date.now();
    (keys || []).forEach(function (k) {
      if (!k) return;
      state.lastRuns[k] = t;
      updateBadge(k, t);
    });
    saveStoredScans();
  }

  function setReturnStatus(msg, isErr) {
    var el = document.getElementById('return-scan-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? 'var(--red)' : 'var(--text2)';
  }

  function setAllerStatus(msg, isErr) {
    if (window.setAllerScanStatus) window.setAllerScanStatus(msg, isErr);
    else {
      var el = document.getElementById('aller-scan-status');
      if (el) {
        el.textContent = msg;
        el.style.color = isErr ? 'var(--red)' : 'var(--text2)';
      }
    }
  }

  function clearTimers() {
    state.timers.forEach(function (t) { clearTimeout(t); });
    state.timers = [];
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function runAllerRoute(route) {
    if (!route || !window.__radarRunAllerScan) return Promise.reject(new Error('Radar non prêt'));
    if (!isAllerWindow()) return Promise.resolve(0);
    if (isScanLocked()) return Promise.resolve(0);
    state.scanBusy = true;
    setAllerStatus('Veille aller · ' + route.label + '…');
    return window
      .__radarRunAllerScan(route.zone, [route.group])
      .then(function (n) {
        recordScan(['aller_' + route.zone, route.zone], Date.now());
        setAllerStatus('Aller ' + route.label + ' : ' + n + ' vol(s).');
        return n;
      })
      .catch(function (e) {
        setAllerStatus('Erreur aller ' + route.label + ' : ' + (e.message || e), true);
        throw e;
      })
      .finally(function () {
        state.scanBusy = false;
      });
  }

  function runReturnRoute(route) {
    if (!route || !window.__radarFetchReturnHub) return Promise.reject(new Error('Radar non prêt'));
    if (!isReturnWindow()) return Promise.resolve(0);
    if (isScanLocked()) return Promise.resolve(0);
    state.scanBusy = true;
    setReturnStatus('Veille retour · ' + route.label + '…');
    return window
      .__radarFetchReturnHub(route.hub, route.group)
      .then(function (n) {
        recordScan([route.parent || route.id, route.id], Date.now());
        setReturnStatus('Retour ' + route.label + ' : ' + n + ' vol(s).');
        if (window.__radarRenderReturnWatch) window.__radarRenderReturnWatch();
        return n;
      })
      .catch(function (e) {
        setReturnStatus('Erreur retour ' + route.label + ' : ' + (e.message || e), true);
        throw e;
      })
      .finally(function () {
        state.scanBusy = false;
      });
  }

  function scheduleAllerTick(route) {
    function planNext() {
      if (!state.allerAuto) return;
      if (!isAllerWindow()) {
        setAllerStatus('Veille aller en pause (créneau 8h–18h).', false);
        state.timers.push(setTimeout(planNext, 60 * 1000));
        return;
      }
      var now = parisNow();
      var min = now.getMinutes();
      var sec = now.getSeconds();
      var base = route.minute % 60;
      var deltaMin = (base - min + 60) % 60;
      if (deltaMin === 0 && sec > 8) deltaMin = 120;
      var delay = deltaMin * 60 * 1000 - sec * 1000;
      if (delay < 3000) delay += ALLER_CYCLE_MS;
      state.timers.push(setTimeout(function () {
        if (!state.allerAuto) {
          planNext();
          return;
        }
        runAllerRoute(route).catch(function () {}).finally(planNext);
      }, delay));
    }
    planNext();
  }

  function scheduleReturnTick(route) {
    function planNext() {
      if (!state.returnAuto) return;
      if (!isReturnWindow()) {
        setReturnStatus('Veille retour en pause (créneau 18h–03h).', false);
        state.timers.push(setTimeout(planNext, 60 * 1000));
        return;
      }
      var now = parisNow();
      var min = now.getMinutes();
      var sec = now.getSeconds();
      var base = route.minute % 60;
      var deltaMin = (base - min + 60) % 60;
      if (deltaMin === 0 && sec > 8) deltaMin = 30;
      var delay = deltaMin * 60 * 1000 - sec * 1000;
      if (delay < 3000) delay += RETURN_CYCLE_MS;
      state.timers.push(setTimeout(function () {
        if (!state.returnAuto) {
          planNext();
          return;
        }
        runReturnRoute(route).catch(function () {}).finally(planNext);
      }, delay));
    }
    planNext();
  }


  function selectionLabel(selId, kind) {
    var id = String(selId || '').trim();
    if (!id) return kind === 'return' ? 'Retour' : 'Aller';
    var parent = kind === 'return' ? UI_PARENT[id] : ALLER_UI_PARENT[id];
    if (parent && parent.label) return parent.label;
    if (kind === 'return') {
      var r = RETURN_ROUTES.find(function (x) { return x.id === id; });
      return r ? r.label : id;
    }
    var a = ALLER_ROUTES.find(function (x) { return x.zone === id; });
    return a ? a.label : id;
  }

  function routesForReturnSelection(selId) {
    if (!selId) return [];
    var parent = UI_PARENT[selId];
    if (parent) {
      return RETURN_ROUTES.filter(function (r) { return parent.routes.indexOf(r.id) >= 0; });
    }
    var one = RETURN_ROUTES.find(function (r) { return r.id === selId; });
    return one ? [one] : [];
  }

  function routesForAllerSelection(zoneKey) {
    if (!zoneKey) return [];
    var parent = ALLER_UI_PARENT[zoneKey];
    if (parent) {
      return ALLER_ROUTES.filter(function (r) { return parent.zones.indexOf(r.zone) >= 0; });
    }
    var one = ALLER_ROUTES.find(function (r) { return r.zone === zoneKey; });
    return one ? [one] : [];
  }

  function returnRoutesActive() {
    return routesForReturnSelection(window.__RADAR_RETURN_HUB__ || 'paris');
  }

  function allerRoutesActive() {
    return routesForAllerSelection(window.__RADAR_ALLER_ZONE__ || 'paris_cdg');
  }

  function rescheduleReturnVeille() {
    if (!state.returnAuto) return;
    clearTimers();
    var routes = returnRoutesActive();
    var label = selectionLabel(window.__RADAR_RETURN_HUB__, 'return');
    setReturnStatus(
      'Veille retour · zone « ' + label + ' » (' + routes.length + ' hub(s), /30min, +5 min).'
    );
    routes.forEach(scheduleReturnTick);
    if (state.allerAuto) allerRoutesActive().forEach(scheduleAllerTick);
  }

  function rescheduleAllerVeille() {
    if (!state.allerAuto) return;
    clearTimers();
    var routes = allerRoutesActive();
    var label = selectionLabel(window.__RADAR_ALLER_ZONE__, 'aller');
    setAllerStatus('Veille aller · zone « ' + label + ' » (' + routes.length + ' hub(s), /2h, +5 min).');
    routes.forEach(scheduleAllerTick);
    if (state.returnAuto) returnRoutesActive().forEach(scheduleReturnTick);
  }


  function toggleAllerAuto(on) {
    state.allerAuto = !!on;
    var btn = document.getElementById('btn-aller-auto');
    if (btn) {
      btn.classList.toggle('active', state.allerAuto);
      btn.classList.toggle('radar-scan-blink', state.allerAuto);
      btn.textContent = state.allerAuto ? '⏹ Veille aller active' : '🔁 Veille aller (8h–18h / 2h)';
    }
    if (!state.allerAuto) {
      if (!state.returnAuto) clearTimers();
      else returnRoutesActive().forEach(scheduleReturnTick);
      setAllerStatus('Veille aller arrêtée.');
      return;
    }
    setAllerStatus('Veille aller : scan /2h, +5 min entre hubs (8h–18h).');
    if (!state.returnAuto) clearTimers();
    rescheduleAllerVeille();
  }

  function toggleReturnAuto(on) {
    state.returnAuto = !!on;
    var btn = document.getElementById('btn-return-auto');
    if (btn) {
      btn.classList.toggle('active', state.returnAuto);
      btn.classList.toggle('radar-scan-blink', state.returnAuto);
      btn.textContent = state.returnAuto ? '⏹ Veille retour active' : '🔁 Veille retour (18h–3h)';
    }
    if (!state.returnAuto) {
      if (!state.allerAuto) clearTimers();
      else allerRoutesActive().forEach(scheduleAllerTick);
      setReturnStatus('Veille retour arrêtée.');
      return;
    }
    rescheduleReturnVeille();
  }

  function launchManualReturn() {
    if (!isReturnWindow()) {
      setReturnStatus('Retours : créneau 18h00–03h00 (Paris).', true);
      return;
    }
    if (isScanLocked()) {
      setReturnStatus('Scan déjà en cours.', true);
      return;
    }
    var sel = window.__radarReturnScheduler && window.__radarReturnScheduler.getSelected
      ? window.__radarReturnScheduler.getSelected()
      : null;
    var routes = routesForReturnSelection(sel);
    if (!routes.length) {
      setReturnStatus('Sélectionnez un hub ou une zone retour.', true);
      return;
    }
    var zoneLbl = selectionLabel(sel, 'return');
    setReturnStatus('Scan manuel · zone « ' + zoneLbl + ' » · ' + routes.length + ' hub(s)…');
    var chain = Promise.resolve();
    routes.forEach(function (route, idx) {
      chain = chain.then(function () {
        if (idx > 0) return sleep(STAGGER_MS).then(function () { return runReturnRoute(route); });
        return runReturnRoute(route);
      });
    });
    chain.catch(function () {});
  }

  /**
   * Scan fusionné d'un hub : départs (aller) + arrivées (retour) dans le même tableau.
   * `replace` = true vide le tableau avant (1er hub), sinon on additionne.
   */
  function scanHubBoth(h, replace) {
    if (!window.__radarRunAllerScan) return Promise.reject(new Error('Radar non prêt'));
    return window
      .__radarRunAllerScan(h.zone, [h.group], { merge: !replace })
      .then(function () {
        if (window.__radarMarkHubScanned) window.__radarMarkHubScanned('aller', h.zone);
        if (!window.__radarFetchReturnHub) return 0;
        return window.__radarFetchReturnHub(h.hub, h.group).catch(function () { return 0; });
      })
      .then(function () {
        if (window.__radarMarkHubScanned) window.__radarMarkHubScanned('return', h.hub);
        if (window.__radarRenderReturnWatch) window.__radarRenderReturnWatch();
      });
  }

  function scanAllHubs() {
    if (isScanLocked()) {
      setAllerStatus('Scan déjà en cours — patientez.', true);
      return;
    }
    state.scanBusy = true;
    var btn = document.getElementById('btn-scan-all');
    if (btn) { btn.disabled = true; btn.classList.add('radar-scan-blink'); }
    var total = ALL_HUBS.length;
    var chain = Promise.resolve();
    ALL_HUBS.forEach(function (h, idx) {
      chain = chain
        .then(function () { return idx > 0 ? sleep(SCAN_ALL_GAP_MS) : null; })
        .then(function () {
          setAllerStatus('Tout scanner · ' + h.label + ' (' + (idx + 1) + '/' + total + ')…');
          return scanHubBoth(h, idx === 0);
        });
    });
    chain
      .then(function () { setAllerStatus('Tout scanner terminé · ' + total + ' hubs (départs + arrivées).'); })
      .catch(function (e) { setAllerStatus('Tout scanner interrompu : ' + (e.message || e), true); })
      .finally(function () {
        state.scanBusy = false;
        if (btn) { btn.disabled = false; btn.classList.remove('radar-scan-blink'); }
      });
  }

  function decorateButtons(selector, badgePrefix) {
    document.querySelectorAll(selector).forEach(function (btn) {
      if (btn.querySelector('.radar-scan-badge')) return;
      btn.classList.add('radar-hub-btn');
      var label = btn.textContent.trim();
      btn.textContent = '';
      var span = document.createElement('span');
      span.className = 'radar-btn-label';
      span.textContent = label;
      var badge = document.createElement('span');
      badge.className = 'radar-scan-badge';
      var key = btn.getAttribute(badgePrefix === 'aller' ? 'data-zone' : 'data-return') || '';
      badge.setAttribute('data-scan-key', badgePrefix === 'aller' ? 'aller_' + key : key);
      btn.appendChild(span);
      btn.appendChild(badge);
    });
    Object.keys(state.lastRuns).forEach(function (k) { updateBadge(k, state.lastRuns[k]); });
  }

  function initReturnSelection() {
    document.querySelectorAll('.radar-return-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (isScanLocked()) {
          setReturnStatus('Scan en cours — patientez.', true);
          return;
        }
        var id = btn.getAttribute('data-return') || '';
        document.querySelectorAll('.radar-return-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        window.__RADAR_RETURN_HUB__ = id;
        if (window.__radarSetReturnDisplayFilter) window.__radarSetReturnDisplayFilter(id, { filterTable: false });
        if (state.returnAuto) rescheduleReturnVeille();
        else {
          var lbl = selectionLabel(id, 'return');
          setReturnStatus('Zone retour « ' + lbl + ' » — « Scanner ce hub maintenant » (uniquement cette zone).');
        }
      });
    });
    var first = document.querySelector('.radar-return-btn[data-return="paris"]');
    if (first) {
      first.classList.add('active');
      window.__RADAR_RETURN_HUB__ = 'paris';
    }
  }

  function init() {
    window.__RADAR_ALLER_ZONE__ = window.__RADAR_ALLER_ZONE__ || 'paris_cdg';
    window.setReturnScanStatus = setReturnStatus;
    loadStoredScans();
    document.querySelectorAll('.radar-zone-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.__RADAR_ALLER_ZONE__ = String(btn.getAttribute('data-zone') || '').trim() || 'paris_cdg';
        if (state.allerAuto) rescheduleAllerVeille();
      });
    });
    decorateButtons('.radar-zone-btn', 'aller');
    decorateButtons('.radar-return-btn', 'return');
    initReturnSelection();
    var retScan = document.getElementById('btn-return-scan');
    if (retScan) retScan.addEventListener('click', launchManualReturn);
    var retAuto = document.getElementById('btn-return-auto');
    if (retAuto) retAuto.addEventListener('click', function () { toggleReturnAuto(!state.returnAuto); });
    var allerAuto = document.getElementById('btn-aller-auto');
    if (allerAuto) allerAuto.addEventListener('click', function () { toggleAllerAuto(!state.allerAuto); });
    var scanAll = document.getElementById('btn-scan-all');
    if (scanAll) scanAll.addEventListener('click', scanAllHubs);
  }

  window.__radarReturnScheduler = {
    isReturnWindow: isReturnWindow,
    isAllerWindow: isAllerWindow,
    isBusy: function () { return isScanLocked(); },
    getSelected: function () { return window.__RADAR_RETURN_HUB__ || 'paris'; },
    getReturnRoutes: function () { return returnRoutesActive(); },
    getAllerRoutes: function () { return allerRoutesActive(); },
    recordScan: recordScan,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
