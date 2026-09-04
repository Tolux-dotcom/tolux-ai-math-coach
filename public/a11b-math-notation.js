(() => {
  const params = new URLSearchParams(window.location.search);
  const isA11BLesson = params.get("module") === "alg1-a11b-laws-of-exponents";
  const isA11BPractice = params.get("skill") === "A.11B";
  if (!isA11BLesson && !isA11BPractice) return;

  const EXPONENT_PATTERN = /\^\(([^)]+)\)|\^(-?\d+|[A-Za-z])/g;
  const ROOT_SELECTORS = [
    "#lessonContent",
    "#lessonFeedback",
    "#practiceQuestionView",
    "#practiceFeedback",
    "#practiceSummary"
  ];

  function installStyles() {
    if (document.querySelector("#a11bNotationStyles")) return;
    const style = document.createElement("style");
    style.id = "a11bNotationStyles";
    style.textContent = `
      .lesson-card sup,
      .practice-card sup,
      .a11b-visual sup {
        font-size: .72em;
        line-height: 0;
        vertical-align: super;
      }
    `;
    document.head.append(style);
  }

  function normalizeExponentText(value) {
    return String(value || "").replace(/-/g, "−");
  }

  function replaceTextNode(node) {
    const text = node.nodeValue || "";
    if (!text.includes("^")) return false;

    EXPONENT_PATTERN.lastIndex = 0;
    let match;
    let lastIndex = 0;
    let changed = false;
    const fragment = document.createDocumentFragment();

    while ((match = EXPONENT_PATTERN.exec(text)) !== null) {
      changed = true;
      if (match.index > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const sup = document.createElement("sup");
      sup.textContent = normalizeExponentText(match[1] ?? match[2]);
      fragment.append(sup);
      lastIndex = match.index + match[0].length;
    }

    if (!changed) return false;
    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }
    node.replaceWith(fragment);
    return true;
  }

  function typeset(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current;
    while ((current = walker.nextNode())) {
      const parent = current.parentElement;
      if (!parent) continue;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) continue;
      if ((current.nodeValue || "").includes("^")) nodes.push(current);
    }
    nodes.forEach(replaceTextNode);
  }

  function watch(root) {
    if (!root || root.dataset.a11bNotationWatch === "true") return;
    root.dataset.a11bNotationWatch = "true";

    const observer = new MutationObserver(() => {
      observer.disconnect();
      typeset(root);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    });

    typeset(root);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function attach() {
    installStyles();
    ROOT_SELECTORS.forEach(selector => watch(document.querySelector(selector)));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
})();
