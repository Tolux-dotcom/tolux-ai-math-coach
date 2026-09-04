(() => {
  const params = new URLSearchParams(window.location.search);
  const moduleId = params.get("module");
  if (!moduleId) return;

  const feedback = document.querySelector("#lessonFeedback");
  const stage = document.querySelector("#lessonStage");
  if (!feedback || !stage) return;

  const modulePath = `/${moduleId.replace(/^alg1-/, "")}.json`;
  let itemMap = new Map();

  const A9A_HELP = {
    "A9A-G01": {
      hints: [
        "Start with the horizontal asymptote. Because there is no vertical shift, the asymptote is y = 0, and the graph never reaches it.",
        "Since 0.5ˣ is positive for every real x and the coefficient 7 is positive, 7(0.5ˣ) is always greater than 0.",
        "The graph stays above y = 0, so the range is y > 0, which is (0, ∞)."
      ],
      intro: "Decay changes the direction of the graph as x changes, but it does not make the outputs negative.",
      alternateIntro: "Picture the graph: exponential decay falls from left to right, but it stays above the horizontal asymptote y = 0.",
      steps: [
        { equation: "0.5ˣ > 0", explanation: "A positive exponential base produces positive outputs for every real x." },
        { equation: "7(0.5ˣ) > 0", explanation: "Multiplying by positive 7 keeps every output positive." },
        { equation: "horizontal asymptote: y = 0", explanation: "The graph approaches 0 but never reaches it." },
        { equation: "range: y > 0 = (0, ∞)", explanation: "All possible outputs lie above 0." }
      ],
      answer: "y > 0 or (0, ∞)"
    },
    "A9A-G02": {
      hints: [
        "Find the horizontal asymptote first. The +4 shifts the parent exponential graph up 4 units, so the asymptote is y = 4.",
        "Because 2ˣ is always positive, multiplying by −3 makes −3(2ˣ) always negative. Then adding 4 keeps every output below 4.",
        "The graph stays below the asymptote y = 4 and never reaches 4. Therefore the range is y < 4, or (−∞, 4)."
      ],
      intro: "The +4 moves the horizontal asymptote to y = 4, and the negative coefficient reflects the exponential graph below that asymptote.",
      alternateIntro: "Think graph first: shift the asymptote from y = 0 to y = 4, then use the negative coefficient to decide which side of the asymptote contains the graph.",
      steps: [
        { equation: "2ˣ > 0", explanation: "The exponential part is always positive." },
        { equation: "−3(2ˣ) < 0", explanation: "Multiplying by −3 reflects the positive exponential outputs below 0." },
        { equation: "−3(2ˣ) + 4 < 4", explanation: "Adding 4 shifts every output upward while keeping it below 4." },
        { equation: "horizontal asymptote: y = 4", explanation: "The graph approaches y = 4 from below but never reaches it." },
        { equation: "range: y < 4 = (−∞, 4)", explanation: "Every output is below 4." }
      ],
      answer: "y < 4 or (−∞, 4)"
    },
    "A9A-G03": {
      hints: [
        "This question gives a real-world restriction: time starts at t = 0, so negative time values are not allowed.",
        "The symbol ≥ includes 0 and every larger value, so the contextual domain starts at 0 and continues to the right.",
        "Therefore the contextual domain is t ≥ 0, which can also be written [0, ∞)."
      ],
      intro: "A contextual domain can be smaller than the mathematical domain because real situations impose restrictions.",
      alternateIntro: "Imagine a time axis. The model starts at t = 0 and continues forward, so only 0 and positive time values are allowed.",
      steps: [
        { equation: "t starts at 0", explanation: "The context does not allow negative time." },
        { equation: "t ≥ 0", explanation: "Zero is included, and all later times are allowed." },
        { equation: "domain: [0, ∞)", explanation: "Bracket at 0 because 0 is included; parenthesis at infinity." }
      ],
      answer: "t ≥ 0 or [0, ∞)"
    }
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
    return /Solve with Tolux|Your Turn|Similar Problem|Remediation Recheck/i.test(stage.textContent || "");
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

  function richA9aSolution(config, heading = "Here is the complete solution") {
    return `
      <div class="lesson-state lesson-state-success">
        <strong>${escapeHtml(heading)}</strong>
        <p>${escapeHtml(config.intro)}</p>
      </div>
      ${stepMarkup(config.steps)}
      <p class="tolux-final-answer"><strong>Final answer:</strong> ${escapeHtml(config.answer)}</p>
    `;
  }

  function fullSolutionMarkup(item) {
    const config = A9A_HELP[currentItemId()];
    if (config) return richA9aSolution(config);

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
    const config = A9A_HELP[currentItemId()];
    if (!config) return false;
    if (feedback.querySelector("[data-a9a-rich-help='true']")) return true;
    const text = feedback.textContent || "";

    const hintMatch = text.match(/Hint\s+([123])/i);
    if (hintMatch) {
      const index = Math.max(0, Math.min(2, Number(hintMatch[1]) - 1));
      feedback.innerHTML = `
        <div data-a9a-rich-help="true" class="lesson-state lesson-state-warning">
          <strong>Hint ${index + 1}</strong>
          <p>${escapeHtml(config.hints[index])}</p>
          ${index === 2 ? `
            <p class="tolux-final-answer"><strong>Answer:</strong> ${escapeHtml(config.answer)}</p>
            ${stepMarkup(config.steps, "Why this is the answer")}
          ` : ""}
        </div>
      `;
      return true;
    }

    if (/Another way to think about it|Another way:/i.test(text)) {
      feedback.innerHTML = `
        <div data-a9a-rich-help="true" class="lesson-state lesson-state-success">
          <strong>Another way: think about the graph</strong>
          <p>${escapeHtml(config.alternateIntro)}</p>
        </div>
        ${stepMarkup(config.steps, "Follow the graph logic")}
        <p class="tolux-final-answer"><strong>Final answer:</strong> ${escapeHtml(config.answer)}</p>
      `;
      return true;
    }

    return false;
  }

  function addShowSolutionButton() {
    if (!allowFullSolution()) return;
    const text = feedback.textContent || "";
    if (!/Not quite yet|Not correct yet|Try the problem again|need revision/i.test(text)) return;
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

  function addAlwaysAvailableCheckButton() {
    if (!allowFullSolution()) return;
    const id = currentItemId();
    const config = A9A_HELP[id];
    if (!config) return;
    if (feedback.querySelector(".tolux-check-answer")) return;
    if (feedback.querySelector(".tolux-final-answer")) return;

    const text = feedback.textContent || "";
    if (!/Hint\s+[12]|Another way/i.test(text)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson-primary-button tolux-check-answer";
    button.textContent = "Show Answer & Full Solution";
    button.addEventListener("click", () => {
      feedback.innerHTML = richA9aSolution(config);
    });
    feedback.append(button);
  }

  function augmentFeedback() {
    if (upgradeA9aHelp()) {
      addAlwaysAvailableCheckButton();
      return;
    }
    addShowSolutionButton();
  }

  function installStyles() {
    if (document.querySelector("#toluxLessonHelpUpgradeStyles")) return;
    const style = document.createElement("style");
    style.id = "toluxLessonHelpUpgradeStyles";
    style.textContent = `
      .tolux-show-solution,.tolux-check-answer{margin-top:12px}
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
