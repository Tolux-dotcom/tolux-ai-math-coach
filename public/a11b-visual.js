(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("module") !== "alg1-a11b-laws-of-exponents") return;

  function installStyles() {
    if (document.querySelector("#a11bVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "a11bVisualStyles";
    style.textContent = `
      .a11b-visual{margin:18px 0 24px;padding:18px;border:1px solid #cbdaf6;border-radius:16px;background:#f8fbff}
      .a11b-visual h3{margin:0 0 6px;color:#163f7a}
      .a11b-visual-intro{margin:0 0 16px;color:#52606d}
      .a11b-law-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .a11b-law-card{padding:14px;border:1px solid #d8e2f1;border-radius:14px;background:#fff;min-height:170px}
      .a11b-law-card strong{display:block;margin-bottom:8px;color:#173f78}
      .a11b-math-flow{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font:700 1.08rem Georgia,'Times New Roman',serif;color:#172033;margin:9px 0}
      .a11b-chip{padding:7px 9px;border-radius:9px;background:#eef5ff;border:1px solid #c6d7f5}
      .a11b-arrow{color:#2563eb;font-size:1.25rem}
      .a11b-rule{font-size:.9rem;line-height:1.45;color:#52606d}
      .a11b-decision{margin-top:14px;padding:14px;border-radius:12px;background:#eef7ff;border:1px solid #bfdcff}
      .a11b-decision strong{color:#174ea6}
      .a11b-decision-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
      .a11b-decision-grid div{padding:10px;border-radius:10px;background:#fff;border:1px solid #d7e3f4;font-size:.9rem}
      .a11b-rational-key{margin-top:12px;padding:12px 14px;border-left:4px solid #7c3aed;background:#f5f3ff;border-radius:8px;color:#44337a}
      @media(max-width:900px){.a11b-law-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.a11b-law-grid,.a11b-decision-grid{grid-template-columns:1fr}.a11b-visual{padding:12px}.a11b-law-card{min-height:auto}}
    `;
    document.head.append(style);
  }

  function card(title, flow, rule) {
    return `
      <article class="a11b-law-card">
        <strong>${title}</strong>
        <div class="a11b-math-flow">${flow}</div>
        <div class="a11b-rule">${rule}</div>
      </article>
    `;
  }

  function flow(parts) {
    return parts.map((part, index) => {
      const markup = `<span class="a11b-chip">${part}</span>`;
      return index === parts.length - 1 ? markup : `${markup}<span class="a11b-arrow">→</span>`;
    }).join("");
  }

  function visualMarkup() {
    return `
      <section class="a11b-visual" data-a11b-visual="true">
        <h3>See which exponent law matches the structure</h3>
        <p class="a11b-visual-intro">Do not memorize one rule for everything. First identify what is happening to the powers, then choose the matching law.</p>
        <div class="a11b-law-grid">
          ${card(
            "Same base multiplied → ADD exponents",
            flow(["x³ · x⁴", "x³⁺⁴", "x⁷"]),
            "Keep the same base. Multiplication of equal bases means add the exponents."
          )}
          ${card(
            "Same base divided → SUBTRACT exponents",
            flow(["x⁷ ÷ x²", "x⁷⁻²", "x⁵"]),
            "Keep the same base. Subtract denominator exponent from numerator exponent."
          )}
          ${card(
            "Power raised to a power → MULTIPLY exponents",
            flow(["(x³)⁴", "x³·⁴", "x¹²"]),
            "The outside exponent acts on the inside exponent, so multiply them."
          )}
          ${card(
            "Zero exponent",
            flow(["x⁰", "1"]),
            "For x ≠ 0, any nonzero base to the zero power equals 1."
          )}
          ${card(
            "Negative exponent → RECIPROCAL",
            flow(["x⁻³", "1/x³"]),
            "A negative exponent does not make the expression negative. Rewrite it using a reciprocal."
          )}
          ${card(
            "Rational exponent → ROOT + POWER",
            flow(["16^(3/4)", "(⁴√16)³", "2³", "8"]),
            "The denominator names the root. The numerator names the power."
          )}
        </div>
        <div class="a11b-decision">
          <strong>Fast decision guide</strong>
          <div class="a11b-decision-grid">
            <div><b>Multiply same bases?</b><br>Add exponents.</div>
            <div><b>Divide same bases?</b><br>Subtract exponents.</div>
            <div><b>Power on a power?</b><br>Multiply exponents.</div>
          </div>
        </div>
        <div class="a11b-rational-key"><strong>Rational exponent key:</strong> a^(m/n) = (ⁿ√a)^m. Think <b>denominator = root</b>, <b>numerator = power</b>.</div>
      </section>
    `;
  }

  function inject() {
    const content = document.querySelector("#lessonContent");
    if (!content || content.querySelector('[data-a11b-visual="true"]')) return false;
    const conceptGrid = content.querySelector(".concept-grid");
    if (!conceptGrid) return false;
    conceptGrid.insertAdjacentHTML("beforebegin", visualMarkup());
    return true;
  }

  function start() {
    installStyles();
    const content = document.querySelector("#lessonContent");
    if (!content) return;
    if (inject()) return;
    const observer = new MutationObserver(() => {
      if (inject()) observer.disconnect();
    });
    observer.observe(content, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();