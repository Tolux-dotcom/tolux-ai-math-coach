// Optional QA dependency only. No external database or network access.
import assert from 'node:assert/strict';
import { stagingSchemaParts } from './build-staging-schema.mjs';
import { reconcileSubscriptionEntitlement } from '../subscription-entitlement.mjs';
const { PGlite } = await import(process.env.TOLUX_QA_PGLITE_MODULE || '@electric-sql/pglite');
const parts = await stagingSchemaParts();
const setup = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS
    'SELECT coalesce(nullif(current_setting(''request.jwt.claims'',true),''''),''{}'')::jsonb';
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;`;
let checks = 0;
const pass = label => { checks++; console.log(`PASS: ${label}`); };
const broken = new PGlite();
try {
  await broken.exec(setup);
  await broken.exec(parts.find(p=>p.name==='create_student_trial_access').sql);
  await broken.exec(parts.find(p=>p.name==='create_skill_mastery_tracking').sql);
  await assert.rejects(broken.exec(parts.find(p=>p.name==='restrict_rls_auto_enable').sql),e=>e.code==='42883');
  pass('recorded migration failure reproduced: missing rls_auto_enable');
} finally { await broken.close(); }

const db = new PGlite();
try {
  await db.exec(setup);
  for (const part of parts) await db.exec(part.sql);
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  assert.deepEqual(tables,['assignment_completions','class_enrollments','growth_admins','growth_events',
    'lesson_completions','school_pilot_requests','skill_attempts','skill_mastery','stripe_billing_ownership',
    'student_trial_access','student_usage','teacher_assignments','teacher_classrooms','teacher_profiles']);
  pass('schema prerequisites and all 16 historical migrations build 14 app tables');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.users')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.growth_admins')).rows[0].n,0);
  pass('no production Auth or administrator data is seeded');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity")).rows[0].n,0);
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') AS allowed")).rows[0].allowed,false);
  assert.equal((await db.query("SELECT prosrc IS NOT NULL AS exists FROM pg_proc WHERE oid='public.get_teacher_classroom_report(uuid)'::regprocedure")).rows[0].exists,true);
  assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE oid='public.get_teacher_classroom_report(uuid)'::regprocedure")).rows[0].prosecdef,false);
  pass('all tables retain RLS; restricted event function and invoker report remain secure');

  const owner='00000000-0000-4000-8000-000000000001';
  await db.query('INSERT INTO auth.users(id) VALUES ($1)',[owner]);
  await assert.rejects(db.exec(parts[0].sql),e=>e.code==='P0001');
  pass('bootstrap refuses an existing Auth database');
  await db.exec('SET ROLE service_role');
  await db.query('INSERT INTO student_usage(user_id,questions_used,is_subscriber) VALUES ($1,4,true)',[owner]);
  await db.query(`INSERT INTO lesson_completions(user_id,client_completion_id,module_id,completed_at,mastery_label,mastery_score)
    VALUES ($1,$2,'test-prep-quick-check',now(),'Developing',80)`,[owner,'00000000-0000-4000-8000-000000000010']);
  const updateSubscription=async (userId,enabled,ownership)=>{
    await db.query('UPDATE student_usage SET is_subscriber=$2 WHERE user_id=$1',[userId,enabled]);
    await db.query(`INSERT INTO stripe_billing_ownership(user_id,stripe_customer_id,stripe_subscription_id)
      VALUES ($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,
      stripe_subscription_id=excluded.stripe_subscription_id`,[userId,ownership.stripeCustomerId,ownership.stripeSubscriptionId]);
    return true;
  };
  for (const [status,enabled] of [['active',true],['past_due',true],['canceled',false]]) {
    const result=await reconcileSubscriptionEntitlement({subscription:{object:'subscription',id:'sub_fixture',customer:'cus_fixture',status,metadata:{tolux_user_id:owner}},updateSubscription});
    assert.equal(result.updated,true);
    assert.equal((await db.query('SELECT is_subscriber FROM student_usage WHERE user_id=$1',[owner])).rows[0].is_subscriber,enabled);
  }
  assert.equal((await db.query('SELECT mastery_score FROM lesson_completions WHERE user_id=$1',[owner])).rows[0].mastery_score,80);
  assert.equal((await db.query('SELECT questions_used FROM student_usage WHERE user_id=$1',[owner])).rows[0].questions_used,4);
  pass('real entitlement reconciler updates SQL through cancellation while retaining score and usage');
  await db.exec('RESET ROLE');
  await db.exec('SET ROLE authenticated');
  await assert.rejects(db.query('SELECT * FROM stripe_billing_ownership'),e=>e.code==='42501');
  await assert.rejects(db.query('SELECT * FROM lesson_completions'),e=>e.code==='42501');
  await db.exec('RESET ROLE');
  pass('client cannot directly read server-only billing or lesson history');
  console.log(`${checks}/${checks} staging schema checks passed. No external database was accessed.`);
} finally { await db.close(); }
