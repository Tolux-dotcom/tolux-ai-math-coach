const PRODUCTION_ORIGIN = 'https://mathcoach.tolux.org';

export function resolveCheckoutReturnConfig(env = {}) {
  const preview = env.VERCEL_ENV === 'preview';
  // Preview payment testing must never create live charges or return to production.
  if (preview && !String(env.STRIPE_SECRET_KEY || '').startsWith('sk_test_')) {
    return {ready: false, reason: 'preview-requires-test-key'};
  }
  const configured = env.CHECKOUT_RETURN_ORIGIN;
  if (preview && !configured) return {ready: false, reason: 'preview-requires-return-origin'};
  let url;
  try { url = new URL(configured || PRODUCTION_ORIGIN); }
  catch { return {ready: false, reason: 'invalid-return-origin'}; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    return {ready: false, reason: 'invalid-return-origin'};
  }
  if (preview && url.origin === PRODUCTION_ORIGIN) return {ready: false, reason: 'preview-cannot-return-to-production'};
  // Production always retains the approved customer return destination.
  if (env.VERCEL_ENV === 'production' && url.origin !== PRODUCTION_ORIGIN) {
    return {ready: false, reason: 'production-origin-mismatch'};
  }
  return {
    ready: true,
    reason: 'ready',
    successUrl: `${url.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${url.origin}/?payment=cancelled`
  };
}
