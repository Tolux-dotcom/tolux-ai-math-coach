(() => {
  const assignmentId = new URLSearchParams(window.location.search).get("assignment");
  if (!assignmentId || !window.supabase) return;

  const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const startedAt = Date.now() - 5000;
  const attempted = new Set();
  let attempts = 0;

  function candidateReports() {
    const reports = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("toluxLessonProgress:")) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        const completed = Date.parse(value?.completed_at || "");
        const completionId = value?.completion_id || value?.client_completion_id;
        if (completionId && Number.isFinite(completed) && completed >= startedAt) {
          reports.push({ completionId, completed });
        }
      } catch {}
    }
    return reports.sort((a, b) => b.completed - a.completed);
  }

  async function tryAttribution() {
    attempts += 1;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    for (const report of candidateReports()) {
      if (attempted.has(report.completionId)) continue;
      attempted.add(report.completionId);
      const { error } = await client.rpc("record_assignment_completion", {
        p_assignment_id: assignmentId,
        p_client_completion_id: report.completionId
      });
      if (!error) {
        window.clearInterval(timer);
        sessionStorage.setItem(`toluxAssignmentComplete:${assignmentId}`, report.completionId);
        return;
      }
    }
    if (attempts >= 240) window.clearInterval(timer);
  }

  const timer = window.setInterval(() => void tryAttribution(), 2500);
  void tryAttribution();
  window.addEventListener("pagehide", () => window.clearInterval(timer));
})();
