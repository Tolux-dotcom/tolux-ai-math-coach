(() => {
  const params = new URLSearchParams(window.location.search);
  const moduleId = params.get("module");
  if (!moduleId) return;

  const feedback = document.querySelector("#lessonFeedback");
  const stage = document.querySelector("#lessonStage");
  if (!feedback || !stage) return;

  const modulePath = `/${moduleId.replace(/^alg1-/, "")}.json`;
  let itemMap = new Map();

  const A9A_G01 = {
    hints: [
      "Start with the horizontal asymptote. For an unshifted exponential function, the graph approaches y = 0 but never reaches 0.",
      "Because 0.5ˣ is positive for every real x and the coefficient 7 is also positive, every output of 7(0.5ˣ) is greater than 0.",
      "So the range is all positive real numbers: y > 0, which is the interval (0, ∞)."
    ],
    steps: [
      {
        equation: "0.5ˣ > 0",
        explanation: "An exponential expression with a positive base is always positive."
      },
      {
        equation: "7(0.5ˣ) > 0",
        explanation: "Multiplying by the positive coefficient 7 keeps every output positive."
      },
      {
        equation: "y = 0 is a horizontal asymptote",
        explanation: "The graph approaches 0 but never reaches it, so 0 is not included."
      },
      {
        equation: "range: y > 0 = (0, ∞)",
        explanation: "All outputs are positive, regardless of whether the function is growth or decay."
      }
    ],
    answer: "y > 0 or (0, ∞)"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentItemId() {
    const spans = document.querySelectorAll("#lessonContent .question-header span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : "";
  }

  function allowFullSolution() {
    return /Solve with Tolux|Your Turn|Similar Problem/i.test(stage.textContent || "");
  }

  function stepMarkup(steps, heading = "Step-by-step solution") {
    if (!Array.isArray(steps) || steps.length === 0) return "";
    return `
      <div class="solution-panel tolux-help-upgrade-panel">
        <h3>${escapeHtml(heading)}</h3>
        <ol class="solution-steps">
          ${steps.map((step, index) => `
            <li>
              <span class="solution-step-number">${index + 1}</span>
              <div>
                <div class="math-line">${escapeHtml(step.equation || "")}</div>
                <p>${escapeHtml(step.explanation || "")}</p>
              </div>
            </li>
          `).join("")}
        </ol>
      </div>
    `;
  }

  function currentItem() {
    return itemMap.get(currentItemId()) || null;
  }

  function fullSolutionMarkup(item) {
    if (currentItemId() === "A9A-G01") {
      return `
        <div class="lesson-state lesson-state-success">
          <strong>Here is the complete solution</strong>
          <p>Decay changes the direction of the graph as x changes, but it does not make the outputs negative.</p>
        </div>
        ${stepMarkup(A9A_G01.steps)}
        <p class="tolux-final-answer"><strong>Final answer:</strong> ${escapeHtml(A9A_G01.answer)}</p>
      `;
    }

    if (!item) return "";
    const steps = Array.isArray(item.solution_steps) && item.solution_steps.length
      ? item.solution_steps
      : Array.isArray(item.alternate_solution_steps) && item.alternate_solution_steps.length
        ? item.alternate_solution_steps
        : [];

    return `
      <div class="lesson-state lesson-state-success">
        <strong>Here is the complete solution</strong>
        ${item.tutor_behavior ? `<p>${escapeHtml(item.tutor_behavior)}</p>` : ""}
      </div>
      ${stepMarkup(steps)}
      <p class="tolux-final-answer"><strong>Final answer:</strong> ${escapeHtml(item.answer_key || "")}</p>
    `;
  }

  function upgradeA9aHelp() {
    if (currentItemId() !== "A9A-G01") return false;
    if (feedback.querySelector("[data-a9a-rich-help='true']")) return true;
    const text = feedback.textContent || "";

    const hintMatch = text.match(/Hint\s+([123])/i);
    if (hintMatch) {
      const index = Math.max(0, Number(hintMatch[1]) - 1);
      feedback.innerHTML = `
        <div data-a9a-rich-help="true" class="lesson-state lesson-state-warning">
          <strong>Hint ${index + 1}</strong>
          <p>${escapeHtml(A9A_G01.hints[index])}</p>
          ${index === 2 ? `<p><strong>Answer:</strong> ${escapeHtml(A9A_G01.answer)}</p>` : ""}
        </div>
      `;
      return true;
    }

    if (/Another way to think about it/i.test(text)) {
      feedback.innerHTML = `
        <div data-a9a-rich-help="true" class="lesson-state lesson-state-success">
          <strong>Another way: think about the graph</strong>
          <p>The base 0.5 makes this an exponential decay function, so the graph falls as x increases. But the graph stays above the x-axis because both 0.5ˣ and 7 are positive.</p>
        </div>
        ${stepMarkup(A9A_G01.steps, "Why the range stays positive")}
        <p class="tolux-final-answer"><strong>Final answer:</strong> ${escapeHtml(A9A_G01.answer)}</p>
      `;
      return true;
    }

    return false;
  }

  function addShowSolutionButton() {
    if (!allowFullSolution()) return;
    const text = feedback.textContent || "";
    if (!/Not quite yet|Not correct yet|Try the problem again/i.test(text)) return;
    if (feedback.querySelector(".tolux-show-solution")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson-primary-button tolux-show-solution";
    button.textContent = "Show Answer & Full Solution";
    button.addEventListener("click", () => {
      feedback.innerHTML = fullSolutionMarkup(currentItem());
    });
    feedback.append(button);
  }

  function augmentFeedback() {
    if (upgradeA9aHelp()) return;
    addShowSolutionButton();
  }

  function installStyles() {
    if (document.querySelector("#toluxLessonHelpUpgradeStyles")) return;
    const style = document.createElement("style");
    style.id = "toluxLessonHelpUpgradeStyles";
    style.textContent = `
      .tolux-show-solution{margin-top:12px}
      .tolux-final-answer{margin-top:12px;padding:12px 14px;border-radius:10px;background:#eef7ff;border:1px solid #bfdcff;font-size:1.05rem}
      .tolux-help-upgrade-panel{margin-top:12px}
    `;
    document.head.append(style);
  }

  installStyles();
  fetch(modulePath)
    .then(response => response.ok ? response.json() : null)
    .then(module => {
      if (module?.items) itemMap = new Map(module.items.map(item => [item.id, item]));
    })
    .catch(() => {});

  const observer = new MutationObserver(augmentFeedback);
  observer.observe(feedback, { childList: true, subtree: true });
  augmentFeedback();
})();
