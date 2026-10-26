// Circuit diagrams use conventional current and an ideal DC source.
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const line = (x1,y1,x2,y2,color='#334155',width=3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
const text = (x,y,label,anchor='middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill:#172b46;font:17px system-ui,sans-serif">${escape(label)}</text>`;
const arrow = (x,y,direction=1,color='#1261df') => line(x,y,x+36*direction,y,color,4)+`<polygon points="${x+36*direction},${y} ${x+25*direction},${y-6} ${x+25*direction},${y+6}" fill="${color}"/>`;
const number = n => Number(n.toFixed(3)).toString();

function circuitPanel({arrangement,component='bulb',open=false,voltage,r1,r2}) {
  const parallel=arrangement==='parallel';
  const numeric=[voltage,r1,r2].every(n => Number.isFinite(n) && n>0);
  const current=numeric ? voltage/(r1+r2) : null;
  const i1=numeric ? voltage/r1 : null, i2=numeric ? voltage/r2 : null;
  const heading=`${parallel?'Parallel: separate branches':'Series: one loop'}${open?' (one open switch)':''}`;
  const description=open
    ? parallel ? 'The upper branch has an open switch. Only the lower bulb has a closed path and stays on.' : 'The open switch breaks the only loop. Both bulbs are off and the steady current is zero.'
    : parallel ? 'Each bulb has its own path between junctions A and B. Current splits at A and recombines at B.' : 'Trace the single loop from battery positive through both bulbs and back to battery negative. The current is the same at both bulbs.';
  const battery=(left,right)=>line(left,255,300,255)+line(320,255,right,255)+line(300,231,300,279)+line(320,242,320,268)+text(283,290,'+')+text(338,290,'−')+text(310,312,numeric?`${voltage} V ideal battery`:'Battery: long plate is +');
  const bulb=(x,y,label,lit)=>`<circle cx="${x}" cy="${y}" r="22" fill="${lit?'#fff1ad':'#edf0f4'}" stroke="#334155" stroke-width="3"/>`+line(x-13,y-13,x+13,y+13)+line(x-13,y+13,x+13,y-13)+text(x,y-34,label);
  const resistor=(x,y,label)=>`<rect x="${x-28}" y="${y-13}" width="56" height="26" fill="#eaf1ff" stroke="#334155" stroke-width="3"/>`+text(x,y-29,label);
  const part=(x,y,index,lit)=>component==='resistor' ? resistor(x,y,`R${index} = ${index===1?r1:r2} Ω`) : bulb(x,y,`Bulb ${index}${open?lit?' on':' off':''}`,lit);
  const half=component==='resistor'?28:22;
  const switchAt=(x,y)=>line(x,y,x+24,y-18)+`<circle cx="${x}" cy="${y}" r="3" fill="#334155"/><circle cx="${x+30}" cy="${y}" r="3" fill="#334155"/>`+text(x+15,y-30,'Open switch');
  let diagram='';
  if (parallel) {
    diagram=line(100,85,100,255)+line(540,85,540,255)+battery(100,540);
    for(const [index,y] of [[1,85],[2,190]]) {
      diagram+=open && index===1
        ? line(100,y,180,y)+switchAt(180,y)+line(210,y,320-half,y)
        : line(100,y,320-half,y);
      diagram+=part(320,y,index,!open || index===2)+line(320+half,y,540,y);
      if(!open || index===2) diagram+=arrow(410,y,1,index===1?'#1261df':'#7145d6');
      if(numeric) diagram+=text(320,y+31,`${number(index===1?i1:i2)} A; ${voltage} V across R${index}`);
    }
    diagram+=`<circle cx="100" cy="190" r="6" fill="#334155"/><circle cx="540" cy="190" r="6" fill="#334155"/>`+text(76,211,'A')+text(565,211,'B');
    diagram+=arrow(475,255,-1)+text(320,352,open?'Lower branch remains connected':numeric?`Battery current = ${number(i1)} + ${number(i2)} = ${number(i1+i2)} A`:'Current in = branch currents added = current out');
  } else {
    diagram=line(60,70,60,255)+line(580,70,580,255)+battery(60,580);
    diagram+=open?line(60,70,120,70)+switchAt(120,70)+line(150,70,230-half,70):line(60,70,230-half,70);
    diagram+=part(230,70,1,!open)+line(230+half,70,430-half,70)+part(430,70,2,!open)+line(430+half,70,580,70);
    if(!open) diagram+=arrow(310,70)+arrow(510,255,-1);
    diagram+=text(230,126,numeric?`${number(current)} A; ${number(current*r1)} V drop`:'Same current')+text(430,126,numeric?`${number(current)} A; ${number(current*r2)} V drop`:'Same current');
    diagram+=text(320,352,open?'No closed loop: current = 0 A':numeric?`Voltage drops: ${number(current*r1)} + ${number(current*r2)} = ${voltage} V`:'Opening the only loop stops current everywhere');
  }
  return `<figure class="physics-visual" style="margin:0;min-width:0"><figcaption>${escape(heading)}</figcaption><div style="overflow-x:auto" tabindex="0" role="region" aria-label="Circuit diagram; scroll horizontally on small screens"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" role="img" aria-label="${escape(description)}" style="display:block;width:100%;min-width:480px;height:auto;max-height:none;background:#fff">${diagram}</svg></div><p>${escape(description)}</p></figure>`;
}

export function renderCircuitVisual(visual) {
  if(visual?.type!=='circuit_diagram') return '';
  const params={component:visual.component==='resistor'?'resistor':'bulb',open:visual.open===true,voltage:visual.voltage,r1:visual.r1,r2:visual.r2};
  const arrangements=visual.arrangement==='comparison'?['series','parallel']:[visual.arrangement];
  if(arrangements.some(a=>!['series','parallel'].includes(a))) return '';
  return `<section aria-label="Series and parallel circuit diagrams"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px">${arrangements.map(arrangement=>circuitPanel({...params,arrangement})).join('')}</div><p>Arrows show conventional current from + to − through the external circuit, not electron motion. Arrow lengths show direction, not current magnitude. Wires have negligible resistance; the battery is ideal. A circle with a cross is a bulb; a rectangle is a resistor.</p></section>`;
}
