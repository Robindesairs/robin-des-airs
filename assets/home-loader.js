/**
 * Chaîne de chargement accueil : i18n + bandeau vols + index-page.
 * Sur viewport ≤768px, flatpickr / tom-select / DB vols ne chargent qu’au besoin
 * (scroll vers le formulaire, CTA calculateur, pastille bandeau, étapes 3a/3b).
 */
(function () {
  var MOBILE_MQ = '(max-width: 768px)';

  function isDeferFunnel() {
    try {
      return window.matchMedia(MOBILE_MQ).matches;
    } catch (e) {
      return false;
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('load failed: ' + src));
      };
      document.body.appendChild(s);
    });
  }

  var funnelPromise = null;

  window.robinEnsureFunnelAssets = function (cb) {
    if (!window.__ROBIN_DEFER_FUNNEL__) {
      if (cb) cb();
      return;
    }
    if (window.__ROBIN_FUNNEL_READY__) {
      if (cb) cb();
      return;
    }
    if (!funnelPromise) {
      funnelPromise = loadScript('https://cdn.jsdelivr.net/npm/flatpickr')
        .then(function () {
          return loadScript('https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/fr.js');
        })
        .then(function () {
          return loadScript('/data/airlines.js');
        })
        .then(function () {
          return loadScript('/data/airports.js');
        })
        .then(function () {
          return loadScript('https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js');
        })
        .then(function () {
          return loadScript('/data/flights-db.js');
        })
        .then(function () {
          window.__ROBIN_FUNNEL_READY__ = true;
          if (typeof ensureRouteAmountBuilt === 'function') ensureRouteAmountBuilt();
          if (typeof window.robinInitFunnelHeavy === 'function') window.robinInitFunnelHeavy();
          if (typeof window.refreshVolTicker === 'function') window.refreshVolTicker();
        })
        .catch(function (err) {
          console.error('Robin funnel bundle:', err);
          funnelPromise = null;
        });
    }
    funnelPromise.then(function () {
      if (cb) cb();
    });
  };

  /**
   * Pas d’IntersectionObserver sur #funnel-box : sur mobile le bloc est souvent dans le hero,
   * donc l’IO déclenchait tout de suite → même chaîne critique qu’avant (Lighthouse « requêtes bloquantes »).
   * On charge le bundle seulement sur intention : CTA, pastille bandeau, étapes 3a/3b, lien simulateur,
   * ou premier focus dans le formulaire.
   */
  function attachFunnelFocusPrefetch() {
    var box = document.getElementById('funnel-box');
    if (!box) return;
    var done = false;
    box.addEventListener(
      'focusin',
      function onFunnelFocus() {
        if (done) return;
        done = true;
        box.removeEventListener('focusin', onFunnelFocus, true);
        window.robinEnsureFunnelAssets();
      },
      true
    );
  }

  async function boot() {
    if (isDeferFunnel()) window.__ROBIN_DEFER_FUNNEL__ = true;

    // ── CŒUR INTERACTIF : i18n + bandeau + index-page (switchLang, nav, sélecteur de langue). ──
    // DOIT se charger AVANT le funnel lourd (CDN), et chaque maillon est isolé (try/catch).
    // Auparavant, sur desktop, index-page.js se chargeait en DERNIER, après flatpickr/tom-select :
    // si un CDN échouait (réseau lent/bloqué, adblock), la bascule de langue — et toute
    // l'interactivité — ne s'initialisait jamais, et les DEUX directions FR↔EN tombaient ensemble.
    try { await loadScript('/i18n.js'); } catch (e) { console.error('Robin i18n:', e); }
    try { await loadScript('/data/vol-ticker.js'); } catch (e) { console.error('Robin vol-ticker:', e); }
    try { await loadScript('/assets/index-page.js'); } catch (e) { console.error('Robin index-page:', e); }
    if (typeof window.refreshVolTicker === 'function') window.refreshVolTicker();

    // ── FUNNEL LOURD (CDN) — best-effort, APRÈS le cœur. Son échec ne casse plus la langue/nav. ──
    if (!window.__ROBIN_DEFER_FUNNEL__) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/flatpickr');
        await loadScript('https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/fr.js');
        await loadScript('/data/airlines.js');
        await loadScript('/data/airports.js');
        await loadScript('https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js');
        await loadScript('/data/flights-db.js');
        window.__ROBIN_FUNNEL_READY__ = true;
        if (typeof ensureRouteAmountBuilt === 'function') ensureRouteAmountBuilt();
        if (typeof window.refreshVolTicker === 'function') window.refreshVolTicker();
      } catch (e) {
        console.error('Robin funnel bundle:', e);
      }
    } else {
      if (typeof window.robinWhenDomReady === 'function') {
        window.robinWhenDomReady(attachFunnelFocusPrefetch);
      } else {
        attachFunnelFocusPrefetch();
      }
    }
  }

  boot();
})();
