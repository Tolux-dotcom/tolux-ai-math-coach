const SPECIAL_ANSWERS = new Map([
  ["nosolution", "no-solution"],
  ["nosolutions", "no-solution"],
  ["none", "no-solution"],
  ["emptyset", "no-solution"],
  ["∅", "no-solution"],
  ["infinitelymanysolutions", "infinite-solutions"],
  ["infinitesolutions", "infinite-solutions"],
  ["allrealnumbers", "infinite-solutions"],
  ["allreals", "infinite-solutions"],
  ["allvaluesofx", "infinite-solutions"],
  ["allx", "infinite-solutions"]
]);

const STAGE_SETTING_KEYS = {
  diagnostic: "diagnostic_item_ids",
  guided_practice: "guided_item_ids",
  independent_practice: "independent_item_ids",
  mastery_check: "mastery_item_ids"
};

const DIAGNOSTIC_TAG_ALIASES = {
  distribution_or_division: "distribution",
  distribution_variables_both_sides: "variables_both_sides",
  distribution_combine_terms: "distribution",
  fraction_coefficient: "fraction_equation",
  mixed_multi_step: "multi_step",
  sign_distribution: "signed_numbers"
};

const SUPERSCRIPT_DIGITS = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻"
};

export function formatMathNotation(value) {
  return String(value ?? "").replace(/\^(-?\d+)/g, (_, exponent) =>
    Array.from(exponent, character => SUPERSCRIPT_DIGITS[character]).join("")
  );
}

function normalizeRootNotation(value) {
  return String(value ?? "")
    .replace(/\bsqrt\s*\(\s*([a-z0-9.]+)\s*\)/gi, "√$1")
    .replace(/\bsqrt\s*([a-z0-9.]+)/gi, "√$1")
    .replace(/\bcbrt\s*\(\s*([a-z0-9.]+)\s*\)/gi, "∛$1")
    .replace(/\bcbrt\s*([a-z0-9.]+)/gi, "∛$1")
    .replace(/√\(\s*([a-z0-9.]+)\s*\)/gi, "√$1")
    .replace(/∛\(\s*([a-z0-9.]+)\s*\)/gi, "∛$1");
}

export function normalizeAnswer(value) {
  return normalizeRootNotation(value)
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/[×·*]/g, "")
    .replace(/^answer\s*(?:is|=|:)\s*/i, "")
    .replace(/^x\s+is\s+/i, "x=")
    .replace(/^x\s*:\s*/i, "x=")
    .replace(/\s+/g, "")
    .replace(/[.;,!]+$/g, "");
}

function canonicalSpecialAnswer(value) {
  const normalized = normalizeAnswer(value)
    .replace(/[{}]/g, "")
    .replace(/the|equation|has/g, "");

  if (SPECIAL_ANSWERS.has(normalized)) {
    return SPECIAL_ANSWERS.get(normalized);
  }

  if (normalized.includes("infinitelymany") || normalized.includes("allreal")) {
    return "infinite-solutions";
  }

  if (normalized.includes("nosolution")) {
    return "no-solution";
  }

  return null;
}

function parseOrderedPair(value) {
  const normalized = normalizeAnswer(value);
  let match = normalized.match(/^\(?([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)\)?$/);

  if (match) {
    return [Number(match[1]), Number(match[2])];
  }

  match = normalized.match(
    /^x=([-+]?\d+(?:\.\d+)?),?y=([-+]?\d+(?:\.\d+)?)$/
  );

  if (match) {
    return [Number(match[1]), Number(match[2])];
  }

  match = normalized.match(
    /^y=([-+]?\d+(?:\.\d+)?),?x=([-+]?\d+(?:\.\d+)?)$/
  );

  if (match) {
    return [Number(match[2]), Number(match[1])];
  }

  return null;
}

function parseSimpleNumber(value) {
  let normalized = normalizeAnswer(value)
    .replace(/^x=/, "")
    .replace(/months?$/, "")
    .replace(/gb$/, "");

  if (/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const fraction = normalized.match(
    /^([-+]?\d+(?:\.\d+)?)\/([-+]?\d+(?:\.\d+)?)$/
  );

  if (!fraction) return null;

  const denominator = Number(fraction[2]);
  if (denominator === 0) return null;

  return Number(fraction[1]) / denominator;
}

function parseLabeledSolutionSet(value) {
  const matches = [
    ...normalizeAnswer(value).matchAll(
      /x=([-+]?\d+(?:\.\d+)?(?:\/[-+]?\d+(?:\.\d+)?)?)/g
    )
  ];
  if (matches.length < 2) return null;

  const values = matches
    .map(match => parseSimpleNumber(match[1]))
    .filter(number => number !== null);
  if (values.length < 2) return null;

  return [...new Set(values)].sort((a, b) => a - b);
}

export function keywordGroupsSatisfied(text, groups = [], minimumGroups) {
  if (!Array.isArray(groups) || groups.length === 0) return false;

  const normalizedText = normalizeAnswer(text);
  const matches = groups.filter(group => {
    const alternatives = Array.isArray(group) ? group : [group];
    return alternatives.some(keyword =>
      normalizedText.includes(normalizeAnswer(keyword))
    );
  }).length;

  const required = Number.isInteger(minimumGroups)
    ? minimumGroups
    : groups.length;

  return matches >= required;
}

export function answersEquivalent(studentAnswer, itemOrExpected) {
  const item = typeof itemOrExpected === "object"
    ? itemOrExpected
    : { answer_key: itemOrExpected };
  const expected = item?.answer_key ?? "";

  if (!normalizeAnswer(studentAnswer)) return false;

  if (
    Array.isArray(item.answer_keywords) &&
    keywordGroupsSatisfied(
      studentAnswer,
      item.answer_keywords,
      item.minimum_keyword_groups
    )
  ) {
    return true;
  }

  const acceptedAnswers = [expected, ...(item.accepted_answers || [])];
  const normalizedStudent = normalizeAnswer(studentAnswer);

  if (
    acceptedAnswers.some(answer =>
      normalizeAnswer(answer) === normalizedStudent
    )
  ) {
    return true;
  }

  const studentSpecial = canonicalSpecialAnswer(studentAnswer);
  const expectedSpecial = canonicalSpecialAnswer(expected);

  if (studentSpecial && studentSpecial === expectedSpecial) {
    return true;
  }

  const expectedPair = parseOrderedPair(expected);
  const studentPair = parseOrderedPair(studentAnswer);

  if (expectedPair && studentPair) {
    return (
      Math.abs(expectedPair[0] - studentPair[0]) < 1e-8 &&
      Math.abs(expectedPair[1] - studentPair[1]) < 1e-8
    );
  }

  const expectedSolutions = parseLabeledSolutionSet(expected);
  const studentSolutions = parseLabeledSolutionSet(studentAnswer);

  if (expectedSolutions && studentSolutions) {
    return (
      expectedSolutions.length === studentSolutions.length &&
      expectedSolutions.every(
        (solution, index) =>
          Math.abs(solution - studentSolutions[index]) < 1e-8
      )
    );
  }

  const expectedNumber = parseSimpleNumber(expected);
  const studentNumber = parseSimpleNumber(studentAnswer);

  return (
    expectedNumber !== null &&
    studentNumber !== null &&
    Math.abs(expectedNumber - studentNumber) < 1e-8
  );
}

export function explanationSatisfies(explanation, item) {
  if (!item?.explanation_prompt) return true;

  return keywordGroupsSatisfied(
    explanation,
    item.explanation_keywords,
    item.minimum_explanation_keyword_groups
  );
}

export function validateLessonModule(module) {
  const errors = [];

  if (!module || typeof module !== "object") {
    return ["Lesson module must be an object."];
  }

  for (const key of ["module_id", "course", "title"]) {
    if (!module[key]) errors.push(`Missing required field: ${key}.`);
  }

  if (!Array.isArray(module.teks) || module.teks.length === 0) {
    errors.push("At least one TEKS code is required.");
  }

  if (!Array.isArray(module.lesson_flow) || module.lesson_flow.length === 0) {
    errors.push("lesson_flow must contain at least one stage.");
  }

  if (!Array.isArray(module.items) || module.items.length === 0) {
    errors.push("items must contain at least one lesson item.");
    return errors;
  }

  const ids = new Set();

  for (const item of module.items) {
    if (!item.id) errors.push("Every lesson item needs an id.");
    if (item.id && ids.has(item.id)) {
      errors.push(`Duplicate lesson item id: ${item.id}.`);
    }
    if (item.id) ids.add(item.id);
    if (!item.type) errors.push(`Item ${item.id || "(unknown)"} needs a type.`);
    if (!item.prompt) errors.push(`Item ${item.id || "(unknown)"} needs a prompt.`);
    if (!item.answer_key) {
      errors.push(`Item ${item.id || "(unknown)"} needs an answer_key.`);
    }
  }

  for (const [setting, value] of Object.entries(module.lesson_settings || {})) {
    if (!setting.endsWith("_item_ids") || !Array.isArray(value)) continue;
    for (const itemId of value) {
      if (!ids.has(itemId)) {
        errors.push(`lesson_settings references missing item: ${itemId}.`);
      }
    }
  }

  return errors;
}

export function selectStageItems(module, type) {
  const allItems = (module?.items || []).filter(item => item.type === type);
  const settingKey = STAGE_SETTING_KEYS[type];
  const configuredIds = settingKey
    ? module?.lesson_settings?.[settingKey]
    : null;

  if (!Array.isArray(configuredIds) || configuredIds.length === 0) {
    return allItems;
  }

  const byId = new Map(allItems.map(item => [item.id, item]));
  return configuredIds.map(id => byId.get(id)).filter(Boolean);
}

export function calculateMastery(results, policy = {}) {
  const total = results.length;
  const correctCount = results.filter(result => result.correct).length;
  const scorePercent = total === 0
    ? 0
    : Math.round((correctCount / total) * 100);
  const criticalMisses = results.filter(result =>
    !result.correct &&
    (result.critical || result.item?.critical_misconception)
  ).length;
  const explanationItems = results.filter(result =>
    result.requiresExplanation || result.item?.explanation_prompt
  );
  const explanationPassed = !policy.requires_explanation_item ||
    explanationItems.some(result =>
      result.correct && result.explanationCorrect !== false
    );
  const minimumItems = policy.minimum_mastery_items ?? total;
  const threshold = policy.threshold_percent ?? 80;
  const criticalAllowed = policy.critical_misconceptions_allowed ?? 0;
  const mastered =
    total >= minimumItems &&
    scorePercent >= threshold &&
    criticalMisses <= criticalAllowed &&
    explanationPassed;

  let label = "Intervention Needed";
  if (mastered) label = "Mastered";
  else if (scorePercent >= 60) label = "Developing";

  return {
    mastered,
    label,
    total,
    correctCount,
    scorePercent,
    criticalMisses,
    explanationPassed
  };
}

export function buildRecheckItems(module, missedItems, requestedCount = 2) {
  const allItems = module?.items || [];
  const practiceItems = allItems.filter(item =>
    item.type === "independent_practice" || item.type === "guided_practice"
  );
  const routes = module?.misconception_routes || {};
  const selected = [];

  const comparableTag = tag => DIAGNOSTIC_TAG_ALIASES[tag] || tag;
  const routeFor = tag =>
    routes[tag]?.route ||
    routes[comparableTag(tag)]?.route ||
    comparableTag(tag);

  const sameRoute = (candidate, missed) => {
    if (comparableTag(candidate.diagnostic_tag) === comparableTag(missed.diagnostic_tag)) {
      return true;
    }

    return routeFor(candidate.diagnostic_tag) === routeFor(missed.diagnostic_tag);
  };

  for (const missed of missedItems) {
    const candidate = practiceItems.find(item =>
      item.id !== missed.id &&
      !selected.some(chosen => chosen.id === item.id) &&
      sameRoute(item, missed)
    );

    selected.push(candidate || missed);
    if (selected.length >= requestedCount) break;
  }

  for (const missed of missedItems) {
    if (selected.length >= requestedCount) break;
    if (!selected.some(item => item.id === missed.id)) selected.push(missed);
  }

  return selected.slice(0, requestedCount);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
