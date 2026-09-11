import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GROWTH_ACCESS_PATH, resolveGrowthAccess } from '../growth-admin-access.mjs';

test('uses a non-diagnostic route for growth admin navigation', () => {
  assert.equal(GROWTH_ACCESS_PATH, '/api/admin/growth-access');
});

test('requires an authenticated user without calling the admin lookup', async () => {
  let lookupCalled = false;
  const result = await resolveGrowthAccess(null, async () => {
    lookupCalled = true;
    return { authorized: true };
  });

  assert.equal(lookupCalled, false);
  assert.deepEqual(result, { status: 401, body: { error: 'Please sign in.' } });
});

test('hides authorization details from non-admin accounts', async () => {
  const result = await resolveGrowthAccess(
    { id: 'student-user' },
    async () => ({
      authorized: false,
      databaseMatch: false,
      environmentMatch: false,
      previewQaMatch: false,
      lookupError: 'sensitive database detail'
    })
  );

  assert.deepEqual(result, { status: 404, body: { error: 'Not found.' } });
  assert.equal(JSON.stringify(result).includes('sensitive database detail'), false);
});

test('returns only the minimum response for an authorized admin', async () => {
  const result = await resolveGrowthAccess(
    { id: 'admin-user' },
    async userId => ({
      authorized: userId === 'admin-user',
      databaseMatch: true,
      environmentMatch: false,
      previewQaMatch: false
    })
  );

  assert.deepEqual(result, { status: 200, body: { authorized: true } });
});

test('removes the temporary diagnostic endpoint from server and browser sources', async () => {
  const sources = await Promise.all([
    readFile(new URL('../growth-server-hooks.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../growth-server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../public/growth-autowire.js', import.meta.url), 'utf8')
  ]);

  for (const source of sources) {
    assert.doesNotMatch(source, /growth-auth-debug/);
  }
  assert.match(sources[0], /GROWTH_ACCESS_PATH/);
  assert.match(sources[2], /\/api\/admin\/growth-access/);
});
