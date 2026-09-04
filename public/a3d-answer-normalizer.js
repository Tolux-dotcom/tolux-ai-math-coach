(() => {
  const params = new URLSearchParams(window.location.search);
  const isA3DLesson = params.get("module") === "alg1-a3d-graph-linear-inequalities";
  const isA3DPractice = params.get("skill") === "A.3D";
  if (!isA3DLesson && !isA3DPractice) return;

  function canonicalizeBoundaryDescription(value) {
    const original = String(value ?? "");
    const text = original
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/[.,;:!?()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // If the student also wrote an equation/inequality, preserve it. Those
    // items need the algebraic expression as well as the graph description.
    if (/[=<>≤≥]/.test(text)) return original;

    const hasSolid = /\bsolid\b/.test(text);
    const hasDashed = /\b(?:dashed|dash)\b/.test(text);
    const hasAbove = /\babove\b/.test(text);
    const hasBelow = /\bbelow\b/.test(text);

    const exactlyOneStyle = Number(hasSolid) + Number(hasDashed) === 1;
    const exactlyOneDirection = Number(hasAbove) + Number(hasBelow) === 1;
    if (!exactlyOneStyle || !exactlyOneDirection) return original;

    const style = hasSolid ? "solid" : "dashed";
    const direction = hasAbove ? "above" : "below";
    return `${style}; ${direction}`;
  }

  function normalizeInput(input) {
    if (!input) return;
    const normalized = canonicalizeBoundaryDescription(input.value);
    if (normalized !== input.value) {
      input.value = normalized;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#submitLessonAnswer")) {
      normalizeInput(document.querySelector("#lessonAnswer"));
    }
    if (event.target.closest("#checkPracticeAnswer")) {
      normalizeInput(document.querySelector("#practiceAnswer"));
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    if (event.target.matches?.("#lessonAnswer, #practiceAnswer")) {
      normalizeInput(event.target);
    }
  }, true);

  // Expose the pure normalizer for lightweight regression checks in preview QA.
  window.__toluxA3DCanonicalizeBoundaryDescription = canonicalizeBoundaryDescription;
})();
