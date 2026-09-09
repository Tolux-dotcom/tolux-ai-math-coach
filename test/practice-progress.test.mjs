import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPracticeCompletionId,
  persistPracticeCompletion
} from "../public/practice-progress.mjs";

const report = {
  completion_id: "97f36c84-0df0-4a41-8b42-f7dd26c7282b",
  module_id: "practice-alg1-a2c-equations-from-representations",
  completed_at: "2026-09-09T12:00:00.000Z",
  mastery_label: "Mastered",
  mastery_score: 100,
  is_subscriber: true,
  time_on_skill_seconds: 300,
  item_records: []
};

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

test("completion IDs remain valid UUIDs when randomUUID is unavailable", () => {
  const id = createPracticeCompletionId(null, () => 0.5);
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
});

test("successful practice sync clears the pending retry and stores server data", async () => {
  const storage = createStorage();
  const activity = { ...report, mastery_score: 95 };
  const result = await persistPracticeCompletion({
    report,
    storage,
    getSession: async () => ({ access_token: "current-token" }),
    fetchImpl: async () => response(200, { activity })
  });

  assert.equal(result.synced, true);
  assert.equal(
    storage.getItem(`toluxPendingLessonProgress:${report.completion_id}`),
    null
  );
  assert.deepEqual(
    JSON.parse(storage.getItem(`toluxLessonProgress:${report.module_id}`)),
    activity
  );
});

test("failed and signed-out practice saves remain queued for dashboard replay", async () => {
  for (const scenario of [
    {
      getSession: async () => null,
      fetchImpl: async () => assert.fail("signed-out save must not call fetch")
    },
    {
      getSession: async () => ({ access_token: "current-token" }),
      fetchImpl: async () => response(503, { error: "temporarily unavailable" })
    },
    {
      getSession: async () => ({ access_token: "current-token" }),
      fetchImpl: async () => { throw new Error("offline"); }
    }
  ]) {
    const storage = createStorage();
    const result = await persistPracticeCompletion({ report, storage, ...scenario });
    assert.equal(result.synced, false);
    assert.deepEqual(
      JSON.parse(storage.getItem(
        `toluxPendingLessonProgress:${report.completion_id}`
      )),
      report
    );
  }
});

test("an expired practice session refreshes once before a successful retry", async () => {
  const storage = createStorage();
  const tokens = [];
  let refreshCount = 0;
  const result = await persistPracticeCompletion({
    report,
    storage,
    getSession: async () => ({ access_token: "expired-token" }),
    refreshSession: async () => {
      refreshCount += 1;
      return { access_token: "fresh-token" };
    },
    fetchImpl: async (_url, options) => {
      tokens.push(options.headers.Authorization);
      return tokens.length === 1
        ? response(401, { error: "expired" })
        : response(200, { activity: report });
    }
  });

  assert.equal(result.synced, true);
  assert.equal(refreshCount, 1);
  assert.deepEqual(tokens, ["Bearer expired-token", "Bearer fresh-token"]);
});

test("every Batch 5–9 Practice runtime uses durable pending progress", async () => {
  for (const batch of [5, 6, 7, 8, 9]) {
    const source = await readFile(
      new URL(`../public/batch${batch}-practice.js`, import.meta.url),
      "utf8"
    );
    assert.match(source, /persistPracticeCompletion/);
    assert.match(source, /createPracticeCompletionId/);
    assert.match(source, /refreshSession:refreshAuth/);
    assert.match(source, /Tolux will retry account sync from the dashboard/);
  }
});
