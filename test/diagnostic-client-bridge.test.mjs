import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const bridgeSource = fs.readFileSync(
  new URL("../public/diagnostic-free-access.js", import.meta.url),
  "utf8"
);

function buildContext({ textContent = "A5A-D01", session = null } = {}) {
  let visibleText = textContent;
  let nativeSession = session;

  const client = {
    auth: {
      async getSession() {
        return { data: { session: nativeSession }, error: null };
      },
      async refreshSession() {
        return { data: { session: nativeSession }, error: null };
      }
    }
  };

  const context = {
    window: {
      supabase: {
        createClient() {
          return client;
        }
      }
    },
    document: {
      querySelector(selector) {
        if (selector !== "#lessonContent") return null;
        return { textContent: visibleText };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(bridgeSource, context);

  return {
    client: context.window.supabase.createClient("url", "key"),
    setVisibleText(value) {
      visibleText = value;
    },
    setNativeSession(value) {
      nativeSession = value;
    }
  };
}

test("signed-out readiness items receive an anonymous diagnostic bridge session", async () => {
  const fixture = buildContext({ textContent: "Question A5A-D01" });
  const result = await fixture.client.auth.getSession();

  assert.equal(result.error, null);
  assert.equal(result.data.session.access_token, "tolux-free-diagnostic");
  assert.equal(result.data.session.user, null);
});

test("the diagnostic bridge disappears as soon as the lesson leaves the free items", async () => {
  const fixture = buildContext({ textContent: "Question A5A-D02" });
  assert.equal(
    (await fixture.client.auth.getSession()).data.session.access_token,
    "tolux-free-diagnostic"
  );

  fixture.setVisibleText("Guided Practice A5A-G01");
  assert.equal((await fixture.client.auth.getSession()).data.session, null);
});

test("a real signed-in session is never replaced by the diagnostic bridge", async () => {
  const realSession = {
    access_token: "real-user-token",
    user: { id: "student-1" }
  };
  const fixture = buildContext({
    textContent: "Question A5A-D01",
    session: realSession
  });

  assert.deepEqual((await fixture.client.auth.getSession()).data.session, realSession);
});

test("non-diagnostic lessons do not receive anonymous access", async () => {
  const fixture = buildContext({ textContent: "A8A-D01" });
  assert.equal((await fixture.client.auth.getSession()).data.session, null);
  assert.equal((await fixture.client.auth.refreshSession()).data.session, null);
});
