(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a9a-exponential-domain-range") return;

  const SVG_NS = "http://www.w3.org/2000/svg";

  function installStyles() {
    if (document.querySelector("#a9aVisualConceptStyles")) return;
    const style = document.createElement("style");
    style.id = "a9aVisualConceptStyles";
    style.textContent = `
      .a9a-visual-concept{margin:18px 0 24px;padding:18px;border:1px solid #cbdaf6;border-radius:16px;background:#f8fbff}
      .a9a-visual-concept h3{margin:0 0 6px;color:#163f7a}
      .a9a-visual-concept-intro{margin:0 0 16px;color:#52606d}
      .a9a-graph-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .a9a-graph-card{border:1px solid #d9e2ec;border-radius:14px;background:#fff;overflow:hidden}
      .a9a-graph-card-head{padding:12px 14px;border-bottom:1px solid #e5eaf0}
      .a9a-graph-card-head strong{display:block;color:#1f2d3d;margin-bottom:3px}
      .a9a-graph-card-head span{font-family:Georgia,'Times New Roman',serif;font-size:1.05rem;color:#334e68}
      .a9a-graph-svg{display:block;width:100%;height:auto;background:#fff}
      .a9a-graph-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;background:#f8fafc;border-top:1px solid #e5eaf0}
      .a9a-graph-meta div{padding:8px;border-radius:9px;background:#fff;border:1px solid #e2e8f0;font-size:.9rem}
      .a9a-graph-meta strong{display:block;color:#174ea6;margin-bottom:2px}
      .a9a-graph-note{padding:10px 12px;border-top:1px solid #e5eaf0;color:#334e68;font-size:.92rem;line-height:1.45}
      .a9a-quick-rule{margin-top:14px;padding:13px 15px;border-radius:12px;background:#eef5ff;border:1px solid #c8d8fa;line-height:1.55}
      .a9a-quick-rule strong{color:#174ea6}
      .a9a-legend{display:flex;flex-wrap:wrap;gap:10px;padding:0 12px 10px;color:#52606d;font-size:.86rem}
      .a9a-legend span{display:inline-flex;align-items:center;gap:5px}
      .a9a-legend i{width:18px;height:3px;border-radius:999px;display:inline-block}
      @media(max-width:760px){.a9a-graph-grid{grid-template-columns:1fr}.a9a-visual-concept{padding:12px}.a9a-graph-meta{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function graphSvg({ xMin=-3, xMax=3, yMin=-5, yMax=7, asymptote=0, curves=[] }) {
    const width = 360;
    const height = 220;
    const pad = { left: 44, right: 18, top: 16, bottom: 34 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const xToPx = x => pad.left + ((x - xMin) / (xMax - xMin)) * innerW;
    const yToPx = y => pad.top + ((yMax - y) / (yMax - yMin)) * innerH;
    const safeY = y => Math.max(yMin - 2, Math.min(yMax + 2, y));

    const grid = [];
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 1) {
      const px = xToPx(x);
      grid.push(`<line x1="${px}" y1="${pad.top}" x2="${px}" y2="${height-pad.bottom}" stroke="#edf1f5" stroke-width="1"/>`);
      if (x !== 0) grid.push(`<text x="${px}" y="${height-13}" text-anchor="middle" font-size="11" fill="#64748b">${x}</text>`);
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 1) {
      const py = yToPx(y);
      grid.push(`<line x1="${pad.left}" y1="${py}" x2="${width-pad.right}" y2="${py}" stroke="#edf1f5" stroke-width="1"/>`);
      if (y !== 0 && y >= yMin && y <= yMax) grid.push(`<text x="${pad.left-8}" y="${py+4}" text-anchor="end" font-size="11" fill="#64748b">${y}</text>`);
    }

    const axis = [];
    if (0 >= yMin && 0 <= yMax) {
      const py = yToPx(0);
      axis.push(`<line x1="${pad.left}" y1="${py}" x2="${width-pad.right}" y2="${py}" stroke="#334155" stroke-width="1.5" marker-end="url(#a9aArrow)"/>`);
      axis.push(`<text x="${width-pad.right-3}" y="${py-7}" text-anchor="end" font-size="12" fill="#334155">x</text>`);
    }
    if (0 >= xMin && 0 <= xMax) {
      const px = xToPx(0);
      axis.push(`<line x1="${px}" y1="${height-pad.bottom}" x2="${px}" y2="${pad.top}" stroke="#334155" stroke-width="1.5" marker-end="url(#a9aArrow)"/>`);
      axis.push(`<text x="${px+8}" y="${pad.top+8}" font-size="12" fill="#334155">y</text>`);
    }

    const asymY = yToPx(asymptote);
    const asym = `<line x1="${pad.left}" y1="${asymY}" x2="${width-pad.right}" y2="${asymY}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${width-pad.right-3}" y="${asymY-7}" text-anchor="end" font-size="11" fill="#6d28d9">y = ${asymptote}</text>`;

    const curveMarkup = curves.map((curve, curveIndex) => {
      const points = [];
      const samples = 140;
      for (let i = 0; i <= samples; i += 1) {
        const x = xMin + ((xMax - xMin) * i / samples);
        const rawY = curve.fn(x);
        if (!Number.isFinite(rawY)) continue;
        const y = safeY(rawY);
        points.push(`${xToPx(x).toFixed(2)},${yToPx(y).toFixed(2)}`);
      }
      return `<polyline points="${points.join(" ")}" fill="none" stroke="${curve.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#a9aCurveArrow${curveIndex})"/>`;
    }).join("");

    const curveDefs = curves.map((curve, curveIndex) => `<marker id="a9aCurveArrow${curveIndex}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="${curve.stroke}"/></marker>`).join("");

    return `
      <svg class="a9a-graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Exponential function graph">
        <defs>
          <marker id="a9aArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#334155"/></marker>
          ${curveDefs}
        </defs>
        ${grid.join("")}
        ${axis.join("")}
        ${asym}
        ${curveMarkup}
      </svg>
    `;
  }

  function card({ title, equation, svg, domain, range, note, legend="" }) {
    return `
      <article class="a9a-graph-card">
        <div class="a9a-graph-card-head"><strong>${title}</strong><span>${equation}</span></div>
        ${svg}
        ${legend}
        <div class="a9a-graph-meta">
          <div><strong>Domain</strong>${domain}</div>
          <div><strong>Range</strong>${range}</div>
        </div>
        <div class="a9a-graph-note">${note}</div>
      </article>
    `;
  }

  function visualMarkup() {
    const positive = graphSvg({ yMin:-1, yMax:8, asymptote:0, curves:[{ fn:x => 2 ** x, stroke:"#16803a" }] });
    const negative = graphSvg({ yMin:-8, yMax:1, asymptote:0, curves:[{ fn:x => -(2 ** x), stroke:"#c62828" }] });
    const decay = graphSvg({ xMin:-2.5, xMax:3, yMin:-1, yMax:10, asymptote:0, curves:[{ fn:x => 7 * (0.5 ** x), stroke:"#2563eb" }] });
    const shifted = graphSvg({ xMin:-2.5, xMax:2.5, yMin:-4, yMax:8, asymptote:3, curves:[
      { fn:x => (2 ** x) + 3, stroke:"#2563eb" },
      { fn:x => -(2 ** x) + 3, stroke:"#c62828" }
    ] });

    return `
      <section class="a9a-visual-concept" data-a9a-visual-concept="true">
        <h3>See the graph before using the rules</h3>
        <p class="a9a-visual-concept-intro">Use the shape of the graph to read the domain, the range, and the horizontal asymptote.</p>
        <div class="a9a-graph-grid">
          ${card({
            title:"Positive coefficient",
            equation:"y = 2ˣ",
            svg:positive,
            domain:"all real numbers",
            range:"y > 0",
            note:"The graph stays above the x-axis and approaches y = 0 without touching it."
          })}
          ${card({
            title:"Negative coefficient",
            equation:"y = −2ˣ",
            svg:negative,
            domain:"all real numbers",
            range:"y < 0",
            note:"The negative coefficient reflects the graph below the x-axis. The domain does not change."
          })}
          ${card({
            title:"Decay still stays positive",
            equation:"y = 7(0.5ˣ)",
            svg:decay,
            domain:"all real numbers",
            range:"y > 0",
            note:"A base between 0 and 1 changes the direction of the graph, not the positive side of the range."
          })}
          ${card({
            title:"Vertical shift moves the range",
            equation:"y = 2ˣ + 3 and y = −2ˣ + 3",
            svg:shifted,
            domain:"all real numbers",
            range:"blue: y > 3 · red: y < 3",
            note:"The horizontal asymptote moves from y = 0 to y = 3. The sign of the coefficient decides whether the graph stays above or below it.",
            legend:`<div class="a9a-legend"><span><i style="background:#2563eb"></i> y = 2ˣ + 3</span><span><i style="background:#c62828"></i> y = −2ˣ + 3</span></div>`
          })}
        </div>
        <div class="a9a-quick-rule"><strong>Quick rule:</strong> For f(x)=abˣ+k, the domain is all real numbers and the horizontal asymptote is y=k. If a&gt;0, the range is y&gt;k. If a&lt;0, the range is y&lt;k.</div>
      </section>
    `;
  }

  function injectVisual() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-a9a-visual-concept="true"]')) return false;
    const conceptGrid = content.querySelector(".concept-grid");
    if (!conceptGrid) return false;
    conceptGrid.insertAdjacentHTML("beforebegin", visualMarkup());
    return true;
  }

  function start() {
    installStyles();
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    if (injectVisual()) return;
    const observer = new MutationObserver(() => {
      if (injectVisual()) observer.disconnect();
    });
    observer.observe(content, { childList:true, subtree:true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
