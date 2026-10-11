import assert from 'node:assert/strict';
import test from 'node:test';
import { assertIsolatedBillingQa } from '../staging-runtime-guard.mjs';
const ref='abcdefghijklmnopqrst';
const env={VERCEL_ENV:'preview',TOLUX_STAGING_PROJECT_REF:ref,
  SUPABASE_AUTH_URL:`https://${ref}.supabase.co`,SUPABASE_URL:`https://${ref}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture',
  STRIPE_SECRET_KEY:'sk_test_fixture',CHECKOUT_RETURN_ORIGIN:'https://billing-qa.example.vercel.app',
  STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_CANCELLATION_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PAYMENT_FAILED_WEBHOOK_SECRET:'whsec_fixture'};
test('isolated preview config is accepted without exposing credentials',()=>{
  assert.deepEqual(assertIsolatedBillingQa(env),{ready:true,projectRef:ref,stripeMode:'test'});
});
test('production and local targets are rejected',()=>{
  for(const VERCEL_ENV of ['production','development',undefined]) assert.throws(()=>assertIsolatedBillingQa({...env,VERCEL_ENV}));
});
test('production ref and omitted explicit ref are rejected',()=>{
  for(const TOLUX_STAGING_PROJECT_REF of ['xnadszfvjkyxltskywin',undefined]) assert.throws(()=>assertIsolatedBillingQa({...env,TOLUX_STAGING_PROJECT_REF}));
});
test('mixed public or server project settings are rejected',()=>{
  for(const key of ['SUPABASE_AUTH_URL','SUPABASE_URL']) assert.throws(()=>assertIsolatedBillingQa({...env,[key]:'https://xnadszfvjkyxltskywin.supabase.co'}));
});
test('missing credentials and live Stripe keys are rejected',()=>{
  assert.throws(()=>assertIsolatedBillingQa({...env,SUPABASE_SECRET_KEY:''}));
  assert.throws(()=>assertIsolatedBillingQa({...env,STRIPE_SECRET_KEY:'sk_live_fixture'}));
});
test('legacy service role key must identify the isolated project',()=>{
  const jwt=claims=>`fixture.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.fixture`;
  assert.equal(assertIsolatedBillingQa({...env,SUPABASE_SECRET_KEY:jwt({ref,role:'service_role'})}).ready,true);
  for(const claims of [{ref:'xnadszfvjkyxltskywin',role:'service_role'},{ref,role:'anon'}]) {
    assert.throws(()=>assertIsolatedBillingQa({...env,SUPABASE_SECRET_KEY:jwt(claims)}));
  }
});
test('production return destination and missing webhook configuration are rejected',()=>{
  assert.throws(()=>assertIsolatedBillingQa({...env,CHECKOUT_RETURN_ORIGIN:'https://mathcoach.tolux.org'}));
  for(const key of ['STRIPE_WEBHOOK_SECRET','STRIPE_CANCELLATION_WEBHOOK_SECRET','STRIPE_PAYMENT_FAILED_WEBHOOK_SECRET']) assert.throws(()=>assertIsolatedBillingQa({...env,[key]:''}));
});
