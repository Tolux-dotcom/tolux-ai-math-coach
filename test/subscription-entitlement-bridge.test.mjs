import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/202608310003_sync_legacy_subscription_entitlement.sql", import.meta.url),
  "utf8"
);

test("legacy Stripe entitlement writes are mirrored during migration", () => {
  assert.match(migration, /after insert or update of is_subscriber/i);
  assert.match(migration, /on public\.student_usage/i);
  assert.match(migration, /insert into public\.student_trial_access/i);
  assert.match(migration, /is_subscriber = excluded\.is_subscriber/i);
});
