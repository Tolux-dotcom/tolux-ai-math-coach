(() => {
  const moduleId=new URLSearchParams(location.search).get('module');
  const allowed=new Set(['alg1-a2h-write-linear-inequalities','alg1-a2i-write-linear-systems','alg1-a3a-determine-slope','alg1-a3b-rate-of-change','alg1-a3c-graph-linear-functions']);
  if(!allowed.has(moduleId))return;

  const card=(title,body)=>`<article class="batch7-visual-card" style="border:1px solid #cbd5e1;border-radius:16px;padding:18px;background:#fff;margin-bottom:16px"><h3 style="margin-top:0">${title}</h3>${body}</article>`;
  const grid=`<g stroke="#e2e8f0" stroke-width="1">${[80,120,160,200,240,280,320,360,400,440].map(x=>`<line x1="${x}" y1="30" x2="${x}" y2="270"/>`).join('')}${[50,90,130,170,210,250].map(y=>`<line x1="50" y1="${y}" x2="470" y2="${y}"/>`).join('')}</g><line x1="50" y1="170" x2="470" y2="170" stroke="#64748b" stroke-width="2"/><line x1="240" y1="280" x2="240" y2="25" stroke="#64748b" stroke-width="2"/><text x="454" y="163" font-size="14">x</text><text x="248" y="38" font-size="14">y</text>`;

  function a2h(){return card('Visual graph: boundary style and shading',`
    <svg viewBox="0 0 520 310" role="img" aria-label="Linear inequality graph showing a dashed boundary and shaded solution region" style="width:100%;max-width:720px;display:block;margin:auto">
      ${grid}
      <polygon points="50,30 470,30 470,92 50,252" fill="rgba(37,99,235,.16)"/>
      <line x1="60" y1="248" x2="460" y2="88" stroke="#1d4ed8" stroke-width="4" stroke-dasharray="10 8"/>
      <text x="320" y="65" font-size="16" font-weight="700">SHADED: solutions</text>
      <text x="300" y="112" font-size="15">dashed boundary → equality excluded</text>
      <circle cx="240" cy="170" r="6" fill="#16a34a"/><text x="250" y="190" font-size="14">test point (0,0)</text>
    </svg>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:12px">
      <div><strong>1. Boundary</strong><p>Change the inequality to an equation and graph the line.</p></div>
      <div><strong>2. Style</strong><p><b>≤ or ≥ → solid</b><br><b>&lt; or &gt; → dashed</b></p></div>
      <div><strong>3. Shade</strong><p>Test a point. Shade the side that makes the inequality true.</p></div>
    </div>`);}

  function a2i(){return card('Visual graph: two equations, one shared solution',`
    <svg viewBox="0 0 520 310" role="img" aria-label="System of two linear equations intersecting at one point" style="width:100%;max-width:720px;display:block;margin:auto">
      ${grid}
      <line x1="70" y1="245" x2="450" y2="55" stroke="#2563eb" stroke-width="4"/>
      <line x1="75" y1="70" x2="450" y2="245" stroke="#dc2626" stroke-width="4"/>
      <circle cx="270" cy="145" r="8" fill="#111827"/>
      <text x="280" y="137" font-size="15" font-weight="700">intersection</text>
      <text x="370" y="75" font-size="15" fill="#2563eb">line 1</text>
      <text x="370" y="230" font-size="15" fill="#dc2626">line 2</text>
    </svg>
    <p><strong>Read each line separately.</strong> Write one equation for the blue line and one for the red line. Their crossing point satisfies both equations and is the system's solution.</p>`);}

  function a3a(){return card('Visual graph: slope = rise/run',`
    <svg viewBox="0 0 520 310" role="img" aria-label="Line graph with slope triangle showing rise and run" style="width:100%;max-width:720px;display:block;margin:auto">
      ${grid}
      <line x1="85" y1="245" x2="440" y2="67" stroke="#111827" stroke-width="4"/>
      <circle cx="160" cy="208" r="7" fill="#2563eb"/><circle cx="320" cy="128" r="7" fill="#2563eb"/>
      <line x1="160" y1="208" x2="320" y2="208" stroke="#7c3aed" stroke-width="5"/>
      <line x1="320" y1="208" x2="320" y2="128" stroke="#16a34a" stroke-width="5"/>
      <text x="225" y="230" font-size="16" font-weight="700">run</text>
      <text x="330" y="172" font-size="16" font-weight="700">rise</text>
    </svg>
    <div style="font-size:20px;text-align:center;margin-top:8px"><strong>m = rise/run = (y₂-y₁)/(x₂-x₁)</strong></div>
    <p>Move from the first point to the second. Count the vertical change first, then the horizontal change. A downward rise gives a negative slope.</p>`);}

  function a3b(){return card('Visual graph: rate of change has units',`
    <svg viewBox="0 0 520 310" role="img" aria-label="Distance versus time graph with rate triangle" style="width:100%;max-width:720px;display:block;margin:auto">
      <g stroke="#e2e8f0" stroke-width="1">${[100,160,220,280,340,400,460].map(x=>`<line x1="${x}" y1="35" x2="${x}" y2="255"/>`).join('')}${[55,95,135,175,215,255].map(y=>`<line x1="70" y1="${y}" x2="470" y2="${y}"/>`).join('')}</g>
      <line x1="70" y1="255" x2="475" y2="255" stroke="#64748b" stroke-width="2"/><line x1="70" y1="260" x2="70" y2="30" stroke="#64748b" stroke-width="2"/>
      <line x1="100" y1="225" x2="430" y2="65" stroke="#2563eb" stroke-width="4"/>
      <circle cx="160" cy="196" r="7" fill="#111827"/><circle cx="340" cy="109" r="7" fill="#111827"/>
      <line x1="160" y1="196" x2="340" y2="196" stroke="#7c3aed" stroke-width="5"/><line x1="340" y1="196" x2="340" y2="109" stroke="#16a34a" stroke-width="5"/>
      <text x="205" y="220" font-size="15">Δ time (hours)</text><text x="352" y="158" font-size="15">Δ distance (miles)</text>
      <text x="300" y="285" font-size="15">time</text><text x="10" y="135" font-size="15" transform="rotate(-90 20 135)">distance</text>
    </svg>
    <p><strong>Rate = change in output / change in input.</strong> On this graph that means miles per hour. Always attach the correct units and interpret whether the quantity is increasing or decreasing.</p>`);}

  function a3c(){return card('Visual graph: plot intercept, use slope, read key features',`
    <svg viewBox="0 0 520 310" role="img" aria-label="Linear function graph with slope triangle, y-intercept, x-intercept, and zero labeled" style="width:100%;max-width:720px;display:block;margin:auto">
      ${grid}
      <line x1="100" y1="260" x2="430" y2="62" stroke="#111827" stroke-width="4"/>
      <circle cx="240" cy="170" r="8" fill="#dc2626"/><text x="250" y="192" font-size="14">x-intercept / zero</text>
      <circle cx="200" cy="194" r="8" fill="#2563eb"/><text x="105" y="214" font-size="14">y-intercept</text>
      <circle cx="320" cy="122" r="7" fill="#111827"/>
      <line x1="200" y1="194" x2="320" y2="194" stroke="#7c3aed" stroke-width="5"/><line x1="320" y1="194" x2="320" y2="122" stroke="#16a34a" stroke-width="5"/>
      <text x="244" y="217" font-size="15">run</text><text x="330" y="164" font-size="15">rise</text>
    </svg>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:12px">
      <div><strong>Step 1</strong><p>Plot the y-intercept (0,b).</p></div><div><strong>Step 2</strong><p>Use slope m=rise/run to get another point.</p></div><div><strong>Step 3</strong><p>Draw the line and read the x-intercept/zero where y=0.</p></div>
    </div>`);}

  const visual={
    'alg1-a2h-write-linear-inequalities':a2h,
    'alg1-a2i-write-linear-systems':a2i,
    'alg1-a3a-determine-slope':a3a,
    'alg1-a3b-rate-of-change':a3b,
    'alg1-a3c-graph-linear-functions':a3c
  }[moduleId];

  function inject(){
    const content=document.querySelector('#lessonContent');
    const gridNode=content?.querySelector('.concept-grid');
    if(!content||!gridNode||content.dataset.batch7Visual==='true')return false;
    const wrap=document.createElement('section');
    wrap.className='batch7-visual-section';
    wrap.innerHTML=visual();
    gridNode.before(wrap);
    content.dataset.batch7Visual='true';
    return true;
  }
  let attempts=0;const timer=setInterval(()=>{attempts++;if(inject()||attempts>=120)clearInterval(timer);},100);
})();