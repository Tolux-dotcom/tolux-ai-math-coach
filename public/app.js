
let course = "Algebra 1";
let mode = "Tutor Mode";
let imageDataUrl = null;
const history = [];

const chat = document.querySelector("#chat");
const input = document.querySelector("#input");
const modeLabel = document.querySelector("#modeLabel");
const apiStatus = document.querySelector("#apiStatus");
const previewWrap = document.querySelector("#previewWrap");
const preview = document.querySelector("#preview");

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

if (linearGraphMatch && !/x\s*(\^2|²)/i.test(text)) {
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
   const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);
const r = await fetch("/api/coach", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload), signal:controller.signal});
    const data = await r.json();
    clearTimeout(timeout);
    thinking.remove();
    if(r.ok && data.reply){
      apiStatus.textContent = "AI Live";
      apiStatus.className = "badge live";
      addMessage("assistant", data.reply);
    }else{
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

window.showTestGraph = showTestGraph;
window.showQuadraticGraph = showQuadraticGraph;

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
