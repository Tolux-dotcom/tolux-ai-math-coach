(() => {
  const allowed = new Set([
    'alg1-a3d-graph-linear-inequalities',
    'alg1-a3e-linear-transformations',
    'alg1-a3f-graph-linear-systems',
    'alg1-a3g-estimate-system-solutions',
    'alg1-a3h-graph-systems-of-inequalities'
  ]);

  const params = new URLSearchParams(location.search);
  if (!allowed.has(params.get('module'))) return;

  const feedback = document.querySelector('#lessonFeedback');
  const next = document.querySelector('#nextLessonStep');
  const answer = document.querySelector('#lessonAnswer');
  const check = document.querySelector('#submitLessonAnswer');
  if (!feedback || !next || !answer || !check) return;

  const currentId = () => {
    const spans = document.querySelectorAll('#lessonContent .question-header span');
    return spans.length ? spans[spans.length - 1].textContent.trim() : '';
  };

  function improveMultipartFeedback() {
    if (currentId() !== 'A3D-G03') return;
    const raw = answer.value.toLowerCase();
    const graphPartCorrect = raw.includes('dashed') && raw.includes('above');
    const hasYForm = /y\s*>/.test(raw.replace(/\s+/g, ''));
    if (!graphPartCorrect || hasYForm) return;

    const heading = feedback.querySelector('strong');
    if (heading) heading.textContent = 'Partly correct.';

    if (!feedback.querySelector('[data-a3d-partial-note="true"]')) {
      const note = document.createElement('div');
      note.dataset.a3dPartialNote = 'true';
      note.className = 'lesson-state lesson-state-warning';
      note.innerHTML = '<strong>Your graph description is correct.</strong><p>“Dashed; above” correctly describes how to graph the inequality. This question also asks you to rewrite it in y-form. The missing part is <span class="inline-math">y &gt; -2x + 6</span>.</p>';
      feedback.prepend(note);
    }
  }

  function enableContinueAfterReveal() {
    const text = feedback.textContent || '';
    if (!/not quite|partly correct|try the problem again/i.test(text)) return;

    // Batch 8 reveals the complete correct solution immediately after an
    // incorrect non-mastery attempt. Once the answer is revealed, do not trap
    // the student on the same question; let the existing Next handler advance.
    window.setTimeout(() => {
      improveMultipartFeedback();
      answer.disabled = true;
      check.disabled = true;
      next.textContent = 'Review Solution & Continue →';
      next.style.display = 'inline-block';
      if (!feedback.querySelector('[data-batch8-continue-note="true"]')) {
        const note = document.createElement('p');
        note.dataset.batch8ContinueNote = 'true';
        note.innerHTML = '<strong>Review the solution, then continue to the next question.</strong>';
        feedback.append(note);
      }
    }, 0);
  }

  const observer = new MutationObserver(enableContinueAfterReveal);
  observer.observe(feedback, { childList: true, subtree: true });
})();
