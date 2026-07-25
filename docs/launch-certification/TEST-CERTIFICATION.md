# Test Certification

**Date:** 2026-07-25  
**Branch:** `launch/final-production-certification`  
**Base master:** `267d4736a95b47273d3439a89665bd9855675395`

## Summary

| Area | Result | Notes |
|------|--------|-------|
| WAS email contracts | **PASS** | includes new schedule-on-contract |
| C-011 schedule tests | **PASS** | 118 v1.5 Live arming |
| Agent 4 QC suite | **PASS** | 20/20 |
| Reliability Command Center | **PASS** | all fixtures |
| Season Launch Control | **PASS** | 26/26 |
| Data-model field contracts | **PASS** | |
| Config selection | **PASS** | |
| Homework contracts | **PASS** | |
| Automation contracts | **PASS** | |
| Web lint | **PASS** | eslint |
| Web unit tests | **PASS** | 121/121 |
| Web typecheck | **PASS** | after `npm ci` |
| Web production build | **PASS** | after `npm ci` |
| Python airtable pytest | **WARN** | collection error in `tools/airtable/_preview/_h3_patch_test.py` (preview scratch; not launch blocker) |

## Commands (exact)

```bash
node tests/was-email-contracts/run-all.js
node --test airtable/automations/shooting-challenge/lib/c011-weekly-email-schedule.test.js
node tools/testing/run-agent4-suite.js
node tests/reliability-command-center/run-all.js
node --test tests/challenge-year/season-launch-control.test.js
node --test tests/data-model/*.test.js
node --test tests/config-selection/*.test.js
node tests/homework-contracts/run-all.js
node --test tests/automation-contracts/*.test.js
cd web && npm ci && npm run lint && npm run typecheck && npm test -- --run && npm run build
```

## Remediation applied this session

1. Rewrote UTF-16 `schedule-on-contract.test.js` to UTF-8.
2. Aligned schedule-on assertions to master 118 (`{ name: sendMode }`).
3. Fixed `docs/automation-index.md` 118/119 versions to **v1.5**.
4. Clean `npm ci` in `web/` restored missing UI deps for typecheck/build.

## Live public smoke (not unit tests)

| Check | Result |
|-------|--------|
| https://www.hoopchallenges.com/shoot | **PASS** (landing renders) |
| /shoot/api/airtable | **PASS** `ok:true` tokenValid base `appn84…` |
| /shoot/leaderboard | **PASS** season label + Schmidt row visible |

## Not re-run as full Live PROD write smoke this session

Controlled Schmidt write workflows remain in [LIVE-SMOKE-EVIDENCE.md](./LIVE-SMOKE-EVIDENCE.md) with prior verified_prod vs BLOCKED-for-reconfirm.