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

  async function checkAccess({ client, fetchImpl = window.fetch }, signal) {
    let session = await readSession(client);

    if (!session?.access_token || typeof fetchImpl !== 'function') {
      return { status: 401, data: { allowed: false } };
    }

    const request = activeSession => {
      // SDK calls cannot be cancelled; do not send a token after their deadline.
      if (signal.aborted) throw new Error('Access verification timed out');
      return fetchImpl('/api/test-prep/full-access', {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
        signal
      });
    };

    let response;
    try {
      response = await request(session);
    } catch {
      return { status: 503, data: { allowed: false } };
    }

    if (signal.aborted) return { status: 503, data: { allowed: false } };

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

  async function verifyFullSimulationAccess(options = {}) {
    const controller = new AbortController();
    let timer;
    // One deadline includes session lookup, refresh, both requests and body parsing.
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => {
        resolve({ status: 503, data: { allowed: false } });
        controller.abort();
      }, 15000);
    });
    try {
      return await Promise.race([checkAccess(options, controller.signal), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  window.toluxTestPrepAccess = Object.freeze({ verifyFullSimulationAccess });
})();
