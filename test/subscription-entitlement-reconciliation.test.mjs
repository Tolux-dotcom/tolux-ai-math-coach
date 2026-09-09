import test from "node:test";
import assert from "node:assert/strict";
import {
  isPaidSubscriptionCheckoutForUser,
  reconcilePaidCheckoutEntitlement
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
