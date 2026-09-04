(() => {
  const modules=[
    {id:'alg1-a4a-correlation-coefficient',skill:'A.4A',label:'A.4A • Correlation Coefficient',summary:'Use technology-generated correlation coefficients and scatterplots to describe direction and strength of linear association.'},
    {id:'alg1-a4b-association-causation',skill:'A.4B',label:'A.4B • Association versus Causation',summary:'Distinguish statistical association from causal evidence and recognize lurking variables and study design.'},
    {id:'alg1-a4c-linear-regression',skill:'A.4C',label:'A.4C • Linear Models for Data',summary:'Fit and interpret linear models, make predictions, and judge interpolation versus extrapolation.'},
    {id:'alg1-a5a-linear-equations',skill:'A.5A',label:'A.5A • Solving Linear Equations',summary:'Solve one-variable linear equations with distribution, variables on both sides, special cases, and verification.'},
    {id:'alg1-a5b-linear-inequalities',skill:'A.5B',label:'A.5B • Solving Linear Inequalities',summary:'Solve and graph one-variable inequalities, including the critical rule for reversing direction after negative multiplication or division.'}
  ];
  function ensure(select,value,label){if(!select)return;let option=[...select.options].find(o=>o.value===value);if(!option){option=document.createElement('option');option.value=value;select.append(option);}option.disabled=false;delete option.dataset.toluxPlaceholder;option.textContent=label;}
  function renderSummary(){const select=document.querySelector('#tutorSkillSelect');const summary=document.querySelector('#tutorLessonSummary');if(!select||!summary)return;const m=modules.find(x=>x.id===select.value);if(!m)return;summary.innerHTML=`<strong>${m.label}</strong><p>${m.summary}</p><small>Lesson path: Learn visually → Watch Tolux model the reasoning → Guided practice → Independent practice → Mastery check</small>`;}
  function sync(){const tutor=document.querySelector('#tutorSkillSelect'),practice=document.querySelector('#practiceSkillSelect');if(!tutor||!practice||!tutor.options.length||!practice.options.length)return false;modules.forEach(m=>{ensure(tutor,m.id,m.label);ensure(practice,m.skill,m.label);});renderSummary();return true;}
  function start(){document.querySelector('#tutorSkillSelect')?.addEventListener('change',renderSummary);let n=0;const timer=setInterval(()=>{n++;if(sync()||n>=100)clearInterval(timer);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();