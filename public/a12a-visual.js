(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a12a-identify-functions") return;

  function installStyles() {
    if (document.querySelector("#a12aVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "a12aVisualStyles";
    style.textContent = `
      .a12a-visual{margin:18px 0 24px;padding:18px;border:1px solid #cbdaf6;border-radius:16px;background:#f8fbff}
      .a12a-visual h3{margin:0 0 6px;color:#163f7a}.a12a-intro{margin:0 0 16px;color:#52606d}
      .a12a-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.a12a-card{padding:14px;border:1px solid #d8e2f1;border-radius:14px;background:#fff}
      .a12a-card h4{margin:0 0 8px;color:#173f78}.a12a-card p{margin:8px 0 0;line-height:1.45;color:#52606d}.a12a-svg{width:100%;height:auto;display:block;background:#fbfdff;border-radius:10px}
      .a12a-rule{margin-top:14px;padding:14px;border-radius:12px;background:#eef7ff;border:1px solid #bfdcff}.a12a-rule strong{color:#174ea6}.a12a-rule-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.a12a-rule-grid div{padding:10px;border-radius:10px;background:white;border:1px solid #d7e3f4}
      .a12a-yes{font-weight:800;color:#166534}.a12a-no{font-weight:800;color:#991b1b}
      @media(max-width:700px){.a12a-grid,.a12a-rule-grid{grid-template-columns:1fr}.a12a-visual{padding:12px}}
    `;
    document.head.append(style);
  }

  const mappingSvg = (bad = false) => `
    <svg class="a12a-svg" viewBox="0 0 360 180" role="img" aria-label="${bad ? "Nonfunction mapping: one input has two outputs" : "Function mapping: every input has one output"}">
      <rect x="24" y="22" width="110" height="136" rx="18" fill="#eef5ff" stroke="#9bb8ea"/><rect x="226" y="22" width="110" height="136" rx="18" fill="#f8f4ff" stroke="#b7a5e5"/>
      <text x="79" y="45" text-anchor="middle" font-size="14" font-weight="700">inputs</text><text x="281" y="45" text-anchor="middle" font-size="14" font-weight="700">outputs</text>
      <g font-size="16" text-anchor="middle"><text x="79" y="78">1</text><text x="79" y="108">2</text><text x="79" y="138">3</text><text x="281" y="78">4</text><text x="281" y="108">6</text><text x="281" y="138">8</text></g>
      <g stroke="#2563eb" stroke-width="3" fill="none" marker-end="url(#arr12a)"><path d="M95 72 C150 65,190 65,264 72"/><path d="M95 102 C150 95,190 95,264 102"/><path d="M95 132 C150 125,190 125,264 132"/>${bad ? '<path d="M95 72 C150 82,190 96,264 102" stroke="#dc2626"/>' : ''}</g>
      <defs><marker id="arr12a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/></marker></defs>
    </svg>`;

  const graphSvg = (circle = false) => `
    <svg class="a12a-svg" viewBox="0 0 360 220" role="img" aria-label="${circle ? "Circle failing the vertical line test" : "Parabola passing the vertical line test"}">
      <g stroke="#d8e2f1" stroke-width="1">${[60,100,140,180,220,260,300].map(x=>`<line x1="${x}" y1="20" x2="${x}" y2="200"/>`).join("")}${[40,80,120,160].map(y=>`<line x1="30" y1="${y}" x2="330" y2="${y}"/>`).join("")}</g>
      <line x1="30" y1="120" x2="330" y2="120" stroke="#172033" stroke-width="2"/><line x1="180" y1="20" x2="180" y2="200" stroke="#172033" stroke-width="2"/>
      ${circle ? '<circle cx="180" cy="110" r="62" fill="none" stroke="#7c3aed" stroke-width="4"/><line x1="205" y1="28" x2="205" y2="194" stroke="#dc2626" stroke-width="3" stroke-dasharray="7 6"/><circle cx="205" cy="53" r="5" fill="#dc2626"/><circle cx="205" cy="167" r="5" fill="#dc2626"/>' : '<path d="M90 50 Q180 190 270 50" fill="none" stroke="#2563eb" stroke-width="4"/><line x1="220" y1="28" x2="220" y2="194" stroke="#16a34a" stroke-width="3" stroke-dasharray="7 6"/><circle cx="220" cy="151" r="5" fill="#16a34a"/>'}
      <text x="235" y="38" font-size="13" font-weight="700" fill="${circle ? '#991b1b' : '#166534'}">vertical line</text>
    </svg>`;

  function markup() {
    return `
      <section class="a12a-visual" data-a12a-visual="true">
        <h3>See the function rule in every representation</h3>
        <p class="a12a-intro">A function means <strong>each input has exactly one output</strong>. The pictures below show what that rule looks like before you answer questions.</p>
        <div class="a12a-grid">
          <article class="a12a-card"><h4>Mapping: function</h4>${mappingSvg(false)}<p><span class="a12a-yes">Function.</span> Each input has one arrow. Different inputs may even share an output.</p></article>
          <article class="a12a-card"><h4>Mapping: not a function</h4>${mappingSvg(true)}<p><span class="a12a-no">Not a function.</span> Input 1 has two arrows, so one input has two outputs.</p></article>
          <article class="a12a-card"><h4>Graph: passes the vertical line test</h4>${graphSvg(false)}<p><span class="a12a-yes">Function.</span> Any vertical line meets the parabola at most once.</p></article>
          <article class="a12a-card"><h4>Graph: fails the vertical line test</h4>${graphSvg(true)}<p><span class="a12a-no">Not a function.</span> The red vertical line meets the circle twice, so one x-value has two y-values.</p></article>
        </div>
        <div class="a12a-rule"><strong>Fast decision guide</strong><div class="a12a-rule-grid"><div><b>Table / ordered pairs</b><br>Look for one x-value with two different y-values.</div><div><b>Graph</b><br>Use the vertical line test.</div><div><b>Equation / verbal rule</b><br>Ask whether one input can produce more than one output.</div></div></div>
      </section>`;
  }

  function inject() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-a12a-visual="true"]')) return false;
    const conceptGrid = content.querySelector(".concept-grid");
    if (!conceptGrid) return false;
    conceptGrid.insertAdjacentHTML("beforebegin", markup());
    return true;
  }

  function start() {
    installStyles();
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    if (inject()) return;
    const observer = new MutationObserver(() => { if (inject()) observer.disconnect(); });
    observer.observe(content, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true}); else start();
})();