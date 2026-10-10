import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/202610070001_create_stripe_billing_ownership.sql",
    import.meta.url
  ),
  "utf8"
);

test("billing ownership migration is additive and server-only", () => {
  assert.match(
    migration,
    /create table if not exists public\.stripe_billing_ownership/i
  );
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\)/i);
  assert.match(migration, /stripe_customer_id text not null unique/i);
  assert.match(migration, /stripe_subscription_id text not null unique/i);
  assert.match(migration, /enable row level security/i);
  assert.match(
    migration,
    /revoke all on table public\.stripe_billing_ownership from public, anon, authenticated/i
  );
  assert.match(
    migration,
    /grant select, insert, update on table public\.stripe_billing_ownership to service_role/i
  );
  assert.doesNotMatch(migration, /drop table|delete from|truncate/i);
});

test("server persists verified Stripe ownership without replacing progress data", () => {
  const server = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
  const start = server.indexOf("async function saveStripeBillingOwnership");
  const end = server.indexOf("const MASTER_INSTRUCTIONS", start);
  const billingHelpers = server.slice(start, end);

  assert.ok(start > 0 && end > start);
  assert.match(billingHelpers, /\.from\("stripe_billing_ownership"\)/);
  assert.match(billingHelpers, /\.upsert\(/);
  assert.match(billingHelpers, /onConflict: "user_id"/);
  assert.match(billingHelpers, /stripe_customer_id/);
  assert.match(billingHelpers, /stripe_subscription_id/);
  assert.doesNotMatch(billingHelpers, /lesson_completions|delete\(|truncate/i);
});
