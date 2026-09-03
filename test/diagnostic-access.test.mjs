import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getFreeDiagnosticAccess } from "../diagnostic-access.mjs";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

test("only the authored readiness diagnostic items receive free access", () => {
  for (const itemId of ["A5A-D01", "A5A-D02"]) {
    assert.deepEqual(getFreeDiagnosticAccess(itemId), {
      allowed: true,
      isSubscriber: false,
      qaMode: false,
      isFreeDiagnostic: true
    });
  }

  for (const itemId of ["A5A-G01", "A8A-D01", "", null, undefined]) {
    assert.equal(getFreeDiagnosticAccess(itemId), null);
  }
});

test("free diagnostic access does not expose or depend on trial state", () => {
  const access = getFreeDiagnosticAccess("A5A-D01");

  assert.equal(Object.hasOwn(access, "trialSecondsUsed"), false);
  assert.equal(Object.hasOwn(access, "trialSecondsRemaining"), false);
  assert.equal(Object.hasOwn(access, "trialSecondsLimit"), false);
});

test("lesson usage grants free diagnostic access before authentication or database reads", () => {
  const routeStart = serverSource.indexOf(
    'if (req.method === "POST" && req.url === "/api/lesson-usage")'
  );
  const routeEnd = serverSource.indexOf(
    'req.url === "/api/lesson-trial-heartbeat"',
    routeStart
  );
  const routeSource = serverSource.slice(routeStart, routeEnd);

  const accessIndex = routeSource.indexOf("getFreeDiagnosticAccess(body?.itemId)");
  const authIndex = routeSource.indexOf("getAuthenticatedUser(req)");
  const usageIndex = routeSource.indexOf("getStudentUsage(user.id)");

  assert.ok(accessIndex >= 0, "diagnostic access check must exist");
  assert.ok(authIndex > accessIndex, "diagnostic access must not depend on authentication");
  assert.ok(usageIndex > accessIndex, "diagnostic access must not depend on usage storage");
});
