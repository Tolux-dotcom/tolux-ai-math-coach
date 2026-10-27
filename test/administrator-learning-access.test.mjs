import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createAdministratorLearningAccess, hasUnlimitedLearningAccess, buildLearningTrialStatus} from '../administrator-learning-access.mjs';
import {buildTrialStatus, TRIAL_SECONDS} from '../trial-access.mjs';
import {resolveFullSimulationAccess} from '../test-prep-access.mjs';
import {getFreeDiagnosticAccess} from '../diagnostic-access.mjs';

function database(result) {
  return {from(name){assert.equal(name,'growth_admins');return {select(){return this;},eq(field,id){assert.equal(field,'user_id');assert.equal(id,'verified-user');return this;},async maybeSingle(){return result;}};}};
}
test('administrator lookup uses protected user IDs and fails closed on lookup errors',async()=>{
  assert.equal(await createAdministratorLearningAccess({client:database({data:{user_id:'verified-user'},error:null})}).isAdministrator('verified-user'),true);
  for(const result of [{data:null,error:null},{data:{user_id:'other-user'},error:null},{data:null,error:{message:'denied'}}])assert.equal(await createAdministratorLearningAccess({client:database(result)}).isAdministrator('verified-user'),false);
  assert.equal(await createAdministratorLearningAccess({userIds:' verified-user '}).isAdministrator('verified-user'),true);
  assert.equal(await createAdministratorLearningAccess({}).isAdministrator('verified-user'),false);
  assert.equal(await createAdministratorLearningAccess({userIds:'verified-user'}).isAdministrator(null),false);
});

test('administrator access survives cancellation and an exhausted trial without changing billing status',()=>{
  const usage={is_subscriber:false,is_administrator:true};
  const status=buildLearningTrialStatus(600,usage);
  assert.equal(status.isSubscriber,false);assert.equal(status.isAdministrator,true);
  assert.equal(status.trialExpired,false);assert.equal(status.trialSecondsRemaining,null);
  assert.deepEqual(usage,{is_subscriber:false,is_administrator:true});
  assert.equal(hasUnlimitedLearningAccess({is_subscriber:false,is_administrator:'true'}),false);
});

const source=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const coachStart=source.indexOf('if (req.method === "POST" && req.url === "/api/coach")');
const lessonStart=source.indexOf('if (req.method === "POST" && req.url === "/api/lesson-usage")');
const heartbeatStart=source.indexOf('if (\n  req.method === "POST" &&\n  (req.url === "/api/trial-heartbeat"');
const routes={coach:source.slice(coachStart,lessonStart),lesson:source.slice(lessonStart,heartbeatStart),heartbeat:source.slice(heartbeatStart,source.indexOf('  if (req.method === "GET") return serveStatic',heartbeatStart))};
async function request(route,{administrator=false,subscriber=false,signedIn=true,forged=false}={}){
  let result;let trialReads=0;let trialWrites=0;
  const c=vm.createContext({req:{method:'POST',url:{coach:'/api/coach',lesson:'/api/lesson-usage',heartbeat:'/api/trial-heartbeat'}[route],headers:{}},res:{},
    process:{env:{OPENAI_API_KEY:'test-only'}},console,
    readJson:async()=>({message:'Explain x + 2 = 5',itemId:'ordinary-item',activeSeconds:15,is_administrator:forged,isAdministrator:forged,user_metadata:{role:'admin'}}),
    getAuthenticatedUser:async()=>signedIn?{id:'verified-user'}:null,
    getStudentUsage:async()=>({user_id:'verified-user',is_subscriber:subscriber,questions_used:0}),
    learningAdministrators:{isAdministrator:async id=>id==='verified-user'&&administrator},
    getStudentTrialAccess:async()=>{trialReads++;return {trial_seconds_used:600};},
    addStudentTrialSeconds:async()=>{trialWrites++;return {trial_seconds_used:600};},
    getFreeDiagnosticAccess:()=>null,internalQa:{readSession:()=>null},dailyFreeAccess:{configured:false},
    hasUnlimitedLearningAccess,buildLearningTrialStatus,buildTrialStatus,TRIAL_SECONDS,
    MASTER_INSTRUCTIONS:'test',OpenAI:class{responses={create:async()=>({output_text:'x = 3'})};},
    send:(_res,status,body)=>{result={status,body};}
  });
  vm.runInContext(source.slice(source.indexOf('async function getStudentLearningUsage('),source.indexOf('async function getStudentTrialAccess(')),c);
  await vm.runInContext('(async()=>{'+routes[route]+'})()',c);
  return {...result,trialReads,trialWrites};
}
test('real tutor, lesson, and heartbeat routes allow a canceled administrator without consuming trial',async()=>{
  for(const route of Object.keys(routes)){
    const r=await request(route,{administrator:true});
    assert.equal(r.status,200,route);assert.equal(r.body.isAdministrator,true,route);
    assert.equal(r.body.isSubscriber,false,route);assert.equal(r.trialReads,0,route);assert.equal(r.trialWrites,0,route);
  }
});
test('real routes retain expired-student and sign-in limits and ignore forged administrator fields',async()=>{
  for(const route of Object.keys(routes)){
    const student=await request(route,{forged:true});
    assert.equal(student.status,403,route);assert.equal(student.body.limitReached,true,route);
    assert.equal((await request(route,{signedIn:false})).status,401,route);
    assert.equal((await request(route,{subscriber:true})).status,200,route);
  }
});
test('full simulation permits administrator learning without claiming a paid subscription',()=>{
  const admin=resolveFullSimulationAccess({authenticated:true,entitlementAvailable:true,isAdministrator:true});
  assert.equal(admin.status,200);assert.equal(admin.body.isSubscriber,false);assert.equal(admin.body.isAdministrator,true);
  assert.equal(resolveFullSimulationAccess({authenticated:true,entitlementAvailable:true}).status,403);
});

test('Student Plan checkout refuses a known administrator before creating a Stripe subscription',async()=>{
 const begin=source.indexOf('if (req.method === "POST" && req.url === "/api/create-checkout-session")');
 const end=source.indexOf('  if (req.method === "POST" && req.url === "/api/create-customer-portal-session")',begin);
 assert.ok(begin>0&&end>begin);
 let result;let stripeCalls=0;
 const context=vm.createContext({req:{method:'POST',url:'/api/create-checkout-session'},res:{},
   stripe:{checkout:{sessions:{create:async()=>{stripeCalls++;throw Error('Must not create checkout');}}}},
   supabaseAdmin:{},getAuthenticatedUser:async()=>({id:'verified-user'}),
   readJson:async()=>({plan:'student'}),learningAdministrators:{isAdministrator:async()=>true},
   send:(_res,status,body)=>{result={status,body};},console});
 await vm.runInContext('(async()=>{'+source.slice(begin,end)+'})()',context);
 assert.equal(result.status,409);assert.equal(result.body.isAdministrator,true);assert.equal(stripeCalls,0);
});

test('authored free diagnostic returns before any sign-in or database lookup',async()=>{
 let result;
 const blocked=()=>{throw Error('Free diagnostic must not reach authentication or usage storage');};
 const c=vm.createContext({req:{method:'POST',url:'/api/lesson-usage'},res:{},readJson:async()=>({itemId:'A5A-D01'}),getFreeDiagnosticAccess,
   getAuthenticatedUser:blocked,getStudentLearningUsage:blocked,send:(_res,status,body)=>{result={status,body};},console});
 await vm.runInContext('(async()=>{'+routes.lesson+'})()',c);
 assert.equal(result.status,200);assert.equal(result.body.allowed,true);assert.equal(result.body.isFreeDiagnostic,true);
});
