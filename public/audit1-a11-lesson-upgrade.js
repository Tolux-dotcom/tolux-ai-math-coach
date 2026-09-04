(() => {
  const CONFIG={
    'alg1-a11a-radical-expressions':'/a11a-radical-expressions.json',
    'alg1-a11b-laws-of-exponents':'/a11b-laws-of-exponents.json'
  };
  const moduleId=new URLSearchParams(location.search).get('module');
  const path=CONFIG[moduleId];
  if(!path)return;
  const feedback=document.querySelector('#lessonFeedback'),stage=document.querySelector('#lessonStage'),answer=document.querySelector('#lessonAnswer'),check=document.querySelector('#submitLessonAnswer'),next=document.querySelector('#nextLessonStep');
  if(!feedback||!stage||!answer||!check||!next)return;
  let itemMap=new Map(),observer;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  const isMastery=()=>/Mastery Check/i.test(stage.textContent||'');
  function steps(item){const list=(item.solution_steps?.length?item.solution_steps:item.alternate_solution_steps)||[];return list.length?list:[{equation:item.prompt,explanation:item.tutor_behavior||'Use the lesson rule one justified step at a time.'},{equation:item.answer_key,explanation:'Check that the final expression is fully simplified.'}];}
  function solution(item,heading='Correct answer and full explanation'){return `<div class="solution-panel audit1-a11-solution" data-audit1-a11-solution="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps(item).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('')}</ol></div>`;}
  function paused(fn){observer?.disconnect();fn();setTimeout(()=>observer?.observe(feedback,{childList:true,subtree:true}),0);}
  function upgrade(){
    if(isMastery())return;
    const item=itemMap.get(currentId());if(!item)return;
    const text=feedback.textContent||'';
    if(feedback.querySelector('[data-audit1-a11-upgraded="true"]'))return;
    const hint=text.match(/Hint\s*3/i);
    if(hint){paused(()=>{feedback.insertAdjacentHTML('beforeend',`<div data-audit1-a11-upgraded="true">${solution(item,'Hint 3: answer and complete reasoning')}</div>`);});return;}
    if(/Not quite|Not correct|try the problem again|needs revision|incorrect/i.test(text)){
      paused(()=>{feedback.innerHTML=`<div data-audit1-a11-upgraded="true"><div class="lesson-state lesson-state-warning"><strong>Review your attempt.</strong><p>Your first attempt is recorded. Study the complete solution, then continue.</p></div>${solution(item)}</div>`;answer.disabled=true;check.disabled=true;next.textContent='Review Solution & Continue →';next.style.display='inline-block';});
    }
  }
  async function start(){try{const response=await fetch(path);if(response.ok){const module=await response.json();itemMap=new Map((module.items||[]).map(item=>[item.id,item]));}}catch(error){console.warn('A.11 audit help unavailable',error);}observer=new MutationObserver(upgrade);observer.observe(feedback,{childList:true,subtree:true});upgrade();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();