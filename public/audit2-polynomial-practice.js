import { answersEquivalent, escapeHtml, formatMathNotation } from './lesson-core.mjs';

const params = new URLSearchParams(location.search);
const skill = params.get('skill');
const CONFIG = {
  'A.10D': {
    moduleId: 'alg1-a10d-equivalent-polynomial-forms',
    path: '/a10d-equivalent-polynomial-forms.json',
    title: 'Equivalent Polynomial Forms',
    rule: 'Preserve value while changing form: distribute, combine like terms, or factor a greatest common factor.'
  },
  'A.10E': {
    moduleId: 'alg1-a10e-factor-trinomials',
    path: '/a10e-factor-trinomials.json',
    title: 'Factor Trinomials',
    rule: 'Factor out the GCF first; then use factor pairs or the ac method and multiply back to verify.'
  }
};
const config = CONFIG[skill];

const $ = selector => document.querySelector(selector);
const els = {
  title: $('#practiceTitle'), meta: $('#practiceMeta'), progressLabel: $('#practiceProgressLabel'),
  progressBar: $('#practiceProgressBar'), view: $('#practiceQuestionView'), number: $('#practiceQuestionNumber'),
  difficulty: $('#practiceDifficulty'), prompt: $('#practicePrompt'), answer: $('#practiceAnswer'),
  check: $('#checkPracticeAnswer'), stuck: $('#practiceStuckBtn'), explain: $('#practiceExplainBtn'),
  feedback: $('#practiceFeedback'), next: $('#nextPracticeQuestion'), summary: $('#practiceSummary'),
  skill: $('#practiceSkill'), sessionDifficulty: $('#practiceSessionDifficulty'), sessionCount: $('#practiceSessionCount'),
  live: $('#practiceLiveScore')
};

const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
const sb = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const LESSON_PROGRESS_PREFIX = 'toluxLessonProgress:';
const PENDING_PROGRESS_PREFIX = 'toluxPendingLessonProgress:';

let moduleData = null;
let items = [];
let index = 0;
let locked = false;
let isSubscriber = false;
let completionReport = null;
let trialTimer = null;
const counted = new Set();
const records = new Map();
const startedAt = Date.now();

const normalizeDifficulty = item => {
  const value = String(item?.difficulty || '').toLowerCase();
  if (value.includes('foundational')) return 'foundational';
  if (value.includes('challenging') || value.includes('reasoning') || value.includes('context')) return 'challenging';
  return 'grade-level';
};
const labelDifficulty = value => String(value || '').split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function current() { return items[index] || null; }
function recordFor(item) {
  if (!records.has(item.id)) records.set(item.id, {
    item_id: item.id, attempt_count: 0, first_attempt_correct: null, hint_count: 0, first_error_tag: null
  });
  return records.get(item.id);
}
function recordAttempt(item, correct) {
  const record = recordFor(item);
  record.attempt_count += 1;
  if (record.first_attempt_correct === null) record.first_attempt_correct = correct;
  if (!correct && !record.first_error_tag) record.first_error_tag = item.diagnostic_tag || 'unknown';
}
function disable(value) {
  els.answer.disabled = value;
  els.check.disabled = value;
  els.stuck.disabled = value;
  els.explain.disabled = value;
}
function setFeedback(markup = '') { els.feedback.innerHTML = markup; }
function display(value) { return formatMathNotation(value ?? ''); }

function solutionSteps(item, alternate = false) {
  const preferred = alternate && item.alternate_solution_steps?.length
    ? item.alternate_solution_steps
    : item.solution_steps?.length
      ? item.solution_steps
      : item.alternate_solution_steps?.length
        ? item.alternate_solution_steps
        : null;
  return preferred || [
    { equation: item.prompt, explanation: item.tutor_behavior || 'Apply the lesson rule carefully.' },
    { equation: item.answer_key, explanation: 'Verify the final form against the original expression.' }
  ];
}
function solutionMarkup(item, heading = 'Correct answer and full explanation', alternate = false) {
  const steps = solutionSteps(item, alternate).map((step, i) => `
    <li><span class="solution-step-number">${i + 1}</span><div><div class="math-line">${escapeHtml(display(step.equation))}</div><p>${escapeHtml(display(step.explanation))}</p></div></li>
  `).join('');
  return `
    <div class="solution-panel audit2-practice-solution">
      <h3>${escapeHtml(heading)}</h3>
      <p><strong>Final answer:</strong> ${escapeHtml(display(item.answer_key))}</p>
      <ol class="solution-steps">${steps}</ol>
      <div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${escapeHtml(config.rule)}</p></div>
    </div>
  `;
}

function hintSteps(item) {
  if (Array.isArray(item.hint_steps) && item.hint_steps.length >= 3) return item.hint_steps.slice(0, 3);
  const first = item.tutor_behavior || 'Identify the structure of the expression before changing it.';
  const second = skill === 'A.10E'
    ? 'Check the GCF, then use the product and sum information to build the factors.'
    : 'Distribute every factor, track every sign, and combine only terms with the same variable part and exponent.';
  return [first, second, `The correct answer is ${item.answer_key}.`];
}

async function auth() {
  if (!sb) return null;
  let { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { data } = await sb.auth.refreshSession();
    session = data?.session || null;
  }
  return session;
}
async function fetchWithSession(url, options = {}) {
  let session = await auth();
  if (!session) return { response: null, session: null };
  const request = active => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${active.access_token}` }
  });
  let response = await request(session);
  if (response.status === 401) {
    const { data, error } = await sb.auth.refreshSession();
    const refreshed = error ? null : data?.session;
    if (refreshed) { session = refreshed; response = await request(session); }
  }
  return { response, session };
}
function showUpgrade(message) {
  locked = true;
  disable(true);
  els.next.hidden = true;
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Upgrade to continue</strong><p>${escapeHtml(message)}</p><a class="lesson-link-button" href="/#pricingSection">View Tolux Plans</a></div>`);
}
async function ensureAccess(item) {
  if (!item || locked) return false;
  if (counted.has(item.id)) return true;
  const session = await auth();
  if (!session) {
    setFeedback('<div class="lesson-state lesson-state-warning"><strong>Sign in required</strong><p>Return to the dashboard and sign in before using Practice Mode.</p></div>');
    return false;
  }
  try {
    const { response } = await fetchWithSession('/api/lesson-usage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: item.id })
    });
    if (!response) return false;
    const data = await response.json();
    if (response.ok && data.allowed) {
      counted.add(item.id);
      isSubscriber = Boolean(data.isSubscriber);
      return true;
    }
    if (data.limitReached) {
      showUpgrade(data.error || "You've completed your 10-minute free learning trial.");
      return false;
    }
    setFeedback(`<div class="lesson-state lesson-state-error"><strong>Unable to continue</strong><p>${escapeHtml(data.error || 'Please try again.')}</p></div>`);
  } catch (error) {
    console.error('Audit2 practice access failed', error);
    setFeedback('<div class="lesson-state lesson-state-error"><strong>Connection problem</strong><p>Please check your connection and try again.</p></div>');
  }
  return false;
}
async function heartbeat() {
  if (locked || isSubscriber || document.visibilityState !== 'visible' || !items.length) return;
  try {
    const { response } = await fetchWithSession('/api/trial-heartbeat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activeSeconds: 15 })
    });
    if (!response) return;
    const data = await response.json();
    if (data.limitReached) showUpgrade(data.error || "You've completed your 10-minute free learning trial.");
  } catch (error) { console.warn('Audit2 heartbeat failed', error); }
}

function updateScore() {
  const answered = [...records.values()].filter(r => r.first_attempt_correct !== null);
  els.live.textContent = `${answered.filter(r => r.first_attempt_correct).length} / ${answered.length}`;
}
function render() {
  const item = current();
  if (!item) return;
  const number = index + 1;
  const pct = Math.round((index / items.length) * 100);
  els.number.textContent = `Question ${number} of ${items.length}`;
  els.progressLabel.textContent = `${skill} • Question ${number} of ${items.length}`;
  els.progressBar.style.width = `${pct}%`;
  els.progressBar.setAttribute('aria-valuenow', String(pct));
  els.difficulty.textContent = labelDifficulty(normalizeDifficulty(item));
  els.prompt.innerHTML = escapeHtml(display(item.prompt)).replaceAll('\n', '<br>');
  els.answer.value = '';
  els.answer.placeholder = skill === 'A.10E' ? 'Enter the factorization or requested values' : 'Enter an equivalent expression';
  disable(false);
  els.next.hidden = true;
  els.next.textContent = number === items.length ? 'View Session Results →' : 'Next Question →';
  setFeedback();
  els.answer.focus();
}

async function check() {
  const item = current();
  const answer = els.answer.value.trim();
  if (!item || !answer) { setFeedback('<strong>Enter an answer before checking.</strong>'); return; }
  els.check.disabled = true;
  if (!(await ensureAccess(item))) { if (!locked) els.check.disabled = false; return; }
  const correct = answersEquivalent(answer, item);
  recordAttempt(item, correct);
  updateScore();
  disable(true);
  els.next.hidden = false;
  if (correct) {
    setFeedback(`<div class="lesson-state lesson-state-success"><strong>Correct</strong><p>Use the reasoning below to verify your work.</p></div>${solutionMarkup(item, 'Why this answer is correct')}`);
  } else {
    setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Not correct</strong><p>Your first-attempt score is recorded. Compare your work with the correct answer and full solution below.</p></div>${solutionMarkup(item)}`);
  }
}

async function stuck() {
  const item = current();
  if (!item || !(await ensureAccess(item))) return;
  const record = recordFor(item);
  record.hint_count += 1;
  const hints = hintSteps(item);
  const level = Math.min(record.hint_count, 3);
  const reveal = level === 3 ? solutionMarkup(item, 'Hint 3: answer and complete reasoning') : '';
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Hint ${level}</strong><p>${escapeHtml(display(hints[level - 1]))}</p></div>${reveal}`);
}
async function explain() {
  const item = current();
  if (!item || !(await ensureAccess(item))) return;
  setFeedback(`<div class="lesson-state lesson-state-success"><strong>Another way to think about it</strong><p>Use a different representation, then verify by reversing the process.</p></div>${solutionMarkup(item, 'Step-by-step alternative explanation', true)}`);
}

function completionId() { return window.crypto?.randomUUID?.() || `audit2-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function summary() {
  const values = [...records.values()].filter(r => r.first_attempt_correct !== null);
  const correct = values.filter(r => r.first_attempt_correct).length;
  const total = items.length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  return { correct, total, pct, label: pct >= 80 ? 'Mastered' : pct >= 60 ? 'Developing' : 'Intervention Needed' };
}
async function save(result) {
  if (!completionReport) completionReport = {
    completion_id: completionId(), module_id: `practice-${config.moduleId}`, completed_at: new Date().toISOString(),
    mastery_label: result.label, mastery_score: result.pct, is_subscriber: isSubscriber,
    time_on_skill_seconds: Math.round((Date.now() - startedAt) / 1000), item_records: [...records.values()]
  };
  const moduleKey = `${LESSON_PROGRESS_PREFIX}${completionReport.module_id}`;
  const pendingKey = `${PENDING_PROGRESS_PREFIX}${completionReport.completion_id}`;
  try { localStorage.setItem(moduleKey, JSON.stringify(completionReport)); localStorage.setItem(pendingKey, JSON.stringify(completionReport)); } catch {}
  const { response, session } = await fetchWithSession('/api/lesson-progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(completionReport)
  });
  if (!session || !response) throw new Error('Sign in is required to sync practice progress.');
  const data = await response.json();
  if (!response.ok || !data.activity) throw new Error(data.error || 'Unable to save practice progress.');
  try { localStorage.setItem(moduleKey, JSON.stringify(data.activity)); localStorage.removeItem(pendingKey); } catch {}
}
async function finish() {
  const result = summary();
  els.view.hidden = true;
  els.summary.hidden = false;
  els.progressBar.style.width = '100%';
  els.progressBar.setAttribute('aria-valuenow', '100');
  els.progressLabel.textContent = 'Practice session complete';
  els.summary.innerHTML = `<div class="completion-mark">✓</div><h2>${escapeHtml(result.label)}</h2><p class="mastery-score">${result.pct}%</p><p>${result.correct} of ${result.total} correct on the first attempt.</p><p id="audit2SaveStatus" class="completion-save-status">Saving your practice progress…</p><div class="practice-summary-actions"><a class="lesson-link-button" href="/#practiceModePanel">Practice Another Skill</a><a class="lesson-link-button practice-secondary-link" href="/">View Dashboard</a></div>`;
  const status = $('#audit2SaveStatus');
  try { await save(result); if (status) status.textContent = 'Saved to your Tolux progress dashboard.'; }
  catch (error) { console.error('Audit2 progress sync failed', error); if (status) status.textContent = 'Saved on this device. Tolux will retry account sync from the dashboard.'; }
}
function next() { if (index >= items.length - 1) finish(); else { index += 1; render(); } }

async function start() {
  if (!config) { els.title.textContent = 'Practice unavailable'; return; }
  try {
    const response = await fetch(config.path);
    if (!response.ok) throw new Error(`Practice bank failed to load (${response.status}).`);
    moduleData = await response.json();
    const difficulty = params.get('difficulty') || 'grade-level';
    const requested = Number(params.get('count') || 5);
    const count = [5,10,20].includes(requested) ? requested : 5;
    const bank = (moduleData.items || []).filter(item => item.type !== 'worked_example' && item.prompt && item.answer_key);
    const ordered = difficulty === 'mixed'
      ? shuffle(bank)
      : [...shuffle(bank.filter(item => normalizeDifficulty(item) === difficulty)), ...shuffle(bank.filter(item => normalizeDifficulty(item) !== difficulty))];
    items = ordered.slice(0, count);
    if (items.length < count) throw new Error(`${skill} does not yet contain enough verified practice questions.`);
    els.title.textContent = config.title;
    els.meta.textContent = `Algebra 1 • TEKS ${skill}`;
    els.skill.textContent = `${skill} • ${config.title}`;
    els.sessionDifficulty.textContent = labelDifficulty(difficulty);
    els.sessionCount.textContent = String(count);
    render();
  } catch (error) {
    console.error('Audit2 practice start failed', error);
    els.title.textContent = 'Practice unavailable';
    els.view.innerHTML = `<div class="lesson-state lesson-state-error"><h2>We could not start this practice session</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

els.check.addEventListener('click', check);
els.answer.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); check(); } });
els.next.addEventListener('click', next);
els.stuck.addEventListener('click', stuck);
els.explain.addEventListener('click', explain);
trialTimer = window.setInterval(heartbeat, 15000);
window.addEventListener('pagehide', () => { if (trialTimer) window.clearInterval(trialTimer); });
start();