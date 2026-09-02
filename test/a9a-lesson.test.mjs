import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a9a-exponential-domain-range.json",import.meta.url),"utf8"));

test("A.9A resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a9a-exponential-domain-range");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a9a-exponential-domain-range.json")});
test("A.9A validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.9A covers the domain-range conceptual gate",()=>{for(const tag of ["domain_all_reals","zero_exclusion","positive_range","negative_range","vertical_shift_range","context_domain","domain_range_confusion"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.9A accepts common inequality and interval notation",()=>{for(const [id,answer] of [["A9A-D01","(-∞,∞)"],["A9A-L03","(6,∞)"],["A9A-G02","y<4"],["A9A-X11","[0,24]"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.9A answer keys are mathematically correct",()=>{const expected={"A9A-L01":"domain: all real numbers; range: y > 0","A9A-L02":"domain: all real numbers; range: y < 0","A9A-M03":"y > 7","A9A-M04":"y < -3","A9A-X12":"y > k"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.9A student-facing exponential notation uses superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^x|\^\(x/,item.id)});
