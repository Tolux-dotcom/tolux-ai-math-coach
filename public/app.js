

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Tolux Algebra 1 A.5A curriculum module
let a5aModule = null;

async function loadA5AModule() {
  try {
    const response = await fetch("/a5a-linear-equations.json");
    if (!response.ok) throw new Error(`A5A module load failed: ${response.status}`);
    a5aModule = await response.json();
    console.log("Tolux A.5A curriculum loaded:", a5aModule.title);
  } catch (error) {
    console.error("Unable to load Tolux A.5A curriculum:", error);
  }
}

loadA5AModule();
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
const authLoggedOut = document.querySelector("#authLoggedOut");
const authLoggedIn = document.querySelector("#authLoggedIn");
const signedInEmail = document.querySelector("#signedInEmail");

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

  authMessage.textContent = "";
  authLoggedOut.style.display = "none";
  authLoggedIn.style.display = "block";
  signedInEmail.textContent = data.user.email;
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

  authLoggedIn.style.display = "none";
  authLoggedOut.style.display = "block";
  signedInEmail.textContent = "";
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
  }
});
async function refreshAuthUI() {
  if (resetPasswordPanel.style.display === "block") {
  return;
}
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session?.user) {
    authLoggedOut.style.display = "none";
    authLoggedIn.style.display = "block";
    signedInEmail.textContent = session.user.email;
    authMessage.textContent = "";
  } else {
    authLoggedIn.style.display = "none";
    authLoggedOut.style.display = "block";
    signedInEmail.textContent = "";
  }
}

refreshAuthUI();
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
}));

document.querySelectorAll(".mode").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".mode").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  mode = btn.dataset.mode;
  refreshLabel();
}));

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
// Update Continue Where You Left Off and Recent Activity

function updateDashboardActivity(problemText) {
  const continueTopic = document.querySelector("#continueTopic");
  const continueProgress = document.querySelector("#continueProgress");
  const recentActivity = document.querySelector("#recentActivity");

  if (continueTopic) {
    continueTopic.innerHTML =
      `<b>Current problem</b><br>${problemText}`;
  }

  if (continueProgress) {
    continueProgress.value = 50;
  }

  if (recentActivity) {
    recentActivity.textContent =
      `Latest: ${problemText}`;
  }
}

// Save and restore the latest dashboard activity
function saveDashboardActivity(problemText) {
  localStorage.setItem("toluxLastProblem", problemText);
}

function restoreDashboardActivity() {
  const savedProblem = localStorage.getItem("toluxLastProblem");

  if (savedProblem) {
    updateDashboardActivity(savedProblem);
  }
}

restoreDashboardActivity();

dashboardBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

progressBtn?.addEventListener("click", () => {
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
