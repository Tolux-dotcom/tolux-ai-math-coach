(() => {
  const moduleId = new URLSearchParams(window.location.search).get('module');
  const allowed = new Set([
    'alg1-a10a-add-subtract-polynomials',
    'alg1-a10b-multiply-polynomials',
    'alg1-a10c-divide-polynomials'
  ]);
  if (!allowed.has(moduleId)) return;

  const card = (title, body) => `
    <section class="audit1-visual" data-audit1-visual="true">
      <h3>${title}</h3>${body}
    </section>`;

  function installStyles() {
    if (document.querySelector('#audit1PolynomialVisualStyles')) return;
    const style = document.createElement('style');
    style.id = 'audit1PolynomialVisualStyles';
    style.textContent = `
      .audit1-visual{margin:20px 0;padding:18px;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#1f2937}
      .audit1-visual h3{margin:0 0 10px;color:#174ea6}
      .audit1-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0}
      .audit1-box{padding:13px;border:1px solid #d8e2ef;border-radius:12px;background:#f8fbff;text-align:center}
      .audit1-math{font-family:Georgia,'Times New Roman',serif;font-size:1.18rem;font-weight:700}
      .audit1-arrow{font-size:1.3rem;font-weight:800;text-align:center;color:#64748b}
      .audit1-table{width:100%;border-collapse:collapse;margin:12px 0}.audit1-table th,.audit1-table td{border:1px solid #cbd5e1;padding:10px;text-align:center}.audit1-table th{background:#f1f5f9}
      .audit1-highlight{background:#eefbf2!important}
      .audit1-long{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;overflow:auto;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #d8e2ef;line-height:1.55}
      .audit1-note{margin-top:12px;padding:11px 13px;border-left:4px solid #6a4bbc;background:#faf8ff}
    `;
    document.head.append(style);
  }

  function a10a() {
    return card('Visual method: line up like terms by degree', `
      <p>Think of each exponent as its own column. Only terms in the same column may combine.</p>
      <table class="audit1-table" aria-label="Polynomial addition aligned by degree">
        <thead><tr><th>x² column</th><th>x column</th><th>constant column</th></tr></thead>
        <tbody>
          <tr><td>3x²</td><td>+4x</td><td>−1</td></tr>
          <tr><td>+2x²</td><td>−5x</td><td>+6</td></tr>
          <tr class="audit1-highlight"><td>5x²</td><td>−x</td><td>+5</td></tr>
        </tbody>
      </table>
      <div class="audit1-grid">
        <div class="audit1-box"><strong>Addition</strong><p>Align → combine coefficients → keep each variable/exponent.</p></div>
        <div class="audit1-box"><strong>Subtraction</strong><p>First change <em>every</em> sign in the polynomial being subtracted.</p></div>
        <div class="audit1-box"><strong>Standard form</strong><p>Write highest exponent first: x², then x, then constants.</p></div>
      </div>
      <div class="audit1-note"><strong>Paper check:</strong> if an exponent does not match, the terms are not like terms and must stay separate.</div>`);
  }

  function a10b() {
    return card('Visual method: a 2 × 2 box prevents missing products', `
      <p>For <span class="audit1-math">(x+3)(x+5)</span>, each term on one side must multiply each term on the other side.</p>
      <table class="audit1-table" aria-label="Box model for multiplying binomials">
        <thead><tr><th>×</th><th>x</th><th>+5</th></tr></thead>
        <tbody>
          <tr><th>x</th><td class="audit1-highlight">x²</td><td>5x</td></tr>
          <tr><th>+3</th><td>3x</td><td class="audit1-highlight">15</td></tr>
        </tbody>
      </table>
      <div class="audit1-grid">
        <div class="audit1-box"><span class="audit1-math">x²</span><small><br>first product</small></div>
        <div class="audit1-box"><span class="audit1-math">5x+3x=8x</span><small><br>combine middle terms</small></div>
        <div class="audit1-box"><span class="audit1-math">15</span><small><br>constant product</small></div>
      </div>
      <p class="audit1-math" style="text-align:center">(x+3)(x+5)=x²+8x+15</p>
      <div class="audit1-note"><strong>Visual check:</strong> a binomial times a binomial creates four partial products before like terms are combined.</div>`);
  }

  function a10c() {
    return card('Visual method: divide → multiply → subtract → bring down', `
      <p>Polynomial long division works like numerical long division. Keep matching powers in vertical columns and insert zero placeholders for missing powers.</p>
      <div class="audit1-long" aria-label="Polynomial long division layout">          x² + 2x + 3
        ┌────────────────
x + 1  │ x³ + 3x² + 5x + 3
        │ x³ +  x²
        │ ─────────
        │      2x² + 5x
        │      2x² + 2x
        │      ─────────
        │             3x + 3
        │             3x + 3
        │             ──────
        │                  0</div>
      <div class="audit1-grid">
        <div class="audit1-box"><strong>1. Divide</strong><p>x³ ÷ x = x²</p></div>
        <div class="audit1-box"><strong>2. Multiply</strong><p>x²(x+1)=x³+x²</p></div>
        <div class="audit1-box"><strong>3. Subtract</strong><p>Subtract the entire row, watching signs.</p></div>
        <div class="audit1-box"><strong>4. Bring down</strong><p>Repeat until the remainder degree is smaller.</p></div>
      </div>
      <div class="audit1-note"><strong>Verification:</strong> dividend = (divisor)(quotient) + remainder. Multiplying back is the fastest way to catch a division error.</div>`);
  }

  const render = {
    'alg1-a10a-add-subtract-polynomials': a10a,
    'alg1-a10b-multiply-polynomials': a10b,
    'alg1-a10c-divide-polynomials': a10c
  }[moduleId];

  function inject() {
    const content = document.querySelector('#lessonContent');
    const conceptGrid = content?.querySelector('.concept-grid');
    if (!content || !conceptGrid || content.querySelector('[data-audit1-visual="true"]')) return false;
    conceptGrid.insertAdjacentHTML('beforebegin', render());
    return true;
  }

  installStyles();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (inject() || attempts >= 120) window.clearInterval(timer);
  }, 100);
})();