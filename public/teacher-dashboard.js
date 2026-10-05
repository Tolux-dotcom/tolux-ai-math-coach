(() => {
  const config = window.TOLUX_PUBLIC_CONFIG || {};
  const message = document.querySelector("#teacherAuthMessage");
  const summary = document.querySelector("#teacherSummary");
  const misconceptionsPanel = document.querySelector("#teacherMisconceptionsPanel");
  const standardsPanel = document.querySelector("#teacherStandardsPanel");
  const misconceptions = document.querySelector("#teacherMisconceptions");
  const standards = document.querySelector("#teacherStandards");

  if (!window.supabase?.createClient || !config.url || !config.publishableKey) {
    message.textContent = "Teacher preview cannot connect to sign-in right now.";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);

  async function load() {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session?.access_token) {
      message.textContent = "Please sign in on the Math Coach dashboard first. This preview only shows the currently signed-in student's data.";
      return;
    }

    message.textContent = "Loading current student progress…";
    const response = await fetch("/api/teacher-progress-preview", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Unable to load progress.";
      return;
    }

    message.textContent = "Read-only current-student progress loaded.";
    summary.hidden = false;
    document.querySelector("#teacherCompleted").textContent = `${data.completedModules} completed modules`;
    document.querySelector("#teacherMastered").textContent = `${data.mastered} mastered`;
    document.querySelector("#teacherDeveloping").textContent = `${data.developing} developing`;
    document.querySelector("#teacherIntervention").textContent = `${data.intervention} intervention`;
    document.querySelector("#teacherFirstAttempt").textContent = `First-attempt rate: ${data.firstAttemptRate ?? "—"}${data.firstAttemptRate == null ? "" : "%"}`;

    if (data.topMisconceptions?.length) {
      misconceptionsPanel.hidden = false;
      misconceptions.innerHTML = data.topMisconceptions
        .map(item => `<p><strong>${item.tag}</strong> · ${item.count} occurrence${item.count === 1 ? "" : "s"}</p>`)
        .join("");
    }

    standardsPanel.hidden = false;
    standards.innerHTML = (data.standards || []).map(item => {
      const teks = item.teks?.length ? item.teks.join(", ") : "TEKS not mapped";
      const misconception = item.misconceptions?.[0]?.tag || "None recorded";
      return `<article class="panel" style="margin-top:12px;">
        <h3>${item.title}</h3>
        <p><strong>${teks}</strong> · ${item.masteryLabel} · ${item.masteryScore}%</p>
        <p>First-attempt rate: ${item.firstAttemptRate ?? "—"}${item.firstAttemptRate == null ? "" : "%"} · Hints: ${item.hints} · Attempts: ${item.attempts}</p>
        <p>Top recorded misconception: ${misconception}</p>
      </article>`;
    }).join("") || "<p>No lesson or practice progress has been saved yet.</p>";
  }

  load().catch(() => {
    message.textContent = "Unable to load the teacher preview.";
  });
})();