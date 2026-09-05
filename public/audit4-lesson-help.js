(() => {
  const CONFIG={
    'alg1-a5c-linear-systems':{path:'/a5c-linear-systems.json',rule:'A system solution must make both equations true. Choose substitution when a variable is isolated and elimination when coefficients cancel efficiently.',alternate:'Think of the ordered pair as a meeting point. Solve for one coordinate with substitution or elimination, recover the other coordinate, then check the pair in both equations.'},
    'alg1-a6a-quadratic-domain-range':{path:'/a6a-quadratic-domain-range.json',rule:'An unrestricted quadratic has all real x-values. The vertex and opening direction determine the minimum or maximum y-value and therefore the range.',alternate:'Read the graph horizontally for domain and vertically for range. The vertex is the turning point: upward opening makes its y-value a minimum; downward opening makes it a maximum.'},
    'alg1-a6b-write-quadratics-from-vertex':{path:'/a6b-write-quadratics-from-vertex.json',rule:'Use vertex form y=a(x−h)²+k. Put the vertex into h and k, then substitute the extra point to solve for a.',alternate:'Anchor the parabola at its vertex first. Once h and k are fixed, the known point tells how vertically stretched, compressed, or reflected the parent parabola must be.'},
    'alg1-a6c-write-quadratics-from-solutions':{path:'/a6c-write-quadratics-from-solutions.json',rule:'Zeros r₁ and r₂ create factors (x−r₁)(x−r₂). Use another point or leading-coefficient information to determine a.',alternate:'Work backward from the x-intercepts. Each intercept turns into a zero factor; then use one more fact from the graph to set the vertical scale.'},
    'alg1-a7a-quadratic-key-features':{path:'/a7a-quadratic-key-features.json',rule:'Read vertex, axis of symmetry, zeros, y-intercept, opening, increasing/decreasing intervals, domain, and range from one consistent parabola.',alternate:'Use the axis of symmetry as the graph’s spine. Features on opposite sides mirror each other, the vertex is the turning point, and zeros are where y=0.'},
    'alg1-a7b-factors-and-zeros':{path:'/a7b-factors-and-zeros.json',rule:'A factor equals zero at its corresponding zero. Those zeros are the x-intercepts of the quadratic graph.',alternate:'Translate in a chain: factor → equation factor=0 → zero → point on the x-axis. Reverse the chain to write factors from graph intercepts.'},
    'alg1-a7c-quadratic-transformations':{path:'/a7c-quadratic-transformations.json',rule:'Relative to y=x², a controls reflection and width while h and k move the vertex to (h,k).',alternate:'Track the vertex first, then the shape. Horizontal and vertical shifts move the vertex; |a| changes width and the sign of a changes opening direction.'},
    'alg1-a8a-solve-quadratic-equations':{path:'/a8a-solve-quadratic-equations.json',rule:'Set the quadratic equal to zero, then choose an appropriate method such as factoring, square roots, completing the square, or the quadratic formula. Verify all solutions.',alternate:'The solutions are x-values where the parabola reaches y=0. Algebraically, use a method that exposes those x-values and check that each one satisfies the original equation.'},
    'alg1-a8b-quadratic-regression':{path:'/a8b-quadratic-regression.json',rule:'Use a quadratic model for data with a clear curved pattern and one turning direction. Interpret parameters and distinguish interpolation from extrapolation.',alternate:'Look for curvature rather than a constant rate. Fit the parabola to the center of the data, then judge predictions by whether the input lies inside the observed range.'},
    'alg1-a9a-exponential-domain-range':{path:'/a9a-exponential-domain-range.json',rule:'An unrestricted exponential accepts every real x. Its horizontal asymptote and coefficient determine which y-values are possible.',alternate:'Follow the graph toward its horizontal asymptote. The curve approaches but does not cross that boundary in the parent form, so the asymptote determines the excluded edge of the range.'}
  };
  const moduleId=new URLSearchParams(location.search).get('module');
  const config=CONFIG[moduleId];
  if(!config)return;

  const feedback=document.querySelector('#lessonFeedback');
  const stage=document.querySelector('#lessonStage');
  const answer=document.querySelector('#lessonAnswer');
  const check=document.querySelector('#submitLessonAnswer');
  const next=document.querySelector('#nextLessonStep');
  if(!feedback||!stage||!answer||!check||!next)return;

  let itemMap=new Map();
  let observer;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  const isMastery=()=>/Mastery Check/i.test(stage.textContent||'');

  function stepsFor(item){
    if(Array.isArray(item?.solution_steps)&&item.solution_steps.length)return item.solution_steps;
    if(Array.isArray(item?.alternate_solution_steps)&&item.alternate_solution_steps.length)return item.alternate_solution_steps;
    const hints=Array.isArray(item?.hint_steps)?item.hint_steps:[];
    if(hints.length)return hints.map((text,index)=>({equation:index===hints.length-1?item.answer_key:`Step ${index+1}`,explanation:text}));
    return [
      {equation:item?.prompt||'Start from the given information.',explanation:item?.tutor_behavior||'Identify the mathematical structure before choosing a method.'},
      {equation:item?.answer_key||'Verified result',explanation:'Use the matching rule, then check the result against the original equation, graph, or context.'}
    ];
  }
  function solution(item,heading='Correct answer and full explanation'){
    const steps=stepsFor(item).map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel audit4-solution"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="teaching-check"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function paused(fn){
    observer?.disconnect();
    fn();
    setTimeout(()=>observer?.observe(feedback,{childList:true,subtree:true}),0);
  }
  function upgrade(){
    if(isMastery())return;
    const item=itemMap.get(currentId());
    if(!item)return;
    if(feedback.querySelector('[data-audit4-upgraded="true"]'))return;
    const text=feedback.textContent||'';
    const wrong=/not quite|not correct|try again|review this|needs revision|incorrect/i.test(text);
    const third=/hint\s*3/i.test(text);
    const another=/another way/i.test(text);
    if(wrong){
      paused(()=>{
        feedback.innerHTML=`<div data-audit4-upgraded="true"><div class="lesson-state lesson-state-warning"><strong>Review your attempt.</strong><p>Your first attempt is recorded. Study the correct answer and complete reasoning, then continue.</p></div>${solution(item)}</div>`;
        answer.disabled=true;
        check.disabled=true;
        next.textContent='Review Solution & Continue →';
        next.style.display='inline-block';
      });
      return;
    }
    if(third){
      paused(()=>feedback.insertAdjacentHTML('beforeend',`<div data-audit4-upgraded="true"><div class="lesson-state lesson-state-warning"><strong>Hint 3: answer revealed</strong><p>${esc(item.answer_key)}</p></div>${solution(item,'Hint 3: answer and complete reasoning')}</div>`));
      return;
    }
    if(another){
      paused(()=>feedback.insertAdjacentHTML('beforeend',`<div data-audit4-upgraded="true"><div class="lesson-state lesson-state-success"><strong>Another complete approach</strong><p>${esc(config.alternate)}</p></div>${solution(item,'Step-by-step alternative explanation')}</div>`));
    }
  }
  async function start(){
    try{
      const response=await fetch(config.path);
      if(response.ok){
        const module=await response.json();
        itemMap=new Map([...(module.items||[]),...(module.practice_bank||[])].map(item=>[item.id,item]));
      }
    }catch(error){console.warn('Audit 4 lesson help unavailable',error);}
    observer=new MutationObserver(upgrade);
    observer.observe(feedback,{childList:true,subtree:true});
    upgrade();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();