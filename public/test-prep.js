import {
  assembleQuestions,
  createSession,
  recordResponse,
  scoreSession
} from './test-prep-core.mjs';

const SUPABASE_URL = window.TOLUX_PUBLIC_CONFIG.url;
const SUPABASE_PUBLISHABLE_KEY = window.TOLUX_PUBLIC_CONFIG.publishableKey;

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
let banks;
let session = null;
let accessCheckPending = false;

function promptMarkup(question) {
  return question.prompt_html || question.prompt || '';
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

async function verifyFullSimulationAccess() {
  const verifier = window.toluxTestPrepAccess?.verifyFullSimulationAccess;
  if (!verifier) return { status: 503, data: { allowed: false } };
  return verifier({ client: getSupabaseClient(), fetchImpl: fetch });
}

function selectedAnswers() {
  return [...questionChoices.querySelectorAll('input:checked')].map(input => Number(input.value));
}

function saveCurrentResponse() {
  if (!session) return false;
  const question = session.questions[session.currentIndex];
  if (!question) return false;
  const selected = selectedAnswers();
  if (!selected.length) {
    questionMessage.textContent = question.type === 'multi_select'
      ? `Select ${question.answer.length} answers before continuing.`
      : 'Choose an answer before continuing.';
    return false;
  }
  if (question.type === 'multi_select' && selected.length !== question.answer.length) {
    questionMessage.textContent = `Select exactly ${question.answer.length} answers before continuing.`;
    return false;
  }
  recordResponse(session, selected);
  questionMessage.textContent = '';
  return true;
}

function renderQuestion() {
  if (!session) return;
  const question = session.questions[session.currentIndex];
  if (!question) return;
  const pct = Math.round((session.currentIndex / session.questions.length) * 100);
  progressLabel.textContent = `Question ${session.currentIndex + 1} of ${session.questions.length}`;
  progressBar.style.width = `${pct}%`;
  progressBar.setAttribute('aria-valuenow', String(pct));
  questionMeta.textContent = `Reporting Category ${question.reporting_category} • ${question.teks} • ${question.points} point${question.points === 1 ? '' : 's'}`;
  questionPrompt.innerHTML = promptMarkup(question);
  questionChoices.replaceChildren();

  const inputType = question.type === 'multi_select' ? 'checkbox' : 'radio';
  const saved = session.responses.get(question.id) || [];
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

  questionMessage.textContent = question.type === 'multi_select'
    ? `Select ${question.answer.length} answers.`
    : 'Select one answer.';
  nextButton.hidden = session.currentIndex === session.questions.length - 1;
  submitButton.hidden = session.currentIndex !== session.questions.length - 1;
}

async function persistResult(percent, itemRecords) {
  if (!saveStatus || !window.toluxTestPrepProgress || !session) return;
  saveStatus.textContent = 'Saving this Test Prep result…';
  const outcome = await window.toluxTestPrepProgress.save({
    modeId: session.modeId,
    percent,
    itemRecords,
    startedAt: session.startedAt
  });
  saveStatus.textContent = outcome.status === 'synced'
    ? 'Saved to your Tolux progress dashboard.'
    : outcome.status === 'queued'
      ? 'Saved on this device. Tolux will retry account sync when you return.'
      : 'Saved only on this device. Sign in before starting a future session to sync that result across devices.';
}

function scoreTest() {
  if (!saveCurrentResponse() || !session) return;
  const outcome = scoreSession(session);
  const mode = blueprint.tolux_modes.find(candidate => candidate.id === session.modeId);
  resultTitle.textContent = `${mode.label} Results`;
  scoreSummary.innerHTML = `<p><strong>${outcome.earned} / ${outcome.possible} points • ${outcome.percent}%</strong></p><p>This is a Tolux practice result, not an official STAAR scale score.</p>`;

  categoryResults.replaceChildren(...blueprint.reporting_categories.map(category => {
    const total = outcome.categoryTotals.get(category.id) || { earned: 0, possible: 0 };
    const card = document.createElement('article');
    card.className = 'pricing-card';
    const pct = total.possible ? Math.round((total.earned / total.possible) * 100) : 0;
    card.innerHTML = `<small>Reporting Category ${category.id}</small><h3>${category.name}</h3><p><strong>${total.earned}/${total.possible} points • ${pct}%</strong></p>`;
    return card;
  }));

  missedReview.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = outcome.misses.length
    ? 'Missed-question review'
    : 'Excellent work — no missed questions.';
  missedReview.append(heading);
  for (const miss of outcome.misses) {
    const card = document.createElement('article');
    card.className = 'panel';
    const correctText = miss.question.answer.map(index => miss.question.choices[index]).join(' and ');
    const selectedText = miss.selected.length
      ? miss.selected.map(index => miss.question.choices[index]).join(' and ')
      : 'No answer';
    card.innerHTML = `<strong>${miss.question.teks}</strong><p>${promptMarkup(miss.question)}</p><p><strong>Your answer:</strong> ${selectedText}</p><p><strong>Correct answer:</strong> ${correctText}</p><p>${miss.question.rationale}</p><p><a href="/practice.html?skill=${encodeURIComponent(miss.question.teks)}&difficulty=grade-level&count=5">Practice this skill</a> • <a href="/lesson.html?module=${encodeURIComponent(miss.question.module_id)}&start=lesson">Review in Tutor Mode</a></p>`;
    missedReview.append(card);
  }

  retakeButton.textContent = `Retake ${mode.label}`;
  runner.hidden = true;
  results.hidden = false;
  progressBar.style.width = '100%';
  progressBar.setAttribute('aria-valuenow', '100');
  results.scrollIntoView({ behavior: 'smooth' });
  void persistResult(outcome.percent, outcome.itemRecords);
}

function startMode(modeId) {
  session = createSession(modeId, assembleQuestions(modeId, banks));
  if (saveStatus) saveStatus.textContent = '';
  modeMessage.textContent = '';
  results.hidden = true;
  runner.hidden = false;
  renderQuestion();
  runner.scrollIntoView({ behavior: 'smooth' });
}

function setModeButtonPending(modeId, pending) {
  const button = modeWrap?.querySelector(`[data-test-prep-mode="${modeId}"]`);
  if (!button) return;
  button.disabled = pending;
  button.textContent = pending
    ? 'Checking access…'
    : modeId === 'quick'
      ? 'Start Quick Check'
      : modeId === 'half'
        ? 'Start Half Test'
        : 'Start Full Simulation';
}

async function handleModeStart(modeId) {
  if (accessCheckPending) return;
  if (modeId === 'quick') {
    startMode(modeId);
    return;
  }

  accessCheckPending = true;
  setModeButtonPending(modeId, true);
  try {
    if (modeId === 'half') {
      if (await isSignedIn()) {
        startMode(modeId);
      } else {
        modeMessage.innerHTML = '<strong>Free account required for the Half Test.</strong> <a href="/#authPanel">Sign in or create a free account</a>, then return to Test Prep.';
      }
      return;
    }

    let access;
    try {
      access = await verifyFullSimulationAccess();
    } catch {
      access = { status: 503, data: { allowed: false } };
    }
    if (access.status === 200 && access.data?.allowed === true && access.data?.isSubscriber === true) {
      startMode(modeId);
    } else if (access.status === 401) {
      modeMessage.innerHTML = '<strong>Sign in required for the Full Simulation.</strong> <a href="/#authPanel">Sign in to your subscriber account</a>, then return to Test Prep.';
    } else if (access.status === 403 && access.data?.upgradeRequired) {
      modeMessage.innerHTML = '<strong>An active Tolux subscription is required for the Full Simulation.</strong> <a href="/#pricingSection">View membership options</a>.';
    } else {
      modeMessage.innerHTML = '<strong>Full Simulation access could not be verified.</strong> Please try again later. Your account was not changed.';
    }
  } finally {
    accessCheckPending = false;
    setModeButtonPending(modeId, false);
  }
  modeMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderModeCards() {
  modeWrap.replaceChildren(...blueprint.tolux_modes.map(mode => {
    const card = document.createElement('article');
    card.className = 'pricing-card';
    const points = mode.points ? ` • ${mode.points} points` : '';
    const buttonLabel = mode.id === 'quick'
      ? 'Start Quick Check'
      : mode.id === 'half'
        ? 'Start Half Test'
        : 'Start Full Simulation';
    card.innerHTML = `
      <h3>${mode.label}</h3>
      <h2>${mode.questions} <small>questions${points}</small></h2>
      <p>${mode.description}</p>
      <button type="button" data-test-prep-mode="${mode.id}">${buttonLabel}</button>
    `;
    return card;
  }));
}

function renderBlueprint() {
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
}

modeWrap?.addEventListener('click', event => {
  const button = event.target.closest('[data-test-prep-mode]');
  if (!button || button.disabled) return;
  void handleModeStart(button.dataset.testPrepMode);
});
nextButton?.addEventListener('click', () => {
  if (!saveCurrentResponse() || !session) return;
  session.currentIndex += 1;
  renderQuestion();
});
submitButton?.addEventListener('click', scoreTest);
retakeButton?.addEventListener('click', () => session && startMode(session.modeId));

try {
  const [blueprintResponse, quickResponse, halfResponse, extensionResponse] = await Promise.all([
    fetch('/staar-algebra1-blueprint.json'),
    fetch('/staar-algebra1-quick-check.json'),
    fetch('/staar-algebra1-half-test.json'),
    fetch('/staar-algebra1-full-extension.json')
  ]);
  const responses = [blueprintResponse, quickResponse, halfResponse, extensionResponse];
  if (responses.some(response => !response.ok)) {
    throw new Error(`Test Prep bank load failed: ${responses.map(response => response.status).join(', ')}`);
  }
  const [quick, half, fullExtension] = await Promise.all([
    quickResponse.json(),
    halfResponse.json(),
    extensionResponse.json()
  ]);
  blueprint = await blueprintResponse.json();
  banks = { quick, half, fullExtension };
  renderModeCards();
  renderBlueprint();
} catch (error) {
  console.error(error);
  if (modeWrap) modeWrap.textContent = 'Test Prep could not be loaded.';
}
