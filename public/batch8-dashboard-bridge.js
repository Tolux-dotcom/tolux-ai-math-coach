(() => {
  const modules=[
    {id:'alg1-a3d-graph-linear-inequalities',skill:'A.3D',label:'A.3D • Graph Linear Inequalities',summary:'Graph two-variable linear inequalities using solid/dashed boundaries, test points, and shaded half-planes.'},
    {id:'alg1-a3e-linear-transformations',skill:'A.3E',label:'A.3E • Transform the Linear Parent Function',summary:'Compare transformed lines with y=x by seeing changes in slope, direction, and vertical position.'},
    {id:'alg1-a3f-graph-linear-systems',skill:'A.3F',label:'A.3F • Graph Systems of Linear Equations',summary:'Graph two lines, read their intersection, and classify one, none, or infinitely many solutions.'},
    {id:'alg1-a3g-estimate-system-solutions',skill:'A.3G',label:'A.3G • Estimate System Solutions from Graphs',summary:'Estimate graphical intersections using axis scale and interpret both coordinates in context.'},
    {id:'alg1-a3h-graph-systems-of-inequalities',skill:'A.3H',label:'A.3H • Graph Systems of Linear Inequalities',summary:'Graph two inequalities and identify the overlapping shaded region that satisfies both.'}
  ];
  function ensure(select,value,label){if(!select)return;let option=[...select.options].find(o=>o.value===value);if(!option){option=document.createElement('option');option.value=value;select.append(option);}option.disabled=false;delete option.dataset.toluxPlaceholder;option.textContent=label;}
  function renderSummary(){const select=document.querySelector('#tutorSkillSelect');const summary=document.querySelector('#tutorLessonSummary');if(!select||!summary)return;const m=modules.find(x=>x.id===select.value);if(!m)return;summary.innerHTML=`<strong>${m.label}</strong><p>${m.summary}</p><small>Lesson path: Learn visually with actual graphs → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>`;}
  function sync(){const tutor=document.querySelector('#tutorSkillSelect'),practice=document.querySelector('#practiceSkillSelect');if(!tutor||!practice||!tutor.options.length||!practice.options.length)return false;modules.forEach(m=>{ensure(tutor,m.id,m.label);ensure(practice,m.skill,m.label);});renderSummary();return true;}
  function start(){document.querySelector('#tutorSkillSelect')?.addEventListener('change',renderSummary);let n=0;const timer=setInterval(()=>{n++;if(sync()||n>=100)clearInterval(timer);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

if(!document.querySelector('script[data-tolux-batch9-bridge]')){
  const script=document.createElement('script');
  script.src='/batch9-dashboard-bridge.js';
  script.defer=true;
  script.dataset.toluxBatch9Bridge='true';
  document.head.append(script);
}
