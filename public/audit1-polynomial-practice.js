import { answersEquivalent, escapeHtml } from './lesson-core.mjs';

const params = new URLSearchParams(location.search);
const skill = params.get('skill');
const CONFIG = {
  'A.10A': {moduleId:'alg1-a10a-add-subtract-polynomials',path:'/a10a-add-subtract-polynomials.json',title:'Add and Subtract Polynomials',method:'column alignment'},
  'A.10B': {moduleId:'alg1-a10b-multiply-polynomials',path:'/a10b-multiply-polynomials.json',title:'Multiply Polynomials',method:'box/area model'},
  'A.10C': {moduleId:'alg1-a10c-divide-polynomials',path:'/a10c-divide-polynomials.json',title:'Divide Polynomials',method:'multiply-back verification'}
};
const config = CONFIG[skill];
const $ = selector => document.querySelector(selector);
const els = {
  title:$('#practiceTitle'),meta:$('#practiceMeta'),progressLabel:$('#practiceProgressLabel'),progressBar:$('#practiceProgressBar'),view:$('#practiceQuestionView'),number:$('#practiceQuestionNumber'),difficulty:$('#practiceDifficulty'),prompt:$('#practicePrompt'),answer:$('#practiceAnswer'),check:$('#checkPracticeAnswer'),stuck:$('#practiceStuckBtn'),explain:$('#practiceExplainBtn'),feedback:$('#practiceFeedback'),next:$('#nextPracticeQuestion'),summary:$('#practiceSummary'),skill:$('#practiceSkill'),sessionDifficulty:$('#practiceSessionDifficulty'),sessionCount:$('#practiceSessionCount'),live:$('#practiceLiveScore')
};
const SUPABASE_URL='https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_KEY='sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
const sb=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
let items=[],index=0,hintLevel=0,isSubscriber=false,locked=false;
const records=new Map(),counted=new Set();
const startedAt=Date.now();

function fallbackHints(item){
  const tag=item?.diagnostic_tag||'';
  if(skill==='A.10A'){
    if(/subtract/.test(tag))return['Mark the subtraction sign before the second polynomial.','Change the sign of every term in the polynomial being subtracted.','Align x², x, and constant columns; combine only matching columns.'];
    return['Group terms by exponent: x², x, constants.','Only like terms combine; keep the variable and exponent unchanged.','Combine each coefficient column and write the result in descending powers.'];
  }
  if(skill==='A.10B'){
    if(/exponent|monomial/.test(tag))return['Multiply coefficients first.','When multiplying like bases, add exponents.','Write the coefficient product with the base raised to the sum of exponents.'];
    return['Draw a box or list all partial products.','Every term in one factor multiplies every term in the other factor.','Combine like partial products after all multiplication is complete.'];
  }
  if(/monomial|termwise|exponent/.test(tag))return['Divide each coefficient.','Subtract exponents on like bases.','Apply the divisor to every term and simplify.'];
  if(/synthetic/.test(tag))return['Use the zero of the divisor.','Bring down, multiply, and add across the coefficient row.','Read the quotient coefficients and check the remainder.'];
  return['Order powers from greatest to least and add zero placeholders for missing powers.','Repeat divide → multiply → subtract → bring down.','Stop when the remainder degree is smaller, then verify by multiplying back.'];
}

function stepsFor(item,alternate=false){
  if(alternate&&Array.isArray(item.alternate_solution_steps)&&item.alternate_solution_steps.length)return item.alternate_solution_steps;
  if(Array.isArray(item.solution_steps)&&item.solution_steps.length)return item.solution_steps;
  if(skill==='A.10A')return[
    {equation:item.prompt,explanation:'Write the terms in degree columns.'},
    {equation:'x² | x | constant',explanation:'Align only like terms; distribute any subtraction first.'},
    {equation:item.answer_key,explanation:'Combine coefficients within each matching column and write standard form.'}
  ];
  if(skill==='A.10B')return[
    {equation:item.prompt,explanation:'Set up complete distribution or a box model.'},
    {equation:'every term × every term',explanation:'Create every signed partial product.'},
    {equation:item.answer_key,explanation:'Combine like products and write the polynomial in standard form.'}
  ];
  return[
    {equation:item.prompt,explanation:'Choose termwise, long, or synthetic division based on the divisor.'},
    {equation:'divide → multiply → subtract → bring down',explanation:'Keep powers aligned and repeat the division cycle.'},
    {equation:item.answer_key,explanation:'State quotient/remainder and verify dividend=(divisor)(quotient)+remainder.'}
  ];
}

function full(item,heading='Correct answer and full explanation',alternate=false){
  const steps=stepsFor(item,alternate).map((step,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${escapeHtml(step.equation)}</div><p>${escapeHtml(step.explanation)}</p></div></li>`).join('');
  const intro=alternate?`<div class="lesson-state lesson-state-success"><strong>Another way</strong><p>Use the ${escapeHtml(config.method)} so the structure is visible.</p></div>`:'';
  return `${intro}<div class="solution-panel"><h3>${escapeHtml(heading)}</h3><p><strong>Final answer:</strong> ${escapeHtml(item.answer_key)}</p><ol class="solution-steps">${steps}</ol></div>`;
}

async function auth(){if(!sb)return null;let{data:{session}}=await sb.auth.getSession();if(!session){const{data}=await sb.auth.refreshSession();session=data?.session||null;}return session;}
async function access(item){
  const key=item.practice_id||item.id;if(counted.has(key))return true;
  const session=await auth();if(!session){els.feedback.innerHTML='<strong>Sign in required.</strong>';return false;}
  const response=await fetch('/api/lesson-usage',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({itemId:item.id})});
  const data=await response.json();
  if(response.ok&&data.allowed){counted.add(key);isSubscriber=Boolean(data.isSubscriber);return true;}
  if(data.limitReached){locked=true;disable(true);els.feedback.innerHTML=`<strong>Upgrade to continue</strong><p>${escapeHtml(data.error||'Your free learning trial is complete.')}</p>`;}
  return false;
}
function disable(value){els.answer.disabled=value;els.check.disabled=value;els.stuck.disabled=value;els.explain.disabled=value;}
function current(){return items[index];}
function record(item,correct){const key=item.practice_id||item.id;let r=records.get(key)||{item_id:key,attempt_count:0,first_attempt_correct:null,hint_count:0,first_error_tag:null};r.attempt_count++;if(r.first_attempt_correct===null)r.first_attempt_correct=correct;if(!correct&&!r.first_error_tag)r.first_error_tag=item.diagnostic_tag||skill;records.set(key,r);}
function score(){const attempts=[...records.values()].filter(r=>r.first_attempt_correct!==null);els.live.textContent=`${attempts.filter(r=>r.first_attempt_correct).length} / ${attempts.length}`;}
function render(){const item=current(),number=index+1,pct=Math.round(index/items.length*100);hintLevel=0;els.number.textContent=`Question ${number} of ${items.length}`;els.progressLabel.textContent=`${skill} • Question ${number} of ${items.length}`;els.progressBar.style.width=`${pct}%`;els.progressBar.setAttribute('aria-valuenow',String(pct));els.difficulty.textContent=item.difficulty||'Mixed';els.prompt.textContent=item.prompt;els.answer.value='';disable(false);els.next.hidden=true;els.next.textContent=number===items.length?'View Session Results →':'Next Question →';els.feedback.innerHTML='';els.answer.focus();}
async function check(){const item=current(),answer=els.answer.value.trim();if(!answer){els.feedback.innerHTML='<strong>Enter an answer before checking.</strong>';return;}if(!(await access(item)))return;const correct=answersEquivalent(answer,item);record(item,correct);score();disable(true);els.next.hidden=false;els.feedback.innerHTML=`<div class="lesson-state ${correct?'lesson-state-success':'lesson-state-warning'}"><strong>${correct?'Correct':'Review your attempt'}</strong><p>${correct?'Check the complete reasoning below.':'Your first attempt is recorded. Compare it with the correct answer and full solution below.'}</p></div>${full(item,correct?'Why this answer is correct':'Correct answer and full solution')}`;}
async function hint(){const item=current();if(!(await access(item)))return;const key=item.practice_id||item.id;let r=records.get(key)||{item_id:key,attempt_count:0,first_attempt_correct:null,hint_count:0,first_error_tag:null};r.hint_count++;records.set(key,r);hintLevel=Math.min(hintLevel+1,3);const hints=Array.isArray(item.hint_steps)&&item.hint_steps.length?item.hint_steps:fallbackHints(item);const text=hints[Math.min(hintLevel-1,hints.length-1)];els.feedback.innerHTML=`<div class="lesson-state lesson-state-warning"><strong>Hint ${hintLevel}</strong><p>${escapeHtml(text)}</p></div>${hintLevel===3?full(item,'Hint 3: answer and complete reasoning'):''}`;}
async function explain(){const item=current();if(!(await access(item)))return;els.feedback.innerHTML=full(item,'Complete alternate explanation',true);}
async function save(){const done=[...records.values()],correct=done.filter(r=>r.first_attempt_correct).length,pct=done.length?Math.round(correct/done.length*100):0;const report={completion_id:crypto.randomUUID?.()||`${Date.now()}`,module_id:`practice-${config.moduleId}`,completed_at:new Date().toISOString(),mastery_label:pct>=80?'Mastered':pct>=60?'Developing':'Intervention Needed',mastery_score:pct,is_subscriber:isSubscriber,time_on_skill_seconds:Math.round((Date.now()-startedAt)/1000),item_records:done};try{localStorage.setItem(`toluxLessonProgress:${report.module_id}`,JSON.stringify(report));}catch{}const session=await auth();if(session)try{await fetch('/api/lesson-progress',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(report)});}catch{}return{pct,correct,total:done.length};}
async function next(){if(index<items.length-1){index++;render();return;}const summary=await save();els.view.hidden=true;els.summary.hidden=false;els.progressBar.style.width='100%';els.summary.innerHTML=`<div class="completion-mark">✓</div><h2>${summary.pct>=80?'Strong practice':'Keep practicing'}</h2><p class="mastery-score">${summary.pct}%</p><p>${summary.correct} of ${summary.total} correct on the first attempt.</p><div class="practice-summary-actions"><a class="lesson-link-button" href="/#practiceModePanel">Practice Another Skill</a><a class="lesson-link-button practice-secondary-link" href="/">View Dashboard</a></div>`;}
async function start(){if(!config){els.title.textContent='Practice unavailable';return;}const requested=Number(params.get('count')||5),count=[5,10,20].includes(requested)?requested:5;const difficulty=(params.get('difficulty')||'mixed').toLowerCase();const response=await fetch(config.path);if(!response.ok){els.title.textContent='Practice unavailable';return;}const module=await response.json();let bank=(module.items||[]).filter(item=>['guided_practice','independent_practice','mastery_check'].includes(item.type));if(difficulty!=='mixed'){const desired=bank.filter(item=>String(item.difficulty||'').toLowerCase()===difficulty);if(desired.length>=2)bank=desired;}items=Array.from({length:count},(_,i)=>({...bank[i%bank.length],practice_id:`${bank[i%bank.length].id}-practice-${i+1}`}));els.title.textContent=config.title;els.meta.textContent=`Algebra 1 • TEKS ${skill}`;els.skill.textContent=`${skill} • ${config.title}`;els.sessionDifficulty.textContent=params.get('difficulty')||'mixed';els.sessionCount.textContent=String(count);render();}
els.check.addEventListener('click',check);els.answer.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();check();}});els.stuck.addEventListener('click',hint);els.explain.addEventListener('click',explain);els.next.addEventListener('click',next);start();