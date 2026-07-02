/* Robin des Airs — bannière de consentement (CMP maison, sans dépendance).
 *
 * Objectif conformité (ePrivacy / art. 82 loi Informatique & Libertés / doctrine CNIL) :
 *   - AUCUN traceur publicitaire (pixel Meta, balise Google Ads) n'est déposé/exécuté
 *     AVANT le clic « Accepter ». Par défaut = rien ne se déclenche.
 *   - « Refuser » est aussi simple et visible qu'« Accepter » (même taille, même niveau) —
 *     exigence CNIL (délibérations Google/Facebook déc. 2021).
 *   - Le choix est mémorisé (localStorage) ; on ne réaffiche pas la bannière ensuite.
 *   - Le RETRAIT du consentement doit être aussi simple que le don (CNIL) : un onglet
 *     permanent « 🍪 Cookies » (bas de page) rouvre le panneau à tout moment.
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

  // ── Retrait du consentement (après un « Accepter » antérieur) ─────────────────
  // On ne peut pas physiquement retirer un script déjà injecté dans la page, mais on
  // utilise les API officielles Meta/Google pour stopper toute collecte FUTURE — c'est
  // le comportement attendu et documenté par ces deux plateformes pour un retrait.
  function stopTrackers() {
    try { if (window.fbq) window.fbq('consent', 'revoke'); } catch (_) {}
    try {
      if (window.gtag) {
        window.gtag('consent', 'update', {
          ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        });
      }
    } catch (_) {}
  }

  var cssInjected = false;
  function injectCss() {
    if (cssInjected) return;
    cssInjected = true;
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
      '.rda-consent-status{display:block;margin-top:4px;font-size:11.5px;color:#9fb3c8}' +
      '.rda-consent-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '.rda-consent-btn{font-size:13.5px;font-weight:700;padding:11px 20px;border-radius:8px;' +
      'cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}' +
      '.rda-consent-btn:hover{opacity:.88}' +
      // Refuser et Accepter au MÊME niveau visuel (taille/poids identiques) — exigence CNIL.
      '.rda-consent-refuse{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5)}' +
      '.rda-consent-accept{background:#00C87A;color:#0B1F3A}' +
      '@media(max-width:560px){.rda-consent-inner{padding:14px 16px}.rda-consent-btns{width:100%}' +
      '.rda-consent-btn{flex:1 1 0}}' +
      // Onglet permanent « Gérer mes cookies » — retrait aussi facile que le don (CNIL).
      // Bas-GAUCHE (le bouton WhatsApp flottant occupe conventionnellement le bas-droite).
      '#rda-tab{position:fixed;left:14px;bottom:14px;z-index:99998;background:#fff;' +
      'color:#0B1F3A;border:1px solid #E2E6EE;border-radius:20px;padding:8px 14px;' +
      'font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(11,31,58,.14);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Montserrat",sans-serif}' +
      '#rda-tab:hover{box-shadow:0 4px 14px rgba(11,31,58,.2)}';
    document.head.appendChild(css);
  }

  // ── UI de la bannière (1er affichage OU réouverture depuis l'onglet) ──────────
  function buildBanner(reopened) {
    hideTab();
    var wrap = document.createElement('div');
    wrap.id = 'rda-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Gestion des cookies');

    var current = getChoice();
    var statusTxt = reopened
      ? ('<span class="rda-consent-status">Choix actuel : ' +
          (current === 'accepted' ? 'vous avez accepté les cookies publicitaires.'
            : current === 'refused' ? 'vous avez refusé les cookies publicitaires.'
            : 'aucun choix enregistré.') + '</span>')
      : '';

    wrap.innerHTML =
      '<div class="rda-consent-inner">' +
        '<p class="rda-consent-txt">🍪 Nous utilisons des cookies de <strong>mesure publicitaire</strong> (Meta, Google) ' +
        'pour évaluer nos campagnes. Ils ne se déclenchent qu\'avec votre accord. ' +
        'Les cookies strictement nécessaires au fonctionnement du site restent actifs. ' +
        '<a href="/politique-confidentialite.html" target="_blank" rel="noopener">En savoir plus</a>.' +
        statusTxt + '</p>' +
        '<div class="rda-consent-btns">' +
          '<button type="button" id="rda-refuse" class="rda-consent-btn rda-consent-refuse">Tout refuser</button>' +
          '<button type="button" id="rda-accept" class="rda-consent-btn rda-consent-accept">Tout accepter</button>' +
        '</div>' +
      '</div>';

    injectCss();
    document.body.appendChild(wrap);

    document.getElementById('rda-accept').addEventListener('click', function () {
      setChoice('accepted'); removeBanner(); loadTrackers(); showTab();
    });
    document.getElementById('rda-refuse').addEventListener('click', function () {
      var wasAccepted = getChoice() === 'accepted';
      setChoice('refused'); removeBanner();
      if (wasAccepted) stopTrackers();  // retrait effectif d'un consentement déjà donné
      showTab();
    });
  }

  function removeBanner() {
    var el = document.getElementById('rda-consent');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── Onglet permanent « Gérer mes cookies » ─────────────────────────────────────
  function showTab() {
    if (document.getElementById('rda-tab')) return;
    injectCss();
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'rda-tab';
    tab.textContent = '🍪 Gérer mes cookies';
    tab.setAttribute('aria-label', 'Gérer mes préférences de cookies');
    tab.addEventListener('click', function () { buildBanner(true); });
    document.body.appendChild(tab);
  }
  function hideTab() {
    var el = document.getElementById('rda-tab');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // API publique — permet aussi un lien texte ("Gérer mes cookies") dans un pied de
  // page ou la politique de confidentialité, en plus de l'onglet flottant.
  window.rdaManageCookies = function () { buildBanner(true); };

  // ── Point d'entrée ────────────────────────────────────────────────────────────
  function init() {
    var choice = getChoice();
    if (choice === 'accepted') { loadTrackers(); showTab(); return; }  // déjà accepté → charge + onglet de gestion
    if (choice === 'refused')  { showTab(); return; }                  // déjà refusé → rien, mais onglet dispo
    buildBanner();                                                     // pas de choix → demande (pas d'onglet tant que non répondu)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
