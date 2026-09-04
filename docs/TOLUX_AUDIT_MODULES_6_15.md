# Tolux Lesson-Standard Audit — Modules 6–15

Audit basis: the owner-approved Tolux lesson standard established from A.12A and later QA: visual-first teaching; topic-appropriate diagrams and actual graphs where graph interpretation is part of the skill; comprehensive progressive help; Hint 3 answer reveal; a genuinely useful Explain Another Way; correct answer and full solution after a checked incorrect non-mastery attempt; a visible Review Solution & Continue path; proper mathematical notation; acceptance of mathematically equivalent answers where the skill permits it; 5/10/20 Practice Mode; first-attempt scoring; and saved progress. Lesson mastery checks retain assessment integrity and do not receive premature answer reveals.

## Module 6 — A.10D Equivalent Polynomial Forms

**Result: UPGRADED.** The lesson bank was already academically substantial, but the module did not have the visual/help/practice layer now expected by the Tolux standard. Added a visual forward-and-reverse equivalence model (distribution and GCF factoring), like-term grouping, full progressive help, immediate non-mastery solution reveal, Review Solution & Continue, dedicated 5/10/20 Practice Mode, progress sync, and scoped polynomial term-order normalization for expanded answers.

## Module 7 — A.10E Factor Trinomials

**Result: PASS after alignment.** The X/AC paper-method visual was already one of the strongest Tolux visuals and is preserved. The audit adds current non-mastery attempt-flow behavior and dedicated audited Practice Mode so Hint 3, full solution reveal, Explain Another Way, first-attempt scoring, and Review Solution & Continue follow the same standard as newer lessons. Existing accepted factor-order variations remain intact.

## Module 8 — A.10F Difference of Two Squares

**Result: PASS after attempt-flow alignment.** Existing difference-of-squares visuals and dedicated Practice Mode remain intact. The audit aligns the older Practice Mode behavior so the first checked wrong response now leads to a complete solution and a visible continue path instead of requiring an additional unsuccessful attempt.

## Module 9 — A.12A Identify Functions

**Result: PASS after consistency hardening.** This remains the benchmark Tolux lesson. Mapping, graph, and vertical-line-test visuals plus dedicated Practice Mode are preserved. The lesson feedback layer now explicitly uses the current Review Solution & Continue behavior and disconnects its feedback observer before DOM rewrites.

## Module 10 — A.12B Evaluate Function Notation

**Result: PASS after consistency hardening.** Function-machine visual instruction, negative-input parentheses, substitution steps, dedicated Practice Mode, immediate full practice feedback, Hint 3, Explain Another Way, and progress saving were already present. The lesson feedback layer is aligned with the current continue behavior and safe observer pattern.

## Module 11 — A.12C Terms of Arithmetic and Geometric Sequences

**Result: PASS after consistency hardening.** Existing visual comparison of repeated difference versus repeated ratio, 5/10/20 Practice Mode, Hint 3, complete solutions, and progress saving remain. The lesson now explicitly gives Review Solution & Continue after a checked wrong non-mastery response.

## Module 12 — A.12D Write Sequence Formulas

**Result: PASS after consistency hardening.** Proper subscript notation, arithmetic and geometric nth-term formula visuals, keyboard-friendly accepted forms, Practice Mode, and progress saving remain. The lesson attempt-flow is aligned with the current Tolux standard.

## Module 13 — A.12E Solve Literal Equations

**Result: PASS after consistency hardening.** Existing isolate-the-target-variable visual, balance/inverse-operation framing, Practice Mode, full explanations, and progress are preserved. The lesson now uses the same immediate solution-and-continue flow after an incorrect non-mastery check.

## Module 14 — A.2A Linear Domain and Range

**Result: PASS after consistency hardening.** The lesson already includes an actual coordinate-plane SVG with horizontal domain and vertical range projections, plus contextual restriction teaching and Practice Mode. The audit aligns the feedback/continue behavior with the latest standard.

## Module 15 — A.2B Write Lines from Points and Slope

**Result: PASS after consistency hardening.** Existing coordinate-plane SVG, plotted line, visible rise/run triangle, point-slope and slope-intercept relationships, Practice Mode, and progress are preserved. The lesson attempt-flow is aligned with the latest Tolux standard.

## Safety and regression notes

- New scripts are scoped to Modules 6–15 or their TEKS Practice Mode routes.
- A.10D polynomial canonicalization does not rewrite factored expressions, equations, inequalities, or prose responses; it is limited to safe expanded-polynomial cases.
- A.10E and A.10F factorization forms continue to use their existing accepted-answer banks.
- Lesson mastery answers are not prematurely revealed by the audit overlays.
- Updated feedback observers disconnect before their own DOM writes to prevent self-trigger loops.
- Existing authentication, trial/subscription access, progress storage, and Supabase sync remain in place.
- The audit does not change module order, TEKS mapping, subscription structure, or production behavior until the owner approves this audit batch.