import test from "node:test";
import assert from "node:assert/strict";

class FakeElement {
  constructor(id, onHtmlChange = null) {
    this.id = id;
    this.style = {};
    this.disabled = false;
    this.hidden = false;
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
    const completeEvent = { preventDefault() {}, ...event };
    for (const handler of this.listeners.get(type) || []) {
      await handler(completeEvent);
    }
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    const ids = [
      "practiceTitle",
      "practiceMeta",
      "practiceProgressLabel",
      "practiceProgressBar",
      "practiceQuestionNumber",
      "practiceDifficulty",
      "practicePrompt",
      "practiceAnswer",
      "checkPracticeAnswer",
      "practiceStuckBtn",
      "practiceExplainBtn",
      "practiceFeedback",
      "nextPracticeQuestion",
      "practiceSkill",
      "practiceSessionDifficulty",
      "practiceSessionCount",
      "practiceLiveScore"
    ];
    for (const id of ids) this.elements.set(id, new FakeElement(id));

    this.elements.set(
      "practiceQuestionView",
      new FakeElement("practiceQuestionView", html => this.readDynamicIds(html))
    );
    this.elements.set(
      "practiceSummary",
      new FakeElement("practiceSummary", html => this.readDynamicIds(html))
    );
  }

  readDynamicIds(html) {
    for (const match of html.matchAll(/id="([^"]+)"/g)) {
      if (!this.elements.has(match[1])) {
        this.elements.set(match[1], new FakeElement(match[1]));
      }
    }
  }

  querySelector(selector) {
    if (!selector.startsWith("#")) return null;
    return this.elements.get(selector.slice(1)) || null;
  }
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(message);
}

test("practice runtime counts each question once and persists a complete review", async () => {
  const document = new FakeDocument();
  const storage = new Map();
  const progressRequests = [];
  let usageCalls = 0;
  const originalRandom = Math.random;
  Math.random = () => 0.42;

  const window = {
    location: {
      search: "?skill=A.5B&difficulty=mixed&count=5"
    },
    crypto: {
      randomUUID() {
        return "123e4567-e89b-42d3-a456-426614174000";
      }
    },
    supabase: {
      createClient() {
        return {
          auth: {
            async getSession() {
              return {
                data: { session: { access_token: "test-session" } }
              };
            },
            async refreshSession() {
              return { data: { session: null } };
            }
          }
        };
      }
    }
  };
  const localStorage = {
    get length() {
      return storage.size;
    },
    key(index) {
      return [...storage.keys()][index] || null;
    },
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
  const fetch = async (url, options = {}) => {
    if (url === "/api/lesson-usage") {
      usageCalls += 1;
      return {
        ok: true,
        async json() {
          return { allowed: true, isSubscriber: false, qaMode: true };
        }
      };
    }

    if (url === "/api/lesson-progress") {
      const report = JSON.parse(options.body);
      progressRequests.push(report);
      return {
        ok: true,
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

  try {
    await import(`../public/practice.js?runtime=${Date.now()}`);
    const get = id => document.querySelector(`#${id}`);
    assert.equal(get("practiceSkill").textContent.startsWith("A.5B"), true);

    for (let index = 0; index < 5; index += 1) {
      await get("practiceStuckBtn").emit("click");
      await get("practiceExplainBtn").emit("click");

      get("practiceAnswer").value = "definitely wrong";
      await get("checkPracticeAnswer").emit("click");
      assert.equal(get("practiceAnswer").disabled, false);

      await get("checkPracticeAnswer").emit("click");
      assert.equal(get("practiceAnswer").disabled, true);
      assert.equal(get("nextPracticeQuestion").hidden, false);
      await get("nextPracticeQuestion").emit("click");
    }

    await waitFor(
      () => progressRequests.length === 1,
      "Practice completion was not persisted."
    );

    assert.equal(usageCalls, 5);
    assert.equal(get("practiceSummary").hidden, false);
    assert.match(get("practiceSummary").innerHTML, /Intervention Needed/);
    assert.match(get("practiceSummary").innerHTML, /0%/);
    assert.equal(progressRequests[0].module_id, "practice-alg1-a5b-linear-inequalities");
    assert.equal(progressRequests[0].item_records.length, 5);
    assert.ok(
      progressRequests[0].item_records.every(
        record =>
          record.attempt_count === 2 &&
          record.first_attempt_correct === false &&
          record.hint_count === 1
      )
    );
  } finally {
    Math.random = originalRandom;
  }
});
