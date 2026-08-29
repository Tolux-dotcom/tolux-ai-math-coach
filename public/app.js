

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";
let dashboardProgressActivities = [];
let dashboardProgressSource = "empty";
let progressRefreshSequence = 0;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// Tolux Algebra 1 A.5A curriculum module
let a5aModule = null;
let algebra1Catalog = null;
let algebra1Modules = [];

function renderAlgebra1Coverage() {
  const coverage = document.querySelector("#algebra1Coverage");
  if (!coverage || !algebra1Catalog) return;

  const liveModules = algebra1Modules.filter(
    module => module.status === "available"
  );
  coverage.innerHTML = `
    <span class="coverage-badge">49 of 49 TEKS mapped</span>
    <span><strong>${liveModules.length} live skill modules</strong> • full course build-out tracked across ${algebra1Catalog.units.length} units</span>
  `;
}

function renderPracticeControls() {
  const skillSelect = document.querySelector("#practiceSkillSelect");
  const difficultySelect = document.querySelector("#practiceDifficultySelect");
  const availability = document.querySelector("#practiceAvailability");
  const startButton = document.querySelector("#startPracticeBtn");
  if (!skillSelect || !difficultySelect || !algebra1Catalog) return;

  const modules = algebra1Modules.filter(module =>
    module.available_modes?.includes("practice")
  );
  skillSelect.replaceChildren();
  for (const module of modules) {
    const option = document.createElement("option");
    option.value = module.teks[0];
    option.textContent = `${module.teks[0]} • ${module.title}`;
    skillSelect.append(option);
  }

  difficultySelect.replaceChildren();
  for (const difficulty of algebra1Catalog.practice_difficulties || []) {
    const option = document.createElement("option");
    option.value = difficulty.id;
    option.textContent = difficulty.label;
    if (difficulty.id === "grade-level") option.selected = true;
    difficultySelect.append(option);
  }

  if (availability) {
    availability.textContent =
      `${modules.length} live skills: A.5A equations, A.5B inequalities, and A.5C systems.`;
  }
  if (startButton) startButton.disabled = modules.length === 0;
}

function activatePracticeModeFromHash() {
  if (window.location.hash !== "#practiceModePanel") return;
  const practiceButton = document.querySelector(
    '.mode[data-mode="Practice Mode"]'
  );
  if (!practiceButton) return;

  document.querySelectorAll(".mode").forEach(button =>
    button.classList.remove("selected")
  );
  practiceButton.classList.add("selected");
  mode = "Practice Mode";
  refreshLabel();
  refreshA5ALessonPanel();
  document.querySelector("#practiceModePanel")?.scrollIntoView();
}

async function loadAlgebra1Foundation() {
  try {
    const [lessonResponse, catalogResponse] = await Promise.all([
      fetch("/a5a-linear-equations.json"),
      fetch("/algebra1-course.json")
    ]);
    if (!lessonResponse.ok) {
      throw new Error(`A5A module load failed: ${lessonResponse.status}`);
    }
    if (!catalogResponse.ok) {
      throw new Error(`Course catalog load failed: ${catalogResponse.status}`);
    }

    [a5aModule, algebra1Catalog] = await Promise.all([
      lessonResponse.json(),
      catalogResponse.json()
    ]);
    algebra1Modules = algebra1Catalog.units.flatMap(unit => unit.modules || []);
    console.log(
      "Tolux Algebra 1 foundation loaded:",
      `${algebra1Modules.length} standards modules`
    );
    renderAlgebra1Coverage();
    renderPracticeControls();
    refreshA5ALessonPanel();
    renderDashboardProgress(
      dashboardProgressActivities,
      dashboardProgressSource
    );
    activatePracticeModeFromHash();
  } catch (error) {
    console.error("Unable to load Tolux Algebra 1 foundation:", error);
    const coverage = document.querySelector("#algebra1Coverage");
    const availability = document.querySelector("#practiceAvailability");
    if (coverage) coverage.textContent = "Curriculum map is temporarily unavailable.";
    if (availability) availability.textContent = "Practice settings could not be loaded.";
  }
}

loadAlgebra1Foundation();
const startA5ALessonBtn = document.querySelector("#startA5ALessonBtn");
const startPracticeBtn = document.querySelector("#startPracticeBtn");

function startA5ALesson() {
  window.location.href = "/lesson.html?module=alg1-a5a-linear-equations";
}

 

if (startA5ALessonBtn) {
  startA5ALessonBtn.addEventListener("click", startA5ALesson);
}

startPracticeBtn?.addEventListener("click", () => {
  const skill = document.querySelector("#practiceSkillSelect")?.value;
  const difficulty = document.querySelector("#practiceDifficultySelect")?.value;
  const count = document.querySelector("#practiceCountSelect")?.value;
  if (!skill || !difficulty || !count) return;

  const params = new URLSearchParams({ skill, difficulty, count });
  window.location.href = `/practice.html?${params.toString()}`;
});
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const signUpBtn = document.querySelector("#signUpBtn");
const signInBtn = document.querySelector("#signInBtn");
const forgotPasswordBtn = document.querySelector("#forgotPasswordBtn");
const resetPasswordPanel = document.querySelector("#resetPasswordPanel");
const newPassword = document.querySelector("#newPassword");
const confirmNewPassword = document.querySelector("#confirmNewPassword");
const updatePasswordBtn = document.querySelector("#updatePasswordBtn");
const resetPasswordMessage = document.querySelector("#resetPasswordMessage");
const signOutBtn = document.querySelector("#signOutBtn");
const authMessage = document.querySelector("#authMessage");
const authPanel = document.querySelector("#authPanel");
const authLoggedOut = document.querySelector("#authLoggedOut");
const authLoggedIn = document.querySelector("#authLoggedIn");
const signedInEmail = document.querySelector("#signedInEmail");
const internalQaPanel = document.querySelector("#internalQaPanel");
const internalQaStatus = document.querySelector("#internalQaStatus");
const startInternalQaBtn = document.querySelector("#startInternalQaBtn");
const endInternalQaBtn = document.querySelector("#endInternalQaBtn");

function hideInternalQaPanel() {
  internalQaPanel.hidden = true;
  internalQaStatus.textContent = "";
  startInternalQaBtn.disabled = false;
  startInternalQaBtn.textContent = "Start Fresh QA Session";
  endInternalQaBtn.hidden = true;
  endInternalQaBtn.disabled = false;
}

function renderInternalQaState(data) {
  internalQaPanel.hidden = false;
  const questionsUsed = Number(data.questionsUsed) || 0;
  const limit = Number(data.limit) || 10;

  if (data.active) {
    internalQaStatus.textContent =
      `Active: ${questionsUsed} of ${limit} simulated interactions used.`;
    startInternalQaBtn.textContent = "Restart QA Session at 0";
    endInternalQaBtn.hidden = false;
  } else {
    internalQaStatus.textContent =
      "Inactive. Normal student usage rules are currently in effect.";
    startInternalQaBtn.textContent = "Start Fresh QA Session";
    endInternalQaBtn.hidden = true;
  }
}

async function refreshInternalQaUI(session) {
  if (!session?.user) {
    hideInternalQaPanel();
    return;
  }

  try {
    const response = await fetch("/api/internal-qa/session", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (!response.ok) {
      hideInternalQaPanel();
      return;
    }

    renderInternalQaState(await response.json());
  } catch (error) {
    console.error("Unable to load internal QA status:", error);
    hideInternalQaPanel();
  }
}

function renderAuthSession(session) {
  if (resetPasswordPanel.style.display === "block") return;

  if (session?.user) {
    authLoggedOut.style.display = "none";
    authLoggedIn.style.display = "block";
    signedInEmail.textContent = session.user.email || "Signed-in student";
    authMessage.textContent = "";
    void refreshInternalQaUI(session);
    void refreshDashboardProgress(session);
    return;
  }

  authLoggedIn.style.display = "none";
  authLoggedOut.style.display = "block";
  signedInEmail.textContent = "";
  hideInternalQaPanel();
  renderDashboardProgress(readLocalLessonActivities(), "local");
}

async function updateInternalQaSession(action) {
  startInternalQaBtn.disabled = true;
  endInternalQaBtn.disabled = true;
  internalQaStatus.textContent =
    action === "start" ? "Starting a fresh QA session…" : "Ending QA session…";

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      hideInternalQaPanel();
      authMessage.textContent = "Please sign in again to manage QA testing.";
      return;
    }

    const response = await fetch("/api/internal-qa/session", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to update the QA session.");
    }

    renderInternalQaState(data);
  } catch (error) {
    internalQaPanel.hidden = false;
    internalQaStatus.textContent = error.message;
  } finally {
    startInternalQaBtn.disabled = false;
    endInternalQaBtn.disabled = false;
  }
}

signUpBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authMessage.textContent = "Please enter your email and password.";
    return;
  }

  authMessage.textContent = "Creating account...";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = "Account created. Please check your email to confirm your account.";
});
signInBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authMessage.textContent = "Please enter your email and password.";
    return;
  }

  authMessage.textContent = "Signing in...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  renderAuthSession(data.session);
});
forgotPasswordBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();

  if (!email) {
    authMessage.textContent = "Please enter your email address first.";
    return;
  }

  authMessage.textContent = "Sending password reset email...";

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: "https://mathcoach.tolux.org"
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent =
    "If an account exists for this email, password reset instructions have been sent.";
});
updatePasswordBtn.addEventListener("click", async () => {
  const password = newPassword.value;
  const confirmPassword = confirmNewPassword.value;

  if (!password || !confirmPassword) {
    resetPasswordMessage.textContent = "Please enter and confirm your new password.";
    return;
  }

  if (password !== confirmPassword) {
    resetPasswordMessage.textContent = "Passwords do not match.";
    return;
  }

  if (password.length < 8) {
    resetPasswordMessage.textContent = "Password must be at least 8 characters.";
    return;
  }

  resetPasswordMessage.textContent = "Updating password...";

  const { error } = await supabaseClient.auth.updateUser({
    password: password
  });

  if (error) {
    resetPasswordMessage.textContent = error.message;
    return;
  }

  resetPasswordMessage.textContent = "Password updated successfully.";
  await supabaseClient.auth.signOut();
  newPassword.value = "";
  confirmNewPassword.value = "";

  setTimeout(() => {
    resetPasswordPanel.style.display = "none";
    authLoggedOut.style.display = "block";
    authMessage.textContent = "Password updated. You can now sign in.";
  }, 1500);
});
signOutBtn.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  renderAuthSession(null);
  authEmail.value = "";
  authPassword.value = "";
  authMessage.textContent = "You have been signed out.";
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    authLoggedOut.style.display = "none";
    authLoggedIn.style.display = "none";
    resetPasswordPanel.style.display = "block";
    resetPasswordMessage.textContent =
      "Enter and confirm your new password.";
    hideInternalQaPanel();
    return;
  }

  renderAuthSession(session);
});
async function refreshAuthUI() {
  if (resetPasswordPanel.style.display === "block") {
    return;
  }

  authPanel.setAttribute("aria-busy", "true");

  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) throw error;
    renderAuthSession(session);
  } catch (error) {
    console.error("Unable to refresh authentication state:", error);
    renderAuthSession(null);
    authMessage.textContent =
      "We could not confirm your sign-in status. Please try again.";
  } finally {
    authPanel.setAttribute("aria-busy", "false");
  }
}

startInternalQaBtn.addEventListener("click", () => {
  void updateInternalQaSession("start");
});

endInternalQaBtn.addEventListener("click", () => {
  void updateInternalQaSession("end");
});

void refreshAuthUI();
window.addEventListener("pageshow", event => {
  if (event.persisted) void refreshAuthUI();

  if (!window.location.hash) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }
});
let course = "Algebra 1";
let mode = "Tutor Mode";
let imageDataUrl = null;
const history = [];
const bookmarks = JSON.parse(localStorage.getItem("toluxBookmarks") || "[]");
const chat = document.querySelector("#chat");
const input = document.querySelector("#input");
const modeLabel = document.querySelector("#modeLabel");
const apiStatus = document.querySelector("#apiStatus");
const previewWrap = document.querySelector("#previewWrap");
const preview = document.querySelector("#preview");
const studyPlanBtn = document.querySelector("#studyPlanBtn");
const dashboardBtn = document.querySelector("#dashboardBtn");
const progressBtn = document.querySelector("#progressBtn");
const historyBtn = document.querySelector("#historyBtn");
const bookmarksBtn = document.querySelector("#bookmarksBtn");
const studentPlanBtn = document.querySelector("#studentPlanBtn");
const familyPlanBtn = document.querySelector("#familyPlanBtn");
async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get("payment");

  if (payment === "cancelled") {
    alert("Payment was cancelled. You have not been charged.");
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (payment !== "success") return;

  const sessionId = params.get("session_id");

  if (!sessionId) {
    alert("We could not verify this payment because the checkout session is missing.");
    return;
  }

  try {
    const response = await fetch(
      `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`
    );

    const data = await response.json();

    if (!response.ok || !data.verified) {
      throw new Error("Payment could not be verified.");
    }

    alert("Payment confirmed! Your Tolux AI Math Coach subscription is active.");

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  } catch (error) {
    console.error(error);
    alert("We could not verify your payment. Please contact Tolux support.");
  }
}

handlePaymentReturn();
async function startCheckout(priceId) {
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ priceId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to start checkout.");
    }

    window.location.href = data.url;
  } catch (error) {
    alert(error.message);
  }
}
studentPlanBtn?.addEventListener("click", () => {
  startCheckout("price_1U7IAuDF1jioApSQbIgJxCnl");
});
familyPlanBtn?.addEventListener("click", () => {
  startCheckout("price_1U7IAuDF1jioApSQbhKRA280");
});

studyPlanBtn?.addEventListener("click", () => {
  const studyPlanSection = document.querySelector("#studyPlanSection");

  if (studyPlanSection) {
    studyPlanSection.style.display = "block";
    studyPlanSection.scrollIntoView({ behavior: "smooth" });
  }
});
const generateStudyPlanBtn = document.querySelector("#generateStudyPlanBtn");

generateStudyPlanBtn?.addEventListener("click", async () => {
  const topics = document.querySelector("#studyTopics")?.value.trim();
  const hours = document.querySelector("#studyHours")?.value;
  const testDate = document.querySelector("#studyTestDate")?.value;
  const goal = document.querySelector("#studyGoal")?.value.trim();

  if (!topics || !hours || !goal) {
    alert("Please enter your topics, study hours, and goal.");
    return;
  }

  const studyPrompt = `Create a personalized ${course} study plan for me.
Topics I need help with: ${topics}.
I can study ${hours} hours per week.
Upcoming test date: ${testDate || "No test date provided"}.
My goal: ${goal}.
Give me a clear weekly study schedule with topics, practice activities, and progress checkpoints.`;

  document.querySelector("#studyPlanSection").style.display = "none";
  await askCoach(studyPrompt);
});
document.querySelectorAll(".course").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".course").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  course = btn.dataset.course;
  refreshLabel();
  refreshA5ALessonPanel();
}));

document.querySelectorAll(".mode").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".mode").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  mode = btn.dataset.mode;
  refreshLabel();
  refreshA5ALessonPanel();
  }));
  function refreshA5ALessonPanel() {
  const lessonPanel = document.querySelector("#a5aLessonPanel");
  const practicePanel = document.querySelector("#practiceModePanel");
  const coachPanel = document.querySelector("#coachPanel");
  if (!lessonPanel) return;

  const shouldShowLesson =
    course === "Algebra 1" &&
    mode === "Tutor Mode" &&
    a5aModule;
  const shouldShowPractice =
    course === "Algebra 1" &&
    mode === "Practice Mode" &&
    algebra1Catalog;

  lessonPanel.style.display = shouldShowLesson ? "block" : "none";
  if (practicePanel) {
    practicePanel.style.display = shouldShowPractice ? "block" : "none";
  }
  if (coachPanel) {
    coachPanel.style.display = shouldShowPractice ? "none" : "block";
  }
}

refreshA5ALessonPanel();


function refreshLabel(){ modeLabel.textContent = `${course} • ${mode}`; }
function normalizeMathText(text){
  if (!text) return "";

  return text.replace(
    /(^|\n)\s*\[\s*([^\]\n]+)\s*\]\s*(?=\n|$)/g,
    (match, start, equation) => `${start}\\[${equation.trim()}\\]`
  );
}


function addMessage(role, text, error=false){
  const el = document.createElement("div");
  el.className = `message ${role}${error ? " error" : ""}`;
  const who = role === "assistant" ? "Tolux Coach" : "You";
  el.innerHTML = `<strong>${who}</strong><p></p>`;
  el.querySelector("p").textContent = normalizeMathText(text);
  chat.appendChild(el);
  if (window.MathJax?.typesetPromise) {
  window.MathJax.typesetPromise([el]).catch(console.error);
}
  chat.scrollTop = chat.scrollHeight;
  if(!error) history.push({role, text});
}

function demoReply(text){
  const t = text.toLowerCase();
  if(t.includes("stuck") || t.includes("hint")) return "Hint: Look at the operation closest to the variable. What inverse operation would undo it? Try only that step first.";
  if(t.includes("another way")) return "Another way: think of an equation like a balanced scale. Whatever you do to one side, you must do to the other so the scale stays balanced.";
  if(t.includes("similar problem")) return "Try this similar problem: 4x + 7 = 31. Solve it one step at a time, and send me your first step.";
  const match = text.match(/(-?\d+)\s*x\s*([+-]\s*\d+)?\s*=\s*(-?\d+)/i);
  if(match){
    const a = Number(match[1]), b = match[2] ? Number(match[2].replace(/\s/g,"")) : 0, c = Number(match[3]);
    const x = (c-b)/a;
    return `Goal: isolate x.\n\nStart with: ${a}x ${b>=0?"+ ":"- "}${Math.abs(b)} = ${c}\n\nStep 1: ${b>=0?"Subtract":"Add"} ${Math.abs(b)} on both sides.\n${a}x = ${c-b}\n\nStep 2: Divide both sides by ${a}.\nx = ${x}\n\nCheck: ${a}(${x}) ${b>=0?"+ ":"- "}${Math.abs(b)} = ${c}.\n\nNow try explaining why Step 1 keeps the equation balanced.`;
  }
  return `Demo Mode is active. I can already demonstrate simple linear-equation tutoring. For full ${course} tutoring, connect the OpenAI API key as described in the README.\n\nYour selected mode is ${mode}.`;
}


async function askCoach(text){

  // Show only the current question and answer
  chat.innerHTML = "";

  // Clear previous graph
  const graphPanel = document.querySelector("#graphPanel");

 

  if (graphBoard) {
    JXG.JSXGraph.freeBoard(graphBoard);
    graphBoard = null;
  }

  if (graphPanel) {
    graphPanel.classList.add("hidden");
  }

  
  addMessage("user", text || (imageDataUrl ? "[Uploaded a math problem image]" : ""));
 if (text) {
  updateDashboardActivity(text);
  saveDashboardActivity(text);
}
 input.value = "";
  const normalizedGraphText = text
  .replace(/³/g, "^3")
  .replace(/⁴/g, "^4")
  .replace(/⁵/g, "^5")
  .replace(/⁶/g, "^6")
  .replace(/⁷/g, "^7")
  .replace(/⁸/g, "^8")
  .replace(/⁹/g, "^9");

const wantsHigherPolynomialGraph =
  /\b(graph|plot|sketch)\b/i.test(normalizedGraphText) &&
  /x\s*\^\s*(?:[3-9]|\d{2,})/i.test(normalizedGraphText);

if (wantsHigherPolynomialGraph) {
  setTimeout(() => {
    showPolynomialGraph(normalizedGraphText);
  }, 300);
} 
  const wantsQuadraticGraph = /\b(graph|plot|sketch)\b/i.test(text);

if (wantsQuadraticGraph) {
  const previousUserMessages = history
    .slice(0, -1)
    .filter(item => item.role === "user")
    .map(item => item.text)
    .reverse();

  const quadraticSource =
  (/x\s*(\^2|²)/i.test(text) ? text : null) ||
  previousUserMessages.find(msg =>
    /x\s*(\^2|²)/i.test(msg)
  );

  if (quadraticSource) {
    const clean = quadraticSource
  .replace(/\s+/g, "")
  .replace(/²/g, "^2")
  .replace(/\*/g, "")
  .replace(/^(graph|plot|sketch)(thequadratic|quadratic|function|equation)?/i, "")
  .replace(/^y=/i, "");

   const match = clean.match(
  /^([+-]?\d*\.?\d*)x\^2(?:([+-]\d*\.?\d*)x)?([+-]\d*\.?\d*)?$/
);
     

    if (match) {
      const toNumber = value => {
        if (value === "" || value === "+") return 1;
        if (value === "-") return -1;
        return Number(value);
      };

      const a = toNumber(match[1]);
     const b = match[2] ? toNumber(match[2]) : 0;
     const c = match[3] ? Number(match[3]) : 0;

      setTimeout(() => {
        showQuadraticGraph(a, b, c);
      }, 300);
    }
  }
}
const linearGraphMatch = text.match(
  /y\s*(<=|>=|<|>|=|≤|≥)\s*([+-]?\d*\.?\d*)\s*\*?\s*x\s*([+-]\s*\d*\.?\d+)?/i
);

if (
  linearGraphMatch &&
  !/x\s*(?:\^|\*\*)\s*\d+/i.test(normalizedGraphText)
) {
  let op = linearGraphMatch[1];
  let slopeText = linearGraphMatch[2];
  let interceptText = linearGraphMatch[3] || "+0";

  if (op === "≤") op = "<=";
  if (op === "≥") op = ">=";

  let m;
  if (slopeText === "" || slopeText === "+") {
    m = 1;
  } else if (slopeText === "-") {
    m = -1;
  } else {
    m = Number(slopeText);
  }

  const b = Number(interceptText.replace(/\s+/g, ""));

  setTimeout(() => {
    showTestGraph(m, b, op);
  }, 300);
}
  const payload = { message:text, course, mode, imageDataUrl, history: history.slice(0,-1) };
  const priorImage = imageDataUrl;
  clearImage();
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.innerHTML = "<strong>Tolux Coach</strong><p>Working through it step by step…</p>";
  chat.appendChild(thinking); chat.scrollTop=chat.scrollHeight;

  try{
   let { data: { session } } = await supabaseClient.auth.getSession();

if (!session) {
  const { data: refreshData } = await supabaseClient.auth.refreshSession();
  session = refreshData?.session || null;
}

if (!session) {
  thinking.remove();
  await refreshAuthUI();
  addMessage("assistant", "Your session has expired. Please sign in again to continue.");
  return;
}
   const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);
const r = await fetch("/api/coach", {method:"POST", headers:{
  "Content-Type":"application/json",
  "Authorization": `Bearer ${session.access_token}`
}, body:JSON.stringify(payload), signal:controller.signal});
    const data = await r.json();
    clearTimeout(timeout);
    thinking.remove();
    if(r.ok && data.reply){
      apiStatus.textContent = "AI Live";
      apiStatus.className = "badge live";
      addMessage("assistant", data.reply);
    } else if (data.limitReached) {
  apiStatus.textContent = "Free Limit Reached";
  apiStatus.className = "badge";
  addMessage(
    "assistant",
    data.error || "You've used your 10 free questions. Please upgrade to continue with Tolux AI Math Coach."
  );
      const upgradeBtn = document.createElement("button");
upgradeBtn.type = "button";
upgradeBtn.textContent = "Upgrade Now";
upgradeBtn.className = "upgrade-btn";

upgradeBtn.addEventListener("click", () => {
  studentPlanBtn?.click();
});

chat.appendChild(upgradeBtn);
chat.scrollTop = chat.scrollHeight;
} else {
      apiStatus.textContent = "Demo Mode";
      apiStatus.className = "badge demo";
      addMessage("assistant", priorImage ? "I can preview your image, but image analysis requires the API key. " + demoReply(text) : demoReply(text));
    }
  }catch(e){
    thinking.remove();
    apiStatus.textContent = "Demo Mode";
    apiStatus.className = "badge demo";
    addMessage("assistant", "IMAGE/API ERROR: " + (e?.message || String(e)), true);
  }
}

document.querySelector("#composer").addEventListener("submit", e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text && !imageDataUrl) return;
  askCoach(text);
});
document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>askCoach(b.dataset.quick)));

document.querySelector("#imageInput").addEventListener("change", e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  if(file.size > 6_000_000){ alert("Please use an image under 6 MB for this prototype."); return; }
  const reader = new FileReader();

reader.onload = () => {
  const img = new Image();

  img.onload = () => {
    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / img.width);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    imageDataUrl = canvas.toDataURL("image/jpeg", 0.78);

    preview.src = imageDataUrl;
    previewWrap.classList.remove("hidden");
  };

  img.src = reader.result;
};

reader.readAsDataURL(file);
});
document.querySelector("#removeImage").addEventListener("click", clearImage);
function clearImage(){
  imageDataUrl=null;
  preview.src="";
  previewWrap.classList.add("hidden");
  document.querySelector("#imageInput").value="";
}

apiStatus.textContent = "Demo / AI Ready";
apiStatus.className = "badge demo";

let graphBoard = null;

function showTestGraph(m = -2, b = 4, operator = ">") {
  const panel = document.querySelector("#graphPanel");
  const equation = document.querySelector("#graphEquation");

  if (!panel || typeof JXG === "undefined") return;

  panel.classList.remove("hidden");

  const symbol =
    operator === ">=" ? "≥" :
    operator === "<=" ? "≤" :
    operator;

  const sign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
equation.textContent = `y ${symbol} ${m}x ${sign}`;

  if (graphBoard) {
    JXG.JSXGraph.freeBoard(graphBoard);
  }

  graphBoard = JXG.JSXGraph.initBoard("graphCanvas", {
    boundingbox: [-5, 7, 7, -5],
    keepAspectRatio: true,
    axis: true,
    showCopyright: false,
    showNavigation: true,
    pan: { enabled: true },
    zoom: { enabled: true }
  });

  const strict = operator === ">" || operator === "<";

  const boundary = graphBoard.create(
    "functiongraph",
    [function (x) { return m * x + b; }],
    {
      dash: strict ? 2 : 0,
      strokeWidth: 3,
      fixed: true
    }
  );

  const shadeAbove = operator === ">" || operator === ">=";

  graphBoard.create(
    "inequality",
    [boundary],
    {
      inverse: shadeAbove,
      fillOpacity: 0.18
    }
  );
}
function showQuadraticGraph(a, b, c) {
  const panel = document.querySelector("#graphPanel");
  const equation = document.querySelector("#graphEquation");

  if (!panel || typeof JXG === "undefined") return;

  panel.classList.remove("hidden");

  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const signC = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
  equation.textContent = `y = ${a}x² ${signB}x ${signC}`;

  if (graphBoard) {
    JXG.JSXGraph.freeBoard(graphBoard);
    graphBoard = null;
  }

  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;

  const xSpan = 6;
  const ySpan = Math.max(6, Math.abs(vertexY) + 4);

  graphBoard = JXG.JSXGraph.initBoard("graphCanvas", {
    boundingbox: [
      vertexX - xSpan,
      ySpan,
      vertexX + xSpan,
      -ySpan
    ],
    keepAspectRatio: false,
    axis: true,
    showCopyright: false,
    showNavigation: true,
    pan: { enabled: true },
    zoom: { enabled: true }
  });

  graphBoard.create(
    "functiongraph",
    [
      function (x) {
        return a * x * x + b * x + c;
      }
    ],
    {
      strokeWidth: 3,
      fixed: true
    }
  );

  graphBoard.create(
    "point",
    [vertexX, vertexY],
    {
      name: "Vertex",
      size: 4,
      fixed: true
    }
  );

  graphBoard.create(
    "line",
    [
      [vertexX, -ySpan],
      [vertexX, ySpan]
    ],
    {
      dash: 2,
      straightFirst: false,
      straightLast: false,
      fixed: true
    }
  );
}
function showPolynomialGraph(expression) {
    const panel = document.querySelector("#graphPanel");
    const equation = document.querySelector("#graphEquation");

    if (!panel || typeof JXG === "undefined") return;

    panel.classList.remove("hidden");

    let clean = expression
        .toLowerCase()
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/⁵/g, "^5")
        .replace(/⁶/g, "^6")
        .replace(/\s+/g, "")
        .replace(/^(graph|plot|sketch)/, "");

    if (clean.includes("=")) {
        clean = clean.split("=").pop();
    }

    clean = clean.replace(/\*/g, "");

    const coefficients = {};

    const terms = clean
        .replace(/-/g, "+-")
        .split("+")
        .filter(Boolean);

    for (const term of terms) {
        if (term.includes("x")) {
            const match = term.match(/^([+-]?(?:\d*\.?\d*))x(?:\^(\d+))?$/);

            if (!match) continue;

            let coefficient;

            if (
                match[1] === "" ||
                match[1] === "+"
            ) {
                coefficient = 1;
            } else if (match[1] === "-") {
                coefficient = -1;
            } else {
                coefficient = Number(match[1]);
            }

            const power = match[2] ? Number(match[2]) : 1;

            coefficients[power] =
                (coefficients[power] || 0) + coefficient;
        } else {
            const constant = Number(term);

            if (!Number.isNaN(constant)) {
                coefficients[0] =
                    (coefficients[0] || 0) + constant;
            }
        }
    }

    function polynomial(x) {
        let y = 0;

        for (const power in coefficients) {
            y += coefficients[power] * Math.pow(x, Number(power));
        }

        return y;
    }

    if (graphBoard) {
        JXG.JSXGraph.freeBoard(graphBoard);
        graphBoard = null;
    }

    graphBoard = JXG.JSXGraph.initBoard("graphCanvas", {
        boundingbox: [-6, 12, 6, -12],
        axis: true,
        keepAspectRatio: false,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true },
        zoom: { enabled: true }
    });

    graphBoard.create(
        "functiongraph",
        [polynomial],
        {
            strokeWidth: 3,
            fixed: true
        }
    );

    if (equation) {
        equation.textContent = "y = " + clean;
    }
}
window.showTestGraph = showTestGraph;
window.showQuadraticGraph = showQuadraticGraph;
window.showPolynomialGraph = showPolynomialGraph;
// Math keyboard buttons
document.querySelectorAll("[data-math]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.math;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value =
      input.value.substring(0, start) +
      value +
      input.value.substring(end);

    const newPosition = start + value.length;
    input.focus();
    input.setSelectionRange(newPosition, newPosition);
  });
});
// Keep lesson completion and mastery visible across devices and sessions.

function moduleTitle(moduleId) {
  const normalizedModuleId = String(moduleId || "").startsWith("practice-")
    ? String(moduleId).slice("practice-".length)
    : String(moduleId || "");
  const catalogModule = algebra1Modules.find(
    module => module.module_id === normalizedModuleId
  );
  if (catalogModule) {
    return String(moduleId).startsWith("practice-")
      ? `${catalogModule.title} Practice`
      : catalogModule.title;
  }
  if (a5aModule?.module_id === normalizedModuleId) return a5aModule.title;
  return String(moduleId || "Lesson")
    .split("-")
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function generateProgressCompletionId() {
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

function migrateLegacyLocalLessonProgress() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(LESSON_PROGRESS_PREFIX)) continue;

      const activity = JSON.parse(localStorage.getItem(key));
      if (!activity?.module_id || activity.completion_id) continue;

      activity.completion_id = generateProgressCompletionId();
      localStorage.setItem(key, JSON.stringify(activity));
      localStorage.setItem(
        `${PENDING_PROGRESS_PREFIX}${activity.completion_id}`,
        JSON.stringify(activity)
      );
    }
  } catch (error) {
    console.warn("Unable to prepare legacy lesson progress for sync:", error);
  }
}

function formatCompletionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Completion time unavailable";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatSkillTime(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60));
  return `${minutes} min on skill`;
}

function readLocalLessonActivities() {
  const activities = [];

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(LESSON_PROGRESS_PREFIX)) continue;

      const activity = JSON.parse(localStorage.getItem(key));
      if (activity?.module_id && activity?.completed_at) {
        activities.push(activity);
      }
    }
  } catch (error) {
    console.warn("Unable to read locally saved lesson progress:", error);
  }

  return activities.sort(
    (left, right) =>
      new Date(right.completed_at).getTime() -
      new Date(left.completed_at).getTime()
  );
}

function readPendingLessonProgress() {
  const pending = [];

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PENDING_PROGRESS_PREFIX)) continue;

      const report = JSON.parse(localStorage.getItem(key));
      if (report?.completion_id) pending.push({ key, report });
    }
  } catch (error) {
    console.warn("Unable to read pending lesson progress:", error);
  }

  return pending.slice(0, 25);
}

async function syncPendingLessonProgress(session) {
  migrateLegacyLocalLessonProgress();

  for (const { key, report } of readPendingLessonProgress()) {
    try {
      const response = await fetch("/api/lesson-progress", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(report)
      });

      if (response.ok) localStorage.removeItem(key);
    } catch (error) {
      console.warn("Pending lesson progress will be retried later:", error);
    }
  }
}

function renderDashboardProgress(activities, source = "account") {
  const continueTopic = document.querySelector("#continueTopic");
  const continueProgress = document.querySelector("#continueProgress");
  const recentActivity = document.querySelector("#recentActivity");
  const progressStatus = document.querySelector("#progressStatus");
  const safeActivities = Array.isArray(activities) ? activities : [];

  dashboardProgressActivities = safeActivities;
  dashboardProgressSource = safeActivities.length ? source : "empty";

  if (safeActivities.length === 0) {
    if (continueTopic) {
      continueTopic.innerHTML =
        "<strong>No learning activity yet</strong><span>Start a lesson or practice session to begin building mastery.</span>";
    }
    if (continueProgress) continueProgress.value = 0;
    if (recentActivity) {
      recentActivity.innerHTML =
        '<li class="progress-empty">Your completed lessons and practice sessions will appear here.</li>';
    }
    if (progressStatus) {
      progressStatus.textContent =
        source === "local" ? "Sign in to sync progress across devices." : "";
    }
    return;
  }

  const latest = safeActivities[0];
  const latestTitle = moduleTitle(latest.module_id);

  if (continueTopic) {
    continueTopic.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = latestTitle;
    const detail = document.createElement("span");
    detail.textContent =
      `${latest.mastery_label} • ${latest.mastery_score}% • ` +
      formatSkillTime(latest.time_on_skill_seconds);
    continueTopic.append(title, detail);
  }

  if (continueProgress) continueProgress.value = latest.mastery_score;

  if (recentActivity) {
    recentActivity.replaceChildren();
    for (const activity of safeActivities.slice(0, 5)) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = moduleTitle(activity.module_id);
      const detail = document.createElement("span");
      detail.textContent =
        `${activity.mastery_label} • ${activity.mastery_score}% • ` +
        `${formatCompletionDate(activity.completed_at)}` +
        (activity.qa_mode ? " • Internal QA" : "");
      item.append(title, detail);
      recentActivity.append(item);
    }
  }

  if (progressStatus) {
    progressStatus.textContent = source === "account"
      ? "Synced to your Tolux account."
      : "Saved on this device; sign in to sync across devices.";
  }
}

async function refreshDashboardProgress(session) {
  if (!session?.access_token) {
    renderDashboardProgress(readLocalLessonActivities(), "local");
    return;
  }

  const refreshId = ++progressRefreshSequence;

  try {
    await syncPendingLessonProgress(session);
    const response = await fetch("/api/lesson-progress", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.activities)) {
      throw new Error(data.error || "Unable to load lesson progress.");
    }

    if (refreshId !== progressRefreshSequence) return;
    renderDashboardProgress(data.activities, "account");
  } catch (error) {
    console.error("Unable to refresh lesson progress:", error);
    if (refreshId !== progressRefreshSequence) return;
    renderDashboardProgress(readLocalLessonActivities(), "local");
    const progressStatus = document.querySelector("#progressStatus");
    if (progressStatus) {
      progressStatus.textContent =
        "Account progress is temporarily unavailable; showing this device's saved activity.";
    }
  }
}

function updateDashboardActivity(problemText) {
  const continueTopic = document.querySelector("#continueTopic");
  const continueProgress = document.querySelector("#continueProgress");
  const recentActivity = document.querySelector("#recentActivity");

  if (continueTopic) {
    continueTopic.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = "Current problem";
    const detail = document.createElement("span");
    detail.textContent = problemText;
    continueTopic.append(title, detail);
  }

  if (continueProgress) continueProgress.value = 50;

  if (recentActivity) {
    recentActivity.innerHTML = "";
    const item = document.createElement("li");
    item.textContent = `Latest problem: ${problemText}`;
    recentActivity.append(item);
  }
}

// Save and restore the latest dashboard activity
function saveDashboardActivity(problemText) {
  localStorage.setItem("toluxLastProblem", problemText);
}

function restoreDashboardActivity() {
  migrateLegacyLocalLessonProgress();
  const savedProblem = localStorage.getItem("toluxLastProblem");

  if (savedProblem) {
    updateDashboardActivity(savedProblem);
  }

  const localLessonActivities = readLocalLessonActivities();
  if (localLessonActivities.length > 0) {
    renderDashboardProgress(localLessonActivities, "local");
  }
}

restoreDashboardActivity();

dashboardBtn?.addEventListener("click", () => {
  void refreshAuthUI();
  authPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

progressBtn?.addEventListener("click", async () => {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();
  await refreshDashboardProgress(session);
  document.querySelector("#continueTopic")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

historyBtn?.addEventListener("click", () => {
  document.querySelector("#chat")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

bookmarksBtn?.addEventListener("click", () => {
  const currentProblem = localStorage.getItem("toluxLastProblem");

  if (currentProblem && !bookmarks.includes(currentProblem)) {
    bookmarks.push(currentProblem);
    localStorage.setItem("toluxBookmarks", JSON.stringify(bookmarks));
    alert("Problem saved to Bookmarks.");
    return;
  }

  if (bookmarks.length === 0) {
    alert("You have no saved bookmarks yet.");
    return;
  }

  alert("Saved Bookmarks:\n\n" + bookmarks.join("\n\n"));
});
