export function resolveFullSimulationAccess({
  authenticated = false,
  entitlementAvailable = false,
  isSubscriber = false
} = {}) {
  if (!authenticated) {
    return {
      status: 401,
      body: {
        allowed: false,
        error: "Please sign in to verify Full Simulation access."
      }
    };
  }

  if (!entitlementAvailable) {
    return {
      status: 503,
      body: {
        allowed: false,
        error: "Full Simulation access cannot be verified right now."
      }
    };
  }

  if (!isSubscriber) {
    return {
      status: 403,
      body: {
        allowed: false,
        upgradeRequired: true,
        error: "An active Tolux subscription is required for the Full Simulation."
      }
    };
  }

  return {
    status: 200,
    body: {
      allowed: true,
      isSubscriber: true
    }
  };
}
