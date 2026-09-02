import { escapeHtml } from "./lesson-core.mjs";
import {
  PRACTICE_SKILLS,
  calculatePracticeSummary,
  generatePracticeSession,
  generateStructuredPracticeSession,
  gradePracticeAnswer,
  validatePracticeOptions
} from "./practice-core.mjs";

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const practiceTitle = document.querySelector("#practiceTitle");
const practiceMeta = document.querySelector("#practiceMeta");
const practiceProgressLabel = document.querySelector("#practiceProgressLabel");
const practiceProgressBar = document.querySelector("#practiceProgressBar");
const practiceQuestionView = document.querySelector("#practiceQuestionView");
const practiceQuestionNumber = document.querySelector("#practiceQuestionNumber");
const practiceDifficulty = document.querySelector("#practiceDifficulty");
const practicePrompt = document.querySelector("#practicePrompt");
const practiceAnswer = document.querySelector("#practiceAnswer");
const checkPracticeAnswer = document.querySelector("#checkPracticeAnswer");
const practiceStuckBtn = document.querySelector("#practiceStuckBtn");
const practiceExplainBtn = document.querySelector("#practiceExplainBtn");
const practiceFeedback = document.querySelector("#practiceFeedback");
const nextPracticeQuestion = document.querySelector("#nextPracticeQuestion");
const practiceSummary = document.querySelector("#practiceSummary");
const practiceSkill = document.querySelector("#practiceSkill");
const practiceSessionDifficulty = document.querySelector(
  "#practiceSessionDifficulty"
);
const practiceSessionCount = document.querySelector("#practiceSessionCount");
const practiceLiveScore = document.querySelector("#practiceLiveScore");

let session = null;
let currentIndex = 0;
let lessonLocked = false;
let isSubscriber = false;
let completionReport = null;
let trialHeartbeatTimer = null;
const countedInteractions = new Set();
const itemRecords = new Map();
const startedAt = Date.now();

function labelDifficulty(value) {
  return String(value || "")
    .split("-")
    .map(word => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function currentItem() {
  return session?.items?.[currentIndex] || null;
}

function getItemRecord(item) {
  if (!itemRecords.has(item.id)) {
    itemRecords.set(item.id, {
      item_id: item.id,
      attempt_count: 0,
      first_attempt_correct: null,
      hint_count: 0,
      first_error_tag: null
    });
  }
  return itemRecords.get(item.id);
}

function recordAttempt(item, correct) {
  const record = getItemRecord(item);
  record.attempt_count += 1;
  if (record.first_attempt_correct === null) {
    record.first_attempt_correct = correct;
  }
  if (!correct && !record.first_error_tag) {
    record.first_error_tag = item.diagnostic_tag || "unknown";
  }
}

function setFeedback(markup = "") {
  practiceFeedback.innerHTML = markup;
}

function setQuestionControlsDisabled(disabled) {
  practiceAnswer.disabled = disabled;
  checkPracticeAnswer.disabled = disabled;
  practiceStuckBtn.disabled = disabled;
  practiceExplainBtn.disabled = disabled;
}

function solutionMarkup(item) {
  const steps = (item.solution_steps || [])
    .map((step, index) => `
      <li>
        <span class="solution-step-number">${index + 1}</span>
        <div>
          <div class="math-line">${escapeHtml(step.equation)}</div>
          <p>${escapeHtml(step.explanation)}</p>
        </div>
      </li>
    `)
    .join("");

  return `
    <div class="solution-panel practice-solution">
      <h3>Worked solution</h3>
      <ol class="solution-steps">${steps}</ol>
    </div>
  `;
}

function teachingExplanationMarkup(item) {
  const teaching = item.teaching_explanation || {};
  const teachingSteps = Array.isArray(teaching.steps) && teaching.steps.length > 0
    ? teaching.steps
    : (item.solution_steps || []).map((step, index) => ({
        label: `Step ${index + 1}`,
        equation: step.equation,
        explanation: step.explanation
      }));
  const steps = teachingSteps.map((step, index) => `
    <li>
      <span class="solution-step-number">${index + 1}</span>
      <div>
        <strong>${escapeHtml(step.label || `Step ${index + 1}`)}</strong>
        <div class="math-line">${escapeHtml(step.equation)}</div>
        <p>${escapeHtml(step.explanation)}</p>
      </div>
    </li>
  `).join("");
  const verification = teaching.verification ? `
    <div class="teaching-check">
      <strong>Check the answer</strong>
      <div class="math-line">${escapeHtml(teaching.verification.equation)}</div>
      <p>${escapeHtml(teaching.verification.explanation)}</p>
    </div>
  ` : "";
  const vocabulary = teaching.vocabulary ? `
    <div class="teaching-vocabulary">
      <strong>Words to know</strong>
      <p>${escapeHtml(teaching.vocabulary)}</p>
    </div>
  ` : "";
  const lessonUrl = `/lesson.html?module=${encodeURIComponent(session.module_id)}`;

  return `
    <div class="lesson-state lesson-state-success teaching-explanation">
      <h3>${escapeHtml(teaching.title || "Let’s work through the mathematics")}</h3>
      <p>${escapeHtml(teaching.overview || item.alternate_explanation)}</p>
      <ol class="solution-steps teaching-steps">${steps}</ol>
      ${verification}
      ${vocabulary}
      <div class="teaching-lesson-link">
        <strong>Need the complete lesson?</strong>
        <p>Tutor Mode teaches the concept, vocabulary, worked examples, guided practice, common mistakes, and mastery check.</p>
        <a href="${escapeHtml(lessonUrl)}">Open the full ${escapeHtml(session.skill)} Tutor lesson</a>
      </div>
    </div>
  `;
}

async function getPracticeSession() {
  if (!supabaseClient) return null;

  let {
    data: { session: authSession }
  } = await supabaseClient.auth.getSession();

  if (!authSession) {
    const { data } = await supabaseClient.auth.refreshSession();
    authSession = data?.session || null;
  }

  return authSession;
}

async function fetchWithPracticeSession(url, options = {}) {
  let authSession = await getPracticeSession();
  if (!authSession) return { response: null, session: null };

  const request = activeSession => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${activeSession.access_token}`
    }
  });

  let response = await request(authSession);
  if (response.status === 401) {
    const { data, error } = await supabaseClient.auth.refreshSession();
    const refreshedSession = error ? null : data?.session;
    if (refreshedSession) {
      authSession = refreshedSession;
      response = await request(authSession);
    }
  }

  return { response, session: authSession };
}

function showUpgrade(message) {
  lessonLocked = true;
  setQuestionControlsDisabled(true);
  nextPracticeQuestion.hidden = true;
  setFeedback(`
    <div class="lesson-state lesson-state-warning">
      <strong>Upgrade to continue</strong>
      <p>${escapeHtml(message)}</p>
      <a class="lesson-link-button" href="/#pricingSection">View Tolux Plans</a>
    </div>
  `);
}

async function ensurePracticeAccess(item) {
  if (!item || lessonLocked) return false;
  if (countedInteractions.has(item.id)) return true;

  try {
    const authSession = await getPracticeSession();
    if (!authSession) {
      setFeedback(`
        <div class="lesson-state lesson-state-warning">
          <strong>Sign in required</strong>
          <p>Return to the dashboard and sign in before using a learning interaction.</p>
          <a class="lesson-link-button" href="/">Go to Sign In</a>
        </div>
      `);
      return false;
    }

    const { response } = await fetchWithPracticeSession("/api/lesson-usage", {
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
      showUpgrade(
        data.error || "You've completed your 10-minute free learning trial."
      );
      return false;
    }

    setFeedback(`
      <div class="lesson-state lesson-state-error">
        <strong>Unable to continue</strong>
        <p>${escapeHtml(data.error || "Please try again.")}</p>
      </div>
    `);
  } catch (error) {
    console.error("Practice access check failed:", error);
    setFeedback(`
      <div class="lesson-state lesson-state-error">
        <strong>Connection problem</strong>
        <p>Please check your connection and try again.</p>
      </div>
    `);
  }

  return false;
}

async function sendPracticeTrialHeartbeat() {
  if (
    lessonLocked ||
    isSubscriber ||
    document.visibilityState !== "visible" ||
    !session
  ) {
    return;
  }

  try {
    const { response } = await fetchWithPracticeSession(
      "/api/trial-heartbeat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSeconds: 15 })
      }
    );
    if (!response) return;
    const data = await response.json();
    if (data.limitReached) {
      showUpgrade(
        data.error || "You've completed your 10-minute free learning trial."
      );
    }
  } catch (error) {
    console.error("Practice trial heartbeat failed:", error);
  }
}

if (typeof window.setInterval === "function") {
  trialHeartbeatTimer = window.setInterval(sendPracticeTrialHeartbeat, 15000);
  window.addEventListener("pagehide", () => {
    if (trialHeartbeatTimer) window.clearInterval(trialHeartbeatTimer);
  });
}

function updateLiveScore() {
  const records = [...itemRecords.values()].filter(
    record => record.first_attempt_correct !== null
  );
  const correct = records.filter(
    record => record.first_attempt_correct === true
  ).length;
  practiceLiveScore.textContent = `${correct} / ${records.length}`;
}

function renderQuestion() {
  const item = currentItem();
  if (!item) return;

  const number = currentIndex + 1;
  const percent = Math.round((currentIndex / session.count) * 100);
  practiceQuestionNumber.textContent = `Question ${number} of ${session.count}`;
  practiceProgressLabel.textContent =
    `${session.skill} • Question ${number} of ${session.count}`;
  practiceProgressBar.style.width = `${percent}%`;
  practiceProgressBar.setAttribute("aria-valuenow", String(percent));
  practiceDifficulty.textContent = labelDifficulty(item.difficulty);
  practicePrompt.innerHTML = escapeHtml(item.prompt).replaceAll("\n", "<br>");
  practiceAnswer.value = "";
  practiceAnswer.placeholder = item.answer_type === "ordered-pair"
    ? "Example: x = 3, y = 5"
    : item.answer_type === "linear-inequality"
      ? "Example: x ≤ 4"
      : "Enter your answer";
  setQuestionControlsDisabled(false);
  nextPracticeQuestion.hidden = true;
  nextPracticeQuestion.textContent = number === session.count
    ? "View Session Results →"
    : "Next Question →";
  setFeedback();
  practiceAnswer.focus();
}

async function checkAnswer() {
  const item = currentItem();
  const answer = practiceAnswer.value.trim();
  if (!item || !answer) {
    setFeedback("<strong>Enter an answer before checking.</strong>");
    return;
  }

  checkPracticeAnswer.disabled = true;
  const allowed = await ensurePracticeAccess(item);
  if (!allowed) {
    if (!lessonLocked) checkPracticeAnswer.disabled = false;
    return;
  }

  const correct = gradePracticeAnswer(answer, item);
  recordAttempt(item, correct);
  const record = getItemRecord(item);
  updateLiveScore();

  if (correct) {
    setQuestionControlsDisabled(true);
    nextPracticeQuestion.hidden = false;
    setFeedback(`
      <div class="lesson-state lesson-state-success">
        <strong>Correct</strong>
        <p>${escapeHtml(item.answer_key)}</p>
      </div>
      ${record.attempt_count > 1 ? solutionMarkup(item) : ""}
    `);
    return;
  }

  if (record.attempt_count === 1) {
    checkPracticeAnswer.disabled = false;
    setFeedback(`
      <div class="lesson-state lesson-state-warning">
        <strong>Not correct yet</strong>
        <p>Check your operations and try once more. Your first-attempt score has been recorded, but you can still finish the problem.</p>
      </div>
    `);
    practiceAnswer.focus();
    return;
  }

  setQuestionControlsDisabled(true);
  nextPracticeQuestion.hidden = false;
  setFeedback(`
    <div class="lesson-state lesson-state-warning">
      <strong>Review this one</strong>
      <p>The expected answer is <strong>${escapeHtml(item.answer_key)}</strong>.</p>
    </div>
    ${solutionMarkup(item)}
  `);
}

function generateCompletionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join("")
  ].join("-");
}

function buildCompletionReport(summary) {
  if (completionReport) return completionReport;
  completionReport = {
    completion_id: generateCompletionId(),
    module_id: `practice-${session.module_id}`,
    completed_at: new Date().toISOString(),
    mastery_label: summary.label,
    mastery_score: summary.scorePercent,
    is_subscriber: isSubscriber,
    time_on_skill_seconds: Math.round((Date.now() - startedAt) / 1000),
    item_records: [...itemRecords.values()]
  };
  return completionReport;
}

async function savePracticeCompletion(summary) {
  const report = buildCompletionReport(summary);
  const moduleKey = `${LESSON_PROGRESS_PREFIX}${report.module_id}`;
  const pendingKey = `${PENDING_PROGRESS_PREFIX}${report.completion_id}`;

  try {
    localStorage.setItem(moduleKey, JSON.stringify(report));
    localStorage.setItem(pendingKey, JSON.stringify(report));
  } catch (error) {
    console.warn("Practice progress could not be saved locally:", error);
  }

  const authSession = await getPracticeSession();
  if (!authSession) throw new Error("Sign in is required to sync practice progress.");

  const response = await fetch("/api/lesson-progress", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authSession.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(report)
  });
  const data = await response.json();
  if (!response.ok || !data.activity) {
    throw new Error(data.error || "Unable to save practice progress.");
  }

  try {
    localStorage.setItem(moduleKey, JSON.stringify(data.activity));
    localStorage.removeItem(pendingKey);
  } catch (error) {
    console.warn("Synced practice progress could not be reconciled:", error);
  }

  return data.activity;
}

function missedReviewMarkup(summary) {
  if (summary.missedItems.length === 0) {
    return "<p>You answered every question correctly on the first attempt.</p>";
  }

  return `
    <h3>Review these questions</h3>
    <div class="practice-review-list">
      ${summary.missedItems.map(item => `
        <article>
          <strong>${escapeHtml(item.prompt)}</strong>
          <p>Expected answer: ${escapeHtml(item.answer_key)}</p>
          ${solutionMarkup(item)}
        </article>
      `).join("")}
    </div>
  `;
}

async function finishSession() {
  const summary = calculatePracticeSummary(
    [...itemRecords.values()],
    session.items
  );
  const hintsUsed = [...itemRecords.values()].reduce(
    (total, record) => total + record.hint_count,
    0
  );

  practiceQuestionView.hidden = true;
  practiceSummary.hidden = false;
  practiceProgressLabel.textContent = "Practice session complete";
  practiceProgressBar.style.width = "100%";
  practiceProgressBar.setAttribute("aria-valuenow", "100");
  practiceSummary.innerHTML = `
    <div class="completion-mark">✓</div>
    <h2>${escapeHtml(summary.label)}</h2>
    <p class="mastery-score">${summary.scorePercent}%</p>
    <p>${summary.firstAttemptCorrect} of ${summary.total} correct on the first attempt • ${hintsUsed} hints used</p>
    <p id="practiceSaveStatus" class="completion-save-status">Saving your practice progress…</p>
    ${missedReviewMarkup(summary)}
    <div class="practice-summary-actions">
      <a class="lesson-link-button" href="/#practiceModePanel">Practice Another Skill</a>
      <a class="lesson-link-button practice-secondary-link" href="/">View Dashboard</a>
    </div>
  `;

  const status = document.querySelector("#practiceSaveStatus");
  try {
    await savePracticeCompletion(summary);
    status.textContent = "Saved to your Tolux progress dashboard.";
  } catch (error) {
    console.error("Practice completion sync failed:", error);
    status.textContent =
      "Saved on this device. Tolux will retry account sync from the dashboard.";
  }
}

function advanceQuestion() {
  if (currentIndex >= session.count - 1) {
    finishSession();
    return;
  }
  currentIndex += 1;
  renderQuestion();
}

function showFatalError(message) {
  practiceTitle.textContent = "Practice unavailable";
  practiceQuestionView.innerHTML = `
    <div class="lesson-state lesson-state-error">
      <h2>We could not start this practice session</h2>
      <p>${escapeHtml(message)}</p>
      <a class="lesson-link-button" href="/#practiceModePanel">Choose Practice Settings</a>
    </div>
  `;
}

async function startPractice() {
  try {
    const params = new URLSearchParams(window.location.search);
    const validation = validatePracticeOptions({
      skill: params.get("skill") || "A.5A",
      difficulty: params.get("difficulty") || "grade-level",
      count: params.get("count") || 5
    });
    if (validation.errors.length > 0) throw new Error(validation.errors[0]);

    const config = PRACTICE_SKILLS[validation.options.skill];
    if (config.lessonPath) {
      const response = await fetch(config.lessonPath);
      if (!response.ok) {
        throw new Error(`Practice bank failed to load: ${response.status}`);
      }
      const lessonModule = await response.json();
      session = generateStructuredPracticeSession(
        validation.options,
        lessonModule
      );
    } else {
      session = generatePracticeSession(validation.options);
    }
    practiceTitle.textContent = session.title;
    practiceMeta.textContent = `Algebra 1 • TEKS ${session.skill}`;
    practiceSkill.textContent = `${session.skill} • ${session.title}`;
    practiceSessionDifficulty.textContent = labelDifficulty(session.difficulty);
    practiceSessionCount.textContent = String(session.count);
    renderQuestion();
  } catch (error) {
    console.error("Practice failed to start:", error);
    showFatalError(error.message || "Please choose a new practice session.");
  }
}

checkPracticeAnswer.addEventListener("click", checkAnswer);
practiceAnswer.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkAnswer();
  }
});
nextPracticeQuestion.addEventListener("click", advanceQuestion);

practiceStuckBtn.addEventListener("click", async () => {
  const item = currentItem();
  if (!item || !(await ensurePracticeAccess(item))) return;
  const record = getItemRecord(item);
  record.hint_count += 1;
  setFeedback(`
    <div class="lesson-state lesson-state-warning">
      <strong>Smallest useful hint</strong>
      <p>${escapeHtml(item.hint)}</p>
    </div>
  `);
});

practiceExplainBtn.addEventListener("click", async () => {
  const item = currentItem();
  if (!item || !(await ensurePracticeAccess(item))) return;
  setFeedback(teachingExplanationMarkup(item));
});

startPractice();
