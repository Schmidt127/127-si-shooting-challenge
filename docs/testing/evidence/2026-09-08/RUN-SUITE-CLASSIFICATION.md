# SC-007/008 Run Suite — Failure Classification (Wave B8)

**Date:** 2026-09-08  
**Suite:** `tools/testing/sc-007-008/run-suite.js`

| Test | Status | Classification | Action |
|------|--------|----------------|--------|
| sc-007-idempotency-proof-pack | PASS | — | — |
| sc-008-failure-path-pack | FAIL (Lambda subprocess) | **missing environment** | PYTHONPATH must include `lambda/upload-asset/tests` for `season_support`; `boto3` required |
| upload-make-lambda-response | PASS | — | — |
| agent4-xp-dedupe-matrix | PASS | — | — |
| 072-074-email-helpers | PASS | — | — |
| 072-weekly-xp-reconciliation | FAIL → **fixed** | **outdated test** | Updated expected version v4.8 → v4.9.2 to match master 072 source |
| paste-bundle-integrity | FAIL | **operator UI required** | 057 deploy paste bundle drift from source — regenerate paste from source (Mike/Omni), not a logic defect |
| expected-actual-offline | PASS | — | — |

**Net after Wave B fixes:** 6/8 PASS with env deps; paste-bundle remains operator action.

Do not weaken paste-bundle assertions — drift is real.
