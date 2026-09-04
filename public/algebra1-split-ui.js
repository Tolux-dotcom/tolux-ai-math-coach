(() => {
  const PART_A_LIMIT = 27;
  const PART_B_START = 28;
  const TOTAL_MODULES = 49;
  const PART_B_COUNT = TOTAL_MODULES - PART_A_LIMIT;
  const STORAGE_KEY = "toluxAlgebraPart";

  let catalogModules = [];
  let moduleNumbersById = new Map();
  let moduleNumbersByTeks = new Map();
  const liveTutorValues = new Set();
  const livePracticeValues = new Set();
  let activePart = localStorage.getItem(STORAGE_KEY) === "B" ? "B" : "A";

  const isInActivePart = moduleNumber => activePart === "A"
    ? moduleNumber >= 1 && moduleNumber <= PART_A_LIMIT
    : moduleNumber >= PART_B_START && moduleNumber <= TOTAL_MODULES;

  function activeModules() {
    return catalogModules.filter(module => isInActivePart(module.moduleNumber));
  }

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
    if (aSmall) aSmall.textContent = "Modules 1–27 • Foundations & core skills";

    partB.dataset.course = "Algebra 1";
    partB.dataset.algebraPart = "B";
    const bStrong = partB.querySelector("strong");
    const bSmall = partB.querySelector("small");
    if (bStrong) bStrong.textContent = "Algebra 1B";
    if (bSmall) bSmall.textContent = "Modules 28–49 • Complete Algebra 1";

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

  function bindModeButtons() {
    document.querySelectorAll(".mode").forEach(button => {
      if (button.dataset.algebraSplitModeBound === "true") return;
      button.dataset.algebraSplitModeBound = "true";
      button.addEventListener("click", () => {
        window.setTimeout(applyPartSelection, 0);
      });
    });
  }

  function updateStaticAlgebraCopy() {
    const tutorMeta = document.querySelector("#tutorModePanel .tutor-launch-card small");
    const practiceMeta = document.querySelector("#practiceModePanel .practice-launch-card small");
    if (tutorMeta) tutorMeta.textContent = `Algebra 1${activePart} • Tutor Mode`;
    if (practiceMeta) practiceMeta.textContent = `Algebra 1${activePart} • Working Practice Mode`;

    const selectedMode = document.querySelector(".mode.selected")?.dataset.mode || "Tutor Mode";
    const modeLabel = document.querySelector("#modeLabel");
    if (modeLabel) modeLabel.textContent = `Algebra 1${activePart} • ${selectedMode}`;

    const seoHeading = document.querySelector(".seo-section h2");
    if (seoHeading) seoHeading.textContent = "AI Algebra Tutor for Complete Algebra 1";
    const seoParagraphs = document.querySelectorAll(".seo-section p");
    if (seoParagraphs[0]) seoParagraphs[0].textContent = "Tolux AI Math Coach gives students step-by-step Algebra 1 help for homework, structured practice, graphing, factoring, linear equations, quadratics, exponents, and more.";
    if (seoParagraphs[1]) seoParagraphs[1].textContent = "Students can get clear explanations, practice similar problems, check their work, build personalized study plans, and learn at their own pace across Algebra 1A and Algebra 1B.";
    if (seoParagraphs[2]) seoParagraphs[2].textContent = "Use Tolux AI Math Coach for Algebra 1 tutoring, homework help, focused practice, personalized feedback, and guided problem solving. Algebra 1A covers Modules 1–27 and Algebra 1B covers Modules 28–49.";

    const videoIntro = document.querySelector(".video-showcase > p");
    if (videoIntro) videoIntro.textContent = "Discover how Tolux AI Math Coach makes complete Algebra 1 clearer, step by step.";
  }

  function updateCoverage() {
    const coverage = document.querySelector("#algebra1Coverage");
    if (!coverage) return;
    const range = activePart === "A" ? "Modules 1–27" : "Modules 28–49";
    const partCount = activePart === "A" ? PART_A_LIMIT : PART_B_COUNT;
    coverage.innerHTML = `
      <span class="coverage-badge">Algebra 1${activePart} • ${range}</span>
      <span><strong>${partCount} mapped modules in this section</strong> • 49 of 49 Algebra 1 TEKS mapped overall</span>
    `;
  }

  function rememberLiveOptions(select, kind) {
    if (!select) return;
    const liveSet = kind === "tutor" ? liveTutorValues : livePracticeValues;
    const numberMap = kind === "tutor" ? moduleNumbersById : moduleNumbersByTeks;
    for (const option of select.options) {
      if (option.dataset.toluxPlaceholder === "true") continue;
      if (numberMap.has(option.value)) liveSet.add(option.value);
    }
  }

  function renderPartOptions(select, kind) {
    if (!select) return 0;
    rememberLiveOptions(select, kind);

    const liveSet = kind === "tutor" ? liveTutorValues : livePracticeValues;
    const modules = activeModules();
    const options = modules.map(module => {
      const value = kind === "tutor" ? module.module_id : module.teks?.[0];
      const live = liveSet.has(value);
      const option = document.createElement("option");
      option.value = value;
      option.dataset.moduleNumber = String(module.moduleNumber);
      option.textContent = `Module ${module.moduleNumber} • ${module.teks?.[0]} • ${module.title}${live ? "" : " • Coming soon"}`;
      option.disabled = !live;
      if (!live) option.dataset.toluxPlaceholder = "true";
      return option;
    });

    select.replaceChildren(...options);
    const firstLive = options.find(option => !option.disabled);
    if (firstLive) {
      select.value = firstLive.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return options.filter(option => !option.disabled).length;
  }

  function filterLearningControls() {
    const tutorSelect = document.querySelector("#tutorSkillSelect");
    const practiceSelect = document.querySelector("#practiceSkillSelect");
    const tutorVisible = renderPartOptions(tutorSelect, "tutor");
    const practiceVisible = renderPartOptions(practiceSelect, "practice");

    const tutorAvailability = document.querySelector("#tutorAvailability");
    const practiceAvailability = document.querySelector("#practiceAvailability");
    if (tutorAvailability) tutorAvailability.textContent = `${tutorVisible} completed Algebra 1${activePart} lessons available in Tutor Mode.`;
    if (practiceAvailability) practiceAvailability.textContent = `${practiceVisible} completed Algebra 1${activePart} skills available for focused practice.`;

    const lessonButton = document.querySelector("#startTutorLessonBtn");
    const diagnosticButton = document.querySelector("#startReadinessDiagnosticBtn");
    const practiceButton = document.querySelector("#startPracticeBtn");
    if (lessonButton) lessonButton.disabled = tutorVisible === 0;
    if (diagnosticButton) diagnosticButton.disabled = tutorVisible === 0;
    if (practiceButton) practiceButton.disabled = practiceVisible === 0;
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
      catalogModules = (catalog.units || [])
        .flatMap(unit => unit.modules || [])
        .map((module, index) => ({ ...module, moduleNumber: index + 1 }));
      moduleNumbersById = new Map(catalogModules.map(module => [module.module_id, module.moduleNumber]));
      moduleNumbersByTeks = new Map(catalogModules.map(module => [module.teks?.[0], module.moduleNumber]));
      return true;
    } catch (error) {
      console.error("Unable to load Algebra 1A/1B split map:", error);
      return false;
    }
  }

  async function start() {
    if (!renameCourseButtons()) return;
    bindModeButtons();
    await loadModuleNumbers();
    applyPartSelection();

    // Existing curriculum bridges finish after app.js. Re-apply the split for a
    // short bounded window so late-added approved lessons are captured, then
    // render each half in true Module 1→49 order. No broad DOM observer is used.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      renameCourseButtons();
      bindModeButtons();
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
