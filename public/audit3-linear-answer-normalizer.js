(() => {
  const params=new URLSearchParams(location.search);
  const moduleId=params.get('module');
  const skill=params.get('skill');
  const lessonModules=new Set(['alg1-a2c-equations-from-representations','alg1-a2d-direct-variation','alg1-a2e-parallel-lines','alg1-a2f-perpendicular-lines','alg1-a2g-horizontal-vertical-lines','alg1-a2h-write-linear-inequalities','alg1-a2i-write-linear-systems']);
  const practiceSkills=new Set(['A.2C','A.2D','A.2E','A.2F','A.2G','A.2H','A.2I']);
  if(!lessonModules.has(moduleId)&&!practiceSkills.has(skill))return;

  function formatNumber(n){return Number.isInteger(n)?String(n):String(Number(n.toFixed(10)));}
  function canonicalRelation(raw){
    const original=String(raw??'');
    const text=original.replace(/[−–—]/g,'-').replace(/\s+/g,'').replace(/\*/g,'');
    const match=text.match(/^([A-Za-z])((?:<=|>=|=|<|>|≤|≥))(.+)$/);
    if(!match)return original;
    const lhs=match[1],op=match[2],rhs=match[3];
    if(/[()\/^]/.test(rhs))return original;
    let split=rhs.replace(/-/g,'+-');
    if(split.startsWith('+-'))split=split.slice(1);
    const terms=split.split('+').filter(Boolean);
    if(!terms.length||terms.length>3)return original;
    let variable=null,coef=0,constant=0;
    for(const term of terms){
      const vm=term.match(/^([+-]?)(\d*(?:\.\d+)?)?([A-Za-z])$/);
      if(vm){
        const v=vm[3];
        if(variable&&variable.toLowerCase()!==v.toLowerCase())return original;
        variable=v;
        const sign=vm[1]==='-'?-1:1;
        const c=vm[2]===''||vm[2]===undefined?1:Number(vm[2]);
        if(!Number.isFinite(c))return original;
        coef+=sign*c;
        continue;
      }
      if(/^[-+]?\d+(?:\.\d+)?$/.test(term)){constant+=Number(term);continue;}
      return original;
    }
    if(!variable)return original;
    let rhsOut='';
    if(Math.abs(coef)>1e-12){
      if(Math.abs(coef-1)<1e-12)rhsOut=variable;
      else if(Math.abs(coef+1)<1e-12)rhsOut=`-${variable}`;
      else rhsOut=`${formatNumber(coef)}${variable}`;
    }
    if(Math.abs(constant)>1e-12||!rhsOut){
      const c=formatNumber(Math.abs(constant));
      rhsOut+=rhsOut?(constant>=0?`+${c}`:`-${c}`):formatNumber(constant);
    }
    return `${lhs}${op}${rhsOut}`;
  }
  function canonicalAnswer(value){
    const parts=String(value??'').split(';');
    return parts.length>1?parts.map(canonicalRelation).join(';'):canonicalRelation(value);
  }
  function normalizeInput(input){
    if(!input)return;const before=input.value,after=canonicalAnswer(before);
    if(after!==before){input.value=after;input.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#submitLessonAnswer'))normalizeInput(document.querySelector('#lessonAnswer'));
    if(e.target.closest('#checkPracticeAnswer'))normalizeInput(document.querySelector('#practiceAnswer'));
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches?.('#lessonAnswer,#practiceAnswer'))normalizeInput(e.target);},true);
  window.__toluxCanonicalLinearAnswer=canonicalAnswer;
})();