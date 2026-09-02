import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lessonModule = JSON.parse(
  await readFile(
    new URL("../public/a5a-linear-equations.json", import.meta.url),
    "utf8"
  )
);
const courseCatalog = JSON.parse(
  await readFile(
    new URL("../public/algebra1-course.json", import.meta.url),
    "utf8"
  )
);

class FakeElement {
  constructor(id, onHtmlChange = null) {
    this.id = id;
    this.style = {};
    this.disabled = false;
    this.value = "";
    this.placeholder = "";
    this.attributes = new Map();
    this.listeners = new Map();
    this._innerHTML = "";
    this._textContent = "";
    this.onHtmlChange = onHtmlChange;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this.onHtmlChange) this.onHtmlChange(this._innerHTML);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  focus() {}

  async emit(type, event = {}) {
    const completeEvent = {
      preventDefault() {},
      ...event
    };

    for (const handler of this.listeners.get(type) || []) {
      await handler(completeEvent);
    }
  }
}

class FakeDocument {
  constructor() {
    this.staticElements = new Map();
    this.dynamicElements = new Map();
    const staticIds = [
      "lessonTitle",
      "lessonTeks",
      "lessonStage",
      "lessonAnswerArea",
      "lessonAnswer",
      "submitLessonAnswer",
      "lessonFeedback",
      "nextLessonStep",
      "lessonHelp",
      "lessonStuckBtn",
      "lessonExplainBtn",
      "lessonSimilarBtn",
      "lessonProgressBar",
      "lessonPath",
      "lessonGoal"
    ];

    for (const id of staticIds) {
      this.staticElements.set(id, new FakeElement(id));
    }

    this.staticElements.set(
      "lessonContent",
      new FakeElement("lessonContent", html => this.refreshDynamicElements(html))
    );
  }

  refreshDynamicElements(html) {
    this.dynamicElements.clear();
    for (const match of html.matchAll(/id="([^"]+)"/g)) {
      this.dynamicElements.set(match[1], new FakeElement(match[1]));
    }
  }

  querySelector(selector) {
    if (!selector.startsWith("#")) return null;
    const id = selector.slice(1);
    return this.staticElements.get(id) || this.dynamicElements.get(id) || null;
  }
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(message);
}

async function createHarness(name, {
  maxUsage = Number.POSITIVE_INFINITY,
  rejectFirstToken = false,
  start = "diagnostic"
} = {}) {
  const document = new FakeDocument();
  const storage = new Map();
  let usageCalls = 0;
  let refreshCalls = 0;
  let rejectedToken = false;
  const progressRequests = [];

  const localStorage = {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    }
  };
  const window = {
    location: {
      search: `?module=alg1-a5a-linear-equations&start=${start}`
    },
    supabase: {
      createClient() {
        return {
          auth: {
            async getSession() {
              return {
                data: {
                  session: { access_token: "test-session" }
                }
              };
            },
            async refreshSession() {
              refreshCalls += 1;
              return {
                data: {
                  session: { access_token: "refreshed-test-session" }
                },
                error: null
              };
            }
          }
        };
      }
    }
  };
  const fetch = async (url, options = {}) => {
    if (url === "/algebra1-course.json") {
      return {
        ok: true,
        status: 200,
        async json() {
          return structuredClone(courseCatalog);
        }
      };
    }

    if (url === "/a5a-linear-equations.json") {
      return {
        ok: true,
        status: 200,
        async json() {
          return structuredClone(lessonModule);
        }
      };
    }

    if (url === "/api/lesson-usage") {
      if (
        rejectFirstToken &&
        !rejectedToken &&
        options.headers?.Authorization === "Bearer test-session"
      ) {
        rejectedToken = true;
        return {
          ok: false,
          status: 401,
          async json() {
            return { error: "Please sign in to continue." };
          }
        };
      }

      if (usageCalls >= maxUsage) {
        return {
          ok: false,
          status: 403,
          async json() {
            return {
              error: "You've completed your 10 free learning interactions.",
              limitReached: true
            };
          }
        };
      }

      usageCalls += 1;
      return {
        ok: true,
        status: 200,
        async json() {
          return { allowed: true, isSubscriber: false };
        }
      };
    }

    if (url === "/api/lesson-progress") {
      const report = JSON.parse(options.body);
      progressRequests.push(report);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            activity: {
              ...report,
              client_completion_id: report.completion_id,
              qa_mode: true
            }
          };
        }
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  Object.assign(globalThis, { document, window, localStorage, fetch });
  await import(`../public/lesson.js?runtime-test=${name}-${Date.now()}`);

  const get = id => document.querySelector(`#${id}`);
  const answer = get("lessonAnswer");
  const submit = get("submitLessonAnswer");
  const next = get("nextLessonStep");
  const content = get("lessonContent");
  const stage = get("lessonStage");

  const expectedStage = start === "lesson"
    ? "1. Learn the Concept"
    : "Quick Readiness Check";
  await waitFor(
    () => stage.textContent.includes(expectedStage),
    `${expectedStage} did not load.`
  );

  const submitAndAdvance = async (value, explanation = null) => {
    answer.value = value;
    if (explanation !== null) {
      get("lessonExplanation").value = explanation;
    }
    await submit.emit("click");
    assert.equal(answer.disabled, true);
    await next.emit("click");
  };

  return {
    answer,
    content,
    get,
    next,
    progressRequests,
    stage,
    storage,
    submit,
    submitAndAdvance,
    usageCalls: () => usageCalls,
    refreshCalls: () => refreshCalls
  };
}

async function moveToMastery(harness) {
  const { content, get, stage, submitAndAdvance } = harness;

  await submitAndAdvance("3x + 12");
  assert.match(content.innerHTML, /Simplify 5x \+ 2x - 3/);
  await submitAndAdvance("7x - 3");

  assert.equal(stage.textContent, "2. Learn the Concept");
  assert.match(content.innerHTML, /Keep the equation balanced/);
  await get("continueLessonBtn").emit("click");

  for (let example = 1; example <= 3; example += 1) {
    assert.match(stage.textContent, new RegExp(`${example} of 3`));
    assert.match(content.innerHTML, /solution-steps/);
    await get("workedNextBtn").emit("click");
  }

  assert.match(stage.textContent, /Solve with Tolux/);
  await submitAndAdvance("5");
  await submitAndAdvance("x = 6");

  assert.match(stage.textContent, /Your Turn/);
  assert.match(content.innerHTML, /4\(2x \+ 1\) - 3 = 5x \+ 10/);
  await submitAndAdvance("3");

  assert.match(stage.textContent, /Mastery Check/);
}

test("Tutor Mode begins with teaching instead of the readiness diagnostic", async () => {
  const harness = await createHarness("lesson-first", { start: "lesson" });
  assert.equal(harness.stage.textContent, "1. Learn the Concept");
  assert.match(harness.content.innerHTML, /Learn the ideas before using the steps/);
  assert.match(harness.content.innerHTML, /Keep the equation balanced/);
  assert.doesNotMatch(harness.get("lessonPath").innerHTML, /Quick readiness check/);
  assert.doesNotMatch(harness.stage.textContent, /Readiness/);
});

test("student can complete the entire data-driven A5A lesson", async () => {
  const harness = await createHarness("mastery-pass");
  const {
    content,
    progressRequests,
    stage,
    storage,
    submitAndAdvance,
    usageCalls
  } = harness;

  assert.match(content.innerHTML, /Simplify 3\(x \+ 4\)/);
  await moveToMastery(harness);

  const masteryResponses = [
    ["9", null],
    ["all real numbers", "Both sides are the same, so all x values work."],
    ["2", null],
    ["5", null],
    ["-14", null]
  ];

  for (const [value, explanation] of masteryResponses) {
    assert.match(stage.textContent, /Mastery Check/);
    await submitAndAdvance(value, explanation);
  }

  assert.equal(stage.textContent, "Lesson Complete");
  assert.match(content.innerHTML, /Mastered/);
  assert.match(content.innerHTML, /100%/);
  assert.equal(usageCalls(), 10);

  const saved = JSON.parse(
    storage.get("toluxLessonProgress:alg1-a5a-linear-equations")
  );
  assert.equal(saved.mastery_label, "Mastered");
  assert.equal(saved.mastery_score, 100);

  await waitFor(
    () => progressRequests.length === 1,
    "The lesson completion was not sent to persistent progress storage."
  );
  assert.equal(progressRequests[0].module_id, "alg1-a5a-linear-equations");
  assert.equal(progressRequests[0].item_records.length, 10);
  await waitFor(
    () => harness.get("completionSaveStatus").textContent.includes("Progress saved"),
    "The completion save status did not reach its success state."
  );
  assert.equal(harness.get("returnDashboardBtn").disabled, false);
  assert.match(
    harness.get("completionSaveStatus").textContent,
    /Progress saved/
  );
});

test("help and a similar problem preserve capacity for all ten assessed items", async () => {
  const harness = await createHarness("help-with-free-cap", { maxUsage: 10 });
  const {
    answer,
    content,
    get,
    stage,
    submit,
    submitAndAdvance,
    usageCalls
  } = harness;

  await get("lessonStuckBtn").emit("click");
  assert.equal(usageCalls(), 1);

  await get("lessonExplainBtn").emit("click");
  assert.equal(usageCalls(), 1);

  await get("lessonSimilarBtn").emit("click");
  assert.match(stage.textContent, /Similar Problem/);
  assert.equal(usageCalls(), 1);

  const generatedPrompt = content.innerHTML.match(
    /Simplify (\d+)\((\d+)x ([+-]) (\d+)\)\./
  );
  assert.ok(generatedPrompt, "Expected a generated distribution problem.");

  const [, outsideText, coefficientText, sign, constantText] = generatedPrompt;
  const outside = Number(outsideText);
  const coefficient = Number(coefficientText);
  const signedConstant = sign === "+" ? Number(constantText) : -Number(constantText);
  const answerCoefficient = outside * coefficient;
  const answerConstant = outside * signedConstant;
  answer.value = answerConstant >= 0
    ? `${answerCoefficient}x + ${answerConstant}`
    : `${answerCoefficient}x - ${Math.abs(answerConstant)}`;
  await submit.emit("click");

  assert.match(stage.textContent, /Quick Readiness Check/);
  assert.match(content.innerHTML, /Simplify 3\(x \+ 4\)/);
  assert.equal(usageCalls(), 1);

  await moveToMastery(harness);

  const masteryResponses = [
    ["9", null],
    ["all real numbers", "Both sides are the same, so all x values work."],
    ["2", null],
    ["5", null],
    ["-14", null]
  ];

  for (const [value, explanation] of masteryResponses) {
    await submitAndAdvance(value, explanation);
  }

  assert.equal(stage.textContent, "Lesson Complete");
  assert.match(content.innerHTML, /Mastered/);
  assert.equal(usageCalls(), 10);
});

test("stale lesson token refreshes once and continues without another sign-in", async () => {
  const harness = await createHarness("stale-session-refresh", {
    rejectFirstToken: true
  });

  harness.answer.value = "3x + 12";
  await harness.submit.emit("click");

  assert.equal(harness.refreshCalls(), 1);
  assert.equal(harness.usageCalls(), 1);
  assert.equal(harness.answer.disabled, true);
  assert.match(harness.get("lessonFeedback").innerHTML, /Correct/);
  assert.doesNotMatch(harness.get("lessonFeedback").innerHTML, /sign in/i);
});

test("critical mastery miss routes through remediation and a no-charge retake", async () => {
  const harness = await createHarness("remediation-retake");
  const { content, get, stage, submitAndAdvance, usageCalls } = harness;
  await moveToMastery(harness);

  const firstMasteryAttempt = [
    ["9", null],
    ["all real numbers", "Because the equation says so."],
    ["2", null],
    ["5", null],
    ["-14", null]
  ];

  for (const [value, explanation] of firstMasteryAttempt) {
    await submitAndAdvance(value, explanation);
  }

  assert.match(stage.textContent, /Targeted Remediation/);
  assert.match(content.innerHTML, /Special-case classification gap/);
  await get("startRecheckBtn").emit("click");

  assert.match(stage.textContent, /Remediation Recheck/);
  await submitAndAdvance("all real numbers");
  await submitAndAdvance(
    "Infinitely many solutions",
    "Because the 2 sides of the equation are equal"
  );

  assert.match(stage.textContent, /Recheck Complete/);
  assert.match(content.innerHTML, /Targeted remediation complete/);
  await get("retakeMasteryBtn").emit("click");

  const passingRetake = [
    ["9", null],
    ["all real numbers", "The two sides cancel out, so all real x values work."],
    ["2", null],
    ["5", null],
    ["-14", null]
  ];

  for (const [value, explanation] of passingRetake) {
    await submitAndAdvance(value, explanation);
  }

  assert.equal(stage.textContent, "Lesson Complete");
  assert.match(content.innerHTML, /Mastered/);
  assert.equal(usageCalls(), 10);
});

test("recheck feedback distinguishes a correct answer from an incomplete explanation", async () => {
  const harness = await createHarness("recheck-explanation-feedback");
  const {
    answer,
    get,
    stage,
    submit,
    submitAndAdvance
  } = harness;
  await moveToMastery(harness);

  const firstMasteryAttempt = [
    ["9", null],
    ["all real numbers", "Because the equation says so."],
    ["2", null],
    ["5", null],
    ["-14", null]
  ];

  for (const [value, explanation] of firstMasteryAttempt) {
    await submitAndAdvance(value, explanation);
  }

  assert.match(stage.textContent, /Targeted Remediation/);
  await get("startRecheckBtn").emit("click");
  await submitAndAdvance("all real numbers");

  answer.value = "Infinitely many solutions";
  get("lessonExplanation").value = "Infinitely many solutions";
  await submit.emit("click");

  assert.match(
    get("lessonFeedback").innerHTML,
    /Your solution-set answer is correct/
  );
  assert.match(get("lessonFeedback").innerHTML, /explanation needs one more/);
  assert.doesNotMatch(get("lessonFeedback").innerHTML, /expected result/);
});
