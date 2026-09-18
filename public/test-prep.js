(async () => {
  const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';

  const modeWrap = document.querySelector('#testPrepModes');
  const modeMessage = document.querySelector('#testPrepModeMessage');
  const categoryWrap = document.querySelector('#blueprintCategories');
  const runner = document.querySelector('#testRunner');
  const results = document.querySelector('#testResults');
  const resultTitle = document.querySelector('#testResultTitle');
  const progressLabel = document.querySelector('#testProgressLabel');
  const progressBar = document.querySelector('#testProgressBar');
  const questionMeta = document.querySelector('#questionMeta');
  const questionPrompt = document.querySelector('#questionPrompt');
  const questionChoices = document.querySelector('#questionChoices');
  const questionMessage = document.querySelector('#questionMessage');
  const nextButton = document.querySelector('#nextTestQuestion');
  const submitButton = document.querySelector('#submitTest');
  const scoreSummary = document.querySelector('#scoreSummary');
  const saveStatus = document.querySelector('#testPrepSaveStatus');
  const categoryResults = document.querySelector('#categoryResults');
  const missedReview = document.querySelector('#missedReview');
  const retakeButton = document.querySelector('#retakeQuickCheck');

  let blueprint;
  let quickBank;
  let halfBank;
  let activeMode = null;
  let activeQuestions = [];
  let currentIndex = 0;
  let responses = new Map();
  let startedAt = null;

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function randomizeQuestionChoices(question) {
    const indexedChoices = question.choices.map((choice, originalIndex) => ({ choice, originalIndex }));
    const randomized = shuffled(indexedChoices);
    const oldToNew = new Map(randomized.map((entry, newIndex) => [entry.originalIndex, newIndex]));

    return {
      ...question,
      choices: randomized.map(entry => entry.choice),
      answer: question.answer.map(originalIndex => oldToNew.get(originalIndex)).sort((a, b) => a - b)
    };
  }

  function promptMarkup(question) {
    return question.prompt_html || question.prompt || '';
  }

  function assembleFromBank(bank, target) {
    const byCategory = new Map();
    for (const question of bank.questions) {
      if (!byCategory.has(question.reporting_category)) byCategory.set(question.reporting_category, []);
      byCategory.get(question.reporting_category).push(question);
    }
    const selected = [];
    for (const [category, count] of Object.entries(target)) {
      selected.push(...shuffled(byCategory.get(Number(category)) || []).slice(0, count));
    }
    return shuffled(selected).map(randomizeQuestionChoices);
  }

  function questionsForMode(modeId) {
    if (modeId === 'quick') {
      return assembleFromBank(quickBank, { 1: 2, 2: 2, 3: 3, 4: 2, 5: 1 });
    }
    if (modeId === 'half') {
      return assembleFromBank(halfBank, { 1: 5, 2: 5, 3: 6, 4: 5, 5: 4 });
    }
    return [];
  }

  function getSupabaseClient() {
    if (!window.supabase?.createClient) return null;
    return window.__toluxTestPrepSupabase || (window.__toluxTestPrepSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    ));
  }

  async function isSignedIn() {
    try {
      const client = getSupabaseClient();
      if (!client) return false;
      const { data } = await client.auth.getSession();
      return Boolean(data?.session?.user);
    } catch {
      return false;
    }
  }

  function selectedAnswers() {
    return [...questionChoices.querySelectorAll('input:checked')].map(input => Number(input.value));
  }

  function saveCurrentResponse() {
    const question = activeQuestions[currentIndex];
    if (!question) return false;
    const selected = selectedAnswers();
    if (!selected.length) {
      questionMessage.textContent = question.type === 'multi_select' ? `Select ${question.answer.length} answers before continuing.` : 'Choose an answer before continuing.';
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
    questionPrompt.innerHTML = promptMarkup(question);
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

  async function persistResult(percent, itemRecords) {
    if (!saveStatus || !window.toluxTestPrepProgress) return;
    saveStatus.textContent = 'Saving this Test Prep result…';
    const outcome = await window.toluxTestPrepProgress.save({
      modeId: activeMode.id,
      percent,
      itemRecords,
      startedAt
    });
    saveStatus.textContent = outcome.status === 'synced'
      ? 'Saved to your Tolux progress dashboard.'
      : outcome.status === 'queued'
        ? 'Saved on this device. Tolux will retry account sync when you return.'
        : 'Saved on this device. Sign in before your next Test Prep session to sync results across devices.';
  }

  function scoreTest() {
    if (!saveCurrentResponse()) return;
    let earned = 0;
    let possible = 0;
    const categoryTotals = new Map();
    const misses = [];
    const itemRecords = [];

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
      itemRecords.push({
        item_id: question.id,
        first_attempt_correct: correct,
        first_error_tag: correct ? null : question.teks
      });
    }

    const percent = possible ? Math.round((earned / possible) * 100) : 0;
    resultTitle.textContent = `${activeMode.label} Results`;
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
      card.innerHTML = `<strong>${miss.question.teks}</strong><p>${promptMarkup(miss.question)}</p><p><strong>Your answer:</strong> ${selectedText}</p><p><strong>Correct answer:</strong> ${correctText}</p><p>${miss.question.rationale}</p><p><a href="/practice.html?skill=${encodeURIComponent(miss.question.teks)}&difficulty=grade-level&count=5">Practice this skill</a> • <a href="/lesson.html?module=${encodeURIComponent(miss.question.module_id)}&start=lesson">Review in Tutor Mode</a></p>`;
      missedReview.append(card);
    }

    retakeButton.textContent = `Retake ${activeMode.label}`;
    runner.hidden = true;
    results.hidden = false;
    progressBar.style.width = '100%';
    results.scrollIntoView({ behavior: 'smooth' });
    void persistResult(percent, itemRecords);
  }

  function startMode(modeId) {
    activeMode = blueprint.tolux_modes.find(mode => mode.id === modeId);
    activeQuestions = questionsForMode(modeId);
    currentIndex = 0;
    responses = new Map();
    startedAt = Date.now();
    if (saveStatus) saveStatus.textContent = '';
    modeMessage.textContent = '';
    results.hidden = true;
    runner.hidden = false;
    renderQuestion();
    runner.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleModeStart(modeId) {
    if (modeId === 'quick') {
      startMode('quick');
      return;
    }
    if (modeId === 'half') {
      if (!(await isSignedIn())) {
        modeMessage.innerHTML = '<strong>Free account required for the Half Test.</strong> <a href="/#authPanel">Sign in or create a free account</a>, then return to Test Prep.';
        modeMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      startMode('half');
    }
  }

  try {
    const [blueprintResponse, quickResponse, halfResponse] = await Promise.all([
      fetch('/staar-algebra1-blueprint.json'),
      fetch('/staar-algebra1-quick-check.json'),
      fetch('/staar-algebra1-half-test.json')
    ]);
    if (!blueprintResponse.ok) throw new Error(`Blueprint load failed: ${blueprintResponse.status}`);
    if (!quickResponse.ok) throw new Error(`Quick-check bank load failed: ${quickResponse.status}`);
    if (!halfResponse.ok) throw new Error(`Half-test bank load failed: ${halfResponse.status}`);
    [blueprint, quickBank, halfBank] = await Promise.all([blueprintResponse.json(), quickResponse.json(), halfResponse.json()]);

    modeWrap.replaceChildren(...blueprint.tolux_modes.map(mode => {
      const card = document.createElement('article');
      card.className = 'pricing-card';
      const points = mode.points ? ` • ${mode.points} points` : '';
      const live = mode.id === 'quick' || mode.id === 'half';
      const buttonLabel = mode.id === 'quick' ? 'Start Quick Check' : mode.id === 'half' ? 'Start Half Test' : 'Question bank in build';
      card.innerHTML = `
        <h3>${mode.label}</h3>
        <h2>${mode.questions} <small>questions${points}</small></h2>
        <p>${mode.description}</p>
        <button type="button" data-test-prep-mode="${mode.id}" ${live ? '' : 'disabled'}>${buttonLabel}</button>
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

    document.addEventListener('click', async event => {
      const button = event.target.closest('[data-test-prep-mode]');
      if (!button || button.disabled) return;
      await handleModeStart(button.dataset.testPrepMode);
    });

    nextButton.addEventListener('click', () => {
      if (!saveCurrentResponse()) return;
      currentIndex += 1;
      renderQuestion();
    });
    submitButton.addEventListener('click', scoreTest);
    retakeButton.addEventListener('click', () => activeMode && startMode(activeMode.id));
  } catch (error) {
    console.error(error);
    if (modeWrap) modeWrap.textContent = 'Test Prep could not be loaded.';
  }
})();
