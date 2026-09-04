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
