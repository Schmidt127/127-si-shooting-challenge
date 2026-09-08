# Production deployment trigger — 2026-09-08

Purpose: trigger the normal Git-linked Vercel Production deployment after Production was verified stale at commit `a56ce9e1af96241b7ab149ba735e4efb40b42279` while `master` was at `38bd1381f19c06d9095b50bd3fd9829eff7c0a49`.

This documentation-only commit changes no application behavior. It exists solely to cause Vercel to build the current `master`, which already contains the Structured Curriculum file-upload route from PR #486 and the subsequently merged reliability repairs.

Verification to perform after deployment:

- Vercel Production points to this commit or a descendant.
- `GET /shoot/api/curriculum/homework/upload-staging` is route-matched (expected 405, not 404).
- Athlete-facing Structured Curriculum handoff can proceed to staging/upload tests.
