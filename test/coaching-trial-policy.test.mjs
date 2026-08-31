import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

test("dashboard coaching uses the timed trial instead of legacy question usage", () => {
  const coachRoute = serverSource.slice(
    serverSource.indexOf('req.url === "/api/coach"'),
    serverSource.indexOf('req.url === "/api/lesson-usage"')
  );

  assert.match(coachRoute, /getStudentTrialAccess\(user\.id\)/);
  assert.match(coachRoute, /trialStatus\.trialExpired/);
  assert.doesNotMatch(coachRoute, /questions_used\s*>=\s*FREE_QUESTION_LIMIT/);
  assert.doesNotMatch(coachRoute, /incrementStudentUsage/);
});

test("dashboard starts the shared trial heartbeat and uses timed-trial copy", () => {
  assert.match(appSource, /fetch\("\/api\/trial-heartbeat"/);
  assert.match(appSource, /startCoachTrialHeartbeat\(\)/);
  assert.doesNotMatch(appSource, /10 free coaching questions/i);
  assert.doesNotMatch(appSource, /10 free questions/i);
});

test("only an allowlisted preview QA account can auto-reset a completed trial", () => {
  assert.match(serverSource, /async function resetQaTrialSeconds\(userId\)/);
  assert.match(
    serverSource,
    /process\.env\.VERCEL_ENV !== "preview"[\s\S]*?!internalQa\.isAuthorized\(userId\)/
  );
  assert.match(serverSource, /QA cycle complete\. Refresh to begin a fresh 10-minute test window\./);
  assert.match(serverSource, /qaAutoReset: Boolean\(qaAutoReset\)/);
});
