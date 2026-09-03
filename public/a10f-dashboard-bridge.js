(() => {
  const TUTOR_VALUE = "alg1-a10f-difference-of-squares";
  const PRACTICE_VALUE = "A.10F";
  const LABEL = "A.10F • Difference of Two Squares";

  function ensureOption(select, value, label) {
    if (!select || [...select.options].some(option => option.value === value)) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function updateTutorSummary() {
    const select = document.querySelector("#tutorSkillSelect");
    if (!select || select.value !== TUTOR_VALUE) return;
    const summary = document.querySelector("#tutorLessonSummary");
    if (!summary) return;
    summary.innerHTML = `
      <strong>A.10F • Difference of Two Squares</strong>
      <p>Recognize and factor binomials with difference-of-squares structure, including GCF-first and repeated-factorization cases.</p>
      <small>Lesson path: Learn → Watch Tolux solve → Guided practice → Independent practice → Mastery check</small>
    `;
  }

  function syncControls() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    const practiceSelect = document.querySelector("#practiceSkillSelect");
    if (!tutorSelect || !practiceSelect || tutorSelect.options.length === 0) return false;

    ensureOption(tutorSelect, TUTOR_VALUE, LABEL);
    ensureOption(practiceSelect, PRACTICE_VALUE, LABEL);

    const tutorAvailability = document.querySelector("#tutorAvailability");
    if (tutorAvailability) {
      tutorAvailability.textContent = `${tutorSelect.options.length} completed Algebra 1 lessons available in Tutor Mode.`;
    }
    const practiceAvailability = document.querySelector("#practiceAvailability");
    if (practiceAvailability) {
      practiceAvailability.textContent = `${practiceSelect.options.length} completed Algebra 1 skills available for focused practice.`;
    }

    const coverageStrong = document.querySelector("#algebra1Coverage strong");
    if (coverageStrong) coverageStrong.textContent = `${tutorSelect.options.length} live skill modules`;

    updateTutorSummary();
    return true;
  }

  function start() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    tutorSelect?.addEventListener("change", updateTutorSummary);

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = syncControls();
      if (ready || attempts >= 40) window.clearInterval(timer);
    }, 100);

    const observer = new MutationObserver(() => syncControls());
    const target = document.querySelector("#tutorModePanel")?.parentElement || document.body;
    observer.observe(target, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
