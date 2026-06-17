/*!
 * premium.js — Robin des Airs
 * Interactions premium : glassmorphism nav, scroll reveal, counters
 */
;(function () {
  'use strict';

  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. NAV — glassmorphisme au scroll ───────────────────── */
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    function onScroll() {
      siteHeader.classList.toggle('prem-scrolled', window.scrollY > 48);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); /* état initial */
  }

  if (rm) return; /* tout le reste est purement visuel */

  /* ── 2. SCROLL REVEAL — IntersectionObserver ─────────────── */

  /*
   * Éléments ciblés par sélecteur :
   *   prem-reveal       — fade + translateY (textes, titres)
   *   prem-reveal-scale — fade + scale (cards isolées)
   *   prem-stagger      — parent dont les enfants se décalent
   */

  /* On ajoute les classes directement via JS, sans toucher au HTML source */
  function tagReveal(selector, cls, extraCls) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.classList.add(cls);
      if (extraCls) el.classList.add(extraCls);
    });
  }

  /* Textes / titres — slide up */
  tagReveal('.section-tag',   'prem-reveal');
  tagReveal('.section-title', 'prem-reveal');

  /* Grilles — stagger sur les enfants directs */
  tagReveal('.loi-cards',   'prem-reveal', 'prem-stagger');
  tagReveal('.steps-grid',  'prem-reveal', 'prem-stagger');
  tagReveal('.testi-track', 'prem-reveal', 'prem-stagger');

  /* Items staggered */
  tagReveal('.loi-cards > .loi-card',    'prem-reveal');
  tagReveal('.steps-grid > .step-card',  'prem-reveal');
  tagReveal('.testi-track > .testi-card','prem-reveal');
  tagReveal('.faq-item',                 'prem-reveal');

  /* Tables et blocs isolés */
  tagReveal('.comp-table-scroll', 'prem-reveal-scale');
  tagReveal('.social-proof-strip','prem-reveal');
  tagReveal('#cta-final .section-title', 'prem-reveal');
  tagReveal('#cta-final .btn-primary',   'prem-reveal-scale');

  /* Observer */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('prem-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

  document.querySelectorAll('.prem-reveal, .prem-reveal-scale').forEach(function (el) {
    io.observe(el);
  });

  /* ── 3. COUNTER ANIMATION — stats hero ──────────────────── */
  var statsObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      statsObserver.unobserve(entry.target);

      entry.target.querySelectorAll('.stat-num').forEach(function (el) {
        var raw   = el.textContent.replace(/\s/g, '');
        /* Extrait la valeur numérique et le suffixe (€, %, /10, +…) */
        var match = raw.match(/^([+]?)(\d+(?:[.,]\d+)?)(.*?)$/);
        if (!match) return;

        var prefix = match[1];
        var target = parseFloat(match[2].replace(',', '.'));
        var suffix = match[3];
        var start  = 0;
        var duration = 1400;
        var startTime = null;

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        function step(ts) {
          if (!startTime) startTime = ts;
          var p = Math.min((ts - startTime) / duration, 1);
          var val = start + (target - start) * easeOut(p);

          /* Formatage : décimal si original était décimal */
          var formatted = target % 1 !== 0
            ? val.toFixed(1).replace('.', ',')
            : Math.round(val).toString();

          el.textContent = prefix + formatted + suffix;
          if (p < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
      });
    });
  }, { threshold: 0.5 });

  var heroStats = document.querySelector('.hero-stats');
  if (heroStats) statsObserver.observe(heroStats);

  /* ── 4. CARDS — tilt 3D subtil sur desktop ──────────────── */
  if (window.innerWidth >= 1024) {
    document.querySelectorAll('.loi-card, .testi-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width  - 0.5;
        var y = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform =
          'translateY(-4px) perspective(600px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ── 5. FAQ ──
     L'ouverture/fermeture est gérée par toggleFaq() (assets/index-page.js),
     câblé en dur via onclick="toggleFaq(this)" sur chaque .faq-question.
     Ne PAS rebinder ici : un second listener entrait en course avec l'inline
     (ouvrait puis refermait dans le même clic → FAQ qui ne s'ouvrait jamais). */

})();
