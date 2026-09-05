import {
  STAAR_BLUEPRINT,
  buildTestPrepSession,
  categoryDefinition,
  scoreTestPrepSession,
  formatTestPrepMath
} from "./test-prep-core.mjs";

const startPanel = document.querySelector("#testPrepStart");
const loadingPanel = document.querySelector("#testPrepLoading");
const runnerPanel = document.querySelector("#testPrepRunner");
const resultsPanel = document.querySelector("#testPrepResults");
const domainSelect = document.querySelector("#domainSelect");
const blueprintTable = document.querySelector("#blueprintTable");
const startQuickPrep = document.querySelector("#startQuickPrep");
const startDomainPrep = document.querySelector("#startDomainPrep");
const startFullPrep = document.querySelector("#startFullPrep");
const questionCounter = document.querySelector("#questionCounter");
const elapsedClock = document.querySelector("#elapsedClock");
const sessionModeLabel = document.querySelector("#sessionModeLabel");
const sessionTitle = document.querySelector("#sessionTitle");
const testPrepProgress = document.querySelector("#testPrepProgress");
const questionCategory = document.querySelector("#questionCategory");
const questionTeks = document.querySelector("#questionTeks");
const questionPoints = document.querySelector("#questionPoints");
const questionPrompt = document.querySelector("#questionPrompt");
const questionVisual = document.querySelector("#questionVisual");
const testPrepAnswer = document.querySelector("#testPrepAnswer");
const markForReview = document.querySelector("#markForReview");
const previousQuestion = document.querySelector("#previousQuestion");
const nextQuestion = document.querySelector("#nextQuestion");
const questionNavigator = document.querySelector("#questionNavigator");
const submitTestPrep = document.querySelector("#submitTestPrep");
const resultHeadline = document.querySelector("#resultHeadline");
const resultSummary = document.querySelector("#resultSummary");
const resultScore = document.querySelector("#resultScore");
const categoryResults = document.querySelector("#categoryResults");
const missedResults = document.querySelector("#missedResults");
const retryTestPrep = document.querySelector("#retryTestPrep");

let session = null;
let currentIndex = 0;
let responses = {};
let flagged = new Set();
let startedAt = null;
let clockTimer = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBlueprint() {
  domainSelect.innerHTML = STAAR_BLUEPRINT.categories.map(category =>
    `<option value="${category.id}">RC ${category.id} • ${escapeHtml(category.name)}</option>`
  ).join("");

  blueprintTable.innerHTML = `
    <table>
      <thead><tr><th>Reporting category</th><th>Questions</th><th>Points</th></tr></thead>
      <tbody>
        ${STAAR_BLUEPRINT.categories.map(category => `
          <tr>
            <td><strong>${category.id}</strong> • ${escapeHtml(category.name)}</td>
            <td>${category.questionRange[0]}–${category.questionRange[1]}</td>
            <td>${category.pointRange[0]}–${category.pointRange[1]}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot><tr><th>Total</th><th>${STAAR_BLUEPRINT.totalQuestions}</th><th>${STAAR_BLUEPRINT.totalPoints}</th></tr></tfoot>
    </table>
  `;
}

function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`
    : `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

function startClock() {
  startedAt = Date.now();
  clearInterval(clockTimer);
  const update = () => { elapsedClock.textContent = formatElapsed(Date.now() - startedAt); };
  update();
  clockTimer = setInterval(update, 1000);
}

function saveCurrentResponse() {
  if (!session) return;
  const question = session.questions[currentIndex];
  responses[question.id] = testPrepAnswer.value.trim();
  if (markForReview.checked) flagged.add(question.id);
  else flagged.delete(question.id);
}

function coefficient(value) {
  if (value === "" || value === "+") return 1;
  if (value === "-") return -1;
  return Number(value);
}

function parseLinear(raw) {
  const s = String(raw || "").replace(/\s+/g, "").replace(/[−–—]/g, "-");
  let match = s.match(/^y=([+-]?(?:\d+(?:\.\d+)?)?)x([+-]\d+(?:\.\d+)?)?$/i);
  if (match) return { m: coefficient(match[1]), b: Number(match[2] || 0), label: s };
  match = s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)y=([+-]?(?:\d+(?:\.\d+)?)?)x([+-]\d+(?:\.\d+)?)?$/i);
  if (match) {
    const divisor = coefficient(match[1]);
    if (divisor) return { m: coefficient(match[2]) / divisor, b: Number(match[3] || 0) / divisor, label: s };
  }
  match = s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x([+-](?:\d+(?:\.\d+)?)?)y=([+-]?\d+(?:\.\d+)?)$/i);
  if (match) {
    const a = coefficient(match[1]);
    const b = coefficient(match[2]);
    const c = Number(match[3]);
    if (b) return { m: -a / b, b: c / b, label: s };
  }
  return null;
}

function extractLinearEquations(text) {
  const normalized = String(text || "").replace(/[−–—]/g, "-");
  const candidates = normalized.match(/(?:[+-]?(?:\d+(?:\.\d+)?)?x[+-](?:\d+(?:\.\d+)?)?y=[+-]?\d+(?:\.\d+)?|(?:[+-]?(?:\d+(?:\.\d+)?)?)y=[+-]?(?:\d+(?:\.\d+)?)?x(?:[+-]\d+(?:\.\d+)?)?)/gi) || [];
  return candidates.map(parseLinear).filter(Boolean).slice(0, 2);
}

function statedPoint(text) {
  const match = String(text || "").match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

function graphLines(lines, point = null) {
  const XMIN=-6, XMAX=6, YMIN=-10, YMAX=10, LEFT=62, TOP=24, W=480, H=350;
  const sx=x=>LEFT+(x-XMIN)/(XMAX-XMIN)*W;
  const sy=y=>TOP+(YMAX-y)/(YMAX-YMIN)*H;
  const ticks=[];
  for(let x=XMIN;x<=XMAX;x+=1){
    ticks.push(`<line x1="${sx(x)}" y1="${TOP}" x2="${sx(x)}" y2="${TOP+H}" stroke="${x===0?'#64748b':'#e4e8f0'}" stroke-width="${x===0?2:1}"/>`);
    if(x!==0)ticks.push(`<text x="${sx(x)}" y="${TOP+H+20}" text-anchor="middle" font-size="11">${x}</text>`);
  }
  for(let y=YMIN;y<=YMAX;y+=2){
    ticks.push(`<line x1="${LEFT}" y1="${sy(y)}" x2="${LEFT+W}" y2="${sy(y)}" stroke="${y===0?'#64748b':'#e4e8f0'}" stroke-width="${y===0?2:1}"/>`);
    if(y!==0)ticks.push(`<text x="${LEFT-8}" y="${sy(y)+4}" text-anchor="end" font-size="11">${y}</text>`);
  }
  const colors=["#244fa3","#c63f37"];
  const lineMarkup=lines.map((line,index)=>`<line x1="${sx(XMIN)}" y1="${sy(line.m*XMIN+line.b)}" x2="${sx(XMAX)}" y2="${sy(line.m*XMAX+line.b)}" stroke="${colors[index]}" stroke-width="4"/>`).join("");
  const pointMarkup=point&&point.x>=XMIN&&point.x<=XMAX&&point.y>=YMIN&&point.y<=YMAX?`<circle cx="${sx(point.x)}" cy="${sy(point.y)}" r="7" fill="#111827"/><text x="${sx(point.x)+10}" y="${sy(point.y)-10}" font-size="12" font-weight="700">(${point.x}, ${point.y})</text>`:"";
  return `<div class="test-prep-graph"><svg viewBox="0 0 610 410" role="img" aria-label="Numbered coordinate plane showing the equations in this test question"><defs><clipPath id="test-prep-clip"><rect x="${LEFT}" y="${TOP}" width="${W}" height="${H}"/></clipPath></defs>${ticks.join("")}<g clip-path="url(#test-prep-clip)">${lineMarkup}${pointMarkup}</g></svg>${lines.length?`<p><strong>Graph:</strong> ${lines.map((line,index)=>`<span style="margin-right:14px">${index===0?'Blue':'Red'}: ${escapeHtml(line.label)}</span>`).join("")}</p>`:""}</div>`;
}

function renderQuestionVisual(question) {
  const equations = extractLinearEquations(question.prompt);
  let point = null;
  if (equations.length === 2 && Math.abs(equations[0].m - equations[1].m) > 1e-9) {
    const x = (equations[1].b - equations[0].b) / (equations[0].m - equations[1].m);
    point = { x: Number(x.toFixed(2)), y: Number((equations[0].m*x + equations[0].b).toFixed(2)) };
  }
  if (question.skill === "A.3F" && equations.length < 2) {
    const given = statedPoint(question.prompt);
    if (given) {
      point = given;
      const lines = [
        {m:1,b:given.y-given.x,label:"Line 1"},
        {m:-1,b:given.y+given.x,label:"Line 2"}
      ];
      questionVisual.innerHTML = graphLines(lines, point);
      return;
    }
  }
  if (equations.length) {
    questionVisual.innerHTML = graphLines(equations, point);
    return;
  }
  questionVisual.innerHTML = "";
}

function renderNavigator() {
  questionNavigator.innerHTML = session.questions.map((question,index) => {
    const classes = [index === currentIndex ? "current" : "", responses[question.id] ? "answered" : "", flagged.has(question.id) ? "flagged" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-index="${index}" aria-label="Go to question ${index+1}">${index+1}</button>`;
  }).join("");
  questionNavigator.querySelectorAll("button").forEach(button => button.addEventListener("click",()=>{
    saveCurrentResponse();
    currentIndex=Number(button.dataset.index);
    renderQuestion();
  }));
}

function renderQuestion() {
  const question = session.questions[currentIndex];
  const category = categoryDefinition(question.categoryId);
  questionCounter.textContent = `Question ${currentIndex+1} of ${session.questions.length}`;
  questionCategory.textContent = `RC ${question.categoryId} • ${category?.name || "Algebra I"}`;
  questionTeks.textContent = question.skill;
  questionPoints.textContent = `${question.pointValue} point${question.pointValue===1?"":"s"}`;
  questionPrompt.textContent = formatTestPrepMath(question.prompt);
  testPrepAnswer.value = responses[question.id] || "";
  markForReview.checked = flagged.has(question.id);
  previousQuestion.disabled = currentIndex === 0;
  nextQuestion.textContent = currentIndex === session.questions.length-1 ? "Review Test →" : "Next →";
  const percent = Math.round((currentIndex+1)/session.questions.length*100);
  testPrepProgress.style.width=`${percent}%`;
  testPrepProgress.setAttribute("aria-valuenow",String(percent));
  renderQuestionVisual(question);
  renderNavigator();
  testPrepAnswer.focus();
}

async function begin(mode, categoryId = null) {
  startPanel.hidden=true;
  resultsPanel.hidden=true;
  runnerPanel.hidden=true;
  loadingPanel.hidden=false;
  try {
    session=await buildTestPrepSession({mode,categoryId});
    responses={};
    flagged=new Set();
    currentIndex=0;
    sessionModeLabel.textContent=mode==="full"?"Full blueprint-shaped simulation":mode==="domain"?"Focused reporting-category practice":"12-question readiness check";
    sessionTitle.textContent=session.title;
    loadingPanel.hidden=true;
    runnerPanel.hidden=false;
    startClock();
    renderQuestion();
  } catch(error) {
    loadingPanel.innerHTML=`<h2>Test Prep could not load</h2><p>${escapeHtml(error.message)}</p><a class="lesson-link-button" href="/">Return to Dashboard</a>`;
  }
}

function renderSolutions(steps) {
  if (!steps?.length) return "<p>Open the linked Tolux lesson for complete remediation.</p>";
  return steps.map((step,index)=>`<div class="solution-step"><strong>Step ${index+1}: ${escapeHtml(formatTestPrepMath(step.equation || ""))}</strong><p>${escapeHtml(formatTestPrepMath(step.explanation || ""))}</p></div>`).join("");
}

function saveAttempt(result) {
  try {
    const key="toluxTestPrepAttempts";
    const existing=JSON.parse(localStorage.getItem(key)||"[]");
    existing.unshift({
      completedAt:new Date().toISOString(),
      mode:session.mode,
      title:session.title,
      earned:result.earned,
      max:result.max,
      percent:result.percent,
      categoryResults:result.categoryResults.map(({id,percent})=>({id,percent}))
    });
    localStorage.setItem(key,JSON.stringify(existing.slice(0,20)));
  } catch(error) {
    console.warn("Unable to save local Test Prep history:",error);
  }
}

function finishTest() {
  saveCurrentResponse();
  const unanswered=session.questions.filter(question=>!responses[question.id]).length;
  if(unanswered && !window.confirm(`${unanswered} question${unanswered===1?" is":"s are"} unanswered. Submit anyway?`)) return;
  clearInterval(clockTimer);
  const result=scoreTestPrepSession(session,responses);
  saveAttempt(result);
  runnerPanel.hidden=true;
  resultsPanel.hidden=false;
  resultScore.textContent=`${result.percent}%`;
  resultHeadline.textContent=result.percent>=80?"Strong overall performance":result.percent>=65?"On track — target the gaps":"Build the weak areas before the EOC";
  resultSummary.textContent=`You earned ${result.earned} of ${result.max} Tolux practice points in ${elapsedClock.textContent}. This is a Tolux practice score, not an official STAAR scale score or performance-level prediction.`;
  categoryResults.innerHTML=result.categoryResults.map(category=>`<article class="category-result-card"><strong>RC ${category.id} • ${escapeHtml(category.name)}</strong><span>${category.earned}/${category.max} points • ${category.percent}%</span><div class="category-bar"><span style="width:${category.percent}%"></span></div></article>`).join("");
  missedResults.innerHTML=result.missed.length?result.missed.map(row=>`<article class="missed-card"><h3>${escapeHtml(row.skill)} • ${escapeHtml(row.moduleTitle)}</h3><p>${escapeHtml(formatTestPrepMath(row.prompt))}</p><div class="your-answer"><strong>Your answer:</strong> ${escapeHtml(row.studentAnswer||"No answer")}<br><strong>Correct answer:</strong> ${escapeHtml(formatTestPrepMath(row.answerKey))}</div>${renderSolutions(row.solutionSteps)}<a class="lesson-link-button" href="${escapeHtml(row.lessonUrl)}">Review ${escapeHtml(row.skill)} Lesson →</a></article>`).join(""):"<div class=\"test-prep-notice\"><strong>No missed questions in this set.</strong><p>Build another test to check a new sample of TEKS.</p></div>";
  resultsPanel.scrollIntoView({behavior:"smooth",block:"start"});
}

previousQuestion.addEventListener("click",()=>{saveCurrentResponse();if(currentIndex>0){currentIndex-=1;renderQuestion();}});
nextQuestion.addEventListener("click",()=>{saveCurrentResponse();if(currentIndex<session.questions.length-1){currentIndex+=1;renderQuestion();}else{questionNavigator.scrollIntoView({behavior:"smooth",block:"center"});}});
submitTestPrep.addEventListener("click",finishTest);
startQuickPrep.addEventListener("click",()=>begin("quick"));
startDomainPrep.addEventListener("click",()=>begin("domain",Number(domainSelect.value)));
startFullPrep.addEventListener("click",()=>begin("full"));
retryTestPrep.addEventListener("click",()=>{clearInterval(clockTimer);session=null;responses={};flagged=new Set();resultsPanel.hidden=true;startPanel.hidden=false;startPanel.scrollIntoView({behavior:"smooth",block:"start"});});

testPrepAnswer.addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();nextQuestion.click();}
});

renderBlueprint();
