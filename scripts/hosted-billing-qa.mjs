// QA-only harness. Never run against production; secrets stay outside the repo.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const configPath = process.env.TOLUX_QA_CONFIG_FILE;
assert(configPath, 'A private QA configuration file is required');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
assert(/^[a-z]{20}$/.test(config.supabaseProjectRef));
assert.notEqual(config.supabaseProjectRef, 'xnadszfvjkyxltskywin');
assert(config.stripeTestKey.startsWith('sk_test_'));
assert(new URL(config.previewOrigin).hostname.endsWith('.vercel.app'));
const claims = JSON.parse(Buffer.from(config.supabaseServiceKey.split('.')[1], 'base64url'));
assert.equal(claims.ref, config.supabaseProjectRef);
assert.equal(claims.role, 'service_role');
const db = createClient(`https://${config.supabaseProjectRef}.supabase.co`, config.supabaseServiceKey, {auth:{persistSession:false}});
// Keep user sign-in separate: signing in on the admin client replaces its bearer
// token and correctly subjects subsequent reads to the student's RLS policy.
const auth = createClient(`https://${config.supabaseProjectRef}.supabase.co`, config.supabaseServiceKey, {auth:{persistSession:false}});
const stripe = new Stripe(config.stripeTestKey);
async function persist() { await fs.writeFile(configPath, JSON.stringify(config), {mode:0o600}); }
let cookie = config.previewCookie || '';
async function establishPreviewAccess() {
  const cookies = new Map(cookie.split('; ').filter(Boolean).map(pair=>[pair.split('=')[0],pair]));
  let url = config.previewShareUrl;
  for (let i=0;i<5;i++) {
    const r = await fetch(url,{redirect:'manual',headers:cookie?{Cookie:cookie}:{}});
    for(const c of r.headers.getSetCookie()) { const pair=c.split(';')[0]; cookies.set(pair.split('=')[0],pair); }
    cookie=[...cookies.values()].join('; ');
    const location=r.headers.get('location');
    if(!location) { assert.equal(r.status,200,'Preview share access failed'); break; }
    url=new URL(location,url).href;
    assert.equal(new URL(url).origin,config.previewOrigin,'Preview redirected to sign-in');
  }
  config.previewCookie=cookie;
  await persist();
}
async function app(path,{token,body}={}) {
  const r=await fetch(config.previewOrigin+path,{redirect:'manual',method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const text=await r.text();
  let data; try {data=JSON.parse(text);} catch {data=null;}
  return {status:r.status,data,text};
}
async function waitUsage(expected) {
  for(let i=0;i<20;i++) {
    const {data,error}=await db.from('student_usage').select('is_subscriber,questions_used').eq('user_id',config.userId).maybeSingle();
    if(error) throw new Error('Staging usage read failed');
    if(data?.is_subscriber===expected) return data;
    await new Promise(r=>setTimeout(r,1000));
  }
  throw new Error('Stripe webhook did not update staging entitlement');
}
await establishPreviewAccess();
const publicConfig=await app('/public-auth-config.js');
assert.equal(publicConfig.status,200,'QA application did not start');
assert(publicConfig.text.includes(config.supabaseProjectRef),'Hosted auth is not isolated');
const unauth=await app('/api/lesson-progress');
assert.equal(unauth.status,401);

if(['setup','resume'].includes(process.argv[2])) {
  if(process.argv[2]==='setup') {
  assert(!config.userId,'Fixture already exists; do not duplicate');
  const {data:empty,error:emptyError}=await db.auth.admin.listUsers({page:1,perPage:1});
  assert(!emptyError,'Staging server credential failed');
  assert.equal(empty.users.length,0,'Staging must have no existing users');
  config.email='qa-billing-20261011@example.invalid';
  config.password=crypto.randomBytes(24).toString('base64url')+'aA1!';
  const {data:created,error}=await db.auth.admin.createUser({email:config.email,password:config.password,email_confirm:true});
  if(error) throw new Error(`Synthetic staging account creation failed: ${error.status} ${error.code || ''} ${error.message}`);
  config.userId=created.user.id; await persist();
  const clock=await stripe.testHelpers.testClocks.create({frozen_time:Math.floor(Date.now()/1000),name:'Disposable Tolux QA 20261011'});
  config.clockId=clock.id; await persist();
  const customer=await stripe.customers.create({name:'Disposable Tolux billing QA',test_clock:clock.id,metadata:{tolux_user_id:config.userId}});
  config.customerId=customer.id; await persist();
  const sub=await stripe.subscriptions.create({customer:customer.id,items:[{price:'price_1ULS55D6liJLynVggUGao1cM'}],trial_period_days:7,metadata:{tolux_user_id:config.userId}});
  assert.equal(sub.livemode,false); config.subscriptionId=sub.id; config.trialEnd=sub.trial_end; await persist();
  await stripe.subscriptions.update(sub.id,{metadata:{qa_run:'20261011'}});
  }
  const usage=await waitUsage(true);
  const counter=await db.from('student_usage').update({questions_used:4}).eq('user_id',config.userId);
  assert(!counter.error);
  const {data:session,error:loginError}=await auth.auth.signInWithPassword({email:config.email,password:config.password});
  assert(!loginError,'Synthetic sign-in failed');
  config.accessToken=session.session.access_token; config.refreshToken=session.session.refresh_token; await persist();
  const completionId=config.completionId || crypto.randomUUID();
  config.completionId=completionId;
  const report={completion_id:completionId,module_id:'test-prep-quick-check',completed_at:new Date().toISOString(),mastery_label:'Developing',mastery_score:80,time_on_skill_seconds:120,item_records:[]};
  config.report=report; await persist();
  const saved=await app('/api/lesson-progress',{token:config.accessToken,body:report});
  assert.equal(saved.status,200,'Authenticated quiz save failed');
  const replay=await app('/api/lesson-progress',{token:config.accessToken,body:report}); assert.equal(replay.status,200);
  const rows=await db.from('lesson_completions').select('mastery_score').eq('user_id',config.userId).eq('client_completion_id',completionId);
  assert(!rows.error); assert.equal(rows.data.length,1); assert.equal(rows.data[0].mastery_score,80);
  await auth.auth.signOut();
  const relogin=await auth.auth.signInWithPassword({email:config.email,password:config.password}); assert(!relogin.error);
  config.accessToken=relogin.data.session.access_token; await persist();
  const progress=await app('/api/lesson-progress',{token:config.accessToken});
  assert.equal(progress.status,200); assert(progress.data.activities.some(x=>x.module_id==='test-prep-quick-check'&&x.mastery_score===80));
  const portal=await app('/api/create-customer-portal-session',{token:config.accessToken,body:{}});
  assert.equal(portal.status,200,'Hosted Customer Portal creation failed');
  assert(new URL(portal.data.url).hostname==='billing.stripe.com');
  config.portalUrl=portal.data.url; await persist();
  await fs.writeFile('/workspace/scratch/tolux-billing-qa-portal-20261011.json',JSON.stringify({portalUrl:config.portalUrl}),{mode:0o600});
  console.log(JSON.stringify({stage:'setup',authIsolated:true,stripeMode:'test',entitlement:usage.is_subscriber,quizScore:80,replayRows:rows.data.length,signedOutAndBackIn:true,portalCreated:true}));
} else {
  console.log(JSON.stringify({stage:'probe',authIsolated:true,unauthenticatedProgressStatus:unauth.status}));
}
