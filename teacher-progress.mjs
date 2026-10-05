function flattenCatalog(catalog) {
  const modules = new Map();
  for (const unit of catalog?.units || []) {
    for (const module of unit?.modules || []) {
      if (!module?.module_id) continue;
      modules.set(module.module_id, {
        moduleId: module.module_id,
        title: module.title || module.module_id,
        teks: Array.isArray(module.teks) ? module.teks : [],
        unitTitle: unit.title || ""
      });
    }
  }
  return modules;
}

function summarizeItems(records = []) {
  let attempts = 0;
  let hints = 0;
  let firstAttemptCorrect = 0;
  let graded = 0;
  const misconceptions = new Map();

  for (const record of records) {
    attempts += Number(record?.attempt_count || 0);
    hints += Number(record?.hint_count || 0);
    if (typeof record?.first_attempt_correct === "boolean") {
      graded += 1;
      if (record.first_attempt_correct) firstAttemptCorrect += 1;
    }
    const tag = String(record?.first_error_tag || "").trim();
    if (tag) misconceptions.set(tag, (misconceptions.get(tag) || 0) + 1);
  }

  return {
    attempts,
    hints,
    graded,
    firstAttemptCorrect,
    firstAttemptRate: graded ? Math.round((firstAttemptCorrect / graded) * 100) : null,
    misconceptions: Array.from(misconceptions.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  };
}

export function buildTeacherProgressSummary(activities = [], catalog = {}) {
  const catalogModules = flattenCatalog(catalog);
  const latestByModule = new Map();

  for (const activity of Array.isArray(activities) ? activities : []) {
    const moduleId = String(activity?.module_id || "");
    if (!moduleId) continue;
    const current = latestByModule.get(moduleId);
    const currentTime = current ? new Date(current.completed_at).getTime() : 0;
    const nextTime = new Date(activity.completed_at).getTime();
    if (!current || nextTime > currentTime) latestByModule.set(moduleId, activity);
  }

  const standards = [];
  const allItemRecords = [];
  let mastered = 0;
  let developing = 0;
  let intervention = 0;
  let totalSeconds = 0;

  for (const [moduleId, activity] of latestByModule.entries()) {
    const meta = catalogModules.get(moduleId) || {
      moduleId,
      title: moduleId,
      teks: [],
      unitTitle: ""
    };
    const itemSummary = summarizeItems(activity.item_records || []);
    allItemRecords.push(...(activity.item_records || []));
    totalSeconds += Number(activity.time_on_skill_seconds || 0);

    if (activity.mastery_label === "Mastered") mastered += 1;
    else if (activity.mastery_label === "Developing") developing += 1;
    else if (activity.mastery_label === "Intervention Needed") intervention += 1;

    standards.push({
      moduleId,
      title: meta.title,
      teks: meta.teks,
      unitTitle: meta.unitTitle,
      masteryLabel: activity.mastery_label,
      masteryScore: Number(activity.mastery_score || 0),
      completedAt: activity.completed_at,
      firstAttemptRate: itemSummary.firstAttemptRate,
      attempts: itemSummary.attempts,
      hints: itemSummary.hints,
      misconceptions: itemSummary.misconceptions
    });
  }

  standards.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const overallItems = summarizeItems(allItemRecords);

  return {
    completedModules: standards.length,
    mastered,
    developing,
    intervention,
    timeOnSkillSeconds: totalSeconds,
    firstAttemptRate: overallItems.firstAttemptRate,
    topMisconceptions: overallItems.misconceptions,
    standards
  };
}
