# Tolux Lesson-Standard Audit — Modules 1–5

Audit basis: the owner-approved Tolux lesson standard established from A.12A and later QA: visual-first instruction; comprehensive progressive help; Hint 3 answer reveal; a genuinely different Explain Another Way; correct answer and full solution after a checked incorrect non-mastery attempt; a visible continue path after review; proper mathematical notation; acceptance of mathematically equivalent answers where the skill permits it; Practice Mode; and saved progress.

## Module 1 — A.11A Simplify Numerical Radicals

**Result: PASS after retrofit.** The lesson bank and dedicated practice bank were already strong. The audit found that the existing `a11a-visual.js` file was not loaded by `lesson.html`, so students were missing the visual perfect-square-factor ladder. The visual is now wired into the lesson. Lesson and Practice Mode also receive the Tolux attempt-flow upgrade so Hint 3 reveals the answer and an incorrect checked attempt reveals the complete solution with a continue path.

## Module 2 — A.11B Laws of Exponents

**Result: PASS after attempt-flow alignment.** Existing exponent visuals, scoped superscript rendering, lesson content, and dedicated Practice Mode remain intact. The audit adds the current Tolux answer-reveal/continue behavior to lesson and practice so the older module follows the same post-attempt experience as newer lessons.

## Module 3 — A.10A Add and Subtract Polynomials

**Result: UPGRADED.** Added a visual column-alignment model for x², x, and constant terms; explicit subtraction/sign-distribution teaching; topic-specific progressive hints; Hint 3 answer reveal; full alternate explanation; immediate full solution after an incorrect checked attempt; Review Solution & Continue; dedicated 5/10/20 Practice Mode; and scoped polynomial-equivalence normalization so harmless term-order differences are not marked wrong.

## Module 4 — A.10B Multiply Polynomials

**Result: UPGRADED.** Added a 2×2 box/area model so visual learners can see all four partial products before combining like terms. Added the same Tolux help, answer-reveal, continue, Practice Mode, and equivalent-expanded-polynomial grading standard as Module 3.

## Module 5 — A.10C Divide Polynomials

**Result: UPGRADED.** Added a paper-style polynomial long-division scaffold with divide → multiply → subtract → bring down, missing-power alignment, and multiply-back verification. Added comprehensive help, answer reveal, Review Solution & Continue, dedicated Practice Mode, and polynomial/remainder normalization while preserving representation-sensitive answers such as a requested `0x²` placeholder.

## Safety and regression notes

- New scripts are tightly scoped to Modules 1–5 or their TEKS practice routes.
- Polynomial answer normalization does not attempt to rewrite equations, inequalities, factored expressions, or prose answers.
- Mastery-check lesson responses are not prematurely revealed by the lesson retrofit; mastery integrity remains preserved.
- Feedback observers disconnect before DOM rewrites to avoid self-triggering observer loops.
- Existing authentication, trial/subscription gating, and progress synchronization remain in place.
