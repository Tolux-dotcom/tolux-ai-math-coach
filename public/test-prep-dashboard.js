(() => {
  function activate() {
    const button = [...document.querySelectorAll('.mode')]
      .find(candidate => candidate.dataset.mode === 'Test Prep');
    if (!button) return false;

    button.disabled = false;
    button.removeAttribute('aria-disabled');
    const description = button.querySelector('small');
    const status = button.querySelector('.mode-status');
    if (description) description.textContent = 'Algebra 1 STAAR / EOC practice';
    if (status) status.textContent = 'Phase 1';
    button.dataset.testPrepLive = 'true';

    if (button.dataset.testPrepBound !== 'true') {
      button.dataset.testPrepBound = 'true';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = '/test-prep.html';
      }, true);
    }

    const seoParagraphs = document.querySelectorAll('.seo-section p');
    if (seoParagraphs[2]) {
      seoParagraphs[2].textContent = 'Use Tolux AI Math Coach for Algebra 1 tutoring, homework help, focused practice, personalized feedback, guided problem solving, and Algebra 1 STAAR / EOC Test Prep. Algebra 1A covers Modules 1–27 and Algebra 1B covers Modules 28–49.';
    }
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (activate() || attempts >= 40) window.clearInterval(timer);
  }, 100);

  if (document.readyState !== 'loading') activate();
})();
