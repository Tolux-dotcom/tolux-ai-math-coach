// Keep the visible sign-in state and Stripe checkout on the same Supabase session.
(() => {
  async function getFreshSession() {
    let { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    let session = data?.session || null;

    // Refresh proactively before checkout so a stale access token does not look
    // like a signed-out student to the server.
    if (session) {
      const refreshed = await supabaseClient.auth.refreshSession();
      if (!refreshed.error && refreshed.data?.session) {
        session = refreshed.data.session;
      }
    }

    return session;
  }

  async function checkoutWithFreshSession(plan) {
    const button = plan === "family" ? familyPlanBtn : studentPlanBtn;
    const originalText = button?.textContent;

    try {
      if (button) {
        button.disabled = true;
        button.textContent = "Opening secure checkout…";
      }

      const session = await getFreshSession();
      renderAuthSession(session);

      if (!session?.access_token) {
        authMessage.textContent =
          "Please sign in once to continue to secure checkout.";
        authPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const requestCheckout = activeSession => fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeSession.access_token}`
        },
        body: JSON.stringify({ plan })
      });

      let response = await requestCheckout(session);

      // A token can expire between rendering the page and clicking the plan.
      // Refresh once and retry rather than incorrectly asking the student to
      // sign in again.
      if (response.status === 401) {
        const refreshed = await supabaseClient.auth.refreshSession();
        const retrySession = refreshed.error ? null : refreshed.data?.session;
        if (retrySession) {
          renderAuthSession(retrySession);
          response = await requestCheckout(retrySession);
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }
      if (!data.url) throw new Error("Secure checkout URL was not returned.");

      window.location.assign(data.url);
    } catch (error) {
      console.error("Tolux checkout error:", error);
      alert(error.message || "Unable to open secure checkout. Please try again.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  // Replace the earlier click listeners without changing the rest of app.js.
  // Cloning removes the old listeners, then installs the hardened checkout.
  if (studentPlanBtn) {
    const replacement = studentPlanBtn.cloneNode(true);
    studentPlanBtn.replaceWith(replacement);
    replacement.addEventListener("click", () => checkoutWithFreshSession("student"));
  }
  if (familyPlanBtn) {
    const replacement = familyPlanBtn.cloneNode(true);
    familyPlanBtn.replaceWith(replacement);
    replacement.addEventListener("click", () => checkoutWithFreshSession("family"));
  }
})();
