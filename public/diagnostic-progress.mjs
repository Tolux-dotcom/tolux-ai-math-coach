const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";

function firstAttemptCorrect(record) {
  return record?.first_attempt_correct === true;
}

export function diagnosticProgressModuleId(moduleId) {
  return `diagnostic-${String(moduleId || "").trim()}`;
}

export function summarizeDiagnosticReadiness(items = [], itemRecords = []) {
  const records = new Map(
    itemRecords.map(record => [String(record?.item_id || ""), record])
  );
  const assessedItems = items.filter(item => records.has(String(item?.id || "")));
  const correctCount = assessedItems.filter(item =>
    firstAttemptCorrect(records.get(String(item.id)))
  ).length;
  const total = assessedItems.length;
  const scorePercent = total ? Math.round((correctCount / total) * 100) : 0;
  const missedItems = assessedItems.filter(item =>
    !firstAttemptCorrect(records.get(String(item.id)))
  );

  return {
    correctCount,
    total,
    scorePercent,
    missedItems,
    readinessLabel: missedItems.length ? "Review recommended" : "Ready to begin"
  };
}

export function buildDiagnosticProgressReport({
  moduleId,
  items = [],
  itemRecords = [],
  ownerId = null,
  completionId,
  completedAt = new Date().toISOString(),
  timeOnSkillSeconds = 0
}) {
  const itemIds = new Set(items.map(item => String(item?.id || "")));
  const diagnosticRecords = itemRecords
    .filter(record => itemIds.has(String(record?.item_id || "")))
    .map(record => ({ ...record }));
  const summary = summarizeDiagnosticReadiness(items, diagnosticRecords);
  const masteryLabel = summary.scorePercent === 100
    ? "Mastered"
    : summary.scorePercent >= 50
      ? "Developing"
      : "Intervention Needed";

  return {
    completion_id: completionId,
    owner_user_id: ownerId || null,
    module_id: diagnosticProgressModuleId(moduleId),
    completed_at: completedAt,
    mastery_label: masteryLabel,
    mastery_score: summary.scorePercent,
    is_subscriber: false,
    time_on_skill_seconds: Math.max(0, Math.round(timeOnSkillSeconds)),
    item_records: diagnosticRecords
  };
}

export async function persistDiagnosticProgress({
  report,
  persistOwned,
  storage
}) {
  if (report?.owner_user_id) return persistOwned();

  try {
    // Resolve storage inside the guard: privacy settings may throw on access,
    // and an absent storage API must never be reported as a successful save.
    const deviceStorage = storage === undefined ? globalThis.localStorage : storage;
    if (typeof deviceStorage?.setItem !== "function") {
      throw new Error("Device storage is unavailable.");
    }
    deviceStorage.setItem(
      `${LESSON_PROGRESS_PREFIX}${report?.module_id || ""}`,
      JSON.stringify(report)
    );
    return {
      synced: false,
      pendingSaved: true,
      deviceOnly: true,
      reason: "sign-in-required-for-account-sync"
    };
  } catch (error) {
    console.warn("Diagnostic result could not be saved on this device:", error);
    return {
      synced: false,
      pendingSaved: false,
      deviceOnly: false,
      reason: error?.message || "Device storage is unavailable."
    };
  }
}
