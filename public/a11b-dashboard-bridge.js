(() => {
  const TUTOR_VALUE = "alg1-a11b-laws-of-exponents";
  const PRACTICE_VALUE = "A.11B";
  const LABEL = "A.11B • Laws of Exponents";

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
    if (!summary || summary.dataset.a11bSummary === "true") return;
    summary.innerHTML = `
      <strong>A.11B • Laws of Exponents</strong>
      <p>Simplify numeric and algebraic expressions using product, quotient, power, zero, negative, integral, and rational exponent laws.</p>
      <small>Lesson path: Learn visually → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>
    `;
    summary.dataset.a11bSummary = "true";
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
    document.querySelector("#tutorSkillSelect")?.addEventListener("change", () => {
      const summary = document.querySelector("#tutorLessonSummary");
      if (summary) delete summary.dataset.a11bSummary;
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