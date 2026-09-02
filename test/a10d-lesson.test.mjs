import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a10d-equivalent-polynomial-forms.json",import.meta.url),"utf8"));

test("A.10D resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a10d-equivalent-polynomial-forms");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a10d-equivalent-polynomial-forms.json")});
test("A.10D validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.10D covers the complete equivalent-form gate",()=>{for(const tag of ["distribution","negative_distribution","combine_like_terms","multi_step_rewrite","gcf_rewrite","equivalence_test","property_reasoning","geometric_expression"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.10D accepts standard and typed exponent forms",()=>{for(const [id,answer] of [["A10D-L01","x^2+8x-9"],["A10D-G02","3x^2+8x"],["A10D-M01","5x^2-10x"],["A10D-X10","2x^2+4x-4"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.10D answer keys are algebraically correct",()=>{const expected={"A10D-L01":"x²+8x-9","A10D-L02":"3x(2x+3)","A10D-L03":"x²+5x+4","A10D-P04":"2x²+7x-15","A10D-M01":"5x²-10x","A10D-X10":"2x²+4x-4"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.10D student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[2-9]/,item.id)});
