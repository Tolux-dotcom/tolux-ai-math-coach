(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a10e-factor-trinomials") return;

  const TARGET_ID = "A10E-G03";
  const hintProgress = new Map();

  function currentItemId() {
    const header = document.querySelector("#lessonContent .question-header");
    if (!header) return null;
    const spans = header.querySelectorAll("span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : null;
  }

  function installStyles() {
    if (document.querySelector("#a10eG03GuidanceStyles")) return;
    const style = document.createElement("style");
    style.id = "a10eG03GuidanceStyles";
    style.textContent = `
      .g03-guidance-panel{margin-top:14px;padding:16px;border:1px solid #cfe0f5;border-radius:13px;background:#f8fbff;color:#253858}
      .g03-guidance-panel h4{margin:0 0 10px;color:#174ea6}
      .g03-guidance-steps{display:grid;gap:10px;margin:0;padding:0;list-style:none}
      .g03-guidance-steps li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}
      .g03-step-number{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#174ea6;color:#fff;font-weight:800}
      .g03-math{font-family:Georgia,'Times New Roman',serif;font-size:1.12rem;font-weight:700;color:#172b4d}
      .g03-x{position:relative;width:170px;height:145px;margin:14px auto;font-family:Georgia,'Times New Roman',serif;font-weight:800;color:#17365d}
      .g03-x::before,.g03-x::after{content:'';position:absolute;left:35px;top:70px;width:100px;height:3px;background:#17365d;transform-origin:center}
      .g03-x::before{transform:rotate(45deg)}
      .g03-x::after{transform:rotate(-45deg)}
      .g03-x span{position:absolute;min-width:42px;text-align:center;background:#fff;border-radius:8px;padding:3px 5px}
      .g03-x-top{top:0;left:63px;color:#174ea6}.g03-x-bottom{bottom:0;left:63px;color:#b42318}.g03-x-left{top:57px;left:0;color:#177245}.g03-x-right{top:57px;right:0;color:#177245}
    `;
    document.head.append(style);
  }

  function hintMarkup(level) {
    if (level === 1) {
      return `
        <div class="g03-guidance-panel" data-g03-guidance="true">
          <h4>Start with the greatest common factor</h4>
          <p>All three terms in <span class="g03-math">2x² − 8x + 8</span> are divisible by <strong>2</strong>.</p>
          <div class="g03-math">2x² − 8x + 8 = 2(x² − 4x + 4)</div>
          <p>Do not factor the trinomial until the GCF is outside.</p>
        </div>`;
    }
    if (level === 2) {
      return `
        <div class="g03-guidance-panel" data-g03-guidance="true">
          <h4>Now factor the trinomial inside</h4>
          <p>For <span class="g03-math">x² − 4x + 4</span>, find two numbers that multiply to <strong>4</strong> and add to <strong>−4</strong>.</p>
          <div class="g03-x" aria-label="X method for x squared minus 4x plus 4">
            <span class="g03-x-top">4<br><small>ac</small></span>
            <span class="g03-x-left">−2</span>
            <span class="g03-x-right">−2</span>
            <span class="g03-x-bottom">−4<br><small>b</small></span>
          </div>
          <p>The side numbers are <strong>−2 and −2</strong>.</p>
        </div>`;
    }
    return `
      <div class="g03-guidance-panel" data-g03-guidance="true">
        <h4>Put the whole factorization together</h4>
        <ol class="g03-guidance-steps">
          <li><span class="g03-step-number">1</span><div><strong>GCF first:</strong><div class="g03-math">2(x² − 4x + 4)</div></div></li>
          <li><span class="g03-step-number">2</span><div><strong>Factor inside:</strong><div class="g03-math">x² − 4x + 4 = (x − 2)(x − 2)</div></div></li>
          <li><span class="g03-step-number">3</span><div><strong>Keep the outside 2:</strong><div class="g03-math">2(x − 2)(x − 2) = 2(x − 2)²</div></div></li>
        </ol>
        <p>Your typed answer <strong>2(x−2)(x−2)</strong> is equivalent to <strong>2(x−2)²</strong>.</p>
      </div>`;
  }

  function alternateMarkup() {
    return `
      <div class="g03-guidance-panel" data-g03-guidance="true">
        <h4>Another way: GCF first, then use the X</h4>
        <p><strong>Step 1:</strong> Factor out the GCF 2.</p>
        <div class="g03-math">2x² − 8x + 8 = 2(x² − 4x + 4)</div>
        <p><strong>Step 2:</strong> Use the X only on <span class="g03-math">x² − 4x + 4</span>.</p>
        <div class="g03-x" aria-label="X method for x squared minus 4x plus 4">
          <span class="g03-x-top">4<br><small>ac</small></span>
          <span class="g03-x-left">−2</span>
          <span class="g03-x-right">−2</span>
          <span class="g03-x-bottom">−4<br><small>b</small></span>
        </div>
        <p>Because <strong>a = 1</strong> inside the parentheses, divide both side numbers by 1: they stay <strong>−2 and −2</strong>.</p>
        <div class="g03-math">2(x − 2)(x − 2) = 2(x − 2)²</div>
      </div>`;
  }

  function appendGuidance(kind) {
    if (currentItemId() !== TARGET_ID) return;
    const feedback = document.querySelector("#lessonFeedback");
    if (!feedback) return;
    feedback.querySelector('[data-g03-guidance="true"]')?.remove();

    if (kind === "hint") {
      const level = Math.min((hintProgress.get(TARGET_ID) || 0) + 1, 3);
      hintProgress.set(TARGET_ID, level);
      feedback.insertAdjacentHTML("beforeend", hintMarkup(level));
      return;
    }

    feedback.insertAdjacentHTML("beforeend", alternateMarkup());
  }

  function resetWhenQuestionChanges() {
    if (currentItemId() !== TARGET_ID) hintProgress.delete(TARGET_ID);
  }

  installStyles();
  document.addEventListener("click", event => {
    const button = event.target.closest("#lessonStuckBtn, #lessonExplainBtn");
    if (!button || currentItemId() !== TARGET_ID) return;
    window.setTimeout(
      () => appendGuidance(button.id === "lessonStuckBtn" ? "hint" : "explain"),
      0
    );
  });

  const content = document.querySelector("#lessonContent");
  if (content) {
    new MutationObserver(resetWhenQuestionChanges).observe(content, {
      childList: true,
      subtree: true
    });
  }
})();
