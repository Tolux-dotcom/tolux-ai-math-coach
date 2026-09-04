(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a11a-radical-expressions") return;

  const EXAMPLES = {
    "A11A-L01": {
      title: "Pull out the largest perfect-square factor",
      start: "√72",
      factor: "√(36 · 2)",
      split: "√36 · √2",
      result: "6√2",
      note: "36 is the largest perfect-square factor of 72."
    },
    "A11A-L02": {
      title: "Simplify first, then combine like radicals",
      start: "2√18 + √8",
      factor: "2√(9 · 2) + √(4 · 2)",
      split: "6√2 + 2√2",
      result: "8√2",
      note: "Only combine radicals after their simplified radicands match."
    },
    "A11A-L03": {
      title: "Use the product property",
      start: "√6 · √24",
      factor: "√(6 · 24)",
      split: "√144",
      result: "12",
      note: "Multiplying first creates a perfect square."
    }
  };

  function currentItemId() {
    const header = document.querySelector("#lessonContent .question-header");
    if (!header) return null;
    const spans = header.querySelectorAll("span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : null;
  }

  function installStyles() {
    if (document.querySelector("#a11aVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "a11aVisualStyles";
    style.textContent = `
      .a11a-visual{margin:22px 0;padding:20px;border:1px solid #c8d8ff;border-radius:16px;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%);color:#243b53}
      .a11a-visual h3{margin:0 0 8px;color:#174ea6}
      .radical-ladder{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:stretch;margin:18px 0}
      .radical-step{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:112px;padding:14px;border:1px solid #d8e2ef;border-radius:14px;background:#fff;text-align:center}
      .radical-step:not(:last-child)::after{content:'→';position:absolute;right:-18px;top:50%;transform:translateY(-50%);font-size:1.35rem;font-weight:900;color:#59708d;z-index:2}
      .radical-step strong{font-family:Georgia,'Times New Roman',serif;font-size:1.35rem;color:#17365d}
      .radical-step small{display:block;margin-top:8px;color:#65758b}
      .radical-step.result{border-color:#9ed2ac;background:#effaf3}
      .perfect-square-strip{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
      .perfect-square-strip span{padding:7px 10px;border-radius:999px;background:#eef5ff;color:#174ea6;font-weight:700}
      .a11a-note{margin-top:12px;padding:12px 14px;border-left:4px solid #6a4bbc;background:#faf8ff;line-height:1.55}
      @media(max-width:760px){.radical-ladder{grid-template-columns:1fr}.radical-step:not(:last-child)::after{content:'↓';right:auto;left:50%;top:auto;bottom:-22px;transform:translateX(-50%)}}
    `;
    document.head.append(style);
  }

  function ladderMarkup(example, title = example.title) {
    return `
      <section class="a11a-visual" data-a11a-visual="true">
        <h3>${title}</h3>
        <p>Look for a perfect-square factor, rewrite the radicand, then take the square root of that perfect-square factor.</p>
        <div class="radical-ladder">
          <div class="radical-step"><strong>${example.start}</strong><small>Start</small></div>
          <div class="radical-step"><strong>${example.factor}</strong><small>Expose a perfect square</small></div>
          <div class="radical-step"><strong>${example.split}</strong><small>Simplify the square root</small></div>
          <div class="radical-step result"><strong>${example.result}</strong><small>Simplified form</small></div>
        </div>
        <div class="a11a-note"><strong>Why this works:</strong> ${example.note}</div>
      </section>
    `;
  }

  function injectConcept() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-a11a-concept="true"]') || !content.querySelector(".concept-grid")) return;
    const wrapper = document.createElement("div");
    wrapper.dataset.a11aConcept = "true";
    wrapper.innerHTML = `
      <section class="a11a-visual">
        <h3>Visual strategy: hunt for a perfect square</h3>
        <p>These common perfect squares are the numbers you want to spot inside a radicand:</p>
        <div class="perfect-square-strip">
          <span>1²=1</span><span>2²=4</span><span>3²=9</span><span>4²=16</span><span>5²=25</span><span>6²=36</span><span>7²=49</span><span>8²=64</span><span>9²=81</span><span>10²=100</span><span>11²=121</span><span>12²=144</span>
        </div>
        <p>Choose the largest perfect-square factor you can. That usually simplifies the radical in one clean step.</p>
      </section>
      ${ladderMarkup(EXAMPLES["A11A-L01"], "Example: simplify √72 visually")}
    `;
    const button = content.querySelector("#continueLessonBtn");
    if (button) content.insertBefore(wrapper, button);
    else content.append(wrapper);
  }

  function injectWorked() {
    const id = currentItemId();
    const example = EXAMPLES[id];
    const content = document.querySelector("#lessonContent");
    if (!example || !content || content.querySelector('[data-a11a-visual="true"]')) return;
    const solution = content.querySelector(".solution-panel");
    if (!solution) return;
    solution.insertAdjacentHTML("afterend", ladderMarkup(example));
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
