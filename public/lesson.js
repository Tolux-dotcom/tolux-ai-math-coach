let lessonModule = null;
let lessonItems = [];
let currentItemIndex = 0;
let hintLevel = 0;
let activeSimilarItem = null;
const lessonTitle = document.querySelector("#lessonTitle");
const lessonTeks = document.querySelector("#lessonTeks");
const lessonStage = document.querySelector("#lessonStage");
const lessonContent = document.querySelector("#lessonContent");
const lessonAnswer = document.querySelector("#lessonAnswer");
const submitLessonAnswer = document.querySelector("#submitLessonAnswer");
const lessonFeedback = document.querySelector("#lessonFeedback");
const nextLessonStep = document.querySelector("#nextLessonStep");
const lessonStuckBtn = document.querySelector("#lessonStuckBtn");
const lessonExplainBtn = document.querySelector("#lessonExplainBtn");
const lessonSimilarBtn = document.querySelector("#lessonSimilarBtn");
const lessonProgressBar = document.querySelector("#lessonProgressBar");

async function loadLesson() {
  try {
    const response = await fetch("/a5a-linear-equations.json");

    if (!response.ok) {
      throw new Error(`Lesson failed to load: ${response.status}`);
    }

    lessonModule = await response.json();

    lessonTitle.textContent = lessonModule.title;
    lessonTeks.textContent =
      `${lessonModule.course} • TEKS ${lessonModule.teks.join(", ")}`;

    lessonItems = lessonModule.items.filter(
      item => item.type === "diagnostic"
    );

    currentItemIndex = 0;

    showCurrentItem();
  } catch (error) {
    lessonContent.innerHTML = `
      <h2>Lesson unavailable</h2>
      <p>Please return to the dashboard and try again.</p>
    `;

    console.error(error);
  }
}

function showCurrentItem() {
  const item = activeSimilarItem || lessonItems[currentItemIndex];
hintLevel = 0;
activeSimilarItem = null;
  if (!item) {
    showReadinessComplete();
    return;
  }

  lessonStage.textContent =
    `Quick Readiness Check ${currentItemIndex + 1} of ${lessonItems.length}`;

  lessonContent.innerHTML = `
    <h2>Quick Readiness Check</h2>
    <p>${item.prompt}</p>
  `;

  lessonAnswer.value = "";
  lessonAnswer.disabled = false;
  submitLessonAnswer.disabled = false;

  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";

  const progress =
    ((currentItemIndex + 1) / lessonItems.length) * 15;

  lessonProgressBar.style.width = `${progress}%`;

  lessonAnswer.focus();
}

function normalizeAnswer(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/−/g, "-");
}

function checkCurrentAnswer() {
  const item = activeSimilarItem || lessonItems[currentItemIndex];

  if (!item) return;

  const studentAnswer = normalizeAnswer(lessonAnswer.value);
  const expectedAnswer = normalizeAnswer(item.answer_key);

  if (!studentAnswer) {
    lessonFeedback.textContent =
      "Enter an answer before checking your work.";
    return;
  }

  const isCorrect =
    studentAnswer === expectedAnswer;

  if (isCorrect) {
  if (activeSimilarItem) {
    lessonFeedback.innerHTML = `
      <strong>Correct.</strong>
      <p>You solved the similar problem successfully.</p>
      <p>Now return to your original lesson problem.</p>
    `;

    activeSimilarItem = null;
    hintLevel = 0;

    const originalItem = lessonItems[currentItemIndex];

    lessonContent.innerHTML = `
      <h2>Quick Readiness Check</h2>
      <p>${originalItem.prompt}</p>
    `;

    lessonAnswer.value = "";
    lessonAnswer.disabled = false;
    submitLessonAnswer.disabled = false;
    nextLessonStep.style.display = "none";
    lessonAnswer.focus();

    return;
  }

  lessonFeedback.innerHTML =
    "<strong>Correct.</strong> Nice work.";

  lessonAnswer.disabled = true;
  submitLessonAnswer.disabled = true;
  nextLessonStep.style.display = "inline-block";
  } else {
    lessonFeedback.innerHTML = `
      <strong>Not quite yet.</strong>
      <p>${item.tutor_behavior}</p>
      <p>Try the problem again.</p>
    `;
  }
}

function showReadinessComplete() {
  lessonStage.textContent = "Readiness Check Complete";

  lessonContent.innerHTML = `
    <h2>You're ready to learn</h2>
    <p>
      Next, Tolux will teach the core ideas behind solving
      linear equations before moving into worked examples
      and guided practice.
    </p>
  `;

  document.querySelector("#lessonAnswerArea").style.display = "none";
  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";
  lessonProgressBar.style.width = "15%";
}

submitLessonAnswer.addEventListener(
  "click",
  checkCurrentAnswer
);

lessonAnswer.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    checkCurrentAnswer();
  }
});

nextLessonStep.addEventListener("click", () => {
  currentItemIndex += 1;
  showCurrentItem();
});
function getCurrentLessonItem() {
  return activeSimilarItem || lessonItems[currentItemIndex];
}

function getProgressiveHint(item, level) {
  const tag = item.diagnostic_tag || "";
const prompt = item.prompt || "";

let distributionHints = [
  "Look at the number outside the parentheses. It must multiply every term inside.",
  "Multiply the outside number by the first term, then multiply it by the second term.",
  "Distribute the outside factor to both terms inside the parentheses."
];

const distributionMatch = prompt.match(
  /(-?\d+)\s*\(\s*(-?\d*)x\s*([+-])\s*(\d+)\s*\)/i
);

if (distributionMatch) {
  const outside = Number(distributionMatch[1]);

  const coefficientText = distributionMatch[2];
  const coefficient =
    coefficientText === "" ? 1 :
    coefficientText === "-" ? -1 :
    Number(coefficientText);

  const sign = distributionMatch[3];
  const constant = Number(distributionMatch[4]);

  const firstTerm =
    coefficient === 1 ? "x" :
    coefficient === -1 ? "-x" :
    `${coefficient}x`;

  const signedConstant =
    sign === "+" ? constant : -constant;

  distributionHints = [
    `Look at ${outside} outside the parentheses. It must multiply every term inside.`,
    `Multiply ${outside} by ${firstTerm}, then multiply ${outside} by ${signedConstant}.`,
    `First calculate ${outside} × ${firstTerm}. Then calculate ${outside} × ${signedConstant}. Combine those two results.`
  ];
}
  const hints = {
   distribution: distributionHints,

    combine_like_terms: [
      "Look for terms that have exactly the same variable part.",
      "Group the x-terms together and keep constants together.",
      "Add or subtract the coefficients of the like terms."
    ],

    inverse_operations: [
      "Identify what operation is being done to the variable.",
      "Undo operations in reverse order while keeping both sides balanced.",
      "Use the same inverse operation on both sides until the variable is isolated."
    ],

    signed_numbers: [
      "Pay close attention to the positive and negative signs.",
      "Work one signed-number operation at a time.",
      "Check the sign of your result before moving to the next algebra step."
    ],

    variables_both_sides: [
      "Try collecting the variable terms on one side first.",
      "Use the same operation on both sides to move one variable term.",
      "Once the variables are together, combine constants and isolate the variable."
    ],

    special_case_identity: [
      "Simplify both sides completely.",
      "Notice what happens if the variable terms cancel.",
      "If both sides become the same true statement, there are infinitely many solutions."
    ],

    special_case_contradiction: [
      "Simplify both sides completely.",
      "Watch what remains if the variable terms cancel.",
      "If you end with a false statement, such as 5 = 9, there is no solution."
    ],

    fraction_equation: [
      "Look for the least common denominator.",
      "Multiply every term by the least common denominator to clear the fractions.",
      "After the fractions disappear, solve the resulting linear equation normally."
    ]
  };

  const skillHints = hints[tag];

  if (skillHints) {
    return skillHints[Math.min(level, skillHints.length - 1)];
  }

  const fallback = [
    "Think about the first mathematical step you can justify.",
    item.tutor_behavior || "Work through the problem one step at a time.",
    "Write only the next valid step instead of trying to jump directly to the answer."
  ];

  return fallback[Math.min(level, fallback.length - 1)];
}

lessonStuckBtn.addEventListener("click", () => {
  const item = getCurrentLessonItem();
  if (!item) return;

  const hint = getProgressiveHint(item, hintLevel);

  lessonFeedback.innerHTML = `
    <strong>Hint ${Math.min(hintLevel + 1, 3)}</strong>
    <p>${hint}</p>
  `;

  hintLevel += 1;
});
 
 lessonExplainBtn.addEventListener("click", () => {
  const item = getCurrentLessonItem();
  if (!item) return;

  const tag = item.diagnostic_tag || "";
const prompt = item.prompt || "";

let distributionExplanation = `
  <strong>Another way: separate the two products.</strong>
  <p>Use the distributive property on the current expression.</p>
`;

const distributionMatch = prompt.match(
  /(-?\d+)\s*\(\s*(-?\d*)x\s*([+-])\s*(\d+)\s*\)/i
);

if (distributionMatch) {
  const outside = Number(distributionMatch[1]);

  const coefficientText = distributionMatch[2];
  const coefficient =
    coefficientText === "" ? 1 :
    coefficientText === "-" ? -1 :
    Number(coefficientText);

  const sign = distributionMatch[3];
  const constant = Number(distributionMatch[4]);

  const signedConstant = sign === "+" ? constant : -constant;

  const xProduct = outside * coefficient;
  const constantProduct = outside * signedConstant;

  const insideX =
    coefficient === 1 ? "x" :
    coefficient === -1 ? "-x" :
    `${coefficient}x`;

  const finalConstant =
    constantProduct >= 0
      ? `+ ${constantProduct}`
      : `- ${Math.abs(constantProduct)}`;

  distributionExplanation = `
    <strong>Another way: separate the two products.</strong>
    <p>${outside}(${insideX} ${sign} ${constant})</p>
    <p>= (${outside} × ${insideX}) + (${outside} × ${signedConstant})</p>
    <p>= ${xProduct}x ${finalConstant}</p>
    <p>So each term inside the parentheses is multiplied by ${outside} separately.</p>
  `;
}
  const explanations = {
    distribution: distributionExplanation,

    combine_like_terms: `
      <strong>Another way: sort terms into families.</strong>
      <p>Terms can only combine when their variable parts match exactly.</p>
      <p>Put matching variable terms together, then combine their coefficients.</p>
    `,

    inverse_operations: `
      <strong>Another way: use the balance-scale idea.</strong>
      <p>An equation says both sides have equal value.</p>
      <p>Whatever operation you perform on one side must also be performed on the other.</p>
      <p>Keep the equation balanced while isolating the variable.</p>
    `,

    variables_both_sides: `
      <strong>Another way: organize first.</strong>
      <p>Collect variable terms on one side and constants on the other.</p>
      <p>Then simplify and isolate the variable.</p>
    `,

    fraction_equation: `
      <strong>Another way: remove the fractions first.</strong>
      <p>Find the least common denominator and multiply every term by it.</p>
      <p>Then solve the equivalent equation with whole-number coefficients.</p>
    `
  };

  lessonFeedback.innerHTML =
    explanations[tag] ||
    `
      <strong>Another way to think about it</strong>
      <p>${item.tutor_behavior}</p>
      <p>Focus on why the next mathematical step is valid.</p>
    `;
});
function generateDistributionSimplifyProblem() {
  const outside = Math.floor(Math.random() * 8) + 2;
  const coefficient = Math.floor(Math.random() * 6) + 1;
  const constant = Math.floor(Math.random() * 9) + 1;
  const sign = Math.random() < 0.5 ? 1 : -1;

  const signedConstant =
    sign === 1 ? `+ ${constant}` : `- ${constant}`;
const insideX =
  coefficient === 1 ? "x" : `${coefficient}x`;
  const answerConstant = outside * constant * sign;
  const answerCoefficient = outside * coefficient;

  return {
    id: `generated-${Date.now()}`,
    type: "generated",
    diagnostic_tag: "distribution",
    difficulty: "introductory",
   prompt: `Simplify ${outside}(${insideX} ${signedConstant}).`,
    answer_key:
      answerConstant >= 0
        ? `${answerCoefficient}x+${answerConstant}`
        : `${answerCoefficient}x${answerConstant}`,
    tutor_behavior:
      "Distribute the outside factor to every term inside the parentheses."
  };
}

function generateCombineLikeTermsProblem() {
    const a = Math.floor(Math.random() * 8) + 2;
  const c = Math.floor(Math.random() * 8) + 2;

  const bValue = Math.floor(Math.random() * 9) + 1;
  const dValue = Math.floor(Math.random() * 9) + 1;

  const bSign = Math.random() < 0.5 ? 1 : -1;
  const dSign = Math.random() < 0.5 ? 1 : -1;

  const b = bValue * bSign;
  const d = dValue * dSign;

  const bText = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const dText = d >= 0 ? `+ ${d}` : `- ${Math.abs(d)}`;

  const answerCoefficient = a + c;
  const answerConstant = b + d;

  const answerKey =
    answerConstant > 0
      ? `${answerCoefficient}x+${answerConstant}`
      : answerConstant < 0
      ? `${answerCoefficient}x${answerConstant}`
      : `${answerCoefficient}x`;

  return {
    id: `generated-combine-${Date.now()}`,
    type: "generated",
    diagnostic_tag: "combine_like_terms",
    difficulty: "introductory",
    prompt: `Simplify ${a}x ${bText} + ${c}x ${dText}.`,
    answer_key: answerKey,
    tutor_behavior:
      "Combine the x-terms together, then combine the constant terms."
  };
}
lessonSimilarBtn.addEventListener("click", () => {
  const currentItem = getCurrentLessonItem();
  if (!currentItem || !lessonModule) return;

 function getTaskType(item) {
  const prompt = (item.prompt || "").toLowerCase();

  if (prompt.startsWith("simplify")) return "simplify";
  if (prompt.startsWith("solve")) return "solve";
  if (prompt.includes("no solution") || prompt.includes("infinitely many")) {
    return "special-case";
  }
  if (prompt.startsWith("write") || prompt.startsWith("create")) {
    return "model";
  }

  return "other";
}

const currentTaskType = getTaskType(currentItem);

let candidates = [];

if (
  currentItem.diagnostic_tag === "distribution" &&
  currentTaskType === "simplify"
) {
  candidates = [generateDistributionSimplifyProblem()];
} else if (
  currentItem.diagnostic_tag === "combine_like_terms" &&
  currentTaskType === "simplify"
) {
  candidates = [generateCombineLikeTermsProblem()];
} else {
  candidates = lessonModule.items.filter(
    item =>
      item.id !== currentItem.id &&
      item.diagnostic_tag === currentItem.diagnostic_tag &&
      getTaskType(item) === currentTaskType &&
      item.difficulty === currentItem.difficulty
  );

  if (!candidates.length) {
    candidates = lessonModule.items.filter(
      item =>
        item.id !== currentItem.id &&
        item.diagnostic_tag === currentItem.diagnostic_tag &&
        getTaskType(item) === currentTaskType
    );
  }
}
   
  if (!candidates.length) {
    lessonFeedback.innerHTML = `
      <strong>Similar Problem</strong>
      <p>Tolux does not yet have another stored problem for this exact skill.</p>
    `;
    return;
  }

  activeSimilarItem =
    candidates[Math.floor(Math.random() * candidates.length)];

  hintLevel = 0;

  lessonContent.innerHTML = `
    <h2>Similar Problem</h2>
    <p>${activeSimilarItem.prompt}</p>
  `;

  lessonAnswer.value = "";
  lessonAnswer.disabled = false;
  submitLessonAnswer.disabled = false;
  nextLessonStep.style.display = "none";

  lessonFeedback.innerHTML = `
    <strong>Practice the same skill.</strong>
    <p>Solve this problem. After you get it correct, Tolux will return you to the original lesson problem.</p>
  `;

  lessonAnswer.focus();
});
loadLesson();
