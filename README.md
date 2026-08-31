# Tolux AI Math Coach — Algebra 1 Foundation

This repository contains the working Tolux student dashboard, structured A.5A
lesson, and the first production-shaped Algebra 1 practice cluster. The course
catalog maps the complete Texas Algebra 1 curriculum, but a mapped standard is
not considered instructionally complete until its lesson, practice bank,
assessment coverage, and evaluation evidence are implemented.

## What already works

- Responsive Tolux student dashboard
- Algebra 1 / Algebra 2 selection for the general AI coach
- General AI Tutor, Homework Help, and Check My Work prompts
- A complete seven-stage structured lesson for Algebra 1 TEKS A.5A
- Working Practice Mode for A.5A equations, A.5B inequalities, and A.5C systems
- Foundational, grade-level, challenging, and mixed practice difficulty
- 5-, 10-, and 20-question practice sessions
- First-attempt scoring, targeted hints, alternate explanations, worked review,
  and authenticated progress saving
- A versioned 10-unit catalog mapping all 49 Algebra 1 content expectations and
  embedding all seven A.1 mathematical process standards
- Chat-style tutoring area
- “I’m stuck,” “Explain another way,” and “Similar problem” controls
- Photo attachment and preview
- Persistent authenticated lesson-completion and mastery history
- Local Demo Mode for simple linear equations
- Optional live AI connection through the OpenAI Responses API
- Master tutoring rules enforced server-side, where students cannot edit them

## Honest feature status

| Area | Status | What that means |
| --- | --- | --- |
| Structured Tutor lesson | Live for A.5A | Full readiness-to-mastery lesson flow |
| Practice Mode | Live for A.5A–A.5C | Deterministic math generation, grading, help, review, usage gate, and progress |
| Algebra 1 course coverage | Mapped, not fully authored | All 49 standards have catalog modules; 46 still need instructional content |
| Homework Help | AI-coach workflow | Uses the general coach with the selected mode in its instructions |
| Check My Work | AI-coach workflow | Uses the general coach; a dedicated error-analysis workflow is still planned |
| Test Prep | Coming soon | Intentionally disabled until the assessment blueprint and item-quality checks exist |
| Algebra 2 | General AI coach only | A structured Algebra 2 curriculum has not been authored |

Do not describe the catalog map as a completed Algebra 1 course. It is the
coverage contract that prevents standards from being forgotten during build-out.

## Run it locally

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Run:

   npm install

4. For Demo Mode only:

   npm start

5. Open:

   http://localhost:3000

## Turn on live AI

Set the environment variable `OPENAI_API_KEY` before starting the server.

Never paste the API key into `public/app.js` or any browser-side file.

Example workflow:

1. Copy `.env.example` to a private environment configuration supported by your deployment platform.
2. Add your real OpenAI API key.
3. Restart the app.

The server uses the OpenAI Responses API and accepts both text and base64 image input.

## Preview-only internal QA sessions

Authorized testers can exercise the free-usage flow repeatedly without changing
`student_usage` when all of these server-side conditions are met:

- `VERCEL_ENV` is exactly `preview`.
- `INTERNAL_QA_ENABLED` is exactly `true`.
- The signed-in Supabase user UUID is listed in `INTERNAL_QA_USER_IDS` (a
  comma-separated UUID allowlist).
- `INTERNAL_QA_COOKIE_SECRET` is a private value of at least 32 characters.

An allowlisted tester must explicitly start a QA session from the dashboard.
The server then keeps the simulated 0-to-10 usage count in a signed, secure,
HTTP-only, host-only browser cookie. Lesson and coach requests use that simulated
count and do not read or write the tester's `student_usage` row while the QA
session is active. Ending the session deletes the cookie and immediately restores
the normal student gate.

The mechanism is disabled in production even if the other variables are present.
Do not place the cookie secret or the allowlist in browser-side code.

## Lesson progress storage

Apply `supabase/migrations/202608290001_create_lesson_completions.sql` to the
linked Supabase project before deploying code that uses persistent progress.
The server records one append-only completion per student attempt and uses a
client completion UUID to make retries idempotent. Browser storage is retained
only as an offline/retry bridge; the authenticated account record is the source
used by Dashboard and My Progress.

The `lesson_completions` table has row-level security enabled and no browser
policies. Only the server-side Supabase service role reads or writes it. Internal
preview QA completions are marked with `qa_mode` so test activity remains
identifiable without weakening the real student usage gate.

Practice sessions currently reuse this secured completion pipeline with a
`practice-` module prefix and per-question item records. That keeps lesson and
practice history visible without adding unreviewed production tables. Dedicated
longitudinal `skill_attempts` and `skill_mastery` tables remain a later schema
milestone.

## Algebra 1 curriculum architecture

- `public/algebra1-course.json` is the coverage contract for TEKS A.2–A.12.
- `public/course-core.mjs` validates and routes catalog modules.
- A module becomes a structured lesson only when it has `lesson` in
  `available_modes` and a reviewed `lesson_path`.
- A module becomes practice-ready only when it has `practice` in
  `available_modes` and a tested generator.
- A.1A–A.1G are cross-course process standards and must be evidenced inside
  instruction, feedback, and assessment—not treated as seven isolated topics.
- Planned modules remain visible in the data contract but are not presented to
  students as complete.

## Practice quality contract

Every live practice generator must provide:

1. Mathematically valid items with independently tested answer keys.
2. At least three cognitive levels plus a mixed session.
3. Equivalent-answer grading appropriate to the response type.
4. A smallest-useful hint, a genuinely different explanation, and a worked
   solution for review.
5. First-attempt scoring and misconception tags.
6. One usage charge per question, with help on the same question sharing that
   interaction.
7. Persistent, idempotent completion reporting through the authenticated server.

## Curriculum acceptance tests

Before inviting students, test at least:

- 25 one-step/two-step equation problems
- 25 linear-equation problems with fractions/negatives
- 25 Algebra 1 function/factoring problems
- 25 Algebra 2 quadratic/radical/exponential problems
- 20 deliberately incorrect student solutions for “Check My Work”
- 20 photographed worksheet problems

For every test, score:
1. Mathematical correctness
2. No skipped essential steps
3. Quality of explanation
4. Correct diagnosis of the first student error
5. Whether “I’m stuck” gives a hint rather than the answer
6. Final verification where appropriate

## Next build sequence

1. Run physical-phone QA for A.5A–A.5C Practice Mode and its free-usage boundary.
2. Add dedicated `skill_attempts` and `skill_mastery` storage after schema review.
3. Author the remaining modules unit by unit, beginning with prerequisite
   Algebraic Tools and the full linear-functions strand.
4. Add a teacher-reviewed item bank and automated mathematical/equivalence
   evaluation for every newly live standard.
5. Turn Homework Help and Check My Work into explicit, testable workflows rather
   than mode labels on a shared prompt.
6. Implement Test Prep only after mapping current assessment categories,
   blueprint proportions, timing, calculator policy, and reporting.
7. Add partner-facing coverage, quality, privacy, accessibility, and outcomes
   reports before institutional pilots.

## Important product rule

“We don’t just give you the answer. We teach you how to get there.”
