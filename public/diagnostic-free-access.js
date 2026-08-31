// Free Algebra Diagnostic Test must never be blocked by sign-in or trial state.
// The lesson module grades diagnostic answers locally; this only bypasses the
// legacy lesson-access request for diagnostic item IDs.
(() => {
  const FREE_DIAGNOSTIC_ITEM_IDS = new Set(["A5A-D01", "A5A-D02"]);
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || "GET").toUpperCase();

    if (url === "/api/lesson-usage" && method === "POST") {
      try {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
        if (FREE_DIAGNOSTIC_ITEM_IDS.has(String(body?.itemId || ""))) {
          return new Response(
            JSON.stringify({
              allowed: true,
              isSubscriber: false,
              isFreeDiagnostic: true,
              trialSecondsUsed: 0,
              trialSecondsRemaining: 600,
              trialSecondsLimit: 600
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      } catch (error) {
        console.warn("Diagnostic access check could not parse request:", error);
      }
    }

    return nativeFetch(input, init);
  };
})();
