import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const server = read('server.mjs');
const app = read('public/app.js');
const index = read('public/index.html');
const robots = read('public/robots.txt');

test('browser and server validate sessions against the same Supabase project', () => {
  const projectUrl = 'https://xnadszfvjkyxltskywin.supabase.co';
  assert.match(app, new RegExp(projectUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(server, new RegExp(projectUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(server, /const supabaseAuth = createClient\(/);
  assert.match(server, /supabaseAuth\.auth\.getUser\(token\)/);
  assert.doesNotMatch(server, /supabaseAdmin\.auth\.getUser\(token\)/);
});

test('static launch page identifies the product as Algebra 1A and Algebra 1B before JavaScript runs', () => {
  assert.match(index, /Algebra 1A/);
  assert.match(index, /Modules 1–27/);
  assert.match(index, /Algebra 1B/);
  assert.match(index, /Modules 28–49/);
  assert.doesNotMatch(index, /Algebra 2/);
});

test('public site has an explicit crawler policy', () => {
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
});
