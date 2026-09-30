import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DEFAULT_AUTH_CONFIG, resolvePublicAuthConfig, publicAuthConfigScript} from '../public-auth-config.mjs';
import {resolveSupabaseServerConfig} from '../supabase-server-config.mjs';
test('unset auth configuration preserves current production project', () => {
 assert.deepEqual(resolvePublicAuthConfig({}), DEFAULT_AUTH_CONFIG);
});
test('preview auth uses paired project and public key with matching storage', () => {
 const config=resolvePublicAuthConfig({SUPABASE_AUTH_URL:'https://preview-project.supabase.co/',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_preview'});
 assert.equal(config.url,'https://preview-project.supabase.co');
 assert.equal(resolveSupabaseServerConfig({authUrl:config.url,configuredUrl:config.url,hasServerKey:true}).ready,true);
 assert.equal(resolveSupabaseServerConfig({authUrl:config.url,configuredUrl:DEFAULT_AUTH_CONFIG.url,hasServerKey:true}).ready,false);
});
test('partial, unsafe, secret, and scoped configuration fails closed', () => {
 for(const env of [{SUPABASE_AUTH_URL:'https://preview.supabase.co'}, {SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}, ...['http://preview.supabase.co','https://evil.example','https://preview.supabase.co/path','https://user:password@preview.supabase.co','https://preview.supabase.co?key=secret'].map(url=>({SUPABASE_AUTH_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'})), {SUPABASE_AUTH_URL:'https://preview.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_private'}]) assert.throws(()=>resolvePublicAuthConfig(env));
});
test('browser payload contains only public fields and is immutable', () => {
 const window={};vm.runInNewContext(publicAuthConfigScript({...DEFAULT_AUTH_CONFIG,serviceRoleKey:'NEVER_EXPOSE'}),{window});
 assert.deepEqual(Object.keys(window.TOLUX_PUBLIC_CONFIG).sort(),['publishableKey','url']);
 assert.ok(Object.isFrozen(window.TOLUX_PUBLIC_CONFIG));
 assert.ok(!publicAuthConfigScript({...DEFAULT_AUTH_CONFIG,serviceRoleKey:'NEVER_EXPOSE'}).includes('NEVER_EXPOSE'));
});
test('every app HTML loads config before clients and no browser source hardcodes production auth', () => {
 for(const file of fs.readdirSync(new URL('../public/',import.meta.url))){
  if(file.endsWith('.js')){const source=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');assert.ok(!source.includes(DEFAULT_AUTH_CONFIG.url),file);assert.ok(!source.includes(DEFAULT_AUTH_CONFIG.publishableKey),file);}
  if(file.endsWith('.html')&&!file.startsWith('google')){const source=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');assert.ok(source.indexOf('/public-auth-config.js')>=0,file);const sdk=source.indexOf('supabase-js');if(sdk>=0)assert.ok(source.indexOf('/public-auth-config.js')<sdk,file);}
 }
});
