(() => {
  const skill = new URLSearchParams(location.search).get('skill');
  if (skill !== 'A.10F') return;

  const feedback = document.querySelector('#practiceFeedback');
  const prompt = document.querySelector('#practicePrompt');
  const answer = document.querySelector('#practiceAnswer');
  const check = document.querySelector('#checkPracticeAnswer');
  const stuck = document.querySelector('#practiceStuckBtn');
  const explain = document.querySelector('#practiceExplainBtn');
  const next = document.querySelector('#nextPracticeQuestion');
  if (!feedback || !prompt || !answer || !check || !stuck || !explain || !next) return;

  let promptMap = new Map();
  let observer = null;
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function currentItem() {
    return promptMap.get((prompt.textContent || '').trim()) || null;
  }
  function stepsFor(item) {
    return item.solution_steps?.length ? item.solution_steps
      : item.alternate_solution_steps?.length ? item.alternate_solution_steps
      : [
          { equation: item.prompt, explanation: item.tutor_behavior || 'Check the difference-of-squares structure.' },
          { equation: item.answer_key, explanation: 'Multiply the factors to verify the original expression.' }
        ];
  }
  function solution(item, heading = 'Correct answer and full explanation') {
    return `
      <div class="solution-panel audit2-a10f-practice-solution" data-audit2-a10f-solution="true">
        <h3>${esc(heading)}</h3>
        <p><strong>Final answer:</strong> ${esc(item.answer_key)}</p>
        <ol class="solution-steps">${stepsFor(item).map((step,index)=>`
          <li><span class="solution-step-number">${index+1}</span><div><div class="math-line">${esc(step.equation)}</div><p>${esc(step.explanation)}</p></div></li>
        `).join('')}</ol>
        <div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>Difference of squares: p²-q²=(p-q)(p+q). Check for two square terms and subtraction before using the pattern.</p></div>
      </div>
    `;
  }
  function paused(mutator) {
    observer?.disconnect();
    mutator();
    setTimeout(() => observer?.observe(feedback, { childList: true, subtree: true }), 0);
  }
  function upgrade() {
    const item = currentItem();
    if (!item || feedback.querySelector('[data-audit2-a10f-upgraded="true"]')) return;
    const text = feedback.textContent || '';
    if (/Hint\s*3/i.test(text) && !feedback.querySelector('.solution-panel')) {
      paused(() => feedback.insertAdjacentHTML('beforeend', `<div data-audit2-a10f-upgraded="true">${solution(item, 'Hint 3: answer and complete reasoning')}</div>`));
      return;
    }
    if (/Another way/i.test(text) && !feedback.querySelector('.solution-panel')) {
      paused(() => feedback.insertAdjacentHTML('beforeend', `<div data-audit2-a10f-upgraded="true">${solution(item, 'Complete alternative explanation')}</div>`));
      return;
    }
    if (/Not correct yet|Review this one|Not quite/i.test(text)) {
      paused(() => {
        feedback.innerHTML = `
          <div data-audit2-a10f-upgraded="true">
            <div class="lesson-state lesson-state-warning"><strong>Review your attempt.</strong><p>Your first-attempt score is recorded. Compare your work with the complete solution below.</p></div>
            ${solution(item)}
          </div>`;
        answer.disabled = true;
        check.disabled = true;
        stuck.disabled = true;
        explain.disabled = true;
        next.hidden = false;
        next.textContent = 'Review Solution & Continue →';
      });
    }
  }
  async function start() {
    try {
      const response = await fetch('/a10f-difference-of-squares.json');
      if (response.ok) {
        const module = await response.json();
        promptMap = new Map((module.items || []).map(item => [(item.prompt || '').trim(), item]));
      }
    } catch (error) { console.warn('A.10F practice audit bank unavailable', error); }
    observer = new MutationObserver(upgrade);
    observer.observe(feedback, { childList: true, subtree: true });
    upgrade();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();