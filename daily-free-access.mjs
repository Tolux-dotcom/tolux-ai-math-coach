import { createHmac, timingSafeEqual } from "node:crypto";

export const DAILY_FREE_COOKIE = "__Host-tolux_daily_free";

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

function encode(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, signature, ...extra] = token.split(".");
  if (!body || !signature || extra.length) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!secureCompare(signature, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function utcDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(ms) {
  const now = new Date(ms);
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(60, Math.ceil((next - ms) / 1000));
}

export function createDailyFreeAccessController(
  environment = process.env,
  { now = () => Date.now() } = {}
) {
  const enabled = environment.DAILY_FREE_ALLOWANCE_ENABLED === "true";
  const secret = String(environment.DAILY_FREE_COOKIE_SECRET || "");
  const parsedLimit = Number(environment.DAILY_FREE_AI_COACH_LIMIT || 5);
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 20)
    : 5;
  const configured = enabled && secret.length >= 32;

  function read(cookieHeader, userId) {
    if (!configured || !userId) return null;
    const token = parseCookies(cookieHeader)[DAILY_FREE_COOKIE];
    const state = decode(token, secret);
    const day = utcDayKey(now());

    if (
      state?.version !== 1 ||
      state.userId !== userId ||
      !Number.isInteger(state.used) ||
      state.used < 0 ||
      state.day !== day
    ) {
      return { version: 1, userId, used: 0, day };
    }

    return state;
  }

  function status(state) {
    const used = Math.max(0, Number(state?.used) || 0);
    return {
      enabled: configured,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      exhausted: used >= limit
    };
  }

  function cookieFor(state) {
    const maxAge = secondsUntilNextUtcDay(now());
    return [
      `${DAILY_FREE_COOKIE}=${encode(state, secret)}`,
      "Path=/",
      `Max-Age=${maxAge}`,
      "HttpOnly",
      "Secure",
      "SameSite=Strict"
    ].join("; ");
  }

  function advance(state) {
    if (!configured || !state?.userId) return null;
    const next = {
      version: 1,
      userId: state.userId,
      day: utcDayKey(now()),
      used: Math.min(limit, Math.max(0, Number(state.used) || 0) + 1)
    };
    return { state: next, cookie: cookieFor(next), status: status(next) };
  }

  return { configured, limit, read, status, advance };
}
