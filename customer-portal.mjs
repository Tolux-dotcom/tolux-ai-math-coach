const STATUS_PRIORITY = new Map([
  ["active", 0],
  ["trialing", 1],
  ["past_due", 2],
  ["unpaid", 3],
  ["paused", 4],
  ["incomplete", 5],
  ["canceled", 6],
  ["incomplete_expired", 7]
]);

const LIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete"
]);

export function isSupabaseUserId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function customerId(subscription) {
  if (typeof subscription?.customer === "string") {
    return subscription.customer;
  }

  return typeof subscription?.customer?.id === "string"
    ? subscription.customer.id
    : null;
}

export function selectOwnedPortalCustomer(subscriptions, userId) {
  if (!isSupabaseUserId(userId)) {
    return { customerId: null, reason: "invalid-user-id" };
  }

  const owned = (Array.isArray(subscriptions) ? subscriptions : [])
    .filter(subscription => subscription?.metadata?.tolux_user_id === userId)
    .map(subscription => ({
      customerId: customerId(subscription),
      status: String(subscription?.status || ""),
      created: Number(subscription?.created || 0)
    }))
    .filter(subscription => subscription.customerId);

  if (!owned.length) {
    return { customerId: null, reason: "not-found" };
  }

  const liveCustomerIds = new Set(
    owned
      .filter(subscription => LIVE_STATUSES.has(subscription.status))
      .map(subscription => subscription.customerId)
  );

  if (liveCustomerIds.size > 1) {
    return { customerId: null, reason: "ambiguous-live-customers" };
  }

  if (liveCustomerIds.size === 1) {
    return { customerId: [...liveCustomerIds][0], reason: "found" };
  }

  owned.sort((left, right) => {
    const leftPriority = STATUS_PRIORITY.get(left.status) ?? 99;
    const rightPriority = STATUS_PRIORITY.get(right.status) ?? 99;
    return leftPriority - rightPriority || right.created - left.created;
  });

  return { customerId: owned[0].customerId, reason: "found" };
}

export async function findOwnedPortalCustomer(stripeClient, userId) {
  if (!stripeClient || !isSupabaseUserId(userId)) {
    return { customerId: null, reason: "invalid-user-id" };
  }

  const result = await stripeClient.subscriptions.search({
    query: `metadata['tolux_user_id']:'${userId}'`,
    limit: 100
  });

  return selectOwnedPortalCustomer(result?.data, userId);
}

export function isStripeBillingPortalUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.origin === "https://billing.stripe.com" &&
      url.pathname.startsWith("/p/session/")
    );
  } catch {
    return false;
  }
}

export async function createOwnedCustomerPortalSession({
  stripeClient,
  userId,
  returnUrl
}) {
  const match = await findOwnedPortalCustomer(stripeClient, userId);
  if (!match.customerId) {
    return { ok: false, reason: match.reason, url: null };
  }

  const portalSession = await stripeClient.billingPortal.sessions.create({
    customer: match.customerId,
    return_url: returnUrl
  });

  if (!isStripeBillingPortalUrl(portalSession?.url)) {
    return { ok: false, reason: "invalid-portal-url", url: null };
  }

  return { ok: true, reason: "created", url: portalSession.url };
}
