import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  findCourseModule,
  flattenCourseModules,
  practiceModules,
  validateCourseCatalog
} from "../public/course-core.mjs";

const catalog = JSON.parse(
  await readFile(
    new URL("../public/algebra1-course.json", import.meta.url),
    "utf8"
  )
);

test("Algebra 1 catalog maps all 49 content expectations exactly once", () => {
  const modules = flattenCourseModules(catalog);
  const standards = modules.map(module => module.teks[0]);

  assert.equal(catalog.units.length, 10);
  assert.equal(modules.length, 49);
  assert.equal(new Set(standards).size, 49);
  assert.deepEqual(validateCourseCatalog(catalog), []);

  const expectedCounts = {
    2: 9,
    3: 8,
    4: 3,
    5: 3,
    6: 3,
    7: 3,
    8: 2,
    9: 5,
    10: 6,
    11: 2,
    12: 5
  };

  for (const [strand, count] of Object.entries(expectedCounts)) {
    assert.equal(
      standards.filter(code => code.startsWith(`A.${strand}`)).length,
      count,
      `A.${strand} should contain ${count} expectations`
    );
  }
});

test("all seven process standards are embedded across the course", () => {
  assert.deepEqual(
    catalog.embedded_process_standards.map(standard => standard.teks),
    ["A.1A", "A.1B", "A.1C", "A.1D", "A.1E", "A.1F", "A.1G"]
  );
});

test("A.5A routes to the existing lesson and A.5A-A.5C route to practice", () => {
  const a5a = findCourseModule(catalog, "alg1-a5a-linear-equations");
  assert.equal(a5a.lesson_path, "/a5a-linear-equations.json");
  assert.deepEqual(a5a.available_modes, ["lesson", "practice"]);

  assert.deepEqual(
    practiceModules(catalog).map(module => module.teks[0]),
    ["A.5A", "A.5B", "A.5C"]
  );

  const nonLive = flattenCourseModules(catalog).filter(
    module => !["A.5A", "A.5B", "A.5C"].includes(module.teks[0])
  );
  assert.ok(nonLive.every(module => module.status === "planned"));
  assert.ok(nonLive.every(module => module.available_modes.length === 0));
});
