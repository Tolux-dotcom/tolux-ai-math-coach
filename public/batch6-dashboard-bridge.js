(() => {
  const modules=[
    {id:'alg1-a2c-equations-from-representations',skill:'A.2C',label:'A.2C • Write Lines from Tables, Graphs, and Descriptions',summary:'Translate tables, graphs, and verbal descriptions into slope, intercept, and a linear equation.'},
    {id:'alg1-a2d-direct-variation',skill:'A.2D',label:'A.2D • Direct Variation',summary:'Recognize y=kx, find the constant of variation, and model proportional relationships.'},
    {id:'alg1-a2e-parallel-lines',skill:'A.2E',label:'A.2E • Equations of Parallel Lines',summary:'Keep the same slope and use a required point to write a parallel line.'},
    {id:'alg1-a2f-perpendicular-lines',skill:'A.2F',label:'A.2F • Equations of Perpendicular Lines',summary:'Use negative reciprocal slopes and a required point to write perpendicular lines.'},
    {id:'alg1-a2g-horizontal-vertical-lines',skill:'A.2G',label:'A.2G • Horizontal and Vertical Lines',summary:'Write y=c and x=c lines, classify zero and undefined slope, and relate them to the coordinate axes.'}
  ];
  function ensure(select,value,label){if(!select)return;let option=[...select.options].find(o=>o.value===value);if(!option){option=document.createElement('option');option.value=value;select.append(option);}option.disabled=false;delete option.dataset.toluxPlaceholder;option.textContent=label;}
  function renderSummary(){const select=document.querySelector('#tutorSkillSelect');const summary=document.querySelector('#tutorLessonSummary');if(!select||!summary)return;const m=modules.find(x=>x.id===select.value);if(!m)return;summary.innerHTML=`<strong>${m.label}</strong><p>${m.summary}</p><small>Lesson path: Learn visually → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>`;}
  function sync(){const tutor=document.querySelector('#tutorSkillSelect'),practice=document.querySelector('#practiceSkillSelect');if(!tutor||!practice||!tutor.options.length||!practice.options.length)return false;modules.forEach(m=>{ensure(tutor,m.id,m.label);ensure(practice,m.skill,m.label);});renderSummary();return true;}
  function start(){document.querySelector('#tutorSkillSelect')?.addEventListener('change',renderSummary);let n=0;const timer=setInterval(()=>{n++;if(sync()||n>=100)clearInterval(timer);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();