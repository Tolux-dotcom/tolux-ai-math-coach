(() => {
  const params = new URLSearchParams(window.location.search);
  const isA3DLesson = params.get("module") === "alg1-a3d-graph-linear-inequalities";
  const isA3DPractice = params.get("skill") === "A.3D";
  if (!isA3DLesson && !isA3DPractice) return;

  function canonicalizeYForm(equation) {
    const compact = String(equation ?? "")
      .replace(/\s+/g, "")
      .replace(/>=/g, "≥")
      .replace(/<=/g, "≤");

    const match = compact.match(/^y(≥|≤|>|<)(.+)$/i);
    if (!match) return compact;

    const [, relation, rhs] = match;

    // Already written with the x-term first, which is the answer-bank form.
    if (/^[+-]?(?:(?:\(\d+(?:\.\d+)?\/\d+(?:\.\d+)?\))|(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?))?x(?:[+-]\d+(?:\.\d+)?)?$/.test(rhs)) {
      return `y${relation}${rhs}`;
    }

    // Mathematically equivalent linear y-forms may place the constant first:
    //   y > 6 - 2x  is the same as  y > -2x + 6
    //   y ≥ -4 - 2x is the same as  y ≥ -2x - 4
    // Reorder ONLY simple linear RHS expressions; do not change the relation.
    const constantFirst = rhs.match(
      /^([+-]?\d+(?:\.\d+)?)([+-])((?:(?:\(\d+(?:\.\d+)?\/\d+(?:\.\d+)?\))|(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?))?)x$/
    );

    if (!constantFirst) return `y${relation}${rhs}`;

    const [, constant, operator, coefficient] = constantFirst;
    const xTerm = operator === "-"
      ? `-${coefficient || ""}x`
      : `${coefficient || ""}x`;
    const constantTerm = Number(constant) >= 0 && !constant.startsWith("+")
      ? `+${constant}`
      : constant;

    return `y${relation}${xTerm}${constantTerm}`;
  }

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
    // Canonicalize that to the compact answer-bank form while preserving
    // mathematically equivalent y-forms such as y>6-2x.
    const equationMatch = normalized.match(
      /\by\s*(?:>=|<=|>|<|≥|≤)\s*[^,;]+?(?=\s+(?:solid|dashed|dash|shade|shading)\b|[,;]|$)/i
    );

    if (equationMatch) {
      const equation = canonicalizeYForm(equationMatch[0]);
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

  window.__toluxA3DCanonicalizeBoundaryDescription = canonicalizeBoundaryDescription;
  window.__toluxA3DCanonicalizeYForm = canonicalizeYForm;
})();
