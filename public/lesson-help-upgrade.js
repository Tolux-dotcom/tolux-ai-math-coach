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
    },
    "A9A-P01": {
      hints: [
        "Focus on the input x. In f(x)=−5(4ˣ), the exponent x can be any real number: negative, zero, or positive.",
        "The factor −5 changes the outputs by reflecting them below the x-axis, but it does not restrict which x-values are allowed.",
        "Therefore the domain is all real numbers, written (−∞, ∞)."
      ],
      intro: "The negative coefficient changes the range, not the domain. Exponential expressions such as 4ˣ are defined for every real exponent x.",
      alternateIntro: "Think horizontally across the graph. The curve extends forever to the left and right, so every real x-value is allowed even though the graph is reflected below the x-axis.",
      steps: [
        { equation: "x can be any real number", explanation: "The exponential expression 4ˣ is defined for every real x." },
        { equation: "−5 changes outputs only", explanation: "Multiplying by −5 reflects and stretches the graph vertically; it does not remove any x-values." },
        { equation: "domain: all real numbers", explanation: "There is no restriction on the input x." },
        { equation: "domain: (−∞, ∞)", explanation: "Infinity always uses parentheses because it is not an endpoint that can be included." }
      ],
      answer: "all real numbers or (−∞, ∞)"
    },
    "A9A-P02": {
      hints: [
        "Start with the vertical shift. The −2 moves the horizontal asymptote from y = 0 down to y = −2.",
        "Because 3ˣ is always positive and the coefficient 6 is positive, 6(3ˣ) is always greater than 0. Subtracting 2 keeps the graph above y = −2.",
        "The graph approaches y = −2 but never reaches it, so −2 is not included. The range is y > −2, or (−2, ∞). Use a parenthesis at −2, not a bracket."
      ],
      intro: "The −2 shifts the horizontal asymptote to y = −2. A positive coefficient keeps the graph above that asymptote.",
      alternateIntro: "Think from the graph: start at the asymptote y = −2, then notice that a positive exponential curve lives above the asymptote and never touches it.",
      steps: [
        { equation: "3ˣ > 0", explanation: "The exponential part is positive for every real x." },
        { equation: "6(3ˣ) > 0", explanation: "Multiplying by positive 6 keeps the exponential output positive." },
        { equation: "6(3ˣ) − 2 > −2", explanation: "Subtracting 2 shifts every output down 2 units, but the graph remains above −2." },
        { equation: "horizontal asymptote: y = −2", explanation: "The graph approaches −2 but never reaches it." },
        { equation: "range: y > −2 = (−2, ∞)", explanation: "Use a parenthesis at −2 because the endpoint is excluded." }
      ],
      answer: "y > −2 or (−2, ∞)"
    },
    "A9A-P03": {
      hints: [
        "The inequality y < 5 means every value below 5 is included, but 5 itself is not included.",
        "An excluded endpoint uses a parenthesis. Infinity also always uses a parenthesis.",
        "Therefore y < 5 is written (−∞, 5)."
      ],
      intro: "Interval notation uses parentheses for endpoints that are not included.",
      alternateIntro: "Picture the number line: shade everything to the left of 5, place an open circle at 5, and use parentheses in interval notation.",
      steps: [
        { equation: "y < 5", explanation: "All values less than 5 are included." },
        { equation: "5 is excluded", explanation: "The inequality is strict, so 5 is not part of the set." },
        { equation: "range: (−∞, 5)", explanation: "Use parentheses at both ends; infinity never uses a bracket." }
      ],
      answer: "(−∞, 5)"
    },
    "A9A-P04": {
      hints: [
        "Read the context carefully: the bacteria count is measured only at whole hours from 0 through 12.",
        "That means the domain is not every real number between 0 and 12. Only the discrete whole-number times are allowed.",
        "So the contextual domain is {0,1,2,…,12}, or 'whole numbers 0 through 12.'"
      ],
      intro: "Real-world context can make an exponential domain discrete even though the parent exponential function has all-real domain.",
      alternateIntro: "Think of the measurement schedule: there is a reading at hour 0, hour 1, hour 2, and so on through hour 12, but not at every decimal time in between.",
      steps: [
        { equation: "0 ≤ t ≤ 12", explanation: "The time interval starts at 0 and ends at 12." },
        { equation: "t is a whole number", explanation: "Measurements are taken only at whole hours." },
        { equation: "domain: {0,1,2,…,12}", explanation: "List the allowed discrete input values." }
      ],
      answer: "whole numbers 0 through 12 or {0,1,2,…,12}"
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

    if (/^Correct\./i.test(text.trim()) || /Correct\./i.test(text)) {
      feedback.innerHTML = richA9aSolution(config, "Correct — here is why");
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
