let lessonModule = null;
let lessonItems = [];
let currentItemIndex = 0;

const lessonTitle = document.querySelector("#lessonTitle");
const lessonTeks = document.querySelector("#lessonTeks");
const lessonStage = document.querySelector("#lessonStage");
const lessonContent = document.querySelector("#lessonContent");
const lessonAnswer = document.querySelector("#lessonAnswer");
const submitLessonAnswer = document.querySelector("#submitLessonAnswer");
const lessonFeedback = document.querySelector("#lessonFeedback");
const nextLessonStep = document.querySelector("#nextLessonStep");
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
  const item = lessonItems[currentItemIndex];

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
  const item = lessonItems[currentItemIndex];

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

loadLesson();
