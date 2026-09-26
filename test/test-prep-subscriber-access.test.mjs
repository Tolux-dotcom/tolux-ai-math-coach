import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { resolveFullSimulationAccess } from "../test-prep-access.mjs";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const fullRunnerSource = fs.readFileSync(
  new URL("../public/test-prep-full.js", import.meta.url),
  "utf8"
);
const accessClientSource = fs.readFileSync(
  new URL("../public/subscriber-access-client.js", import.meta.url),
  "utf8"
);
const testPrepHtml = fs.readFileSync(
  new URL("../public/test-prep.html", import.meta.url),
  "utf8"
);

function buildAccessClient({ session = null, refreshedSession = null, responses = [] } = {}) {
  const requests = [];
  let refreshCount = 0;
  const client = {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      async refreshSession() {
        refreshCount += 1;
        return { data: { session: refreshedSession }, error: null };
      }
    }
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  };
  const context = { window: { fetch: fetchImpl }, Object };
  vm.createContext(context);
  vm.runInContext(accessClientSource, context);

  return {
    async verify(options) {
      const result = await context.window.toluxTestPrepAccess.verifyFullSimulationAccess({
        client,
        fetchImpl,
        ...options
      });
      return JSON.parse(JSON.stringify(result));
    },
    requests,
    get refreshCount() {
      return refreshCount;
    }
  };
}

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

test("browser access client rejects signed-out sessions without calling the API", async () => {
  const fixture = buildAccessClient();
  const result = await fixture.verify();

  assert.deepEqual(result, { status: 401, data: { allowed: false } });
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.refreshCount, 0);
});

test("browser access client sends the bearer token and preserves server denial", async () => {
  const fixture = buildAccessClient({
    session: { access_token: "free-token" },
    responses: [{
      status: 403,
      async json() {
        return { allowed: false, upgradeRequired: true };
      }
    }]
  });
  const result = await fixture.verify();

  assert.equal(result.status, 403);
  assert.equal(result.data.upgradeRequired, true);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].url, "/api/test-prep/full-access");
  assert.equal(fixture.requests[0].options.headers.Authorization, "Bearer free-token");
});

test("browser access client refreshes an expired token once before allowing access", async () => {
  const fixture = buildAccessClient({
    session: { access_token: "expired-token" },
    refreshedSession: { access_token: "fresh-token" },
    responses: [
      { status: 401, async json() { return { allowed: false }; } },
      { status: 200, async json() { return { allowed: true, isSubscriber: true }; } }
    ]
  });
  const result = await fixture.verify();

  assert.deepEqual(result, {
    status: 200,
    data: { allowed: true, isSubscriber: true }
  });
  assert.equal(fixture.refreshCount, 1);
  assert.deepEqual(
    fixture.requests.map(request => request.options.headers.Authorization),
    ["Bearer expired-token", "Bearer fresh-token"]
  );
});

test("browser access client remains denied when refresh cannot recover a session", async () => {
  const fixture = buildAccessClient({
    session: { access_token: "expired-token" },
    responses: [{ status: 401, async json() { return { allowed: false }; } }]
  });
  const result = await fixture.verify();

  assert.deepEqual(result, { status: 401, data: { allowed: false } });
  assert.equal(fixture.refreshCount, 1);
  assert.equal(fixture.requests.length, 1);
});

test("browser access client fails closed on a malformed success response", async () => {
  const fixture = buildAccessClient({
    session: { access_token: "subscriber-token" },
    responses: [{
      status: 200,
      async json() {
        throw new SyntaxError("invalid JSON");
      }
    }]
  });

  assert.deepEqual(await fixture.verify(), {
    status: 503,
    data: { allowed: false }
  });
});

test("browser access client fails closed when entitlement verification is offline", async () => {
  const fixture = buildAccessClient({
    session: { access_token: "subscriber-token" },
    responses: [new Error("network unavailable")]
  });

  assert.deepEqual(await fixture.verify(), {
    status: 503,
    data: { allowed: false }
  });
  assert.equal(fixture.requests.length, 1);
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
  assert.match(serverSource, /resolveSupabaseServerConfig\(/);
  assert.match(serverSource, /supabaseServerConfig\.ready/);
  assert.match(routeSource, /if \(!supabaseAdmin\)/);
  assert.match(routeSource, /getStudentUsage\(user\.id\)/);
  assert.match(routeSource, /isSubscriber:\s*Boolean\(usage\?\.is_subscriber\)/);
  assert.doesNotMatch(routeSource, /user_metadata|localStorage/);
});

test("Full Simulation starts only after the server confirms subscription access", () => {
  const helperIndex = testPrepHtml.indexOf('/subscriber-access-client.js');
  const runnerIndex = testPrepHtml.indexOf('/test-prep-full.js');
  assert.ok(helperIndex >= 0, "access client must be loaded");
  assert.ok(runnerIndex > helperIndex, "access client must load before the Full runner");
  assert.match(fullRunnerSource, /window\.toluxTestPrepAccess\?\.verifyFullSimulationAccess/);
  assert.match(
    fullRunnerSource,
    /access\.data\?\.allowed === true && access\.data\?\.isSubscriber === true/
  );
  assert.match(fullRunnerSource, /href="\/#pricingSection"/);
  assert.doesNotMatch(fullRunnerSource, /Free account required for the Full Simulation/);
});
