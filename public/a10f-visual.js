(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a10f-difference-of-squares") return;

  const EXAMPLES = {
    "A10F-L01": { expression: "9x² − 16", p: "3x", q: "4", answer: "(3x − 4)(3x + 4)" },
    "A10F-L02": { expression: "25x² − 49", p: "5x", q: "7", answer: "(5x − 7)(5x + 7)" },
    "A10F-L03": { expression: "x⁴ − 81", p: "x²", q: "9", answer: "(x² − 9)(x² + 9) → (x − 3)(x + 3)(x² + 9)" }
  };

  function currentItemId() {
    const header = document.querySelector("#lessonContent .question-header");
    if (!header) return null;
    const spans = header.querySelectorAll("span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : null;
  }

  function installStyles() {
    if (document.querySelector("#a10fVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "a10fVisualStyles";
    style.textContent = `
      .a10f-visual{margin:22px 0;padding:20px;border:1px solid #cddcff;border-radius:16px;background:#f8fbff;color:#243b53}
      .a10f-visual h3{margin:0 0 8px;color:#174ea6}
      .dos-pattern{display:grid;grid-template-columns:1fr auto 1fr auto minmax(220px,1.4fr);gap:12px;align-items:center;margin:18px 0}
      .dos-square{display:grid;place-items:center;min-height:112px;border:2px solid #4b74c7;border-radius:14px;background:#eef5ff;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;font-weight:800}
      .dos-square.secondary{border-color:#a35b3a;background:#fff5ef}
      .dos-symbol{font-size:1.8rem;font-weight:900;color:#53657d;text-align:center}
      .dos-factors{padding:18px;border-radius:14px;background:#effaf3;border:1px solid #b9e0c7;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:1.28rem;font-weight:800}
      .dos-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
      .dos-check{padding:12px;border-radius:12px;background:#fff;border:1px solid #d9e2ec;text-align:center}
      .dos-check strong{display:block;color:#174ea6;margin-bottom:4px}
      .dos-repeat{margin-top:14px;padding:14px;border-left:4px solid #6a4bbc;background:#faf8ff;line-height:1.55}
      @media(max-width:720px){.dos-pattern{grid-template-columns:1fr}.dos-symbol{transform:rotate(90deg)}.dos-checks{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function patternMarkup(example, title = "See the difference-of-squares pattern") {
    return `
      <section class="a10f-visual" data-a10f-visual="true">
        <h3>${title}</h3>
        <p>Both terms are perfect squares and the operation between them is subtraction.</p>
        <div class="dos-pattern">
          <div class="dos-square">${example.p}²</div>
          <div class="dos-symbol">−</div>
          <div class="dos-square secondary">${example.q}²</div>
          <div class="dos-symbol">→</div>
          <div class="dos-factors">(${example.p} − ${example.q})(${example.p} + ${example.q})</div>
        </div>
        <div class="dos-checks">
          <div class="dos-check"><strong>1. Two terms?</strong>Yes</div>
          <div class="dos-check"><strong>2. Subtraction?</strong>Yes</div>
          <div class="dos-check"><strong>3. Both squares?</strong>Yes</div>
        </div>
        ${example.expression === "x⁴ − 81" ? `<div class="dos-repeat"><strong>Factor completely:</strong> x² − 9 is another difference of squares, so factor it again. The sum x² + 9 does not factor into real linear factors.</div>` : ""}
        <p><strong>Result:</strong> ${example.answer}</p>
      </section>
    `;
  }

  function injectConcept() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-a10f-concept="true"]') || !content.querySelector(".concept-grid")) return;
    const wrapper = document.createElement("div");
    wrapper.dataset.a10fConcept = "true";
    wrapper.innerHTML = patternMarkup(
      { expression: "p² − q²", p: "p", q: "q", answer: "(p − q)(p + q)" },
      "Visual rule: square − square = conjugate factors"
    );
    const button = content.querySelector("#continueLessonBtn");
    if (button) content.insertBefore(wrapper, button);
    else content.append(wrapper);
  }

  function injectWorked() {
    const id = currentItemId();
    const example = EXAMPLES[id];
    const content = document.querySelector("#lessonContent");
    if (!example || !content || content.querySelector('[data-a10f-visual="true"]')) return;
    const solution = content.querySelector(".solution-panel");
    if (!solution) return;
    solution.insertAdjacentHTML("afterend", patternMarkup(example));
  }

  function augment() {
    injectConcept();
    injectWorked();
  }

  installStyles();
  const observer = new MutationObserver(augment);
  const start = () => {
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    observer.observe(content, { childList: true, subtree: true });
    augment();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
