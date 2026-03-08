/**
 * Review Gating — Robin des Airs
 * Affiche après la soumission du dossier : question + 5 étoiles.
 * 1–3 étoiles → formulaire d'amélioration ; 4–5 → CTA avis Google.
 * Mobile-first.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'robin_feedback_sent';
  var defaultConfig = {
    webhookUrl: '',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=TON_LIEN_GOOGLE_BUSINESS',
    source: 'depot'
  };

  function injectStyles() {
    if (document.getElementById('feedback-modal-styles')) return;
    var css = [
      '.feedback-overlay{position:fixed;inset:0;background:rgba(11,31,58,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;-webkit-overflow-scrolling:touch}',
      '.feedback-modal{background:#fff;border-radius:16px;max-width:400px;width:100%;padding:28px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:feedbackFadeIn .3s ease}',
      '@keyframes feedbackFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
      '.feedback-modal h3{font-size:17px;font-weight:800;color:#0B1F3A;text-align:center;margin:0 0 20px;line-height:1.35}',
      '.feedback-stars{display:flex;justify-content:center;gap:8px;margin-bottom:24px}',
      '.feedback-star{width:44px;height:44px;border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:1;transition:transform .15s}',
      '.feedback-star:hover,.feedback-star.filled{transform:scale(1.1)}',
      '.feedback-star:focus{outline:2px solid #00C87A;outline-offset:2px}',
      '.feedback-low{display:none;text-align:center}',
      '.feedback-low.visible{display:block}',
      '.feedback-low p{font-size:14px;color:#6B7A90;margin:0 0 14px;line-height:1.5}',
      '.feedback-low textarea{width:100%;min-height:90px;padding:12px 14px;border:1.5px solid #E2E6EE;border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;margin-bottom:12px;-webkit-appearance:none;appearance:none}',
      '.feedback-low textarea:focus{border-color:#00C87A;outline:none;box-shadow:0 0 0 3px rgba(0,200,122,.12)}',
      '.feedback-low .btn-send{width:100%;padding:14px;background:#0B1F3A;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}',
      '.feedback-low .btn-send:hover{background:#122a47}',
      '.feedback-thanks{display:none;text-align:center;padding:10px 0}',
      '.feedback-thanks.visible{display:block}',
      '.feedback-thanks p{font-size:15px;font-weight:700;color:#0B1F3A;margin:0}',
      '.feedback-high{display:none;text-align:center}',
      '.feedback-high.visible{display:block}',
      '.feedback-high .feedback-emoji{font-size:42px;margin-bottom:10px;display:block}',
      '.feedback-high .feedback-cta{font-size:16px;font-weight:800;color:#0B1F3A;margin:0 0 8px;line-height:1.35}',
      '.feedback-high .feedback-sub{font-size:13px;color:#6B7A90;margin:0 0 20px;line-height:1.5}',
      '.feedback-google-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;max-width:320px;padding:16px 24px;background:linear-gradient(135deg,#4285F4,#34A853);color:#fff;border:none;border-radius:10px;font-family:inherit;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.5px;text-decoration:none;cursor:pointer;box-shadow:0 4px 14px rgba(66,133,244,.4);transition:transform .1s,box-shadow .2s}',
      '.feedback-google-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(66,133,244,.45)}',
      '.feedback-google-btn:active{transform:translateY(0)}',
      '.feedback-600{font-size:12px;color:#6B7A90;margin-top:16px;line-height:1.5}',
      '.feedback-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}',
      '.feedback-close:hover{background:rgba(255,255,255,.25)}',
      '.feedback-overlay .feedback-modal{position:relative}'
    ].join('');
    var el = document.createElement('style');
    el.id = 'feedback-modal-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function createModal(config) {
    var c = Object.assign({}, defaultConfig, config || {});
    injectStyles();

    var overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Avis sur votre expérience');

    var modal = document.createElement('div');
    modal.className = 'feedback-modal';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'feedback-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.addEventListener('click', function () { close(overlay); });

    var question = document.createElement('h3');
    question.textContent = 'Comment s\'est passée votre expérience avec Robin des Airs ?';

    var starsWrap = document.createElement('div');
    starsWrap.className = 'feedback-stars';
    var rating = 0;
    var hover = 0;
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement('button');
      star.type = 'button';
      star.className = 'feedback-star';
      star.setAttribute('aria-label', i + ' sur 5');
      star.dataset.value = i;
      star.textContent = '☆';
      star.addEventListener('click', function () {
        var v = parseInt(this.dataset.value, 10);
        rating = v;
        renderStars();
        onRatingChosen(v, overlay, modal, c);
      });
      star.addEventListener('mouseenter', function () { hover = parseInt(this.dataset.value, 10); renderStars(); });
      star.addEventListener('mouseleave', function () { hover = 0; renderStars(); });
      starsWrap.appendChild(star);
    }
    function renderStars() {
      var n = hover || rating;
      var stars = starsWrap.querySelectorAll('.feedback-star');
      for (var j = 0; j < stars.length; j++) {
        var s = stars[j];
        var v = parseInt(s.dataset.value, 10);
        s.textContent = v <= n ? '★' : '☆';
        s.classList.toggle('filled', v <= n);
      }
    }

    var lowBlock = document.createElement('div');
    lowBlock.className = 'feedback-low';
    lowBlock.innerHTML = '<p>Nous sommes désolés. Comment pouvons-nous nous améliorer ?</p><textarea id="feedback-comment" placeholder="Votre message (optionnel)" rows="3"></textarea><button type="button" class="btn-send">Envoyer mon retour</button>';
    var textarea = lowBlock.querySelector('#feedback-comment');
    var btnSend = lowBlock.querySelector('.btn-send');
    var thanksBlock = document.createElement('div');
    thanksBlock.className = 'feedback-thanks';
    thanksBlock.innerHTML = '<p>Merci pour votre retour précieux.</p>';

    var highBlock = document.createElement('div');
    highBlock.className = 'feedback-high';
    highBlock.innerHTML =
      '<span class="feedback-emoji">🏹</span>' +
      '<p class="feedback-cta">Génial ! Aidez la communauté en 30 secondes.</p>' +
      '<p class="feedback-sub">Votre avis aide d\'autres voyageurs à récupérer leurs 600€.</p>' +
      '<a href="#" target="_blank" rel="noopener" class="feedback-google-btn" id="feedback-google-btn">Laisser un avis sur Google</a>' +
      '<p class="feedback-600">Votre avis aide d\'autres voyageurs à récupérer leurs 600€.</p>';
    var googleBtn = highBlock.querySelector('#feedback-google-btn');
    googleBtn.href = c.googleReviewUrl;

    function onRatingChosen(value, ov, md, cfg) {
      starsWrap.style.pointerEvents = 'none';
      if (value <= 3) {
        lowBlock.classList.add('visible');
        btnSend.addEventListener('click', function () {
          var comment = (textarea && textarea.value) ? textarea.value.trim() : '';
          sendFeedback(cfg.webhookUrl, value, comment, cfg.source);
          try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
          lowBlock.classList.remove('visible');
          thanksBlock.classList.add('visible');
          setTimeout(function () { close(ov); }, 2200);
        });
      } else {
        highBlock.classList.add('visible');
        sendFeedback(cfg.webhookUrl, value, null, cfg.source);
      }
    }

    modal.appendChild(closeBtn);
    modal.appendChild(question);
    modal.appendChild(starsWrap);
    modal.appendChild(lowBlock);
    modal.appendChild(thanksBlock);
    modal.appendChild(highBlock);
    overlay.appendChild(modal);
    return overlay;
  }

  function sendFeedback(webhookUrl, rating, comment, source) {
    var payload = {
      type: 'feedback',
      rating: rating,
      comment: comment || null,
      source: source || 'depot',
      timestamp: new Date().toISOString()
    };
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () { console.log('Feedback (log):', payload); });
    } else {
      console.log('Feedback (log):', payload);
    }
  }

  function close(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function show(config) {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch (e) {}
    var overlay = createModal(config);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(overlay); });
    document.body.appendChild(overlay);
  }

  window.FeedbackModal = {
    show: show,
    close: close
  };
})();
