import { answersEquivalent, formatMathNotation } from "./lesson-core.mjs";

export const PRACTICE_SKILLS = Object.freeze({
  "A.5A": {
    moduleId: "alg1-a5a-linear-equations",
    title: "Solving Linear Equations",
    generator: "a5a"
  },
  "A.5B": {
    moduleId: "alg1-a5b-linear-inequalities",
    title: "Solving Linear Inequalities",
    generator: "a5b"
  },
  "A.5C": {
    moduleId: "alg1-a5c-linear-systems",
    title: "Solving Systems of Linear Equations",
    generator: "a5c"
  },
  "A.6A": {
    moduleId: "alg1-a6a-quadratic-domain-range",
    title: "Quadratic Domain and Range",
    lessonPath: "/a6a-quadratic-domain-range.json"
  },
  "A.6B": {
    moduleId: "alg1-a6b-write-quadratics-from-vertex",
    title: "Write Quadratics from a Vertex and Point",
    lessonPath: "/a6b-write-quadratics-from-vertex.json"
  },
  "A.6C": {
    moduleId: "alg1-a6c-write-quadratics-from-solutions",
    title: "Write Quadratics from Solutions and Graphs",
    lessonPath: "/a6c-write-quadratics-from-solutions.json"
  },
  "A.7A": {
    moduleId: "alg1-a7a-quadratic-key-features",
    title: "Graph Quadratics and Identify Key Features",
    lessonPath: "/a7a-quadratic-key-features.json"
  },
  "A.7B": {
    moduleId: "alg1-a7b-factors-and-zeros",
    title: "Connect Factors and Zeros",
    lessonPath: "/a7b-factors-and-zeros.json"
  },
  "A.7C": {
    moduleId: "alg1-a7c-quadratic-transformations",
    title: "Transform the Quadratic Parent Function",
    lessonPath: "/a7c-quadratic-transformations.json"
  },
  "A.8A": {
    moduleId: "alg1-a8a-solve-quadratic-equations",
    title: "Solve Quadratic Equations",
    lessonPath: "/a8a-solve-quadratic-equations.json"
  },
  "A.8B": {
    moduleId: "alg1-a8b-quadratic-regression",
    title: "Quadratic Models for Data",
    lessonPath: "/a8b-quadratic-regression.json"
  },
  "A.9A": {
    moduleId: "alg1-a9a-exponential-domain-range",
    title: "Exponential Domain and Range",
    lessonPath: "/a9a-exponential-domain-range.json"
  },
  "A.9B": {
    moduleId: "alg1-a9b-interpret-exponential-parameters",
    title: "Interpret Exponential Parameters",
    lessonPath: "/a9b-interpret-exponential-parameters.json"
  },
  "A.9C": {
    moduleId: "alg1-a9c-write-exponential-models",
    title: "Write Growth and Decay Models",
    lessonPath: "/a9c-write-exponential-models.json"
  },
  "A.9D": {
    moduleId: "alg1-a9d-graph-exponential-functions",
    title: "Graph Exponential Functions",
    lessonPath: "/a9d-graph-exponential-functions.json"
  },
  "A.9E": {
    moduleId: "alg1-a9e-exponential-regression",
    title: "Exponential Models for Data",
    lessonPath: "/a9e-exponential-regression.json"
  },
  "A.10A": {
    moduleId: "alg1-a10a-add-subtract-polynomials",
    title: "Add and Subtract Polynomials",
    lessonPath: "/a10a-add-subtract-polynomials.json"
  },
  "A.10B": {
    moduleId: "alg1-a10b-multiply-polynomials",
    title: "Multiply Polynomials",
    lessonPath: "/a10b-multiply-polynomials.json"
  },
  "A.10C": {
    moduleId: "alg1-a10c-divide-polynomials",
    title: "Divide Polynomials",
    lessonPath: "/a10c-divide-polynomials.json"
  },
  "A.10D": {
    moduleId: "alg1-a10d-equivalent-polynomial-forms",
    title: "Equivalent Polynomial Forms",
    lessonPath: "/a10d-equivalent-polynomial-forms.json"
  }
});

export const PRACTICE_DIFFICULTIES = Object.freeze([
  "foundational",
  "grade-level",
  "challenging",
  "mixed"
]);

export const PRACTICE_COUNTS = Object.freeze([5, 10, 20]);

function pickInt(random, minimum, maximum, salt = 0) {
  const span = maximum - minimum + 1;
  const sampled = Math.min(
    span - 1,
    Math.max(0, Math.floor(Number(random()) * span))
  );
  return minimum + ((sampled + salt) % span);
}

function pickNonZero(random, minimum, maximum, salt = 0) {
  let value = pickInt(random, minimum, maximum, salt);
  if (value === 0) value = maximum >= 1 ? 1 : -1;
  return value;
}

function linearExpression(coefficient, constant = 0) {
  const variable = coefficient === 1
    ? "x"
    : coefficient === -1
      ? "-x"
      : `${coefficient}x`;

  if (constant === 0) return variable;
  return `${variable} ${constant > 0 ? "+" : "-"} ${Math.abs(constant)}`;
}

function groupedVariable(constant) {
  if (constant === 0) return "x";
  return `x ${constant > 0 ? "+" : "-"} ${Math.abs(constant)}`;
}

function formatOperator(operator) {
  return operator.replace("<=", "≤").replace(">=", "≥");
}

function reverseOperator(operator) {
  return { "<": ">", ">": "<", "<=": ">=", ">=": "<=" }[operator];
}

function equationItem(difficulty, index, random) {
  const salt = index * 3;

  if (difficulty === "foundational") {
    const x = pickNonZero(random, -9, 9, salt);
    const coefficient = pickInt(random, 2, 8, salt + 1);
    const constant = pickInt(random, -10, 10, salt + 2);
    const result = coefficient * x + constant;

    return {
      variant: "one-step-structure",
      prompt: `Solve ${linearExpression(coefficient, constant)} = ${result}.`,
      answer_key: `x = ${x}`,
      answer_type: "linear-equation",
      hint: `Undo the ${constant >= 0 ? "added" : "subtracted"} constant first, then divide by ${coefficient}.`,
      alternate_explanation: "Think of the equation as a balanced scale. Reverse the constant operation on both sides, then split the remaining value into equal groups.",
      diagnostic_tag: "inverse_operations",
      solution_steps: [
        {
          equation: `${coefficient}x = ${coefficient * x}`,
          explanation: `Remove ${Math.abs(constant)} from the variable side by using the opposite operation on both sides.`
        },
        {
          equation: `x = ${x}`,
          explanation: `Divide both sides by ${coefficient}.`
        }
      ]
    };
  }

  if (difficulty === "grade-level") {
    const x = pickNonZero(random, -8, 8, salt);
    const multiplier = pickInt(random, 2, 6, salt + 1);
    const inside = pickInt(random, -6, 6, salt + 2);
    const outside = pickInt(random, -9, 9, salt + 3);
    const result = multiplier * (x + inside) + outside;
    const distributedConstant = multiplier * inside + outside;

    return {
      variant: "distribution",
      prompt: `Solve ${multiplier}(${groupedVariable(inside)}) ${outside >= 0 ? "+" : "-"} ${Math.abs(outside)} = ${result}.`,
      answer_key: `x = ${x}`,
      answer_type: "linear-equation",
      hint: `Distribute ${multiplier} to every term inside the parentheses before isolating x.`,
      alternate_explanation: "Treat the parentheses as equal groups. Expand all groups first, combine the constant pieces, and then undo the remaining operations.",
      diagnostic_tag: "distribution",
      solution_steps: [
        {
          equation: `${linearExpression(multiplier, distributedConstant)} = ${result}`,
          explanation: `Distribute ${multiplier} and combine the constant terms.`
        },
        {
          equation: `${multiplier}x = ${multiplier * x}`,
          explanation: "Use the opposite operation to remove the constant from the variable side."
        },
        {
          equation: `x = ${x}`,
          explanation: `Divide both sides by ${multiplier}.`
        }
      ]
    };
  }

  const edgeCase = index % 4;
  const multiplier = pickInt(random, 2, 6, salt + 1);
  const inside = pickInt(random, -6, 6, salt + 2);
  const outside = pickInt(random, -8, 8, salt + 3);
  const distributedConstant = multiplier * inside + outside;

  if (edgeCase === 0) {
    return {
      variant: "identity",
      prompt: `Solve ${multiplier}(${groupedVariable(inside)}) ${outside >= 0 ? "+" : "-"} ${Math.abs(outside)} = ${linearExpression(multiplier, distributedConstant)}.`,
      answer_key: "infinitely many solutions",
      accepted_answers: ["all real numbers", "all values of x"],
      answer_type: "linear-equation",
      hint: "Distribute and combine like terms on the left. Then compare both complete sides.",
      alternate_explanation: "Both sides name the same expression. Every real value of x keeps the balance true, so the equation is an identity.",
      diagnostic_tag: "identity",
      solution_steps: [
        {
          equation: `${linearExpression(multiplier, distributedConstant)} = ${linearExpression(multiplier, distributedConstant)}`,
          explanation: "Distribute and combine like terms. The two sides are identical."
        },
        {
          equation: "0 = 0",
          explanation: "The variable terms and constants cancel, leaving a true statement for every real x."
        }
      ]
    };
  }

  if (edgeCase === 1) {
    const contradiction = distributedConstant + pickInt(random, 1, 5, salt + 4);
    return {
      variant: "contradiction",
      prompt: `Solve ${multiplier}(${groupedVariable(inside)}) ${outside >= 0 ? "+" : "-"} ${Math.abs(outside)} = ${linearExpression(multiplier, contradiction)}.`,
      answer_key: "no solution",
      accepted_answers: ["empty set", "none", "∅"],
      answer_type: "linear-equation",
      hint: "Distribute first, then subtract the variable term from both sides and inspect the remaining statement.",
      alternate_explanation: "The x-terms cancel but unequal constants remain. No number can make a false statement true.",
      diagnostic_tag: "contradiction",
      solution_steps: [
        {
          equation: `${linearExpression(multiplier, distributedConstant)} = ${linearExpression(multiplier, contradiction)}`,
          explanation: "Distribute and combine like terms."
        },
        {
          equation: `${distributedConstant} = ${contradiction}`,
          explanation: "The variable terms cancel, leaving a false statement, so there is no solution."
        }
      ]
    };
  }

  const x = pickNonZero(random, -7, 7, salt);
  let rightCoefficient = pickInt(random, -4, 5, salt + 4);
  if (rightCoefficient === multiplier) rightCoefficient -= 1;
  const rightConstant = (multiplier - rightCoefficient) * x + distributedConstant;

  return {
    variant: "distribution-both-sides",
    prompt: `Solve ${multiplier}(${groupedVariable(inside)}) ${outside >= 0 ? "+" : "-"} ${Math.abs(outside)} = ${linearExpression(rightCoefficient, rightConstant)}.`,
    answer_key: `x = ${x}`,
    answer_type: "linear-equation",
    hint: "Distribute, then move all variable terms to one side and all constants to the other.",
    alternate_explanation: "Simplify each side separately first. Then choose the side that leaves a positive x-coefficient and keep the equation balanced.",
    diagnostic_tag: "variables_both_sides",
    solution_steps: [
      {
        equation: `${linearExpression(multiplier, distributedConstant)} = ${linearExpression(rightCoefficient, rightConstant)}`,
        explanation: "Distribute and combine like terms."
      },
      {
        equation: `${multiplier - rightCoefficient}x = ${rightConstant - distributedConstant}`,
        explanation: "Move the variable terms together and the constants together."
      },
      {
        equation: `x = ${x}`,
        explanation: `Divide by ${multiplier - rightCoefficient}.`
      }
    ]
  };
}

function inequalityItem(difficulty, index, random) {
  const salt = index * 4;
  const sourceOperator = index % 2 === 0 ? "<" : "<=";
  const boundary = pickInt(random, -8, 8, salt);
  let coefficient;
  let leftConstant;
  let rightCoefficient = 0;
  let rightConstant;
  let prompt;
  let simplifiedCoefficient;
  let diagnosticTag;
  let hint;

  if (difficulty === "foundational") {
    coefficient = pickNonZero(random, -7, 7, salt + 1);
    leftConstant = pickInt(random, -9, 9, salt + 2);
    rightConstant = coefficient * boundary + leftConstant;
    simplifiedCoefficient = coefficient;
    prompt = `Solve ${linearExpression(coefficient, leftConstant)} ${formatOperator(sourceOperator)} ${rightConstant}.`;
    diagnosticTag = coefficient < 0 ? "reverse_inequality" : "inverse_operations";
    hint = coefficient < 0
      ? "Isolate the variable, and remember that dividing by a negative reverses the inequality sign."
      : "Undo the constant first, then divide both sides by the x-coefficient.";
  } else if (difficulty === "grade-level") {
    coefficient = pickNonZero(random, -6, 7, salt + 1);
    rightCoefficient = pickNonZero(random, -5, 6, salt + 2);
    if (rightCoefficient === coefficient) rightCoefficient += 1;
    leftConstant = pickInt(random, -10, 10, salt + 3);
    simplifiedCoefficient = coefficient - rightCoefficient;
    rightConstant = simplifiedCoefficient * boundary + leftConstant;
    prompt = `Solve ${linearExpression(coefficient, leftConstant)} ${formatOperator(sourceOperator)} ${linearExpression(rightCoefficient, rightConstant)}.`;
    diagnosticTag = simplifiedCoefficient < 0
      ? "reverse_inequality"
      : "variables_both_sides";
    hint = "Move the x-terms to one side and constants to the other. Reverse the sign only if the final division is by a negative.";
  } else {
    const multiplier = pickNonZero(random, -5, 5, salt + 1);
    const inside = pickInt(random, -5, 5, salt + 2);
    const outside = pickInt(random, -8, 8, salt + 3);
    rightCoefficient = pickNonZero(random, -4, 6, salt + 4);
    if (rightCoefficient === multiplier) rightCoefficient += 1;
    simplifiedCoefficient = multiplier - rightCoefficient;
    rightConstant = simplifiedCoefficient * boundary + multiplier * inside + outside;
    coefficient = multiplier;
    leftConstant = multiplier * inside + outside;
    prompt = `Solve ${multiplier}(${groupedVariable(inside)}) ${outside >= 0 ? "+" : "-"} ${Math.abs(outside)} ${formatOperator(sourceOperator)} ${linearExpression(rightCoefficient, rightConstant)}.`;
    diagnosticTag = simplifiedCoefficient < 0
      ? "reverse_inequality"
      : "distribution_variables_both_sides";
    hint = "Distribute before moving terms. Track the sign of the final x-coefficient so you know whether to reverse the inequality.";
  }

  const answerOperator = simplifiedCoefficient < 0
    ? reverseOperator(sourceOperator)
    : sourceOperator;

  return {
    variant: difficulty === "foundational"
      ? "one-variable-inequality"
      : difficulty === "grade-level"
        ? "variables-both-sides"
        : "distribution-both-sides",
    prompt,
    answer_key: `x ${answerOperator} ${boundary}`,
    answer_type: "linear-inequality",
    expected: {
      variable: "x",
      operator: answerOperator,
      boundary
    },
    hint,
    alternate_explanation: "Treat the inequality like an equation while adding or subtracting. When multiplying or dividing by a negative, reverse the comparison because the number-line order flips.",
    diagnostic_tag: diagnosticTag,
    solution_steps: [
      {
        equation: `${simplifiedCoefficient}x ${formatOperator(sourceOperator)} ${simplifiedCoefficient * boundary}`,
        explanation: "Distribute if needed, combine like terms, and gather the variable terms."
      },
      {
        equation: `x ${formatOperator(answerOperator)} ${boundary}`,
        explanation: simplifiedCoefficient < 0
          ? `Divide by ${simplifiedCoefficient} and reverse the inequality sign.`
          : `Divide by ${simplifiedCoefficient}; the inequality direction stays the same.`
      }
    ]
  };
}

function systemItem(difficulty, index, random) {
  const salt = index * 5;
  const x = pickInt(random, difficulty === "challenging" ? 2 : -6, difficulty === "challenging" ? 12 : 6, salt);
  const y = pickInt(random, difficulty === "challenging" ? 2 : -6, difficulty === "challenging" ? 12 : 6, salt + 1);

  if (difficulty === "foundational") {
    const sum = x + y;
    const difference = x - y;
    return {
      variant: "add-subtract-system",
      prompt: `Solve the system:\nx + y = ${sum}\nx - y = ${difference}`,
      answer_key: `x = ${x}, y = ${y}`,
      answer_type: "ordered-pair",
      expected: { x, y },
      hint: "Add the two equations. The y-terms cancel, leaving an equation in x.",
      alternate_explanation: "The first equation gives a total and the second gives a difference. Combining them isolates one unknown; substitute back to find the other.",
      diagnostic_tag: "elimination",
      solution_steps: [
        {
          equation: `2x = ${2 * x}`,
          explanation: "Add the equations so the opposite y-terms cancel."
        },
        {
          equation: `x = ${x}`,
          explanation: "Divide by 2."
        },
        {
          equation: `y = ${y}`,
          explanation: "Substitute x into either original equation and solve for y."
        }
      ]
    };
  }

  if (difficulty === "grade-level") {
    const matrices = [
      [2, 1, 1, -1],
      [3, -2, 1, 1],
      [2, -3, 3, 1],
      [-1, 2, 3, 1]
    ];
    const [a, b, c, d] = matrices[index % matrices.length];
    const firstResult = a * x + b * y;
    const secondResult = c * x + d * y;

    return {
      variant: "general-linear-system",
      prompt: `Solve the system:\n${linearExpression(a, 0).replaceAll("x", "x")} ${b >= 0 ? "+" : "-"} ${Math.abs(b)}y = ${firstResult}\n${linearExpression(c, 0).replaceAll("x", "x")} ${d >= 0 ? "+" : "-"} ${Math.abs(d)}y = ${secondResult}`,
      answer_key: `x = ${x}, y = ${y}`,
      answer_type: "ordered-pair",
      expected: { x, y },
      hint: "Choose substitution or multiply one equation so a pair of variable terms becomes opposites, then add.",
      alternate_explanation: "A solution is the ordered pair that makes both equations true at the same time. Eliminate one variable, solve the remaining equation, and substitute back.",
      diagnostic_tag: "system_elimination",
      solution_steps: [
        {
          equation: `x = ${x}`,
          explanation: "Use elimination or substitution to remove one variable and solve for the other."
        },
        {
          equation: `y = ${y}`,
          explanation: "Substitute the known value into one original equation."
        },
        {
          equation: `(${x}, ${y})`,
          explanation: "Check the ordered pair in both original equations."
        }
      ]
    };
  }

  const studentPrice = pickInt(random, 2, 5, salt + 2);
  const adultPrice = studentPrice + pickInt(random, 2, 5, salt + 3);
  const ticketTotal = x + y;
  const revenue = studentPrice * x + adultPrice * y;

  return {
    variant: "system-word-problem",
    prompt: `A school event sold ${ticketTotal} tickets. Student tickets cost $${studentPrice} and adult tickets cost $${adultPrice}. The total revenue was $${revenue}. Let x be student tickets and y be adult tickets. Find x and y.`,
    answer_key: `x = ${x}, y = ${y}`,
    answer_type: "ordered-pair",
    expected: { x, y },
    hint: `Write x + y = ${ticketTotal}, then write a revenue equation using the two ticket prices.`,
    alternate_explanation: `Start with all ${ticketTotal} tickets at the $${studentPrice} price. The extra revenue comes from the $${adultPrice - studentPrice} additional dollars on each adult ticket.`,
    diagnostic_tag: "system_modeling",
    solution_steps: [
      {
        equation: `x + y = ${ticketTotal}`,
        explanation: "Model the total number of tickets."
      },
      {
        equation: `${studentPrice}x + ${adultPrice}y = ${revenue}`,
        explanation: "Model the total revenue."
      },
      {
        equation: `x = ${x}, y = ${y}`,
        explanation: "Solve the system, then verify both the ticket count and revenue."
      }
    ]
  };
}

export function validatePracticeOptions({ skill, difficulty, count }) {
  const normalizedSkill = String(skill || "").toUpperCase();
  const normalizedDifficulty = String(difficulty || "").toLowerCase();
  const normalizedCount = Number(count);
  const errors = [];

  if (!PRACTICE_SKILLS[normalizedSkill]) {
    errors.push("Choose an available Algebra 1 practice skill.");
  }
  if (!PRACTICE_DIFFICULTIES.includes(normalizedDifficulty)) {
    errors.push("Choose a valid practice difficulty.");
  }
  if (!PRACTICE_COUNTS.includes(normalizedCount)) {
    errors.push("Choose 5, 10, or 20 practice questions.");
  }

  return {
    errors,
    options: {
      skill: normalizedSkill,
      difficulty: normalizedDifficulty,
      count: normalizedCount
    }
  };
}

export function generatePracticeSession(options, random = Math.random) {
  const validation = validatePracticeOptions(options);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors[0]);
  }

  const { skill, difficulty, count } = validation.options;
  const skillConfig = PRACTICE_SKILLS[skill];
  if (!skillConfig.generator) {
    throw new Error("This skill uses its structured lesson bank.");
  }
  const generator = skill === "A.5A"
    ? equationItem
    : skill === "A.5B"
      ? inequalityItem
      : systemItem;
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const itemDifficulty = difficulty === "mixed"
      ? PRACTICE_DIFFICULTIES[index % 3]
      : difficulty;
    const item = generator(itemDifficulty, index, random);
    items.push({
      ...item,
      id: `${skill.toLowerCase().replace(".", "")}-${item.variant}-${index + 1}`,
      skill,
      difficulty: itemDifficulty,
      number: index + 1
    });
  }

  return {
    skill,
    title: PRACTICE_SKILLS[skill].title,
    module_id: PRACTICE_SKILLS[skill].moduleId,
    difficulty,
    count,
    items
  };
}

function shuffleItems(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Number(random()) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index]
    ];
  }
  return shuffled;
}

function normalizeStructuredDifficulty(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "foundational") return "foundational";
  if (normalized === "grade-level") return "grade-level";
  return "challenging";
}

function structuredSolutionSteps(item) {
  if (Array.isArray(item.solution_steps) && item.solution_steps.length > 0) {
    return item.solution_steps;
  }

  return [
    {
      equation: item.prompt,
      explanation:
        item.tutor_behavior ||
        "Identify the mathematical structure and apply the matching rule."
    },
    {
      equation: item.answer_key,
      explanation:
        item.explanation_guidance ||
        "This is the verified result. Check it using the inverse operation, substitution, or the original representation."
    }
  ];
}

function structuredPracticeItem(item, skill, number) {
  const hint =
    item.tutor_behavior ||
    "Identify the structure first, then apply one correct operation at a time.";
  const alternateExplanation =
    item.explanation_guidance ||
    item.tutor_behavior ||
    "Use the original representation to check that your rewritten answer preserves the same mathematical value.";

  return {
    ...item,
    id: `practice-${item.id}`,
    source_item_id: item.id,
    skill,
    number,
    difficulty: normalizeStructuredDifficulty(item.difficulty),
    prompt: formatMathNotation(item.prompt),
    answer_key: formatMathNotation(item.answer_key),
    explanation_prompt: formatMathNotation(item.explanation_prompt),
    explanation_guidance: formatMathNotation(item.explanation_guidance),
    tutor_behavior: formatMathNotation(item.tutor_behavior),
    hint: formatMathNotation(hint),
    alternate_explanation: formatMathNotation(alternateExplanation),
    solution_steps: structuredSolutionSteps(item).map(step => ({
      ...step,
      equation: formatMathNotation(step.equation),
      explanation: formatMathNotation(step.explanation)
    }))
  };
}

export function generateStructuredPracticeSession(
  options,
  lessonModule,
  random = Math.random
) {
  const validation = validatePracticeOptions(options);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors[0]);
  }

  const { skill, difficulty, count } = validation.options;
  const config = PRACTICE_SKILLS[skill];
  if (!config.lessonPath) {
    throw new Error("This skill uses the generated practice engine.");
  }
  if (!lessonModule || lessonModule.module_id !== config.moduleId) {
    throw new Error("The selected structured lesson bank could not be verified.");
  }

  const bank = Array.isArray(lessonModule.items)
    ? lessonModule.items.filter(item => item?.id && item?.prompt && item?.answer_key)
    : [];
  if (bank.length < count) {
    throw new Error("This lesson does not yet contain enough verified practice items.");
  }

  const prioritized = difficulty === "mixed"
    ? shuffleItems(bank, random)
    : [
        ...shuffleItems(
          bank.filter(item =>
            normalizeStructuredDifficulty(item.difficulty) === difficulty
          ),
          random
        ),
        ...shuffleItems(
          bank.filter(item =>
            normalizeStructuredDifficulty(item.difficulty) !== difficulty
          ),
          random
        )
      ];
  const items = prioritized
    .slice(0, count)
    .map((item, index) => structuredPracticeItem(item, skill, index + 1));

  return {
    skill,
    title: config.title,
    module_id: config.moduleId,
    difficulty,
    count,
    source: "structured-lesson-bank",
    items
  };
}

function normalizeComparison(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/^answer\s*(?:is|=|:)\s*/, "")
    .replace(/\s+/g, "")
    .replace(/[.;,!]+$/g, "");
}

function parseInequality(value) {
  const normalized = normalizeComparison(value);
  let match = normalized.match(/^x(<=|>=|<|>)([-+]?\d+(?:\.\d+)?)$/);

  if (match) {
    return { operator: match[1], boundary: Number(match[2]) };
  }

  match = normalized.match(/^([-+]?\d+(?:\.\d+)?)(<=|>=|<|>)x$/);
  if (!match) return null;

  return {
    operator: reverseOperator(match[2]),
    boundary: Number(match[1])
  };
}

function parseOrderedPair(value) {
  const normalized = normalizeComparison(value)
    .replace(/[()[\]{}]/g, "")
    .replace(/;/g, ",");
  let match = normalized.match(
    /^x=([-+]?\d+(?:\.\d+)?),?y=([-+]?\d+(?:\.\d+)?)$/
  );

  if (match) {
    return { x: Number(match[1]), y: Number(match[2]) };
  }

  match = normalized.match(
    /^y=([-+]?\d+(?:\.\d+)?),?x=([-+]?\d+(?:\.\d+)?)$/
  );

  if (match) {
    return { x: Number(match[2]), y: Number(match[1]) };
  }

  match = normalized.match(
    /^([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)$/
  );
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

export function gradePracticeAnswer(studentAnswer, item) {
  if (!item || !normalizeComparison(studentAnswer)) return false;

  if (item.answer_type === "linear-inequality") {
    const parsed = parseInequality(studentAnswer);
    return Boolean(
      parsed &&
      parsed.operator === item.expected?.operator &&
      Math.abs(parsed.boundary - item.expected.boundary) < 1e-8
    );
  }

  if (item.answer_type === "ordered-pair") {
    const parsed = parseOrderedPair(studentAnswer);
    return Boolean(
      parsed &&
      Math.abs(parsed.x - item.expected?.x) < 1e-8 &&
      Math.abs(parsed.y - item.expected?.y) < 1e-8
    );
  }

  return answersEquivalent(studentAnswer, item);
}

export function calculatePracticeSummary(records, items) {
  const safeRecords = Array.isArray(records) ? records : [];
  const safeItems = Array.isArray(items) ? items : [];
  const firstAttemptCorrect = safeRecords.filter(
    record => record.first_attempt_correct === true
  ).length;
  const scorePercent = safeItems.length === 0
    ? 0
    : Math.round((firstAttemptCorrect / safeItems.length) * 100);
  const label = scorePercent >= 80
    ? "Mastered"
    : scorePercent >= 60
      ? "Developing"
      : "Intervention Needed";
  const byId = new Map(safeRecords.map(record => [record.item_id, record]));

  return {
    total: safeItems.length,
    firstAttemptCorrect,
    scorePercent,
    label,
    missedItems: safeItems.filter(
      item => byId.get(item.id)?.first_attempt_correct !== true
    )
  };
}
