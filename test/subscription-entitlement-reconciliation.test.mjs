import test from "node:test";
import assert from "node:assert/strict";
import {
  isPaidSubscriptionCheckoutForUser,
  reconcilePaidCheckoutEntitlement,
  reconcileSubscriptionEntitlement,
  resolveSubscriptionEntitlement
} from "../subscription-entitlement.mjs";

const USER_ID = "cefac2b0-5c7c-46ca-bc63-58900aacb001";

function paidSession(overrides = {}) {
  return {
    id: "cs_test_tolux",
    mode: "subscription",
    status: "complete",
    payment_status: "paid",
    client_reference_id: USER_ID,
    metadata: { tolux_user_id: USER_ID, tolux_plan: "student" },
    subscription: "sub_tolux",
    ...overrides
  };
}

test("recognizes only a paid subscription checkout owned by the authenticated user", () => {
  assert.equal(isPaidSubscriptionCheckoutForUser(paidSession(), USER_ID), true);

  for (const session of [
    paidSession({ mode: "payment" }),
    paidSession({ status: "open" }),
    paidSession({ payment_status: "unpaid" }),
    paidSession({ client_reference_id: "other-user" }),
    paidSession({ metadata: { tolux_user_id: "other-user" } }),
    paidSession({ subscription: null })
  ]) {
    assert.equal(isPaidSubscriptionCheckoutForUser(session, USER_ID), false);
  }
});

test("repairs entitlement after Stripe independently confirms the paid checkout", async () => {
  const activations = [];
  const result = await reconcilePaidCheckoutEntitlement({
    session: paidSession(),
    userId: USER_ID,
    activateSubscription: async userId => {
      activations.push(userId);
      return true;
    }
  });

  assert.deepEqual(result, { verified: true, activated: true });
  assert.deepEqual(activations, [USER_ID]);
});

test("never writes entitlement for an unpaid or mismatched checkout", async () => {
  let activationCount = 0;

  for (const session of [
    paidSession({ payment_status: "unpaid" }),
    paidSession({ metadata: { tolux_user_id: "other-user" } })
  ]) {
    const result = await reconcilePaidCheckoutEntitlement({
      session,
      userId: USER_ID,
      activateSubscription: async () => {
        activationCount += 1;
        return true;
      }
    });

    assert.deepEqual(result, { verified: false, activated: false });
  }

  assert.equal(activationCount, 0);
});

test("reports a verified payment separately from a failed entitlement write", async () => {
  const result = await reconcilePaidCheckoutEntitlement({
    session: paidSession(),
    userId: USER_ID,
    activateSubscription: async () => false
  });

  assert.deepEqual(result, { verified: true, activated: false });
});

test("maps every current Stripe subscription status to Tolux access", () => {
  for (const status of ["active", "trialing", "past_due"]) {
    assert.deepEqual(
      resolveSubscriptionEntitlement({
        status,
        metadata: { tolux_user_id: USER_ID }
      }),
      { userId: USER_ID, status, isSubscriber: true }
    );
  }

  for (const status of [
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
    "unpaid"
  ]) {
    assert.deepEqual(
      resolveSubscriptionEntitlement({
        status,
        metadata: { tolux_user_id: USER_ID }
      }),
      { userId: USER_ID, status, isSubscriber: false }
    );
  }
});

test("keeps access during recovery retries and revokes it after retries end", async () => {
  const updates = [];

  for (const status of ["past_due", "unpaid"]) {
    const result = await reconcileSubscriptionEntitlement({
      subscription: {
        status,
        metadata: { tolux_user_id: USER_ID }
      },
      updateSubscription: async (userId, isSubscriber) => {
        updates.push({ userId, isSubscriber });
        return true;
      }
    });

    assert.equal(result.handled, true);
    assert.equal(result.updated, true);
  }

  assert.deepEqual(updates, [
    { userId: USER_ID, isSubscriber: true },
    { userId: USER_ID, isSubscriber: false }
  ]);
});

test("does not write entitlement for unmapped subscriptions", async () => {
  let updateCount = 0;

  for (const subscription of [
    null,
    { status: "active", metadata: {} },
    { status: "future_status", metadata: { tolux_user_id: USER_ID } }
  ]) {
    const result = await reconcileSubscriptionEntitlement({
      subscription,
      updateSubscription: async () => {
        updateCount += 1;
        return true;
      }
    });

    assert.deepEqual(result, { handled: false, updated: false });
  }

  assert.equal(updateCount, 0);
});

test("reports entitlement persistence failure so Stripe can retry", async () => {
  const result = await reconcileSubscriptionEntitlement({
    subscription: {
      status: "canceled",
      metadata: { tolux_user_id: USER_ID }
    },
    updateSubscription: async () => false
  });

  assert.deepEqual(result, {
    userId: USER_ID,
    status: "canceled",
    isSubscriber: false,
    handled: true,
    updated: false
  });
});
