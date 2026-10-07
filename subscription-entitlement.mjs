const CHECKOUT_ENTITLEMENT_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded"
]);

export function isCheckoutEntitlementEventType(eventType) {
  return CHECKOUT_ENTITLEMENT_EVENT_TYPES.has(eventType);
}

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

function stripeId(value) {
  if (typeof value === "string") return value.trim();
  return typeof value?.id === "string" ? value.id.trim() : "";
}

export function resolveStripeBillingOwnership(source) {
  const stripeCustomerId = stripeId(source?.customer);
  const stripeSubscriptionId = stripeId(
    source?.subscription || (source?.object === "subscription" ? source : null)
  );

  if (
    !/^cus_[A-Za-z0-9]+$/.test(stripeCustomerId) ||
    !/^sub_[A-Za-z0-9]+$/.test(stripeSubscriptionId)
  ) {
    return null;
  }

  return { stripeCustomerId, stripeSubscriptionId };
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

  const activated = await activateSubscription(
    userId,
    resolveStripeBillingOwnership(session)
  );

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
    entitlement.isSubscriber,
    resolveStripeBillingOwnership(subscription)
  );

  return {
    ...entitlement,
    handled: true,
    updated: updated === true
  };
}
