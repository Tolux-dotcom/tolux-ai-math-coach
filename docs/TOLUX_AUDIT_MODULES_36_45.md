# Tolux Lesson-Standard Audit — Modules 36–45

Audit basis: the owner-approved Tolux lesson standard established from the A.12A benchmark and subsequent QA. Required behaviors include mathematically exact visuals; comprehensive progressive help; Hint 3 answer reveal with complete reasoning; a genuinely different Explain Another Way; immediate correct answer and full solution after a checked incorrect non-mastery attempt; a visible Review Solution & Continue path; proper notation; acceptance of mathematically equivalent answers where the skill permits it; 5/10/20 Practice Mode; first-attempt scoring; saved progress; mastery integrity; and bounded/targeted DOM observers.

## Module 36 — A.5C Solving Systems of Linear Equations
**PASS after retrofit.** Added an exact coordinate-plane visual for y=x+1 and y=7−x, with the verified intersection (3,4). Added dedicated audited 5/10/20 Practice Mode using the existing A.5C generator. Wrong checked responses immediately show the correct ordered pair and full worked reasoning, while first-attempt scoring remains preserved.

## Module 37 — A.6A Quadratic Domain and Range
**PASS after visual retrofit.** Added exact upward- and downward-opening parabolas on a consistent scale. The visual explicitly connects vertex and opening direction to range while preserving all-real domain for unrestricted quadratics.

## Module 38 — A.6B Write Quadratics from a Vertex and Point
**PASS after visual retrofit.** Added an exact graph of y=(x−1)²−2 with vertex (1,−2) and point (3,2), directly connecting the picture to vertex form y=a(x−h)²+k and solving for a.

## Module 39 — A.6C Write Quadratics from Solutions and Graphs
**PASS after visual retrofit.** Added an exact graph of y=(x−1)(x−3), marking zeros 1 and 3 and vertex (2,−1), so students can see zeros ↔ factors ↔ x-intercepts.

## Module 40 — A.7A Graph Quadratics and Identify Key Features
**PASS after visual retrofit.** Added an exact graph of y=(x−1)²−4 showing vertex, axis of symmetry, distinct zeros, y-intercept, and increasing/decreasing behavior.

## Module 41 — A.7B Connect Factors and Zeros
**PASS after visual retrofit.** Added an exact graph of y=(x+1)(x−2) and marks x=−1 and x=2 as the x-intercepts, reinforcing the factor/zero/intercept chain.

## Module 42 — A.7C Transform the Quadratic Parent Function
**PASS after strict graph-accuracy retrofit.** Added y=x², y=2x², y=−x², and y=(x−2)²+1 on the same coordinate scale. The parent and transformed graphs use exact mathematical functions rather than decorative line approximations. Vertex (2,1) is explicitly marked for the translated graph.

## Module 43 — A.8A Solve Quadratic Equations
**PASS after retrofit.** Added an exact graph of y=x²−5x+6 with zeros 2 and 3, connects those x-intercepts to factoring, and displays the quadratic formula x=(−b±√(b²−4ac))/(2a) with discriminant meaning.

## Module 44 — A.8B Quadratic Models for Data
**PASS after retrofit.** Added a clearly labeled illustrative scatterplot with a mathematically defined quadratic trend curve. The lesson distinguishes interpolation from extrapolation and does not present illustrative points as measured external data.

## Module 45 — A.9A Exponential Domain and Range
**PASS.** Preserved the previously approved A.9A visual system, which already includes actual exponential graphs for positive/negative coefficients, growth/decay, vertical shifts, asymptotes, and interval notation support. No duplicate or lower-quality graph was added.

## Shared lesson-help audit
- A.5C through A.9A now use a scoped audit helper for the current Tolux post-attempt standard.
- Non-mastery wrong answers reveal the correct answer and full solution immediately, then expose **Review Solution & Continue →**.
- Hint 3 reveals the answer and complete reasoning.
- Explain Another Way adds topic-specific alternate conceptual framing plus the worked steps.
- Mastery Check is explicitly protected from premature answer reveal.
- The feedback observer watches only `#lessonFeedback`, disconnects before its own DOM writes, then reconnects.

## Practice Mode audit
- A.5C now has dedicated audited 5/10/20 generated practice.
- A.6A–A.9A use audited structured practice drawn from their verified lesson banks.
- All audited practice preserves first-attempt scoring, usage/trial gating, progress save/sync, Hint 3, Explain Another Way, immediate full solution after a checked wrong answer, and Review Solution & Continue.

## Regression/safety notes
- New visual injection uses bounded polling (maximum 120 attempts), not a broad MutationObserver.
- Every mathematical graph added in this audit is generated from its stated function on one consistent coordinate scale.
- A.9A retains the existing approved visual implementation.
- Existing authentication, subscription/trial gating, course routes, module IDs, and progress architecture remain unchanged.