const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = selector => document.querySelector(selector);
const assignmentId = new URLSearchParams(window.location.search).get("id");
let currentUser = null;
let assignment = null;

function setMessage(el, text, kind = "") {
  el.textContent = text || "";
  el.className = `message${kind ? ` ${kind}` : ""}`;
}

function appendAssignment(url) {
  const resolved = new URL(url, window.location.origin);
  resolved.searchParams.set("assignment", assignmentId);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

async function verifyUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  return error ? null : data?.user || null;
}

async function loadPreview() {
  if (!assignmentId) throw new Error("This assignment link is incomplete.");
  const { data, error } = await supabaseClient.rpc("get_assignment_preview", { p_assignment_id: assignmentId });
  if (error) throw error;
  const preview = data?.[0];
  if (!preview) throw new Error("This assignment is no longer available.");
  $("#assignmentHeading").textContent = preview.title;
  $("#assignmentMeta").textContent = `${preview.teks_code} • ${preview.class_name}${preview.class_period ? ` • ${preview.class_period}` : ""} • ${preview.assignment_type}`;
}

async function loadAssignmentAccess() {
  const { data, error } = await supabaseClient.rpc("get_assignment_for_student", { p_assignment_id: assignmentId });
  if (error) throw error;
  assignment = data?.[0] || null;
  $("#joinSection").hidden = Boolean(assignment);
  $("#readySection").hidden = !assignment;
  if (!assignment) return;
  $("#readyTitle").textContent = assignment.title;
  $("#readyDetails").textContent = `${assignment.teks_code} • ${assignment.assignment_type}${assignment.due_at ? ` • Due ${new Date(assignment.due_at).toLocaleString()}` : ""}`;
}

async function renderAuth() {
  currentUser = await verifyUser();
  const signedIn = Boolean(currentUser);
  $("#authLoggedOut").hidden = signedIn;
  $("#authLoggedIn").hidden = !signedIn;
  $("#joinSection").hidden = true;
  $("#readySection").hidden = true;
  if (!signedIn) return;
  $("#signedInEmail").textContent = currentUser.email || "student";
  await loadPreview();
  await loadAssignmentAccess();
}

$("#signInBtn").addEventListener("click", async () => {
  setMessage($("#authMessage"), "Signing in…");
  const { error } = await supabaseClient.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
  if (error) return setMessage($("#authMessage"), error.message, "error");
  setMessage($("#authMessage"), "");
  await renderAuth();
});

$("#signUpBtn").addEventListener("click", async () => {
  setMessage($("#authMessage"), "Creating account…");
  const { error } = await supabaseClient.auth.signUp({ email: $("#email").value.trim(), password: $("#password").value });
  if (error) return setMessage($("#authMessage"), error.message, "error");
  setMessage($("#authMessage"), "Account created. Confirm your email if prompted, then sign in.", "success");
});

$("#signOutBtn").addEventListener("click", async () => { await supabaseClient.auth.signOut(); await renderAuth(); });

$("#joinForm").addEventListener("submit", async event => {
  event.preventDefault();
  setMessage($("#joinMessage"), "Joining class…");
  const { error } = await supabaseClient.rpc("join_teacher_class", {
    p_class_code: $("#classCode").value.trim().toUpperCase(),
    p_display_name: $("#studentName").value.trim()
  });
  if (error) return setMessage($("#joinMessage"), error.message, "error");
  setMessage($("#joinMessage"), "Class joined. Your assignment is ready.", "success");
  await loadAssignmentAccess();
});

$("#startAssignmentBtn").addEventListener("click", () => {
  if (!assignment?.launch_url) return;
  window.location.href = appendAssignment(assignment.launch_url);
});

supabaseClient.auth.onAuthStateChange(() => setTimeout(() => void renderAuth(), 0));

(async function start() {
  try {
    currentUser = await verifyUser();
    if (currentUser) await loadPreview();
    await renderAuth();
  } catch (error) {
    setMessage($("#authMessage"), error.message, "error");
  }
})();
