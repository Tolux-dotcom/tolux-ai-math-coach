(() => {
  const CONFIG={
    'A.11A':'/a11a-radical-expressions.json',
    'A.11B':'/a11b-laws-of-exponents.json'
  };
  const skill=new URLSearchParams(location.search).get('skill');
  const path=CONFIG[skill];if(!path)return;
  const feedback=document.querySelector('#practiceFeedback'),prompt=document.querySelector('#practicePrompt'),answer=document.querySelector('#practiceAnswer'),check=document.querySelector('#checkPracticeAnswer'),stuck=document.querySelector('#practiceStuckBtn'),explain=document.querySelector('#practiceExplainBtn'),next=document.querySelector('#nextPracticeQuestion');
  if(!feedback||!prompt||!answer||!check||!stuck||!explain||!next)return;
  let promptMap=new Map(),observer;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  function current(){return promptMap.get((prompt.textContent||'').trim())||null;}
  function steps(item){const list=(item.solution_steps?.length?item.solution_steps:item.alternate_solution_steps)||[];return list.length?list:[{equation:item.prompt,explanation:item.tutor_behavior||'Use the lesson rule one justified step at a time.'},{equation:item.answer_key,explanation:'Check that the final expression is fully simplified.'}];}
  function solution(item,heading='Correct answer and full explanation'){return `<div class="solution-panel audit1-a11-practice-solution"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps(item).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('')}</ol></div>`;}
  function paused(fn){observer?.disconnect();fn();setTimeout(()=>observer?.observe(feedback,{childList:true,subtree:true}),0);}
  function upgrade(){
    const item=current();if(!item)return;
    const text=feedback.textContent||'';
    if(feedback.querySelector('[data-audit1-a11-practice-upgraded="true"]'))return;
    if(/Hint\s*3/i.test(text)){
      paused(()=>feedback.insertAdjacentHTML('beforeend',`<div data-audit1-a11-practice-upgraded="true">${solution(item,'Hint 3: answer and complete reasoning')}</div>`));return;
    }
    if(/Not correct yet|Review this one|Not quite/i.test(text)){
      paused(()=>{feedback.innerHTML=`<div data-audit1-a11-practice-upgraded="true"><div class="lesson-state lesson-state-warning"><strong>Review your attempt.</strong><p>Your first-attempt score is recorded. Compare your work with the complete solution below.</p></div>${solution(item)}</div>`;answer.disabled=true;check.disabled=true;stuck.disabled=true;explain.disabled=true;next.hidden=false;next.textContent='Review Solution & Continue →';});return;
    }
    if(/^Correct/i.test(text.trim())&&!feedback.querySelector('.solution-panel')){
      paused(()=>feedback.innerHTML=`<div data-audit1-a11-practice-upgraded="true"><div class="lesson-state lesson-state-success"><strong>Correct.</strong><p>Use the reasoning below to verify every step.</p></div>${solution(item,'Why this answer is correct')}</div>`);
    }
  }
  async function start(){try{const response=await fetch(path);if(response.ok){const module=await response.json();promptMap=new Map((module.items||[]).map(item=>[(item.prompt||'').trim(),item]));}}catch(error){console.warn('A.11 practice audit help unavailable',error);}observer=new MutationObserver(upgrade);observer.observe(feedback,{childList:true,subtree:true});upgrade();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();