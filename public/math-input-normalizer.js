(() => {
  const SUPERSCRIPTS = Object.freeze({
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "-": "⁻"
  });

  function caretPowersToSuperscript(value) {
    return String(value ?? "").replace(/\^(-?\d+)/g, (_, exponent) =>
      Array.from(exponent, character => SUPERSCRIPTS[character] || character).join("")
    );
  }

  function normalizeCommonMathWords(value) {
    return String(value ?? "")
      .replace(/\b(?:infinity|inf)\b/gi, "∞");
  }

  function normalizeInput(input) {
    if (!input) return;
    const normalized = normalizeCommonMathWords(
      caretPowersToSuperscript(input.value)
    );
    if (normalized !== input.value) input.value = normalized;
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#submitLessonAnswer")) {
      normalizeInput(document.querySelector("#lessonAnswer"));
    }
    if (event.target.closest("#checkPracticeAnswer")) {
      normalizeInput(document.querySelector("#practiceAnswer"));
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    if (event.target.matches?.("#lessonAnswer, #practiceAnswer")) {
      normalizeInput(event.target);
    }
  }, true);
})();
