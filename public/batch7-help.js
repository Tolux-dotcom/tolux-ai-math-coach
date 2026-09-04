(() => {
  const CONFIG={
    'alg1-a2h-write-linear-inequalities':{path:'/a2h-write-linear-inequalities.json',rule:'Graph the boundary first. Solid means equality included; dashed means excluded. Use a test point or the shaded region to choose the solution side.'},
    'alg1-a2i-write-linear-systems':{path:'/a2i-write-linear-systems.json',rule:'A system has two equations using the same variables. Read or build each line separately, then keep both equations together. Their intersection is the shared solution.'},
    'alg1-a3a-determine-slope':{path:'/a3a-determine-slope.json',rule:'Slope is rise/run = (y₂-y₁)/(x₂-x₁). Keep coordinate subtraction in the same order and preserve the sign.'},
    'alg1-a3b-rate-of-change':{path:'/a3b-rate-of-change.json',rule:'Rate of change is change in output divided by change in input. Include units and interpret the sign in the real situation.'},
    'alg1-a3c-graph-linear-functions':{path:'/a3c-graph-linear-functions.json',rule:'For y=mx+b, plot (0,b), use m=rise/run for another point, draw the line, and read the zero where the graph crosses the x-axis.'}
  };
  const params=new URLSearchParams(location.search);const moduleId=params.get('module');const config=CONFIG[moduleId];if(!config)return;
  let itemMap=new Map();
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  function solution(item,heading='Correct answer and full explanation'){
    if(!item)return'';
    const steps=(item.solution_steps||item.alternate_solution_steps||[]).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel batch7-reveal" data-batch7-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function strengthen(){
    const feedback=document.querySelector('#lessonFeedback');if(!feedback||feedback.querySelector('[data-batch7-reveal="true"]'))return;
    const text=feedback.textContent||'';const item=itemMap.get(currentId());if(!item)return;
    const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text);
    const third=/hint\s*3/i.test(text);const alt=/another way/i.test(text);
    if(wrong||third||alt)feedback.insertAdjacentHTML('beforeend',solution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));
  }
  async function start(){
    try{const response=await fetch(config.path);if(response.ok){const module=await response.json();itemMap=new Map((module.items||[]).map(i=>[i.id,i]));}}catch(error){console.warn('Batch 7 help bank unavailable',error);}
    const feedback=document.querySelector('#lessonFeedback');if(!feedback)return;
    const observer=new MutationObserver(strengthen);observer.observe(feedback,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();