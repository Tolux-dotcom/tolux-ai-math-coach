import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/202608310002_move_subscription_entitlement.sql", import.meta.url),
  "utf8"
);

test("subscriber entitlement moves onto timed-trial access without losing paid users", () => {
  assert.match(migration, /add column if not exists is_subscriber boolean not null default false/);
  assert.match(migration, /from public\.student_usage su/);
  assert.match(migration, /coalesce\(su\.is_subscriber, false\)/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /is_subscriber = excluded\.is_subscriber/);
});
