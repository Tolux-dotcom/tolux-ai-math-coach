import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createOwnedCustomerPortalSession,
  findOwnedPortalCustomer,
  isStripeBillingPortalUrl,
  isSupabaseUserId,
  selectOwnedPortalCustomer
} from '../customer-portal.mjs';

const USER_ID = '5ec1e1a2-3477-4ca4-9f9c-205b6df278d8';

test('accepts only Supabase-shaped UUID account identifiers', () => {
  assert.equal(isSupabaseUserId(USER_ID), true);
  for (const value of ['', 'student-1', `${USER_ID}' OR status:'active`]) {
    assert.equal(isSupabaseUserId(value), false);
  }
});

test('selects only a subscription explicitly owned by the authenticated Tolux user', () => {
  const selected = selectOwnedPortalCustomer([
    { id: 'sub_other', customer: 'cus_other', status: 'active', created: 20, metadata: { tolux_user_id: '03595ff4-f81c-4d9f-9521-631ddab3d2f8' } },
    { id: 'sub_owned', customer: 'cus_owned', status: 'active', created: 10, metadata: { tolux_user_id: USER_ID } }
  ], USER_ID);
  assert.deepEqual(selected, {
    customerId: 'cus_owned',
    subscriptionId: 'sub_owned',
    reason: 'found'
  });
});

test('fails closed when one account has live subscriptions under multiple Stripe customers', () => {
  const selected = selectOwnedPortalCustomer([
    { id: 'sub_one', customer: 'cus_one', status: 'active', metadata: { tolux_user_id: USER_ID } },
    { id: 'sub_two', customer: 'cus_two', status: 'past_due', metadata: { tolux_user_id: USER_ID } }
  ], USER_ID);
  assert.deepEqual(selected, { customerId: null, reason: 'ambiguous-live-customers' });
});

test('uses the newest live subscription when one Stripe customer has renewed', () => {
  const selected = selectOwnedPortalCustomer([
    { id: 'sub_old', customer: 'cus_owned', status: 'active', created: 10, metadata: { tolux_user_id: USER_ID } },
    { id: 'sub_new', customer: 'cus_owned', status: 'active', created: 20, metadata: { tolux_user_id: USER_ID } }
  ], USER_ID);

  assert.deepEqual(selected, {
    customerId: 'cus_owned',
    subscriptionId: 'sub_new',
    reason: 'found'
  });
});

test('uses the most recent historical billing profile when no live subscription remains', () => {
  const selected = selectOwnedPortalCustomer([
    { id: 'sub_old', customer: 'cus_old', status: 'canceled', created: 10, metadata: { tolux_user_id: USER_ID } },
    { id: 'sub_latest', customer: { id: 'cus_latest' }, status: 'canceled', created: 20, metadata: { tolux_user_id: USER_ID } }
  ], USER_ID);
  assert.deepEqual(selected, {
    customerId: 'cus_latest',
    subscriptionId: 'sub_latest',
    reason: 'found'
  });
});

test('searches Stripe by server-verified Tolux ownership metadata', async () => {
  let searchParams;
  const stripe = {
    subscriptions: {
      async search(params) {
        searchParams = params;
        return { data: [{ id: 'sub_owned', customer: 'cus_owned', status: 'trialing', metadata: { tolux_user_id: USER_ID } }] };
      }
    }
  };
  const selected = await findOwnedPortalCustomer(stripe, USER_ID);
  assert.equal(searchParams.query, `metadata['tolux_user_id']:'${USER_ID}'`);
  assert.equal(searchParams.limit, 100);
  assert.deepEqual(selected, {
    customerId: 'cus_owned',
    subscriptionId: 'sub_owned',
    reason: 'found'
  });
});

test('prefers the stored subscription and verifies it directly with Stripe', async () => {
  let retrievedId;
  let searchCalls = 0;
  const stripe = {
    subscriptions: {
      async retrieve(id) {
        retrievedId = id;
        return {
          id,
          customer: 'cus_owned',
          status: 'active',
          metadata: { tolux_user_id: USER_ID }
        };
      },
      async search() {
        searchCalls += 1;
        return { data: [] };
      }
    }
  };

  const selected = await findOwnedPortalCustomer(stripe, USER_ID, {
    stripeCustomerId: 'cus_owned',
    stripeSubscriptionId: 'sub_owned'
  });

  assert.equal(retrievedId, 'sub_owned');
  assert.equal(searchCalls, 0);
  assert.deepEqual(selected, {
    customerId: 'cus_owned',
    subscriptionId: 'sub_owned',
    reason: 'found'
  });
});

test('fails closed when stored billing ownership disagrees with Stripe', async () => {
  const stripe = {
    subscriptions: {
      async retrieve() {
        return {
          customer: 'cus_other',
          status: 'active',
          metadata: { tolux_user_id: USER_ID }
        };
      }
    }
  };

  const selected = await findOwnedPortalCustomer(stripe, USER_ID, {
    stripeCustomerId: 'cus_owned',
    stripeSubscriptionId: 'sub_owned'
  });

  assert.deepEqual(selected, {
    customerId: null,
    reason: 'billing-ownership-mismatch'
  });
});

test('fails closed when Stripe returns a different stored subscription id', async () => {
  const stripe = {
    subscriptions: {
      async retrieve() {
        return {
          id: 'sub_other',
          customer: 'cus_owned',
          status: 'active',
          metadata: { tolux_user_id: USER_ID }
        };
      }
    }
  };

  const selected = await findOwnedPortalCustomer(stripe, USER_ID, {
    stripeCustomerId: 'cus_owned',
    stripeSubscriptionId: 'sub_owned'
  });

  assert.deepEqual(selected, {
    customerId: null,
    reason: 'billing-ownership-mismatch'
  });
});

test('accepts only Stripe-hosted Customer Portal session URLs', () => {
  assert.equal(isStripeBillingPortalUrl('https://billing.stripe.com/p/session/test_123'), true);
  for (const url of [
    'http://billing.stripe.com/p/session/test_123',
    'https://billing.stripe.com.evil.example/p/session/test_123',
    'https://billing.stripe.com/not-a-session',
    'https://example.com/p/session/test_123'
  ]) assert.equal(isStripeBillingPortalUrl(url), false);
});

test('creates a Customer Portal session for only the owned Stripe customer', async () => {
  let createParams;
  const stripe = {
    subscriptions: {
      async search() {
        return { data: [{ id: 'sub_owned', customer: 'cus_owned', status: 'active', metadata: { tolux_user_id: USER_ID } }] };
      }
    },
    billingPortal: {
      sessions: {
        async create(params) {
          createParams = params;
          return { url: 'https://billing.stripe.com/p/session/test_123' };
        }
      }
    }
  };
  const result = await createOwnedCustomerPortalSession({
    stripeClient: stripe,
    userId: USER_ID,
    returnUrl: 'https://mathcoach.tolux.org/support.html#billing'
  });
  assert.deepEqual(createParams, {
    customer: 'cus_owned',
    return_url: 'https://mathcoach.tolux.org/support.html#billing'
  });
  assert.deepEqual(result, {
    ok: true,
    reason: 'created',
    url: 'https://billing.stripe.com/p/session/test_123',
    billingOwnership: {
      stripeCustomerId: 'cus_owned',
      stripeSubscriptionId: 'sub_owned'
    }
  });
});

test('does not create a portal session for an unowned or ambiguous customer', async () => {
  let createCalls = 0;
  const stripe = {
    subscriptions: {
      async search() {
        return { data: [{ id: 'sub_other', customer: 'cus_other', status: 'active', metadata: { tolux_user_id: '03595ff4-f81c-4d9f-9521-631ddab3d2f8' } }] };
      }
    },
    billingPortal: { sessions: { async create() { createCalls += 1; } } }
  };
  const result = await createOwnedCustomerPortalSession({
    stripeClient: stripe,
    userId: USER_ID,
    returnUrl: 'https://mathcoach.tolux.org/support.html#billing'
  });
  assert.equal(createCalls, 0);
  assert.deepEqual(result, { ok: false, reason: 'not-found', url: null });
});

test('server creates a portal session only after authentication and owned-customer resolution', () => {
  const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  const start = server.indexOf('req.url === "/api/create-customer-portal-session"');
  const end = server.indexOf('req.url.startsWith("/api/verify-session")', start);
  const route = server.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.ok(route.indexOf('getAuthenticatedUser(req)') < route.indexOf('createOwnedCustomerPortalSession'));
  assert.ok(route.indexOf('getStripeBillingOwnership(user.id)') < route.indexOf('createOwnedCustomerPortalSession'));
  assert.match(route, /userId: user\.id/);
  assert.match(route, /billingOwnership/);
  assert.ok(route.indexOf('createOwnedCustomerPortalSession') < route.indexOf('saveStripeBillingOwnership'));
  assert.match(route, /portal\.billingOwnership/);
  assert.match(route, /returnUrl/);
  assert.doesNotMatch(route, /headers\.(origin|host)|body\.(return|redirect|customer)/);
});

test('support page exposes a signed-in Stripe management action and safe fallback', () => {
  const html = fs.readFileSync(new URL('../public/support.html', import.meta.url), 'utf8');
  const script = fs.readFileSync(new URL('../public/support.js', import.meta.url), 'utf8');
  assert.match(html, /id="manageSubscription"/);
  assert.match(html, /info@tolux\.org/);
  assert.match(script, /\/api\/create-customer-portal-session/);
  assert.match(script, /client\.auth\.refreshSession\(\)/);
  assert.match(script, /isStripePortalUrl\(payload\.url\)/);
});
