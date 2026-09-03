(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a10e-factor-trinomials") return;

  const lessonContent = document.querySelector("#lessonContent");
  const answerLabel = document.querySelector('#lessonAnswerArea label strong');
  if (!lessonContent) return;

  function currentItemId() {
    const header = lessonContent.querySelector(".question-header");
    if (!header) return null;
    const spans = header.querySelectorAll("span");
    return spans.length ? spans[spans.length - 1].textContent.trim() : null;
  }

  function alignG02() {
    const id = currentItemId();
    if (answerLabel) {
      answerLabel.textContent = id === "A10E-G02"
        ? "Your divided results"
        : "Your answer";
    }
    if (id !== "A10E-G02") return;

    const panel = lessonContent.querySelector('[data-x-method-panel="true"]');
    if (!panel) return;

    const title = panel.querySelector(".x-method-heading h3");
    if (title) title.textContent = "Now divide BOTH side numbers by a = 2";

    const left = panel.querySelector(".x-method-left");
    const right = panel.querySelector(".x-method-right");
    if (left) left.textContent = "6";
    if (right) right.textContent = "1";

    const instruction = panel.querySelector(".x-method-instructions p");
    if (instruction) {
      instruction.innerHTML =
        "The X-side numbers are <strong>6</strong> and <strong>1</strong>. " +
        "Now divide <strong>BOTH</strong> side numbers by <strong>a = 2</strong>: " +
        "<strong>6 ÷ 2</strong> and <strong>1 ÷ 2</strong>. " +
        "Enter the two reduced values below; order does not matter.";
    }

    panel.querySelectorAll("p, div").forEach(element => {
      if (/after you find the two side numbers/i.test(element.textContent || "")) {
        element.innerHTML =
          "<strong>This question is checking the divide-by-a step.</strong> " +
          "The side numbers are already 6 and 1. Divide BOTH by a = 2, then enter the two reduced values.";
      }
    });
  }

  const observer = new MutationObserver(() => window.setTimeout(alignG02, 0));
  observer.observe(lessonContent, { childList: true, subtree: true, characterData: true });
  alignG02();
})();
