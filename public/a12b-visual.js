(() => {
  const params=new URLSearchParams(location.search); if(params.get('module')!=='alg1-a12b-evaluate-functions') return;
  function card(title,body){return `<article class="concept-card a12b-visual-card"><h3>${title}</h3>${body}</article>`;}
  function inject(){const grid=document.querySelector('#lessonContent .concept-grid'); if(!grid||grid.dataset.a12bVisual==='true') return false; grid.dataset.a12bVisual='true';
    grid.insertAdjacentHTML('afterbegin',[
      card('Function machine: input → rule → output',`<div style="display:grid;grid-template-columns:1fr auto 1.4fr auto 1fr;align-items:center;gap:.55rem;text-align:center;margin:.75rem 0"><strong>3</strong><span>→</span><div class="math-line">f(x)=2x+1</div><span>→</span><strong>7</strong></div><p><strong>f(3)=7</strong>. The 3 is the input; 7 is the output.</p>`),
      card('Substitution map',`<div class="math-line">f(x)=3x-4</div><div class="math-line">f(5)=3(5)-4=15-4=11</div><p>Replace <strong>every x</strong> with the input before simplifying.</p>`),
      card('Negative input: use parentheses',`<div class="math-line">g(x)=x²+2x-1</div><div class="math-line">g(-2)=(-2)²+2(-2)-1</div><div class="math-line">=4-4-1=-1</div><p>Parentheses make the entire negative number the input.</p>`),
      card('Several inputs stay separate',`<table style="width:100%;text-align:center;border-collapse:collapse"><tr><th>input</th><th>substitute</th><th>output</th></tr><tr><td>-1</td><td>q(-1)</td><td>0</td></tr><tr><td>0</td><td>q(0)</td><td>0</td></tr><tr><td>2</td><td>q(2)</td><td>6</td></tr></table><p>For q(x)=x²+x, report the outputs in the same order requested.</p>`)
    ].join('')); return true; }
  let tries=0; const timer=setInterval(()=>{tries++; if(inject()||tries>60) clearInterval(timer);},100);
})();