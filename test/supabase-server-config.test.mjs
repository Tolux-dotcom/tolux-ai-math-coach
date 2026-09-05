import test from "node:test";
import assert from "node:assert/strict";
import { resolveSupabaseServerConfig } from "../supabase-server-config.mjs";

const AUTH_URL = "https://xnadszfvjkyxltskywin.supabase.co";

test("uses the authenticated browser project when SUPABASE_URL is omitted", () => {
  const config = resolveSupabaseServerConfig({
    authUrl: AUTH_URL,
    configuredUrl: undefined,
    hasServerKey: true
  });

  assert.deepEqual(config, {
    authProjectUrl: AUTH_URL,
    serverProjectUrl: AUTH_URL,
    ready: true,
    reason: "ready",
    clientUrl: AUTH_URL
  });
});

test("accepts a trailing slash for the same Supabase project", () => {
  const config = resolveSupabaseServerConfig({
    authUrl: `${AUTH_URL}/`,
    configuredUrl: `${AUTH_URL}/`,
    hasServerKey: true
  });

  assert.equal(config.ready, true);
  assert.equal(config.clientUrl, AUTH_URL);
});

test("disables privileged access when projects do not match", () => {
  const config = resolveSupabaseServerConfig({
    authUrl: AUTH_URL,
    configuredUrl: "https://another-project.supabase.co",
    hasServerKey: true
  });

  assert.equal(config.ready, false);
  assert.equal(config.reason, "project-mismatch");
  assert.equal(config.clientUrl, null);
});

test("disables privileged access for malformed or scoped project URLs", () => {
  for (const configuredUrl of [
    "not-a-url",
    "http://xnadszfvjkyxltskywin.supabase.co",
    `${AUTH_URL}/rest/v1`,
    `${AUTH_URL}?unexpected=true`
  ]) {
    const config = resolveSupabaseServerConfig({
      authUrl: AUTH_URL,
      configuredUrl,
      hasServerKey: true
    });

    assert.equal(config.ready, false, configuredUrl);
    assert.equal(config.reason, "invalid-server-url", configuredUrl);
    assert.equal(config.clientUrl, null, configuredUrl);
  }
});

test("disables privileged access when the server key is absent", () => {
  const config = resolveSupabaseServerConfig({
    authUrl: AUTH_URL,
    configuredUrl: AUTH_URL,
    hasServerKey: false
  });

  assert.equal(config.ready, false);
  assert.equal(config.reason, "missing-server-key");
  assert.equal(config.clientUrl, null);
  assert.equal("serverKey" in config, false);
});
