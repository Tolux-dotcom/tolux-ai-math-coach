(() => {
  async function readSession(client) {
    if (!client?.auth?.getSession) return null;

    try {
      const { data, error } = await client.auth.getSession();
      return error ? null : data?.session || null;
    } catch {
      return null;
    }
  }

  async function refreshSession(client) {
    if (!client?.auth?.refreshSession) return null;

    try {
      const { data, error } = await client.auth.refreshSession();
      return error ? null : data?.session || null;
    } catch {
      return null;
    }
  }

  async function verifyFullSimulationAccess({ client, fetchImpl = window.fetch } = {}) {
    let session = await readSession(client);

    if (!session?.access_token || typeof fetchImpl !== 'function') {
      return { status: 401, data: { allowed: false } };
    }

    const request = activeSession => fetchImpl('/api/test-prep/full-access', {
      headers: { Authorization: `Bearer ${activeSession.access_token}` }
    });

    let response;
    try {
      response = await request(session);
    } catch {
      return { status: 503, data: { allowed: false } };
    }

    if (response.status === 401) {
      session = await refreshSession(client);
      if (!session?.access_token) {
        return { status: 401, data: { allowed: false } };
      }
      try {
        response = await request(session);
      } catch {
        return { status: 503, data: { allowed: false } };
      }
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      return { status: 503, data: { allowed: false } };
    }

    return { status: response.status, data };
  }

  window.toluxTestPrepAccess = Object.freeze({ verifyFullSimulationAccess });
})();
