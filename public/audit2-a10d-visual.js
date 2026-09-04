(() => {
  const moduleId = new URLSearchParams(location.search).get('module');
  if (moduleId !== 'alg1-a10d-equivalent-polynomial-forms') return;

  function visualMarkup() {
    return `
      <section class="audit2-a10d-visual" data-audit2-a10d-visual="true">
        <h3>Visual idea: the value stays the same while the form changes</h3>
        <p>Equivalent expressions are two different-looking ways to represent the same quantity. Move forward by distributing; move backward by factoring out a common factor.</p>
        <div class="audit2-equivalence-flow">
          <div class="audit2-form-card">
            <small>FACTORED FORM</small>
            <strong>3(x + 4)</strong>
            <span>one factor multiplies both terms</span>
          </div>
          <div class="audit2-arrow-block">
            <strong>→ distribute</strong>
            <span>3·x + 3·4</span>
          </div>
          <div class="audit2-form-card audit2-result-card">
            <small>EXPANDED FORM</small>
            <strong>3x + 12</strong>
            <span>same value for every x</span>
          </div>
        </div>
        <div class="audit2-equivalence-flow audit2-reverse-flow">
          <div class="audit2-form-card">
            <small>EXPANDED FORM</small>
            <strong>6x² + 9x</strong>
            <span>both terms contain 3x</span>
          </div>
          <div class="audit2-arrow-block">
            <strong>→ factor GCF</strong>
            <span>divide each term by 3x</span>
          </div>
          <div class="audit2-form-card audit2-result-card">
            <small>FACTORED FORM</small>
            <strong>3x(2x + 3)</strong>
            <span>distribute to check</span>
          </div>
        </div>
        <div class="audit2-like-term-grid">
          <div><strong>x² terms</strong><span>combine only with x²</span></div>
          <div><strong>x terms</strong><span>combine only with x</span></div>
          <div><strong>constants</strong><span>combine only with constants</span></div>
        </div>
        <p class="audit2-check-note"><strong>Best verification:</strong> distribute or simplify one form until it becomes the other. A single substitution value can check your work, but it does not prove equivalence for every x.</p>
      </section>
    `;
  }

  function installStyles() {
    if (document.querySelector('#audit2A10dVisualStyles')) return;
    const style = document.createElement('style');
    style.id = 'audit2A10dVisualStyles';
    style.textContent = `
      .audit2-a10d-visual{margin:0 0 22px;padding:20px;border:1px solid #cbd5e1;border-radius:16px;background:#fff}
      .audit2-a10d-visual h3{margin-top:0;color:#17365d}
      .audit2-equivalence-flow{display:grid;grid-template-columns:minmax(0,1fr) 180px minmax(0,1fr);gap:12px;align-items:stretch;margin:16px 0}
      .audit2-form-card{display:flex;flex-direction:column;justify-content:center;gap:6px;min-height:120px;padding:16px;border:1px solid #d7e2f2;border-radius:14px;background:#f8fbff;text-align:center}
      .audit2-form-card small{font-weight:900;letter-spacing:.05em;color:#5d6c80}
      .audit2-form-card strong{font-family:Georgia,'Times New Roman',serif;font-size:1.45rem;color:#17365d}
      .audit2-result-card{background:#effaf3;border-color:#abd8b7}
      .audit2-arrow-block{display:flex;flex-direction:column;justify-content:center;gap:6px;text-align:center;padding:10px;border-radius:12px;background:#fff7df}
      .audit2-arrow-block strong{color:#8a5b00}
      .audit2-reverse-flow{margin-top:10px}
      .audit2-like-term-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}
      .audit2-like-term-grid>div{display:grid;gap:4px;padding:12px;border-radius:12px;background:#f1f5f9;text-align:center}
      .audit2-like-term-grid strong{font-size:1.08rem}
      .audit2-check-note{margin:0;padding:12px 14px;border-left:4px solid #5d3b8c;background:#faf7ff}
      @media(max-width:760px){.audit2-equivalence-flow{grid-template-columns:1fr}.audit2-arrow-block{min-height:70px}.audit2-like-term-grid{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function inject() {
    const content = document.querySelector('#lessonContent');
    const grid = content?.querySelector('.concept-grid');
    if (!content || !grid || content.querySelector('[data-audit2-a10d-visual="true"]')) return false;
    grid.insertAdjacentHTML('beforebegin', visualMarkup());
    return true;
  }

  installStyles();
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (inject() || attempts >= 120) clearInterval(timer);
  }, 100);
})();