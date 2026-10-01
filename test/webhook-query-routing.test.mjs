import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import Stripe from 'stripe';

test('webhook query parameters preserve POST routing and signature verification', async () => {
  const port = 19397;
  const env = { PATH: process.env.PATH, PORT: String(port), SUPABASE_AUTH_URL: 'https://routing-qa.supabase.co', SUPABASE_URL: 'https://routing-qa.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dummy', SUPABASE_SERVICE_ROLE_KEY: 'dummy-service-key', STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy' };
  const child = spawn(process.execPath, ['server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      child.stdout.on('data', data => { if (String(data).includes('running at')) { clearTimeout(timer); resolve(); } });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    });
    const stripe = new Stripe('sk_test_dummy');
    const body = JSON.stringify({ id: 'evt_routing_qa', type: 'routing.test', data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_dummy' });
    for (const suffix of ['', '?x-vercel-protection-bypass=dummy']) {
      const url = `http://127.0.0.1:${port}/api/stripe-webhook${suffix}`;
      const valid = await fetch(url, { method: 'POST', headers: { 'stripe-signature': signature }, body });
      assert.equal(valid.status, 200);
      assert.deepEqual(await valid.json(), { received: true });
      const invalid = await fetch(url, { method: 'POST', headers: { 'stripe-signature': 'invalid' }, body });
      assert.equal(invalid.status, 400);
      assert.equal((await fetch(url)).status, 404);
    }
    const wrong = await fetch(`http://127.0.0.1:${port}/api/stripe-webhook-extra?x-vercel-protection-bypass=dummy`, { method: 'POST', body });
    assert.equal(wrong.status, 405);
  } finally { child.kill(); }
});
