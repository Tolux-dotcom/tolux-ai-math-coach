export const MODE_TARGETS = Object.freeze({
  quick: Object.freeze({ 1: 2, 2: 2, 3: 3, 4: 2, 5: 1 }),
  half: Object.freeze({ 1: 5, 2: 5, 3: 6, 4: 5, 5: 4 }),
  full: Object.freeze({ 1: 10, 2: 11, 3: 13, 4: 10, 5: 6 })
});

export function shuffled(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomizeQuestionChoices(question, random = Math.random) {
  const indexedChoices = question.choices.map((choice, originalIndex) => ({
    choice,
    originalIndex
  }));
  const randomized = shuffled(indexedChoices, random);
  const oldToNew = new Map(
    randomized.map((entry, newIndex) => [entry.originalIndex, newIndex])
  );

  return {
    ...question,
    choices: randomized.map(entry => entry.choice),
    answer: question.answer
      .map(originalIndex => oldToNew.get(originalIndex))
      .sort((a, b) => a - b)
  };
}

function bankQuestionsForMode(modeId, banks) {
  if (modeId === "quick") return banks.quick?.questions || [];
  if (modeId === "half") return banks.half?.questions || [];
  if (modeId === "full") {
    return [
      ...(banks.half?.questions || []),
      ...(banks.fullExtension?.questions || [])
    ];
  }
  throw new Error(`Unsupported Test Prep mode: ${modeId}`);
}

export function assembleQuestions(modeId, banks, random = Math.random) {
  const target = MODE_TARGETS[modeId];
  if (!target) throw new Error(`Unsupported Test Prep mode: ${modeId}`);

  const byCategory = new Map();
  for (const question of bankQuestionsForMode(modeId, banks)) {
    if (!byCategory.has(question.reporting_category)) {
      byCategory.set(question.reporting_category, []);
    }
    byCategory.get(question.reporting_category).push(question);
  }

  const selected = [];
  for (const [category, count] of Object.entries(target)) {
    const available = shuffled(byCategory.get(Number(category)) || [], random);
    if (available.length < count) {
      throw new Error(
        `${modeId} needs ${count} Reporting Category ${category} questions; ${available.length} are available.`
      );
    }
    selected.push(...available.slice(0, count));
  }

  return shuffled(selected, random).map(question =>
    randomizeQuestionChoices(question, random)
  );
}

export function createSession(modeId, questions, startedAt = Date.now()) {
  if (!MODE_TARGETS[modeId]) {
    throw new Error(`Unsupported Test Prep mode: ${modeId}`);
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("A Test Prep session needs at least one question.");
  }

  return {
    modeId,
    questions,
    currentIndex: 0,
    responses: new Map(),
    startedAt
  };
}

export function recordResponse(session, selected) {
  const question = session.questions[session.currentIndex];
  if (!question) return false;
  session.responses.set(
    question.id,
    [...selected].map(Number).sort((a, b) => a - b)
  );
  return true;
}

export function answersMatch(selected, expected) {
  const left = [...selected].sort((a, b) => a - b);
  const right = [...expected].sort((a, b) => a - b);
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

export function scoreSession(session) {
  let earned = 0;
  let possible = 0;
  const categoryTotals = new Map();
  const misses = [];
  const itemRecords = [];

  for (const question of session.questions) {
    const selected = session.responses.get(question.id) || [];
    const correct = answersMatch(selected, question.answer);
    possible += question.points;
    if (correct) earned += question.points;

    if (!categoryTotals.has(question.reporting_category)) {
      categoryTotals.set(question.reporting_category, { earned: 0, possible: 0 });
    }
    const total = categoryTotals.get(question.reporting_category);
    total.possible += question.points;
    if (correct) total.earned += question.points;

    if (!correct) misses.push({ question, selected });
    itemRecords.push({
      item_id: question.id,
      first_attempt_correct: correct,
      first_error_tag: correct ? null : question.teks
    });
  }

  return {
    earned,
    possible,
    percent: possible ? Math.round((earned / possible) * 100) : 0,
    categoryTotals,
    misses,
    itemRecords
  };
}
