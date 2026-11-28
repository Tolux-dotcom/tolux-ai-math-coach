// Optional isolated integration test: requires Playwright and a local Chromium.
// No production URL, credentials, database or payment service is used.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(fileURLToPath(new URL('../../public/', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    assert.equal(req.method, 'GET');
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname}`);
    assert.ok(filename.startsWith(`${root}${path.sep}`));
    const content = await fs.readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;

async function runScenario(viewport, scenario) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const posts = [];
  const tokens = [];
  const unexpectedExternal = [];
  const signedIn = scenario !== 'guest';
  const originalSession = { access_token: 'synthetic-token', user: { id: 'synthetic-student' } };
  let session = signedIn ? originalSession : null;
  const refreshScenario = ['expired-retry', 'refresh-other-account'].includes(scenario);
  const queuedScenario = scenario === 'queued-retry' || scenario === 'account-replay' || refreshScenario;
  const refreshedSession = { access_token: scenario === 'refresh-other-account' ? 'other-synthetic-token' : 'fresh-synthetic-token',
    user: { id: scenario === 'refresh-other-account' ? 'other-student' : 'synthetic-student' } };
  let allowSave = false;
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname === '/npm/@supabase/supabase-js@2') {
      return route.fulfill({ contentType: 'text/javascript', body:
        `window.__qaSession = ${JSON.stringify(session)}; window.__qaRefreshCount = 0;
        window.supabase = { createClient: () => ({ auth: {
          getSession: async () => ({ data: { session: window.__qaSession }, error: null }),
          refreshSession: async () => { window.__qaRefreshCount++; window.__qaSession = ${JSON.stringify(refreshedSession)};
            return { data: { session: window.__qaSession }, error: null }; }
        } }) };` });
    }
    if (url.origin !== origin) {
      unexpectedExternal.push(url.origin);
      return route.abort();
    }
    if (url.pathname === '/public-auth-config.js') return route.fulfill({ contentType: 'text/javascript',
      body: 'window.TOLUX_PUBLIC_CONFIG = { url: "https://example.supabase.co", publishableKey: "sb_publishable_dummy" };' });
    if (url.pathname === '/assessment-progress.js' && scenario === 'missing-helper') return route.abort();
    if (url.pathname === '/api/lesson-progress') {
      assert.equal(request.method(), 'POST');
      const token = request.headers().authorization;
      assert.ok(['Bearer synthetic-token', 'Bearer fresh-synthetic-token'].includes(token), 'Never upload under the other account');
      tokens.push(token);
      posts.push(request.postDataJSON());
      return route.fulfill({ status: !allowSave ? 503 : refreshScenario && token === 'Bearer synthetic-token' ? 401 : 200, json: {} });
    }
    return route.continue();
  });
  try {
    await page.goto(`${origin}/test-prep.html`);
    await page.locator('[data-test-prep-mode="quick"]').click();
    for (let i = 1; i <= 10; i++) {
      assert.equal(await page.locator('#testProgressLabel').textContent(), `Question ${i} of 10`);
      const choices = page.locator('#questionChoices input');
      const multi = await choices.first().getAttribute('type') === 'checkbox';
      const required = multi ? Number((await page.locator('#questionMessage').textContent()).match(/Select (\d+)/)[1]) : 1;
      for (let index = 0; index < required; index++) await choices.nth(index).check();
      await page.locator(i === 10 ? '#submitTest' : '#nextTestQuestion').click();
    }
    await page.locator('#testResults').waitFor({ state: 'visible' });
    const summary = await page.locator('#scoreSummary').textContent();
    assert.match(summary, /points.*%/);
    const status = page.locator('#testPrepSaveStatus');
    const retry = page.locator('[data-test-prep-retry-save]');
    const expected = scenario === 'missing-helper' ? 'Progress could not be saved'
      : scenario === 'guest' ? 'Saved only on this device.' : 'Saved on this device for this account.';
    await status.filter({ hasText: expected }).waitFor();
    const before = await page.evaluate(() => ({ ...localStorage }));
    assert.equal(posts.length, queuedScenario ? 1 : 0);

    // Exercise the actual native dialog and real Retake listener, not function stubs.
    const cancelled = page.waitForEvent('dialog');
    const cancelClick = page.locator('#retakeQuickCheck').click();
    const dialog = await cancelled;
    assert.equal(dialog.type(), 'confirm');
    assert.match(dialog.message(), /not confirmed saved/);
    await dialog.dismiss();
    await cancelClick;
    assert.equal(await page.locator('#testResults').isVisible(), true);
    assert.equal(await page.locator('#scoreSummary').textContent(), summary);
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before);

    if (scenario === 'account-replay') {
      const queueKey = 'toluxTestPrepPendingProgress:v2:synthetic-student';
      const pendingBytes = before[queueKey];
      assert.deepEqual(JSON.parse(pendingBytes), [posts[0]]);
      session = null;
      let exitWarnings = 0;
      page.once('dialog', async exit => {
        assert.equal(exit.type(), 'beforeunload');
        exitWarnings++;
        await exit.accept();
      });
      await page.reload();
      assert.equal(exitWarnings, 1, 'Unconfirmed result must request a real exit warning');
      assert.equal((await page.evaluate(() => window.toluxTestPrepProgress.flushPending())).status, 'signed-out');
      assert.equal(posts.length, 1, 'Signed-out reload must not upload');
      assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before);

      session = { access_token: 'other-synthetic-token', user: { id: 'other-student' } };
      await page.reload();
      assert.equal((await page.evaluate(() => window.toluxTestPrepProgress.flushPending())).status, 'empty');
      assert.equal(posts.length, 1, 'Another account must not upload the original queue');
      assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before);

      session = originalSession;
      allowSave = true;
      await page.reload();
      await page.waitForFunction(key => localStorage.getItem(key) === '[]', queueKey);
      assert.equal(posts.length, 2, 'Original account should automatically replay once');
      assert.deepEqual(posts[1], posts[0], 'Reload must preserve the exact original report');
      const after = await page.evaluate(() => ({ ...localStorage }));
      assert.deepEqual(after, { ...before, [queueKey]: '[]' }, 'Only the acknowledged queue may change');
      console.log(JSON.stringify({ accountReplay: true, signedOutPosts: 0, otherAccountPosts: 0,
        originalAccountReplay: 1, exitWarnings, viewport }));
    } else if (scenario === 'refresh-other-account') {
      allowSave = true;
      await retry.click();
      await status.filter({ hasText: 'Saved on this device for this account.' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('[data-test-prep-retry-save]').disabled);
      assert.equal(await page.evaluate(() => window.__qaRefreshCount), 1);
      assert.equal(posts.length, 2, 'A different refreshed owner must not cause another POST');
      assert.deepEqual(posts[1], posts[0]);
      assert.deepEqual(tokens, ['Bearer synthetic-token', 'Bearer synthetic-token']);
      assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before);
      assert.equal(await retry.isVisible(), true);
      await retry.click();
      await status.filter({ hasText: 'Sign back into the original account' }).waitFor();
      assert.equal(posts.length, 2, 'Further Retry under another account must remain blocked');
      assert.equal(await page.evaluate(() => window.__qaRefreshCount), 1);
      assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before);
      assert.equal(await page.locator('#scoreSummary').textContent(), summary);
      console.log(JSON.stringify({ refreshOwnership: 'blocked-other-account', refreshCount: 1, viewport }));
    } else if (scenario === 'queued-retry' || scenario === 'expired-retry') {
      assert.equal(await retry.isVisible(), true);
      assert.equal(posts[0].module_id, 'test-prep-quick-check');
      assert.equal(posts[0].item_records.length, 10);
      const percent = Number(summary.match(/(\d+)%/)[1]);
      assert.equal(posts[0].mastery_score, percent);
      allowSave = true;
      await retry.click();
      await status.filter({ hasText: 'Saved to your Tolux progress dashboard.' }).waitFor();
      assert.equal(await retry.isVisible(), false);
      assert.equal(posts.length, scenario === 'expired-retry' ? 3 : 2);
      for (const report of posts) assert.deepEqual(report, posts[0], 'Retry must send the exact same completion');
      if (scenario === 'expired-retry') {
        assert.equal(await page.evaluate(() => window.__qaRefreshCount), 1);
        assert.deepEqual(tokens, ['Bearer synthetic-token', 'Bearer synthetic-token', 'Bearer fresh-synthetic-token']);
        console.log(JSON.stringify({ refreshOwnership: 'same-account-recovered', refreshCount: 1, viewport }));
      }
      const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('toluxTestPrepPendingProgress:v2:synthetic-student')));
      assert.deepEqual(queue, []);
      let prompted = false;
      page.once('dialog', async prompt => { prompted = true; await prompt.dismiss(); });
      await page.locator('#retakeQuickCheck').click();
      assert.equal(await page.locator('#testRunner').isVisible(), true);
      assert.equal(prompted, false);
    } else {
      assert.equal(await retry.isVisible(), scenario === 'missing-helper');
      const accepted = page.waitForEvent('dialog');
      const acceptClick = page.locator('#retakeQuickCheck').click();
      await (await accepted).accept();
      await acceptClick;
      assert.equal(await page.locator('#testRunner').isVisible(), true);
      assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before, 'Discard must not delete stored records');
    }
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpectedExternal, [], 'All external traffic must be intercepted or blocked');
    console.log(JSON.stringify({ scenario, viewport, passed: true, postCount: posts.length }));
  } finally { await context.close(); }
}

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}), headless: true,
    args: ['--no-sandbox', '--disable-background-networking'] });
  console.log(`Isolated Chromium ${browser.version()}; loopback static files and synthetic responses only.`);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const scenario of ['queued-retry', 'missing-helper', 'guest', 'account-replay', 'expired-retry', 'refresh-other-account']) await runScenario(viewport, scenario);
  }
  console.log('Browser smoke: 12/12 scenarios passed. Narrow viewport is not physical-phone QA.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
