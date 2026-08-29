import { createHmac, timingSafeEqual } from "node:crypto";

export const INTERNAL_QA_COOKIE = "__Host-tolux_internal_qa";
export const INTERNAL_QA_MAX_AGE_SECONDS = 8 * 60 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAllowedUserIds(value = "") {
  return new Set(
    String(value)
      .split(",")
      .map(userId => userId.trim())
      .filter(userId => UUID_PATTERN.test(userId))
  );
}

function parseCookies(cookieHeader = "") {
  return String(cookieHeader)
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return cookies;
      cookies[part.slice(0, separator)] = part.slice(separator + 1);
      return cookies;
    }, {});
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function encodeSession(session, secret) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function decodeSession(token, secret) {
  if (!token || !token.includes(".")) return null;

  const [payload, suppliedSignature, ...extra] = token.split(".");
  if (!payload || !suppliedSignature || extra.length) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (!secureCompare(suppliedSignature, expectedSignature)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function createInternalQaController(
  environment = process.env,
  { now = () => Date.now() } = {}
) {
  const allowedUserIds = parseAllowedUserIds(
    environment.INTERNAL_QA_USER_IDS
  );
  const secret = String(environment.INTERNAL_QA_COOKIE_SECRET || "");
  const configured =
    environment.VERCEL_ENV === "preview" &&
    environment.INTERNAL_QA_ENABLED === "true" &&
    allowedUserIds.size > 0 &&
    secret.length >= 32;

  function isAuthorized(userId) {
    return configured && allowedUserIds.has(String(userId || ""));
  }

  function createSession(userId, questionsUsed = 0) {
    if (!isAuthorized(userId)) return null;

    return {
      version: 1,
      userId,
      questionsUsed: Math.max(0, Number(questionsUsed) || 0),
      expiresAt: now() + INTERNAL_QA_MAX_AGE_SECONDS * 1000
    };
  }

  function readSession(cookieHeader, userId) {
    if (!isAuthorized(userId)) return null;

    const token = parseCookies(cookieHeader)[INTERNAL_QA_COOKIE];
    const session = decodeSession(token, secret);

    if (
      session?.version !== 1 ||
      session.userId !== userId ||
      !Number.isInteger(session.questionsUsed) ||
      session.questionsUsed < 0 ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= now()
    ) {
      return null;
    }

    return session;
  }

  function cookieFor(session) {
    const token = encodeSession(session, secret);
    return [
      `${INTERNAL_QA_COOKIE}=${token}`,
      "Path=/",
      `Max-Age=${INTERNAL_QA_MAX_AGE_SECONDS}`,
      "HttpOnly",
      "Secure",
      "SameSite=Strict"
    ].join("; ");
  }

  function start(userId) {
    const session = createSession(userId, 0);
    if (!session) return null;
    return { session, cookie: cookieFor(session) };
  }

  function advance(session) {
    const nextSession = createSession(
      session?.userId,
      (session?.questionsUsed || 0) + 1
    );
    if (!nextSession) return null;
    return { session: nextSession, cookie: cookieFor(nextSession) };
  }

  function clearCookie() {
    return [
      `${INTERNAL_QA_COOKIE}=`,
      "Path=/",
      "Max-Age=0",
      "HttpOnly",
      "Secure",
      "SameSite=Strict"
    ].join("; ");
  }

  return {
    configured,
    isAuthorized,
    readSession,
    start,
    advance,
    clearCookie
  };
}
