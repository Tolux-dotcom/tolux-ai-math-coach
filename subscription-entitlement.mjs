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
