import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a9e-exponential-regression.json",import.meta.url),"utf8"));

test("A.9E resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a9e-exponential-regression");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a9e-exponential-regression.json")});
test("A.9E validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.9E covers the complete data-modeling gate",()=>{for(const tag of ["model_selection","technology_setup","parameter_interpretation","prediction","residual","interpolation_extrapolation","extrapolation_reliability","context_domain"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.9E accepts common regression responses",()=>{for(const [id,answer] of [["A9E-D03","residual=-3"],["A9E-G02","y=72"],["A9E-P04","b=1.074"],["A9E-X09","4 people"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.9E answer keys are mathematically correct",()=>{const expected={"A9E-L01":"y=4(2ˣ)","A9E-L02":"1389","A9E-G02":"72","A9E-P02":"102.4","A9E-M02":"360","A9E-M03":"3.2"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.9E student-facing powers use superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^[a-z]|\^\(/i,item.id)});
