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
