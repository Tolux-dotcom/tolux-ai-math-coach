(() => {
  const CONFIG={
    'alg1-a4a-correlation-coefficient':{path:'/a4a-correlation-coefficient.json',rule:'For correlation, the sign of r gives direction and |r| gives linear strength. Always compare the number with the scatterplot.'},
    'alg1-a4b-association-causation':{path:'/a4b-association-causation.json',rule:'Association describes a pattern. Causation is a stronger claim that depends on study design and alternative explanations such as lurking variables.'},
    'alg1-a4c-linear-regression':{path:'/a4c-linear-regression.json',rule:'A reasonable line of fit follows the center of a roughly linear scatterplot. Substitute x to predict y and be cautious when extrapolating beyond the observed data.'},
    'alg1-a5a-linear-equations':{path:'/a5a-linear-equations.json',rule:'Simplify first, keep both sides balanced, isolate the variable with inverse operations, and verify in the original equation.'},
    'alg1-a5b-linear-inequalities':{path:'/a5b-linear-inequalities.json',rule:'Solve like an equation, but reverse the inequality whenever you multiply or divide both sides by a negative number. Then represent the solution correctly.'}
  };
  const moduleId=new URLSearchParams(location.search).get('module');const config=CONFIG[moduleId];if(!config)return;
  let itemMap=new Map();
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const currentId=()=>{const spans=document.querySelectorAll('#lessonContent .question-header span');return spans.length?spans[spans.length-1].textContent.trim():'';};
  function fallbackSteps(item){
    const tag=item?.diagnostic_tag||'';
    const bank={
      distribution:[['Distribute to every term','Multiply the outside factor by each term inside the parentheses.'],['Combine like terms','Simplify before isolating the variable.'],[item?.answer_key,'Finish with inverse operations and verify the result.']],
      distribution_or_division:[['Choose an efficient first move','You may divide first when every term allows it, or distribute correctly.'],['Keep both sides equal','Perform the same legal operation on both sides.'],[item?.answer_key,'Isolate x and check in the original equation.']],
      variables_both_sides:[['Collect variable terms','Move x-terms to one side using the same operation on both sides.'],['Collect constants','Move constants to the opposite side.'],[item?.answer_key,'Divide by the remaining coefficient and verify.']],
      distribution_variables_both_sides:[['Distribute first','Remove parentheses accurately on both sides.'],['Collect like terms','Move variable terms together and constants together.'],[item?.answer_key,'Isolate x and check the solution.']],
      multi_step:[['Simplify each side','Distribute and combine like terms before moving terms.'],['Balance the equation','Move variable terms and constants with equal operations on both sides.'],[item?.answer_key,'Finish by dividing and verify.']],
      inverse_operations:[['Undo addition or subtraction','Use the inverse operation on both sides.'],['Undo multiplication or division','Keep the relationship balanced.'],[item?.answer_key,'State the solution and verify.']],
      negative_division_reversal:[['Simplify and isolate the variable term','Use valid inverse operations first.'],['Divide or multiply by a negative','Reverse the inequality direction at this exact step.'],[item?.answer_key,'Check a value from the solution set in the original inequality.']],
      graph_endpoint_direction:[['Read the symbol','Strict < or > uses an open endpoint; ≤ or ≥ uses a closed endpoint.'],['Read the direction','Greater values shade right; lesser values shade left.'],[item?.answer_key,'Match both endpoint type and direction.']]
    };
    return bank[tag]||[['Identify the mathematical structure','Use the rule that matches the question.'],['Work one justified step at a time','Keep notation and units consistent.'],[item?.answer_key,'Compare your result with the correct answer.']];
  }
  function solution(item,heading='Correct answer and full explanation'){
    if(!item)return'';
    const raw=(item.solution_steps&&item.solution_steps.length)?item.solution_steps:fallbackSteps(item).map(([equation,explanation])=>({equation,explanation}));
    const steps=raw.map((s,i)=>`<li><span class="solution-step-number">${i+1}</span><div><div class="math-line">${esc(s.equation)}</div><p>${esc(s.explanation)}</p></div></li>`).join('');
    return `<div class="solution-panel batch9-reveal" data-batch9-reveal="true"><h3>${esc(heading)}</h3><p><strong>Final answer:</strong> ${esc(item.answer_key)}</p><ol class="solution-steps">${steps}</ol><div class="lesson-state lesson-state-success"><strong>Rule to remember</strong><p>${esc(config.rule)}</p></div></div>`;
  }
  function strengthen(){
    const feedback=document.querySelector('#lessonFeedback');if(!feedback)return;
    const text=feedback.textContent||'';const item=itemMap.get(currentId());if(!item)return;
    const wrong=/not quite|not correct|try again|needs revision|incorrect/i.test(text);const third=/hint\s*3/i.test(text);const alt=/another way/i.test(text);
    if((wrong||third||alt)&&!feedback.querySelector('[data-batch9-reveal="true"]'))feedback.insertAdjacentHTML('beforeend',solution(item,wrong?'Check your work: answer and full solution':'Full explanation and answer'));
    if(wrong){const next=document.querySelector('#nextLessonStep');if(next){next.textContent='Review Solution & Continue →';next.style.display='inline-block';}}
  }
  async function start(){
    try{const response=await fetch(config.path);if(response.ok){const module=await response.json();itemMap=new Map((module.items||[]).map(i=>[i.id,i]));}}catch(error){console.warn('Batch 9 help bank unavailable',error);}
    const feedback=document.querySelector('#lessonFeedback');if(!feedback)return;const observer=new MutationObserver(strengthen);observer.observe(feedback,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();