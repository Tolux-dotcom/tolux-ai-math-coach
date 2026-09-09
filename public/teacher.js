const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;
let catalogModules = [];
let classrooms = [];
let assignments = [];

const $ = selector => document.querySelector(selector);
const authSection = $("#authSection");
const authLoggedOut = $("#authLoggedOut");
const authLoggedIn = $("#authLoggedIn");
const workspace = $("#workspace");

function message(element, text, kind = "") {
  if (!element) return;
  element.textContent = text || "";
  element.className = `message${kind ? ` ${kind}` : ""}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function generateClassCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => alphabet[value % alphabet.length]).join("");
}

function moduleById(moduleId) {
  return catalogModules.find(module => module.module_id === moduleId);
}

function buildLearningLaunch(module, type, questionCount) {
  if (type === "practice") {
    const params = new URLSearchParams({ skill: module.teks[0], difficulty: "grade-level", count: String(questionCount || 10) });
    return `/practice.html?${params.toString()}`;
  }
  const params = new URLSearchParams({ module: module.module_id, start: type === "diagnostic" ? "diagnostic" : "lesson" });
  return `/lesson.html?${params.toString()}`;
}

function assignmentGatewayUrl(assignmentId) {
  return new URL(`/assignment.html?id=${encodeURIComponent(assignmentId)}`, window.location.origin).href;
}

async function verifyCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function loadCatalog() {
  const response = await fetch("/algebra1-course.json");
  if (!response.ok) throw new Error("Unable to load the Algebra 1 curriculum catalog.");
  const catalog = await response.json();
  catalogModules = catalog.units.flatMap(unit => unit.modules || [])
    .filter(module => module.status === "available" && module.available_modes?.length)
    .sort((a, b) => a.teks[0].localeCompare(b.teks[0], undefined, { numeric: true }));
  const select = $("#assignmentModule");
  select.replaceChildren();
  for (const module of catalogModules) {
    const option = document.createElement("option");
    option.value = module.module_id;
    option.textContent = `${module.teks[0]} • ${module.title}`;
    select.append(option);
  }
  syncAssignmentTitle();
}

async function loadProfile() {
  const { data, error } = await supabaseClient.from("teacher_profiles")
    .select("display_name, school_name, district_name")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  $("#displayName").value = data.display_name || "";
  $("#schoolName").value = data.school_name || "";
  $("#districtName").value = data.district_name || "";
  $("#profileStatus").textContent = "Profile saved";
}

async function loadClassrooms() {
  const { data, error } = await supabaseClient.from("teacher_classrooms")
    .select("id, name, period, class_code, course, created_at")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  classrooms = data || [];
  renderClassrooms();
  renderClassSelect($("#assignmentClass"), false);
  renderClassSelect($("#reportClass"), true);
}

async function loadAssignments() {
  const { data, error } = await supabaseClient.from("teacher_assignments")
    .select("id, classroom_id, title, module_id, teks_code, assignment_type, question_count, due_at, launch_url, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  assignments = data || [];
  renderAssignments();
}

function renderClassrooms() {
  const list = $("#classList");
  list.replaceChildren();
  if (!classrooms.length) {
    list.innerHTML = '<div class="empty">Create your first Algebra 1 class to start assigning Tolux lessons.</div>';
    return;
  }
  for (const classroom of classrooms) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div><h3>${escapeHtml(classroom.name)} <span class="pill">${escapeHtml(classroom.class_code)}</span></h3><p>${escapeHtml(classroom.period || "Algebra 1")} • Share this class code with enrolled students.</p></div><div class="card-actions"><button type="button" class="use">Create assignment</button><button type="button" class="report secondary">View roster</button></div>`;
    card.querySelector(".use").addEventListener("click", () => {
      $("#assignmentClass").value = classroom.id;
      $("#assignmentForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    card.querySelector(".report").addEventListener("click", async () => {
      $("#reportClass").value = classroom.id;
      await loadClassroomReport();
      $("#reportClass").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    list.append(card);
  }
}

function renderClassSelect(select, preserveSelection) {
  if (!select) return;
  const previous = preserveSelection ? select.value : "";
  select.replaceChildren();
  if (!classrooms.length) {
    const option = document.createElement("option");
    option.textContent = "Create a class first";
    option.value = "";
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
  if (previous && classrooms.some(item => item.id === previous)) select.value = previous;
}

function renderAssignments() {
  const list = $("#assignmentList");
  list.replaceChildren();
  if (!assignments.length) {
    list.innerHTML = '<div class="empty">No assignments yet. Create one above and Tolux will generate a secure classroom link.</div>';
    return;
  }
  for (const assignment of assignments) {
    const classroom = classrooms.find(item => item.id === assignment.classroom_id);
    const secureUrl = assignmentGatewayUrl(assignment.id);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div><h3>${escapeHtml(assignment.title)} <span class="pill">${escapeHtml(assignment.teks_code)}</span></h3><p>${escapeHtml(classroom?.name || "Algebra 1")} • ${escapeHtml(assignment.assignment_type)}${assignment.due_at ? ` • Due ${escapeHtml(new Date(assignment.due_at).toLocaleString())}` : ""}</p><code>${escapeHtml(secureUrl)}</code></div><div class="card-actions"><button type="button" class="copy">Copy student link</button><button type="button" class="open secondary">Open</button></div>`;
    card.querySelector(".copy").addEventListener("click", async event => {
      await navigator.clipboard.writeText(secureUrl);
      event.currentTarget.textContent = "Copied";
      setTimeout(() => { event.currentTarget.textContent = "Copy student link"; }, 1600);
    });
    card.querySelector(".open").addEventListener("click", () => window.open(secureUrl, "_blank", "noopener"));
    list.append(card);
  }
}

function syncAssignmentTitle() {
  const module = moduleById($("#assignmentModule").value);
  const type = $("#assignmentType").value;
  $("#questionCountWrap").hidden = type !== "practice";
  if (!module) return;
  const labels = { lesson: "Lesson", diagnostic: "Readiness Diagnostic", practice: "Practice" };
  $("#assignmentTitle").value = `${module.teks[0]} ${module.title} — ${labels[type]}`;
}

function latestCompletion(completions, studentId, assignmentId) {
  return completions
    .filter(item => item.student_user_id === studentId && item.assignment_id === assignmentId)
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))[0] || null;
}

function renderClassroomReport(report) {
  const students = report?.students || [];
  const reportAssignments = report?.assignments || [];
  const completions = report?.completions || [];
  const classroom = report?.classroom;

  $("#reportSummary").innerHTML = `<article class="card"><div><h3>${escapeHtml(classroom?.name || "Classroom")}</h3><p>${students.length} student${students.length === 1 ? "" : "s"} • ${reportAssignments.length} assignment${reportAssignments.length === 1 ? "" : "s"} • ${completions.length} recorded completion${completions.length === 1 ? "" : "s"}</p></div></article>`;

  const roster = $("#rosterList");
  roster.replaceChildren();
  if (!students.length) {
    roster.innerHTML = '<div class="empty">No students have joined this class yet. Share the class code and a secure assignment link.</div>';
  } else {
    for (const student of students) {
      const studentCompletions = completions.filter(item => item.student_user_id === student.student_user_id);
      const scores = studentCompletions.map(item => Number(item.mastery_score)).filter(Number.isFinite);
      const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
      const intervention = studentCompletions.filter(item => item.mastery_label === "Intervention Needed").length;
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<div><h3>${escapeHtml(student.student_display_name)}</h3><p>${studentCompletions.length} completed assignment${studentCompletions.length === 1 ? "" : "s"}${average === null ? "" : ` • Average mastery ${average}%`}${intervention ? ` • ${intervention} intervention flag${intervention === 1 ? "" : "s"}` : ""}</p></div></article>`;
      roster.append(card);
    }
  }

  const progress = $("#assignmentProgressList");
  progress.replaceChildren();
  if (!reportAssignments.length) {
    progress.innerHTML = '<div class="empty">No assignments in this class yet.</div>';
    return;
  }
  for (const assignment of reportAssignments) {
    const completed = students.map(student => ({ student, result: latestCompletion(completions, student.student_user_id, assignment.id) })).filter(item => item.result);
    const mastered = completed.filter(item => item.result.mastery_label === "Mastered").length;
    const intervention = completed.filter(item => item.result.mastery_label === "Intervention Needed").length;
    const scoreValues = completed.map(item => Number(item.result.mastery_score)).filter(Number.isFinite);
    const average = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : null;
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div><h3>${escapeHtml(assignment.title)} <span class="pill">${escapeHtml(assignment.teks_code)}</span></h3><p>${completed.length}/${students.length} completed • ${mastered} mastered${average === null ? "" : ` • Average ${average}%`}${intervention ? ` • ${intervention} intervention needed` : ""}</p></div></article>`;
    progress.append(card);
  }
}

async function loadClassroomReport() {
  const classroomId = $("#reportClass")?.value;
  if (!classroomId) {
    message($("#reportMessage"), "Create a class first.");
    return;
  }
  message($("#reportMessage"), "Loading roster and mastery…");
  const { data, error } = await supabaseClient.rpc("get_teacher_classroom_report", { p_classroom_id: classroomId });
  if (error) return message($("#reportMessage"), error.message, "error");
  message($("#reportMessage"), "Updated", "success");
  renderClassroomReport(data || {});
}

async function refreshWorkspace() {
  await Promise.all([loadProfile(), loadClassrooms()]);
  await loadAssignments();
  if (classrooms.length) await loadClassroomReport();
}

async function renderAuth() {
  currentUser = await verifyCurrentUser();
  const signedIn = Boolean(currentUser);
  authLoggedOut.hidden = signedIn;
  authLoggedIn.hidden = !signedIn;
  workspace.hidden = !signedIn;
  if (!signedIn) return;
  $("#signedInEmail").textContent = currentUser.email || "teacher";
  await refreshWorkspace();
}

$("#heroStartBtn").addEventListener("click", () => authSection.scrollIntoView({ behavior: "smooth" }));

$("#signInBtn").addEventListener("click", async () => {
  message($("#authMessage"), "Signing in…");
  const { error } = await supabaseClient.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
  if (error) return message($("#authMessage"), error.message, "error");
  message($("#authMessage"), "");
  await renderAuth();
});

$("#signUpBtn").addEventListener("click", async () => {
  message($("#authMessage"), "Creating account…");
  const { error } = await supabaseClient.auth.signUp({ email: $("#email").value.trim(), password: $("#password").value });
  if (error) return message($("#authMessage"), error.message, "error");
  message($("#authMessage"), "Account created. Confirm your email if prompted, then sign in.", "success");
});

$("#signOutBtn").addEventListener("click", async () => { await supabaseClient.auth.signOut(); await renderAuth(); });

$("#profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  const row = { user_id: currentUser.id, display_name: $("#displayName").value.trim(), school_name: $("#schoolName").value.trim() || null, district_name: $("#districtName").value.trim() || null, updated_at: new Date().toISOString() };
  const { error } = await supabaseClient.from("teacher_profiles").upsert(row, { onConflict: "user_id" });
  if (error) return $("#profileStatus").textContent = error.message;
  $("#profileStatus").textContent = "Profile saved";
});

$("#classForm").addEventListener("submit", async event => {
  event.preventDefault();
  message($("#classMessage"), "Creating class…");
  const base = { teacher_user_id: currentUser.id, name: $("#className").value.trim(), period: $("#classPeriod").value.trim() || null, course: "Algebra 1" };
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await supabaseClient.from("teacher_classrooms").insert({ ...base, class_code: generateClassCode() });
    if (!error) { lastError = null; break; }
    lastError = error;
    if (error.code !== "23505") break;
  }
  if (lastError) return message($("#classMessage"), lastError.message, "error");
  $("#className").value = "";
  $("#classPeriod").value = "";
  message($("#classMessage"), "Class created.", "success");
  await loadClassrooms();
  await loadClassroomReport();
});

$("#assignmentType").addEventListener("change", syncAssignmentTitle);
$("#assignmentModule").addEventListener("change", syncAssignmentTitle);
$("#reportClass").addEventListener("change", () => void loadClassroomReport());
$("#refreshReportBtn").addEventListener("click", () => void loadClassroomReport());

$("#assignmentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const module = moduleById($("#assignmentModule").value);
  if (!module) return message($("#assignmentMessage"), "Choose a live Algebra 1 skill.", "error");
  const type = $("#assignmentType").value;
  if (!module.available_modes?.includes(type === "diagnostic" ? "lesson" : type)) return message($("#assignmentMessage"), "That Tolux mode is not available for this skill yet.", "error");
  const questionCount = type === "practice" ? Number($("#questionCount").value) : null;
  const dueValue = $("#dueAt").value;
  const row = { teacher_user_id: currentUser.id, classroom_id: $("#assignmentClass").value, title: $("#assignmentTitle").value.trim(), module_id: module.module_id, teks_code: module.teks[0], assignment_type: type, question_count: questionCount, due_at: dueValue ? new Date(dueValue).toISOString() : null, launch_url: buildLearningLaunch(module, type, questionCount), status: "published" };
  const { data, error } = await supabaseClient.from("teacher_assignments").insert(row).select("id").single();
  if (error) return message($("#assignmentMessage"), error.message, "error");
  const secureUrl = assignmentGatewayUrl(data.id);
  message($("#assignmentMessage"), `Assignment created. Share this secure student link: ${secureUrl}`, "success");
  await loadAssignments();
  await loadClassroomReport();
});

supabaseClient.auth.onAuthStateChange(() => { setTimeout(() => void renderAuth(), 0); });

(async function start() {
  try { await loadCatalog(); await renderAuth(); }
  catch (error) { message($("#authMessage"), error.message, "error"); }
})();
