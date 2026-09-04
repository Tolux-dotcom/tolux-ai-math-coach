(() => {
  const CONFIG = {
    'alg1-a10a-add-subtract-polynomials': { path:'/a10a-add-subtract-polynomials.json', label:'Add and Subtract Polynomials', method:'column alignment' },
    'alg1-a10b-multiply-polynomials': { path:'/a10b-multiply-polynomials.json', label:'Multiply Polynomials', method:'box/area model' },
    'alg1-a10c-divide-polynomials': { path:'/a10c-divide-polynomials.json', label:'Divide Polynomials', method:'multiply-back verification' }
  };
  const params = new URLSearchParams(location.search);
  const moduleId = params.get('module');
  const config = CONFIG[moduleId];
  if (!config) return;

  const feedback = document.querySelector('#lessonFeedback');
  const stage = document.querySelector('#lessonStage');
  const answer = document.querySelector('#lessonAnswer');
  const check = document.querySelector('#submitLessonAnswer');
  const next = document.querySelector('#nextLessonStep');
  if (!feedback || !stage || !answer || !check || !next) return;

  let itemMap = new Map();
  let observer;
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const currentId = () => {
    const spans = document.querySelectorAll('#lessonContent .question-header span');
    return spans.length ? spans[spans.length - 1].textContent.trim() : '';
  };
  const isMastery = () => /Mastery Check/i.test(stage.textContent || '');

  function fallbackHints(item) {
    const tag = item?.diagnostic_tag || '';
    if (moduleId.includes('a10a')) {
      if (/subtract/.test(tag)) return ['Put parentheses around the polynomial being subtracted.','Distribute the negative sign to every term before combining.','Now align x² terms, x terms, and constants; combine within each column.'];
      if (/like|coefficient|addition|missing|cancellation|standard/.test(tag)) return ['Sort the expression into x², x, and constant columns.','Only terms with the same variable and exponent can combine.','Combine the coefficients in each column, then write the result in descending powers.'];
      return ['Remove grouping symbols carefully.','Align equal powers of x.','Combine each degree column and write standard form.'];
    }
    if (moduleId.includes('a10b')) {
      if (/exponent|monomial/.test(tag)) return ['Multiply the coefficients first.','For like bases, add exponents when multiplying.','Write the coefficient product with the base raised to the sum of the exponents.'];
      return ['Make a box or list every partial product.','Multiply every term in the first factor by every term in the second factor.','Combine like partial products only after all multiplication is complete.'];
    }
    if (/monomial|termwise|exponent/.test(tag)) return ['Divide the coefficient of each term.','Subtract exponents on like bases.','Apply the divisor to every dividend term, then simplify.'];
    if (/synthetic/.test(tag)) return ['Use the zero of the linear divisor: x−c uses c and x+c uses −c.','Bring down, multiply, and add through the coefficient row.','Read the quotient from the resulting coefficients and check the remainder.'];
    return ['Order the dividend by descending powers and insert 0 placeholders for missing powers.','Repeat: divide leading terms → multiply → subtract → bring down.','Stop when the remainder degree is smaller than the divisor degree, then verify by multiplication.'];
  }

  function stepsFor(item, alternate = false) {
    const provided = alternate && Array.isArray(item?.alternate_solution_steps) && item.alternate_solution_steps.length
      ? item.alternate_solution_steps
      : Array.isArray(item?.solution_steps) && item.solution_steps.length
        ? item.solution_steps
        : null;
    if (provided) return provided;

    if (moduleId.includes('a10a')) return [
      {equation:item?.prompt || 'Original expression', explanation:'Write the polynomial terms in descending degree.'},
      {equation:'x² | x | constant', explanation:'Use vertical columns so only like terms line up.'},
      {equation:item?.answer_key || '', explanation:'Combine coefficients within matching columns and keep each exponent unchanged.'}
    ];
    if (moduleId.includes('a10b')) return [
      {equation:item?.prompt || 'Original product', explanation:'Represent the factors as a box or complete distribution.'},
      {equation:'every term × every term', explanation:'Create every partial product, keeping signs and exponent rules.'},
      {equation:item?.answer_key || '', explanation:'Combine like partial products and write the expanded polynomial in standard form.'}
    ];
    return [
      {equation:item?.prompt || 'Original quotient', explanation:'Choose termwise, long, or synthetic division based on the divisor.'},
      {equation:'divide → multiply → subtract → bring down', explanation:'Repeat the polynomial-division cycle and keep powers aligned.'},
      {equation:item?.answer_key || '', explanation:'State the quotient and remainder, then verify dividend=(divisor)(quotient)+remainder.'}
    ];
  }

  function solutionMarkup(item, heading='Correct answer and full solution', alternate=false) {
    if (!item) return '';
    const steps = stepsFor(item, alternate).map((step,index) => `
      <li><span class="solution-step-number">${index+1}</span><div><div class="math-line">${esc(step.equation)}</div><p>${esc(step.explanation)}</p></div></li>`).join('');
    const alternateNote = alternate ? `<div class="lesson-state lesson-state-success"><strong>Another way</strong><p>Use the ${esc(config.method)} so the structure is visible on paper.</p></div>` : '';
    return `${alternateNote}<div class="solution-panel audit1-solution" data-audit1-solution="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol></div>`;
  }

  function hintsFor(item) {
    return Array.isArray(item?.hint_steps) && item.hint_steps.length ? item.hint_steps : fallbackHints(item);
  }

  function withObserverPaused(callback) {
    observer?.disconnect();
    callback();
    window.setTimeout(() => observer?.observe(feedback,{childList:true,subtree:true}),0);
  }

  function enableContinue() {
    answer.disabled = true;
    check.disabled = true;
    next.textContent = 'Review Solution & Continue →';
    next.style.display = 'inline-block';
  }

  function upgradeFeedback() {
    if (isMastery()) return;
    const item = itemMap.get(currentId());
    if (!item) return;
    const text = feedback.textContent || '';
    if (feedback.querySelector('[data-audit1-upgraded="true"]')) return;

    const hintMatch = text.match(/Hint\s*([123])/i);
    if (hintMatch) {
      const level = Math.max(1,Math.min(3,Number(hintMatch[1])));
      const hints = hintsFor(item);
      withObserverPaused(() => {
        feedback.innerHTML = `<div data-audit1-upgraded="true" class="lesson-state lesson-state-warning"><strong>Hint ${level}</strong><p>${esc(hints[Math.min(level-1,hints.length-1)])}</p></div>${level===3?solutionMarkup(item,'Hint 3: answer and complete reasoning'):''}`;
      });
      return;
    }

    if (/Another way to think about it|Another way:/i.test(text)) {
      withObserverPaused(() => {
        feedback.innerHTML = `<div data-audit1-upgraded="true">${solutionMarkup(item,'Complete alternate explanation',true)}</div>`;
      });
      return;
    }

    if (/Not quite|Not correct|try the problem again|needs revision|incorrect/i.test(text)) {
      withObserverPaused(() => {
        feedback.innerHTML = `<div data-audit1-upgraded="true"><div class="lesson-state lesson-state-warning"><strong>Review your attempt.</strong><p>Your first attempt is recorded. Compare it with the complete solution below.</p></div>${solutionMarkup(item)}</div>`;
        enableContinue();
      });
      return;
    }

    if (/^Correct\.?/i.test(text.trim())) {
      withObserverPaused(() => {
        feedback.innerHTML = `<div data-audit1-upgraded="true"><div class="lesson-state lesson-state-success"><strong>Correct.</strong><p>Here is the reasoning so you can check every step.</p></div>${solutionMarkup(item,'Why this answer is correct')}</div>`;
      });
    }
  }

  async function start() {
    try {
      const response = await fetch(config.path);
      if (response.ok) {
        const module = await response.json();
        itemMap = new Map((module.items || []).map(item => [item.id,item]));
      }
    } catch (error) {
      console.warn('Tolux polynomial help bank unavailable',error);
    }
    observer = new MutationObserver(upgradeFeedback);
    observer.observe(feedback,{childList:true,subtree:true});
    upgradeFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();