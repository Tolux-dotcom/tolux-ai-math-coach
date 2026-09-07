import { answersEquivalent, formatMathNotation } from "./lesson-core.mjs";

export const STAAR_BLUEPRINT = Object.freeze({
  source: "Texas Education Agency STAAR Algebra I Blueprint, effective as of academic year 2022–23",
  totalQuestions: 50,
  totalPoints: 59,
  calculator: "A graphing calculator is available throughout STAAR Algebra I.",
  timing: "Tolux shows elapsed practice time. The official assessment is scheduled for about 3–4 hours; this practice clock is not an official time limit.",
  categories: [
    { id: 1, name: "Number and Algebraic Methods", questionRange: [9, 11], pointRange: [9, 14], targetQuestions: 10, twoPointItems: 2 },
    { id: 2, name: "Describing and Graphing Linear Functions, Equations and Inequalities", questionRange: [10, 12], pointRange: [10, 16], targetQuestions: 11, twoPointItems: 2 },
    { id: 3, name: "Writing and Solving Linear Functions, Equations and Inequalities", questionRange: [12, 14], pointRange: [12, 18], targetQuestions: 13, twoPointItems: 2 },
    { id: 4, name: "Quadratic Functions and Equations", questionRange: [9, 11], pointRange: [9, 14], targetQuestions: 10, twoPointItems: 2 },
    { id: 5, name: "Exponential Functions and Equations", questionRange: [5, 7], pointRange: [5, 9], targetQuestions: 6, twoPointItems: 1 }
  ]
});

export const CATEGORY_STANDARDS = Object.freeze({
  1: ["A.10A","A.10B","A.10C","A.10D","A.10E","A.10F","A.11A","A.11B","A.12A","A.12B","A.12C","A.12D","A.12E"],
  2: ["A.3A","A.3B","A.3C","A.3D","A.3E","A.3F","A.3G","A.3H","A.4A","A.4B","A.4C"],
  3: ["A.2A","A.2B","A.2C","A.2D","A.2E","A.2F","A.2G","A.2H","A.2I","A.5A","A.5B","A.5C"],
  4: ["A.6A","A.6B","A.6C","A.7A","A.7B","A.7C","A.8A","A.8B"],
  5: ["A.9A","A.9B","A.9C","A.9D","A.9E"]
});

export const LESSON_PATHS = Object.freeze({
  "A.2A":"/a2a-linear-domain-range.json",
  "A.2B":"/a2b-equations-from-points.json",
  "A.2C":"/a2c-lines-from-representations.json",
  "A.2D":"/a2d-direct-variation.json",
  "A.2E":"/a2e-parallel-lines.json",
  "A.2F":"/a2f-perpendicular-lines.json",
  "A.2G":"/a2g-horizontal-vertical-lines.json",
  "A.2H":"/a2h-write-linear-inequalities.json",
  "A.2I":"/a2i-write-linear-systems.json",
  "A.3A":"/a3a-determine-slope.json",
  "A.3B":"/a3b-rate-of-change.json",
  "A.3C":"/a3c-graph-linear-functions.json",
  "A.3D":"/a3d-graph-linear-inequalities.json",
  "A.3E":"/a3e-linear-transformations.json",
  "A.3F":"/a3f-graph-linear-systems.json",
  "A.3G":"/a3g-estimate-system-solutions.json",
  "A.3H":"/a3h-graph-systems-of-inequalities.json",
  "A.4A":"/a4a-correlation-coefficient.json",
  "A.4B":"/a4b-association-causation.json",
  "A.4C":"/a4c-linear-regression.json",
  "A.5A":"/a5a-linear-equations.json",
  "A.5B":"/a5b-linear-inequalities.json",
  "A.5C":"/a5c-linear-systems.json",
  "A.6A":"/a6a-quadratic-domain-range.json",
  "A.6B":"/a6b-write-quadratics-from-vertex.json",
  "A.6C":"/a6c-write-quadratics-from-solutions.json",
  "A.7A":"/a7a-quadratic-key-features.json",
  "A.7B":"/a7b-factors-and-zeros.json",
  "A.7C":"/a7c-quadratic-transformations.json",
  "A.8A":"/a8a-solve-quadratic-equations.json",
  "A.8B":"/a8b-quadratic-regression.json",
  "A.9A":"/a9a-exponential-domain-range.json",
  "A.9B":"/a9b-interpret-exponential-parameters.json",
  "A.9C":"/a9c-write-exponential-models.json",
  "A.9D":"/a9d-graph-exponential-functions.json",
  "A.9E":"/a9e-exponential-regression.json",
  "A.10A":"/a10a-add-subtract-polynomials.json",
  "A.10B":"/a10b-multiply-polynomials.json",
  "A.10C":"/a10c-divide-polynomials.json",
  "A.10D":"/a10d-equivalent-polynomial-forms.json",
  "A.10E":"/a10e-factor-trinomials.json",
  "A.10F":"/a10f-difference-of-squares.json",
  "A.11A":"/a11a-radical-expressions.json",
  "A.11B":"/a11b-laws-of-exponents.json",
  "A.12A":"/a12a-identify-functions.json",
  "A.12B":"/a12b-evaluate-functions.json",
  "A.12C":"/a12c-sequence-terms.json",
  "A.12D":"/a12d-sequence-formulas.json",
  "A.12E":"/a12e-literal-equations.json"
});

const moduleCache = new Map();

export function categoryForSkill(skill) {
  return Number(Object.keys(CATEGORY_STANDARDS).find(id => CATEGORY_STANDARDS[id].includes(skill))) || null;
}

export function categoryDefinition(id) {
  return STAAR_BLUEPRINT.categories.find(category => category.id === Number(id)) || null;
}

export async function loadSkillModule(skill, fetchImpl = fetch) {
  if (moduleCache.has(skill)) return moduleCache.get(skill);
  const path = LESSON_PATHS[skill];
  if (!path) throw new Error(`No Tolux lesson is mapped for ${skill}.`);
  const response = await fetchImpl(path);
  if (!response.ok) throw new Error(`${skill} lesson bank failed to load (${response.status}).`);
  const module = await response.json();
  moduleCache.set(skill, module);
  return module;
}

function itemPool(module) {
  const items = Array.isArray(module?.items) ? module.items : [];
  const usable = items.filter(item =>
    Array.isArray(item.accepted_answers) &&
    item.accepted_answers.length > 0 &&
    !item.explanation_prompt &&
    ["mastery_check","independent_practice","guided_practice"].includes(item.type)
  );
  const priority = { mastery_check: 0, independent_practice: 1, guided_practice: 2 };
  return usable.sort((a,b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
}

function shuffle(values, random = Math.random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

async function buildCategoryQuestions(categoryId, count, random, fetchImpl) {
  const standards = CATEGORY_STANDARDS[categoryId];
  const shuffledStandards = shuffle(standards, random);
  const modules = await Promise.all(shuffledStandards.map(async skill => ({
    skill,
    module: await loadSkillModule(skill, fetchImpl)
  })));

  const selected = [];
  for (const { skill, module } of modules) {
    const pool = shuffle(itemPool(module), random);
    if (!pool.length) continue;
    selected.push({ skill, module, item: pool[0], pool });
    if (selected.length >= count) break;
  }

  let extraIndex = 0;
  while (selected.length < count && modules.length) {
    const entry = modules[extraIndex % modules.length];
    const pool = shuffle(itemPool(entry.module), random);
    const usedIds = new Set(selected.map(question => question.item.id));
    const next = pool.find(item => !usedIds.has(item.id));
    if (next) selected.push({ skill: entry.skill, module: entry.module, item: next, pool });
    extraIndex += 1;
    if (extraIndex > modules.length * 8) break;
  }

  return selected.map(({ skill, module, item }) => ({
    id: `${skill}-${item.id}`,
    skill,
    categoryId: Number(categoryId),
    moduleId: module.module_id,
    moduleTitle: module.title,
    prompt: item.prompt,
    answerKey: item.answer_key,
    acceptedAnswers: item.accepted_answers,
    solutionSteps: item.solution_steps || [],
    diagnosticTag: item.diagnostic_tag || null,
    pointValue: 1,
    lessonUrl: `/lesson.html?module=${encodeURIComponent(module.module_id)}&start=lesson`
  }));
}

export async function buildTestPrepSession({ mode = "quick", categoryId = null, random = Math.random, fetchImpl = fetch } = {}) {
  if (mode === "full") {
    const groups = await Promise.all(STAAR_BLUEPRINT.categories.map(category =>
      buildCategoryQuestions(category.id, category.targetQuestions, random, fetchImpl)
    ));
    const questions = groups.flat();
    for (const category of STAAR_BLUEPRINT.categories) {
      const categoryQuestions = questions.filter(question => question.categoryId === category.id);
      shuffle(categoryQuestions, random).slice(0, category.twoPointItems).forEach(question => {
        question.pointValue = 2;
      });
    }
    return {
      mode,
      title: "Full Algebra 1 EOC Simulation",
      questions: shuffle(questions, random),
      officialBlueprintShape: true,
      maxPoints: questions.reduce((sum, question) => sum + question.pointValue, 0)
    };
  }

  if (mode === "domain") {
    const category = categoryDefinition(categoryId);
    if (!category) throw new Error("Choose a valid STAAR reporting category.");
    const questions = await buildCategoryQuestions(category.id, 10, random, fetchImpl);
    return {
      mode,
      categoryId: category.id,
      title: `Domain Practice: ${category.name}`,
      questions: shuffle(questions, random),
      officialBlueprintShape: false,
      maxPoints: questions.length
    };
  }

  const quickTargets = { 1: 2, 2: 3, 3: 3, 4: 2, 5: 2 };
  const groups = await Promise.all(Object.entries(quickTargets).map(([id, count]) =>
    buildCategoryQuestions(Number(id), count, random, fetchImpl)
  ));
  const questions = groups.flat();
  return {
    mode: "quick",
    title: "Quick STAAR / EOC Practice",
    questions: shuffle(questions, random),
    officialBlueprintShape: false,
    maxPoints: questions.length
  };
}

export function gradeTestPrepAnswer(question, studentAnswer) {
  const answer = String(studentAnswer ?? "").trim();
  if (!answer) return false;
  return question.acceptedAnswers.some(accepted => answersEquivalent(answer, accepted));
}

export function scoreTestPrepSession(session, responses) {
  const rows = session.questions.map(question => {
    const answer = responses[question.id] ?? "";
    const correct = gradeTestPrepAnswer(question, answer);
    return {
      ...question,
      studentAnswer: answer,
      correct,
      pointsEarned: correct ? question.pointValue : 0
    };
  });
  const earned = rows.reduce((sum, row) => sum + row.pointsEarned, 0);
  const max = session.maxPoints || rows.reduce((sum, row) => sum + row.pointValue, 0);
  const categoryResults = STAAR_BLUEPRINT.categories.map(category => {
    const items = rows.filter(row => row.categoryId === category.id);
    const categoryMax = items.reduce((sum, row) => sum + row.pointValue, 0);
    const categoryEarned = items.reduce((sum, row) => sum + row.pointsEarned, 0);
    const percent = categoryMax ? Math.round(categoryEarned / categoryMax * 100) : 0;
    return { id: category.id, name: category.name, earned: categoryEarned, max: categoryMax, percent };
  }).filter(result => result.max > 0);

  return {
    rows,
    earned,
    max,
    percent: max ? Math.round(earned / max * 100) : 0,
    categoryResults,
    missed: rows.filter(row => !row.correct)
  };
}

export function formatTestPrepMath(value) {
  return formatMathNotation(value);
}
