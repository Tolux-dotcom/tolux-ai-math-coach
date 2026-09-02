import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a10a-add-subtract-polynomials.json",import.meta.url),"utf8"));

test("A.10A resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a10a-add-subtract-polynomials");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a10a-add-subtract-polynomials.json")});
test("A.10A validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.10A covers the complete polynomial-combination gate",()=>{for(const tag of ["like_terms","coefficient_arithmetic","subtract_distribution","polynomial_addition","polynomial_subtraction","missing_terms","leading_term_cancellation","standard_form","exponent_combination_error"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.10A accepts standard and typed exponent forms",()=>{for(const [id,answer] of [["A10A-D01","-2x^2"],["A10A-L01","5x^2-x+5"],["A10A-M03","5x^2-8x+8"],["A10A-X11","5x^2-2x-6"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.10A answer keys are algebraically correct",()=>{const expected={"A10A-L01":"5x²-x+5","A10A-L02":"4x²+8x-11","A10A-P04":"x²+4x-12","A10A-M03":"5x²-8x+8","A10A-X11":"5x²-2x-6"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.10A student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^2/,item.id)});
