import { answersEquivalent } from "./lesson-core.mjs";

export const PRACTICE_SKILLS = Object.freeze({
  "A.5A": {
    moduleId: "alg1-a5a-linear-equations",
    title: "Solving Linear Equations"
  },
  "A.5B": {
    moduleId: "alg1-a5b-linear-inequalities",
    title: "Solving Linear Inequalities"
  },
  "A.5C": {
    moduleId: "alg1-a5c-linear-systems",
    title: "Solving Systems of Linear Equations"
  },
  "A.10E": {
    moduleId: "alg1-a10e-factor-trinomials",
    title: "Factoring Quadratic Trinomials"
  },
  "A.10F": {
    moduleId: "alg1-a10f-difference-of-squares",
    title: "Factoring a Difference of Squares"
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

function formatPolynomial(a, b, c) {
  const terms = [];
  const pushTerm = (coefficient, body) => {
    if (coefficient === 0) return;
    const magnitude = Math.abs(coefficient);
    const value = body && magnitude === 1 ? body : `${magnitude}${body}`;
    terms.push({ sign: coefficient < 0 ? "-" : "+", value });
  };

  pushTerm(a, "x²");
  pushTerm(b, "x");
  pushTerm(c, "");
  return terms.map((term, index) => {
    if (index === 0) return `${term.sign === "-" ? "-" : ""}${term.value}`;
    return ` ${term.sign} ${term.value}`;
  }).join("");
}

function formatLinearFactor(coefficient, constant) {
  const variable = coefficient === 1
    ? "x"
    : coefficient === -1
      ? "-x"
      : `${coefficient}x`;
  if (constant === 0) return `(${variable})`;
  return `(${variable} ${constant > 0 ? "+" : "-"} ${Math.abs(constant)})`;
}

function factoredQuadraticItem(difficulty, index, random) {
  const salt = index * 5;
  let firstCoefficient = 1;
  let secondCoefficient = 1;
  let firstConstant;
  let secondConstant;
  let variant;
  let hint;
  let diagnosticTag;

  if (difficulty === "foundational") {
    firstConstant = pickNonZero(random, 1, 9, salt);
    secondConstant = pickNonZero(random, 1, 9, salt + 1);
    variant = "monic-positive";
    hint = `Find two integers whose product is ${firstConstant * secondConstant} and whose sum is ${firstConstant + secondConstant}.`;
    diagnosticTag = "factor_pair";
  } else if (difficulty === "grade-level") {
    firstConstant = pickNonZero(random, -9, 9, salt);
    secondConstant = index % 3 === 0
      ? firstConstant
      : pickNonZero(random, -9, 9, salt + 1);
    variant = firstConstant === secondConstant ? "perfect-square" : "monic-mixed-signs";
    hint = firstConstant === secondConstant
      ? "Check whether the first and last terms are perfect squares and the middle term is twice their product."
      : `Find two integers whose product is ${firstConstant * secondConstant} and whose sum is ${firstConstant + secondConstant}.`;
    diagnosticTag = firstConstant === secondConstant
      ? "perfect_square_pattern"
      : "signed_factor_pair";
  } else {
    firstCoefficient = pickInt(random, 2, 5, salt + 2);
    firstConstant = pickNonZero(random, -8, 8, salt);
    secondConstant = pickNonZero(random, -8, 8, salt + 1);
    variant = "non-monic";
    hint = "Multiply the leading coefficient and constant term, split the middle term using a matching factor pair, then factor by grouping.";
    diagnosticTag = "ac_method";
  }

  const a = firstCoefficient * secondCoefficient;
  const b = firstCoefficient * secondConstant + secondCoefficient * firstConstant;
  const c = firstConstant * secondConstant;
  const firstFactorGcf = greatestCommonDivisor(firstCoefficient, firstConstant);
  const secondFactorGcf = greatestCommonDivisor(secondCoefficient, secondConstant);
  const outsideFactor = firstFactorGcf * secondFactorGcf;
  const firstFactor = formatLinearFactor(
    firstCoefficient / firstFactorGcf,
    firstConstant / firstFactorGcf
  );
  const secondFactor = formatLinearFactor(
    secondCoefficient / secondFactorGcf,
    secondConstant / secondFactorGcf
  );
  const outside = outsideFactor === 1 ? "" : String(outsideFactor);
  const completeFactorization = `${outside}${firstFactor}${secondFactor}`;

  return {
    variant,
    prompt: `Factor completely: ${formatPolynomial(a, b, c)}.`,
    answer_key: completeFactorization,
    answer_type: "factored-quadratic",
    expected: { a, b, c },
    hint,
    alternate_explanation: "Work backward from multiplication: the outer and inner products must combine to the middle term while the constants multiply to the final term.",
    alternate_explanation_steps: [
      `Multiply the proposed factors mentally and compare all three coefficients with ${formatPolynomial(a, b, c)}.`,
      `The first terms must multiply to ${a}x², the constants must multiply to ${c}, and the two cross-products must add to ${b}x.`,
      `Remove any common factor still trapped inside either binomial so the final form is completely factored.`,
      `The complete factorization is ${completeFactorization}.`
    ],
    diagnostic_tag: diagnosticTag,
    solution_steps: [
      {
        equation: `${a} · ${c} = ${a * c}`,
        explanation: a === 1
          ? "Identify the product and sum needed for the two constant terms."
          : "Use the ac method to identify a pair that multiplies to ac and adds to b."
      },
      {
        equation: completeFactorization,
        explanation: "Write the two binomial factors."
      },
      {
        equation: formatPolynomial(a, b, c),
        explanation: "Multiply the factors to verify the original trinomial."
      }
    ]
  };
}

function differenceOfSquaresItem(difficulty, index, random) {
  const salt = index * 4;
  const xCoefficient = difficulty === "foundational"
    ? 1
    : pickInt(random, 2, difficulty === "grade-level" ? 6 : 12, salt);
  const constant = pickInt(
    random,
    difficulty === "challenging" ? 6 : 2,
    difficulty === "challenging" ? 20 : 12,
    salt + 1
  );
  const a = xCoefficient ** 2;
  const c = -(constant ** 2);
  const commonFactor = greatestCommonDivisor(xCoefficient, constant);
  const outsideFactor = commonFactor ** 2;
  const reducedXCoefficient = xCoefficient / commonFactor;
  const reducedConstant = constant / commonFactor;
  const left = formatLinearFactor(reducedXCoefficient, -reducedConstant);
  const right = formatLinearFactor(reducedXCoefficient, reducedConstant);
  const outside = outsideFactor === 1 ? "" : String(outsideFactor);
  const completeFactorization = `${outside}${left}${right}`;

  return {
    variant: xCoefficient === 1 ? "basic-difference-squares" : "scaled-difference-squares",
    prompt: `Factor completely: ${formatPolynomial(a, 0, c)}.`,
    answer_key: completeFactorization,
    answer_type: "factored-quadratic",
    expected: { a, b: 0, c },
    hint: outsideFactor === 1
      ? `Rewrite the expression as (${xCoefficient}x)² − ${constant}², then use a² − b² = (a − b)(a + b).`
      : `First factor out the GCF ${outsideFactor}. Then apply a² − b² = (a − b)(a + b) to the remaining expression.`,
    alternate_explanation: `First remove the greatest common factor, then factor the remaining difference of squares. This prevents stopping at an equivalent expression that is not completely factored.`,
    alternate_explanation_steps: [
      ...(outsideFactor === 1
        ? []
        : [`The greatest common factor of ${a}x² and ${Math.abs(c)} is ${outsideFactor}: ${formatPolynomial(a, 0, c)} = ${outsideFactor}(${formatPolynomial(a / outsideFactor, 0, c / outsideFactor)}).`]),
      `Inside the parentheses, identify (${reducedXCoefficient}x)² − ${reducedConstant}².`,
      `Apply A² − B² = (A − B)(A + B): ${completeFactorization}.`,
      `Check by multiplying: ${left}${right} = ${formatPolynomial(a / outsideFactor, 0, c / outsideFactor)}, then multiply by ${outsideFactor}.`
    ],
    diagnostic_tag: "difference_of_squares_pattern",
    solution_steps: [
      {
        equation: outsideFactor === 1
          ? `(${reducedXCoefficient}x)² − ${reducedConstant}²`
          : `${outsideFactor}((${reducedXCoefficient}x)² − ${reducedConstant}²)`,
        explanation: outsideFactor === 1
          ? "Identify both perfect-square terms."
          : `Factor out the greatest common factor ${outsideFactor}, then identify the two squares.`
      },
      {
        equation: completeFactorization,
        explanation: "Apply a² − b² = (a − b)(a + b)."
      },
      {
        equation: formatPolynomial(a, 0, c),
        explanation: "Multiply the conjugates to verify that the middle terms cancel."
      }
    ]
  };
}

function greatestCommonDivisor(first, second) {
  let a = Math.abs(Number(first));
  let b = Math.abs(Number(second));
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
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
  const generators = {
    "A.5A": equationItem,
    "A.5B": inequalityItem,
    "A.5C": systemItem,
    "A.10E": factoredQuadraticItem,
    "A.10F": differenceOfSquaresItem
  };
  const generator = generators[skill];
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
  const xMatch = normalized.match(/(?:^|,)x=([-+]?\d+(?:\.\d+)?)(?:,|$)/);
  const yMatch = normalized.match(/(?:^|,)y=([-+]?\d+(?:\.\d+)?)(?:,|$)/);

  if (xMatch && yMatch) {
    return { x: Number(xMatch[1]), y: Number(yMatch[1]) };
  }

  const pair = normalized.match(
    /^([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)$/
  );
  return pair ? { x: Number(pair[1]), y: Number(pair[2]) } : null;
}

function parseFactorCoefficient(value) {
  if (value === "" || value === "+") return 1;
  if (value === "-") return -1;
  return Number(value);
}

function parseFactoredQuadratic(value) {
  const normalized = normalizeComparison(value)
    .replace(/[·×*]/g, "")
    .replace(/\^?2/g, "2");
  const match = normalized.match(
    /^([-+]?\d*)\(([-+]?\d*)x([+-]\d+)\)\(([-+]?\d*)x([+-]\d+)\)$/
  );
  if (!match) return null;

  const outsideCoefficient = parseFactorCoefficient(match[1]);
  const firstCoefficient = parseFactorCoefficient(match[2]);
  const firstConstant = Number(match[3]);
  const secondCoefficient = parseFactorCoefficient(match[4]);
  const secondConstant = Number(match[5]);
  if (![outsideCoefficient, firstCoefficient, firstConstant, secondCoefficient, secondConstant].every(Number.isFinite)) {
    return null;
  }

  return {
    a: outsideCoefficient * firstCoefficient * secondCoefficient,
    b: outsideCoefficient * (firstCoefficient * secondConstant + secondCoefficient * firstConstant),
    c: outsideCoefficient * firstConstant * secondConstant,
    completelyFactored:
      greatestCommonDivisor(firstCoefficient, firstConstant) === 1 &&
      greatestCommonDivisor(secondCoefficient, secondConstant) === 1
  };
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

  if (item.answer_type === "factored-quadratic") {
    const parsed = parseFactoredQuadratic(studentAnswer);
    return Boolean(
      parsed &&
      parsed.completelyFactored &&
      parsed.a === item.expected?.a &&
      parsed.b === item.expected?.b &&
      parsed.c === item.expected?.c
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
