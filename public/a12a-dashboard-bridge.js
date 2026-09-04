(() => {
  const TUTOR_VALUE = "alg1-a12a-identify-functions";
  const PRACTICE_VALUE = "A.12A";
  const LABEL = "A.12A • Identify Functions";

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

  function updateSummary() {
    const select = document.querySelector("#tutorSkillSelect");
    if (!select || select.value !== TUTOR_VALUE) return;
    const summary = document.querySelector("#tutorLessonSummary");
    if (!summary || summary.dataset.a12aSummary === "true") return;
    summary.innerHTML = `
      <strong>A.12A • Identify Functions</strong>
      <p>Decide whether verbal, tabular, graphical, mapping, ordered-pair, and symbolic relations define functions.</p>
      <small>Lesson path: Learn visually → Watch Tolux test relations → Guided practice → Independent practice → Mastery check</small>
    `;
    summary.dataset.a12aSummary = "true";
  }

  function syncControls() {
    const tutor = document.querySelector("#tutorSkillSelect");
    const practice = document.querySelector("#practiceSkillSelect");
    if (!tutor || !practice || tutor.options.length === 0 || practice.options.length === 0) return false;
    ensureOption(tutor, TUTOR_VALUE, LABEL);
    ensureOption(practice, PRACTICE_VALUE, LABEL);
    updateSummary();
    return true;
  }

  function start() {
    document.querySelector("#tutorSkillSelect")?.addEventListener("change", () => {
      const summary = document.querySelector("#tutorLessonSummary");
      if (summary) delete summary.dataset.a12aSummary;
      updateSummary();
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