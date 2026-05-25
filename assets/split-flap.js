/*!
 * split-flap.js v2 — Tableau de départ aéroport / gare
 * Comportement authentique : toute une ligne défile simultanément,
 * puis la ligne suivante démarre une fois la précédente verrouillée.
 * Compatibilité : tous navigateurs modernes. Zéro dépendance.
 *
 * Usage :
 *   splitFlap('#mon-element', { cycle: 46, pause: 180, delay: 0 })
 *   splitFlap('.hero-title')   // valeurs par défaut
 *
 * Respecte prefers-reduced-motion.
 */
;(function (root) {
  'use strict';

  /* ── Jeu de caractères dans l'ordre du tableau Solari ─── */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊËÀÂÙÛÜÔÎÏÇ0123456789 .·/-€@%!?—';

  var prefersReduced = (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /* ── Enveloppe chaque caractère d'un texte dans un <span.sf-char> ── */
  function wrapTextNodes(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);

    var items = [];
    nodes.forEach(function (textNode) {
      if (!textNode.textContent.trim()) return;
      var frag = document.createDocumentFragment();
      Array.from(textNode.textContent).forEach(function (ch) {
        var sp = document.createElement('span');
        sp.className   = 'sf-char';
        sp.textContent = ch;
        frag.appendChild(sp);
        items.push({ span: sp, ch: ch });
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
    return items;
  }

  /* ── Groupe les items par ligne visuelle via getBoundingClientRect ── */
  function groupByLine(items) {
    var lines      = [];
    var curLine    = [];
    var curTop     = null;
    var THRESHOLD  = 6; /* px — tolérance pour les sous-pixels */

    items.forEach(function (item) {
      var top = Math.round(item.span.getBoundingClientRect().top);
      if (curTop === null) curTop = top;

      if (Math.abs(top - curTop) > THRESHOLD) {
        if (curLine.length) lines.push(curLine);
        curLine = [];
        curTop  = top;
      }
      curLine.push(item);
    });
    if (curLine.length) lines.push(curLine);
    return lines;
  }

  /* ── Anime une ligne entière ; appelle onDone quand tout est verrouillé ── */
  function runLine(lineItems, cycleBase, onDone) {
    var animatable = lineItems.filter(function (item) { return !/\s/.test(item.ch); });
    var done       = 0;
    var total      = animatable.length;

    if (total === 0) { if (onDone) onDone(); return; }

    function check() {
      done++;
      if (done >= total && onDone) onDone();
    }

    animatable.forEach(function (item) {
      var ch     = item.ch;
      var sp     = item.span;
      var frames = 10 + Math.floor(Math.random() * 7);
      var frame  = 0;
      /* Légère désynchronisation aléatoire entre caractères (0–30 ms)
         pour imiter le tambour mécanique qui n'est jamais parfaitement aligné */
      var jitter = Math.floor(Math.random() * 30);

      function tick() {
        frame++;
        if (frame >= frames) {
          sp.textContent = ch;
          sp.classList.add('sf-locked');
          check();
          return;
        }
        sp.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        /* Ralentissement sur les 4 derniers frames (frein du tambour) */
        var remaining = frames - frame;
        var delay = remaining <= 4
          ? cycleBase * (1 + (5 - remaining) * 0.55)
          : cycleBase;
        setTimeout(tick, delay);
      }

      setTimeout(tick, jitter);
    });
  }

  /* ── Enchaîne les lignes séquentiellement ── */
  function runLines(items, cycleBase, linePause) {
    var lines = groupByLine(items);

    function next(idx) {
      if (idx >= lines.length) return;
      runLine(lines[idx], cycleBase, function () {
        setTimeout(function () { next(idx + 1); }, linePause);
      });
    }

    next(0);
  }

  /* ── API publique ─────────────────────────────────────────────────── */
  /*
   * splitFlap(selector, opts)
   *   selector    — sélecteur CSS ou élément DOM
   *   opts.cycle  — ms par frame de défilement            (défaut : 46)
   *   opts.pause  — ms d'attente entre deux lignes        (défaut : 180)
   *   opts.delay  — ms avant le démarrage                 (défaut : 0)
   */
  root.splitFlap = function (selector, opts) {
    if (prefersReduced) return;

    opts       = opts || {};
    var cycle  = opts.cycle !== undefined ? opts.cycle : 46;
    var pause  = opts.pause !== undefined ? opts.pause : 180;
    var delay  = opts.delay !== undefined ? opts.delay : 0;

    var el = (typeof selector === 'string')
      ? document.querySelector(selector)
      : selector;

    if (!el) return;

    setTimeout(function () {
      var items = wrapTextNodes(el);
      runLines(items, cycle, pause);
    }, delay);
  };

})(window);
