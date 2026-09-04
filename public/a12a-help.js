(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a12a-identify-functions") return;

  let itemMap = new Map();

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function currentItemId() {
    const spans = document.querySelectorAll("#lessonContent .question-header span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : "";
  }

  function fullSolution(item, heading = "Correct answer and full explanation") {
    if (!item) return "";
    const steps = item.solution_steps || item.alternate_solution_steps || [];
    const stepMarkup = steps.map((step, index) => `
      <li>
        <span class="solution-step-number">${index + 1}</span>
        <div><div class="math-line">${escapeHtml(step.equation)}</div><p>${escapeHtml(step.explanation)}</p></div>
      </li>`).join("");
    return `
      <div class="solution-panel a12a-reveal" data-a12a-reveal="true">
        <h3>${escapeHtml(heading)}</h3>
        <p><strong>Final answer:</strong> ${escapeHtml(item.answer_key)}</p>
        <ol class="solution-steps">${stepMarkup}</ol>
        <div class="lesson-state lesson-state-success">
          <strong>Function rule to remember</strong>
          <p>Each input must have exactly one output. Repeated outputs are allowed. One input with two different outputs means the relation is not a function.</p>
        </div>
      </div>`;
  }

  function strengthenFeedback() {
    const feedback = document.querySelector("#lessonFeedback");
    if (!feedback || feedback.querySelector('[data-a12a-reveal="true"]')) return;
    const text = feedback.textContent || "";
    const item = itemMap.get(currentItemId());
    if (!item) return;

    const wrongAttempt = /not quite|not correct|try again|review this|needs revision|incorrect/i.test(text);
    const thirdHint = /hint\s*3/i.test(text);
    const alternate = /another way/i.test(text);

    if (wrongAttempt || thirdHint || alternate) {
      feedback.insertAdjacentHTML(
        "beforeend",
        fullSolution(item, wrongAttempt ? "Check your work: answer and full solution" : "Full explanation and answer")
      );
    }
  }

  async function start() {
    try {
      const response = await fetch("/a12a-identify-functions.json");
      if (response.ok) {
        const module = await response.json();
        itemMap = new Map([...(module.items || []), ...(module.practice_bank || [])].map(item => [item.id, item]));
      }
    } catch (error) {
      console.warn("A.12A help bank unavailable:", error);
    }

    const feedback = document.querySelector("#lessonFeedback");
    if (!feedback) return;
    const observer = new MutationObserver(() => strengthenFeedback());
    observer.observe(feedback, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();