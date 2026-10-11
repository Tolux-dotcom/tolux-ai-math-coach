// Isolated, in-memory Postgres QA. Never connects to Supabase or Stripe.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { PGlite } = await import(process.env.TOLUX_QA_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const migration = await fs.readFile(new URL('../supabase/migrations/202610070001_create_stripe_billing_ownership.sql', import.meta.url), 'utf8');
let checks = 0;

function passed(label) {
  checks += 1;
  console.log(`PASS: ${label}`);
}

async function asRole(role, action) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); }
  finally { await db.exec('RESET ROLE'); }
}

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE TABLE public.student_usage (user_id uuid PRIMARY KEY, is_subscriber boolean);
    CREATE TABLE public.student_trial_access (user_id uuid PRIMARY KEY, trial_seconds_used integer);
    CREATE TABLE public.lesson_completions (user_id uuid, mastery_score integer);
  `);
  await db.query('INSERT INTO auth.users VALUES ($1), ($2)', [owner, other]);
  await db.query('INSERT INTO student_usage VALUES ($1, true)', [owner]);
  await db.query('INSERT INTO student_trial_access VALUES ($1, 120)', [owner]);
  await db.query('INSERT INTO lesson_completions VALUES ($1, 80)', [owner]);
  const snapshot = async () => Promise.all(['student_usage', 'student_trial_access', 'lesson_completions']
    .map(table => db.query(`SELECT * FROM ${table} ORDER BY user_id`)));
  const before = (await snapshot()).map(result => result.rows);

  // Supabase grants service_role broad privileges on new public tables by default.
  // A plain GRANT does not remove those inherited privileges.
  await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role');
  await db.exec(migration);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.stripe_billing_ownership'::regclass")).rows[0].relrowsecurity, true);
  passed('migration executes and enables row-level security');

  for (const role of ['anon', 'authenticated']) {
    await asRole(role, async () => {
      await assert.rejects(db.query('SELECT * FROM public.stripe_billing_ownership'), error => error.code === '42501');
      await assert.rejects(db.query('INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id) VALUES ($1, $2, $3)', [owner, 'cus_denied', 'sub_denied']), error => error.code === '42501');
    });
  }
  passed('anonymous and authenticated roles cannot read or insert billing mappings');

  const upsert = (subscription) => db.query(`
    INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id)
    VALUES ($1, $2, $3) ON CONFLICT (user_id)
    DO UPDATE SET stripe_subscription_id = excluded.stripe_subscription_id
    RETURNING stripe_customer_id, stripe_subscription_id
  `, [owner, 'cus_fixture', subscription]);
  await asRole('service_role', async () => {
    await upsert('sub_fixture');
    await upsert('sub_fixture');
    const renewed = await upsert('sub_renewed');
    assert.equal(renewed.rows[0].stripe_subscription_id, 'sub_renewed');
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM public.stripe_billing_ownership')).rows[0].count, 1);
  });
  passed('service role can insert, replay idempotently, read, and update ownership');

  await asRole('service_role', async () => {
    await assert.rejects(db.query('DELETE FROM public.stripe_billing_ownership'), error => error.code === '42501');
    await assert.rejects(db.query('TRUNCATE public.stripe_billing_ownership'), error => error.code === '42501');
  });
  assert.deepEqual((await db.query("SELECT privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'stripe_billing_ownership' AND grantee = 'service_role' ORDER BY privilege_type")).rows.map(row => row.privilege_type), ['INSERT', 'SELECT', 'UPDATE']);
  passed('service role has only select, insert, and update despite broad default grants');

  await assert.rejects(db.query('INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id) VALUES ($1, $2, $3)', [other, 'cus_fixture', 'sub_other']), error => error.code === '23505');
  await assert.rejects(db.query('INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id) VALUES ($1, $2, $3)', [other, 'cus_other', 'sub_renewed']), error => error.code === '23505');
  passed('customer and subscription IDs cannot belong to two users');

  await assert.rejects(db.query('INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id) VALUES ($1, $2, $3)', ['00000000-0000-4000-8000-000000000003', 'cus_missing', 'sub_missing']), error => error.code === '23503');
  await assert.rejects(db.query('INSERT INTO public.stripe_billing_ownership (user_id, stripe_customer_id, stripe_subscription_id) VALUES ($1, $2, $3)', [other, 'invalid', 'sub_valid']), error => error.code === '23514');
  passed('foreign key and Stripe ID constraints reject invalid mappings');

  await db.exec(migration);
  assert.equal((await db.query('SELECT stripe_subscription_id FROM public.stripe_billing_ownership WHERE user_id = $1', [owner])).rows[0].stripe_subscription_id, 'sub_renewed');
  passed('reapplying migration preserves existing billing mappings');

  assert.deepEqual((await snapshot()).map(result => result.rows), before);
  passed('student scores, entitlements, and trial fixtures remain intact');
  console.log(`${checks}/${checks} isolated database checks passed. No external database was accessed.`);
} finally {
  await db.close();
}
