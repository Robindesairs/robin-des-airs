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

    try {
      await loadScript('/i18n.js');
      await loadScript('/data/vol-ticker.js');
      if (!window.__ROBIN_DEFER_FUNNEL__) {
        await loadScript('https://cdn.jsdelivr.net/npm/flatpickr');
        await loadScript('https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/fr.js');
        await loadScript('/data/airlines.js');
        await loadScript('/data/airports.js');
        await loadScript('https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js');
        await loadScript('/data/flights-db.js');
        window.__ROBIN_FUNNEL_READY__ = true;
      }
      await loadScript('/assets/index-page.js');
      if (window.__ROBIN_FUNNEL_READY__ && typeof ensureRouteAmountBuilt === 'function') ensureRouteAmountBuilt();
      if (typeof window.refreshVolTicker === 'function') window.refreshVolTicker();
      if (window.__ROBIN_DEFER_FUNNEL__) {
        if (typeof window.robinWhenDomReady === 'function') {
          window.robinWhenDomReady(attachFunnelFocusPrefetch);
        } else {
          attachFunnelFocusPrefetch();
        }
      }
    } catch (e) {
      console.error('Robin home boot:', e);
    }
  }

  boot();
})();
