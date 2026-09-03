(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a10e-factor-trinomials") return;

  const EXAMPLES = Object.freeze({
    "A10E-L02": {
      expression: "6x² + 11x + 3",
      a: 6,
      b: 11,
      c: 3,
      ac: 18,
      left: 9,
      right: 2,
      leftReduced: { numerator: 3, denominator: 2, factor: "2x + 3" },
      rightReduced: { numerator: 1, denominator: 3, factor: "3x + 1" },
      answer: "(2x + 3)(3x + 1)"
    },
    "A10E-L03": {
      expression: "4x² − 12x + 9",
      a: 4,
      b: -12,
      c: 9,
      ac: 36,
      left: -6,
      right: -6,
      leftReduced: { numerator: -3, denominator: 2, factor: "2x − 3" },
      rightReduced: { numerator: -3, denominator: 2, factor: "2x − 3" },
      answer: "(2x − 3)²"
    },
    "A10E-G02": {
      expression: "2x² + 7x + 3",
      a: 2,
      b: 7,
      c: 3,
      ac: 6,
      left: 6,
      right: 1,
      leftReduced: { numerator: 3, denominator: 1, factor: "x + 3" },
      rightReduced: { numerator: 1, denominator: 2, factor: "2x + 1" },
      answer: "(2x + 1)(x + 3)"
    },
    "A10E-P03": {
      expression: "3x² − 14x − 5",
      a: 3,
      b: -14,
      c: -5,
      ac: -15,
      left: 1,
      right: -15,
      leftReduced: { numerator: 1, denominator: 3, factor: "3x + 1" },
      rightReduced: { numerator: -5, denominator: 1, factor: "x − 5" },
      answer: "(3x + 1)(x − 5)"
    }
  });

  const CONCEPT_EXAMPLE = EXAMPLES["A10E-L02"];
  const hintProgress = new Map();
  let lastVisibleItemId = null;

  function valueText(value) {
    return String(value).replace(/-/g, "−");
  }

  function fractionText(reduced) {
    return `${valueText(reduced.numerator)}/${reduced.denominator}`;
  }

  function currentItemId() {
    const header = document.querySelector("#lessonContent .question-header");
    if (!header) return null;
    const spans = header.querySelectorAll("span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : null;
  }

  function crossMarkup(example, reveal = "full") {
    const showPair = reveal === "pair" || reveal === "full";
    return `
      <div class="x-method-cross-wrap">
        <div class="x-method-cross" role="img" aria-label="X method diagram. Put a times c at the top and b at the bottom. Find the two side numbers. After finding them, divide both side numbers by a.">
          <span class="x-method-top">${valueText(example.ac)}<small>ac</small></span>
          <span class="x-method-left">${showPair ? valueText(example.left) : "?"}<small>${showPair ? "side" : "find"}</small></span>
          <span class="x-method-right">${showPair ? valueText(example.right) : "?"}<small>${showPair ? "side" : "find"}</small></span>
          <span class="x-method-bottom">${valueText(example.b)}<small>b</small></span>
        </div>
        <div class="x-method-divide-rule">
          <strong>After you find the two side numbers:</strong>
          divide <strong>BOTH side numbers</strong> by <strong>a = ${example.a}</strong>.
        </div>
      </div>
    `;
  }

  function divisionMarkup(example, reveal = "full") {
    if (reveal !== "full") return "";
    const entries = [
      ["Left side", example.left, example.leftReduced],
      ["Right side", example.right, example.rightReduced]
    ];

    return `
      <div class="x-method-step-banner">
        <strong>Step 4: Divide BOTH side numbers by a = ${example.a}</strong>
        <span>This is why each number from the left and right side of the X is divided by ${example.a}.</span>
      </div>
      <div class="x-method-divisions">
        ${entries.map(([label, side, reduced]) => `
          <div class="x-method-division-card">
            <div class="x-method-side-label">${label} of the X</div>
            <div class="x-method-division-equation">
              <strong>${valueText(side)}</strong> ÷ <strong>a (${example.a})</strong>
              = <strong>${fractionText(reduced)}</strong>
            </div>
            <div class="x-method-bottoms-up">
              <span>Reduced result:</span>
              <strong>${fractionText(reduced)}</strong>
              <span>→ factor</span>
              <strong>${reduced.factor}</strong>
            </div>
          </div>
        `).join("")}
      </div>
      <p class="x-method-note">
        <strong>Why divide by a?</strong> The two side numbers came from <strong>ac</strong>, not from c alone. Dividing <strong>each side number by a = ${example.a}</strong> converts those side numbers into the values used to build the two binomial factors. Reduce each fraction first. Then use the denominator as the coefficient of x and the numerator as the constant.
      </p>
      <div class="x-method-answer">Final factors: <strong>${example.answer}</strong></div>
    `;
  }

  function panelMarkup(example, { reveal = "full", title = "Visual X / AC method", compact = false } = {}) {
    const pairInstruction = reveal === "scaffold"
      ? `Find two numbers that multiply to <strong>${valueText(example.ac)}</strong> and add to <strong>${valueText(example.b)}</strong>. Put them on the two sides of the X. <strong>Then divide BOTH side numbers by a = ${example.a}.</strong>`
      : `The side numbers are <strong>${valueText(example.left)}</strong> and <strong>${valueText(example.right)}</strong> because ${valueText(example.left)} × ${valueText(example.right)} = ${valueText(example.ac)} and ${valueText(example.left)} ${example.right < 0 ? "−" : "+"} ${Math.abs(example.right)} = ${valueText(example.b)}.`;

    return `
      <section class="tolux-x-method ${compact ? "tolux-x-method-compact" : ""}" data-x-method-panel="true">
        <div class="x-method-heading">
          <span class="x-method-kicker">PAPER METHOD</span>
          <h3>${title}</h3>
        </div>
        <p class="x-method-expression">Factor <strong>${example.expression}</strong></p>
        <div class="x-method-abc">
          <span><strong>a</strong> = ${example.a}</span>
          <span><strong>b</strong> = ${valueText(example.b)}</span>
          <span><strong>c</strong> = ${valueText(example.c)}</span>
        </div>
        <div class="x-method-sequence">
          <div><strong>1</strong><span>Multiply a · c</span></div>
          <div><strong>2</strong><span>Find the two side numbers</span></div>
          <div class="x-method-sequence-emphasis"><strong>3</strong><span>Divide BOTH side numbers by a</span></div>
          <div><strong>4</strong><span>Write the factors</span></div>
        </div>
        <p>Multiply <strong>a · c</strong>: ${example.a} · ${valueText(example.c)} = <strong>${valueText(example.ac)}</strong>. Put <strong>ac</strong> at the top of the X and <strong>b</strong> at the bottom.</p>
        <div class="x-method-layout">
          ${crossMarkup(example, reveal)}
          <div class="x-method-instructions">
            <p>${pairInstruction}</p>
            ${reveal === "pair" ? `<p class="x-method-next-step"><strong>Next step:</strong> divide <strong>${valueText(example.left)}</strong> and <strong>${valueText(example.right)}</strong> by <strong>a = ${example.a}</strong>. Both side numbers are divided by a.</p>` : ""}
          </div>
        </div>
        ${divisionMarkup(example, reveal)}
      </section>
    `;
  }

  function installStyles() {
    if (document.querySelector("#toluxXMethodStyles")) return;
    const style = document.createElement("style");
    style.id = "toluxXMethodStyles";
    style.textContent = `
      .tolux-x-method{margin:24px 0;padding:22px;border:1px solid #b7cef3;border-radius:16px;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%);color:#253858}
      .x-method-heading{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:8px}
      .x-method-heading h3{margin:0;color:#123b78}
      .x-method-kicker{display:inline-flex;padding:4px 9px;border-radius:999px;background:#e5efff;color:#174ea6;font-size:.74rem;font-weight:900;letter-spacing:.06em}
      .x-method-expression{font-family:Georgia,'Times New Roman',serif;font-size:1.22rem;color:#172b4d}
      .x-method-abc{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 16px}
      .x-method-abc span{min-width:88px;padding:8px 12px;border-radius:10px;background:#eef5ff;text-align:center}
      .x-method-sequence{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0 18px}
      .x-method-sequence>div{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;background:#f2f6fb;font-size:.88rem}
      .x-method-sequence>div>strong{display:grid;place-items:center;min-width:25px;height:25px;border-radius:50%;background:#174ea6;color:#fff}
      .x-method-sequence-emphasis{background:#fff2cc!important;border:1px solid #e9c65d;font-weight:800}
      .x-method-layout{display:grid;grid-template-columns:250px minmax(0,1fr);gap:24px;align-items:center;margin:16px 0}
      .x-method-cross-wrap{display:grid;gap:8px}
      .x-method-cross{position:relative;width:190px;height:170px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:1.25rem;font-weight:800;color:#17365d}
      .x-method-cross::before,.x-method-cross::after{content:'';position:absolute;left:37px;top:84px;width:116px;height:3px;border-radius:3px;background:#17365d;transform-origin:center}
      .x-method-cross::before{transform:rotate(45deg)}
      .x-method-cross::after{transform:rotate(-45deg)}
      .x-method-cross span{position:absolute;display:grid;place-items:center;min-width:54px;min-height:38px;padding:3px 7px;border-radius:10px;background:#fff;box-shadow:0 2px 7px rgba(18,59,120,.09)}
      .x-method-cross small{display:block;color:#5d6c80;font-family:system-ui,sans-serif;font-size:.65rem;line-height:1}
      .x-method-top{top:0;left:68px;color:#174ea6!important}
      .x-method-bottom{bottom:0;left:68px;color:#b42318!important}
      .x-method-left{top:65px;left:0;color:#177245!important}
      .x-method-right{top:65px;right:0;color:#177245!important}
      .x-method-divide-rule{padding:8px 10px;border-radius:9px;background:#fff2cc;border:1px solid #e9c65d;color:#5b4300;text-align:center;font-size:.86rem;line-height:1.35}
      .x-method-instructions p{line-height:1.55}
      .x-method-next-step{padding:10px 12px;border-left:4px solid #d89b00;background:#fff8e5}
      .x-method-step-banner{display:grid;gap:4px;margin-top:18px;padding:12px 14px;border-radius:11px;background:#fff2cc;border:1px solid #e9c65d;color:#5b4300}
      .x-method-step-banner strong{font-size:1.02rem}
      .x-method-step-banner span{font-size:.9rem}
      .x-method-divisions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
      .x-method-division-card{padding:14px;border:1px solid #d7e2f2;border-radius:12px;background:#fff;text-align:center}
      .x-method-side-label{margin-bottom:8px;color:#177245;font-weight:850;text-transform:uppercase;font-size:.76rem;letter-spacing:.04em}
      .x-method-division-equation{font-size:1.02rem}
      .x-method-bottoms-up{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:7px;margin-top:9px;color:#5d3b8c}
      .x-method-note{margin:14px 0 0;padding:12px 14px;border-left:4px solid #5d3b8c;background:#faf7ff;line-height:1.5}
      .x-method-answer{margin-top:14px;padding:12px 15px;border-radius:11px;background:#fff5d6;color:#513b00;font-family:Georgia,'Times New Roman',serif;font-size:1.12rem;text-align:center}
      .tolux-x-method-compact{margin-top:14px;padding:17px}
      .tolux-x-method-compact .x-method-expression{margin:8px 0}
      @media(max-width:700px){.x-method-sequence{grid-template-columns:1fr 1fr}.x-method-layout{grid-template-columns:1fr}.x-method-divisions{grid-template-columns:1fr}.tolux-x-method{padding:17px}.x-method-cross{transform:scale(.94)}}
    `;
    document.head.append(style);
  }

  function injectConceptVisual() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-x-method-concept="true"]')) return;
    if (!content.querySelector(".concept-grid")) return;

    const wrapper = document.createElement("div");
    wrapper.dataset.xMethodConcept = "true";
    wrapper.innerHTML = `
      <div class="tolux-x-method-intro">
        <h3>Visual strategy: draw the X</h3>
        <p>For <strong>ax² + bx + c</strong>: put <strong>ac</strong> at the top, <strong>b</strong> at the bottom, find the two side numbers, and then <strong>divide BOTH side numbers by a</strong> before writing the factors.</p>
      </div>
      ${panelMarkup(CONCEPT_EXAMPLE, { reveal: "full", title: "How the X method works" })}
    `;
    const button = content.querySelector("#continueLessonBtn");
    if (button) content.insertBefore(wrapper, button);
    else content.append(wrapper);
  }

  function injectWorkedVisual() {
    const id = currentItemId();
    const example = EXAMPLES[id];
    if (!example || !id.startsWith("A10E-L")) return;
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-x-method-panel="true"]')) return;
    const solution = content.querySelector(".solution-panel");
    if (!solution) return;
    solution.insertAdjacentHTML("afterend", panelMarkup(example, {
      reveal: "full",
      title: id === "A10E-L03" ? "Another visual: X method for a perfect-square trinomial" : "Visual X method"
    }));
  }

  function injectGuidedScaffold() {
    const id = currentItemId();
    if (id !== "A10E-G02") return;
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-x-method-panel="true"]')) return;
    const prompt = content.querySelector(".math-prompt");
    if (!prompt) return;
    prompt.insertAdjacentHTML("afterend", panelMarkup(EXAMPLES[id], {
      reveal: "scaffold",
      title: "Your X: find the side numbers, then divide BOTH by a",
      compact: true
    }));
  }

  function augmentLessonContent() {
    const id = currentItemId();
    if (id !== lastVisibleItemId) {
      lastVisibleItemId = id;
      if (id) hintProgress.set(id, 0);
    }
    injectConceptVisual();
    injectWorkedVisual();
    injectGuidedScaffold();
  }

  function blockedFeedback() {
    const text = document.querySelector("#lessonFeedback")?.textContent || "";
    return /sign in required|upgrade to continue|unable to continue|connection problem/i.test(text);
  }

  function appendHelpVisual(kind, id) {
    const example = EXAMPLES[id];
    const feedback = document.querySelector("#lessonFeedback");
    if (!example || !feedback || blockedFeedback()) return;
    feedback.querySelector('[data-x-method-help="true"]')?.remove();

    let reveal = "full";
    let title = "Another way: draw the X, then divide BOTH sides by a";
    if (kind === "hint") {
      const level = Math.min((hintProgress.get(id) || 0) + 1, 3);
      hintProgress.set(id, level);
      reveal = level === 1 ? "scaffold" : level === 2 ? "pair" : "full";
      title = level === 1
        ? "Hint: set up the X"
        : level === 2
          ? "Hint: check the side numbers, then divide BOTH by a"
          : "Hint: divide BOTH side numbers by a and build the factors";
    }

    const wrapper = document.createElement("div");
    wrapper.dataset.xMethodHelp = "true";
    wrapper.innerHTML = panelMarkup(example, { reveal, title, compact: true });
    feedback.append(wrapper);
  }

  function installHelpHooks() {
    document.addEventListener("click", event => {
      const button = event.target.closest("#lessonExplainBtn, #lessonStuckBtn");
      if (!button) return;
      const id = currentItemId();
      if (!EXAMPLES[id]) return;
      const kind = button.id === "lessonStuckBtn" ? "hint" : "explain";
      window.setTimeout(() => appendHelpVisual(kind, id), 0);
    });
  }

  installStyles();
  installHelpHooks();

  const observer = new MutationObserver(augmentLessonContent);
  const start = () => {
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    observer.observe(content, { childList: true, subtree: true, characterData: true });
    augmentLessonContent();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();