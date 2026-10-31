const LESSON_PROGRESS_PREFIX = "toluxLessonProgress:";
const PENDING_PROGRESS_PREFIX = "toluxPendingLessonProgress:";

function fallbackUuid(cryptoProvider, random = Math.random) {
  const bytes = new Uint8Array(16);
  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join("")
  ].join("-");
}

export function createPracticeCompletionId(
  cryptoProvider = globalThis.crypto,
  random = Math.random
) {
  return cryptoProvider?.randomUUID?.() || fallbackUuid(cryptoProvider, random);
}

async function responseData(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function sessionOwner(session) {
  return String(session?.user?.id || "").trim();
}

export async function persistPracticeCompletion({
  report,
  getSession,
  refreshSession,
  fetchImpl = globalThis.fetch,
  storage
}) {
  const ownerId = String(report?.owner_user_id || "").trim();
  const moduleKey = `${LESSON_PROGRESS_PREFIX}${report?.module_id || ""}`;
  const pendingKey = `${PENDING_PROGRESS_PREFIX}${report?.completion_id || ""}`;
  let pendingSaved = false;
  let deviceStorage;

  try {
    // Privacy settings may throw when reading localStorage itself. Do not let
    // that prevent an authenticated save, or claim a queue that was not written.
    deviceStorage = storage === undefined ? globalThis.localStorage : storage;
    if (typeof deviceStorage?.setItem !== "function") {
      throw new Error("Device storage is unavailable.");
    }
    deviceStorage.setItem(moduleKey, JSON.stringify(report));
    deviceStorage.setItem(pendingKey, JSON.stringify(report));
    pendingSaved = true;
  } catch (error) {
    console.warn("Practice progress could not be saved on this device:", error);
  }

  const ownedSession = async reader => {
    const session = await reader?.();
    return session?.access_token && ownerId && sessionOwner(session) === ownerId
      ? session
      : null;
  };
  const send = session => fetchImpl("/api/lesson-progress", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(report)
  });

  try {
    let session = await ownedSession(getSession);
    if (!session) {
      return { synced: false, pendingSaved, reason: "original-account-required" };
    }

    let response = await send(session);
    if (!(await ownedSession(getSession))) {
      return { synced: false, pendingSaved, reason: "account-changed" };
    }

    if (response.status === 401 && refreshSession) {
      session = await ownedSession(refreshSession);
      if (!session) {
        return { synced: false, pendingSaved, reason: "account-changed" };
      }
      response = await send(session);
      if (!(await ownedSession(getSession))) {
        return { synced: false, pendingSaved, reason: "account-changed" };
      }
    }

    const data = await responseData(response);
    if (
      !response.ok ||
      !data.activity ||
      !(await ownedSession(getSession))
    ) {
      return {
        synced: false,
        pendingSaved,
        reason: data.error || `Progress save failed with status ${response.status}.`
      };
    }

    try {
      deviceStorage?.setItem(
        moduleKey,
        JSON.stringify({ ...data.activity, owner_user_id: ownerId })
      );
      deviceStorage?.removeItem(pendingKey);
    } catch (error) {
      console.warn("Synced practice progress could not be reconciled locally:", error);
    }

    return { synced: true, pendingSaved: false, activity: data.activity };
  } catch (error) {
    console.warn("Practice progress will be retried from the dashboard:", error);
    return {
      synced: false,
      pendingSaved,
      reason: error?.message || "Progress sync failed."
    };
  }
}
