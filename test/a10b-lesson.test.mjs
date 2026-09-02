import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a10b-multiply-polynomials.json",import.meta.url),"utf8"));

test("A.10B resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a10b-multiply-polynomials");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a10b-multiply-polynomials.json")});
test("A.10B validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.10B covers the complete multiplication gate",()=>{for(const tag of ["exponent_rule","monomial_distribution","complete_distribution","binomial_product","signed_binomial_product","binomial_trinomial_product","square_of_binomial","missing_middle_term","product_degree","area_model"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.10B accepts standard and typed exponent forms",()=>{for(const [id,answer] of [["A10B-D01","x^5"],["A10B-L02","2x^2+5x-12"],["A10B-M04","x^3-x^2-10x+12"],["A10B-X11","9x^2-6x+1"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.10B answer keys are algebraically correct",()=>{const expected={"A10B-L01":"x²+8x+15","A10B-L02":"2x²+5x-12","A10B-L03":"x³-x²-2x+8","A10B-P04":"2x³+x²+7x+15","A10B-M04":"x³-x²-10x+12","A10B-X11":"9x²-6x+1"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.10B student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[2-9]/,item.id)});
