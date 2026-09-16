import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function canonicalActivityPath(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 1000) return null;

  let url: URL;
  try {
    url = new URL(raw, "https://mathcoach.tolux.org");
  } catch {
    return null;
  }

  const allowedKeys = url.pathname === "/lesson.html"
    ? new Set(["module", "start", "assignment"])
    : url.pathname === "/practice.html"
      ? new Set(["skill", "difficulty", "count", "assignment"])
      : null;

  if (!allowedKeys) return null;
  for (const key of url.searchParams.keys()) {
    if (!allowedKeys.has(key)) return null;
  }

  url.searchParams.delete("assignment");
  const entries = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const normalized = new URLSearchParams();
  for (const [key, val] of entries) normalized.append(key, val);

  return `${url.pathname}${normalized.size ? `?${normalized.toString()}` : ""}`;
}

function activityMatchesAssignment(launchUrl: unknown, activityPath: unknown) {
  const expected = canonicalActivityPath(launchUrl);
  const actual = canonicalActivityPath(activityPath);
  return Boolean(expected && actual && expected === actual);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !serviceKey) return json({ error: "Server configuration unavailable" }, 503);

    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Authentication required" }, 401);

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "join-class") {
      const classCode = String(body?.classCode || "").trim().toUpperCase();
      const displayName = String(body?.displayName || "").trim();
      if (!/^[A-Z2-9]{6}$/.test(classCode) || displayName.length < 1 || displayName.length > 120) {
        return json({ error: "Enter a valid class code and student name." }, 400);
      }
      const { data: classroom, error } = await admin.from("teacher_classrooms")
        .select("id, name, period")
        .eq("class_code", classCode)
        .eq("archived", false)
        .maybeSingle();
      if (error) throw error;
      if (!classroom) return json({ error: "Class code not found." }, 404);
      const { error: enrollError } = await admin.from("class_enrollments").upsert({
        classroom_id: classroom.id,
        student_user_id: user.id,
        student_display_name: displayName,
        updated_at: new Date().toISOString()
      }, { onConflict: "classroom_id,student_user_id" });
      if (enrollError) throw enrollError;
      return json({ classroom });
    }

    if (action === "assignment-preview" || action === "assignment-access" || action === "assignment-entitlement") {
      const assignmentId = String(body?.assignmentId || "");
      const { data: assignment, error } = await admin.from("teacher_assignments")
        .select("id, classroom_id, title, module_id, teks_code, assignment_type, question_count, due_at, launch_url, status")
        .eq("id", assignmentId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!assignment) return json({ error: "Assignment not found." }, 404);
      const { data: classroom, error: classError } = await admin.from("teacher_classrooms")
        .select("id, name, period, archived")
        .eq("id", assignment.classroom_id)
        .maybeSingle();
      if (classError) throw classError;
      if (!classroom || classroom.archived) return json({ error: "Assignment not found." }, 404);
      if (action === "assignment-preview") {
        return json({ assignment: {
          id: assignment.id,
          title: assignment.title,
          teks_code: assignment.teks_code,
          assignment_type: assignment.assignment_type,
          due_at: assignment.due_at,
          class_name: classroom.name,
          class_period: classroom.period
        }});
      }
      const { data: enrollment, error: enrollError } = await admin.from("class_enrollments")
        .select("id")
        .eq("classroom_id", assignment.classroom_id)
        .eq("student_user_id", user.id)
        .maybeSingle();
      if (enrollError) throw enrollError;
      if (!enrollment) {
        return action === "assignment-entitlement"
          ? json({ entitled: false, reason: "not-enrolled" })
          : json({ enrolled: false, assignment: null });
      }

      if (action === "assignment-entitlement") {
        const entitled = activityMatchesAssignment(assignment.launch_url, body?.activityPath);
        return json({
          entitled,
          classroomAccess: entitled,
          assignment: entitled ? {
            id: assignment.id,
            title: assignment.title,
            teks_code: assignment.teks_code,
            assignment_type: assignment.assignment_type,
            due_at: assignment.due_at
          } : null,
          classroom: entitled ? {
            id: classroom.id,
            name: classroom.name,
            period: classroom.period
          } : null
        });
      }

      return json({ enrolled: true, assignment });
    }

    if (action === "record-completion") {
      const assignmentId = String(body?.assignmentId || "");
      const clientCompletionId = String(body?.clientCompletionId || "");
      const { data: assignment, error } = await admin.from("teacher_assignments")
        .select("id, classroom_id, module_id, assignment_type, created_at, status")
        .eq("id", assignmentId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!assignment) return json({ error: "Assignment not found." }, 404);
      const { data: enrollment, error: enrollError } = await admin.from("class_enrollments")
        .select("id")
        .eq("classroom_id", assignment.classroom_id)
        .eq("student_user_id", user.id)
        .maybeSingle();
      if (enrollError) throw enrollError;
      if (!enrollment) return json({ error: "Student is not enrolled in this class." }, 403);
      const { data: completion, error: completionError } = await admin.from("lesson_completions")
        .select("id, module_id, mastery_label, mastery_score, completed_at")
        .eq("user_id", user.id)
        .eq("client_completion_id", clientCompletionId)
        .maybeSingle();
      if (completionError) throw completionError;
      if (!completion) return json({ error: "Completion not found." }, 404);
      if (Date.parse(completion.completed_at) < Date.parse(assignment.created_at)) {
        return json({ error: "Completion predates assignment." }, 400);
      }
      const expected = assignment.assignment_type === "practice"
        ? `practice-${assignment.module_id}`
        : assignment.module_id;
      if (completion.module_id !== expected) return json({ error: "Completion does not match assignment." }, 400);
      const { error: insertError } = await admin.from("assignment_completions").upsert({
        assignment_id: assignment.id,
        classroom_id: assignment.classroom_id,
        student_user_id: user.id,
        lesson_completion_id: completion.id,
        module_id: completion.module_id,
        mastery_label: completion.mastery_label,
        mastery_score: completion.mastery_score,
        completed_at: completion.completed_at
      }, { onConflict: "assignment_id,lesson_completion_id", ignoreDuplicates: true });
      if (insertError) throw insertError;
      return json({ recorded: true });
    }

    if (action === "classroom-report") {
      const classroomId = String(body?.classroomId || "");
      const { data: classroom, error } = await admin.from("teacher_classrooms")
        .select("id, name, period, class_code, course, teacher_user_id")
        .eq("id", classroomId)
        .eq("teacher_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!classroom) return json({ error: "Classroom not found." }, 404);
      const [studentsResult, assignmentsResult, completionsResult] = await Promise.all([
        admin.from("class_enrollments").select("student_user_id, student_display_name, joined_at").eq("classroom_id", classroomId).order("student_display_name"),
        admin.from("teacher_assignments").select("id, title, teks_code, assignment_type, due_at, created_at").eq("classroom_id", classroomId).order("created_at", { ascending: false }),
        admin.from("assignment_completions").select("assignment_id, student_user_id, mastery_label, mastery_score, completed_at").eq("classroom_id", classroomId).order("completed_at", { ascending: false })
      ]);
      if (studentsResult.error) throw studentsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (completionsResult.error) throw completionsResult.error;
      const { teacher_user_id: _owner, ...safeClassroom } = classroom;
      return json({ report: {
        classroom: safeClassroom,
        students: studentsResult.data || [],
        assignments: assignmentsResult.data || [],
        completions: completionsResult.data || []
      }});
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("teacher-classroom error", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
