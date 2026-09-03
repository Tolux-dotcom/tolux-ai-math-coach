// Free Algebra Diagnostic Test must never be blocked by sign-in or trial state.
// lesson.js still routes lesson-access checks through the authenticated-session
// helper. This small bridge allows the two authored diagnostic items to reach
// the server's anonymous diagnostic-access path without creating or persisting
// a real user session. It is scoped only to the visible diagnostic item IDs.
(() => {
  const FREE_DIAGNOSTIC_ITEM_IDS = new Set(["A5A-D01", "A5A-D02"]);
  const DIAGNOSTIC_ACCESS_TOKEN = "tolux-free-diagnostic";
  const supabase = window.supabase;

  if (!supabase?.createClient) return;

  function visibleFreeDiagnosticItemId() {
    const content = document.querySelector("#lessonContent")?.textContent || "";

    for (const itemId of FREE_DIAGNOSTIC_ITEM_IDS) {
      if (content.includes(itemId)) return itemId;
    }

    return null;
  }

  function anonymousDiagnosticSession() {
    return {
      access_token: DIAGNOSTIC_ACCESS_TOKEN,
      token_type: "bearer",
      user: null
    };
  }

  const nativeCreateClient = supabase.createClient.bind(supabase);

  supabase.createClient = (...args) => {
    const client = nativeCreateClient(...args);
    const nativeGetSession = client.auth.getSession.bind(client.auth);
    const nativeRefreshSession = client.auth.refreshSession.bind(client.auth);

    client.auth.getSession = async (...sessionArgs) => {
      const result = await nativeGetSession(...sessionArgs);

      if (result?.data?.session || !visibleFreeDiagnosticItemId()) {
        return result;
      }

      return {
        data: { session: anonymousDiagnosticSession() },
        error: null
      };
    };

    client.auth.refreshSession = async (...sessionArgs) => {
      const result = await nativeRefreshSession(...sessionArgs);

      if (result?.data?.session || !visibleFreeDiagnosticItemId()) {
        return result;
      }

      return {
        data: { session: anonymousDiagnosticSession() },
        error: null
      };
    };

    return client;
  };
})();
