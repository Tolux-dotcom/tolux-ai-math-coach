import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimes = [
  "a10f-practice.js",
  "a11a-practice.js",
  "a11b-practice.js",
  "a12a-practice.js",
  "a12b-practice.js"
];

for (const file of runtimes) {
  test(`${file} binds durable progress to its original student`, async () => {
    const source = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
    assert.match(source, /import \{ createPracticeCompletionId, persistPracticeCompletion \} from ["']\.\/practice-progress\.mjs["']/);
    assert.match(source, /practiceOwnerId/);
    assert.match(source, /owner_user_id:practiceOwnerId|owner_user_id: practiceOwnerId/);
    assert.match(source, /user\?\.id/);
    assert.match(source, /===practiceOwnerId|=== practiceOwnerId/);
    assert.match(source, /persistPracticeCompletion\(\{/);
    assert.match(source, /refreshSession:refreshAuth|refreshSession: refreshAuth/);
    assert.match(source, /account that started this session/);
    assert.match(source, /pendingSaved/);
    assert.match(source, /Progress could not be saved to your account or this device/);
    assert.match(source, /data-practice-retry-save/);
    assert.match(source, /Retrying progress save/);
    assert.match(source, /retryPracticeSave/);
    assert.doesNotMatch(source, /fetch\(["']\/api\/lesson-progress["']/);
  });
}

test("specialized Practice access checks the active owner before cached-item shortcuts", async () => {
  for (const file of runtimes) {
    const source = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
    const accessStart = source.search(/async function (ensureAccess|access)\(/);
    const saveStart = source.search(/async function (saveCompletion|save)\(/);
    const access = source.slice(accessStart, saveStart);
    const authCheck = access.search(/await (getAuthSession|auth)\(\)/);
    const cachedShortcut = access.search(/counted(?:Interactions)?\.has/);
    assert.ok(authCheck >= 0, `${file} must check the active account`);
    assert.ok(cachedShortcut > authCheck, `${file} must not bypass owner checks for cached questions`);
  }
});

test("specialized Practice retries reuse the exact completion report", async t => {
  for (const file of runtimes) {
    await t.test(file, async () => {
      const source = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
      const functionName = file === "a12b-practice.js" ? "save" : "saveCompletion";
      const start = source.indexOf(`async function ${functionName}(`);
      const end = source.search(/async function (finishSession|finish)\(/);
      assert.notEqual(start, -1);
      assert.ok(end > start);
      const saveSource = source.slice(start, end);
      const reports = [];
      let identifiersCreated = 0;
      const records = new Map([["item-1", { item_id: "item-1", first_attempt_correct: true }]]);
      const persistPracticeCompletion = async ({ report }) => {
        reports.push(report);
        return reports.length === 1
          ? { synced: false, pendingSaved: true }
          : { synced: true, pendingSaved: false };
      };

      let save;
      if (file === "a12b-practice.js") {
        save = new Function(
          "records", "session", "practiceOwnerId", "isSubscriber", "startedAt",
          "createPracticeCompletionId", "persistPracticeCompletion", "auth", "refreshAuth",
          `let completionReport=null;${saveSource};return save;`
        )(
          records, { items: [{}] }, "owner-a", true, Date.now() - 1000,
          () => `completion-${++identifiersCreated}`, persistPracticeCompletion,
          async () => null, async () => null
        );
        await save();
        await save();
      } else {
        save = new Function(
          "records", "practiceOwnerId", "isSubscriber", "startedAt",
          "createPracticeCompletionId", "persistPracticeCompletion",
          "getAuthSession", "refreshAuthSession",
          `let completionReport=null;${saveSource};return saveCompletion;`
        )(
          records, "owner-a", true, Date.now() - 1000,
          () => `completion-${++identifiersCreated}`, persistPracticeCompletion,
          async () => null, async () => null
        );
        const summary = { label: "Mastered", scorePercent: 100 };
        await save(summary);
        await save(summary);
      }

      assert.equal(identifiersCreated, 1);
      assert.equal(reports.length, 2);
      assert.equal(reports[0], reports[1]);
      assert.equal(reports[0].completion_id, "completion-1");
    });
  }
});

test("all remaining Practice retry helpers report queued, unsaved, and confirmed states", async t => {
  for (const file of ["practice.js", ...runtimes]) {
    await t.test(file, async () => {
      const source = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
      const start = source.indexOf("function practiceSaveStatus(");
      const end = source.indexOf("function bindPracticeRetry(", start);
      assert.notEqual(start, -1);
      assert.ok(end > start);
      const retryPracticeSave = new Function(
        `${source.slice(start, end)};return retryPracticeSave;`
      )();
      const status = { textContent: "" };
      const button = { disabled: false, removed: false, remove() { this.removed = true; } };

      await retryPracticeSave(button, status, async () => ({ synced: false, pendingSaved: true }));
      assert.equal(button.disabled, false);
      assert.equal(button.removed, false);
      assert.match(status.textContent, /Saved on this device/);

      await retryPracticeSave(button, status, async () => { const error = new Error("Offline"); error.pendingSaved = false; throw error; });
      assert.equal(button.disabled, false);
      assert.match(status.textContent, /could not be saved to your account or this device/);

      await retryPracticeSave(button, status, async () => ({ synced: true, pendingSaved: false }));
      assert.equal(button.removed, true);
      assert.equal(status.textContent, "Saved to your Tolux progress dashboard.");
    });
  }
});
