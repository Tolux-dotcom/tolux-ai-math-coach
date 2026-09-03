import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a10e-factor-trinomials.json",import.meta.url),"utf8"));

test("A.10E resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a10e-factor-trinomials");assert.ok(entry.available_modes.includes("lesson"));assert.ok(entry.available_modes.includes("practice"));assert.equal(entry.lesson_path,"/a10e-factor-trinomials.json")});
test("A.10E validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.10E covers the complete factoring gate",()=>{for(const tag of ["factor_pairs","gcf_first","perfect_square","sign_reasoning","nonmonic_grouping","verification","real_factor_check","context_factorization"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.10E accepts standard and typed exponent forms",()=>{for(const [id,answer] of [["A10E-D01","(x+3)(x+4)"],["A10E-L03","(2x-3)^2"],["A10E-G03","2(x-2)^2"],["A10E-X08","x^2-4x-12"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.10E answer keys are algebraically correct",()=>{const expected={"A10E-L01":"(x-4)(x+3)","A10E-L02":"(3x+1)(2x+3)","A10E-L03":"(2x-3)²","A10E-M02":"(3x-2)(2x+1)","A10E-X07":"(x+1-√2)(x+1+√2)","A10E-X11":"3(2x-3)(2x+3)"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.10E student-facing powers use superscripts",()=>{for(const item of module.items){assert.doesNotMatch(item.prompt,/\^[2-9]/,item.id);assert.doesNotMatch(item.answer_key,/\^[2-9]/,item.id)}});
