(() => {
  const TARGETS = ["#lessonAnswer", "#practiceAnswer"];
  const SYMBOLS = [
    { label: "√", insert: "√", title: "Square root" },
    { label: "∛", insert: "∛", title: "Cube root" },
    { label: "x²", insert: "x²", title: "x squared" },
    { label: "x³", insert: "x³", title: "x cubed" },
    { label: "^", insert: "^", title: "Raise to a power" },
    { label: "+", insert: "+", title: "Addition" },
    { label: "−", insert: "−", title: "Subtraction" },
    { label: "×", insert: "×", title: "Multiplication" },
    { label: "÷", insert: "÷", title: "Division" },
    { label: "/", insert: "/", title: "Fraction slash" },
    { label: "(", insert: "(", title: "Left parenthesis" },
    { label: ")", insert: ")", title: "Right parenthesis" },
    { label: "=", insert: "=", title: "Equals" },
    { label: "≤", insert: "≤", title: "Less than or equal to" },
    { label: "≥", insert: "≥", title: "Greater than or equal to" },
    { label: "π", insert: "π", title: "Pi" },
    { label: "±", insert: "±", title: "Plus or minus" }
  ];

  function installStyles() {
    if (document.querySelector("#toluxMathToolbarStyles")) return;
    const style = document.createElement("style");
    style.id = "toluxMathToolbarStyles";
    style.textContent = `
      .tolux-math-toolbar-wrap{margin:10px 0 12px}
      .tolux-math-toolbar-label{display:block;margin-bottom:6px;font-size:.84rem;font-weight:700;color:#52606d}
      .tolux-math-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
      .tolux-math-key{min-width:38px;min-height:36px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc;color:#172033;font:700 1rem Georgia,'Times New Roman',serif;cursor:pointer;line-height:1}
      .tolux-math-key:hover,.tolux-math-key:focus-visible{background:#eef4ff;border-color:#7aa2e8;outline:none;box-shadow:0 0 0 2px rgba(59,130,246,.14)}
      .tolux-math-key:active{transform:translateY(1px)}
      @media(max-width:600px){.tolux-math-toolbar{flex-wrap:nowrap;overflow-x:auto;padding-bottom:5px}.tolux-math-key{flex:0 0 auto;min-width:42px;min-height:40px}}
    `;
    document.head.append(style);
  }

  function insertAtCursor(input, symbol) {
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    input.value = `${before}${symbol.insert}${after}`;

    const caret = start + symbol.insert.length;
    input.focus();
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function attachToolbar(input) {
    if (!input || input.dataset.mathToolbarAttached === "true") return;
    input.dataset.mathToolbarAttached = "true";

    const wrap = document.createElement("div");
    wrap.className = "tolux-math-toolbar-wrap";
    wrap.setAttribute("aria-label", "Math symbol keyboard");

    const label = document.createElement("span");
    label.className = "tolux-math-toolbar-label";
    label.textContent = "Math symbols — tap to insert";

    const toolbar = document.createElement("div");
    toolbar.className = "tolux-math-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Math symbols");

    for (const symbol of SYMBOLS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tolux-math-key";
      button.textContent = symbol.label;
      button.title = symbol.title;
      button.setAttribute("aria-label", symbol.title);
      button.addEventListener("click", () => insertAtCursor(input, symbol));
      toolbar.append(button);
    }

    wrap.append(label, toolbar);
    input.insertAdjacentElement("afterend", wrap);
  }

  function attachAvailableTargets() {
    for (const selector of TARGETS) attachToolbar(document.querySelector(selector));
  }

  installStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAvailableTargets, { once: true });
  } else {
    attachAvailableTargets();
  }
})();