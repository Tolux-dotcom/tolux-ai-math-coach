const SKILL_BY_MODULE = Object.freeze({
  "alg1-a5a-linear-equations": "A.5A",
  "practice-alg1-a5a-linear-equations": "A.5A",
  "practice-alg1-a5b-linear-inequalities": "A.5B",
  "practice-alg1-a5c-linear-systems": "A.5C",
  "practice-alg1-a10e-factor-trinomials": "A.10E",
  "practice-alg1-a10f-difference-of-squares": "A.10F"
});

const MASTERY_LABELS = new Set([
  "Mastered",
  "Developing",
  "Intervention Needed"
]);

export function skillCodeForModule(moduleId) {
  return SKILL_BY_MODULE[String(moduleId || "").trim()] || null;
}

export function buildSkillAttemptRow(userId, report, { qaMode = false } = {}) {
  const skillCode = skillCodeForModule(report?.module_id);
  if (!skillCode) return null;

  return {
    user_id: userId,
    client_completion_id: report.client_completion_id,
    skill_code: skillCode,
    completed_at: report.completed_at,
    mastery_label: report.mastery_label,
    mastery_score: report.mastery_score,
    time_on_skill_seconds: report.time_on_skill_seconds,
    item_records: report.item_records,
    qa_mode: Boolean(qaMode)
  };
}

export function mergeSkillMastery(current, attempt) {
  if (!attempt || !MASTERY_LABELS.has(attempt.mastery_label)) {
    throw new Error("A valid skill attempt is required.");
  }

  const previousAttempts = Number(current?.attempts_count || 0);
  const previousSeconds = Number(current?.total_time_on_skill_seconds || 0);
  const misconceptionCounts = {
    ...(current?.misconception_counts && typeof current.misconception_counts === "object"
      ? current.misconception_counts
      : {})
  };

  for (const record of attempt.item_records || []) {
    const tag = String(record?.first_error_tag || "").trim();
    if (!tag) continue;
    misconceptionCounts[tag] = Number(misconceptionCounts[tag] || 0) + 1;
  }

  return {
    user_id: attempt.user_id,
    skill_code: attempt.skill_code,
    attempts_count: previousAttempts + 1,
    latest_score: attempt.mastery_score,
    best_score: Math.max(Number(current?.best_score || 0), attempt.mastery_score),
    mastery_label: attempt.mastery_label,
    total_time_on_skill_seconds: previousSeconds + attempt.time_on_skill_seconds,
    misconception_counts: misconceptionCounts,
    last_practiced_at: attempt.completed_at,
    updated_at: new Date().toISOString()
  };
}
