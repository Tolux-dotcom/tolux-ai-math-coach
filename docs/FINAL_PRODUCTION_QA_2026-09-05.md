# Tolux AI Math Coach — Final Production QA

Date: 2026-09-05

## Scope

Final release-readiness review after completion of the 49-module Algebra 1 audit. The pass covers production deployment health, public route availability, session/auth architecture, Algebra 1A/1B product identity, lesson/practice routing, A.3F graph availability, progress/entitlement code paths, and launch hygiene.

## Production baseline

- Production commit before this QA branch: `2e77d86407f6ce4ee942f4bfaa98059870851e9a`.
- Production deployment: `dpl_ZZ26aYd9ZptU6jA5dxjmEnHfvc47`.
- Vercel state: READY.
- Production alias includes `mathcoach.tolux.org`.
- Vercel runtime-error aggregation for the preceding 24 hours reported no runtime error clusters.
- Public dashboard, A.3F lesson route, and A.9E Practice Mode route each returned HTTP 200 during this QA pass.

## Blocker found and corrected on QA branch

### Browser/server Supabase authentication mismatch risk

The production server was validating browser bearer tokens through the privileged environment-dependent Supabase admin client. The browser itself is pinned to the Tolux Supabase project `xnadszfvjkyxltskywin`. A stale or mismatched server URL could therefore reproduce the earlier false sign-in/401 failure after a successful browser sign-in.

The QA branch now:

- verifies bearer tokens with a dedicated non-persistent Supabase auth client tied to the same project used by the browser;
- keeps the server-only service credential isolated to database access;
- logs a project-mismatch diagnostic without exposing credentials;
- includes regression coverage preventing auth verification from reverting to `supabaseAdmin.auth.getUser(token)`.

Integrated through QA-only PR #91. QA branch merge commit: `2daf327b85a236931e80eba592f13dfd195b966e`.

## Product-identity issue corrected on QA branch

The static HTML still advertised an Algebra 2 course before the runtime Algebra 1A/1B rewrite executed. That was inconsistent with the approved product plan and could create a visible flash, no-JavaScript mismatch, or incorrect search-engine copy.

The QA branch now renders the correct identity directly in the HTML:

- Algebra 1A — Modules 1–27
- Algebra 1B — Modules 28–49
- Complete Algebra 1 SEO copy only

The existing bounded runtime split remains in place and is compatible with this static markup.

## A.3F verification

Production lesson markup includes `a3f-problem-graphs.js`, and Practice Mode also loads the same A.3F graph layer. The previously approved equation-parser regression coverage remains in the repository for intersecting, parallel, and coincident systems.

## Practice and lesson routing

The production Practice Mode router includes the audited paths through A.9E, including the final exponential Practice Mode. Public route checks returned HTTP 200 for the A.9E practice page and A.3F lesson page.

## Runtime-log review

The observed 404 requests were limited to:

- `/favicon.ico` — browser/site-icon hygiene;
- `/robots.txt` — crawler policy;
- `/api/internal-qa/session` — expected for signed-in users who are not on the private QA allowlist because the endpoint intentionally hides itself with 404.

This QA branch adds `public/robots.txt`, eliminating the crawler-policy 404 after release. The favicon request remains a low-severity launch-hygiene follow-up and does not affect learning, auth, progress, or payment flows.

## Regression coverage added

`test/final-production-qa.test.mjs` checks:

- browser and server Supabase project alignment;
- dedicated server auth-client token validation;
- absence of admin-client token validation;
- static Algebra 1A/1B identity before JavaScript runs;
- no static Algebra 2 copy;
- crawler policy presence.

Vercel successfully built/deployed each QA-branch commit. There is no GitHub Actions workflow attached to this repository commit, so Vercel READY is the automated deployment signal available in this pass.

## Manual authenticated checks still required before merge to production

Because this QA session does not possess the owner's test-account password or an authenticated browser session, the following must be confirmed once in the protected preview before the QA branch is merged to `main`:

1. Sign in successfully and remain signed in after navigating into a readiness diagnostic.
2. Submit the first diagnostic response and verify no false sign-in prompt appears.
3. Complete a short lesson and confirm progress saves and appears on the dashboard.
4. Complete a 5-question Practice Mode session and confirm first-attempt score/progress persistence.
5. Use Student Plan and Family Plan buttons and confirm each opens the correct Stripe checkout without an auth loop.
6. Recheck A.3F once in the preview with one intersecting and one parallel system.
7. Check one physical-phone portrait flow for dashboard → lesson → Practice Mode → return to dashboard.

## Non-blocking technical debt

- The catalog still contains historical `planned` statuses for some modules while dashboard bridge files promote approved modules at runtime. The completed audit and bridge chain currently expose the curriculum, but consolidating the catalog into one authoritative all-49-live source should be a separate cleanup PR after launch QA.
- `server.mjs` contains older duplicated tutor-instruction wording, including an obsolete Algebra 2 reference. The dashboard/product scope is Algebra 1 only; prompt cleanup should be handled separately unless owner QA exposes a user-facing issue.
- Add a real favicon asset/link to remove the remaining `/favicon.ico` noise.

## Release gate

Do not merge the final QA branch to production until the owner explicitly approves after the authenticated preview checks above.
