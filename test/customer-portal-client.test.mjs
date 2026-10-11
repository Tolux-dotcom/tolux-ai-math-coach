import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/support.js', import.meta.url), 'utf8')
  .replaceAll('export function ', 'function ');
const owner = { access_token: 'original-token', user: { id: 'original-owner' } };
const other = { access_token: 'other-token', user: { id: 'other-owner' } };
const portalUrl = 'https://billing.stripe.com/p/session/test_fixture';

function fixture({ session = owner, refreshedSession = { ...owner, access_token: 'fresh-token' }, responses = [] } = {}) {
  let activeSession = session;
  let refreshCalls = 0;
  const requests = [];
  let requestStarted;
  const firstRequest = new Promise(resolve => { requestStarted = resolve; });
  const redirects = [];
  const button = { disabled: false, addEventListener() {} };
  const status = { textContent: '' };
  const client = { auth: {
    async getSession() { return { data: { session: activeSession }, error: null }; },
    async refreshSession() {
      refreshCalls += 1;
      activeSession = refreshedSession;
      return { data: { session: activeSession }, error: null };
    }
  } };
  const context = vm.createContext({
    URL,
    window: {
      TOLUX_PUBLIC_CONFIG: { url: 'https://test.example', publishableKey: 'fake-key' },
      supabase: { createClient() { return client; } },
      location: { assign(url) { redirects.push(url); } }
    },
    document: { getElementById(id) {
      if (id === 'manageSubscription') return button;
      if (id === 'billingStatus') return status;
      return null;
    } },
    async fetch(url, options) {
      const index = requests.length;
      requests.push({ url, options });
      requestStarted();
      return responses[index] ? await responses[index]() : response();
    }
  });
  vm.runInContext(source, context);
  return {
    open: () => vm.runInContext('openCustomerPortal()', context),
    setSession(value) { activeSession = value; },
    button, status, requests, redirects, firstRequest,
    get refreshCalls() { return refreshCalls; }
  };
}

function response(status = 200, payload = { url: portalUrl }) {
  return { status, ok: status >= 200 && status < 300, async json() { return payload; } };
}

test('same signed-in owner opens only the returned Stripe portal', async () => {
  const f = fixture();
  await f.open();
  assert.equal(f.requests[0].options.headers.Authorization, 'Bearer original-token');
  assert.deepEqual(f.redirects, [portalUrl]);
});

test('signed-out visitor gets guidance without requesting a billing session', async () => {
  const f = fixture({ session: null });
  await f.open();
  assert.equal(f.requests.length, 0);
  assert.equal(f.button.disabled, false);
  assert.match(f.status.textContent, /sign in with the email used to subscribe/);
});

test('expired token refreshes once and retries for the same owner', async () => {
  const f = fixture({ responses: [() => response(401)] });
  await f.open();
  assert.equal(f.refreshCalls, 1);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].options.headers.Authorization, 'Bearer fresh-token');
  assert.deepEqual(f.redirects, [portalUrl]);
});

test('repeated 401 stops after one retry and restores the button', async () => {
  const f = fixture({ responses: [() => response(401), () => response(401, { error: 'Sign in again.' })] });
  await f.open();
  assert.equal(f.refreshCalls, 1);
  assert.equal(f.requests.length, 2);
  assert.deepEqual(f.redirects, []);
  assert.equal(f.button.disabled, false);
});

for (const [label, nextSession] of [['account switch', other], ['sign-out', null]]) {
  test(`${label} while the portal loads blocks the old account redirect`, async () => {
    const f = fixture({ responses: [async () => {
      f.setSession(nextSession);
      return response();
    }] });
    await f.open();
    assert.deepEqual(f.redirects, []);
    assert.equal(f.button.disabled, false);
    assert.match(f.status.textContent, /account changed/);
  });
}

test('account switch before a 401 prevents refresh and retry', async () => {
  const f = fixture({ responses: [async () => {
    f.setSession(other);
    return response(401);
  }] });
  await f.open();
  assert.equal(f.refreshCalls, 0);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.redirects, []);
});

test('refresh to another owner cannot retry or open its portal', async () => {
  const f = fixture({ refreshedSession: other, responses: [() => response(401)] });
  await f.open();
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.redirects, []);
  assert.match(f.status.textContent, /account changed/);
});

test('malformed responses, unavailable billing, and unsafe URLs leave a retryable action', async () => {
  for (const result of [
    { status: 200, ok: true, async json() { throw new Error('Invalid JSON'); } },
    response(503, { error: 'Subscription management is temporarily unavailable.' }),
    response(200, { url: 'https://example.com/p/session/unsafe' })
  ]) {
    const f = fixture({ responses: [() => result] });
    await f.open();
    assert.deepEqual(f.redirects, []);
    assert.equal(f.button.disabled, false);
    assert.ok(f.status.textContent);
  }
});

test('repeated clicks during a pending request cannot create another billing session', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const f = fixture({ responses: [() => pending] });
  const first = f.open();
  await f.firstRequest;
  await f.open();
  assert.equal(f.requests.length, 1);
  finish(response());
  await first;
  assert.deepEqual(f.redirects, [portalUrl]);
});
