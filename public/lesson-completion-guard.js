(() => {
  const next = document.querySelector("#nextLessonStep");
  const stage = document.querySelector("#lessonStage");
  const feedback = document.querySelector("#lessonFeedback");
  if (!next || !stage) return;

  document.addEventListener("click", event => {
    if (event.target !== next) return;
    const label = String(stage.textContent || "").trim();
    const hidden = next.style.display === "none" || next.hidden || next.disabled;
    if (label === "Lesson Complete" || label === "Lesson unavailable" || hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (label === "Lesson Complete" && feedback) feedback.innerHTML = "";
    }
  }, true);
})();
