(async () => {
  const modeWrap = document.querySelector('#testPrepModes');
  const categoryWrap = document.querySelector('#blueprintCategories');
  const runner = document.querySelector('#testRunner');
  const results = document.querySelector('#testResults');
  const progressLabel = document.querySelector('#testProgressLabel');
  const progressBar = document.querySelector('#testProgressBar');
  const questionMeta = document.querySelector('#questionMeta');
  const questionPrompt = document.querySelector('#questionPrompt');
  const questionChoices = document.querySelector('#questionChoices');
  const questionMessage = document.querySelector('#questionMessage');
  const nextButton = document.querySelector('#nextTestQuestion');
  const submitButton = document.querySelector('#submitTest');
  const scoreSummary = document.querySelector('#scoreSummary');
  const categoryResults = document.querySelector('#categoryResults');
  const missedReview = document.querySelector('#missedReview');
  const retakeButton = document.querySelector('#retakeQuickCheck');

  let blueprint;
  let bank;
  let activeQuestions = [];
  let currentIndex = 0;
  let responses = new Map();

  function shuffled(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function assembleQuickCheck() {
    const byCategory = new Map();
    for (const question of bank.questions) {
      if (!byCategory.has(question.reporting_category)) byCategory.set(question.reporting_category, []);
      byCategory.get(question.reporting_category).push(question);
    }
    const target = { 1: 2, 2: 2, 3: 3, 4: 2, 5: 1 };
    const selected = [];
    for (const [category, count] of Object.entries(target)) {
      selected.push(...shuffled(byCategory.get(Number(category)) || []).slice(0, count));
    }
    return selected;
  }

  function selectedAnswers() {
    return [...questionChoices.querySelectorAll('input:checked')].map(input => Number(input.value));
  }

  function saveCurrentResponse() {
    const question = activeQuestions[currentIndex];
    if (!question) return false;
    const selected = selectedAnswers();
    if (!selected.length) {
      questionMessage.textContent = question.type === 'multi_select' ? 'Select two answers before continuing.' : 'Choose an answer before continuing.';
      return false;
    }
    if (question.type === 'multi_select' && selected.length !== question.answer.length) {
      questionMessage.textContent = `Select exactly ${question.answer.length} answers before continuing.`;
      return false;
    }
    responses.set(question.id, selected.sort((a, b) => a - b));
    questionMessage.textContent = '';
    return true;
  }

  function renderQuestion() {
    const question = activeQuestions[currentIndex];
    if (!question) return;
    const pct = Math.round((currentIndex / activeQuestions.length) * 100);
    progressLabel.textContent = `Question ${currentIndex + 1} of ${activeQuestions.length}`;
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(pct));
    questionMeta.textContent = `Reporting Category ${question.reporting_category} • ${question.teks} • ${question.points} point${question.points === 1 ? '' : 's'}`;
    questionPrompt.textContent = question.prompt;
    questionChoices.replaceChildren();
    const inputType = question.type === 'multi_select' ? 'checkbox' : 'radio';
    const saved = responses.get(question.id) || [];
    question.choices.forEach((choice, index) => {
      const label = document.createElement('label');
      label.className = 'pricing-card';
      const input = document.createElement('input');
      input.type = inputType;
      input.name = `question-${question.id}`;
      input.value = String(index);
      input.checked = saved.includes(index);
      const text = document.createElement('span');
      text.textContent = choice;
      label.append(input, text);
      questionChoices.append(label);
    });
    questionMessage.textContent = question.type === 'multi_select' ? `Select ${question.answer.length} answers.` : 'Select one answer.';
    nextButton.hidden = currentIndex === activeQuestions.length - 1;
    submitButton.hidden = currentIndex !== activeQuestions.length - 1;
  }

  function arraysEqual(a, b) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function scoreTest() {
    if (!saveCurrentResponse()) return;
    let earned = 0;
    let possible = 0;
    const categoryTotals = new Map();
    const misses = [];

    for (const question of activeQuestions) {
      const selected = responses.get(question.id) || [];
      const correct = arraysEqual(selected, [...question.answer].sort((a, b) => a - b));
      possible += question.points;
      if (correct) earned += question.points;
      if (!categoryTotals.has(question.reporting_category)) categoryTotals.set(question.reporting_category, { earned: 0, possible: 0 });
      const total = categoryTotals.get(question.reporting_category);
      total.possible += question.points;
      if (correct) total.earned += question.points;
      if (!correct) misses.push({ question, selected });
    }

    const percent = possible ? Math.round((earned / possible) * 100) : 0;
    scoreSummary.innerHTML = `<p><strong>${earned} / ${possible} points • ${percent}%</strong></p><p>This is a Tolux practice result, not an official STAAR scale score.</p>`;

    categoryResults.replaceChildren(...blueprint.reporting_categories.map(category => {
      const total = categoryTotals.get(category.id) || { earned: 0, possible: 0 };
      const card = document.createElement('article');
      card.className = 'pricing-card';
      const pct = total.possible ? Math.round((total.earned / total.possible) * 100) : 0;
      card.innerHTML = `<small>Reporting Category ${category.id}</small><h3>${category.name}</h3><p><strong>${total.earned}/${total.possible} points • ${pct}%</strong></p>`;
      return card;
    }));

    missedReview.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = misses.length ? 'Missed-question review' : 'Excellent work — no missed questions.';
    missedReview.append(heading);
    for (const miss of misses) {
      const card = document.createElement('article');
      card.className = 'panel';
      const correctText = miss.question.answer.map(i => miss.question.choices[i]).join(' and ');
      const selectedText = miss.selected.length ? miss.selected.map(i => miss.question.choices[i]).join(' and ') : 'No answer';
      card.innerHTML = `<strong>${miss.question.teks}</strong><p>${miss.question.prompt}</p><p><strong>Your answer:</strong> ${selectedText}</p><p><strong>Correct answer:</strong> ${correctText}</p><p>${miss.question.rationale}</p><p><a href="/practice.html?skill=${encodeURIComponent(miss.question.teks)}&difficulty=grade-level&count=5">Practice this skill</a> • <a href="/lesson.html?module=${encodeURIComponent(miss.question.module_id)}&start=lesson">Review in Tutor Mode</a></p>`;
      missedReview.append(card);
    }

    runner.hidden = true;
    results.hidden = false;
    progressBar.style.width = '100%';
    results.scrollIntoView({ behavior: 'smooth' });
  }

  function startQuickCheck() {
    activeQuestions = assembleQuickCheck();
    currentIndex = 0;
    responses = new Map();
    results.hidden = true;
    runner.hidden = false;
    renderQuestion();
    runner.scrollIntoView({ behavior: 'smooth' });
  }

  try {
    const [blueprintResponse, bankResponse] = await Promise.all([
      fetch('/staar-algebra1-blueprint.json'),
      fetch('/staar-algebra1-quick-check.json')
    ]);
    if (!blueprintResponse.ok) throw new Error(`Blueprint load failed: ${blueprintResponse.status}`);
    if (!bankResponse.ok) throw new Error(`Quick-check bank load failed: ${bankResponse.status}`);
    [blueprint, bank] = await Promise.all([blueprintResponse.json(), bankResponse.json()]);

    modeWrap.replaceChildren(...blueprint.tolux_modes.map(mode => {
      const card = document.createElement('article');
      card.className = 'pricing-card';
      const points = mode.points ? ` • ${mode.points} points` : '';
      const live = mode.id === 'quick';
      card.innerHTML = `
        <h3>${mode.label}</h3>
        <h2>${mode.questions} <small>questions${points}</small></h2>
        <p>${mode.description}</p>
        <button type="button" data-test-prep-mode="${mode.id}" ${live ? '' : 'disabled'}>${live ? 'Start Quick Check' : 'Question bank in build'}</button>
      `;
      return card;
    }));

    categoryWrap.replaceChildren(...blueprint.reporting_categories.map(category => {
      const card = document.createElement('article');
      card.className = 'pricing-card';
      card.innerHTML = `
        <small>Reporting Category ${category.id}</small>
        <h3>${category.name}</h3>
        <p><strong>${category.question_range[0]}–${category.question_range[1]}</strong> questions</p>
        <p><strong>${category.point_range[0]}–${category.point_range[1]}</strong> points</p>
      `;
      return card;
    }));

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-test-prep-mode]');
      if (!button || button.disabled) return;
      if (button.dataset.testPrepMode === 'quick') startQuickCheck();
    });

    nextButton.addEventListener('click', () => {
      if (!saveCurrentResponse()) return;
      currentIndex += 1;
      renderQuestion();
    });
    submitButton.addEventListener('click', scoreTest);
    retakeButton.addEventListener('click', startQuickCheck);
  } catch (error) {
    console.error(error);
    if (modeWrap) modeWrap.textContent = 'Test Prep could not be loaded.';
  }
})();
