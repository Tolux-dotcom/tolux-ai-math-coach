import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { findCourseModule } from "../public/course-core.mjs";
import { validateLessonModule, answersEquivalent } from "../public/lesson-core.mjs";

const catalog=JSON.parse(fs.readFileSync(new URL("../public/algebra1-course.json",import.meta.url),"utf8"));
const module=JSON.parse(fs.readFileSync(new URL("../public/a9b-interpret-exponential-parameters.json",import.meta.url),"utf8"));

test("A.9B resolves as a structured lesson",()=>{const entry=findCourseModule(catalog,"alg1-a9b-interpret-exponential-parameters");assert.ok(entry.available_modes.includes("lesson"));assert.equal(entry.lesson_path,"/a9b-interpret-exponential-parameters.json")});
test("A.9B validates with 30 unique items",()=>{assert.deepEqual(validateLessonModule(module),[]);assert.equal(module.items.length,30);assert.equal(new Set(module.items.map(item=>item.id)).size,30);assert.equal(module.lesson_settings.mastery_item_ids.length,5)});
test("A.9B covers the full parameter-interpretation gate",()=>{for(const tag of ["initial_value","growth_decay","factor_to_rate","interval_interpretation","factor_rate_confusion","parameter_units"]){assert.ok(module.items.some(item=>item.diagnostic_tag===tag),tag);assert.ok(module.misconception_routes[tag],tag)}});
test("A.9B accepts common factor and rate responses",()=>{for(const [id,answer] of [["A9B-D01","a=200"],["A9B-D03","0.12"],["A9B-G02","6 percent"],["A9B-X12","30 min"]])assert.equal(answersEquivalent(answer,module.items.find(item=>item.id===id)),true,id)});
test("A.9B answer keys are mathematically correct",()=>{const expected={"A9B-L01":"initial population 4800; 3% growth per year","A9B-L02":"initial value $24,000; 14% decrease per year","A9B-P02":"28%","A9B-M02":"18% decrease","A9B-M05":"35% decrease"};for(const [id,answer] of Object.entries(expected))assert.equal(module.items.find(item=>item.id===id).answer_key,answer,id)});
test("A.9B student-facing exponential notation uses superscripts",()=>{for(const item of module.items)assert.doesNotMatch(item.prompt,/\^x|\^t|\^h|\^m|\^d|\^w/,item.id)});
