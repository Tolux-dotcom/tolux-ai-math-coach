const SUPABASE_URL = "https://xnadszfvjkyxltskywin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
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
const countedLessonInteractions = new Set();

async function getLessonSession() {
  let {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    const { data: refreshData } =
      await supabaseClient.auth.refreshSession();

    session = refreshData?.session || null;
  }

  return session;
}

function showLessonUpgrade(message) {
  lessonFeedback.innerHTML = `
    <strong>Upgrade to continue</strong>
    <p>${message}</p>
  `;

  const upgradeBtn = document.createElement("button");
  upgradeBtn.type = "button";
  upgradeBtn.textContent = "Go to Dashboard to Upgrade";
  upgradeBtn.className = "upgrade-btn";

  upgradeBtn.addEventListener("click", () => {
    window.location.href = "/";
  });

  lessonFeedback.appendChild(upgradeBtn);

  lessonAnswer.disabled = true;
  submitLessonAnswer.disabled = true;
  lessonStuckBtn.disabled = true;
  lessonExplainBtn.disabled = true;
  lessonSimilarBtn.disabled = true;
}

async function ensureLessonAccess(item) {
  if (!item) return false;

  const interactionKey = item.id || item.prompt;

  // Do not charge twice for the same problem.
  if (countedLessonInteractions.has(interactionKey)) {
    return true;
  }

  try {
    const session = await getLessonSession();

    if (!session) {
      lessonFeedback.innerHTML = `
        <strong>Sign in required</strong>
        <p>Please sign in to continue your Tolux lesson.</p>
      `;
      return false;
    }

    const response = await fetch("/api/lesson-usage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.allowed) {
      countedLessonInteractions.add(interactionKey);
      return true;
    }

    if (data.limitReached) {
      showLessonUpgrade(
        data.error ||
        "You've completed your 10 free learning interactions."
      );
      return false;
    }

    lessonFeedback.innerHTML = `
      <strong>Unable to continue</strong>
      <p>${data.error || "Please try again."}</p>
    `;

    return false;
  } catch (error) {
    console.error(error);

    lessonFeedback.innerHTML = `
      <strong>Connection problem</strong>
      <p>Please try again.</p>
    `;

    return false;
  }
}
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

async function checkCurrentAnswer() {
  const item = activeSimilarItem || lessonItems[currentItemIndex];

  if (!item) return;

  const studentAnswer = normalizeAnswer(lessonAnswer.value);
  const expectedAnswer = normalizeAnswer(item.answer_key);

  if (!studentAnswer) {
    lessonFeedback.textContent =
      "Enter an answer before checking your work.";
    return;
  }
const allowed = await ensureLessonAccess(item);

if (!allowed) {
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
  lessonProgressBar.style.width = "25%";

  lessonContent.innerHTML = `
    <h2>You're ready to learn</h2>
    <p>
      Next, Tolux will teach the core ideas behind solving
      linear equations before moving into worked examples
      and guided practice.
    </p>

    <button id="continueToConceptBtn" type="button">
      Continue to Learn the Concept →
    </button>
  `;

  const continueBtn =
    document.querySelector("#continueToConceptBtn");

  if (continueBtn) {
    continueBtn.addEventListener("click", showLearnConcept);
  }
}

function showLearnConcept() {
  lessonStage.textContent = "2. Learn the Concept";
  lessonProgressBar.style.width = "35%";

  lessonContent.innerHTML = `
    <h2>Learn the Concept: Solving Linear Equations</h2>

    <p>
      An equation is like a balanced scale. Whatever operation
      you perform on one side must also be performed on the other side.
    </p>

    <h3>The Goal</h3>
    <p>
      Isolate the variable so that the equation eventually looks like:
      <strong>x = a number</strong>.
    </p>

    <h3>Core Steps</h3>
    <ol>
      <li>Simplify each side if necessary.</li>
      <li>Use inverse operations to move constants away from the variable.</li>
      <li>Divide or multiply to isolate the variable.</li>
      <li>Check your answer in the original equation.</li>
    </ol>

    <h3>Example</h3>
    <p><strong>3x + 5 = 17</strong></p>
    <p>Subtract 5 from both sides:</p>
    <p><strong>3x = 12</strong></p>
    <p>Divide both sides by 3:</p>
    <p><strong>x = 4</strong></p>

    <p>
      Check: 3(4) + 5 = 17, so the solution is correct.
    </p>

    <button id="continueToExamplesBtn" type="button">
      Continue to Worked Examples →
    </button>
  `;
  const continueExamplesBtn =
  document.querySelector("#continueToExamplesBtn");

if (continueExamplesBtn) {
  continueExamplesBtn.addEventListener("click", showWorkedExamples);
}
}
function showWorkedExamples() {
  lessonStage.textContent = "3. Worked Examples";
  lessonProgressBar.style.width = "50%";

  document.querySelector("#lessonAnswerArea").style.display = "none";
  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";

  lessonContent.innerHTML = `
    <h2>Worked Examples</h2>

    <h3>Example 1: One-Step Equation</h3>
    <p><strong>x + 6 = 14</strong></p>
    <p>Subtract 6 from both sides:</p>
    <p><strong>x = 8</strong></p>

    <h3>Example 2: Two-Step Equation</h3>
    <p><strong>3x + 5 = 20</strong></p>
    <p>Subtract 5 from both sides:</p>
    <p><strong>3x = 15</strong></p>
    <p>Divide both sides by 3:</p>
    <p><strong>x = 5</strong></p>

    <h3>Example 3: Variables on Both Sides</h3>
    <p><strong>5x + 2 = 3x + 10</strong></p>
    <p>Subtract 3x from both sides:</p>
    <p><strong>2x + 2 = 10</strong></p>
    <p>Subtract 2:</p>
    <p><strong>2x = 8</strong></p>
    <p>Divide both sides by 2:</p>
    <p><strong>x = 4</strong></p>

    <button id="continueToGuidedBtn" type="button">
      Continue to Guided Practice →
    </button>
  `;
}
const continueGuidedBtn =
  document.querySelector("#continueToGuidedBtn");

if (continueGuidedBtn) {
  continueGuidedBtn.addEventListener("click", showGuidedPractice);
}

function showGuidedPractice() {
  lessonStage.textContent = "4. Guided Practice";
  lessonProgressBar.style.width = "65%";

  document.querySelector("#lessonAnswerArea").style.display = "none";
  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";

  lessonContent.innerHTML = `
    <h2>Guided Practice</h2>

    <h3>Problem</h3>
    <p><strong>4x + 7 = 23</strong></p>

    <p><strong>Step 1:</strong> What should we remove first?</p>
    <p>Subtract 7 from both sides.</p>

    <p><strong>4x = 16</strong></p>

    <p><strong>Step 2:</strong> How do we isolate x?</p>
    <p>Divide both sides by 4.</p>

    <p><strong>x = 4</strong></p>

    <p>
      Check: 4(4) + 7 = 23, so the solution is correct.
    </p>

    <button id="continueToIndependentBtn" type="button">
      Continue to Independent Practice →
    </button>
  `;
  const continueIndependentBtn =
  document.querySelector("#continueToIndependentBtn");

if (continueIndependentBtn) {
  continueIndependentBtn.addEventListener(
    "click",
    showIndependentPractice
  );
}
  function showIndependentPractice() {
  lessonStage.textContent = "5. Independent Practice";
  lessonProgressBar.style.width = "80%";

  document.querySelector("#lessonAnswerArea").style.display = "none";
  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";

  lessonContent.innerHTML = `
    <h2>Independent Practice</h2>

    <p>
      Now solve this problem on your own.
    </p>

    <h3>Solve:</h3>
    <p><strong>5x - 9 = 21</strong></p>

    <label for="independentAnswer">
      <strong>Your answer</strong>
    </label>

    <input
      id="independentAnswer"
      type="text"
      placeholder="Enter x = ..."
    />

    <button id="checkIndependentBtn" type="button">
      Check Answer
    </button>

    <div id="independentFeedback"></div>
  `;

  const answerInput =
    document.querySelector("#independentAnswer");

  const checkBtn =
    document.querySelector("#checkIndependentBtn");

  const feedback =
    document.querySelector("#independentFeedback");

  checkBtn.addEventListener("click", () => {
    const answer = answerInput.value
      .toLowerCase()
      .replace(/\s+/g, "");

    if (answer === "x=6" || answer === "6") {
      feedback.innerHTML = `
        <p><strong>Correct!</strong></p>
        <p>
          Add 9 to both sides: 5x = 30.
          Then divide by 5: x = 6.
        </p>

        <button id="continueToMasteryBtn" type="button">
          Continue to Mastery Check →
        </button>
      `;
      const continueMasteryBtn =
  document.querySelector("#continueToMasteryBtn");

if (continueMasteryBtn) {
  continueMasteryBtn.addEventListener("click", showMasteryCheck);
}
    } else {
      feedback.innerHTML = `
        <p><strong>Not quite yet.</strong></p>
        <p>
          Start by undoing the -9.
          What operation will cancel -9?
        </p>
      `;
    }
  });
}
}
function showMasteryCheck() {
  lessonStage.textContent = "6. Mastery Check";
  lessonProgressBar.style.width = "95%";

  document.querySelector("#lessonAnswerArea").style.display = "none";
  lessonFeedback.textContent = "";
  nextLessonStep.style.display = "none";

  lessonContent.innerHTML = `
    <h2>Mastery Check</h2>

    <p>Solve all three problems independently.</p>

    <p><strong>1. 2x + 7 = 19</strong></p>
    <input id="mastery1" type="text" placeholder="x = ?" />

    <p><strong>2. 4x - 5 = 23</strong></p>
    <input id="mastery2" type="text" placeholder="x = ?" />

    <p><strong>3. 3x + 4 = x + 16</strong></p>
    <input id="mastery3" type="text" placeholder="x = ?" />

    <br><br>

    <button id="checkMasteryBtn" type="button">
      Check Mastery
    </button>

    <div id="masteryFeedback"></div>
  `;

  const checkMasteryBtn =
    document.querySelector("#checkMasteryBtn");

  checkMasteryBtn.addEventListener("click", () => {
    const clean = value =>
      value.toLowerCase().replace(/\s+/g, "").replace("x=", "");

    const a1 = clean(document.querySelector("#mastery1").value);
    const a2 = clean(document.querySelector("#mastery2").value);
    const a3 = clean(document.querySelector("#mastery3").value);

    const feedback =
      document.querySelector("#masteryFeedback");

    if (a1 === "6" && a2 === "7" && a3 === "6") {
      lessonProgressBar.style.width = "100%";
      lessonStage.textContent = "Lesson Complete";

      feedback.innerHTML = `
        <h3>Mastery achieved! 🎉</h3>
        <p>You completed TEKS A.5A: Solving Linear Equations.</p>
        <p>You are ready to continue to the next Algebra 1 lesson.</p>

        <button id="finishLessonBtn" type="button">
          Return to Dashboard
        </button>
      `;

      document
        .querySelector("#finishLessonBtn")
        .addEventListener("click", () => {
          window.location.href = "/";
        });
    } else {
      feedback.innerHTML = `
        <p><strong>Not mastered yet.</strong></p>
        <p>Review your answers and try again.</p>
      `;
    }
  });
}
submitLessonAnswer.addEventListener(
  "click",
  checkCurrentAnswer
);

lessonAnswer.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    checkCurrentAnswer();
   
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

lessonStuckBtn.addEventListener("click", async () => {
  const item = getCurrentLessonItem();
  if (!item) return;
const allowed = await ensureLessonAccess(item);

if (!allowed) {
  return;
}
  const hint = getProgressiveHint(item, hintLevel);

  lessonFeedback.innerHTML = `
    <strong>Hint ${Math.min(hintLevel + 1, 3)}</strong>
    <p>${hint}</p>
  `;

  hintLevel += 1;
});
 
 lessonExplainBtn.addEventListener("click", async () => {
  const item = getCurrentLessonItem();
  if (!item) return;
const allowed = await ensureLessonAccess(item);

if (!allowed) {
  return;
}
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
lessonSimilarBtn.addEventListener("click", async () => {
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
  const allowed = await ensureLessonAccess(activeSimilarItem);

if (!allowed) {
  activeSimilarItem = null;
  return;
}

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
