import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveCheckoutReturnConfig} from '../checkout-return-config.mjs';
test('production and unset environments retain the approved return URLs',()=>{
 for(const env of [{},{VERCEL_ENV:'production'}]){
 const config=resolveCheckoutReturnConfig(env);assert.equal(config.ready,true);
 assert.equal(config.successUrl,'https://mathcoach.tolux.org/?payment=success&session_id={CHECKOUT_SESSION_ID}');
 assert.equal(config.cancelUrl,'https://mathcoach.tolux.org/?payment=cancelled');
 }
});
test('explicit preview returns to its configured origin using test Stripe keys',()=>{
 const c=resolveCheckoutReturnConfig({VERCEL_ENV:'preview',STRIPE_SECRET_KEY:'sk_test_fixture',CHECKOUT_RETURN_ORIGIN:'https://mathcoach-test.vercel.app/'});
 assert.equal(c.ready,true);assert.equal(c.successUrl,'https://mathcoach-test.vercel.app/?payment=success&session_id={CHECKOUT_SESSION_ID}');
 assert.equal(c.cancelUrl,'https://mathcoach-test.vercel.app/?payment=cancelled');
});
test('preview refuses missing/live keys, unset redirects, and production return address',()=>{
 const valid={VERCEL_ENV:'preview',STRIPE_SECRET_KEY:'sk_test_fixture',CHECKOUT_RETURN_ORIGIN:'https://mathcoach-test.vercel.app'};
 for(const patch of [{STRIPE_SECRET_KEY:''},{STRIPE_SECRET_KEY:'sk_live_fixture'},{CHECKOUT_RETURN_ORIGIN:''},{CHECKOUT_RETURN_ORIGIN:'https://mathcoach.tolux.org'}])assert.equal(resolveCheckoutReturnConfig({...valid,...patch}).ready,false);
});
test('unsafe redirects and production destination overrides fail closed',()=>{
 for(const origin of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com?next=other','https://example.com#fragment','https://example.com:444','invalid'])assert.equal(resolveCheckoutReturnConfig({CHECKOUT_RETURN_ORIGIN:origin}).ready,false);
 assert.equal(resolveCheckoutReturnConfig({VERCEL_ENV:'production',CHECKOUT_RETURN_ORIGIN:'https://other.example'}).ready,false);
});
test('server checks configuration before creating a Stripe session and does not read redirect from request',()=>{
 const s=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const route=s.slice(s.indexOf('req.url === "/api/create-checkout-session"'),s.indexOf('req.url.startsWith("/api/verify-session")'));
 assert.ok(route.indexOf('resolveCheckoutReturnConfig(process.env)')<route.indexOf('stripe.checkout.sessions.create'));
 assert.match(route,/success_url: checkoutReturnConfig.successUrl/);
 assert.match(route,/cancel_url: checkoutReturnConfig.cancelUrl/);
 assert.doesNotMatch(route,/headers\.(origin|host)|body\.(return|redirect)/);
});
