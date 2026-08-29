const MASTERY_LABELS = new Set([
  "Mastered",
  "Developing",
  "Intervention Needed"
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODULE_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/i;

function boundedInteger(value, minimum, maximum, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return number;
}

function normalizeItemRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("item_records contains an invalid record.");
  }

  const itemId = String(value.item_id || "").trim();
  if (!ITEM_ID_PATTERN.test(itemId)) {
    throw new Error("item_records contains an invalid item_id.");
  }

  const firstAttemptCorrect = value.first_attempt_correct;
  if (
    firstAttemptCorrect !== null &&
    typeof firstAttemptCorrect !== "boolean"
  ) {
    throw new Error("item_records contains an invalid first-attempt value.");
  }

  const firstErrorTag = value.first_error_tag == null
    ? null
    : String(value.first_error_tag).trim().slice(0, 80);

  return {
    item_id: itemId,
    attempt_count: boundedInteger(
      value.attempt_count,
      0,
      100,
      "attempt_count"
    ),
    first_attempt_correct: firstAttemptCorrect,
    hint_count: boundedInteger(value.hint_count, 0, 100, "hint_count"),
    first_error_tag: firstErrorTag || null
  };
}

export function normalizeLessonProgressReport(input, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A lesson completion report is required.");
  }

  const completionId = String(input.completion_id || "").trim();
  if (!UUID_PATTERN.test(completionId)) {
    throw new Error("completion_id is invalid.");
  }

  const moduleId = String(input.module_id || "").trim();
  if (!MODULE_PATTERN.test(moduleId)) {
    throw new Error("module_id is invalid.");
  }

  const masteryLabel = String(input.mastery_label || "").trim();
  if (!MASTERY_LABELS.has(masteryLabel)) {
    throw new Error("mastery_label is invalid.");
  }

  const completedAt = new Date(input.completed_at);
  const nowTime = now.getTime();
  if (
    Number.isNaN(completedAt.getTime()) ||
    completedAt.getTime() < Date.UTC(2020, 0, 1) ||
    completedAt.getTime() > nowTime + 5 * 60 * 1000
  ) {
    throw new Error("completed_at is invalid.");
  }

  if (!Array.isArray(input.item_records) || input.item_records.length > 100) {
    throw new Error("item_records is invalid.");
  }

  return {
    client_completion_id: completionId,
    module_id: moduleId,
    completed_at: completedAt.toISOString(),
    mastery_label: masteryLabel,
    mastery_score: boundedInteger(
      input.mastery_score,
      0,
      100,
      "mastery_score"
    ),
    time_on_skill_seconds: boundedInteger(
      input.time_on_skill_seconds,
      0,
      7 * 24 * 60 * 60,
      "time_on_skill_seconds"
    ),
    item_records: input.item_records.map(normalizeItemRecord)
  };
}

export function buildLessonProgressRow(
  userId,
  report,
  { isSubscriber = false, qaMode = false } = {}
) {
  if (!UUID_PATTERN.test(String(userId || ""))) {
    throw new Error("user_id is invalid.");
  }

  return {
    user_id: userId,
    ...report,
    is_subscriber: Boolean(isSubscriber),
    qa_mode: Boolean(qaMode)
  };
}
