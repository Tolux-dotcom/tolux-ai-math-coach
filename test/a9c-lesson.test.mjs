import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a9c-write-exponential-models.json",import.meta.url),"utf8"));

test("A.9C resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a9c-write-exponential-models");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a9c-write-exponential-models.json")});
test("A.9C validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.9C covers the complete modeling gate",()=>{for(const tag of ["coefficient_and_base","growth_rate_to_factor","decay_rate_to_factor","growth_context_model","decay_context_model","table_model","rate_as_base","interval_conversion"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.9C accepts standard and typed equation forms",()=>{for(const [id,answer] of [["A9C-D01","f(x)=80(1.5^x)"],["A9C-G02","P(t)=1200(1.06^t)"],["A9C-P02","M(h)=160(0.75^h)"],["A9C-X12","P(t)=100(2^(t/3))"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.9C answer keys are mathematically correct",()=>{const expected={"A9C-L01":"B(t)=500(1.04ᵗ)","A9C-L02":"V(t)=20000(0.82ᵗ)","A9C-L03":"y=6(1.5ˣ)","A9C-M04":"y=10(1.6ˣ)","A9C-M05":"f(t)=500(0.80ᵗ)"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.9C student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[a-z]|\^\(/i,item.id)});
