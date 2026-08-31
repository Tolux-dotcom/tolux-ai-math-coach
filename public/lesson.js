import {
  answersEquivalent,
  buildRecheckItems,
  calculateMastery,
  escapeHtml,
  explanationSatisfies,
  selectStageItems,
  validateLessonModule
} from "./lesson-core.mjs";

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const LESSON_MODULE_PATHS = Object.freeze({
  "alg1-a5a-linear-equations": "/a5a-linear-equations.json"
});
const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const lessonTitle = document.querySelector("#lessonTitle");
const lessonTeks = document.querySelector("#lessonTeks");
const lessonStage = document.querySelector("#lessonStage");
const lessonContent = document.querySelector("#lessonContent");
const lessonAnswerArea = document.querySelector("#lessonAnswerArea");
const lessonAnswer = document.querySelector("#lessonAnswer");
const submitLessonAnswer = document.querySelector("#submitLessonAnswer");
const lessonFeedback = document.querySelector("#lessonFeedback");
const nextLessonStep = document.querySelector("#nextLessonStep");
const lessonHelp = document.querySelector("#lessonHelp");
const lessonStuckBtn = document.querySelector("#lessonStuckBtn");
const lessonExplainBtn = document.querySelector("#lessonExplainBtn");
const lessonSimilarBtn = document.querySelector("#lessonSimilarBtn");
const lessonProgressBar = document.querySelector("#lessonProgressBar");
const lessonPath = document.querySelector("#lessonPath");
const lessonGoal = document.querySelector("#lessonGoal");

let lessonModule = null;
let stageIndex = 0;
let currentStageType = null;
let stageItems = [];
let currentItemIndex = 0;
let workedExampleIndex = 0;
let hintLevel = 0;
let activeSimilarItem = null;
let activeSimilarUsageKey = null;
let masteryResults = [];
let masterySummary = null;
let missedMasteryItems = [];
let recheckItems = [];
let recheckResults = [];
let recheckUsageKeys = new Map();
let lessonLocked = false;
let isSubscriber = false;
let completionReport = null;
let completionSavePromise = null;
let trialHeartbeatTimer = null;

const countedLessonInteractions = new Set();
const itemRecords = new Map();
const lessonStartedAt = Date.now();

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

function currentFlowStage() {
  return lessonModule?.lesson_flow?.[stageIndex] || null;
}

function findStageIndex(type) {
  return lessonModule.lesson_flow.findIndex(stage => stage.type === type);
}

function updateLessonPath() {
  if (!lessonPath || !lessonModule) return;

  lessonPath.innerHTML = lessonModule.lesson_flow
    .map((stage, index) => {
      const state = index < stageIndex
        ? "complete"
        : index === stageIndex
          ? "current"
          : "upcoming";
      const current = index === stageIndex ? ' aria-current="step"' : "";

      return `
        <li class="lesson-path-${state}"${current}>
          <span>${index < stageIndex ? "✓" : stage.step}</span>
          ${escapeHtml(stage.label)}
        </li>
      `;
    })
    .join("");
}

function updateProgress() {
  if (!lessonModule) return;

  const stageCount = lessonModule.lesson_flow.length;
  let withinStage = 0;

  if (stageItems.length > 0) {
    withinStage = currentItemIndex / stageItems.length;
  } else if (currentStageType === "worked_examples") {
    const worked = lessonModule.items.filter(item => item.type === "worked_example");
    withinStage = worked.length ? workedExampleIndex / worked.length : 0;
  }

  const percent = Math.max(
    2,
    Math.min(100, Math.round(((stageIndex + withinStage) / stageCount) * 100))
  );

  lessonProgressBar.style.width = `${percent}%`;
  lessonProgressBar.setAttribute("aria-valuenow", String(percent));
  updateLessonPath();
}

function showInterface({ answer = false, help = false, next = false } = {}) {
  lessonAnswerArea.style.display = answer ? "block" : "none";
  lessonHelp.style.display = help ? "flex" : "none";
  nextLessonStep.style.display = next ? "inline-block" : "none";
}

function setFeedback(html = "") {
  lessonFeedback.innerHTML = html;
}

function showFatalLessonError(message) {
  lessonStage.textContent = "Lesson unavailable";
  lessonContent.innerHTML = `
    <div class="lesson-state lesson-state-error">
      <h2>We could not open this lesson</h2>
      <p>${escapeHtml(message)}</p>
      <a class="lesson-link-button" href="/">Return to Dashboard</a>
    </div>
  `;
  showInterface();
}

async function getLessonSession() {
  if (!supabaseClient) return null;

  let {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    const { data: refreshData } = await supabaseClient.auth.refreshSession();
    session = refreshData?.session || null;
  }

  return session;
}

async function fetchWithLessonSession(url, options = {}) {
  let session = await getLessonSession();
  if (!session) return { response: null, session: null };

  const request = activeSession => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${activeSession.access_token}`
    }
  });

  let response = await request(session);

  if (response.status === 401) {
    const { data, error } = await supabaseClient.auth.refreshSession();
    const refreshedSession = error ? null : data?.session;

    if (refreshedSession) {
      session = refreshedSession;
      response = await request(session);
    }
  }

  return { response, session };
}

function showLessonUpgrade(message) {
  lessonLocked = true;
  setFeedback(`
    <div class="lesson-state lesson-state-warning">
      <strong>Upgrade to continue</strong>
      <p>${escapeHtml(message)}</p>
      <a class="lesson-link-button" href="/#pricingSection">View Tolux Plans</a>
    </div>
  `);

  lessonAnswer.disabled = true;
  submitLessonAnswer.disabled = true;
  lessonStuckBtn.disabled = true;
  lessonExplainBtn.disabled = true;
  lessonSimilarBtn.disabled = true;
  nextLessonStep.style.display = "none";
}

async function ensureLessonAccess(item, interactionKey = item?.id) {
  if (!item || lessonLocked) return false;

  const key = interactionKey || item.id || item.prompt;

  if (countedLessonInteractions.has(key)) {
    return true;
  }

  try {
    const { response, session } = await fetchWithLessonSession(
      "/api/lesson-usage",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id
        })
      }
    );

    if (!session || !response) {
      setFeedback(`
        <div class="lesson-state lesson-state-warning">
          <strong>Sign in required</strong>
          <p>Please return to the dashboard and sign in before checking this answer.</p>
          <a class="lesson-link-button" href="/">Go to Sign In</a>
        </div>
      `);
      return false;
    }

    const data = await response.json();

    if (response.ok && data.allowed) {
      countedLessonInteractions.add(key);
      isSubscriber = Boolean(data.isSubscriber);
      return true;
    }

    if (data.limitReached) {
      showLessonUpgrade(
        data.error || "You've completed your 10 free learning interactions."
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
    console.error("Lesson access check failed:", error);
    setFeedback(`
      <div class="lesson-state lesson-state-error">
        <strong>Connection problem</strong>
        <p>Please check your connection and try again.</p>
      </div>
    `);
  }

  return false;
}

async function sendTrialHeartbeat() {
  if (
    lessonLocked ||
    isSubscriber ||
    document.visibilityState !== "visible" ||
    currentStageType === "prerequisite_diagnostic"
  ) {
    return;
  }

  try {
    const { response } = await fetchWithLessonSession(
      "/api/lesson-trial-heartbeat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSeconds: 15 })
      }
    );
    if (!response) return;
    const data = await response.json();
    if (data.limitReached) {
      showLessonUpgrade(
        data.error || "You've completed your 10-minute free learning trial."
      );
    }
  } catch (error) {
    console.error("Lesson trial heartbeat failed:", error);
  }
}

if (typeof window.setInterval === "function") {
  trialHeartbeatTimer = window.setInterval(sendTrialHeartbeat, 15000);
  window.addEventListener("pagehide", () => {
    if (trialHeartbeatTimer) window.clearInterval(trialHeartbeatTimer);
  });
}

function renderSolutionSteps(item, heading = "Step-by-step solution") {
  if (!Array.isArray(item.solution_steps) || item.solution_steps.length === 0) {
    return "";
  }

  const steps = item.solution_steps
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
    <div class="solution-panel">
      <h3>${escapeHtml(heading)}</h3>
      <ol class="solution-steps">${steps}</ol>
    </div>
  `;
}

function stageHeading(type) {
  const labels = {
    diagnostic: "Quick Readiness Check",
    guided_practice: "Solve with Tolux",
    independent_practice: "Your Turn",
    mastery_check: "Mastery Check",
    recheck: "Remediation Recheck"
  };

  return labels[type] || "Lesson Question";
}

function getCurrentItem() {
  return activeSimilarItem || stageItems[currentItemIndex] || null;
}

function currentUsageKey(item) {
  if (activeSimilarItem) return activeSimilarUsageKey || item.id;
  if (currentStageType === "recheck") {
    return recheckUsageKeys.get(item.id) || item.id;
  }
  return item.id;
}

function renderCurrentQuestion() {
  const item = getCurrentItem();

  if (!item) {
    advanceAfterQuestionStage();
    return;
  }

  hintLevel = 0;
  const isSimilar = Boolean(activeSimilarItem);
  const isMastery = currentStageType === "mastery_check" && !isSimilar;
  const heading = isSimilar ? "Similar Problem" : stageHeading(currentStageType);
  const counter = isSimilar
    ? "Practice the same skill"
    : `${currentItemIndex + 1} of ${stageItems.length}`;

  lessonStage.textContent = `${heading} • ${counter}`;
  lessonContent.innerHTML = `
    <div class="question-header">
      <span class="difficulty-badge">${escapeHtml(item.difficulty || "Practice")}</span>
      <span>${escapeHtml(item.id || "")}</span>
    </div>
    <h2>${escapeHtml(heading)}</h2>
    <div class="math-prompt">${escapeHtml(item.prompt)}</div>
    ${item.explanation_prompt ? `
      <div class="explanation-field">
        <label for="lessonExplanation">
          <strong>${escapeHtml(item.explanation_prompt)}</strong>
        </label>
        ${item.explanation_guidance ? `
          <p class="explanation-guidance">
            ${escapeHtml(item.explanation_guidance)}
          </p>
        ` : ""}
        <textarea
          id="lessonExplanation"
          rows="4"
          placeholder="Explain your reasoning in your own words"
        ></textarea>
      </div>
    ` : ""}
    ${isMastery ? `
      <p class="mastery-note">
        Work independently. Tolux will review all five responses together.
      </p>
    ` : ""}
  `;

  lessonAnswer.value = "";
  lessonAnswer.placeholder = item.answer_placeholder || "Type your answer here";
  showInterface({ answer: true, help: !isMastery, next: false });
  lessonAnswer.disabled = false;
  submitLessonAnswer.disabled = false;
  lessonStuckBtn.disabled = false;
  lessonExplainBtn.disabled = false;
  lessonSimilarBtn.disabled = false;
  setFeedback(
    isSimilar
      ? "<strong>Practice the same skill.</strong> Solve this problem, then Tolux will return you to the original question."
      : ""
  );
  updateProgress();
  lessonAnswer.focus();
}

function startQuestionStage(type, items) {
  currentStageType = type;
  stageItems = items || selectStageItems(lessonModule, type);
  currentItemIndex = 0;
  activeSimilarItem = null;
  activeSimilarUsageKey = null;

  if (stageItems.length === 0) {
    advanceStage();
    return;
  }

  renderCurrentQuestion();
}

function renderConceptStage() {
  currentStageType = "concept";
  stageItems = [];
  const cards = lessonModule.concept_cards
    .map(card => `
      <article class="concept-card">
        <span>${escapeHtml(card.id)}</span>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.content)}</p>
      </article>
    `)
    .join("");

  lessonStage.textContent = "2. Learn the Concept";
  lessonContent.innerHTML = `
    <h2>Learn the ideas before using the steps</h2>
    <p class="lesson-intro">
      Read each card carefully. The equations are shown directly so you can
      connect every explanation to the mathematics.
    </p>
    <div class="concept-grid">${cards}</div>
    <button id="continueLessonBtn" class="lesson-primary-button" type="button">
      Continue to Worked Examples →
    </button>
  `;
  showInterface();
  setFeedback();
  updateProgress();
  document.querySelector("#continueLessonBtn")
    .addEventListener("click", advanceStage);
}

function renderWorkedExample() {
  const workedItems = lessonModule.items.filter(
    item => item.type === "worked_example"
  );
  const item = workedItems[workedExampleIndex];

  if (!item) {
    advanceStage();
    return;
  }

  currentStageType = "worked_examples";
  stageItems = [];
  const isLast = workedExampleIndex === workedItems.length - 1;

  lessonStage.textContent =
    `3. Worked Examples • ${workedExampleIndex + 1} of ${workedItems.length}`;
  lessonContent.innerHTML = `
    <div class="question-header">
      <span class="difficulty-badge">${escapeHtml(item.difficulty)}</span>
      <span>${escapeHtml(item.id)}</span>
    </div>
    <h2>Watch Tolux solve one step at a time</h2>
    <div class="math-prompt">${escapeHtml(item.prompt)}</div>
    ${renderSolutionSteps(item)}
    <button id="workedNextBtn" class="lesson-primary-button" type="button">
      ${isLast ? "Continue to Guided Practice →" : "Next Worked Example →"}
    </button>
  `;
  showInterface();
  setFeedback();
  updateProgress();

  document.querySelector("#workedNextBtn").addEventListener("click", () => {
    workedExampleIndex += 1;
    if (workedExampleIndex >= workedItems.length) advanceStage();
    else renderWorkedExample();
  });
}

function renderCompletion() {
  currentStageType = "complete";
  stageItems = [];
  lessonStage.textContent = "Lesson Complete";
  lessonProgressBar.style.width = "100%";
  lessonProgressBar.setAttribute("aria-valuenow", "100");
  stageIndex = lessonModule.lesson_flow.length;
  updateLessonPath();

  lessonContent.innerHTML = `
    <div class="lesson-complete">
      <div class="completion-mark" aria-hidden="true">✓</div>
      <h2>${escapeHtml(masterySummary.label)}</h2>
      <p class="mastery-score">${masterySummary.scorePercent}%</p>
      <p>
        You answered ${masterySummary.correctCount} of
        ${masterySummary.total} mastery questions correctly.
      </p>
      <p>
        You completed TEKS ${escapeHtml(lessonModule.teks.join(", "))}:
        ${escapeHtml(lessonModule.title)}.
      </p>
      <p id="completionSaveStatus" class="completion-save-status" role="status">
        Saving your mastery progress…
      </p>
      <button
        id="returnDashboardBtn"
        class="lesson-link-button"
        type="button"
        disabled
      >
        Return to Dashboard
      </button>
    </div>
  `;
  showInterface();
  setFeedback();
  const returnDashboardBtn = document.querySelector("#returnDashboardBtn");
  const completionSaveStatus = document.querySelector("#completionSaveStatus");

  completionSavePromise = saveLessonCompletion()
    .then(() => {
      completionSaveStatus.textContent =
        "Progress saved. Your dashboard and My Progress are up to date.";
    })
    .catch(error => {
      console.warn("Lesson progress will be retried from the dashboard:", error);
      completionSaveStatus.textContent =
        "Saved on this device. Tolux will retry the secure account save on your dashboard.";
    })
    .finally(() => {
      returnDashboardBtn.disabled = false;
    });

  returnDashboardBtn.addEventListener("click", async () => {
    await completionSavePromise;
    window.location.href = "/";
  });
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

function buildLessonCompletionReport() {
  if (completionReport) return completionReport;

  completionReport = {
    completion_id: generateCompletionId(),
    module_id: lessonModule.module_id,
    completed_at: new Date().toISOString(),
    mastery_label: masterySummary.label,
    mastery_score: masterySummary.scorePercent,
    is_subscriber: isSubscriber,
    time_on_skill_seconds: Math.round((Date.now() - lessonStartedAt) / 1000),
    item_records: [...itemRecords.values()]
  };

  return completionReport;
}

async function saveLessonCompletion() {
  const report = buildLessonCompletionReport();
  const moduleKey = `${LESSON_PROGRESS_PREFIX}${lessonModule.module_id}`;
  const pendingKey = `${PENDING_PROGRESS_PREFIX}${report.completion_id}`;

  try {
    localStorage.setItem(moduleKey, JSON.stringify(report));
    localStorage.setItem(pendingKey, JSON.stringify(report));
  } catch (error) {
    console.warn("Lesson completion could not be saved locally:", error);
  }

  const { response, session } = await fetchWithLessonSession(
    "/api/lesson-progress",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(report)
    }
  );
  if (!session || !response) {
    throw new Error("Sign in is required to sync lesson progress.");
  }
  const data = await response.json();

  if (!response.ok || !data.activity) {
    throw new Error(data.error || "Unable to save lesson progress.");
  }

  try {
    localStorage.setItem(moduleKey, JSON.stringify(data.activity));
    localStorage.removeItem(pendingKey);
  } catch (error) {
    console.warn("Saved progress could not be reconciled locally:", error);
  }

  return data.activity;
}

function remediationReviewMarkup() {
  return missedMasteryItems
    .map(item => {
      const route = lessonModule.misconception_routes[item.diagnostic_tag];

      return `
        <article class="remediation-card">
          <span>${escapeHtml(route?.error_code || item.diagnostic_tag)}</span>
          <h3>${escapeHtml(route?.teacher_signal || "Targeted review")}</h3>
          <p><strong>Question:</strong> ${escapeHtml(item.prompt)}</p>
          <p><strong>Correct answer:</strong> ${escapeHtml(item.answer_key)}</p>
          <p>${escapeHtml(item.tutor_behavior)}</p>
        </article>
      `;
    })
    .join("");
}

function prepareRecheckItems() {
  const count = lessonModule.mastery_policy.recheck_after_remediation_items || 2;
  recheckItems = buildRecheckItems(lessonModule, missedMasteryItems, count);
  recheckUsageKeys = new Map();

  recheckItems.forEach((item, index) => {
    const missed = missedMasteryItems[index % missedMasteryItems.length];
    recheckUsageKeys.set(item.id, missed.id);
  });
}

function renderRemediationStage() {
  currentStageType = "remediation";
  stageItems = [];
  prepareRecheckItems();
  lessonStage.textContent = "7. Next Best Step • Targeted Remediation";
  lessonContent.innerHTML = `
    <h2>Let’s repair the exact skills that caused difficulty</h2>
    <p class="lesson-intro">
      Your mastery score was ${masterySummary.scorePercent}%. Review the items
      below, then complete a ${recheckItems.length}-question recheck before
      trying mastery again.
    </p>
    <div class="remediation-grid">${remediationReviewMarkup()}</div>
    <button id="startRecheckBtn" class="lesson-primary-button" type="button">
      Start Targeted Recheck →
    </button>
  `;
  showInterface();
  setFeedback();
  updateProgress();
  document.querySelector("#startRecheckBtn").addEventListener("click", () => {
    recheckResults = [];
    startQuestionStage("recheck", recheckItems);
  });
}

function renderRemediationOutcome() {
  const allCorrect =
    recheckResults.length === recheckItems.length &&
    recheckResults.every(result => result.correct);

  currentStageType = "remediation_outcome";
  stageItems = [];
  lessonStage.textContent = "7. Next Best Step • Recheck Complete";

  if (allCorrect) {
    lessonContent.innerHTML = `
      <div class="lesson-state lesson-state-success">
        <h2>Targeted remediation complete</h2>
        <p>You corrected the prerequisite skills. Now retake the five-question mastery check.</p>
        <button id="retakeMasteryBtn" class="lesson-primary-button" type="button">
          Retake Mastery Check →
        </button>
      </div>
    `;
    document.querySelector("#retakeMasteryBtn").addEventListener("click", () => {
      masteryResults = [];
      masterySummary = null;
      missedMasteryItems = [];
      stageIndex = findStageIndex("mastery_check");
      renderStage();
    });
  } else {
    lessonContent.innerHTML = `
      <div class="lesson-state lesson-state-warning">
        <h2>More focused practice is needed</h2>
        <p>Review the targeted explanation once more, then try the recheck again.</p>
        <button id="retryRemediationBtn" class="lesson-primary-button" type="button">
          Review and Try Again →
        </button>
      </div>
    `;
    document.querySelector("#retryRemediationBtn")
      .addEventListener("click", renderRemediationStage);
  }

  showInterface();
  setFeedback();
  updateProgress();
}

function renderFinalStage() {
  if (masterySummary?.mastered) renderCompletion();
  else renderRemediationStage();
}

function renderStage() {
  const stage = currentFlowStage();

  if (!stage) {
    showFatalLessonError("The lesson path is incomplete.");
    return;
  }

  activeSimilarItem = null;
  activeSimilarUsageKey = null;
  hintLevel = 0;
  workedExampleIndex = 0;

  switch (stage.type) {
    case "prerequisite_diagnostic":
      startQuestionStage("diagnostic", selectStageItems(lessonModule, "diagnostic"));
      break;
    case "concept":
      renderConceptStage();
      break;
    case "worked_examples":
      renderWorkedExample();
      break;
    case "guided_practice":
      startQuestionStage(
        "guided_practice",
        selectStageItems(lessonModule, "guided_practice")
      );
      break;
    case "independent_practice":
      startQuestionStage(
        "independent_practice",
        selectStageItems(lessonModule, "independent_practice")
      );
      break;
    case "mastery_check":
      masteryResults = [];
      startQuestionStage(
        "mastery_check",
        selectStageItems(lessonModule, "mastery_check")
      );
      break;
    case "remediation_or_complete":
      renderFinalStage();
      break;
    default:
      showFatalLessonError(`Unsupported lesson stage: ${stage.type}.`);
  }
}

function advanceStage() {
  stageIndex += 1;
  renderStage();
}

function advanceAfterQuestionStage() {
  if (currentStageType === "mastery_check") {
    finalizeMastery();
    return;
  }

  if (currentStageType === "recheck") {
    renderRemediationOutcome();
    return;
  }

  advanceStage();
}

function advanceQuestion() {
  currentItemIndex += 1;

  if (currentItemIndex >= stageItems.length) {
    advanceAfterQuestionStage();
  } else {
    renderCurrentQuestion();
  }
}

function finalizeMastery() {
  masterySummary = calculateMastery(
    masteryResults,
    lessonModule.mastery_policy
  );
  missedMasteryItems = masteryResults
    .filter(result => !result.correct)
    .map(result => result.item);
  stageIndex = findStageIndex("remediation_or_complete");
  renderStage();
}

async function checkCurrentAnswer() {
  const item = getCurrentItem();
  if (!item || lessonLocked) return;

  const studentAnswer = lessonAnswer.value.trim();
  const explanation = document.querySelector("#lessonExplanation")?.value.trim() || "";

  if (!studentAnswer) {
    setFeedback("Enter an answer before checking your work.");
    return;
  }

  if (item.explanation_prompt && !explanation) {
    setFeedback("Add your explanation before checking this mastery response.");
    return;
  }

  const allowed = await ensureLessonAccess(item, currentUsageKey(item));
  if (!allowed) return;

  const answerCorrect = answersEquivalent(studentAnswer, item);
  const explanationCorrect = explanationSatisfies(explanation, item);
  const correct = answerCorrect && explanationCorrect;
  recordAttempt(item, correct);

  if (activeSimilarItem) {
    if (!correct) {
      setFeedback(`
        <strong>Not quite yet.</strong>
        <p>${escapeHtml(item.tutor_behavior)}</p>
        <p>Try the similar problem again.</p>
      `);
      return;
    }

    activeSimilarItem = null;
    activeSimilarUsageKey = null;
    renderCurrentQuestion();
    setFeedback(`
      <strong>Correct.</strong>
      <p>You solved the similar problem. Now return to the original lesson question.</p>
    `);
    return;
  }

  if (currentStageType === "mastery_check") {
    masteryResults.push({
      item,
      correct,
      answerCorrect,
      explanationCorrect,
      studentAnswer,
      explanation
    });
    lessonAnswer.disabled = true;
    submitLessonAnswer.disabled = true;
    const explanationField = document.querySelector("#lessonExplanation");
    if (explanationField) explanationField.disabled = true;
    nextLessonStep.textContent =
      currentItemIndex === stageItems.length - 1
        ? "Review Mastery Results"
        : "Next Mastery Question";
    showInterface({ answer: true, help: false, next: true });
    setFeedback(`
      <strong>Response recorded.</strong>
      <p>Tolux will score all five questions together at the end.</p>
    `);
    return;
  }

  if (currentStageType === "recheck") {
    recheckResults.push({
      item,
      correct,
      answerCorrect,
      explanationCorrect,
      studentAnswer,
      explanation
    });
    lessonAnswer.disabled = true;
    submitLessonAnswer.disabled = true;
    const explanationField = document.querySelector("#lessonExplanation");
    if (explanationField) explanationField.disabled = true;
    nextLessonStep.textContent =
      currentItemIndex === stageItems.length - 1
        ? "View Recheck Result"
        : "Next Recheck Question";
    showInterface({ answer: true, help: true, next: true });
    if (correct) {
      setFeedback(
        `<strong>Correct.</strong>${renderSolutionSteps(item, "Why it works")}`
      );
    } else if (answerCorrect && !explanationCorrect) {
      setFeedback(`
        <strong>Your solution-set answer is correct.</strong>
        <p>Your explanation needs one more mathematical step.</p>
        <p>${escapeHtml(
          item.explanation_guidance ||
          "Explain why the equation has that solution set."
        )}</p>
        ${renderSolutionSteps(item, "Review the reasoning")}
      `);
    } else if (!answerCorrect && explanationCorrect) {
      setFeedback(`
        <strong>Your explanation shows the right idea.</strong>
        <p>Revise the solution-set answer. The expected result is <span class="inline-math">${escapeHtml(item.answer_key)}</span>.</p>
        ${renderSolutionSteps(item, "Review the answer")}
      `);
    } else {
      setFeedback(`
        <strong>The answer and explanation both need revision.</strong>
        <p>The expected solution-set answer is <span class="inline-math">${escapeHtml(item.answer_key)}</span>.</p>
        ${item.explanation_guidance ? `<p>${escapeHtml(item.explanation_guidance)}</p>` : ""}
        ${renderSolutionSteps(item, "Review the steps")}
      `);
    }
    return;
  }

  if (correct) {
    lessonAnswer.disabled = true;
    submitLessonAnswer.disabled = true;
    nextLessonStep.textContent =
      currentItemIndex === stageItems.length - 1 ? "Continue" : "Next Question";
    showInterface({ answer: true, help: true, next: true });
    setFeedback(`
      <strong>Correct.</strong>
      ${renderSolutionSteps(item, "See the complete reasoning")}
    `);
  } else {
    setFeedback(`
      <strong>Not quite yet.</strong>
      <p>${escapeHtml(item.tutor_behavior)}</p>
      <p>Try the problem again, or use one of the help buttons.</p>
    `);
  }
}

function canonicalHintTag(item) {
  const aliases = {
    distribution_or_division: "distribution",
    distribution_variables_both_sides: "distribution",
    distribution_combine_terms: "distribution",
    sign_distribution: "signed_numbers",
    fraction_coefficient: "fraction_equation",
    mixed_multi_step: "multi_step"
  };

  return aliases[item.diagnostic_tag] || item.diagnostic_tag || "";
}

function distributionDetails(prompt) {
  const match = prompt.match(
    /(-?\d+)\s*\(\s*(-?\d*)x\s*([+-])\s*(\d+)\s*\)/i
  );
  if (!match) return null;

  const outside = Number(match[1]);
  const coefficientText = match[2];
  const coefficient = coefficientText === ""
    ? 1
    : coefficientText === "-"
      ? -1
      : Number(coefficientText);
  const signedConstant = match[3] === "+"
    ? Number(match[4])
    : -Number(match[4]);

  return { outside, coefficient, signedConstant };
}

function getProgressiveHint(item, level) {
  const tag = canonicalHintTag(item);
  const details = distributionDetails(item.prompt || "");
  const distributionHints = details
    ? [
        `${details.outside} outside the parentheses must multiply every term inside.`,
        `Multiply ${details.outside} by the x-term, then by ${details.signedConstant}.`,
        "Write both products before combining or isolating the variable."
      ]
    : [
        "The factor outside the parentheses must multiply every term inside.",
        "Write the two products separately.",
        "Combine the distributed terms before solving."
      ];
  const hints = {
    distribution: distributionHints,
    combine_like_terms: [
      "Look for terms with exactly the same variable part.",
      "Group x-terms together and constants together.",
      "Combine the coefficients of the like terms."
    ],
    inverse_operations: [
      "Identify the operation closest to the variable.",
      "Undo operations in reverse order on both sides.",
      "Keep both sides balanced until the variable is isolated."
    ],
    signed_numbers: [
      "Slow down at every negative sign.",
      "Distribute a negative factor to every term.",
      "Check each signed-number operation before continuing."
    ],
    variables_both_sides: [
      "Collect the variable terms on one side first.",
      "Use the same operation on both sides to move a variable term.",
      "Then collect constants and isolate the variable."
    ],
    special_case_identity: [
      "Simplify both sides completely.",
      "Notice what remains after the variable terms cancel.",
      "A true statement means every value of x works."
    ],
    special_case_contradiction: [
      "Simplify both sides completely.",
      "Notice what remains after the variable terms cancel.",
      "A false statement means no value of x works."
    ],
    fraction_equation: [
      "Find the least common denominator.",
      "Multiply every term by it to clear the fractions.",
      "Solve the resulting linear equation and verify."
    ],
    multi_step: [
      "Simplify each side before moving terms.",
      "Distribute, then combine like terms.",
      "Collect variable terms, collect constants, then divide."
    ],
    application_modeling: [
      "Define a variable for the unknown quantity.",
      "Write fixed cost + rate × quantity = total.",
      "Solve the equation and include the correct unit."
    ]
  };
  const options = hints[tag] || [
    "Identify the first mathematical step you can justify.",
    item.tutor_behavior || "Work one step at a time.",
    "Write only the next valid step instead of jumping to the answer."
  ];

  return options[Math.min(level, options.length - 1)];
}

function alternateExplanation(item) {
  const tag = canonicalHintTag(item);
  const details = distributionDetails(item.prompt || "");

  if (tag === "distribution" && details) {
    const xProduct = details.outside * details.coefficient;
    const constantProduct = details.outside * details.signedConstant;
    const constantText = constantProduct >= 0
      ? `+ ${constantProduct}`
      : `- ${Math.abs(constantProduct)}`;

    return `
      <strong>Another way: separate the products.</strong>
      <div class="math-line">
        (${details.outside} × ${details.coefficient}x) +
        (${details.outside} × ${details.signedConstant})
      </div>
      <div class="math-line">${xProduct}x ${constantText}</div>
      <p>The outside factor is applied to each term separately.</p>
    `;
  }

  const explanations = {
    combine_like_terms: `
      <strong>Another way: sort terms into families.</strong>
      <p>Only terms with the same variable part belong to the same family.</p>
    `,
    inverse_operations: `
      <strong>Another way: picture a balance scale.</strong>
      <p>Every move must preserve equality, so do the same operation to both sides.</p>
    `,
    variables_both_sides: `
      <strong>Another way: organize before isolating.</strong>
      <p>Move variable terms to one side and constants to the other, then simplify.</p>
    `,
    fraction_equation: `
      <strong>Another way: remove the fractions first.</strong>
      <p>Multiply every term by the least common denominator, then solve normally.</p>
    `,
    special_case_identity: `
      <strong>Another way: test the structure.</strong>
      <p>If both sides simplify to the same expression, the equation is true for every x.</p>
    `,
    special_case_contradiction: `
      <strong>Another way: test the structure.</strong>
      <p>If the variables cancel and leave a false statement, no x can satisfy the equation.</p>
    `
  };

  return explanations[tag] || `
    <strong>Another way to think about it</strong>
    <p>${escapeHtml(item.tutor_behavior)}</p>
    <p>Focus on why the next mathematical step preserves equality.</p>
  `;
}

function generateDistributionProblem() {
  const outside = Math.floor(Math.random() * 8) + 2;
  const coefficient = Math.floor(Math.random() * 6) + 1;
  const constant = Math.floor(Math.random() * 9) + 1;
  const sign = Math.random() < 0.5 ? 1 : -1;
  const answerCoefficient = outside * coefficient;
  const answerConstant = outside * constant * sign;
  const constantPrompt = sign > 0 ? `+ ${constant}` : `- ${constant}`;
  const answer = answerConstant >= 0
    ? `${answerCoefficient}x + ${answerConstant}`
    : `${answerCoefficient}x - ${Math.abs(answerConstant)}`;

  return {
    id: `generated-distribution-${Date.now()}`,
    type: "generated",
    diagnostic_tag: "distribution",
    difficulty: "Foundational",
    prompt: `Simplify ${outside}(${coefficient}x ${constantPrompt}).`,
    answer_key: answer,
    tutor_behavior: "Distribute the outside factor to every term."
  };
}

function generateCombineLikeTermsProblem() {
  const firstCoefficient = Math.floor(Math.random() * 8) + 2;
  const secondCoefficient = Math.floor(Math.random() * 8) + 2;
  const firstConstant = Math.floor(Math.random() * 9) + 1;
  const secondConstant = Math.floor(Math.random() * 9) + 1;
  const answerCoefficient = firstCoefficient + secondCoefficient;
  const answerConstant = firstConstant - secondConstant;
  const answer = answerConstant >= 0
    ? `${answerCoefficient}x + ${answerConstant}`
    : `${answerCoefficient}x - ${Math.abs(answerConstant)}`;

  return {
    id: `generated-like-terms-${Date.now()}`,
    type: "generated",
    diagnostic_tag: "combine_like_terms",
    difficulty: "Foundational",
    prompt:
      `Simplify ${firstCoefficient}x + ${firstConstant} + ` +
      `${secondCoefficient}x - ${secondConstant}.`,
    answer_key: answer,
    tutor_behavior: "Combine the x-terms, then combine the constants."
  };
}

function taskType(item) {
  const prompt = (item.prompt || "").toLowerCase();
  if (item.diagnostic_tag?.startsWith("special_case")) return "special-case";
  if (prompt.startsWith("simplify")) return "simplify";
  if (prompt.startsWith("solve")) return "solve";
  if (prompt.startsWith("write") || prompt.startsWith("create")) return "model";
  return "other";
}

function findSimilarProblem(item) {
  const tag = canonicalHintTag(item);
  if (tag === "distribution" && taskType(item) === "simplify") {
    return generateDistributionProblem();
  }
  if (tag === "combine_like_terms" && taskType(item) === "simplify") {
    return generateCombineLikeTermsProblem();
  }

  const type = taskType(item);
  let candidates = lessonModule.items.filter(candidate =>
    candidate.id !== item.id &&
    canonicalHintTag(candidate) === tag &&
    taskType(candidate) === type &&
    candidate.difficulty === item.difficulty
  );

  if (candidates.length === 0) {
    candidates = lessonModule.items.filter(candidate =>
      candidate.id !== item.id &&
      canonicalHintTag(candidate) === tag &&
      taskType(candidate) === type
    );
  }

  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : null;
}

async function loadLesson() {
  try {
    const requestedModule =
      new URLSearchParams(window.location.search).get("module") ||
      "alg1-a5a-linear-equations";
    const modulePath = LESSON_MODULE_PATHS[requestedModule];

    if (!modulePath) throw new Error("That lesson module is not available.");

    const response = await fetch(modulePath);
    if (!response.ok) {
      throw new Error(`Lesson data could not be loaded (${response.status}).`);
    }

    const module = await response.json();
    const validationErrors = validateLessonModule(module);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0]);
    }

    lessonModule = module;
    lessonTitle.textContent = lessonModule.title;
    lessonTeks.textContent =
      `${lessonModule.course} • TEKS ${lessonModule.teks.join(", ")}`;
    lessonGoal.textContent = `Master TEKS ${lessonModule.teks.join(", ")}`;
    stageIndex = 0;
    renderStage();
  } catch (error) {
    console.error("Lesson failed to load:", error);
    showFatalLessonError(error.message || "Please return to the dashboard and try again.");
  }
}

submitLessonAnswer.addEventListener("click", checkCurrentAnswer);

lessonAnswer.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkCurrentAnswer();
  }
});

nextLessonStep.addEventListener("click", advanceQuestion);

lessonStuckBtn.addEventListener("click", async () => {
  const item = getCurrentItem();
  if (!item) return;

  const allowed = await ensureLessonAccess(item, currentUsageKey(item));
  if (!allowed) return;

  const record = getItemRecord(item);
  record.hint_count += 1;
  const hint = getProgressiveHint(item, hintLevel);
  setFeedback(`
    <strong>Hint ${Math.min(hintLevel + 1, 3)}</strong>
    <p>${escapeHtml(hint)}</p>
  `);
  hintLevel += 1;
});

lessonExplainBtn.addEventListener("click", async () => {
  const item = getCurrentItem();
  if (!item) return;

  const allowed = await ensureLessonAccess(item, currentUsageKey(item));
  if (!allowed) return;
  setFeedback(alternateExplanation(item));
});

lessonSimilarBtn.addEventListener("click", async () => {
  const item = getCurrentItem();
  if (!item || activeSimilarItem) return;

  const similar = findSimilarProblem(item);
  if (!similar) {
    setFeedback(`
      <strong>Similar Problem</strong>
      <p>Tolux does not yet have another stored problem for this exact skill.</p>
    `);
    return;
  }

  const usageKey = currentUsageKey(item);
  const allowed = await ensureLessonAccess(item, usageKey);
  if (!allowed) return;

  activeSimilarUsageKey = usageKey;
  activeSimilarItem = similar;
  renderCurrentQuestion();
});

loadLesson();
