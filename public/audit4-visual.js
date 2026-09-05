(() => {
  const moduleId = new URLSearchParams(location.search).get('module');
  const supported = new Set([
    'alg1-a5c-linear-systems',
    'alg1-a6a-quadratic-domain-range',
    'alg1-a6b-write-quadratics-from-vertex',
    'alg1-a6c-write-quadratics-from-solutions',
    'alg1-a7a-quadratic-key-features',
    'alg1-a7b-factors-and-zeros',
    'alg1-a7c-quadratic-transformations',
    'alg1-a8a-solve-quadratic-equations',
    'alg1-a8b-quadratic-regression'
  ]);
  if (!supported.has(moduleId)) return;

  const x0 = 300, y0 = 300, unit = 50;
  const sx = x => x0 + unit * x;
  const sy = y => y0 - unit * y;
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const pathFor = (fn, xmin=-5, xmax=5, step=.08) => {
    const pts=[];
    for(let x=xmin;x<=xmax+1e-9;x+=step){
      const y=fn(x);
      if(Number.isFinite(y) && y>=-6.2 && y<=6.2) pts.push(`${pts.length?'L':'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const axes = () => {
    const grid=[];
    for(let n=-5;n<=5;n++){
      grid.push(`<line x1="${sx(n)}" y1="50" x2="${sx(n)}" y2="550"/>`);
      grid.push(`<line x1="50" y1="${sy(n)}" x2="550" y2="${sy(n)}"/>`);
    }
    const labels=[];
    for(let n=-5;n<=5;n++){
      if(n!==0){labels.push(`<text x="${sx(n)}" y="322" text-anchor="middle" font-size="13">${n}</text>`);labels.push(`<text x="284" y="${sy(n)+5}" text-anchor="end" font-size="13">${n}</text>`);}
    }
    return `<g stroke="#e2e8f0" stroke-width="1">${grid.join('')}</g><line x1="50" y1="300" x2="550" y2="300" stroke="#64748b" stroke-width="2.5"/><line x1="300" y1="550" x2="300" y2="50" stroke="#64748b" stroke-width="2.5"/>${labels.join('')}<text x="535" y="286" font-size="16">x</text><text x="312" y="68" font-size="16">y</text><text x="286" y="322" font-size="13">0</text>`;
  };
  const svg = (body, label) => `<svg viewBox="0 0 600 600" role="img" aria-label="${esc(label)}" style="width:100%;max-width:720px;display:block;margin:auto">${axes()}${body}</svg>`;
  const point = (x,y,label,fill='#111827',dx=10,dy=-10) => `<circle cx="${sx(x)}" cy="${sy(y)}" r="7" fill="${fill}"/><text x="${sx(x)+dx}" y="${sy(y)+dy}" font-size="15" font-weight="700">${esc(label)}</text>`;
  const line = (m,b,stroke='#2563eb',dash='') => {
    const x1=-5,x2=5,y1=m*x1+b,y2=m*x2+b;
    return `<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" stroke="${stroke}" stroke-width="4" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  };
  const card = (title, body, note='') => `<article class="audit4-visual-card" style="border:1px solid #cbd5e1;border-radius:16px;padding:18px;background:#fff;margin:0 0 18px"><h3 style="margin-top:0">${title}</h3>${body}${note?`<p style="margin-bottom:0"><strong>Read the graph:</strong> ${note}</p>`:''}</article>`;

  function a5c(){
    const body = `${line(1,1,'#2563eb')}${line(-1,7,'#dc2626')}${point(3,4,'(3,4)')}<text x="${sx(-4)}" y="${sy(-3)-10}" font-size="16" fill="#2563eb">y=x+1</text><text x="${sx(3.1)}" y="${sy(3.9)+35}" font-size="16" fill="#dc2626">y=7−x</text>`;
    return card('Visual check: a system solution must satisfy both equations',svg(body,'Coordinate plane showing y equals x plus 1 and y equals 7 minus x intersecting at 3 comma 4'),'The two exact lines cross at (3,4). Substitution gives x+(x+1)=7, and the same ordered pair checks in both original equations.');
  }
  function a6a(){
    const up=`<path d="${pathFor(x=>(x-1)**2-2)}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(1,-2,'vertex (1,−2)','#2563eb')}<line x1="${sx(1)}" y1="50" x2="${sx(1)}" y2="550" stroke="#7c3aed" stroke-width="2" stroke-dasharray="7 7"/><text x="${sx(1)+10}" y="85" font-size="14">axis x=1</text>`;
    const down=`<path d="${pathFor(x=>-(x+1)**2+3)}" fill="none" stroke="#dc2626" stroke-width="4"/>${point(-1,3,'vertex (−1,3)','#dc2626')}`;
    return card('Quadratic domain and range: vertex + opening control the range',`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px"><div>${svg(up,'Upward parabola y equals x minus 1 squared minus 2')}</div><div>${svg(down,'Downward parabola y equals negative x plus 1 squared plus 3')}</div></div>`,`For y=(x−1)²−2, domain is all real x and range is y≥−2. For y=−(x+1)²+3, domain is all real x and range is y≤3.`);
  }
  function a6b(){
    const curve=`<path d="${pathFor(x=>(x-1)**2-2)}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(1,-2,'vertex (1,−2)','#2563eb')}${point(3,2,'known point (3,2)','#16a34a')}`;
    return card('Write a quadratic from a vertex and one point',svg(curve,'Parabola y equals x minus 1 squared minus 2 with vertex 1 negative 2 and point 3 comma 2'),`Start with y=a(x−1)²−2. Substitute (3,2): 2=a(2)²−2, so 4=4a and a=1. Therefore y=(x−1)²−2.`);
  }
  function a6c(){
    const curve=`<path d="${pathFor(x=>(x-1)*(x-3))}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(1,0,'zero 1','#16a34a',-70,-12)}${point(3,0,'zero 3','#16a34a',10,-12)}${point(2,-1,'vertex (2,−1)','#7c3aed')}`;
    return card('Zeros become factors',svg(curve,'Parabola y equals x minus 1 times x minus 3 with zeros 1 and 3'),`Zeros x=1 and x=3 give factors (x−1)(x−3). With leading factor a=1, y=(x−1)(x−3).`);
  }
  function a7a(){
    const curve=`<path d="${pathFor(x=>(x-1)**2-4)}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(1,-4,'vertex (1,−4)','#7c3aed')}${point(-1,0,'zero (−1,0)','#16a34a',-95,-12)}${point(3,0,'zero (3,0)','#16a34a')}${point(0,-3,'y-int (0,−3)','#dc2626',10,24)}<line x1="${sx(1)}" y1="50" x2="${sx(1)}" y2="550" stroke="#7c3aed" stroke-width="2" stroke-dasharray="7 7"/>`;
    return card('Quadratic key features belong to exact points and intervals',svg(curve,'Parabola y equals x minus 1 squared minus 4 showing vertex zeros y intercept and axis of symmetry'),`For y=(x−1)²−4: axis x=1, vertex (1,−4), zeros −1 and 3, y-intercept −3, decreasing for x<1 and increasing for x>1.`);
  }
  function a7b(){
    const curve=`<path d="${pathFor(x=>(x+1)*(x-2))}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(-1,0,'x=−1','#16a34a',-60,-12)}${point(2,0,'x=2','#16a34a')}`;
    return card('Factors ↔ zeros ↔ x-intercepts',svg(curve,'Parabola y equals x plus 1 times x minus 2 crossing the x axis at negative 1 and 2'),`(x+1)(x−2)=0 exactly when x=−1 or x=2. Those solutions are the graph's x-intercepts.`);
  }
  function a7c(){
    const parent=`<path d="${pathFor(x=>x*x,-2.3,2.3)}" fill="none" stroke="#64748b" stroke-width="4"/>`;
    const narrow=`<path d="${pathFor(x=>2*x*x,-1.7,1.7)}" fill="none" stroke="#2563eb" stroke-width="4"/>`;
    const reflected=`<path d="${pathFor(x=>-x*x,-2.3,2.3)}" fill="none" stroke="#dc2626" stroke-width="4"/>`;
    const shifted=`<path d="${pathFor(x=>(x-2)**2+1,-.3,4.3)}" fill="none" stroke="#16a34a" stroke-width="4"/>${point(2,1,'vertex (2,1)','#16a34a')}`;
    return card('Transform the parent parabola y=x²',svg(`${parent}${narrow}${reflected}${shifted}<text x="395" y="90" font-size="15" fill="#64748b">y=x²</text><text x="350" y="125" font-size="15" fill="#2563eb">y=2x²</text><text x="395" y="515" font-size="15" fill="#dc2626">y=−x²</text><text x="415" y="238" font-size="15" fill="#16a34a">y=(x−2)²+1</text>`,'Exact transformations of the quadratic parent function'),`All curves use the same scale. Multiplying by 2 narrows the parabola, multiplying by −1 reflects it across the x-axis, and (x−2)²+1 shifts the vertex from (0,0) to (2,1).`);
  }
  function a8a(){
    const curve=`<path d="${pathFor(x=>x*x-5*x+6,-1,5)}" fill="none" stroke="#2563eb" stroke-width="4"/>${point(2,0,'x=2','#16a34a',-50,-12)}${point(3,0,'x=3','#16a34a')}`;
    return card('Quadratic solutions are the x-intercepts',`${svg(curve,'Graph of y equals x squared minus 5x plus 6 with zeros 2 and 3')}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px"><div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px"><strong>Factoring</strong><p>x²−5x+6=(x−2)(x−3)</p><p>Zero product → x=2 or x=3.</p></div><div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px"><strong>Quadratic formula</strong><p style="font-size:20px">x = (−b ± √(b²−4ac)) / (2a)</p><p>The discriminant b²−4ac predicts the number of real solutions.</p></div></div>`,`The algebraic solutions x=2 and x=3 are exactly where the graph crosses y=0.`);
  }
  function a8b(){
    const model=x=>0.3*(x-1)**2+0.5;
    const pts=[[-2,3.0],[-1,1.9],[0,1.0],[1,0.7],[2,0.9],[3,1.8],[4,3.4]];
    const dots=pts.map(([x,y])=>`<circle cx="${sx(x)}" cy="${sy(y)}" r="6" fill="#2563eb"/>`).join('');
    const curve=`<path d="${pathFor(model,-2.5,4.5)}" fill="none" stroke="#dc2626" stroke-width="4"/>${dots}<text x="365" y="120" font-size="15" fill="#dc2626">illustrative quadratic fit</text>`;
    return card('Quadratic model for curved data',svg(curve,'Illustrative scatterplot with a quadratic trend curve'),`The blue points are illustrative observations and the red curve is an illustrative model y=0.3(x−1)²+0.5. A quadratic model is appropriate when the data bend with one turning direction; predictions inside the observed x-range are interpolation.`);
  }

  const visuals={
    'alg1-a5c-linear-systems':a5c,
    'alg1-a6a-quadratic-domain-range':a6a,
    'alg1-a6b-write-quadratics-from-vertex':a6b,
    'alg1-a6c-write-quadratics-from-solutions':a6c,
    'alg1-a7a-quadratic-key-features':a7a,
    'alg1-a7b-factors-and-zeros':a7b,
    'alg1-a7c-quadratic-transformations':a7c,
    'alg1-a8a-solve-quadratic-equations':a8a,
    'alg1-a8b-quadratic-regression':a8b
  };
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const content=document.querySelector('#lessonContent');
    const conceptGrid=content?.querySelector('.concept-grid');
    if(content&&conceptGrid&&!content.querySelector('.audit4-visual-card')){
      const wrap=document.createElement('section');
      wrap.className='audit4-visual-section';
      wrap.innerHTML=visuals[moduleId]();
      conceptGrid.before(wrap);
      clearInterval(timer);
    } else if(attempts>=120) clearInterval(timer);
  },100);
})();