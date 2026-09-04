(() => {
  const params = new URLSearchParams(window.location.search);
  const moduleId = params.get("module") || "unknown-module";
  const STORAGE_KEY = `toluxMasteryAnswerAudit:${moduleId}`;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .replace(/[−–—]/g, "-")
      .replace(/\bsqrt\s*\(\s*([a-z0-9.]+)\s*\)/gi, "√$1")
      .replace(/\bsqrt\s*([a-z0-9.]+)/gi, "√$1")
      .replace(/√\(\s*([a-z0-9.]+)\s*\)/gi, "√$1")
      .replace(/[×·*]/g, "")
      .replace(/\s+/g, "")
      .replace(/[.;,!]+$/g, "");
  }

  function readAudit() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function writeAudit(audit) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(audit));
    } catch {
      // QA display is best-effort and must never block lesson grading.
    }
  }

  function currentQuestionSnapshot() {
    const stage = document.querySelector("#lessonStage")?.textContent || "";
    if (!/mastery check/i.test(stage)) return null;

    const headerSpans = document.querySelectorAll("#lessonContent .question-header span");
    const itemId = headerSpans.length
      ? headerSpans[headerSpans.length - 1].textContent.trim()
      : "";
    const prompt = document.querySelector("#lessonContent .math-prompt")?.textContent?.trim() || "";
    const answer = document.querySelector("#lessonAnswer")?.value?.trim() || "";
    const explanationField = document.querySelector("#lessonExplanation");
    const explanation = explanationField?.value?.trim() || "";
    const explanationPrompt = document.querySelector("#lessonContent .explanation-field label")?.textContent?.trim() || "";

    if (!itemId || !prompt || !answer) return null;
    return {
      itemId,
      prompt,
      answer,
      explanation,
      explanationPrompt,
      explanationRequired: Boolean(explanationField),
      capturedAt: new Date().toISOString()
    };
  }

  function captureMasteryAnswer() {
    const snapshot = currentQuestionSnapshot();
    if (!snapshot) return;
    const audit = readAudit();
    audit[snapshot.itemId] = snapshot;
    writeAudit(audit);
  }

  function textAfterStrong(paragraph) {
    if (!paragraph) return "";
    const clone = paragraph.cloneNode(true);
    clone.querySelector("strong")?.remove();
    return clone.textContent.trim();
  }

  function findSnapshotForCard(card, audit) {
    const paragraphs = [...card.querySelectorAll("p")];
    const questionParagraph = paragraphs.find(p => /question:/i.test(p.textContent));
    const question = textAfterStrong(questionParagraph);
    if (!question) return null;

    return Object.values(audit).find(entry =>
      normalize(entry.prompt) === normalize(question)
    ) || null;
  }

  function addLine(card, label, value, className = "") {
    if (!value) return;
    const p = document.createElement("p");
    if (className) p.className = className;
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    p.append(strong, document.createTextNode(value));
    card.append(p);
  }

  function augmentRemediationCards() {
    const cards = [...document.querySelectorAll(".remediation-card")];
    if (cards.length === 0) return;
    const audit = readAudit();

    for (const card of cards) {
      if (card.dataset.answerAuditShown === "true") continue;
      const snapshot = findSnapshotForCard(card, audit);
      if (!snapshot) continue;

      const paragraphs = [...card.querySelectorAll("p")];
      const correctParagraph = paragraphs.find(p => /correct answer:/i.test(p.textContent));
      const correctAnswer = textAfterStrong(correctParagraph);

      addLine(card, "Your answer", snapshot.answer, "student-answer-audit");
      if (snapshot.explanationRequired) {
        addLine(card, "Explanation prompt", snapshot.explanationPrompt);
        addLine(card, "Your explanation", snapshot.explanation || "(No explanation entered)");
      }

      const sameAnswer = normalize(snapshot.answer) === normalize(correctAnswer);
      if (sameAnswer) {
        const note = document.createElement("p");
        note.className = snapshot.explanationRequired
          ? "grading-audit-note"
          : "grading-audit-warning";
        note.innerHTML = snapshot.explanationRequired
          ? "<strong>Answer audit:</strong> Your final answer matches the displayed correct answer. This mastery item may still be missed if the required explanation did not satisfy the reasoning criteria."
          : "<strong>QA grading flag:</strong> Your entered answer matches the displayed correct answer. This should not be counted as an incorrect answer; please treat this as a grading mismatch.";
        card.append(note);
      }

      card.dataset.answerAuditShown = "true";
    }
  }

  function installStyles() {
    if (document.querySelector("#masteryAnswerAuditStyles")) return;
    const style = document.createElement("style");
    style.id = "masteryAnswerAuditStyles";
    style.textContent = `
      .student-answer-audit{margin-top:12px;padding:10px 12px;border-radius:10px;background:#eef7ff;border:1px solid #bfdcff}
      .grading-audit-note{padding:10px 12px;border-radius:10px;background:#fff8e6;border:1px solid #f2d48a;line-height:1.45}
      .grading-audit-warning{padding:10px 12px;border-radius:10px;background:#fff0f0;border:1px solid #efb1b1;line-height:1.45}
    `;
    document.head.append(style);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#submitLessonAnswer")) captureMasteryAnswer();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.matches?.("#lessonAnswer")) {
      captureMasteryAnswer();
    }
  }, true);

  installStyles();
  const start = () => {
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    const observer = new MutationObserver(augmentRemediationCards);
    observer.observe(content, { childList: true, subtree: true });
    augmentRemediationCards();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();