(() => {
  const params=new URLSearchParams(window.location.search);if(params.get('module')!=='alg1-a12a-identify-functions')return;
  let itemMap=new Map(),observer=null;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentItemId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  const isMastery=()=>/Mastery Check/i.test(document.querySelector('#lessonStage')?.textContent||'');
  function fullSolution(item,heading='Correct answer and full explanation'){
    if(!item)return'';const source=item.solution_steps?.length?item.solution_steps:item.alternate_solution_steps||[];const steps=source.map((step,index)=>`<li><span class="solution-step-number">${index+1}</span><div><div class="math-line">${esc(step.equation)}</div><p>${esc(step.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel a12a-reveal" data-a12a-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Function rule to remember</strong><p>Each input must have exactly one output. Repeated outputs are allowed. One input with two different outputs means the relation is not a function.</p></div></div>`;
  }
  function paused(fn){observer?.disconnect();fn();setTimeout(()=>observer?.observe(document.querySelector('#lessonFeedback'),{childList:true,subtree:true}),0);}
  function strengthenFeedback(){
    const feedback=document.querySelector('#lessonFeedback');if(!feedback||isMastery()||feedback.querySelector('[data-a12a-reveal="true"]'))return;const text=feedback.textContent||'',item=itemMap.get(currentItemId());if(!item)return;
    const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text),third=/hint\s*3/i.test(text),alternate=/another way/i.test(text);if(!(wrong||third||alternate))return;
    paused(()=>{feedback.insertAdjacentHTML('beforeend',fullSolution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));if(wrong){const answer=document.querySelector('#lessonAnswer'),check=document.querySelector('#submitLessonAnswer'),next=document.querySelector('#nextLessonStep');if(answer)answer.disabled=true;if(check)check.disabled=true;if(next){next.textContent='Review Solution & Continue →';next.style.display='inline-block';}}});
  }
  async function start(){try{const response=await fetch('/a12a-identify-functions.json');if(response.ok){const module=await response.json();itemMap=new Map([...(module.items||[]),...(module.practice_bank||[])].map(item=>[item.id,item]));}}catch(error){console.warn('A.12A help bank unavailable:',error);}const feedback=document.querySelector('#lessonFeedback');if(!feedback)return;observer=new MutationObserver(strengthenFeedback);observer.observe(feedback,{childList:true,subtree:true});strengthenFeedback();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();