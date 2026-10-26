import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const publicDir = join(root, "public");
const catalog = JSON.parse(readFileSync(join(publicDir, "physics-course.json"), "utf8"));

const expected = [
  "5A","5B","5C","5D","5E","5F","5G","5H",
  "6A","6B","6C","6D","6E",
  "7A","7B","7C","7D","7E",
  "8A","8B","8C","8D","8E","8F","8G",
  "9A","9B","9C","9D"
];

test("Physics catalog covers all 29 Texas content TEKS exactly once", () => {
  const modules = catalog.units.flatMap(unit => unit.modules || []);
  const teks = modules.flatMap(module => module.teks || []);
  assert.equal(modules.length, 29);
  assert.equal(catalog.content_standard_count, 29);
  assert.deepEqual([...teks].sort(), [...expected].sort());
  assert.equal(new Set(teks).size, 29);
});

test("Every Physics module is available and points to a real structured lesson", () => {
  const modules = catalog.units.flatMap(unit => unit.modules || []);
  for (const module of modules) {
    assert.equal(module.status, "available", `${module.module_id} should be available`);
    assert.ok(module.available_modes?.includes("lesson"), `${module.module_id} should offer lesson mode`);
    assert.ok(module.lesson_path, `${module.module_id} should have lesson_path`);
    const lessonFile = join(publicDir, module.lesson_path.replace(/^\//, ""));
    assert.ok(existsSync(lessonFile), `${module.lesson_path} should exist`);
  }
});

test("Every Physics lesson follows the coaching contract", () => {
  const modules = catalog.units.flatMap(unit => unit.modules || []);
  for (const module of modules) {
    const lessonFile = join(publicDir, module.lesson_path.replace(/^\//, ""));
    const raw = readFileSync(lessonFile, "utf8");
    const lesson = JSON.parse(raw);
    assert.equal(lesson.course_id, "physics");
    assert.deepEqual(lesson.teks, module.teks);
    assert.ok(lesson.title);
    assert.ok(lesson.learning_goal);
    assert.ok(Array.isArray(lesson.stages) && lesson.stages.length >= 6, `${module.module_id} needs a complete staged lesson`);

    const guided = lesson.stages.find(stage => stage.id === "guided-practice");
    assert.ok(guided, `${module.module_id} needs guided practice`);
    assert.ok(guided.prompt, `${module.module_id} guided practice needs a prompt`);
    assert.ok(guided.hint, `${module.module_id} guided practice needs a hint`);
    assert.ok(guided.alternate_explanation, `${module.module_id} needs Explain Another Way content`);
    assert.ok(guided.answer, `${module.module_id} guided practice needs an answer key`);

    assert.equal(lesson.coach_rules?.teach_before_answering, true);
    assert.equal(lesson.coach_rules?.smallest_useful_hint_first, true);
    assert.equal(lesson.coach_rules?.offer_explain_another_way, true);
    assert.equal(lesson.coach_rules?.offer_similar_problem, true);
    assert.equal(lesson.coach_rules?.use_proper_math_notation, true);

    assert.equal(/\bSQRT\b/i.test(raw), false, `${module.module_id} contains raw SQRT notation`);
  }
});

test("Physics preview is wired without replacing the Math Coach shell", () => {
  const physicsHtml = readFileSync(join(publicDir, "physics.html"), "utf8");
  const indexHtml = readFileSync(join(publicDir, "index.html"), "utf8");
  assert.match(physicsHtml, /Tolux AI Physics Coach/);
  assert.match(physicsHtml, /physics-course\.json/);
  assert.match(physicsHtml, /I'm stuck/);
  assert.match(physicsHtml, /Explain another way/);
  assert.match(physicsHtml, /Similar problem/);
  assert.match(indexHtml, /Tolux AI Math Coach/);
  assert.match(indexHtml, /Open Physics Coach Preview/);
  assert.match(indexHtml, /href="\/physics\.html"/);
});
