export async function trackGrowthEvent(eventName, options = {}) {
  const { accessToken = null, plan = null, properties = {} } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    const response = await fetch('/api/growth-event', {
      method: 'POST',
      headers,
      body: JSON.stringify({ eventName, plan, properties }),
      keepalive: true
    });
    return response.ok;
  } catch {
    return false;
  }
}
