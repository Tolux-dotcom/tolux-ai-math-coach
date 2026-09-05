(() => {
  const moduleId=new URLSearchParams(location.search).get('module');
  const supported=new Set(['alg1-a9b-interpret-exponential-parameters','alg1-a9c-write-exponential-models','alg1-a9d-graph-exponential-functions','alg1-a9e-exponential-regression']);
  if(!supported.has(moduleId))return;

  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const plot={left:58,top:24,w:460,h:270,xmin:-3,xmax:6,ymin:-5,ymax:150};
  const sx=x=>plot.left+(x-plot.xmin)/(plot.xmax-plot.xmin)*plot.w;
  const sy=y=>plot.top+(plot.ymax-y)/(plot.ymax-plot.ymin)*plot.h;
  function axes({yStep=25,xStep=1,asymptote=null}={}){
    let out='';
    for(let x=Math.ceil(plot.xmin);x<=plot.xmax;x+=xStep){const px=sx(x);out+=`<line x1="${px}" y1="${plot.top}" x2="${px}" y2="${plot.top+plot.h}" stroke="${x===0?'#64748b':'#e2e8f0'}" stroke-width="${x===0?2:1}"/>`;if(x!==0)out+=`<text x="${px}" y="${plot.top+plot.h+20}" text-anchor="middle" font-size="12">${x}</text>`;}
    for(let y=0;y<=plot.ymax;y+=yStep){const py=sy(y);out+=`<line x1="${plot.left}" y1="${py}" x2="${plot.left+plot.w}" y2="${py}" stroke="${y===0?'#64748b':'#e2e8f0'}" stroke-width="${y===0?2:1}"/>`;out+=`<text x="${plot.left-8}" y="${py+4}" text-anchor="end" font-size="12">${y}</text>`;}
    if(asymptote!==null){const py=sy(asymptote);out+=`<line x1="${plot.left}" y1="${py}" x2="${plot.left+plot.w}" y2="${py}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="8 6"/><text x="${plot.left+plot.w-5}" y="${py-8}" text-anchor="end" font-size="12" fill="#7c3aed">asymptote y=${asymptote}</text>`;}
    out+=`<text x="${plot.left+plot.w+12}" y="${sy(0)+5}" font-size="14">x</text><text x="${sx(0)+8}" y="${plot.top-8}" font-size="14">y</text>`;return out;
  }
  function curve(fn,xmin=plot.xmin,xmax=plot.xmax,step=.08){const pts=[];for(let x=xmin;x<=xmax+1e-9;x+=step){const y=fn(x);if(Number.isFinite(y))pts.push(`${sx(x).toFixed(2)},${sy(y).toFixed(2)}`);}return pts.join(' ');}
  const svg=(body,label)=>`<svg viewBox="0 0 580 340" role="img" aria-label="${esc(label)}" style="width:100%;max-width:760px;display:block;margin:auto"><defs><clipPath id="audit5-clip"><rect x="${plot.left}" y="${plot.top}" width="${plot.w}" height="${plot.h}"/></clipPath></defs>${body}</svg>`;
  const card=(title,body,footer='')=>`<section class="audit5-exponential-visual" style="margin:14px 0 20px;padding:18px;border:1px solid #cbd5e1;border-radius:16px;background:#fff"><h3 style="margin-top:0">${title}</h3>${body}${footer?`<p style="margin-bottom:0">${footer}</p>`:''}</section>`;

  function a9b(){
    const growth=x=>20*Math.pow(1.5,x),decay=x=>20*Math.pow(.5,x);
    const body=`${svg(`${axes({yStep:25})}<g clip-path="url(#audit5-clip)"><polyline points="${curve(growth,-3,4.7)}" fill="none" stroke="#2563eb" stroke-width="4"/><polyline points="${curve(decay,-3,6)}" fill="none" stroke="#dc2626" stroke-width="4"/></g><circle cx="${sx(0)}" cy="${sy(20)}" r="6" fill="#111827"/><text x="${sx(0)+10}" y="${sy(20)-10}" font-size="13">a = 20 at x = 0</text><text x="${sx(3.3)}" y="${sy(growth(3.3))-10}" font-size="13" fill="#2563eb">b = 1.5 growth</text><text x="${sx(2.8)}" y="${sy(decay(2.8))+20}" font-size="13" fill="#dc2626">b = 0.5 decay</text>`,'Exact exponential growth and decay curves sharing the same initial value')}`;
    return card('Visual meaning of a and b in f(x)=abˣ',body,'Both curves begin at the same y-intercept because a=20. Each one-unit move right multiplies the output by b: 1.5 for growth and 0.5 for decay.');
  }
  function a9c(){
    const growth=x=>20*Math.pow(1.1,x),decay=x=>20*Math.pow(.9,x);
    const rows=[0,1,2,3].map(x=>`<tr><td>${x}</td><td>${growth(x).toFixed(x===0?0:1)}</td><td>${decay(x).toFixed(x===0?0:1)}</td></tr>`).join('');
    const graph=svg(`${axes({yStep:25})}<g clip-path="url(#audit5-clip)"><polyline points="${curve(growth,-3,6)}" fill="none" stroke="#2563eb" stroke-width="4"/><polyline points="${curve(decay,-3,6)}" fill="none" stroke="#dc2626" stroke-width="4"/></g><text x="${sx(4.3)}" y="${sy(growth(4.3))-10}" font-size="13" fill="#2563eb">20(1.1)ˣ</text><text x="${sx(4.2)}" y="${sy(decay(4.2))+18}" font-size="13" fill="#dc2626">20(0.9)ˣ</text>`,'Exact graphs of a 10 percent growth model and a 10 percent decay model');
    return card('Build the model: initial value × repeated factor',`${graph}<div style="overflow:auto"><table style="border-collapse:collapse;margin:12px auto;text-align:center"><thead><tr><th style="padding:6px 14px">x</th><th style="padding:6px 14px">20(1.1)ˣ</th><th style="padding:6px 14px">20(0.9)ˣ</th></tr></thead><tbody>${rows}</tbody></table></div>`,'Growth uses b=1+r=1.1. Decay uses b=1−r=0.9. A constant ratio across equal x-intervals is the signature of an exponential model.');
  }
  function a9d(){
    const growth=x=>Math.pow(2,x),decay=x=>Math.pow(.5,x),shift=x=>Math.pow(2,x)+25;
    const baseBody=`${axes({yStep:25,asymptote:0})}<g clip-path="url(#audit5-clip)"><polyline points="${curve(growth,-3,6)}" fill="none" stroke="#2563eb" stroke-width="4"/><polyline points="${curve(decay,-3,6)}" fill="none" stroke="#dc2626" stroke-width="4"/></g><circle cx="${sx(0)}" cy="${sy(1)}" r="6" fill="#111827"/><text x="${sx(0)+10}" y="${sy(1)-10}" font-size="13">(0,1)</text>`;
    const shiftedBody=`${axes({yStep:25,asymptote:25})}<g clip-path="url(#audit5-clip)"><polyline points="${curve(shift,-3,6)}" fill="none" stroke="#16a34a" stroke-width="4"/></g><circle cx="${sx(0)}" cy="${sy(26)}" r="6" fill="#111827"/><text x="${sx(0)+10}" y="${sy(26)-8}" font-size="13">y-intercept (0,26)</text>`;
    return card('Graph exponentials from points, intercepts, and asymptotes',`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px"><div>${svg(baseBody,'Exact graphs of y equals 2 to the x and y equals one half to the x')}<p><strong>Parent growth/decay:</strong> both have y-intercept (0,1) and horizontal asymptote y=0.</p></div><div>${svg(shiftedBody,'Exact graph of y equals 2 to the x plus 25')}<p><strong>Vertical shift:</strong> y=2ˣ+25 has asymptote y=25 and y-intercept (0,26).</p></div></div>`,'The asymptote is approached but not reached. A vertical shift changes both the y-intercept and the horizontal asymptote.');
  }
  function a9e(){
    const model=x=>50*Math.pow(1.2,x);const data=[[0,48],[1,61],[2,71],[3,88],[4,106],[5,127]];
    const dots=data.map(([x,y])=>`<circle cx="${sx(x)}" cy="${sy(y)}" r="6" fill="#111827"/>`).join('');
    const residuals=data.map(([x,y])=>`${x}: ${(y-model(x)).toFixed(1)}`).join(' • ');
    const body=svg(`${axes({yStep:25})}<g clip-path="url(#audit5-clip)"><polyline points="${curve(model,0,5.6)}" fill="none" stroke="#2563eb" stroke-width="4"/>${dots}</g><text x="${sx(2.7)}" y="${sy(model(2.7))-14}" font-size="13" fill="#2563eb">model y=50(1.2)ˣ</text>`,'Illustrative exponential data and an exact fitted learning model');
    return card('Exponential regression: data, model, residuals, and prediction',`${body}<p><strong>Illustrative learning data:</strong> (0,48), (1,61), (2,71), (3,88), (4,106), (5,127).</p><p><strong>Residuals observed − predicted:</strong> ${esc(residuals)}</p>`,'This is explicitly illustrative—not measured source data. Use technology to fit y=abˣ, inspect residuals, and prefer interpolation within the observed x-range over distant extrapolation.');
  }

  const visual={
    'alg1-a9b-interpret-exponential-parameters':a9b,
    'alg1-a9c-write-exponential-models':a9c,
    'alg1-a9d-graph-exponential-functions':a9d,
    'alg1-a9e-exponential-regression':a9e
  }[moduleId];
  function inject(){const content=document.querySelector('#lessonContent');const grid=content?.querySelector('.concept-grid');if(!content||!grid||content.querySelector('.audit5-exponential-visual'))return false;const wrap=document.createElement('div');wrap.innerHTML=visual();grid.insertAdjacentElement('beforebegin',wrap.firstElementChild);return true;}
  let attempts=0;const timer=setInterval(()=>{attempts+=1;if(inject()||attempts>=120)clearInterval(timer);},100);
})();