(() => {
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get("assignment");
  if (!assignmentId) return;

  const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;
  const nativeFetch = window.fetch.bind(window);
  const meteredPaths = new Set([
    "/api/lesson-usage",
    "/api/trial-heartbeat",
    "/api/lesson-trial-heartbeat"
  ]);

  function currentActivityPath() {
    return `${window.location.pathname}${window.location.search}`;
  }

  async function verifyEntitlement() {
    if (!supabaseClient) return { entitled: false };

    try {
      let {
        data: { session }
      } = await supabaseClient.auth.getSession();

      if (!session) {
        const { data, error } = await supabaseClient.auth.refreshSession();
        if (error) return { entitled: false };
        session = data?.session || null;
      }

      if (!session) return { entitled: false };

      const { data, error } = await supabaseClient.functions.invoke("teacher-classroom", {
        body: {
          action: "assignment-entitlement",
          assignmentId,
          activityPath: currentActivityPath()
        }
      });

      if (error || !data?.entitled) return { entitled: false };
      return data;
    } catch (error) {
      console.warn("Classroom entitlement check failed:", error);
      return { entitled: false };
    }
  }

  const entitlementPromise = verifyEntitlement();
  window.__toluxClassroomEntitlementPromise = entitlementPromise;

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === "string" ? input : input?.url;
    let pathname = "";
    try {
      pathname = new URL(requestUrl, window.location.origin).pathname;
    } catch {
      return nativeFetch(input, init);
    }

    if (meteredPaths.has(pathname)) {
      const entitlement = await entitlementPromise;
      if (entitlement?.entitled) {
        return new Response(JSON.stringify({
          allowed: true,
          isSubscriber: false,
          qaMode: false,
          isFreeDiagnostic: false,
          isClassroomAssignment: true,
          classroomAccess: true,
          assignmentId
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return nativeFetch(input, init);
  };

  function showClassroomNotice(entitlement) {
    if (!entitlement?.entitled || document.querySelector("#toluxClassroomAccessNotice")) return;

    const notice = document.createElement("div");
    notice.id = "toluxClassroomAccessNotice";
    notice.setAttribute("role", "status");
    notice.style.cssText = [
      "margin:0 0 16px",
      "padding:12px 14px",
      "border:1px solid #b7e4c4",
      "border-radius:12px",
      "background:#f0fdf4",
      "color:#166534",
      "font-size:.92rem",
      "line-height:1.45"
    ].join(";");
    notice.innerHTML = `<strong>Teacher-assigned activity — classroom access included.</strong><br>
      This assignment does not use your personal Tolux free-trial time. Extra tutoring or practice outside this teacher assignment follows your regular student plan.`;

    const anchor = document.querySelector(".lesson-progress, .practice-progress") || document.querySelector("main")?.firstElementChild;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(notice, anchor);
  }

  entitlementPromise.then(showClassroomNotice);
})();
