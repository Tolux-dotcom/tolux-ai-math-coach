export function buildSupportEmail({ topic, accountEmail, message }) {
  const subject = `Math Coach support: ${String(topic).slice(0, 100)}`;
  const body = `Request: ${topic}\nAccount email: ${accountEmail || 'Not supplied'}\n\n${message}`;
  return `mailto:info@tolux.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isStripePortalUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://billing.stripe.com' && url.pathname.startsWith('/p/session/');
  } catch {
    return false;
  }
}

async function getSupportSession() {
  const config = window.TOLUX_PUBLIC_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    throw new Error('Sign-in is temporarily unavailable. Please contact info@tolux.org.');
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return { client, session: data?.session || null };
}

async function openCustomerPortal() {
  const button = document.getElementById('manageSubscription');
  const status = document.getElementById('billingStatus');
  button.disabled = true;
  status.textContent = 'Checking your signed-in Tolux account…';

  try {
    const { client, session } = await getSupportSession();
    if (!session) {
      throw new Error('Please return to Math Coach and sign in with the email used to subscribe, then open this page again.');
    }

    let response = await fetch('/api/create-customer-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (response.status === 401) {
      const { data, error } = await client.auth.refreshSession();
      if (error || !data?.session) {
        throw new Error('Your sign-in expired. Please sign in again before managing the subscription.');
      }
      response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
    }

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to open subscription management.');
    if (!isStripePortalUrl(payload.url)) throw new Error('Stripe returned an invalid subscription-management link.');

    status.textContent = 'Opening Stripe’s secure subscription page…';
    window.location.assign(payload.url);
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}

if (typeof document !== 'undefined') {
  document.getElementById('supportForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const url = buildSupportEmail({ topic: data.get('topic'), accountEmail: data.get('accountEmail'), message: data.get('message') });
    document.getElementById('supportStatus').textContent = 'Opening your email app. Send the draft there to contact Tolux. If it does not open, email info@tolux.org directly.';
    window.location.href = url;
  });
  document.getElementById('manageSubscription')?.addEventListener('click', openCustomerPortal);
}
