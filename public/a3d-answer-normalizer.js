(() => {
  const params = new URLSearchParams(window.location.search);
  const isA3DLesson = params.get("module") === "alg1-a3d-graph-linear-inequalities";
  const isA3DPractice = params.get("skill") === "A.3D";
  if (!isA3DLesson && !isA3DPractice) return;

  function canonicalizeBoundaryDescription(value) {
    const original = String(value ?? "");
    const normalized = original
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    const prose = normalized
      .replace(/[.,;:!?()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const hasSolid = /\bsolid\b/.test(prose);
    const hasDashed = /\b(?:dashed|dash)\b/.test(prose);
    const hasAbove = /\babove\b/.test(prose);
    const hasBelow = /\bbelow\b/.test(prose);

    const exactlyOneStyle = Number(hasSolid) + Number(hasDashed) === 1;
    const exactlyOneDirection = Number(hasAbove) + Number(hasBelow) === 1;
    if (!exactlyOneStyle || !exactlyOneDirection) return original;

    const style = hasSolid ? "solid" : "dashed";
    const direction = hasAbove ? "above" : "below";

    // Combined A.3D responses often contain BOTH the rewritten inequality
    // and a natural-language graph description, for example:
    //   y≥-2x-4, solid line, shade above
    // Canonicalize that to the exact compact form used by the answer bank:
    //   y≥-2x-4; solid; above
    // This preserves the mathematics while ignoring harmless words such as
    // "line" and "shade" and punctuation differences.
    const equationMatch = normalized.match(
      /\by\s*(?:>=|<=|>|<|≥|≤)\s*[^,;]+?(?=\s+(?:solid|dashed|dash|shade|shading)\b|[,;]|$)/i
    );

    if (equationMatch) {
      const equation = equationMatch[0]
        .replace(/\s+/g, "")
        .replace(/>=/g, "≥")
        .replace(/<=/g, "≤");
      return `${equation}; ${style}; ${direction}`;
    }

    // Pure graph-description answers such as "solid line shade above line"
    // are reduced to the compact answer-bank form.
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
