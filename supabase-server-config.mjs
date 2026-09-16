function normalizeSupabaseProjectUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hasUnexpectedComponents =
      url.protocol !== "https:" ||
      Boolean(url.username) ||
      Boolean(url.password) ||
      (url.pathname !== "/" && url.pathname !== "") ||
      Boolean(url.search) ||
      Boolean(url.hash);

    return hasUnexpectedComponents ? null : url.origin;
  } catch {
    return null;
  }
}

export function resolveSupabaseServerConfig({
  authUrl,
  configuredUrl,
  hasServerKey
}) {
  const authProjectUrl = normalizeSupabaseProjectUrl(authUrl);
  const serverProjectUrl = normalizeSupabaseProjectUrl(
    configuredUrl || authUrl
  );

  let reason = "ready";

  if (!hasServerKey) {
    reason = "missing-server-key";
  } else if (!serverProjectUrl) {
    reason = "invalid-server-url";
  } else if (!authProjectUrl || serverProjectUrl !== authProjectUrl) {
    reason = "project-mismatch";
  }

  return {
    authProjectUrl,
    serverProjectUrl,
    ready: reason === "ready",
    reason,
    clientUrl: reason === "ready" ? serverProjectUrl : null
  };
}
