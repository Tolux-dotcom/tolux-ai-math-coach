(() => {
  const modules=[
    {id:'alg1-a12c-sequence-terms',skill:'A.12C',label:'A.12C • Terms of Arithmetic and Geometric Sequences',summary:'Determine sequence terms by recognizing constant differences, constant ratios, and recursive patterns.'},
    {id:'alg1-a12d-sequence-formulas',skill:'A.12D',label:'A.12D • Write Sequence Formulas',summary:'Write nth-term formulas for arithmetic and geometric sequences and understand why n-1 counts the jumps.'},
    {id:'alg1-a12e-literal-equations',skill:'A.12E',label:'A.12E • Solve Literal Equations',summary:'Rearrange mathematical and scientific formulas to isolate a specified variable.'},
    {id:'alg1-a2a-linear-domain-range',skill:'A.2A',label:'A.2A • Linear Domain and Range',summary:'Determine domain and range from linear rules, graphs, intervals, discrete situations, and real-world restrictions.'},
    {id:'alg1-a2b-equations-from-points',skill:'A.2B',label:'A.2B • Write Lines from Points and Slope',summary:'Write linear equations from slope, one point, or two points using slope-intercept, point-slope, and standard forms.'}
  ];
  function ensure(select,value,label){if(!select)return;let option=[...select.options].find(o=>o.value===value);if(!option){option=document.createElement('option');option.value=value;select.append(option);}option.disabled=false;delete option.dataset.toluxPlaceholder;option.textContent=label;}
  function renderSummary(){const select=document.querySelector('#tutorSkillSelect');const summary=document.querySelector('#tutorLessonSummary');if(!select||!summary)return;const m=modules.find(x=>x.id===select.value);if(!m)return;summary.innerHTML=`<strong>${m.label}</strong><p>${m.summary}</p><small>Lesson path: Learn visually → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>`;}
  function sync(){const tutor=document.querySelector('#tutorSkillSelect'),practice=document.querySelector('#practiceSkillSelect');if(!tutor||!practice||!tutor.options.length||!practice.options.length)return false;modules.forEach(m=>{ensure(tutor,m.id,m.label);ensure(practice,m.skill,m.label);});renderSummary();return true;}
  function start(){document.querySelector('#tutorSkillSelect')?.addEventListener('change',renderSummary);let n=0;const timer=setInterval(()=>{n++;if(sync()||n>=100)clearInterval(timer);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();