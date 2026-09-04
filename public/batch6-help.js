(() => {
  const CONFIG={
    'alg1-a2c-equations-from-representations':{path:'/a2c-lines-from-representations.json',rule:'Translate the representation into slope and intercept: table/graph → rise over run; words → rate plus starting value; then verify with a known point.'},
    'alg1-a2d-direct-variation':{path:'/a2d-direct-variation.json',rule:'Direct variation has y=kx, passes through (0,0), and keeps y/x constant. Find k first, then substitute into y=kx.'},
    'alg1-a2e-parallel-lines':{path:'/a2e-parallel-lines.json',rule:'Parallel lines keep the same slope. Use the required point to find a new intercept.'},
    'alg1-a2f-perpendicular-lines':{path:'/a2f-perpendicular-lines.json',rule:'For ordinary non-axis lines, perpendicular slopes are negative reciprocals: flip the fraction and change the sign, then use the required point.'},
    'alg1-a2g-horizontal-vertical-lines':{path:'/a2g-horizontal-vertical-lines.json',rule:'Horizontal lines are y=c with slope 0. Vertical lines are x=c with undefined slope. Use the point coordinate that stays constant.'}
  };
  const moduleId=new URLSearchParams(location.search).get('module');const config=CONFIG[moduleId];if(!config)return;let itemMap=new Map();
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  function solution(item,heading='Correct answer and full explanation'){
    if(!item)return'';const steps=(item.solution_steps||item.alternate_solution_steps||[]).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel batch6-reveal" data-batch6-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function strengthen(){const f=document.querySelector('#lessonFeedback');if(!f||f.querySelector('[data-batch6-reveal="true"]'))return;const text=f.textContent||'';const item=itemMap.get(currentId());if(!item)return;const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text);const third=/hint\s*3/i.test(text);const alt=/another way/i.test(text);if(wrong||third||alt)f.insertAdjacentHTML('beforeend',solution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));}
  async function start(){try{const r=await fetch(config.path);if(r.ok){const m=await r.json();itemMap=new Map((m.items||[]).map(i=>[i.id,i]));}}catch(e){console.warn('Batch 6 help bank unavailable',e);}const f=document.querySelector('#lessonFeedback');if(!f)return;const o=new MutationObserver(strengthen);o.observe(f,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();