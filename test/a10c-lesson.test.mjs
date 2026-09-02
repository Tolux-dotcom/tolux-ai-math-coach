import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a10c-divide-polynomials.json",import.meta.url),"utf8"));

test("A.10C resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a10c-divide-polynomials");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a10c-divide-polynomials.json")});
test("A.10C validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.10C covers the complete division gate",()=>{for(const tag of ["monomial_quotient","exponent_subtraction","termwise_division","long_division","synthetic_division","missing_term_placeholder","remainder_interpretation","multiplication_check"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.10C accepts standard and typed exponent forms",()=>{for(const [id,answer] of [["A10C-D01","3x^3"],["A10C-L02","x^2+2x+3"],["A10C-M03","2x^2+3x-2"],["A10C-X08","x^2+2"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.10C answer keys are algebraically correct",()=>{const expected={"A10C-L01":"2x²-3x+4","A10C-L02":"x²+2x+3","A10C-L03":"x²-x-2","A10C-P04":"2x²+x-3 remainder -2","A10C-M04":"x²-4","A10C-X11":"3x²+2x+1"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.10C student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[2-9]/,item.id)});
