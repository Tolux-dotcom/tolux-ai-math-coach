import { answersEquivalent, escapeHtml } from "./lesson-core.mjs";

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const els = {
  title: document.querySelector("#practiceTitle"),
  meta: document.querySelector("#practiceMeta"),
  progressLabel: document.querySelector("#practiceProgressLabel"),
  progressBar: document.querySelector("#practiceProgressBar"),
  questionView: document.querySelector("#practiceQuestionView"),
  questionNumber: document.querySelector("#practiceQuestionNumber"),
  difficulty: document.querySelector("#practiceDifficulty"),
  prompt: document.querySelector("#practicePrompt"),
  answer: document.querySelector("#practiceAnswer"),
  check: document.querySelector("#checkPracticeAnswer"),
  stuck: document.querySelector("#practiceStuckBtn"),
  explain: document.querySelector("#practiceExplainBtn"),
  feedback: document.querySelector("#practiceFeedback"),
  next: document.querySelector("#nextPracticeQuestion"),
  summary: document.querySelector("#practiceSummary"),
  skill: document.querySelector("#practiceSkill"),
  sessionDifficulty: document.querySelector("#practiceSessionDifficulty"),
  sessionCount: document.querySelector("#practiceSessionCount"),
  liveScore: document.querySelector("#practiceLiveScore")
};

let practiceSession = null;
let currentIndex = 0;
let lessonLocked = false;
let isSubscriber = false;
let completionReport = null;
let trialTimer = null;
const countedInteractions = new Set();
const records = new Map();
const startedAt = Date.now();

function labelDifficulty(value) {
  return String(value || "").split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}

function normalizeItemDifficulty(item) {
  const value = String(item?.difficulty || "").toLowerCase();
  if (value.includes("foundational")) return "foundational";
  if (value.includes("grade")) return "grade-level";
  return "challenging";
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPracticeItems(module, difficulty, count) {
  const bank = (module.items || []).filter(item => item?.id && item?.prompt && item?.answer_key);
  if (bank.length < count) throw new Error("A.10F does not yet contain enough verified practice items.");

  let ordered;
  if (difficulty === "mixed") {
    ordered = shuffle(bank);
  } else {
    const matching = shuffle(bank.filter(item => normalizeItemDifficulty(item) === difficulty));
    const others = shuffle(bank.filter(item => normalizeItemDifficulty(item) !== difficulty));
    ordered = [...matching, ...others];
  }

  return ordered.slice(0, count).map((item, index) => ({
    ...item,
    id: `practice-${item.id}`,
    source_item_id: item.id,
    number: index + 1,
    difficulty: normalizeItemDifficulty(item),
    hint: item.hint_steps?.[0] || item.tutor_behavior || "Check the difference-of-squares pattern.",
    alternate_explanation: item.alternate_solution_steps?.length
      ? "Use the alternate worked steps below."
      : item.tutor_behavior || "Rewrite both terms as squares, then use conjugate factors.",
    solution_steps: item.solution_steps?.length
      ? item.solution_steps
      : item.alternate_solution_steps?.length
        ? item.alternate_solution_steps
        : [
            { equation: item.prompt, explanation: item.tutor_behavior || "Identify the square structure." },
            { equation: item.answer_key, explanation: "Check by multiplying the conjugate factors." }
          ]
  }));
}

function currentItem() {
  return practiceSession?.items?.[currentIndex] || null;
}

function getRecord(item) {
  if (!records.has(item.id)) {
    records.set(item.id, {
      item_id: item.id,
      attempt_count: 0,
      first_attempt_correct: null,
      hint_count: 0,
      first_error_tag: null
    });
  }
  return records.get(item.id);
}

function recordAttempt(item, correct) {
  const record = getRecord(item);
  record.attempt_count += 1;
  if (record.first_attempt_correct === null) record.first_attempt_correct = correct;
  if (!correct && !record.first_error_tag) record.first_error_tag = item.diagnostic_tag || "unknown";
}

function setFeedback(markup = "") {
  els.feedback.innerHTML = markup;
}

function setControlsDisabled(disabled) {
  els.answer.disabled = disabled;
  els.check.disabled = disabled;
  els.stuck.disabled = disabled;
  els.explain.disabled = disabled;
}

function solutionMarkup(item, heading = "Worked solution") {
  const steps = (item.solution_steps || []).map((step, index) => `
    <li>
      <span class="solution-step-number">${index + 1}</span>
      <div><div class="math-line">${escapeHtml(step.equation)}</div><p>${escapeHtml(step.explanation)}</p></div>
    </li>
  `).join("");
  return `<div class="solution-panel practice-solution"><h3>${escapeHtml(heading)}</h3><ol class="solution-steps">${steps}</ol></div>`;
}

function fullHelpMarkup(item) {
  const steps = item.alternate_solution_steps?.length
    ? item.alternate_solution_steps
    : item.solution_steps;
  const adapted = { ...item, solution_steps: steps };
  return `
    <div class="lesson-state lesson-state-success">
      <strong>Another way to think about it</strong>
      <p>Check three things first: two terms, subtraction, and two perfect squares. Then use p²-q²=(p-q)(p+q).</p>
    </div>
    ${solutionMarkup(adapted, "Step-by-step reasoning")}
  `;
}

async function getAuthSession() {
  if (!supabaseClient) return null;
  let { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    const { data } = await supabaseClient.auth.refreshSession();
    session = data?.session || null;
  }
  return session;
}

async function fetchWithSession(url, options = {}) {
  let session = await getAuthSession();
  if (!session) return { response: null, session: null };
  const request = active => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${active.access_token}` }
  });
  let response = await request(session);
  if (response.status === 401) {
    const { data, error } = await supabaseClient.auth.refreshSession();
    const refreshed = error ? null : data?.session;
    if (refreshed) {
      session = refreshed;
      response = await request(session);
    }
  }
  return { response, session };
}

function showUpgrade(message) {
  lessonLocked = true;
  setControlsDisabled(true);
  els.next.hidden = true;
  setFeedback(`
    <div class="lesson-state lesson-state-warning">
      <strong>Upgrade to continue</strong>
      <p>${escapeHtml(message)}</p>
      <a class="lesson-link-button" href="/#pricingSection">View Tolux Plans</a>
    </div>
  `);
}

async function ensureAccess(item) {
  if (!item || lessonLocked) return false;
  if (countedInteractions.has(item.id)) return true;
  const auth = await getAuthSession();
  if (!auth) {
    setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Sign in required</strong><p>Return to the dashboard and sign in before using Practice Mode.</p><a class="lesson-link-button" href="/">Go to Sign In</a></div>`);
    return false;
  }
  try {
    const { response } = await fetchWithSession("/api/lesson-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id })
    });
    if (!response) return false;
    const data = await response.json();
    if (response.ok && data.allowed) {
      countedInteractions.add(item.id);
      isSubscriber = Boolean(data.isSubscriber);
      return true;
    }
    if (data.limitReached) {
      showUpgrade(data.error || "You've completed your 10-minute free learning trial.");
      return false;
    }
    setFeedback(`<div class="lesson-state lesson-state-error"><strong>Unable to continue</strong><p>${escapeHtml(data.error || "Please try again.")}</p></div>`);
  } catch (error) {
    console.error("A.10F practice access failed:", error);
    setFeedback(`<div class="lesson-state lesson-state-error"><strong>Connection problem</strong><p>Please check your connection and try again.</p></div>`);
  }
  return false;
}

async function heartbeat() {
  if (lessonLocked || isSubscriber || document.visibilityState !== "visible" || !practiceSession) return;
  try {
    const { response } = await fetchWithSession("/api/trial-heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeSeconds: 15 })
    });
    if (!response) return;
    const data = await response.json();
    if (data.limitReached) showUpgrade(data.error || "You've completed your 10-minute free learning trial.");
  } catch (error) {
    console.error("A.10F heartbeat failed:", error);
  }
}

trialTimer = window.setInterval(heartbeat, 15000);
window.addEventListener("pagehide", () => window.clearInterval(trialTimer));

function updateLiveScore() {
  const answered = [...records.values()].filter(record => record.first_attempt_correct !== null);
  const correct = answered.filter(record => record.first_attempt_correct).length;
  els.liveScore.textContent = `${correct} / ${answered.length}`;
}

function renderQuestion() {
  const item = currentItem();
  if (!item) return;
  const number = currentIndex + 1;
  const percent = Math.round((currentIndex / practiceSession.count) * 100);
  els.questionNumber.textContent = `Question ${number} of ${practiceSession.count}`;
  els.progressLabel.textContent = `A.10F • Question ${number} of ${practiceSession.count}`;
  els.progressBar.style.width = `${percent}%`;
  els.progressBar.setAttribute("aria-valuenow", String(percent));
  els.difficulty.textContent = labelDifficulty(item.difficulty);
  els.prompt.innerHTML = escapeHtml(item.prompt).replaceAll("\n", "<br>");
  els.answer.value = "";
  els.answer.placeholder = "Enter your factorization or response";
  setControlsDisabled(false);
  els.next.hidden = true;
  els.next.textContent = number === practiceSession.count ? "View Session Results →" : "Next Question →";
  setFeedback();
  els.answer.focus();
}

async function checkAnswer() {
  const item = currentItem();
  const answer = els.answer.value.trim();
  if (!item || !answer) {
    setFeedback("<strong>Enter an answer before checking.</strong>");
    return;
  }
  els.check.disabled = true;
  if (!(await ensureAccess(item))) {
    if (!lessonLocked) els.check.disabled = false;
    return;
  }

  const correct = answersEquivalent(answer, item);
  recordAttempt(item, correct);
  const record = getRecord(item);
  updateLiveScore();

  if (correct) {
    setControlsDisabled(true);
    els.next.hidden = false;
    setFeedback(`<div class="lesson-state lesson-state-success"><strong>Correct</strong><p>${escapeHtml(item.answer_key)}</p></div>${record.attempt_count > 1 ? solutionMarkup(item) : ""}`);
    return;
  }

  if (record.attempt_count === 1) {
    els.check.disabled = false;
    setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Not correct yet</strong><p>Check whether you have two perfect squares separated by subtraction, then verify the conjugate factors.</p></div>`);
    els.answer.focus();
    return;
  }

  setControlsDisabled(true);
  els.next.hidden = false;
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Review this one</strong><p>The expected answer is <strong>${escapeHtml(item.answer_key)}</strong>.</p></div>${solutionMarkup(item)}`);
}

function calculateSummary() {
  const values = [...records.values()];
  const correct = values.filter(record => record.first_attempt_correct === true).length;
  const total = practiceSession.items.length;
  const scorePercent = total ? Math.round((correct / total) * 100) : 0;
  return {
    total,
    correct,
    scorePercent,
    label: scorePercent >= 80 ? "Mastered" : scorePercent >= 60 ? "Developing" : "Intervention Needed",
    missed: practiceSession.items.filter(item => records.get(item.id)?.first_attempt_correct !== true)
  };
}

function completionId() {
  return window.crypto?.randomUUID?.() || `a10f-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function saveCompletion(summary) {
  if (!completionReport) {
    completionReport = {
      completion_id: completionId(),
      module_id: "practice-alg1-a10f-difference-of-squares",
      completed_at: new Date().toISOString(),
      mastery_label: summary.label,
      mastery_score: summary.scorePercent,
      is_subscriber: isSubscriber,
      time_on_skill_seconds: Math.round((Date.now() - startedAt) / 1000),
      item_records: [...records.values()]
    };
  }
  const moduleKey = `${LESSON_PROGRESS_PREFIX}${completionReport.module_id}`;
  const pendingKey = `${PENDING_PROGRESS_PREFIX}${completionReport.completion_id}`;
  try {
    localStorage.setItem(moduleKey, JSON.stringify(completionReport));
    localStorage.setItem(pendingKey, JSON.stringify(completionReport));
  } catch {}

  const { response, session } = await fetchWithSession("/api/lesson-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(completionReport)
  });
  if (!session || !response) throw new Error("Sign in is required to sync practice progress.");
  const data = await response.json();
  if (!response.ok || !data.activity) throw new Error(data.error || "Unable to save practice progress.");
  try {
    localStorage.setItem(moduleKey, JSON.stringify(data.activity));
    localStorage.removeItem(pendingKey);
  } catch {}
}

async function finishSession() {
  const summary = calculateSummary();
  els.questionView.hidden = true;
  els.summary.hidden = false;
  els.progressLabel.textContent = "Practice session complete";
  els.progressBar.style.width = "100%";
  els.progressBar.setAttribute("aria-valuenow", "100");
  const missed = summary.missed.length
    ? `<h3>Review these questions</h3><div class="practice-review-list">${summary.missed.map(item => `<article><strong>${escapeHtml(item.prompt)}</strong><p>Expected answer: ${escapeHtml(item.answer_key)}</p>${solutionMarkup(item)}</article>`).join("")}</div>`
    : "<p>You answered every question correctly on the first attempt.</p>";
  els.summary.innerHTML = `
    <div class="completion-mark">✓</div><h2>${escapeHtml(summary.label)}</h2><p class="mastery-score">${summary.scorePercent}%</p>
    <p>${summary.correct} of ${summary.total} correct on the first attempt.</p>
    <p id="practiceSaveStatus" class="completion-save-status">Saving your practice progress…</p>
    ${missed}
    <div class="practice-summary-actions"><a class="lesson-link-button" href="/#practiceModePanel">Practice Another Skill</a><a class="lesson-link-button practice-secondary-link" href="/">View Dashboard</a></div>
  `;
  const status = document.querySelector("#practiceSaveStatus");
  try {
    await saveCompletion(summary);
    status.textContent = "Saved to your Tolux progress dashboard.";
  } catch (error) {
    console.error("A.10F practice sync failed:", error);
    status.textContent = "Saved on this device. Tolux will retry account sync from the dashboard.";
  }
}

function advance() {
  if (currentIndex >= practiceSession.count - 1) finishSession();
  else {
    currentIndex += 1;
    renderQuestion();
  }
}

async function startPractice() {
  try {
    const params = new URLSearchParams(window.location.search);
    const difficulty = params.get("difficulty") || "grade-level";
    const count = Number(params.get("count") || 5);
    if (!["foundational", "grade-level", "challenging", "mixed"].includes(difficulty)) throw new Error("Choose a valid practice difficulty.");
    if (![5, 10, 20].includes(count)) throw new Error("Choose 5, 10, or 20 practice questions.");

    const response = await fetch("/a10f-difference-of-squares.json");
    if (!response.ok) throw new Error(`A.10F practice bank failed to load (${response.status}).`);
    const module = await response.json();
    practiceSession = {
      skill: "A.10F",
      title: module.title,
      module_id: module.module_id,
      difficulty,
      count,
      items: buildPracticeItems(module, difficulty, count)
    };
    els.title.textContent = module.title;
    els.meta.textContent = "Algebra 1 • TEKS A.10F";
    els.skill.textContent = "A.10F • Difference of Two Squares";
    els.sessionDifficulty.textContent = labelDifficulty(difficulty);
    els.sessionCount.textContent = String(count);
    renderQuestion();
  } catch (error) {
    console.error("A.10F practice failed:", error);
    els.title.textContent = "Practice unavailable";
    els.questionView.innerHTML = `<div class="lesson-state lesson-state-error"><h2>We could not start this practice session</h2><p>${escapeHtml(error.message)}</p><a class="lesson-link-button" href="/#practiceModePanel">Choose Practice Settings</a></div>`;
  }
}

els.check.addEventListener("click", checkAnswer);
els.answer.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkAnswer();
  }
});
els.next.addEventListener("click", advance);
els.stuck.addEventListener("click", async () => {
  const item = currentItem();
  if (!item || !(await ensureAccess(item))) return;
  const record = getRecord(item);
  record.hint_count += 1;
  const hints = item.hint_steps?.length ? item.hint_steps : [item.hint];
  const hint = hints[Math.min(record.hint_count - 1, hints.length - 1)];
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Hint ${Math.min(record.hint_count, hints.length)}</strong><p>${escapeHtml(hint)}</p></div>`);
});
els.explain.addEventListener("click", async () => {
  const item = currentItem();
  if (!item || !(await ensureAccess(item))) return;
  getRecord(item).hint_count += 1;
  setFeedback(fullHelpMarkup(item));
});

startPractice();
