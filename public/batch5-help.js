(() => {
  const CONFIG = {
    'alg1-a12c-sequence-terms': { path:'/a12c-sequence-terms.json', rule:'Arithmetic sequences repeat a difference. Geometric sequences repeat a ratio. Count term numbers carefully.' },
    'alg1-a12d-sequence-formulas': { path:'/a12d-sequence-formulas.json', rule:'Arithmetic: aₙ=a₁+(n-1)d. Geometric: aₙ=a₁(r)ⁿ⁻¹. The n-1 counts the jumps after the first term.' },
    'alg1-a12e-literal-equations': { path:'/a12e-literal-equations.json', rule:'Circle the target variable, then undo operations in reverse order on both sides until that variable is isolated.' },
    'alg1-a2a-linear-domain-range': { path:'/a2a-linear-domain-range.json', rule:'Domain means inputs/x-values; range means outputs/y-values. Context and endpoint inclusion can restrict either set.' },
    'alg1-a2b-equations-from-points': { path:'/a2b-equations-from-points.json', rule:'A slope and one point determine a line. Use rise/run, y=mx+b, or y-y₁=m(x-x₁), then convert forms if needed.' }
  };
  const params = new URLSearchParams(location.search); const moduleId=params.get('module'); const config=CONFIG[moduleId]; if(!config)return;
  let itemMap=new Map();
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  function solution(item,heading='Correct answer and full explanation'){
    if(!item)return''; const steps=(item.solution_steps||item.alternate_solution_steps||[]).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel batch5-reveal" data-batch5-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function strengthen(){
    const f=document.querySelector('#lessonFeedback'); if(!f||f.querySelector('[data-batch5-reveal="true"]'))return; const text=f.textContent||''; const item=itemMap.get(currentId()); if(!item)return;
    const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text); const third=/hint\s*3/i.test(text); const alt=/another way/i.test(text);
    if(wrong||third||alt) f.insertAdjacentHTML('beforeend',solution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));
  }
  async function start(){try{const r=await fetch(config.path);if(r.ok){const m=await r.json();itemMap=new Map((m.items||[]).map(i=>[i.id,i]));}}catch(e){console.warn('Batch help bank unavailable',e);} const f=document.querySelector('#lessonFeedback');if(!f)return;const o=new MutationObserver(strengthen);o.observe(f,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();