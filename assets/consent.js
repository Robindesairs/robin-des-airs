/* Robin des Airs — bannière de consentement (CMP maison, sans dépendance).
 *
 * Objectif conformité (ePrivacy / art. 82 loi Informatique & Libertés / doctrine CNIL) :
 *   - AUCUN traceur publicitaire (pixel Meta, balise Google Ads) n'est déposé/exécuté
 *     AVANT le clic « Accepter ». Par défaut = rien ne se déclenche.
 *   - « Refuser » est aussi simple et visible qu'« Accepter » (même taille, même niveau) —
 *     exigence CNIL (délibérations Google/Facebook déc. 2021).
 *   - Le choix est mémorisé (localStorage) ; on ne réaffiche pas la bannière ensuite.
 *   - Les traceurs de MESURE D'AUDIENCE sans cookie (Plausible) restent hors périmètre
 *     (exemptés) et ne sont pas gérés ici.
 *
 * Remplace l'ancien bloc inline (gtag + Meta Pixel) qui était codé en dur sur chaque page
 * et se déclenchait immédiatement au chargement, sans consentement.
 */
(function () {
  'use strict';

  var STORE_KEY = 'rda_consent_v1';       // 'accepted' | 'refused'
  var GOOGLE_ADS_ID = 'AW-18269983535';
  var META_PIXEL_ID = '1563661872042064';

  function getChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }

  // ── Chargement effectif des traceurs (uniquement après consentement) ──────────
  var trackersLoaded = false;
  function loadTrackers() {
    if (trackersLoaded) return;
    trackersLoaded = true;

    // Google Ads (gtag.js)
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ADS_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GOOGLE_ADS_ID);

    // Meta Pixel (loader officiel)
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');

    // Conversion : clic vers WhatsApp = Lead (identique à l'ancien comportement)
    document.addEventListener('click', function (e) {
      var t = e.target;
      var a = t && t.closest ? t.closest('a[href*="wa.me"],a[href*="whatsapp.com"]') : null;
      if (a) { try { window.fbq('track', 'Lead', { content_name: 'whatsapp_click' }); } catch (_) {} }
    }, true);
  }

  // ── UI de la bannière ─────────────────────────────────────────────────────────
  function buildBanner() {
    var wrap = document.createElement('div');
    wrap.id = 'rda-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Gestion des cookies');
    wrap.innerHTML =
      '<div class="rda-consent-inner">' +
        '<p class="rda-consent-txt">🍪 Nous utilisons des cookies de <strong>mesure publicitaire</strong> (Meta, Google) ' +
        'pour évaluer nos campagnes. Ils ne se déclenchent qu\'avec votre accord. ' +
        'Les cookies strictement nécessaires au fonctionnement du site restent actifs. ' +
        '<a href="/politique-confidentialite.html" target="_blank" rel="noopener">En savoir plus</a>.</p>' +
        '<div class="rda-consent-btns">' +
          '<button type="button" id="rda-refuse" class="rda-consent-btn rda-consent-refuse">Tout refuser</button>' +
          '<button type="button" id="rda-accept" class="rda-consent-btn rda-consent-accept">Tout accepter</button>' +
        '</div>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#rda-consent{position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
      'background:#0B1F3A;color:#fff;box-shadow:0 -4px 24px rgba(0,0,0,.25);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Montserrat",sans-serif;' +
      'animation:rdaSlideUp .3s ease-out}' +
      '@keyframes rdaSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
      '.rda-consent-inner{max-width:960px;margin:0 auto;padding:16px 20px;display:flex;' +
      'align-items:center;gap:18px;flex-wrap:wrap;justify-content:space-between}' +
      '.rda-consent-txt{margin:0;font-size:13px;line-height:1.55;flex:1 1 340px;min-width:260px}' +
      '.rda-consent-txt a{color:#00E5A0;font-weight:600}' +
      '.rda-consent-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '.rda-consent-btn{font-size:13.5px;font-weight:700;padding:11px 20px;border-radius:8px;' +
      'cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}' +
      '.rda-consent-btn:hover{opacity:.88}' +
      // Refuser et Accepter au MÊME niveau visuel (taille/poids identiques) — exigence CNIL.
      '.rda-consent-refuse{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5)}' +
      '.rda-consent-accept{background:#00C87A;color:#0B1F3A}' +
      '@media(max-width:560px){.rda-consent-inner{padding:14px 16px}.rda-consent-btns{width:100%}' +
      '.rda-consent-btn{flex:1 1 0}}';

    document.head.appendChild(css);
    document.body.appendChild(wrap);

    document.getElementById('rda-accept').addEventListener('click', function () {
      setChoice('accepted'); removeBanner(); loadTrackers();
    });
    document.getElementById('rda-refuse').addEventListener('click', function () {
      setChoice('refused'); removeBanner();  // rien chargé
    });
  }

  function removeBanner() {
    var el = document.getElementById('rda-consent');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── Point d'entrée ────────────────────────────────────────────────────────────
  function init() {
    var choice = getChoice();
    if (choice === 'accepted') { loadTrackers(); return; }   // déjà accepté → charge, pas de bannière
    if (choice === 'refused')  { return; }                   // déjà refusé → rien
    buildBanner();                                           // pas de choix → demande
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
