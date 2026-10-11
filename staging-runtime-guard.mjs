// Dedicated QA branch only. Never promote this branch to production.
import { resolvePublicAuthConfig } from './public-auth-config.mjs';
import { resolveSupabaseServerConfig } from './supabase-server-config.mjs';
import { resolveCheckoutReturnConfig } from './checkout-return-config.mjs';

export function assertIsolatedBillingQa(env) {
  if (env.VERCEL_ENV !== 'preview') throw new Error('Billing QA requires a preview deployment.');
  const ref = env.TOLUX_STAGING_PROJECT_REF;
  if (!/^[a-z]{20}$/.test(ref || '') || ref === 'xnadszfvjkyxltskywin') {
    throw new Error('Billing QA requires an explicit non-production Supabase project.');
  }
  const expected = `https://${ref}.supabase.co`;
  const auth = resolvePublicAuthConfig(env);
  const serverKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  const server = resolveSupabaseServerConfig({authUrl:auth.url,configuredUrl:env.SUPABASE_URL,hasServerKey:Boolean(serverKey)});
  if (auth.url !== expected || !server.ready || server.serverProjectUrl !== expected) {
    throw new Error('Billing QA authentication and storage must use the isolated project.');
  }
  // Legacy service-role JWTs embed their project reference. Opaque secret keys
  // cannot be verified locally; an authenticated staging Data API check is required.
  if (serverKey && !serverKey.startsWith('sb_secret_')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(serverKey.split('.')[1], 'base64url').toString()); }
    catch { throw new Error('Billing QA server credential is invalid.'); }
    if (claims.ref !== ref || claims.role !== 'service_role') {
      throw new Error('Billing QA server credential belongs to another project or role.');
    }
  }
  if (!String(env.STRIPE_SECRET_KEY || '').startsWith('sk_test_')) {
    throw new Error('Billing QA requires Stripe test mode.');
  }
  const returns = resolveCheckoutReturnConfig(env);
  if (!returns.ready || !new URL(returns.cancelUrl).hostname.endsWith('.vercel.app')) {
    throw new Error('Billing QA requires a Vercel preview return destination.');
  }
  for (const key of ['STRIPE_WEBHOOK_SECRET','STRIPE_CANCELLATION_WEBHOOK_SECRET','STRIPE_PAYMENT_FAILED_WEBHOOK_SECRET']) {
    if (!String(env[key] || '').startsWith('whsec_')) throw new Error('Billing QA requires test webhook signing secrets.');
  }
  return {ready:true,projectRef:ref,stripeMode:'test'};
}
