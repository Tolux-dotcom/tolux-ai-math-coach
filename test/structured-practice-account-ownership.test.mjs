import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { escapeHtml } from '../public/lesson-core.mjs';
import { PRACTICE_SKILLS, generateStructuredPracticeSession, gradePracticeAnswer, validatePracticeOptions } from '../public/practice-core.mjs';
import { createPracticeCompletionId, persistPracticeCompletion } from '../public/practice-progress.mjs';

const owner = { access_token: 'owner-token', user: { id: 'student-a' } };
const other = { access_token: 'other-token', user: { id: 'student-b' } };
const id = '123e4567-e89b-42d3-a456-426614174000';
const pendingKey = `toluxPendingLessonProgress:${id}`;

function response(status = 200, data = { activity: { mastery_score: 80 } }) {
  return { status, ok: status >= 200 && status < 300, async json() { return data; } };
}

async function fixture(skill, { refreshed = { ...owner, access_token: 'fresh-token' }, respond, storageFails = false } = {}) {
  let active = owner, refreshes = 0;
  const data = new Map(), requests = [], elements = new Map();
  const storage = { setItem(k, v) { if (storageFails) throw new Error('Quota exceeded'); data.set(k, String(v)); }, removeItem(k) { data.delete(k); } };
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { style: {}, value: '', innerHTML: '', handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }, setAttribute() {}, focus() {} });
    return elements.get(selector);
  };
  const fetchImpl = async (url, options) => {
    if (url === PRACTICE_SKILLS[skill].lessonPath) {
      const bank = JSON.parse(fs.readFileSync(new URL(`../public${url}`, import.meta.url), 'utf8'));
      return response(200, bank);
    }
    requests.push({ url, options });
    return respond ? respond(url, options, api) : url === '/api/lesson-progress' ? response() : response(200, { allowed: true, isSubscriber: true });
  };
  const client = { auth: {
    async getSession() { return { data: { session: active }, error: null }; },
    async refreshSession() { refreshes++; active = refreshed; return { data: { session: active }, error: null }; }
  } };
  const context = vm.createContext({
    URLSearchParams, Date, Map, Set, console: { warn() {}, error() {} },
    location: { search: `?skill=${skill}&difficulty=mixed&count=5` },
    window: { TOLUX_PUBLIC_CONFIG: {}, supabase: { createClient() { return client; } }, addEventListener() {} },
    document: { querySelector: element, visibilityState: 'visible' },
    setInterval() { return 1; }, clearInterval() {}, fetch: fetchImpl, escapeHtml,
    PRACTICE_SKILLS, generateStructuredPracticeSession, gradePracticeAnswer, validatePracticeOptions,
    createPracticeCompletionId: () => createPracticeCompletionId({ randomUUID: () => id }),
    persistPracticeCompletion: options => persistPracticeCompletion({ ...options, storage, fetchImpl })
  });
  const file = ['A.9B', 'A.9C', 'A.9D', 'A.9E'].includes(skill) ? 'audit5-exponential-practice.js' : 'audit4-structured-practice.js';
  const source = fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace(/start\(\)\.catch\([\s\S]*$/, 'globalThis.__practiceReady = start();');
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  const api = {
    data, requests, run, setActive(s) { active = s; }, get refreshes() { return refreshes; },
    bind: () => run('auth()'), save: () => run('save()'),
    cachedAccess: () => run("counted.add(current().id); access(current())"),
    report: () => JSON.parse(data.get(pendingKey)),
    markup: () => element('#practiceSummary').innerHTML,
    retry: () => element('#practiceRetrySave').handlers.click(),
    async complete() {
      for (let i = 0; i < 5; i++) { run('els.answer.value = current().answer_key'); await run('check()'); await run('next()'); }
      return element('#practiceSummary').innerHTML;
    }
  };
  await run('globalThis.__practiceReady');
  return api;
}

for (const skill of ['A.6A', 'A.6B', 'A.6C', 'A.7A', 'A.7B', 'A.7C', 'A.8A', 'A.8B', 'A.9A', 'A.9B', 'A.9C', 'A.9D', 'A.9E']) {
  test(`${skill}: complete five mathematically correct answers and save an owned 100% result`, async () => {
    const f = await fixture(skill);
    const markup = await f.complete();
    assert.match(markup, /Saved to your Tolux progress dashboard/);
    const saves = f.requests.filter(r => r.url === '/api/lesson-progress');
    assert.equal(saves.length, 1);
    const report = JSON.parse(saves[0].options.body);
    assert.equal(report.mastery_score, 100);
    assert.equal(report.owner_user_id, owner.user.id);
    assert.equal(report.item_records.length, 5);
    assert.equal(f.data.has(pendingKey), false);
  });

  test(`${skill}: queue before request, retain offline result, and reuse its completion id on retry`, async () => {
    let offline = true;
    const f = await fixture(skill, { respond(url) {
      assert.equal(url, '/api/lesson-progress');
      assert.equal(f.report().owner_user_id, owner.user.id);
      if (offline) throw new Error('Offline');
      return response();
    } });
    await f.bind();
    assert.equal((await f.save()).synced, false);
    offline = false;
    assert.equal((await f.save()).synced, true);
    assert.deepEqual(f.requests.map(r => JSON.parse(r.options.body).completion_id), [id, id]);
    assert.equal(f.data.has(pendingKey), false);
  });

  test(`${skill}: account switch and sign-out block saves and counted-item access`, async () => {
    for (const next of [other, null]) {
      const f = await fixture(skill); await f.bind(); f.setActive(next);
      assert.equal(await f.cachedAccess(), false);
      assert.equal((await f.save()).synced, false);
      assert.equal(f.requests.length, 0);
      assert.equal(f.report().owner_user_id, owner.user.id);
    }
  });

  test(`${skill}: a same-owner 401 refresh retries once; repeated 401 stays queued`, async () => {
    for (const repeat of [false, true]) {
      let calls = 0;
      const f = await fixture(skill, { respond() { return ++calls === 1 || repeat ? response(401, {}) : response(); } });
      await f.bind();
      assert.equal((await f.save()).synced, !repeat);
      assert.equal(f.refreshes, 1);
      assert.equal(f.requests.length, 2);
      assert.deepEqual(f.requests.map(r => r.options.headers.Authorization), ['Bearer owner-token', 'Bearer fresh-token']);
      assert.equal(f.data.has(pendingKey), repeat);
    }
  });

  test(`${skill}: refresh to a different student never retries the original result`, async () => {
    const f = await fixture(skill, { refreshed: other, respond: () => response(401, {}) });
    await f.bind(); assert.equal((await f.save()).synced, false);
    assert.equal(f.requests.length, 1);
    assert.equal(f.report().owner_user_id, owner.user.id);
  });

  test(`${skill}: account changes during save or JSON parsing preserve the pending result`, async () => {
    for (const parsing of [false, true]) {
      const f = await fixture(skill, { respond() {
        if (!parsing) f.setActive(other);
        return { status: 200, ok: true, async json() { f.setActive(other); return { activity: { mastery_score: 80 } }; } };
      } });
      await f.bind(); assert.equal((await f.save()).synced, false);
      assert.equal(f.report().owner_user_id, owner.user.id);
    }
  });

  test(`${skill}: access refresh and response parsing cannot count work for a switched account`, async () => {
    const f = await fixture(skill, { respond() {
      f.setActive(other); return response(401, {});
    } });
    assert.equal(await f.run('access(current())'), false);
    assert.equal(f.refreshes, 0);
    assert.equal(f.run('counted.size'), 0);
    const g = await fixture(skill, { respond() { return { status: 200, ok: true, async json() {
      g.setActive(other); return { allowed: true, isSubscriber: true };
    } }; } });
    assert.equal(await g.run('access(current())'), false);
    assert.equal(g.run('counted.size'), 0);
  });

  test(`${skill}: unavailable device storage never produces a false saved-on-device message`, async () => {
    const f = await fixture(skill, { storageFails: true, respond(url) {
      return url === '/api/lesson-progress' ? response(503, {}) : response(200, { allowed: true });
    } });
    const markup = await f.complete();
    assert.match(markup, /could not be saved to your account or this device/);
    assert.doesNotMatch(markup, /Saved on this device/);
  });

  test(`${skill}: visible retry recovers a queued result without generating another attempt`, async () => {
    let offline = true;
    const f = await fixture(skill, { respond(url) {
      if (url === '/api/lesson-progress') {
        if (offline) return response(503, {});
        return response();
      }
      return response(200, { allowed: true, isSubscriber: true });
    } });
    assert.match(await f.complete(), /Saved on this device/);
    assert.match(f.markup(), /Retry progress save/);
    offline = false;
    await f.retry();
    assert.match(f.markup(), /Saved to your Tolux progress dashboard/);
    assert.equal(f.data.has(pendingKey), false);
    assert.deepEqual(f.requests.filter(r => r.url === '/api/lesson-progress').map(r => JSON.parse(r.options.body).completion_id), [id, id]);
  });
}

