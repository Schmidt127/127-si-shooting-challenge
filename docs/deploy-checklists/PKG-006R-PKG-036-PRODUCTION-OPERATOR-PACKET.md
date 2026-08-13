# PKG-006R + PKG-036 — Unified Production operator packet

**Date:** 2026-08-13 (amended with Mike-supplied Production baseline; **PKG-006R-HF-001** hotfix 2026-08-13)
**Repository SHA:** verify `origin/master` before execution (`git rev-parse origin/master`)
**Base:** `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)
**Owner:** Mike performs every Production step. Agents do not access Production.

## Evidence boundary

Repository text and offline tests are not Production proof. Historical packets that cite **010 v10.6** replay proof describe prior evidence only. **Lifecycle proof for 010 v10.8** (backlog clearance, natural-trigger runs, withdrawal/restoration, settled totals) remains pending. **010 v10.7 is OFF in Production** after a multi-family XP lookup failure; paste **v10.8** before re-enabling.

### PKG-006R-HF-001 — Production blocker (2026-08-13)

| Item | State |
|---|---|
| Failure | Submission `recY0o5tpqMfvlCCa` — `Multiple XP Events are linked to Submission` |
| Legitimate events | Submission Base `recacQfNbArf2ygT2` (`SUBMISSION_XP\|recY0o5tpqMfvlCCa`); Homework `recJGcfipFyKwiSC5` (`HOMEWORK_XP` family) |
| Root cause | 010 v10.7 treated any second linked XP Event as a duplicate instead of scoping duplicate detection to Submission Base identity only |
| Hotfix | **010 v10.8** — family-scoped lookup; ignore unrelated `HOMEWORK_XP`, `VIDEO_SUBMISSION`, milestone, streak, and Zoom families; append Submission XP link without unlinking unrelated events |
| Production now | **010 OFF**; both XP Events unchanged; PKG-006R and PKG-036 locks remain active |
| Backlog ID | `PKG-006R-HF-001` |

---

## Target repository versions and ownership

| Automation | Target version | File | Ownership |
|---|---|---|---|
| **010** | **v10.8** | `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` | Sole writer of Submission Base XP (`SUBMISSION_XP\|{Submission ID}`); positive create/replay, correction deactivate/reactivate same event, latch acknowledgement; ignores unrelated XP families linked to the same Submission |
| **041** | **v5.0** | `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js` | Queue/request only — sets `Level Recalc Needed?` and `Progression Last Queued Signature` |
| **042** | **v4.0** | `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Sole writer of `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status`, `Progression Last Reconciled Signature` |
| **043** | **Retired / absent** | Historical source only — **do not recreate or enable** | No downstream writer |
| **077** | **Retired / deleted** | `077-email-notifications-and-external-handoffs-send-daily-submission-email-package-to-make.js` archived in GitHub only | Deleted from Airtable to recover an automation slot; daily email uses Hub path (076 → 079) |

**Levels inverse links (PKG-036-HF-001, PR #177):** Production renamed the Levels-side reverse links to `Enrollments — Current Level` (`fldIZT5MWgMskwF8s`) and `Enrollments — Next Level` (`fldtaYEIwRvRKYkvb`). Scripts 041/042 read/write Enrollment-side `Current Level` and `Next Level` only.

**Gate-rule scope:** Mike operates one Program Instance per school year. **School Year / Rule Set** is the approved Level Gate Rule scope. The Levels table contains all **12 active Levels** linked to **Level 1–12 gate rules** for the active school year. Do not treat any incomplete three-rule orientation sample as the Production ladder truth.

---

## Current Production state (Mike-supplied 2026-08-13)

Record screenshots/exports before any change.

| Item | Current Production state | Remaining work |
|---|---|---|
| PKG-006R reconciliation fields (12) | **Installed and verified** | Verify exact names/types before testing; do not recreate |
| Automation **010** | **v10.7 installed; OFF after HF-001 failure** | Paste **v10.8** from GitHub; re-test `recY0o5tpqMfvlCCa` and backlog; complete lifecycle proof before re-enabling |
| Automation **041** | `wflCRvaopntNPsc64`; cron every **15 min**; installed **v4.0** | Paste **v5.0** deferred until PKG-006R lock release |
| Automation **042** | `wfl3aiiK8vI2tz0HA`; view `viwm9OgwkPKI2bii3`; installed **v3.4** | Paste **v4.0** deferred until PKG-006R lock release |
| Automation **043** | Absent from automation inventory | Remain absent |
| Automation **077** | **Deleted** from Airtable (was OFF) | Do not recreate; GitHub source remains archived |
| `Enrollments.Progression Last Queued Signature` | Present (`fldw2p0bfT54vk6ag`) | Unchanged |
| `Enrollments.Progression Last Reconciled Signature` | **Created** | Verify exact name, type (writable single-line text), and field ID |
| Levels / Gate Rules | 12 active Levels; 12 active school-year gate rules (Level 1–12) | Verify configuration before PKG-036 testing |
| `Level Gate Rules.Program Instance` | No link field | School Year / Rule Set scope; each Enrollment must have exactly one Program Instance |

Approved Schmidt orientation Enrollments: `recCrNNAdVmQ4Y8fL`, `reclc46bQM8Wx0qWP`, `recwuMDL6dqIVfvqH`.

---

## Mike's first action

**Before modifying any records:**

1. Confirm Automation **010** is **OFF** (rollback state after HF-001 failure).
2. Open **Submissions** → filter or view rows where `Reconciliation Needed? = 1` → record the **current reconciliation backlog** (count, record IDs, whether backlog is expected or indicates a stuck latch). Include `recY0o5tpqMfvlCCa` if still present.
3. Only after backlog review → paste **010 v10.8**, run controlled HF-001 proof, then proceed to Phase A lifecycle testing. Do not re-enable 010 until v10.8 proof passes.

---

## Phase A — PKG-006R (Submission XP reconciliation)

**PKG-006R lock remains active.** Phase B (041 v5.0 / 042 v4.0 paste) is **deferred** until this phase's evidence is complete and Mike explicitly releases the lock.

### A1. Preflight (read-only)

1. Run `audit-counted-submission-xp-standings-reliability.js` (Extension Scripting, dry-run). Save JSON.
2. Select one valid counted Schmidt Submission; record Submission, Enrollment, Week, WAS, XP Event, milestone unlock, streak occurrence, and Program Instance IDs.
3. Confirm exactly one canonical WAS for Enrollment + Week and exactly one `SUBMISSION_XP|{Submission ID}` event.
4. Capture installed versions, enablement, trigger conditions, and recent run history for **010, 031, 041, 042, 053, 054, 059, 066**.
5. Block email/Make dispatch paths during testing. Confirm **077 is deleted** and Hub path (076 → 079) is the daily-email boundary.

### A2. Schema — verify installed fields (do not create)

Verify each field exists with the exact name and type per [`airtable/schema/current/daily-submission-xp-reconciliation-fields.md`](../../airtable/schema/current/daily-submission-xp-reconciliation-fields.md). Record field IDs in the operator log.

1. `Enrollments.Reconciliation Source Signature` — formula
2. `Weeks.Reconciliation Source Signature` — formula
3. `XP Events.Reconciliation Source Signature` — formula
4. Submission lookups 4–9 (Enrollment/Week/XP propagation)
5. `Submissions.Current Reconciliation Signature` — formula
6. `Submissions.Last Reconciled Signature` — writable single-line text
7. `Submissions.Reconciliation Needed?` — formula numeric 1/0

Stop if any field is missing, misnamed, or wrong type. Do not recreate fields that already exist.

### A3. Install Automation 010 v10.8 (010 is OFF — paste before re-enable)

| Setting | Expected value |
|---|---|
| Automation | 010 — Submission Intake and Asset Creation — Create XP Event from Submission |
| Installed script | **v10.8** (replaces v10.7) |
| Enablement | **OFF** until HF-001 proof and backlog replay pass |
| Table | Submissions |
| Trigger | When record matches conditions: `Reconciliation Needed? = 1` |
| Input `recordId` | Dynamic — Airtable record ID from triggering Submission |

**HF-001 proof row:** Submission `recY0o5tpqMfvlCCa` must reconcile without error while preserving Homework XP `recJGcfipFyKwiSC5` and reusing Submission Base XP `recacQfNbArf2ygT2`.

**010 does not write progression fields.** It may set `Run Shot Milestone Check?` after successful reconciliation. It must not unlink, modify, deactivate, or delete unrelated XP Events.

If trigger or version does not match, capture evidence and stop. Repaste only from committed `010-submission-intake-create-xp-event.js` after turning OFF, saving, and restoring from capture on rollback.

### A4. Controlled test order (PKG-006R)

Work through backlog and lifecycle proof in this order:

1. **Backlog review:** classify each `Reconciliation Needed? = 1` row — expected pending vs stuck.
2. Positive counted Submission: one active Submission XP event, exact key, exact links.
3. Replay same Submission: same event ID, no duplicate Source Key.
4. Reversal: make Submission uncountable (approved controlled condition); same event deactivates; no delete/replace.
5. Restoration: restore Submission; same event ID reactivates.
6. Allow WAS/lifetime formulas to settle; observe 041 queue → 042 settlement (currently v4.0/v3.4 until Phase B).
7. Milestone/streak: stop if 053/054 or 066/059 do not receive observable transitions — repository fails closed.

### A5. Required evidence (PKG-006R lock release)

PKG-006R does not close until Mike captures all of:

- Natural-trigger run IDs for **010 v10.8**
- Reconciliation backlog cleared or explained with per-record evidence
- Replay proof (same event ID, no duplicate key)
- Withdrawal and restoration proof (same event ID)
- Read-only audit JSON (before and after)
- Settled WAS/lifetime totals and Production leaderboard readback

### A6. PKG-006R stop conditions

Stop and preserve evidence for: duplicate Submission XP key, duplicate WAS, wrong owner, wrong Week/WAS, inactive Enrollment, future date, missing/ambiguous WAS, formula lag beyond bounded retry, partial failure, retry duplication, concurrent creation, unexpected email activity, or unexpected 077/Make daily-email dispatch.

### A7. PKG-006R rollback

1. Turn 010 OFF only if unsafe; preserve run history.
2. Wrong award: deactivate exact owned XP Event only — never delete or create replacement.
3. Rerun read-only audit; wait for rollup settlement.
4. If trigger behavior is unsafe: restore prior 010 script/trigger from capture; leave records intact.

---

## Coordination — lock release before PKG-036

**PKG-036 must not begin until:**

1. All Phase A evidence in A5 is captured and Mike signs off PKG-006R, **and**
2. Mike explicitly releases the progression lock by confirming:
   - 010 lifecycle proof is complete or safely paused with 010 OFF, and
   - 041/042 are OFF with no active observation window that would conflict.

**041 v5.0 and 042 v4.0 installation remain deferred** until this lock is released.

---

## Phase B — PKG-036 (Progression bidirectional reliability)

**Deferred until PKG-006R lock release.** Do not paste 041 v5.0 or 042 v4.0 before sign-off.

### B1. Preflight (read-only)

1. Re-capture 041/042 scripts, trigger IDs, ON/OFF state, input mappings, output mappings, recent run history.
2. Confirm 043 remains absent.
3. Verify `Enrollments.Progression Last Reconciled Signature` exists as writable single-line text (do not confuse with `Last Reconciled Signature` on another table). Record field ID.
4. Verify `Progression Last Queued Signature` remains present and unchanged.
5. Verify 12 active Levels and 12 school-year gate rules (Level 1–12) before progression testing.

### B2. Installation order (after lock release only)

1. Turn **041** (`wflCRvaopntNPsc64`) and **042** (`wfl3aiiK8vI2tz0HA`) **OFF**. Do not alter 010, 101, or XP pipelines.
2. **Verify** (do not create) `Enrollments.Progression Last Reconciled Signature` — writable single-line text. Record field ID.
3. Paste **041 v5.0** into `wflCRvaopntNPsc64`:
   - Trigger: **15-minute** cron (preserve existing schedule)
   - Input `recordId`: **blank** for scheduled path
4. Paste **042 v4.0** into `wfl3aiiK8vI2tz0HA`:
   - Trigger: Enrollments — when record enters view
   - View: `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`)
   - View filters: `Level Recalc Needed?` checked AND `Active?` checked
   - Input `recordId`: dynamic from triggering Enrollment record
5. Confirm 043 remains absent/OFF.
6. Save both automations while OFF.
7. Run read-only PKG-036 audit; stop if reconciled-signature field is not writable or required fields are missing.
8. **Enable 042 first, then 041.**
9. After enablement, re-run read-only PKG-036 audit and preserve JSON.

### B3. Trigger and dynamic input summary

| Automation | Workflow ID | Trigger | Dynamic input |
|---|---|---|---|
| 041 v5.0 | `wflCRvaopntNPsc64` | Scheduled every **15 minutes** | `recordId` blank (optional for single-record proof only) |
| 042 v4.0 | `wfl3aiiK8vI2tz0HA` | Record enters view `viwm9OgwkPKI2bii3` | `recordId` = triggering Enrollment record ID |

### B4. Controlled test order (PKG-036)

Use approved Schmidt Enrollment `recwuMDL6dqIVfvqH` or another explicitly approved test row. Capture run IDs for every step.

1. Baseline audit and standings readback.
2. 0-XP initial assignment and replay (no churn).
3. XP increase within level; upward threshold crossing.
4. XP decrease; downward threshold crossing; return to 0; restoration upward.
5. Gate pass/block and maximum-level (no Next Level / Gate Rule).
6. Controlled retryable 042 error: queue remains checked; next run repairs.
7. 041 natural trigger after XP change (up and down).
8. Optional isolated Level/Gate Rule change: only affected Enrollments queue; restore exact value.
9. Final read-only audit JSON.

### B5. Required evidence (PKG-036)

- 041 → 042 natural-trigger run IDs and script outputs
- Upward and downward progression readbacks
- Retry-after-failure with queue preserved
- Settled formula/rollup observation
- Standings readback
- Final audit JSON

### B6. PKG-036 stop conditions

Stop for: active PKG-006R conflict; missing/ambiguous Levels or Gate Rules; missing or mis-typed reconciled-signature field; missing/ambiguous Enrollment Program Instance; unsafe rollback; any overlap with unsafe 010/101 state.

### B7. PKG-036 rollback

1. Turn 041 and 042 OFF; preserve logs.
2. Restore captured scripts/triggers from pre-install export.
3. Restore isolated test configuration to exact before-state.
4. Leave XP Events untouched; do not manually guess progression outputs.
5. Re-run read-only audit.

---

## Required Production fields reference

### PKG-006R (verify installed — do not create)

| Table | Field | Type | Writer |
|---|---|---|---|
| Enrollments | Reconciliation Source Signature | formula | — |
| Weeks | Reconciliation Source Signature | formula | — |
| XP Events | Reconciliation Source Signature | formula | — |
| Submissions | Reconciliation Enrollment/Week/XP lookups (6) | lookup | — |
| Submissions | Current Reconciliation Signature | formula | — |
| Submissions | Last Reconciled Signature | text | **010 only** |
| Submissions | Reconciliation Needed? | formula 1/0 | — |

Full formulas: [`daily-submission-xp-reconciliation-fields.md`](../../airtable/schema/current/daily-submission-xp-reconciliation-fields.md)

### PKG-036 (verify installed — do not create)

| Field | Type | Writer | Purpose |
|---|---|---|---|
| Progression Last Queued Signature | single-line text | **041** | Idempotent queue fingerprint |
| Progression Last Reconciled Signature | single-line text | **042** | Post-success acknowledgement; 041 compares against it |
| Level Recalc Needed? | checkbox | **041** sets; **042** clears | Queue latch |
| Current Level | link | **042** | Enrollment-side level assignment |
| Next Level | link | **042** | Enrollment-side next level |
| Level Gate Rule | link | **042** | Gate rule for next level |
| Level Status | single select | **042** | Assigned / Gate Blocked / etc. |

---

## Offline repository checks (run before Production)

```bash
git fetch origin master && git rev-parse origin/master
git diff --check
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
node --test tests/pipeline/counted-submission-xp-reversal-lifecycle.test.mjs
node --test tools/testing/tests/test_010_offline.mjs
node --test tests/pipeline/010-submission-base-multi-family.test.mjs
node airtable/automations/shooting-challenge/lib/pkg-036-progression-reliability.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/042-school-year-gate-rules.test.js
node airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js
node --test tests/data-model/field-contracts.test.js
```

---

## Stale references to ignore during execution

| Stale source | Why superseded |
|---|---|
| `docs/prod-completion/2026-08-13/PKG-036-PRODUCTION-PREFLIGHT-REPORT.md` missing-field rows | Field now created per Mike; verify instead |
| `docs/deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md` step 6 "043 if Live" | 043 retired; do not paste |
| `docs/prod-completion/2026-08-08/*` 010 v10.6 replay proof | Historical; paste **v10.8** after HF-001 — new lifecycle proof required |
| Incomplete three-enrollment OMNI orientation samples | Full ladder is 12 Levels + 12 gate rules |

---

## Closeout summary

**PKG-006R closes** when backlog is reviewed, lifecycle proof is captured (A5), and Mike signs off. **PKG-036 begins** only after explicit lock release and Phase B preflight. **041 v5.0 / 042 v4.0 paste stays deferred** until then.
