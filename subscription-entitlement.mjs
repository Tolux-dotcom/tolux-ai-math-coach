export function isPaidSubscriptionCheckoutForUser(session, userId) {
  if (!session || typeof session !== "object" || !userId) return false;

  return (
    session.mode === "subscription" &&
    session.status === "complete" &&
    session.payment_status === "paid" &&
    session.client_reference_id === userId &&
    session.metadata?.tolux_user_id === userId &&
    typeof session.subscription === "string" &&
    session.subscription.trim().length > 0
  );
}

export async function reconcilePaidCheckoutEntitlement({
  session,
  userId,
  activateSubscription
}) {
  if (!isPaidSubscriptionCheckoutForUser(session, userId)) {
    return { verified: false, activated: false };
  }

  if (typeof activateSubscription !== "function") {
    return { verified: true, activated: false };
  }

  const activated = await activateSubscription(userId);

  return {
    verified: true,
    activated: activated === true
  };
}

const SUBSCRIPTION_STATUSES_WITH_ACCESS = new Set([
  "active",
  "trialing",
  "past_due"
]);

const SUBSCRIPTION_STATUSES_WITHOUT_ACCESS = new Set([
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
  "unpaid"
]);

export function resolveSubscriptionEntitlement(subscription) {
  if (!subscription || typeof subscription !== "object") return null;

  const userId = subscription.metadata?.tolux_user_id?.trim();
  const status = subscription.status?.trim();

  if (!userId || !status) return null;

  if (SUBSCRIPTION_STATUSES_WITH_ACCESS.has(status)) {
    return { userId, status, isSubscriber: true };
  }

  if (SUBSCRIPTION_STATUSES_WITHOUT_ACCESS.has(status)) {
    return { userId, status, isSubscriber: false };
  }

  return null;
}

export async function reconcileSubscriptionEntitlement({
  subscription,
  updateSubscription
}) {
  const entitlement = resolveSubscriptionEntitlement(subscription);

  if (!entitlement) {
    return { handled: false, updated: false };
  }

  if (typeof updateSubscription !== "function") {
    return { ...entitlement, handled: true, updated: false };
  }

  const updated = await updateSubscription(
    entitlement.userId,
    entitlement.isSubscriber
  );

  return {
    ...entitlement,
    handled: true,
    updated: updated === true
  };
}
