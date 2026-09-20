import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveFullSimulationAccess } from "../test-prep-access.mjs";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const fullRunnerSource = fs.readFileSync(
  new URL("../public/test-prep-full.js", import.meta.url),
  "utf8"
);

test("Full Simulation access fails closed for signed-out and unverifiable accounts", () => {
  assert.deepEqual(resolveFullSimulationAccess(), {
    status: 401,
    body: {
      allowed: false,
      error: "Please sign in to verify Full Simulation access."
    }
  });

  assert.deepEqual(resolveFullSimulationAccess({ authenticated: true }), {
    status: 503,
    body: {
      allowed: false,
      error: "Full Simulation access cannot be verified right now."
    }
  });
});

test("a free account cannot start the subscriber-only Full Simulation", () => {
  assert.deepEqual(
    resolveFullSimulationAccess({
      authenticated: true,
      entitlementAvailable: true,
      isSubscriber: false
    }),
    {
      status: 403,
      body: {
        allowed: false,
        upgradeRequired: true,
        error: "An active Tolux subscription is required for the Full Simulation."
      }
    }
  );
});

test("only a verified subscriber receives Full Simulation access", () => {
  assert.deepEqual(
    resolveFullSimulationAccess({
      authenticated: true,
      entitlementAvailable: true,
      isSubscriber: true
    }),
    {
      status: 200,
      body: {
        allowed: true,
        isSubscriber: true
      }
    }
  );
});

test("server verifies the browser token and database entitlement", () => {
  const routeStart = serverSource.indexOf(
    'if (req.method === "GET" && req.url === "/api/test-prep/full-access")'
  );
  const routeEnd = serverSource.indexOf(
    'if (req.method === "POST" && req.url === "/api/stripe-webhook")',
    routeStart
  );
  const routeSource = serverSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0, "subscriber access route must exist");
  assert.match(routeSource, /getAuthenticatedUser\(req\)/);
  assert.match(routeSource, /supabaseServerMatchesAuthProject\(\)/);
  assert.match(routeSource, /getStudentUsage\(user\.id\)/);
  assert.match(routeSource, /isSubscriber:\s*Boolean\(usage\?\.is_subscriber\)/);
  assert.doesNotMatch(routeSource, /user_metadata|localStorage/);
});

test("Full Simulation starts only after the server confirms subscription access", () => {
  assert.match(fullRunnerSource, /fetch\('\/api\/test-prep\/full-access'/);
  assert.match(fullRunnerSource, /Authorization:\s*`Bearer \$\{activeSession\.access_token\}`/);
  assert.match(fullRunnerSource, /response\.status === 401/);
  assert.match(fullRunnerSource, /client\.auth\.refreshSession\(\)/);
  assert.match(
    fullRunnerSource,
    /access\.data\?\.allowed === true && access\.data\?\.isSubscriber === true/
  );
  assert.match(fullRunnerSource, /href="\/#pricingSection"/);
  assert.doesNotMatch(fullRunnerSource, /Free account required for the Full Simulation/);
});
