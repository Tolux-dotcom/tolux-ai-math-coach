(() => {
  const modules=[
    {id:'alg1-a2h-write-linear-inequalities',skill:'A.2H',label:'A.2H • Write Linear Inequalities in Two Variables',summary:'Write two-variable linear inequalities from graphs, tables, and real situations using boundary style and shaded regions.'},
    {id:'alg1-a2i-write-linear-systems',skill:'A.2I',label:'A.2I • Write Systems of Linear Equations',summary:'Write systems from graphs, tables, and descriptions and connect the intersection to the shared solution.'},
    {id:'alg1-a3a-determine-slope',skill:'A.3A',label:'A.3A • Determine Slope',summary:'Determine slope visually and algebraically from graphs, tables, points, and equations.'},
    {id:'alg1-a3b-rate-of-change',skill:'A.3B',label:'A.3B • Rate of Change in Context',summary:'Calculate and interpret rate of change with correct units from graphs, tables, and equations.'},
    {id:'alg1-a3c-graph-linear-functions',skill:'A.3C',label:'A.3C • Graph Linear Functions and Key Features',summary:'Graph lines from slope and intercepts and identify slope, intercepts, and zeros visually.'}
  ];
  function ensure(select,value,label){if(!select)return;let option=[...select.options].find(o=>o.value===value);if(!option){option=document.createElement('option');option.value=value;select.append(option);}option.disabled=false;delete option.dataset.toluxPlaceholder;option.textContent=label;}
  function renderSummary(){const select=document.querySelector('#tutorSkillSelect');const summary=document.querySelector('#tutorLessonSummary');if(!select||!summary)return;const m=modules.find(x=>x.id===select.value);if(!m)return;summary.innerHTML=`<strong>${m.label}</strong><p>${m.summary}</p><small>Lesson path: Learn visually with graphs → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>`;}
  function sync(){const tutor=document.querySelector('#tutorSkillSelect'),practice=document.querySelector('#practiceSkillSelect');if(!tutor||!practice||!tutor.options.length||!practice.options.length)return false;modules.forEach(m=>{ensure(tutor,m.id,m.label);ensure(practice,m.skill,m.label);});renderSummary();return true;}
  function start(){document.querySelector('#tutorSkillSelect')?.addEventListener('change',renderSummary);let n=0;const timer=setInterval(()=>{n++;if(sync()||n>=100)clearInterval(timer);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

if(!document.querySelector('script[data-tolux-batch8-bridge]')){
  const script=document.createElement('script');
  script.src='/batch8-dashboard-bridge.js';
  script.defer=true;
  script.dataset.toluxBatch8Bridge='true';
  document.head.append(script);
}
