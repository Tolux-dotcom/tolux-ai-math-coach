(() => {
  if (!window.supabase) return;

  const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const $ = selector => document.querySelector(selector);

  let currentUser = null;
  let classrooms = [];
  let currentReport = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'\"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function latestCompletion(completions, studentId, assignmentId) {
    return completions
      .filter(item => item.student_user_id === studentId && item.assignment_id === assignmentId)
      .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))[0] || null;
  }

  function getStudentSnapshot(studentId) {
    const students = currentReport?.students || [];
    const assignments = currentReport?.assignments || [];
    const completions = currentReport?.completions || [];
    const student = students.find(item => item.student_user_id === studentId);
    if (!student) return null;

    const results = assignments
      .map(assignment => ({
        assignment,
        result: latestCompletion(completions, studentId, assignment.id)
      }))
      .filter(item => item.result);

    const scores = results.map(item => Number(item.result.mastery_score)).filter(Number.isFinite);
    const average = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;

    return {
      student,
      results,
      average,
      mastered: results.filter(item => item.result.mastery_label === "Mastered"),
      developing: results.filter(item => item.result.mastery_label === "Developing"),
      intervention: results.filter(item => item.result.mastery_label === "Intervention Needed")
    };
  }

  function buildParentSummary(snapshot) {
    const className = currentReport?.classroom?.name || "Algebra 1";
    const lines = [
      `Tolux AI Math Coach Progress Update — ${snapshot.student.student_display_name}`,
      `Class: ${className}`,
      ""
    ];

    if (!snapshot.results.length) {
      lines.push("No Tolux classroom assignments have been completed yet.");
      return lines.join("\n");
    }

    lines.push(`Completed assignments: ${snapshot.results.length}`);
    if (snapshot.average !== null) lines.push(`Average mastery score: ${snapshot.average}%`);
    lines.push(`Mastered: ${snapshot.mastered.length}`);
    lines.push(`Developing: ${snapshot.developing.length}`);
    lines.push(`Intervention needed: ${snapshot.intervention.length}`);
    lines.push("");

    if (snapshot.mastered.length) {
      lines.push("Current strengths:");
      for (const item of snapshot.mastered.slice(0, 4)) {
        lines.push(`• ${item.assignment.teks_code}: ${item.assignment.title}`);
      }
      lines.push("");
    }

    const needs = [...snapshot.intervention, ...snapshot.developing];
    if (needs.length) {
      lines.push("Skills to keep working on:");
      for (const item of needs.slice(0, 4)) {
        lines.push(`• ${item.assignment.teks_code}: ${item.assignment.title} — ${item.result.mastery_label} (${item.result.mastery_score}%)`);
      }
      lines.push("");
      lines.push("Recommended next step: continue the assigned Tolux remediation/practice for these skills and recheck mastery after additional practice.");
    } else {
      lines.push("Current Tolux assignments are at mastery. Continue regular Algebra 1 practice to maintain progress.");
    }

    lines.push("");
    lines.push("This summary is based only on completed Tolux classroom assignments and is not a report-card grade.");
    return lines.join("\n");
  }

  function renderParentStudentOptions() {
    const select = $("#parentStudentSelect");
    if (!select) return;
    const previous = select.value;
    select.replaceChildren();
    const students = currentReport?.students || [];
    if (!students.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No enrolled students yet";
      select.append(option);
      select.disabled = true;
      $("#parentSummary").value = "";
      return;
    }
    select.disabled = false;
    for (const student of students) {
      const option = document.createElement("option");
      option.value = student.student_user_id;
      option.textContent = student.student_display_name;
      select.append(option);
    }
    if (previous && students.some(item => item.student_user_id === previous)) select.value = previous;
    renderParentSummary();
  }

  function renderParentSummary() {
    const studentId = $("#parentStudentSelect")?.value;
    const snapshot = getStudentSnapshot(studentId);
    $("#parentSummary").value = snapshot ? buildParentSummary(snapshot) : "";
  }

  function renderInterventionGroups() {
    const container = $("#interventionGroups");
    if (!container) return;
    container.replaceChildren();

    const students = currentReport?.students || [];
    const assignments = currentReport?.assignments || [];
    const completions = currentReport?.completions || [];
    const groups = new Map();

    for (const assignment of assignments) {
      const needs = [];
      const developing = [];
      for (const student of students) {
        const result = latestCompletion(completions, student.student_user_id, assignment.id);
        if (!result) continue;
        if (result.mastery_label === "Intervention Needed") needs.push(student.student_display_name);
        else if (result.mastery_label === "Developing") developing.push(student.student_display_name);
      }
      if (!needs.length && !developing.length) continue;
      const key = assignment.teks_code;
      if (!groups.has(key)) groups.set(key, { titles: new Set(), intervention: new Set(), developing: new Set() });
      const group = groups.get(key);
      group.titles.add(assignment.title);
      needs.forEach(name => group.intervention.add(name));
      developing.forEach(name => group.developing.add(name));
    }

    if (!groups.size) {
      container.innerHTML = '<div class="empty">No intervention groups yet. Tolux will group students after classroom assignments produce Developing or Intervention Needed results.</div>';
      return;
    }

    for (const [teks, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
      const card = document.createElement("article");
      card.className = "phase3-group";
      const intervention = [...group.intervention];
      const developing = [...group.developing].filter(name => !group.intervention.has(name));
      card.innerHTML = `
        <h3>${escapeHtml(teks)} <span class="pill">Intervention group</span></h3>
        <p>${escapeHtml([...group.titles][0] || "Algebra 1 skill")}</p>
        ${intervention.length ? `<p><strong>Intervention needed:</strong> ${intervention.map(escapeHtml).join(", ")}</p>` : ""}
        ${developing.length ? `<p><strong>Developing:</strong> ${developing.map(escapeHtml).join(", ")}</p>` : ""}
      `;
      container.append(card);
    }
  }

  async function loadClassrooms() {
    const { data, error } = await client.from("teacher_classrooms")
      .select("id, name, period")
      .eq("teacher_user_id", currentUser.id)
      .eq("archived", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    classrooms = data || [];
    const select = $("#phase3ClassSelect");
    select.replaceChildren();
    if (!classrooms.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Create a class first";
      select.append(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    for (const classroom of classrooms) {
      const option = document.createElement("option");
      option.value = classroom.id;
      option.textContent = classroom.period ? `${classroom.name} • ${classroom.period}` : classroom.name;
      select.append(option);
    }
  }

  async function loadPhase3Report() {
    const classroomId = $("#phase3ClassSelect")?.value;
    if (!classroomId) return;
    $("#phase3Message").textContent = "Loading classroom support groups…";
    const { data, error } = await client.rpc("get_teacher_classroom_report", { p_classroom_id: classroomId });
    if (error) {
      $("#phase3Message").textContent = error.message;
      return;
    }
    currentReport = data || {};
    $("#phase3Message").textContent = "Updated";
    renderInterventionGroups();
    renderParentStudentOptions();
  }

  async function loadPilotState() {
    const { data: profile } = await client.from("teacher_profiles")
      .select("school_name, district_name")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (profile) {
      if (!$("#pilotSchool").value) $("#pilotSchool").value = profile.school_name || "";
      if (!$("#pilotDistrict").value) $("#pilotDistrict").value = profile.district_name || "";
    }

    const { data, error } = await client.from("school_pilot_requests")
      .select("id, school_name, district_name, requester_role, estimated_students, primary_goal, status, created_at")
      .eq("requester_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    const list = $("#pilotRequestHistory");
    list.replaceChildren();
    if (!data?.length) {
      list.innerHTML = '<div class="empty">No school or district pilot requests submitted yet.</div>';
      return;
    }
    for (const request of data) {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<div><h3>${escapeHtml(request.school_name)} <span class="phase3-status ${escapeHtml(request.status)}">${escapeHtml(request.status)}</span></h3><p>${escapeHtml(request.district_name || "District not specified")} • ${escapeHtml(request.requester_role.replaceAll("_", " "))}${request.estimated_students ? ` • about ${request.estimated_students} students` : ""}</p><p>Submitted ${escapeHtml(new Date(request.created_at).toLocaleDateString())}</p></div>`;
      list.append(card);
    }
  }

  async function submitPilotRequest(event) {
    event.preventDefault();
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user?.email) {
      $("#pilotMessage").textContent = "Please sign in with a verified Tolux educator account.";
      return;
    }
    $("#pilotMessage").textContent = "Submitting pilot request…";
    const estimated = Number($("#pilotStudents").value);
    const row = {
      requester_user_id: user.id,
      contact_email: user.email,
      school_name: $("#pilotSchool").value.trim(),
      district_name: $("#pilotDistrict").value.trim() || null,
      requester_role: $("#pilotRole").value,
      estimated_students: Number.isInteger(estimated) && estimated > 0 ? estimated : null,
      primary_goal: $("#pilotGoal").value.trim() || null,
      status: "requested"
    };
    const { error } = await client.from("school_pilot_requests").insert(row);
    if (error) {
      $("#pilotMessage").textContent = error.message;
      return;
    }
    $("#pilotMessage").textContent = "Pilot request submitted to Tolux.";
    $("#pilotGoal").value = "";
    await loadPilotState();
  }

  async function initializeSignedIn() {
    const { data, error } = await client.auth.getUser();
    currentUser = error ? null : data?.user || null;
    const section = $("#phase3Tools");
    const pilot = $("#pilotSection");
    if (!currentUser) {
      if (section) section.hidden = true;
      if (pilot) pilot.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    if (pilot) pilot.hidden = false;
    await loadClassrooms();
    if (classrooms.length) await loadPhase3Report();
    await loadPilotState();
  }

  $("#phase3RefreshBtn")?.addEventListener("click", () => void loadPhase3Report());
  $("#phase3ClassSelect")?.addEventListener("change", () => void loadPhase3Report());
  $("#parentStudentSelect")?.addEventListener("change", renderParentSummary);
  $("#copyParentSummaryBtn")?.addEventListener("click", async event => {
    const text = $("#parentSummary").value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    event.currentTarget.textContent = "Copied";
    setTimeout(() => { event.currentTarget.textContent = "Copy parent summary"; }, 1500);
  });
  $("#pilotForm")?.addEventListener("submit", submitPilotRequest);

  client.auth.onAuthStateChange(() => setTimeout(() => void initializeSignedIn(), 0));
  void initializeSignedIn();
})();
