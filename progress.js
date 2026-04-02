// FinOps Academy — Module Progress Auto-Tracker
// Observes for the .results-card element, then saves score to the current user's account.

(function() {
  // Derive module ID from the current page filename (e.g. arch-module1.html → arch-module1)
  function getModuleId() {
    var path = window.location.pathname;
    var file = path.split('/').pop().replace('.html', '');
    return file;
  }

  function extractScore(card) {
    // Results card contains: <div class="results-score">NNN<span>/NNN</span></div>
    var el = card.querySelector('.results-score');
    if (!el) return null;
    var text = el.firstChild ? el.firstChild.textContent.trim() : '';
    var score = parseInt(text, 10);
    if (isNaN(score)) return null;
    var spanEl = el.querySelector('span');
    var maxText = spanEl ? spanEl.textContent.replace('/', '').trim() : '0';
    var maxScore = parseInt(maxText, 10) || 0;
    return { score: score, maxScore: maxScore };
  }

  function tryRegister(card) {
    if (!window.FinOpsAuth) return;
    var result = extractScore(card);
    if (!result) return;
    var moduleId = getModuleId();
    FinOpsAuth.saveModuleProgress(moduleId, result.score, result.maxScore);
  }

  // Use MutationObserver to detect when .results-card is inserted into the DOM
  var observed = false;
  var observer = new MutationObserver(function(mutations) {
    if (observed) return;
    var card = document.querySelector('.results-card');
    if (card) {
      observed = true;
      observer.disconnect();
      // Small delay to ensure score display has been updated by the module's JS
      setTimeout(function() { tryRegister(card); }, 200);
    }
  });

  // Start observing once DOM is ready
  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    // Also inject nav user badge if auth is available
    if (window.FinOpsAuth) FinOpsAuth.injectUserNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
