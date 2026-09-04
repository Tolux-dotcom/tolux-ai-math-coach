(() => {
  const PART_A_LIMIT = 26;
  const TOTAL_MODULES = 49;
  const PART_B_COUNT = TOTAL_MODULES - PART_A_LIMIT;
  const STORAGE_KEY = "toluxAlgebraPart";

  let moduleNumbersById = new Map();
  let moduleNumbersByTeks = new Map();
  let activePart = localStorage.getItem(STORAGE_KEY) === "B" ? "B" : "A";

  const isInActivePart = moduleNumber => activePart === "A"
    ? moduleNumber >= 1 && moduleNumber <= PART_A_LIMIT
    : moduleNumber > PART_A_LIMIT && moduleNumber <= TOTAL_MODULES;

  function renameCourseButtons() {
    const buttons = [...document.querySelectorAll(".course")];
    if (buttons.length < 2) return false;

    const partA = buttons[0];
    const partB = buttons[1];

    partA.dataset.course = "Algebra 1";
    partA.dataset.algebraPart = "A";
    const aStrong = partA.querySelector("strong");
    const aSmall = partA.querySelector("small");
    if (aStrong) aStrong.textContent = "Algebra 1A";
    if (aSmall) aSmall.textContent = "Modules 1–26 • Foundations & core skills";

    partB.dataset.course = "Algebra 1";
    partB.dataset.algebraPart = "B";
    const bStrong = partB.querySelector("strong");
    const bSmall = partB.querySelector("small");
    if (bStrong) bStrong.textContent = "Algebra 1B";
    if (bSmall) bSmall.textContent = "Modules 27–49 • Complete Algebra 1";

    buttons.forEach(button => {
      if (button.dataset.algebraSplitBound === "true") return;
      button.dataset.algebraSplitBound = "true";
      button.addEventListener("click", () => {
        activePart = button.dataset.algebraPart === "B" ? "B" : "A";
        localStorage.setItem(STORAGE_KEY, activePart);
        applyPartSelection();
      });
    });

    return true;
  }

  function updateStaticAlgebraCopy() {
    const tutorMeta = document.querySelector("#tutorModePanel .tutor-launch-card small");
    const practiceMeta = document.querySelector("#practiceModePanel .practice-launch-card small");
    if (tutorMeta) tutorMeta.textContent = `Algebra 1${activePart} • Tutor Mode`;
    if (practiceMeta) practiceMeta.textContent = `Algebra 1${activePart} • Working Practice Mode`;

    const modeLabel = document.querySelector("#modeLabel");
    if (modeLabel) {
      const mode = modeLabel.textContent.includes("Practice Mode")
        ? "Practice Mode"
        : modeLabel.textContent.includes("Homework Help")
          ? "Homework Help"
          : modeLabel.textContent.includes("Check My Work")
            ? "Check My Work"
            : "Tutor Mode";
      modeLabel.textContent = `Algebra 1${activePart} • ${mode}`;
    }

    const seoHeading = document.querySelector(".seo-section h2");
    if (seoHeading) seoHeading.textContent = "AI Algebra Tutor for Complete Algebra 1";
    const seoParagraphs = document.querySelectorAll(".seo-section p");
    if (seoParagraphs[0]) seoParagraphs[0].textContent = "Tolux AI Math Coach gives students step-by-step Algebra 1 help for homework, structured practice, graphing, factoring, linear equations, quadratics, exponents, and more.";
    if (seoParagraphs[1]) seoParagraphs[1].textContent = "Students can get clear explanations, practice similar problems, check their work, build personalized study plans, and learn at their own pace across Algebra 1A and Algebra 1B.";
    if (seoParagraphs[2]) seoParagraphs[2].textContent = "Use Tolux AI Math Coach for Algebra 1 tutoring, homework help, focused practice, personalized feedback, and guided problem solving. Algebra 1A covers Modules 1–26 and Algebra 1B covers Modules 27–49.";

    const videoIntro = document.querySelector(".video-showcase > p");
    if (videoIntro) videoIntro.textContent = "Discover how Tolux AI Math Coach makes complete Algebra 1 clearer, step by step.";
  }

  function updateCoverage() {
    const coverage = document.querySelector("#algebra1Coverage");
    if (!coverage) return;
    const range = activePart === "A" ? "Modules 1–26" : "Modules 27–49";
    const partCount = activePart === "A" ? PART_A_LIMIT : PART_B_COUNT;
    coverage.innerHTML = `
      <span class="coverage-badge">Algebra 1${activePart} • ${range}</span>
      <span><strong>${partCount} mapped modules in this section</strong> • 49 of 49 Algebra 1 TEKS mapped overall</span>
    `;
  }

  function relabelAndFilterOptions(select, kind) {
    if (!select) return 0;
    let visible = 0;
    for (const option of select.options) {
      const number = kind === "tutor"
        ? moduleNumbersById.get(option.value)
        : moduleNumbersByTeks.get(option.value);
      if (!number) continue;

      const original = option.dataset.algebraOriginalLabel || option.textContent;
      option.dataset.algebraOriginalLabel = original.replace(/^Module \d+ • /, "");
      option.textContent = `Module ${number} • ${option.dataset.algebraOriginalLabel}`;
      const show = isInActivePart(number);
      option.hidden = !show;
      option.disabled = !show;
      if (show) visible += 1;
    }

    const selected = select.options[select.selectedIndex];
    if (!selected || selected.hidden || selected.disabled) {
      const firstVisible = [...select.options].find(option => !option.hidden && !option.disabled);
      if (firstVisible) {
        select.value = firstVisible.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return visible;
  }

  function filterLearningControls() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    const practiceSelect = document.querySelector("#practiceSkillSelect");
    const tutorVisible = relabelAndFilterOptions(tutorSelect, "tutor");
    const practiceVisible = relabelAndFilterOptions(practiceSelect, "practice");

    const tutorAvailability = document.querySelector("#tutorAvailability");
    const practiceAvailability = document.querySelector("#practiceAvailability");
    if (tutorAvailability) tutorAvailability.textContent = `${tutorVisible} completed Algebra 1${activePart} lessons available in Tutor Mode.`;
    if (practiceAvailability) practiceAvailability.textContent = `${practiceVisible} completed Algebra 1${activePart} skills available for focused practice.`;
  }

  function markSelectedPart() {
    const buttons = [...document.querySelectorAll(".course[data-algebra-part]")];
    buttons.forEach(button => {
      button.classList.toggle("selected", button.dataset.algebraPart === activePart);
    });
  }

  function applyPartSelection() {
    markSelectedPart();
    updateStaticAlgebraCopy();
    updateCoverage();
    filterLearningControls();
  }

  async function loadModuleNumbers() {
    try {
      const response = await fetch("/algebra1-course.json");
      if (!response.ok) throw new Error(`Course catalog failed to load: ${response.status}`);
      const catalog = await response.json();
      const modules = (catalog.units || []).flatMap(unit => unit.modules || []);
      moduleNumbersById = new Map(modules.map((module, index) => [module.module_id, index + 1]));
      moduleNumbersByTeks = new Map(modules.map((module, index) => [module.teks?.[0], index + 1]));
      return true;
    } catch (error) {
      console.error("Unable to load Algebra 1A/1B split map:", error);
      return false;
    }
  }

  async function start() {
    if (!renameCourseButtons()) return;
    await loadModuleNumbers();
    applyPartSelection();

    // Existing curriculum bridges finish after app.js. Re-apply the split for a
    // short bounded window so late-added approved lessons are placed into the
    // correct half without a broad DOM observer or a self-triggering loop.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      renameCourseButtons();
      applyPartSelection();
      if (attempts >= 50) window.clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
