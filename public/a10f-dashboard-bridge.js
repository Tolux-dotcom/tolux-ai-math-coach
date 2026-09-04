(() => {
  const TUTOR_VALUE = "alg1-a10f-difference-of-squares";
  const PRACTICE_VALUE = "A.10F";
  const LABEL = "A.10F • Difference of Two Squares";

  function ensureOption(select, value, label) {
    if (!select) return false;
    if ([...select.options].some(option => option.value === value)) return true;

    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
    return true;
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  function updateTutorSummary() {
    const select = document.querySelector("#tutorSkillSelect");
    if (!select || select.value !== TUTOR_VALUE) return;

    const summary = document.querySelector("#tutorLessonSummary");
    if (!summary || summary.dataset.a10fSummary === "true") return;

    summary.innerHTML = `
      <strong>A.10F • Difference of Two Squares</strong>
      <p>Recognize and factor binomials with difference-of-squares structure, including GCF-first and repeated-factorization cases.</p>
      <small>Lesson path: Learn → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>
    `;
    summary.dataset.a10fSummary = "true";
  }

  function syncControls() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    const practiceSelect = document.querySelector("#practiceSkillSelect");

    // app.js fills both controls after the curriculum catalog finishes loading.
    // Wait for that normal render before adding A.10F so we never fight or
    // continuously rewrite the dashboard DOM.
    if (
      !tutorSelect ||
      !practiceSelect ||
      tutorSelect.options.length === 0 ||
      practiceSelect.options.length === 0
    ) {
      return false;
    }

    ensureOption(tutorSelect, TUTOR_VALUE, LABEL);
    ensureOption(practiceSelect, PRACTICE_VALUE, LABEL);

    setTextIfChanged(
      document.querySelector("#tutorAvailability"),
      `${tutorSelect.options.length} completed Algebra 1 lessons available in Tutor Mode.`
    );
    setTextIfChanged(
      document.querySelector("#practiceAvailability"),
      `${practiceSelect.options.length} completed Algebra 1 skills available for focused practice.`
    );
    setTextIfChanged(
      document.querySelector("#algebra1Coverage strong"),
      `${tutorSelect.options.length} live skill modules`
    );

    updateTutorSummary();
    return true;
  }

  function start() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    tutorSelect?.addEventListener("change", () => {
      const summary = document.querySelector("#tutorLessonSummary");
      if (summary) delete summary.dataset.a10fSummary;
      updateTutorSummary();
    });

    // Bounded polling is deliberate here. The earlier broad MutationObserver
    // watched most of the dashboard and then changed text inside its own
    // callback, which could create a self-triggering mutation loop and freeze
    // Chrome. Poll only until the existing app has rendered its controls.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = syncControls();
      if (ready || attempts >= 100) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

// The dashboard already loads this completion bridge. Chain later completed
// modules from here so each new TEKS module does not require another edit to
// the large dashboard HTML file.
if (!document.querySelector('script[data-tolux-a11a-bridge]')) {
  const script = document.createElement("script");
  script.src = "/a11a-dashboard-bridge.js";
  script.defer = true;
  script.dataset.toluxA11aBridge = "true";
  document.head.append(script);
}

// Algebra 2 is not part of this product plan. Reuse its dashboard space as
// Algebra 1B while preserving all original Algebra 1 module IDs and progress.
if (!document.querySelector('script[data-tolux-algebra1-split]')) {
  const splitScript = document.createElement("script");
  splitScript.src = "/algebra1-split-ui.js";
  splitScript.defer = true;
  splitScript.dataset.toluxAlgebra1Split = "true";
  document.head.append(splitScript);
}
