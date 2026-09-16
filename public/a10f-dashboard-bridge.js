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

// Make the Student and Teacher experiences visibly separate on the main page.
// The Teacher Plan used to exist only at /teacher.html, which made it effectively
// undiscoverable from the student dashboard. Keep both products explicit.
(() => {
  function addPortalStyles() {
    if (document.querySelector("#toluxPortalChoiceStyles")) return;
    const style = document.createElement("style");
    style.id = "toluxPortalChoiceStyles";
    style.textContent = `
      .tolux-portal-choice{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0 22px;padding:18px;border:1px solid #dfe5ee;border-radius:18px;background:#fff;box-shadow:0 10px 26px rgba(24,37,63,.06)}
      .tolux-portal-choice h2{grid-column:1/-1;margin:0 0 2px;font-size:1.2rem}.tolux-portal-choice>p{grid-column:1/-1;margin:0 0 4px;color:#667085}
      .tolux-portal-card{display:flex;align-items:center;gap:14px;padding:17px;border:1px solid #d9e0ea;border-radius:14px;text-decoration:none;color:inherit;background:#f9fafc;transition:.15s ease}
      .tolux-portal-card:hover{transform:translateY(-1px);border-color:#4f46e5;box-shadow:0 8px 18px rgba(79,70,229,.10)}
      .tolux-portal-card.teacher{background:#f0fdf4;border-color:#b7e4c4}.tolux-portal-card.teacher:hover{border-color:#16803c}
      .tolux-portal-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:12px;background:#eef0ff;font-size:1.5rem;flex:0 0 auto}.teacher .tolux-portal-icon{background:#dcfce7}
      .tolux-portal-copy{display:grid;gap:2px}.tolux-portal-copy strong{font-size:1rem}.tolux-portal-copy span{font-size:.88rem;color:#667085}
      .tolux-teacher-nav{display:flex!important;align-items:center;justify-content:flex-start;width:100%;padding:11px 12px;margin-top:8px;border-radius:10px;text-decoration:none!important;font-weight:800!important;background:#166534!important;color:#fff!important;line-height:1.25}
      .tolux-teacher-nav:hover{background:#14532d!important}
      @media(min-width:951px){
        .sidebar{display:flex;flex-direction:column;overflow-y:auto}
        .sidebar nav{flex:0 0 auto}
        .sidebar .promise{position:static;left:auto;right:auto;bottom:auto;margin-top:auto;flex:0 0 auto}
      }
      @media(max-width:760px){.tolux-portal-choice{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function installPortalChoice() {
    if (document.querySelector("#toluxPortalChoice")) return;
    addPortalStyles();

    const dashboardBtn = document.querySelector("#dashboardBtn");
    if (dashboardBtn) dashboardBtn.textContent = "⌂ Student Dashboard";

    const nav = document.querySelector(".sidebar nav");
    if (nav && !document.querySelector("#teacherPortalNav")) {
      const link = document.createElement("a");
      link.id = "teacherPortalNav";
      link.className = "tolux-teacher-nav";
      link.href = "/teacher.html";
      link.textContent = "🎓 Teacher / Educator Portal";
      nav.append(link);
    }

    const authPanel = document.querySelector("#authPanel");
    if (authPanel) {
      const section = document.createElement("section");
      section.id = "toluxPortalChoice";
      section.className = "tolux-portal-choice";
      section.innerHTML = `
        <h2>Choose your Tolux portal</h2>
        <p>Students and educators use separate workspaces.</p>
        <a class="tolux-portal-card student" href="#authPanel">
          <span class="tolux-portal-icon">👨‍🎓</span>
          <span class="tolux-portal-copy"><strong>Student Login</strong><span>Lessons, homework help, practice, progress and study plan</span></span>
        </a>
        <a class="tolux-portal-card teacher" href="/teacher.html">
          <span class="tolux-portal-icon">👩‍🏫</span>
          <span class="tolux-portal-copy"><strong>Teacher / Educator Login</strong><span>Classes, assignments, rosters, mastery, intervention groups and school pilots</span></span>
        </a>
      `;
      authPanel.parentNode.insertBefore(section, authPanel);
    }

    const educatorCard = [...document.querySelectorAll(".pricing-card")]
      .find(card => /Educators\s*&\s*Schools/i.test(card.textContent || ""));
    if (educatorCard) {
      const link = educatorCard.querySelector("a");
      if (link) {
        link.href = "/teacher.html#schoolPilotSection";
        link.textContent = "Open Teacher Portal";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPortalChoice, { once: true });
  } else {
    installPortalChoice();
  }
})();

// The Joy and Victoria videos remain valuable marketing assets, but the app
// dashboard now prioritizes learning and educator workflows. Remove the large
// promotional showcase from the application surface to reclaim vertical space.
(() => {
  function removeVideoShowcase() {
    document.querySelector(".video-showcase")?.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeVideoShowcase, { once: true });
  } else {
    removeVideoShowcase();
  }
})();
