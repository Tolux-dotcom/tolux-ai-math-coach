import { answersEquivalent, escapeHtml, formatMathNotation } from "./lesson-core.mjs";

const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const els = {
  title: document.querySelector("#practiceTitle"), meta: document.querySelector("#practiceMeta"),
  progressLabel: document.querySelector("#practiceProgressLabel"), progressBar: document.querySelector("#practiceProgressBar"),
  questionView: document.querySelector("#practiceQuestionView"), number: document.querySelector("#practiceQuestionNumber"),
  difficulty: document.querySelector("#practiceDifficulty"), prompt: document.querySelector("#practicePrompt"),
  answer: document.querySelector("#practiceAnswer"), check: document.querySelector("#checkPracticeAnswer"),
  stuck: document.querySelector("#practiceStuckBtn"), explain: document.querySelector("#practiceExplainBtn"),
  feedback: document.querySelector("#practiceFeedback"), next: document.querySelector("#nextPracticeQuestion"),
  summary: document.querySelector("#practiceSummary"), skill: document.querySelector("#practiceSkill"),
  sessionDifficulty: document.querySelector("#practiceSessionDifficulty"), sessionCount: document.querySelector("#practiceSessionCount"),
  liveScore: document.querySelector("#practiceLiveScore")
};

let moduleData = null;
let session = null;
let currentIndex = 0;
let locked = false;
let isSubscriber = false;
let completionReport = null;
let trialTimer = null;
const records = new Map();
const counted = new Set();
const startedAt = Date.now();

const normalizeDifficulty = item => {
  const value = String(item?.difficulty || "").toLowerCase();
  if (value.includes("foundational")) return "foundational";
  if (value.includes("challenging")) return "challenging";
  return "grade-level";
};
const labelDifficulty = value => String(value || "").split("-").map(w => w[0]?.toUpperCase()+w.slice(1)).join(" ");
const shuffle = values => {
  const copy = [...values];
  for (let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};
const currentItem = () => session?.items?.[currentIndex] || null;

function recordFor(item) {
  if (!records.has(item.id)) records.set(item.id,{item_id:item.id,attempt_count:0,first_attempt_correct:null,hint_count:0,first_error_tag:null});
  return records.get(item.id);
}
function recordAttempt(item, correct) {
  const record = recordFor(item); record.attempt_count += 1;
  if (record.first_attempt_correct === null) record.first_attempt_correct = correct;
  if (!correct && !record.first_error_tag) record.first_error_tag = item.diagnostic_tag || "unknown";
}
function setDisabled(value){els.answer.disabled=value;els.check.disabled=value;els.stuck.disabled=value;els.explain.disabled=value;}
function setFeedback(markup=""){els.feedback.innerHTML=markup;}

function solutionMarkup(item, heading="Correct answer and full explanation") {
  const steps = (item.solution_steps || item.alternate_solution_steps || []).map((step,index)=>`
    <li><span class="solution-step-number">${index+1}</span><div><div class="math-line">${escapeHtml(formatMathNotation(step.equation))}</div><p>${escapeHtml(formatMathNotation(step.explanation))}</p></div></li>`).join("");
  return `<div class="solution-panel practice-solution"><h3>${escapeHtml(heading)}</h3><p><strong>Final answer:</strong> ${escapeHtml(formatMathNotation(item.answer_key))}</p><ol class="solution-steps">${steps}</ol><div class="teaching-check"><strong>Rule to remember</strong><p>Each input must have exactly one output. Repeated outputs are allowed. One input with two different outputs means the relation is not a function.</p></div></div>`;
}

async function getAuthSession(){if(!supabaseClient)return null;let{data:{session:s}}=await supabaseClient.auth.getSession();if(!s){const{data}=await supabaseClient.auth.refreshSession();s=data?.session||null;}return s;}
async function fetchWithSession(url,options={}){
  let s=await getAuthSession();
  if(!s)return{response:null,session:null};
  const request=active=>fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${active.access_token}`}});
  let response=await request(s);
  if(response.status===401){const{data,error}=await supabaseClient.auth.refreshSession();const refreshed=error?null:data?.session;if(refreshed){s=refreshed;response=await request(s);}}
  return{response,session:s};
}
async function ensureAccess(item){
  if(!item||locked)return false;if(counted.has(item.id))return true;
  try{
    const{response,session:auth}=await fetchWithSession("/api/lesson-usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:item.id})});
    if(!auth||!response){setFeedback('<div class="lesson-state lesson-state-warning"><strong>Sign in required</strong><p>Return to the dashboard and sign in before checking this answer.</p></div>');return false;}
    const data=await response.json();
    if(response.ok&&data.allowed){counted.add(item.id);isSubscriber=Boolean(data.isSubscriber);return true;}
    if(data.limitReached){locked=true;setDisabled(true);setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Upgrade to continue</strong><p>${escapeHtml(data.error||"Your free learning trial is complete.")}</p><a class="lesson-link-button" href="/#pricingSection">View Tolux Plans</a></div>`);return false;}
    setFeedback(`<div class="lesson-state lesson-state-error"><strong>Unable to continue</strong><p>${escapeHtml(data.error||"Please try again.")}</p></div>`);
  }catch(error){console.error("A.12A access check failed",error);setFeedback('<div class="lesson-state lesson-state-error"><strong>Connection problem</strong><p>Please check your connection and try again.</p></div>');}
  return false;
}
async function heartbeat(){if(locked||isSubscriber||document.visibilityState!=="visible"||!session)return;try{const{response}=await fetchWithSession("/api/trial-heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({activeSeconds:15})});if(!response)return;const data=await response.json();if(data.limitReached){locked=true;setDisabled(true);setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Upgrade to continue</strong><p>${escapeHtml(data.error||"Your free learning trial is complete.")}</p></div>`);}}catch(error){console.warn(error);}}
trialTimer=window.setInterval(heartbeat,15000);window.addEventListener("pagehide",()=>window.clearInterval(trialTimer));

function updateScore(){const done=[...records.values()].filter(r=>r.first_attempt_correct!==null);const correct=done.filter(r=>r.first_attempt_correct).length;els.liveScore.textContent=`${correct} / ${done.length}`;}
function renderQuestion(){
  const item=currentItem();if(!item)return;const number=currentIndex+1;const pct=Math.round((currentIndex/session.count)*100);
  els.number.textContent=`Question ${number} of ${session.count}`;els.progressLabel.textContent=`A.12A • Question ${number} of ${session.count}`;els.progressBar.style.width=`${pct}%`;els.progressBar.setAttribute("aria-valuenow",String(pct));
  els.difficulty.textContent=labelDifficulty(item.difficulty);els.prompt.innerHTML=escapeHtml(formatMathNotation(item.prompt)).replaceAll("\n","<br>");els.answer.value="";els.answer.placeholder="Type function or not a function";setDisabled(false);els.next.hidden=true;els.next.textContent=number===session.count?"View Session Results →":"Next Question →";setFeedback();els.answer.focus();
}

async function checkAnswer(){
  const item=currentItem();const answer=els.answer.value.trim();if(!item||!answer){setFeedback("<strong>Enter an answer before checking.</strong>");return;}
  els.check.disabled=true;if(!(await ensureAccess(item))){if(!locked)els.check.disabled=false;return;}
  const correct=answersEquivalent(answer,item);recordAttempt(item,correct);updateScore();
  setDisabled(true);els.next.hidden=false;
  if(correct){setFeedback(`<div class="lesson-state lesson-state-success"><strong>Correct</strong><p>${escapeHtml(formatMathNotation(item.answer_key))}</p></div>${solutionMarkup(item,"Why this answer is correct")}`);return;}
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Not correct</strong><p>Your attempt was recorded. Compare your work with the correct answer and explanation below.</p></div>${solutionMarkup(item)}`);
}

function showHint(){
  const item=currentItem();if(!item)return;const record=recordFor(item);record.hint_count+=1;const hints=item.hint_steps||[item.hint||"Check how many outputs each input has."];
  const level=Math.min(record.hint_count,hints.length)-1;const hint=hints[level];const answer=level===hints.length-1?`<p><strong>Answer:</strong> ${escapeHtml(formatMathNotation(item.answer_key))}</p>${solutionMarkup(item,"Hint 3: complete reasoning")}`:"";
  setFeedback(`<div class="lesson-state lesson-state-warning"><strong>Hint ${level+1}</strong><p>${escapeHtml(formatMathNotation(hint))}</p></div>${answer}`);
}
function explainAnotherWay(){const item=currentItem();if(!item)return;setFeedback(`<div class="lesson-state lesson-state-success"><strong>Another way to think about it</strong><p>Translate the representation into input → output pairs. Then ask one question: does any single input point to two different outputs?</p></div>${solutionMarkup(item,"Step-by-step alternative explanation")}`);}

function calculateSummary(){
  const values=[...records.values()].filter(r=>r.first_attempt_correct!==null);
  const correct=values.filter(r=>r.first_attempt_correct===true).length;
  const total=session.items.length;
  const scorePercent=total?Math.round(correct/total*100):0;
  return{correct,total,scorePercent,label:scorePercent>=80?"Mastered":scorePercent>=60?"Developing":"Intervention Needed",missed:session.items.filter(item=>records.get(item.id)?.first_attempt_correct!==true)};
}
function completionId(){return window.crypto?.randomUUID?.()||`a12a-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
async function saveCompletion(summary){
  if(!completionReport){completionReport={completion_id:completionId(),module_id:"practice-alg1-a12a-identify-functions",completed_at:new Date().toISOString(),mastery_label:summary.label,mastery_score:summary.scorePercent,is_subscriber:isSubscriber,time_on_skill_seconds:Math.round((Date.now()-startedAt)/1000),item_records:[...records.values()]};}
  const moduleKey=`${LESSON_PROGRESS_PREFIX}${completionReport.module_id}`;const pendingKey=`${PENDING_PROGRESS_PREFIX}${completionReport.completion_id}`;
  try{localStorage.setItem(moduleKey,JSON.stringify(completionReport));localStorage.setItem(pendingKey,JSON.stringify(completionReport));}catch(error){console.warn("A.12A local progress save failed",error);}
  const{response,session:auth}=await fetchWithSession("/api/lesson-progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(completionReport)});
  if(!auth||!response)throw new Error("Sign in is required to sync practice progress.");
  const data=await response.json();if(!response.ok||!data.activity)throw new Error(data.error||"Unable to save practice progress.");
  try{localStorage.setItem(moduleKey,JSON.stringify(data.activity));localStorage.removeItem(pendingKey);}catch(error){console.warn("A.12A synced progress reconciliation failed",error);}
  return data.activity;
}
function missedReviewMarkup(summary){
  if(!summary.missed.length)return "<p>You answered every question correctly on the first attempt.</p>";
  return `<h3>Review these questions</h3><div class="practice-review-list">${summary.missed.map(item=>`<article><strong>${escapeHtml(formatMathNotation(item.prompt))}</strong>${solutionMarkup(item,"Review the correct reasoning")}</article>`).join("")}</div>`;
}
async function finish(){
  const summary=calculateSummary();
  els.questionView.hidden=true;els.summary.hidden=false;els.progressBar.style.width="100%";els.progressBar.setAttribute("aria-valuenow","100");els.progressLabel.textContent="Practice session complete";
  els.summary.innerHTML=`<div class="completion-mark">✓</div><h2>${summary.label}</h2><p class="mastery-score">${summary.scorePercent}%</p><p>${summary.correct} of ${summary.total} correct on the first attempt.</p><p id="a12aSaveStatus" class="completion-save-status">Saving your practice progress…</p>${missedReviewMarkup(summary)}<div class="practice-summary-actions"><a class="lesson-link-button" href="/#practiceModePanel">Practice Another Skill</a><a class="lesson-link-button practice-secondary-link" href="/">View Dashboard</a></div>`;
  const status=document.querySelector("#a12aSaveStatus");
  try{await saveCompletion(summary);if(status)status.textContent="Saved to your Tolux progress dashboard.";}catch(error){console.error("A.12A practice completion sync failed",error);if(status)status.textContent="Saved on this device. Tolux will retry account sync from the dashboard.";}
}
function next(){if(currentIndex>=session.count-1){finish();return;}currentIndex+=1;renderQuestion();}

async function start(){
  try{
    const response=await fetch("/a12a-identify-functions.json");if(!response.ok)throw new Error(`Practice bank failed to load: ${response.status}`);moduleData=await response.json();
    const params=new URLSearchParams(window.location.search);const difficulty=params.get("difficulty")||"grade-level";const requested=Number(params.get("count")||5);const count=[5,10,20].includes(requested)?requested:5;
    const bank=[...(moduleData.items||[]).filter(item=>item.type!=="worked_example"),...(moduleData.practice_bank||[])].filter(item=>item.prompt&&item.answer_key);
    const ordered=difficulty==="mixed"?shuffle(bank):[...shuffle(bank.filter(i=>normalizeDifficulty(i)===difficulty)),...shuffle(bank.filter(i=>normalizeDifficulty(i)!==difficulty))];
    session={module_id:moduleData.module_id,skill:"A.12A",title:moduleData.title,difficulty,count,items:ordered.slice(0,count)};
    if(session.items.length<count)throw new Error("A.12A does not yet contain enough verified practice questions.");
    els.title.textContent="Identify Functions";els.meta.textContent="Algebra 1 • TEKS A.12A";els.skill.textContent="A.12A • Identify Functions";els.sessionDifficulty.textContent=labelDifficulty(difficulty);els.sessionCount.textContent=String(count);renderQuestion();
  }catch(error){console.error(error);els.title.textContent="Practice unavailable";els.questionView.innerHTML=`<div class="lesson-state lesson-state-error"><h2>We could not start this practice session</h2><p>${escapeHtml(error.message)}</p></div>`;}
}

els.check.addEventListener("click",checkAnswer);els.answer.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();checkAnswer();}});els.next.addEventListener("click",next);
els.stuck.addEventListener("click",async()=>{const item=currentItem();if(item&&await ensureAccess(item))showHint();});
els.explain.addEventListener("click",async()=>{const item=currentItem();if(item&&await ensureAccess(item))explainAnotherWay();});
start();
