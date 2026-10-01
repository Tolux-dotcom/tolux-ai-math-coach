import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../public/diagnostic-free-access.js', import.meta.url), 'utf8');
function clientFor(text, session = null) {
  const original = { data: { session }, error: null };
  const supabase = { createClient: () => ({auth: { getSession: async () => original, refreshSession: async () => original }}) };
  vm.runInNewContext(source, {window: {supabase}, document: {querySelector: () => ({textContent: text})}});
  return supabase.createClient().auth;
}
test('anonymous diagnostic bridge is scoped to authored items and has no user identity', async () => {
  for (const id of ['A5A-D01', 'A5A-D02']) {
    const auth = clientFor(id);
    for (const method of ['getSession', 'refreshSession']) {
      const result = await auth[method]();
      assert.equal(result.data.session.access_token, 'tolux-free-diagnostic');
      assert.equal(result.data.session.user, null);
    }
  }
  for (const text of ['', 'A5A-G01', 'A8A-D01']) {
    assert.equal((await clientFor(text).getSession()).data.session, null);
  }
});
test('diagnostic bridge preserves a real signed-in identity', async () => {
  const session = {access_token: 'real-session', user: {id: 'student'}};
  const auth = clientFor('A5A-D01', session);
  assert.equal((await auth.getSession()).data.session, session);
  assert.equal((await auth.refreshSession()).data.session, session);
});
