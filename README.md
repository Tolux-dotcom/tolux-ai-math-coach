# Tolux AI Math Coach — Phase 1 MVP

This starter is a working local web prototype for the approved Tolux AI Math Coach concept.

## What already works

- Responsive Tolux student dashboard
- Algebra 1 / Algebra 2 selection
- Tutor Mode, Homework Help, Practice Mode, Test Prep, Check My Work
- Chat-style tutoring area
- “I’m stuck,” “Explain another way,” and “Similar problem” controls
- Photo attachment and preview
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
2. Store sessions and skill mastery.
3. Add curriculum/topic picker.
4. Add structured practice generation and scoring.
5. Add teacher-quality eval suite.
6. Deploy private beta.
7. Add paid plans only after quality and safety testing.

## Important product rule

“We don’t just give you the answer. We teach you how to get there.”
