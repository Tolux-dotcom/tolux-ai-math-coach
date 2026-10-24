# A.10F worked-practice solution QA — 2026-10-24

## Scope

This change completes the primary `solution_steps` for the seven guided and independent A.10F Difference of Two Squares items:

- Guided: `A10F-G01`, `A10F-G02`, `A10F-G03`
- Independent: `A10F-P01`, `A10F-P02`, `A10F-P03`, `A10F-P04`

Each solution identifies the applicable structure, shows the required factoring decisions, and finishes at an answer already accepted by the shared mathematical grader. Existing progressive hints and alternate explanations remain intact and distinct.

## Executed checks

- Regression-first check: the new solution-quality assertion failed on the untouched bank (`5/6` passing) because all seven items lacked `solution_steps`.
- Focused lesson and runtime tests after authoring: `10/10` passing.
- Repository syntax checks: passing.
- Full repository suite on the branch: `490/490` passing.
- Current `main` baseline: `490/490` passing.
- Local non-production HTTP smoke test:
  - `/practice.html?skill=A.10F`: `200`
  - `/a10f-difference-of-squares.json`: `200` and byte-for-byte equal to the authored bank
  - unauthenticated `GET /api/lesson-progress`: `401`
  - unauthenticated `POST /api/lesson-progress`: `401`

## Safety and limitations

- No production deployment, database write, payment, authentication, entitlement, pricing, or progress-persistence code changed.
- Existing student records are untouched.
- This evidence makes A.10F a conservative structurally authored-cycle candidate; it does **not** by itself establish production-complete instruction.
- Before approval, a signed-in student should verify on desktop and phone that all three hints reveal in order, a wrong attempt reveals the primary solution, **Explain Another Way** remains meaningfully different, **Similar Problem** works, mastery routes to remediation/recheck correctly, and the resulting progress survives sign-out and sign-in.
