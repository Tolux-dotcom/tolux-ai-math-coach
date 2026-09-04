(() => {
  const CONFIG = {
    'alg1-a10d-equivalent-polynomial-forms': {
      path: '/a10d-equivalent-polynomial-forms.json',
      rule: 'Equivalent expressions keep the same value. Distribute to expand, factor a GCF to reverse distribution, and combine only like terms.'
    },
    'alg1-a10e-factor-trinomials': {
      path: '/a10e-factor-trinomials.json',
      rule: 'Factor out the GCF first. For ax²+bx+c, use product ac and sum b, then verify by multiplying the factors.'
    },
    'alg1-a10f-difference-of-squares': {
      path: '/a10f-difference-of-squares.json',
      rule: 'Difference of squares needs two squared terms separated by subtraction: p²-q²=(p-q)(p+q). Multiply back to verify.'
    }
  };

  const moduleId = new URLSearchParams(location.search).get('module');
  const config = CONFIG[moduleId];
  if (!config) return;

  const feedback = document.querySelector('#lessonFeedback');
  const stage = document.querySelector('#lessonStage');
  const answer = document.querySelector('#lessonAnswer');
  const check = document.querySelector('#submitLessonAnswer');
  const next = document.querySelector('#nextLessonStep');
  if (!feedback || !stage || !answer || !check || !next) return;

  let itemMap = new Map();
  let observer = null;
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const currentId = () => {
    const spans = document.querySelectorAll('#lessonContent .question-header span');
    return spans.length ? spans[spans.length - 1].textContent.trim() : '';
  };
  const isMastery = () => /Mastery Check/i.test(stage.textContent || '');

  function stepsFor(item) {
    const primary = Array.isArray(item?.solution_steps) && item.solution_steps.length
      ? item.solution_steps
      : Array.isArray(item?.alternate_solution_steps) && item.alternate_solution_steps.length
        ? item.alternate_solution_steps
        : null;
    return primary || [
      { equation: item?.prompt || '', explanation: item?.tutor_behavior || 'Apply the lesson rule one justified step at a time.' },
      { equation: item?.answer_key || '', explanation: 'Verify that the final form matches the original expression.' }
    ];
  }

  function solutionMarkup(item, heading = 'Correct answer and full explanation') {
    return `
      <div class="solution-panel audit2-standard-solution" data-audit2-solution="true">
        <h3>${esc(heading)}</h3>
        <p><strong>Final answer:</strong> ${esc(item.answer_key)}</p>
        <ol class="solution-steps">
          ${stepsFor(item).map((step,index)=>`
            <li><span class="solution-step-number">${index+1}</span><div><div class="math-line">${esc(step.equation)}</div><p>${esc(step.explanation)}</p></div></li>
          `).join('')}
        </ol>
        <div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div>
      </div>
    `;
  }

  function paused(mutator) {
    observer?.disconnect();
    mutator();
    setTimeout(() => observer?.observe(feedback, { childList: true, subtree: true }), 0);
  }

  function upgrade() {
    if (isMastery()) return;
    const item = itemMap.get(currentId());
    if (!item || feedback.querySelector('[data-audit2-upgraded="true"]')) return;
    const text = feedback.textContent || '';

    if (/Hint\s*3/i.test(text)) {
      paused(() => feedback.insertAdjacentHTML('beforeend', `
        <div data-audit2-upgraded="true">${solutionMarkup(item, 'Hint 3: answer and complete reasoning')}</div>
      `));
      return;
    }

    if (/Another way/i.test(text)) {
      paused(() => feedback.insertAdjacentHTML('beforeend', `
        <div data-audit2-upgraded="true">${solutionMarkup(item, 'Complete alternative explanation')}</div>
      `));
      return;
    }

    if (/Not quite|Not correct|try the problem again|needs revision|incorrect/i.test(text)) {
      paused(() => {
        feedback.innerHTML = `
          <div data-audit2-upgraded="true">
            <div class="lesson-state lesson-state-warning">
              <strong>Review your attempt.</strong>
              <p>Your first attempt is recorded. Study the complete solution below, then continue to the next question.</p>
            </div>
            ${solutionMarkup(item)}
          </div>
        `;
        answer.disabled = true;
        check.disabled = true;
        next.textContent = 'Review Solution & Continue →';
        next.style.display = 'inline-block';
      });
    }
  }

  async function start() {
    try {
      const response = await fetch(config.path);
      if (response.ok) {
        const module = await response.json();
        itemMap = new Map((module.items || []).map(item => [item.id, item]));
      }
    } catch (error) {
      console.warn('Tolux audit help bank unavailable', error);
    }
    observer = new MutationObserver(upgrade);
    observer.observe(feedback, { childList: true, subtree: true });
    upgrade();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();