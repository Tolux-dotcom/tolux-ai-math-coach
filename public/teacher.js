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
  element.textContent = text || "";
  element.className = `message${kind ? ` ${kind}` : ""}`;
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

function buildLaunch(module, type, questionCount) {
  if (type === "practice") {
    const params = new URLSearchParams({
      skill: module.teks[0],
      difficulty: "grade-level",
      count: String(questionCount || 10)
    });
    return `/practice.html?${params.toString()}`;
  }
  const params = new URLSearchParams({
    module: module.module_id,
    start: type === "diagnostic" ? "diagnostic" : "lesson"
  });
  return `/lesson.html?${params.toString()}`;
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
  renderClassSelect();
}

async function loadAssignments() {
  const { data, error } = await supabaseClient.from("teacher_assignments")
    .select("id, classroom_id, title, module_id, teks_code, assignment_type, question_count, due_at, launch_url, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
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
    card.innerHTML = `<div><h3>${escapeHtml(classroom.name)} <span class="pill">${escapeHtml(classroom.class_code)}</span></h3><p>${escapeHtml(classroom.period || "Algebra 1")}</p></div><div class="card-actions"><button type="button" data-class-id="${classroom.id}">Use class</button></div>`;
    card.querySelector("button").addEventListener("click", () => {
      $("#assignmentClass").value = classroom.id;
      $("#assignmentForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    list.append(card);
  }
}

function renderClassSelect() {
  const select = $("#assignmentClass");
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
}

function renderAssignments() {
  const list = $("#assignmentList");
  list.replaceChildren();
  if (!assignments.length) {
    list.innerHTML = '<div class="empty">No assignments yet. Create one above and Tolux will generate the student launch link.</div>';
    return;
  }
  for (const assignment of assignments) {
    const classroom = classrooms.find(item => item.id === assignment.classroom_id);
    const absoluteUrl = new URL(assignment.launch_url, window.location.origin).href;
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div><h3>${escapeHtml(assignment.title)} <span class="pill">${escapeHtml(assignment.teks_code)}</span></h3><p>${escapeHtml(classroom?.name || "Algebra 1")} • ${escapeHtml(assignment.assignment_type)}</p><code>${escapeHtml(absoluteUrl)}</code></div><div class="card-actions"><button type="button" class="copy">Copy link</button><button type="button" class="open secondary">Open</button></div>`;
    card.querySelector(".copy").addEventListener("click", async event => {
      await navigator.clipboard.writeText(absoluteUrl);
      event.currentTarget.textContent = "Copied";
      setTimeout(() => { event.currentTarget.textContent = "Copy link"; }, 1600);
    });
    card.querySelector(".open").addEventListener("click", () => window.open(absoluteUrl, "_blank", "noopener"));
    list.append(card);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function syncAssignmentTitle() {
  const module = moduleById($("#assignmentModule").value);
  const type = $("#assignmentType").value;
  $("#questionCountWrap").hidden = type !== "practice";
  if (!module) return;
  const labels = { lesson: "Lesson", diagnostic: "Readiness Diagnostic", practice: "Practice" };
  $("#assignmentTitle").value = `${module.teks[0]} ${module.title} — ${labels[type]}`;
}

async function refreshWorkspace() {
  await Promise.all([loadProfile(), loadClassrooms()]);
  await loadAssignments();
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
  $("#className").value = ""; $("#classPeriod").value = "";
  message($("#classMessage"), "Class created.", "success");
  await loadClassrooms();
});

$("#assignmentType").addEventListener("change", syncAssignmentTitle);
$("#assignmentModule").addEventListener("change", syncAssignmentTitle);

$("#assignmentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const module = moduleById($("#assignmentModule").value);
  if (!module) return message($("#assignmentMessage"), "Choose a live Algebra 1 skill.", "error");
  const type = $("#assignmentType").value;
  if (!module.available_modes?.includes(type === "diagnostic" ? "lesson" : type)) return message($("#assignmentMessage"), "That Tolux mode is not available for this skill yet.", "error");
  const questionCount = type === "practice" ? Number($("#questionCount").value) : null;
  const launchUrl = buildLaunch(module, type, questionCount);
  const dueValue = $("#dueAt").value;
  const row = { teacher_user_id: currentUser.id, classroom_id: $("#assignmentClass").value, title: $("#assignmentTitle").value.trim(), module_id: module.module_id, teks_code: module.teks[0], assignment_type: type, question_count: questionCount, due_at: dueValue ? new Date(dueValue).toISOString() : null, launch_url: launchUrl, status: "published" };
  const { error } = await supabaseClient.from("teacher_assignments").insert(row);
  if (error) return message($("#assignmentMessage"), error.message, "error");
  message($("#assignmentMessage"), "Assignment created. Copy the student launch link below.", "success");
  await loadAssignments();
});

supabaseClient.auth.onAuthStateChange(() => { setTimeout(() => void renderAuth(), 0); });

(async function start() {
  try { await loadCatalog(); await renderAuth(); }
  catch (error) { message($("#authMessage"), error.message, "error"); }
})();
