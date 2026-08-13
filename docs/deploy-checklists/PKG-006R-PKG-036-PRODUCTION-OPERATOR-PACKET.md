# PKG-006R + PKG-036 — Unified Production operator packet

**Date:** 2026-08-13  
**Repository SHA:** verify `origin/master` before execution (`git rev-parse origin/master`)  
**Base:** `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)  
**Owner:** Mike performs every Production step. Agents do not access Production.

## Evidence boundary

Repository text and offline tests are not Production proof. Historical packets that cite **010 v10.6**, **041 v4.0**, or **042 v3.4** describe the **currently installed** Production state, not the **target** state after this work.

---

## Target repository versions and ownership

| Automation | Target version | File | Ownership |
|---|---|---|---|
| **010** | **v10.7** | `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` | Sole writer of Submission Base XP (`SUBMISSION_XP\|{Submission ID}`); positive create/replay, correction deactivate/reactivate same event, latch acknowledgement |
| **041** | **v5.0** | `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js` | Queue/request only — sets `Level Recalc Needed?` and `Progression Last Queued Signature` |
| **042** | **v4.0** | `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Sole writer of `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status`, `Progression Last Reconciled Signature` |
| **043** | **Retired / absent** | Historical source only — **do not recreate or enable** | No downstream writer |

**Levels inverse links (PKG-036-HF-001):** Production renamed the Levels-side reverse links to `Enrollments — Current Level` (`fldIZT5MWgMskwF8s`) and `Enrollments — Next Level` (`fldtaYEIwRvRKYkvb`). Scripts 041/042 read/write Enrollment-side `Current Level` and `Next Level` only.

---

## Current Production state Mike must verify first

Record screenshots/exports before any change.

| Item | Expected current (2026-08-13 orientation) | Target after packages |
|---|---|---|
| Automation 010 | Installed **v10.6**; trigger may still be positive-only — **verify in UI** | **v10.7** on `Reconciliation Needed? = 1` with dynamic `recordId` |
| Automation 041 | `wflCRvaopntNPsc64`; cron every 15 min; installed **v4.0** | **v5.0**; same cron; optional `recordId` blank |
| Automation 042 | `wfl3aiiK8vI2tz0HA`; view `viwm9OgwkPKI2bii3`; installed **v3.4** | **v4.0**; preserve view-entry trigger + dynamic `recordId` |
| Automation 043 | Absent from automation inventory | Remain absent |
| `Enrollments.Progression Last Queued Signature` | Present (`fldw2p0bfT54vk6ag`) | Unchanged |
| `Enrollments.Progression Last Reconciled Signature` | **Missing** | Create writable single-line text before 041/042 paste |
| PKG-006R Submission reconciliation fields | **Not installed** (per schema contract) | Create in exact order (see Phase A) |
| `Level Gate Rules.Program Instance` | **No link field** | Unchanged — gate selection is school-year/rule-set scoped; each Enrollment must have exactly one Program Instance |

Approved Schmidt orientation Enrollments (read-only baseline): `recCrNNAdVmQ4Y8fL`, `reclc46bQM8Wx0qWP`, `recwuMDL6dqIVfvqH`.

---

## Phase A — PKG-006R (Submission XP reconciliation)

**Do not start Phase B until Phase A is complete and the lock is released (see Coordination).**

### A1. Preflight (read-only)

1. Run `audit-counted-submission-xp-standings-reliability.js` (Extension Scripting, dry-run). Save JSON.
2. Select one valid counted Schmidt Submission; record Submission, Enrollment, Week, WAS, XP Event, milestone unlock, streak occurrence, and Program Instance IDs.
3. Confirm exactly one canonical WAS for Enrollment + Week and exactly one `SUBMISSION_XP|{Submission ID}` event.
4. Capture installed versions, enablement, trigger conditions, and recent run history for **010, 031, 041, 042, 053, 054, 059, 066**.
5. Block email/Make dispatch paths during testing. Do not modify email records as a shortcut.

### A2. Schema — exact creation order

Create fields per [`airtable/schema/current/daily-submission-xp-reconciliation-fields.md`](../../airtable/schema/current/daily-submission-xp-reconciliation-fields.md):

1. `Enrollments.Reconciliation Source Signature` (formula)
2. `Weeks.Reconciliation Source Signature` (formula)
3. `XP Events.Reconciliation Source Signature` (formula)
4. Submission lookups 4–9 (Enrollment/Week/XP propagation)
5. `Submissions.Current Reconciliation Signature` (formula)
6. `Submissions.Last Reconciled Signature` (writable text)
7. `Submissions.Reconciliation Needed?` (formula numeric 1/0)

Wait for formulas to settle. Do **not** enable 010 until the full chain exists.

### A3. Paste Automation 010 v10.7

| Setting | Value |
|---|---|
| Automation | 010 — Submission Intake and Asset Creation — Create XP Event from Submission |
| Table | Submissions |
| Trigger | When record matches conditions: `Reconciliation Needed? = 1` |
| Input `recordId` | Dynamic — Airtable record ID from triggering Submission |
| Script source | Full `010-submission-intake-create-xp-event.js` (docblock through end; skip GitHub header) |

**010 does not write progression fields.** It may set `Run Shot Milestone Check?` after successful reconciliation.

Turn **010 OFF** while saving, then run controlled tests before leaving ON.

### A4. Controlled test order (PKG-006R)

1. Positive counted Submission: one active Submission XP event, exact key, exact links.
2. Replay same Submission: same event ID, no duplicate Source Key.
3. Reversal: make Submission uncountable (approved controlled condition); same event deactivates; no delete/replace.
4. Restoration: restore Submission; same event ID reactivates.
5. Allow WAS/lifetime formulas to settle; observe 041 queue → 042 settlement (installed versions during 006R testing may still be v4.0/v3.4 until Phase B).
6. Milestone/streak: stop if 053/054 or 066/059 do not receive observable transitions — repository fails closed.

### A5. Required evidence (PKG-006R)

- Natural-trigger run IDs for 010
- Before/after field snapshots and formula settlement timestamps
- Same-event withdrawal/restoration proof
- Read-only audit JSON (before and after)
- Production leaderboard membership readback

### A6. PKG-006R stop conditions

Stop and preserve evidence for: duplicate Submission XP key, duplicate WAS, wrong owner, wrong Week/WAS, inactive Enrollment, future date, missing/ambiguous WAS, formula lag beyond bounded retry, partial failure, retry duplication, concurrent creation, unexpected email activity.

### A7. PKG-006R rollback

1. Turn 010 OFF; preserve run history.
2. Wrong award: deactivate exact owned XP Event only — never delete or create replacement.
3. Rerun read-only audit; wait for rollup settlement.
4. If trigger behavior is unsafe: leave records intact; restore prior 010 script/trigger from capture.

---

## Coordination — lock release before PKG-036

**PKG-036 must not begin until one of these is true:**

1. PKG-006R Production proof is recorded (schema installed, 010 v10.7 live-tested, evidence captured), **and**
2. Mike explicitly releases the progression lock by confirming:
   - 010 testing is complete or safely paused with 010 OFF, and
   - 041/042 are OFF with no active observation window that would conflict, **or**
   - ChatGPT/Mike explicitly authorizes progression install during an approved safe pause.

**Exact closeout for PKG-006R:** Mike signs off the Phase A evidence checklist. Only then proceed to Phase B.

---

## Phase B — PKG-036 (Progression bidirectional reliability)

### B1. Preflight (read-only)

1. Re-capture 041/042 scripts, trigger IDs, ON/OFF state, input mappings, output mappings, recent run history.
2. Confirm 043 remains absent.
3. Confirm `Progression Last Reconciled Signature` is still missing (do not confuse with `Last Reconciled Signature` on another table).
4. Defer the PKG-036 integrity audit to **B2 step 8** (after the reconciled-signature field is created and settled).

### B2. Installation order

1. Turn **041** (`wflCRvaopntNPsc64`) and **042** (`wfl3aiiK8vI2tz0HA`) **OFF**. Do not alter 010, 101, or XP pipelines.
2. Create `Enrollments.Progression Last Reconciled Signature` — writable single-line text. Record new field ID. No formula/lookup/rollup.
3. Wait for field settlement; verify name and type.
4. Paste **041 v5.0** into `wflCRvaopntNPsc64`:
   - Trigger: 15-minute cron (preserve existing schedule)
   - Input `recordId`: **blank** for scheduled path
5. Paste **042 v4.0** into `wfl3aiiK8vI2tz0HA`:
   - Trigger: Enrollments — when record enters view
   - View: `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`)
   - View filters: `Level Recalc Needed?` checked AND `Active?` checked
   - Input `recordId`: dynamic from triggering Enrollment record
6. Confirm 043 remains absent/OFF.
7. Save both automations while OFF.
8. Run read-only PKG-036 audit; stop if field is not writable or required fields are missing.
9. **Enable 042 first, then 041.**

### B3. Trigger and dynamic input summary

| Automation | Workflow ID | Trigger | Dynamic input |
|---|---|---|---|
| 041 v5.0 | `wflCRvaopntNPsc64` | Scheduled every 15 minutes | `recordId` blank (optional for single-record proof only) |
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

Stop for: active PKG-006R conflict; missing/ambiguous Levels or Gate Rules; missing target field; missing/ambiguous Enrollment Program Instance; same-year multi-program gate ambiguity; any overlap with unsafe 010/101 state; unsafe rollback.

### B7. PKG-036 rollback

1. Turn 041 and 042 OFF; preserve logs.
2. Restore captured scripts/triggers from pre-install export.
3. Restore isolated test configuration to exact before-state.
4. Leave XP Events untouched; do not manually guess progression outputs.
5. Re-run read-only audit. Empty reconciled-signature field is acceptable if rolled back before enablement.

---

## Required Production fields reference

### PKG-006R (Submissions + lookups)

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

### PKG-036 (Enrollments)

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
| `docs/deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md` step 6 "043 if Live" | 043 retired; do not paste |
| `docs/deploy-checklists/PKG-014-immediate-initial-level-assignment-dev-deploy.md` 041/042 versions | Describes prior PROD install (v4.0/v3.4), not PKG-036 target |
| `docs/prod-completion/2026-08-08/*` 010 v10.6 / 041 v4.0 proofs | Historical installed-state evidence |
| `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` rows citing 041 v4.0 / 042 v3.4 as current | Human-status ledger; verify live UI before acting |

---

## Mike's first action after lunch

1. Open Production Airtable → confirm current installed versions for **010, 041, 042** match the "Current Production state" table above.
2. Run the read-only **counted-submission audit** (PKG-006R preflight A1).
3. Begin **Phase A** schema creation in exact order — do not enable 010 until the latch chain is complete.

**PKG-006R closes** when Phase A evidence is captured and Mike signs off. **PKG-036 begins** only after explicit lock release and Phase B preflight.
