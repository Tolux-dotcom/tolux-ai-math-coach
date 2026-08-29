# Tolux AI Math Coach — Phase 1 MVP

This starter is a working local web prototype for the approved Tolux AI Math Coach concept.

## What already works

- Responsive Tolux student dashboard
- Algebra 1 / Algebra 2 selection
- Tutor Mode, Homework Help, Practice Mode, Test Prep, Check My Work
- Chat-style tutoring area
- “I’m stuck,” “Explain another way,” and “Similar problem” controls
- Photo attachment and preview
- Persistent authenticated lesson-completion and mastery history
- Local Demo Mode for simple linear equations
- Optional live AI connection through the OpenAI Responses API
- Master tutoring rules enforced server-side, where students cannot edit them

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

## Phase 1 acceptance tests

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

## Next build

1. Add Supabase authentication and student accounts.
2. Expand persistent skill mastery into longitudinal skill-level analytics.
3. Add curriculum/topic picker.
4. Add structured practice generation and scoring.
5. Add teacher-quality eval suite.
6. Deploy private beta.
7. Add paid plans only after quality and safety testing.

## Important product rule

“We don’t just give you the answer. We teach you how to get there.”
