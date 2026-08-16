# Reliability Packages — Master Readiness (2026-08-16)

**Status:** Repository preparation complete — live Production work pending  
**Branch:** `cursor/prepare-remaining-reliability-packages-69fc`  
**Authority:** [`AUTHORITY-MAP.md`](../AUTHORITY-MAP.md) · [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)

This document coordinates five active reliability packages for tomorrow's
Production work. It does not claim live certification, activation, or paste
completion.

## Package status matrix

| Package | Scope | Status | Branch / PR | Repository tests | Paste packet | Live test needed | Owner | Rollback link |
|---|---|---|---|---|---|---|---|---|
| **PKG-038** | Streak + shot-milestone corrected-history XP (053/054/066/059) | Repository-ready; Production paste blocked until explicit release | Merged: `cursor/pkg-038-streak-milestone-reliability-d4ea` | `airtable/automations/shooting-challenge/lib/pkg-038-*.test.js` | [`PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md`](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md) | Yes — controlled Schmidt fixture after 006R/036 release | Mike | Packet § Paste order — OFF 053/054/059/066; no delete |
| **Communications Hub — DAILY_SUBMISSION** | 031 → 076 → 079 daily handoff | Repository-ready; **not production-proven until Gate 3 passes** | Merged: `agent/daily-submission-hub-handoff` | `tests/email/automation-076-offline.test.mjs` (12/12 PASS); `automation-079-offline.test.mjs` (3/7 PASS — **4 failures are a pre-existing `remoteFetchAsync` mock/harness gap**, not a Production proof claim) | [`PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md) | Yes — isolated 076 → 079 manual proof (Gate 3) | Mike | Turn OFF 076/079; preserve queue rows |
| **PKG-039** | First-time setup + scheduled checks (001→031→032→010→118) | Repository-ready; goal-link repair partial 2026-08-15; first-create/scheduler proof open | This PR | `tests/reliability/pkg-039-first-setup-scheduled-checks.test.js`, `audit-pkg-039-*.test.js` | [`PKG-039-FIRST-TIME-SETUP-SCHEDULED-CHECKS-PRODUCTION-PACKET.md`](./PKG-039-FIRST-TIME-SETUP-SCHEDULED-CHECKS-PRODUCTION-PACKET.md) (+ WAS child packet) | Yes — one test athlete Lane A | Mike | Packet § Rollback — OFF writers only; no delete |
| **PKG-009** | New-school-year / season-scope safety | Repository-ready; Mike decision | This PR | `tests/challenge-year/pkg-009-season-scope-safety.test.js`, `audit-pkg-009-*.test.js` | [`PKG-009-SEASON-SCOPE-SAFETY-PRODUCTION-PACKET.md`](./PKG-009-SEASON-SCOPE-SAFETY-PRODUCTION-PACKET.md) | Yes — read-only attestation + public readback | Mike | Packet § Rollback — restore PI/Config/Fillout state |
| **PKG-037** | Final 12-step end-to-end certification | Repository-ready packet; **do not run live yet** | Merged base + this PR expansion | `tests/pipeline/core-certification-orchestration.test.mjs` | [`PKG-037-CORE-APPLICATION-PRODUCTION-CERTIFICATION.md`](./PKG-037-CORE-APPLICATION-PRODUCTION-CERTIFICATION.md) | Yes — full controlled athlete after gates | Mike | Packet §7 Stop/rollback — preserve all evidence |

## Recommended execution order for tomorrow

```text
GATE 0 — Read-only baseline (all packages)
  ├─ audit-pkg-009-season-readiness.js
  ├─ audit-pkg-039-first-setup-scheduled-checks.js
  ├─ audit-counted-submission-xp-standings-reliability.js
  └─ Record registering PI + Config attestation (PKG-009)

GATE 1 — PKG-009 season scope (read-only + attestation)
  └─ Must pass before any new-season public scope work

GATE 2 — PKG-039 Lane A (first-record + 118 dryRun)
  ├─ Depends: PKG-006R ✅, PKG-036 ✅ (locks released)
  └─ Email/Make path OFF during proof

GATE 3 — Communications Hub DAILY_SUBMISSION (isolated; required before Hub is treated as production-proven)
  ├─ Depends: PKG-039 Lane A Submission + WAS baseline for test athlete
  ├─ 076 → 079 only; 077 remains retired
  ├─ Offline boundary: automation-079-offline.test.mjs has 4/7 failures from a
  │    pre-existing remoteFetchAsync mock/harness gap on master — not Production proof
  └─ Manual pass criteria (all required tomorrow):
       1. Exactly one Email Handoff Queue row at Status = Ready with Handoff Key
          DAILY_SUBMISSION|SUBMISSIONS|{Submission RID}
       2. Exactly one accepted Hub request from Automation 079 (079 statusOut success)
       3. Exactly one Hub Message record for that handoff key
       4. Exactly one Delivery result (Sent or documented provider outcome)
       5. Replay of the same key reuses Event/Message/Delivery — no duplicate send
  Until Gate 3 passes, do not claim Communications Hub DAILY_SUBMISSION is
  production-proven.

GATE 4 — PKG-038 streak/milestone paste (if Mike releases)
  ├─ Depends: no competing lifetime-XP observation window
  └─ 053 → 054 → 066 → 059 enable order

GATE 5 — PKG-037 twelve-step certification (single controlled athlete)
  ├─ Depends: Gates 1–3; Step 7 additionally requires Gate 4
  └─ Do not start until Mike opens worksheet + preflight §4
```

## Explicit dependency gates (nothing proceeds on assumptions)

| Gate | Condition | Blocks |
|---|---|---|
| G-PI | Exactly one Registering Shooting Challenge Program Instance | PKG-009 activation, PKG-037 Steps 9–10, public readback |
| G-CFG | Exactly one active Config; School Year matches registering PI | PKG-009, automations using config selection |
| G-WKS | No overlapping active Weeks in registering PI | 005, 031, 118 scheduler |
| G-WAS | Exactly one canonical WAS per Enrollment + Week | 010, 035, 057, 076, 118 |
| G-XP-SUB | `SUBMISSION_XP\|{Submission}` sole owner = 010 | PKG-039 first XP, PKG-037 Step 3 |
| G-EMAIL-OFF | 072/074/079/119/Make OFF during PKG-039 Lane A | Prevents false weekly/daily send during integrity proof |
| G-038 | Mike explicit release + audit preflight PASS | PKG-038 paste; PKG-037 Step 7 |
| G-HUB | Gate 3 manual proof complete (see execution order § Gate 3) | PKG-037 Step 11; any claim that Communications Hub DAILY_SUBMISSION is production-proven |

## Coordination notes (do not duplicate active branches)

| Branch | Already merged to master | Do not redo |
|---|---|---|
| `cursor/pkg-038-streak-milestone-reliability-d4ea` | Lifecycle contracts, 053 first-create handoff, audit hardening | Do not re-edit 053/054/059/066 source in this PR |
| `agent/daily-submission-hub-handoff` | 031 daily-email readiness + PKG-006 promotion docs | Do not re-edit 076/079 handoff keys |
| `cursor/pkg-039-was-reliability-fa99` | WAS ownership tests, 057/058 alignment | WAS weekly-goal packet remains canonical for 032/030 |
| `cursor/pkg-037-core-certification-5f19` | Base certification packet | This PR expands to 12-step matrix only |

## Remaining Airtable actions for tomorrow (Mike only)

1. Run three read-only audits; save JSON to dated evidence folder.
2. Attest registering PI + Config + Weeks export (PKG-009 checklist).
3. Execute PKG-039 Lane A on one test athlete with email path disabled.
4. Execute Communications Hub DAILY_SUBMISSION isolated proof (076 → 079).
5. If released: paste/enable PKG-038 in dependency order with audit between steps.
6. Open PKG-037 worksheet; run twelve-step certification only after gates pass.
7. Record all evidence in operator worksheets; update Completion Master rows.

## Blockers and assumptions

| Item | Type | Notes |
|---|---|---|
| PKG-009 live activation | Mike decision | Repository packet ready; no auto-activation |
| PKG-038 Production paste | Gate | Requires explicit Mike release |
| PKG-037 Step 6 (Zoom) | Complete — consume evidence | **PKG-034 Zoom live-attendance is complete in Production.** Step 6 uses existing PKG-034 completion evidence ([`PKG-034-ZOOM-LIVE-ATTENDANCE-PRODUCTION-PACKET.md`](./PKG-034-ZOOM-LIVE-ATTENDANCE-PRODUCTION-PACKET.md)); re-verify only if the certification run exposes a Step 6 failure |
| PKG-037 Step 7 | Gate | Requires PKG-038 paste approval |
| Gate 3 Communications Hub | Gate | DAILY_SUBMISSION not production-proven until manual 076→079 proof passes (see Gate 3 criteria) |
| V2-013 multi-year schema | Deferred | Reported as future recommendation only |
| Temporary Early Bird fixture | Ops | Must be shortened/replaced before 2027 launch |

## Validation commands (repository)

```bash
node tests/reliability/pkg-039-first-setup-scheduled-checks.test.js
node tests/challenge-year/pkg-009-season-scope-safety.test.js
node airtable/extension-scripts/audits/audit-pkg-039-first-setup-scheduled-checks.test.js
node airtable/extension-scripts/audits/audit-pkg-009-season-readiness.test.js
node --test tests/pipeline/core-certification-orchestration.test.mjs
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
node --test tests/email/automation-076-offline.test.mjs
node --test tests/email/automation-079-offline.test.mjs
node airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js
cd web && npm run lint && npm run typecheck && npm run test && npm run build
```

## Operator worksheets

| Package | Worksheet |
|---|---|
| PKG-037 | [`docs/operator-worksheets/PKG-037-operator-worksheet.md`](../operator-worksheets/PKG-037-operator-worksheet.md) |
| PKG-039 | [`docs/operator-worksheets/PKG-039-operator-worksheet.md`](../operator-worksheets/PKG-039-operator-worksheet.md) |
| PKG-038 | Use packet evidence worksheet inline |
| PKG-009 | Checklist in season-scope packet |
| Communications Hub | [`PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md) |
