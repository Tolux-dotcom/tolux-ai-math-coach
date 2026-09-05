(() => {
  const params=new URLSearchParams(location.search);
  const isLesson=params.get('module')==='alg1-a3f-graph-linear-systems';
  const isPractice=params.get('skill')==='A.3F';
  if(!isLesson&&!isPractice)return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const XMIN=-6,XMAX=6,YMIN=-10,YMAX=10,LEFT=72,TOP=28,W=480,H=360;
  const sx=x=>LEFT+(x-XMIN)/(XMAX-XMIN)*W;
  const sy=y=>TOP+(YMAX-y)/(YMAX-YMIN)*H;
  const coef=value=>value===''||value==='+'?1:value==='-'?-1:Number(value);

  function parseLinear(raw){
    const s=String(raw||'').replace(/\s+/g,'').replace(/[−–—]/g,'-');
    let m=s.match(/^y=([+-]?(?:\d+(?:\.\d+)?)?)x([+-]\d+(?:\.\d+)?)?$/i);
    if(m)return{m:coef(m[1]),b:Number(m[2]||0),label:s};
    m=s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)y=([+-]?(?:\d+(?:\.\d+)?)?)x([+-]\d+(?:\.\d+)?)?$/i);
    if(m){const B=coef(m[1]);return{m:coef(m[2])/B,b:Number(m[3]||0)/B,label:s};}
    m=s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x([+-](?:\d+(?:\.\d+)?)?)y=([+-]?\d+(?:\.\d+)?)$/i);
    if(m){const A=coef(m[1]),B=coef(m[2]),C=Number(m[3]);if(B!==0)return{m:-A/B,b:C/B,label:s};}
    return null;
  }

  function extractEquations(text){
    const match=String(text||'').match(/(?:graphs?\s+of|lines|classify)\s+(.+?)\s+and\s+(.+?)(?:\s+intersect|\.|$)/i);
    if(!match)return[];
    return [parseLinear(match[1]),parseLinear(match[2])].filter(Boolean);
  }

  function statedPoint(text){
    const m=String(text||'').match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
    return m?{x:Number(m[1]),y:Number(m[2])}:null;
  }

  function lineThrough(point,m,label){return{m,b:point.y-m*point.x,label};}

  function systemFor(text){
    const equations=extractEquations(text);
    if(equations.length===2)return equations;
    const point=statedPoint(text);
    if(point)return[lineThrough(point,1,'Line 1'),lineThrough(point,-1,'Line 2')];
    if(/nonparallel|cross once|one solution/i.test(text))return[{m:1,b:1,label:'Line 1'},{m:-1,b:5,label:'Line 2'}];
    if(/parallel|no solution/i.test(text))return[{m:.75,b:3,label:'Line 1'},{m:.75,b:-3,label:'Line 2'}];
    if(/same line|infinitely many/i.test(text))return[{m:-1,b:4,label:'Equation 1'},{m:-1,b:4,label:'Equation 2'}];
    return[{m:1,b:1,label:'Line 1'},{m:-1,b:5,label:'Line 2'}];
  }

  function tickText(){
    let out='';
    for(let x=XMIN;x<=XMAX;x+=1){const px=sx(x);out+=`<line x1="${px}" y1="${TOP}" x2="${px}" y2="${TOP+H}" stroke="${x===0?'#64748b':'#e2e8f0'}" stroke-width="${x===0?2:1}"/>`;if(x!==0)out+=`<text x="${px}" y="${TOP+H+22}" text-anchor="middle" font-size="12">${x}</text>`;}
    for(let y=YMIN;y<=YMAX;y+=1){const py=sy(y);out+=`<line x1="${LEFT}" y1="${py}" x2="${LEFT+W}" y2="${py}" stroke="${y===0?'#64748b':'#e2e8f0'}" stroke-width="${y===0?2:1}"/>`;if(y!==0&&y%2===0)out+=`<text x="${LEFT-10}" y="${py+4}" text-anchor="end" font-size="12">${y}</text>`;}
    out+=`<text x="${LEFT+W+15}" y="${sy(0)+5}" font-size="14">x</text><text x="${sx(0)+8}" y="${TOP-9}" font-size="14">y</text><text x="${sx(0)-9}" y="${sy(0)+17}" font-size="12">0</text>`;
    return out;
  }

  function graphMarkup(text){
    const lines=systemFor(text);const [a,b]=lines;
    const same=Math.abs(a.m-b.m)<1e-9&&Math.abs(a.b-b.b)<1e-9;
    const parallel=Math.abs(a.m-b.m)<1e-9&&!same;
    const ix=parallel||same?null:(b.b-a.b)/(a.m-b.m);const iy=ix===null?null:a.m*ix+a.b;
    const colors=['#2563eb','#dc2626'];
    const drawn=lines.map((line,i)=>`<line x1="${sx(XMIN)}" y1="${sy(line.m*XMIN+line.b)}" x2="${sx(XMAX)}" y2="${sy(line.m*XMAX+line.b)}" stroke="${colors[i]}" stroke-width="4" ${same&&i===1?'stroke-dasharray="10 7"':''}/>`).join('');
    const marker=ix!==null&&ix>=XMIN&&ix<=XMAX&&iy>=YMIN&&iy<=YMAX?`<circle cx="${sx(ix)}" cy="${sy(iy)}" r="7" fill="#111827"/><circle cx="${sx(ix)}" cy="${sy(iy)}" r="13" fill="none" stroke="#111827" stroke-width="2"/>`:'';
    const relation=same?'The two equations lie on the same line.':parallel?'The lines have the same slope and different intercepts.':'Read the shared point where the two lines cross.';
    return `<section class="a3f-problem-graph" data-a3f-graph="true" style="margin:14px 0 18px;padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#fff"><h3 style="margin-top:0">Solve from the actual graph</h3><svg viewBox="0 0 640 440" role="img" aria-label="Coordinate plane showing both lines in this system" style="width:100%;max-width:780px;display:block;margin:auto"><defs><clipPath id="a3f-problem-clip"><rect x="${LEFT}" y="${TOP}" width="${W}" height="${H}"/></clipPath></defs>${tickText()}<g clip-path="url(#a3f-problem-clip)">${drawn}${marker}</g></svg><div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center"><span><strong style="color:${colors[0]}">Blue:</strong> ${esc(a.label)}</span><span><strong style="color:${colors[1]}">Red:</strong> ${esc(b.label)}</span></div><p style="margin-bottom:0"><strong>Use the graph:</strong> ${esc(relation)} The numbered axes use a consistent scale so you can determine the solution graphically.</p></section>`;
  }

  let observer=null;
  function promptNode(){return isLesson?document.querySelector('#lessonContent .math-prompt'):document.querySelector('#practicePrompt');}
  function render(){
    const prompt=promptNode();if(!prompt)return;
    const text=prompt.textContent.trim();if(!text)return;
    const current=prompt.parentElement?.querySelector('.a3f-problem-graph');
    if(current?.dataset.prompt===text)return;
    observer?.disconnect();
    current?.remove();
    const wrap=document.createElement('div');wrap.innerHTML=graphMarkup(text);const graph=wrap.firstElementChild;graph.dataset.prompt=text;prompt.insertAdjacentElement('afterend',graph);
    setTimeout(connect,0);
  }
  function connect(){
    const root=isLesson?document.querySelector('#lessonContent'):document.querySelector('#practicePrompt');if(!root)return;
    observer=new MutationObserver(render);observer.observe(root,{childList:true,subtree:true,characterData:true});render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect,{once:true});else connect();
})();