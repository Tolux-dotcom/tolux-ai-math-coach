import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a9d-graph-exponential-functions.json",import.meta.url),"utf8"));

test("A.9D resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a9d-graph-exponential-functions");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a9d-graph-exponential-functions.json")});
test("A.9D validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.9D covers the complete graphing gate",()=>{for(const tag of ["y_intercept","growth_decay_shape","horizontal_asymptote","table_points","shifted_features","end_behavior","asymptote_crossing","range_from_graph","graph_to_equation"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.9D accepts common graph-feature responses",()=>{for(const [id,answer] of [["A9D-D01","0,3"],["A9D-G02","-6"],["A9D-G03","x=-1 y=3"],["A9D-X09","x=2"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.9D graph features are mathematically correct",()=>{const expected={"A9D-L01":"(-1,1/2), (0,1), (1,2)","A9D-L02":"y-intercept (0,5); asymptote y=2; decay","A9D-P04":"y=6(2ˣ)-4","A9D-M03":"(0,1), (1,5)","A9D-X11":"y<6"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.9D student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[a-z]|\^\(/i,item.id)});
