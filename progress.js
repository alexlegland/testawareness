// FinOps Academy — Module Progress Auto-Tracker
// Watches for .results-card, extracts score, saves to Supabase via FinOpsAuth.

(function () {
  function getModuleId() {
    return window.location.pathname.split('/').pop().replace('.html', '');
  }

  function extractResult(card) {
    var el = card.querySelector('.results-score');
    if (!el) return null;
    var scoreText = el.firstChild ? el.firstChild.textContent.trim() : '';
    var score = parseInt(scoreText, 10);
    if (isNaN(score)) return null;
    var spanEl = el.querySelector('span');
    var maxScore = spanEl ? parseInt(spanEl.textContent.replace('/', '').trim(), 10) : 0;
    return { score: score, maxScore: maxScore || 0 };
  }

  var saved = false;

  var observer = new MutationObserver(function () {
    if (saved) return;
    var card = document.querySelector('.results-card');
    if (!card) return;
    saved = true;
    observer.disconnect();
    setTimeout(function () {
      var result = extractResult(card);
      if (result && window.FinOpsAuth) {
        FinOpsAuth.saveModuleProgress(getModuleId(), result.score, result.maxScore);
      }
    }, 300);
  });

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    if (window.FinOpsAuth) FinOpsAuth.injectUserNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
