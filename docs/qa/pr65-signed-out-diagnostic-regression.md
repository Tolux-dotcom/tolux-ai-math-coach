# PR #65 signed-out diagnostic regression

## Observed failure

Physical desktop QA on 2026-09-03 showed the Free Algebra Diagnostic at A5A-D01 (`Simplify 3(x + 4).`) still displaying **Sign in required** after `3x+12` was entered while signed out.

## Root cause

The server correctly granted A5A-D01/A5A-D02 before authentication, but the browser's `fetchWithLessonSession()` helper returned before making `/api/lesson-usage` when no Supabase session existed. The existing diagnostic fetch shim therefore never had a request to intercept.

## Fix

`public/diagnostic-free-access.js` now provides a narrowly scoped anonymous bridge session only while A5A-D01 or A5A-D02 is visibly active. This allows the existing lesson request path to reach the server's anonymous diagnostic access check. It does not create or persist a user account and disappears immediately outside those two diagnostic items. Real signed-in sessions are preserved unchanged.

## Regression coverage

- Signed-out A5A-D01/A5A-D02 receive the anonymous bridge.
- The bridge disappears on non-diagnostic items.
- A real signed-in session is never replaced.
- Non-diagnostic lessons do not receive anonymous access.
- The diagnostic bridge loads before `lesson.js`.
- The lesson request includes the current item ID.

## Merge control

Do not merge PR #65 until the updated Vercel preview is retested while signed out on desktop and a physical phone.
