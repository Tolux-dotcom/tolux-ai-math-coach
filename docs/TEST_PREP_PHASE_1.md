# Tolux Algebra 1 Test Prep — Phase 1

## Purpose
Phase 1 turns the existing disabled **Test Prep — Coming soon** dashboard mode into a private owner-QA preview for Texas Algebra I STAAR / EOC preparation.

The feature intentionally reuses the audited Tolux Algebra 1 lesson bank rather than creating a disconnected second curriculum. Test items are selected from existing guided, independent, and mastery items with accepted answers and worked solutions.

## Current official blueprint basis
Texas Education Agency Algebra I STAAR blueprint, effective as of academic year 2022–23:

- Reporting Category 1 — Number and Algebraic Methods: 9–11 questions, 9–14 points.
- Reporting Category 2 — Describing and Graphing Linear Functions, Equations and Inequalities: 10–12 questions, 10–16 points.
- Reporting Category 3 — Writing and Solving Linear Functions, Equations and Inequalities: 12–14 questions, 12–18 points.
- Reporting Category 4 — Quadratic Functions and Equations: 9–11 questions, 9–14 points.
- Reporting Category 5 — Exponential Functions and Equations: 5–7 questions, 5–9 points.
- Total: 50 questions, 59 points.
- 41 one-point questions and 9 two-point questions on the official blueprint.

Source: https://tea.texas.gov/student-assessment/staar/staar-algebra-i-blueprint.pdf

The 2025–2026 STAAR Test Administrator Manual states that test sessions should generally be scheduled for three to four hours, students are expected to complete assessments in about three hours, and students who need more time may continue within the regularly scheduled school day subject to the stated limits. Tolux therefore uses an elapsed practice clock rather than claiming an official countdown limit.

Source: https://tea.texas.gov/student-assessment/test-administration/2026-staar-test-administrator-manual.pdf

The 2026 STAAR calculator policy requires access to a graphing calculation device throughout Algebra I STAAR.

Source: https://tea.texas.gov/student-assessment/staar/2026-staar-calculator-policy.pdf

## Phase 1 modes

### Quick Practice
- 12-question sample across all five reporting categories.
- Intended as a fast readiness check.

### Domain Practice
- 10-question focused set in one reporting category.
- Samples different TEKS and can draw more than one item from a standard when needed.

### Full Algebra 1 EOC Simulation
- 50 questions.
- Target question distribution: RC1 10, RC2 11, RC3 13, RC4 10, RC5 6.
- Nine Tolux questions are weighted at two points so the practice total is 59 points.
- Phase 1 two-point items use all-or-nothing Tolux auto-grading. This is explicitly disclosed in the student UI and is not represented as TEA's exact partial-credit/new-question-type scoring behavior.

## Student result experience
- overall Tolux practice score;
- reporting-category score breakdown;
- missed-item review;
- correct answer and existing Tolux step-by-step solution;
- direct remediation link to the exact TEKS lesson;
- local Test Prep attempt history for the latest 20 sessions.

The result page explicitly states that a Tolux percentage is **not** an official STAAR scale score or performance-level prediction.

## Graph quality
A.3F system questions receive an actual numbered coordinate plane generated from the equations in the current test question. Intersecting, parallel, and same-line equation forms continue to use the corrected equation parser from the audited A.3F work rather than a generic decorative graph.

## Safety and product boundaries
- No TEA copyrighted released item bank is copied into Tolux.
- Tolux uses original questions from its own audited lesson modules.
- UI states that Tolux is independent and is not affiliated with or endorsed by TEA.
- Production remains unchanged until owner approval.

## Phase 2 candidates
- STAAR new-question-type interactions and partial-credit rubrics;
- richer graph/table/scatterplot item widgets beyond A.3F;
- server-synced Test Prep attempt history and parent/teacher reporting;
- performance-level estimation only if grounded in current official raw-score conversion data and clearly labeled as an estimate;
- test-day calculator/reference-material practice tools.
