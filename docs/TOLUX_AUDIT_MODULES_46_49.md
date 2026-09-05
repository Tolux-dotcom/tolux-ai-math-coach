# Tolux Standard Audit — Algebra 1 Modules 46–49

This is the final curriculum review batch for the 49-module Algebra 1 course. It also includes a targeted recheck of A.3F after owner feedback that students must see real coordinate-plane graphs while solving graphing-system problems.

## Modules reviewed

46. **A.9B — Interpret Exponential Parameters**
47. **A.9C — Write Growth and Decay Models**
48. **A.9D — Graph Exponential Functions**
49. **A.9E — Exponential Models for Data**

## Tolux-standard upgrades

### A.9B
- Exact growth and decay curves share the same initial value so `a=f(0)` is visible.
- The repeated factor `b` is connected visually to growth versus decay and percent interpretation.
- Lesson help and Practice Mode now use the current Hint 3, full-solution, alternative-explanation, first-attempt scoring, and review/continue standard.

### A.9C
- Exact growth and decay models are graphed from `f(x)=ab^x`.
- A value table shows the constant multiplicative ratio across equal input intervals.
- Growth uses `b=1+r`; decay uses `b=1-r`.

### A.9D
- Exact exponential curves include numbered axes, y-intercepts, and horizontal asymptotes.
- Parent growth/decay is compared with a vertically shifted example so students can see how `k` changes both y-intercept and asymptote.
- Curves approach rather than cross the asymptote in the standard transformed form.

### A.9E
- Exponential regression is taught with explicitly labeled illustrative learning data rather than fabricated source facts.
- The fitted learning model, residuals, interpolation, and extrapolation are shown together.
- Students are reminded to use technology for regression and to interpret `a` and `b` in context.

## Targeted A.3F recheck — real graphs while solving

A.3F now displays an actual numbered coordinate plane directly with lesson and Practice Mode problems, not only in the concept explanation. The graph renderer:

- parses the equations shown in the current question,
- graphs both lines on one consistent scale,
- handles slope-intercept, scaled `y` equations such as `2y=8x-2`, and standard form such as `3x+y=6`,
- displays crossing, parallel, and coincident-line cases accurately,
- marks a genuine intersection when one exists,
- updates as the student moves from question to question,
- remains scoped only to A.3F.

This means students can solve A.3F from the graph itself, as required by the Tolux visual-learning standard.

## Shared learning standard confirmed

- Actual graphs/visuals where the standard is graphical.
- Proper mathematical notation.
- Mathematically equivalent answers accepted where the requested representation permits them.
- `I'm Stuck` support with three levels and Hint 3 answer reveal.
- `Explain Another Way` gives a complete alternative route.
- Incorrect non-mastery responses show the verified answer and complete solution immediately.
- `Review Solution & Continue →` prevents students from being trapped.
- Mastery checks remain protected from premature answer reveal.
- Practice Mode supports 5/10/20 questions, first-attempt scoring, trial access, and progress save/sync.
- Visual injection uses bounded/scoped behavior; no broad page MutationObserver is introduced.

## Release gate

Keep the branch private and the pull request unmerged until the owner explicitly approves the final audit batch.