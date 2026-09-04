(() => {
  const CONFIG={
    'alg1-a3d-graph-linear-inequalities':{path:'/a3d-graph-linear-inequalities.json',rule:'Graph the boundary first. Use solid for ≤/≥, dashed for </>, then shade the side that satisfies the inequality.'},
    'alg1-a3e-linear-transformations':{path:'/a3e-linear-transformations.json',rule:'Compare with y=x: slope changes tilt and direction; changing b shifts the line vertically without changing slope.'},
    'alg1-a3f-graph-linear-systems':{path:'/a3f-graph-linear-systems.json',rule:'The system solution is the point shared by both graphs. One intersection = one solution, parallel distinct lines = none, same line = infinitely many.'},
    'alg1-a3g-estimate-system-solutions':{path:'/a3g-estimate-system-solutions.json',rule:'Estimate the intersection from the grid, check the axis scale, and interpret both coordinates with units and reasonable precision.'},
    'alg1-a3h-graph-systems-of-inequalities':{path:'/a3h-graph-systems-of-inequalities.json',rule:'Graph each inequality separately, then keep only the overlapping shaded region because points there satisfy both inequalities.'}
  };
  const params=new URLSearchParams(location.search);const moduleId=params.get('module');const config=CONFIG[moduleId];if(!config)return;
  let itemMap=new Map(),observer;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  const isMastery=()=>/Mastery Check/i.test(document.querySelector('#lessonStage')?.textContent||'');
  function solution(item,heading='Correct answer and full explanation'){
    if(!item)return'';
    const raw=(item.solution_steps&&item.solution_steps.length)?item.solution_steps:(item.alternate_solution_steps||[]);
    const steps=raw.map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel batch8-reveal" data-batch8-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function paused(fn){observer?.disconnect();fn();setTimeout(()=>observer?.observe(document.querySelector('#lessonFeedback'),{childList:true,subtree:true}),0);}
  function strengthen(){
    if(isMastery())return;
    const feedback=document.querySelector('#lessonFeedback');if(!feedback||feedback.querySelector('[data-batch8-reveal="true"]'))return;
    const text=feedback.textContent||'';const item=itemMap.get(currentId());if(!item)return;
    const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text);
    const third=/hint\s*3/i.test(text);const alt=/another way/i.test(text);
    if(!(wrong||third||alt))return;
    paused(()=>{
      feedback.insertAdjacentHTML('beforeend',solution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));
      if(wrong){
        const answer=document.querySelector('#lessonAnswer'),check=document.querySelector('#submitLessonAnswer'),next=document.querySelector('#nextLessonStep');
        if(answer)answer.disabled=true;if(check)check.disabled=true;
        if(next){next.textContent='Review Solution & Continue →';next.style.display='inline-block';}
      }
    });
  }
  async function start(){
    try{const response=await fetch(config.path);if(response.ok){const module=await response.json();itemMap=new Map((module.items||[]).map(i=>[i.id,i]));}}catch(error){console.warn('Batch 8 help bank unavailable',error);}
    const feedback=document.querySelector('#lessonFeedback');if(!feedback)return;
    observer=new MutationObserver(strengthen);observer.observe(feedback,{childList:true,subtree:true});strengthen();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();