// Tolux free-access policy shim.
// Lesson/readiness/practice interactions are part of the free learning funnel and
// must not consume the legacy AI Coach question allowance.
(() => {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || "GET").toUpperCase();

    if (url === "/api/lesson-usage" && method === "POST") {
      return new Response(
        JSON.stringify({
          allowed: true,
          isSubscriber: false,
          qaMode: false,
          accessPolicy: "free-readiness-and-sample-learning"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return nativeFetch(input, init);
  };
})();
