# A.8A guided and independent solution QA — 2026-10-25

## Scope

This draft completes the student-facing support for the seven A.8A guided and independent practice items only:

- three or more progressive hints per item;
- a primary worked solution with three or more steps;
- a distinct alternate method with two or more steps; and
- final equations that grade as equivalent to each verified answer key.

No authentication, billing, entitlement, progress, database, price, or production configuration was changed.

## Automated evidence

- Regression-first check on the untouched bank: 10 of 11 A.8A lesson tests passed; the new gate failed as expected because `A8A-G01` had no primary solution.
- Focused lesson and launch checks: `node --test test/a8a-lesson.test.mjs test/practice-launch.test.mjs` — 21 of 21 passed.
- Syntax check: `npm run check` — passed.
- Complete repository suite: `npm test` — 492 of 492 passed, with no failures or skips. Current `main` passed 490 of 490 before this branch; the two additional passing tests are the new authoring and mathematical-validation gates.
- Mathematical validation substitutes both roots for all seven items into their original equations, covering 14 verified roots.

The first complete-suite attempt in the isolated worktree could not load the repository's Stripe development dependency. Running `npm ci` from the existing manifest installed the locked dependencies; the unchanged suite then passed 492 of 492. This was a local worktree setup issue, not an A.8A test failure.

## Safe local HTTP QA

- `/practice.html?skill=A.8A` returned HTTP 200.
- `/a8a-solve-quadratic-equations.json` returned HTTP 200 and exactly matched the authored bank.
- Unauthenticated GET and POST requests to `/api/lesson-progress` both returned HTTP 401, preserving the existing access boundary.

## Remaining approval gates

This makes A.8A a structurally authored candidate; it does not establish production-complete instruction by itself. Before approval, use a signed-in non-production account on desktop and phone to verify:

1. hints appear progressively for all seven items;
2. an incorrect answer reveals the primary solution in the correct order;
3. **Explain Another Way** shows a genuinely different method;
4. **Similar Problem** still launches and grades correctly;
5. mastery failure routes to remediation and reassessment; and
6. the resulting progress survives sign-out and sign-in.

