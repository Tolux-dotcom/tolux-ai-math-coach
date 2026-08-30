// Critical regression fix: the Free Algebra Diagnostic Test must never be
// blocked by authentication. Diagnostic answer grading is local in lesson.js.
// This shim makes the legacy /api/lesson-usage check a no-op while the current
// stage is the readiness/diagnostic stage. Paid lesson access remains separate.
(() => {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || "GET").toUpperCase();
    const stageText = document.querySelector("#lessonStage")?.textContent || "";
    const diagnosticActive = /readiness|diagnostic/i.test(stageText);

    if (diagnosticActive && url === "/api/lesson-usage" && method === "POST") {
      return new Response(
        JSON.stringify({
          allowed: true,
          isSubscriber: false,
          diagnosticFree: true
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return nativeFetch(input, init);
  };
})();
