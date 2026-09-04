(() => {
  const TUTOR_VALUE = "alg1-a11a-radical-expressions";
  const PRACTICE_VALUE = "A.11A";
  const LABEL = "A.11A • Simplify Numerical Radicals";

  function ensureOption(select, value, label) {
    if (!select) return false;
    const existing = [...select.options].find(option => option.value === value);
    if (existing) {
      existing.disabled = false;
      delete existing.dataset.toluxPlaceholder;
      existing.textContent = label;
      return true;
    }
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
    return true;
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function updateTutorSummary() {
    const select = document.querySelector("#tutorSkillSelect");
    if (!select || select.value !== TUTOR_VALUE) return;
    const summary = document.querySelector("#tutorLessonSummary");
    if (!summary || summary.dataset.a11aSummary === "true") return;
    summary.innerHTML = `
      <strong>A.11A • Simplify Numerical Radicals</strong>
      <p>Simplify numerical square-root expressions using perfect-square factors, product and quotient properties, and like-radical reasoning.</p>
      <small>Lesson path: Learn → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>
    `;
    summary.dataset.a11aSummary = "true";
  }

  function syncControls() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    const practiceSelect = document.querySelector("#practiceSkillSelect");
    if (!tutorSelect || !practiceSelect || tutorSelect.options.length === 0 || practiceSelect.options.length === 0) return false;

    ensureOption(tutorSelect, TUTOR_VALUE, LABEL);
    ensureOption(practiceSelect, PRACTICE_VALUE, LABEL);
    setTextIfChanged(document.querySelector("#tutorAvailability"), `${tutorSelect.options.length} completed Algebra 1 lessons available in Tutor Mode.`);
    setTextIfChanged(document.querySelector("#practiceAvailability"), `${practiceSelect.options.length} completed Algebra 1 skills available for focused practice.`);
    setTextIfChanged(document.querySelector("#algebra1Coverage strong"), `${tutorSelect.options.length} live skill modules`);
    updateTutorSummary();
    return true;
  }

  function start() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    tutorSelect?.addEventListener("change", () => {
      const summary = document.querySelector("#tutorLessonSummary");
      if (summary) delete summary.dataset.a11aSummary;
      updateTutorSummary();
    });

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (syncControls() || attempts >= 100) window.clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

if (!document.querySelector('script[data-tolux-a11b-bridge]')) {
  const script = document.createElement("script");
  script.src = "/a11b-dashboard-bridge.js";
  script.defer = true;
  script.dataset.toluxA11bBridge = "true";
  document.head.append(script);
}
