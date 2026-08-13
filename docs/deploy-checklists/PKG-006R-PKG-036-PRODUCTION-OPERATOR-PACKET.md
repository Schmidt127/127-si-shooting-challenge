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
| **042** | **v4.1** | `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Sole writer of `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status`, `Progression Last Reconciled Signature` |
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
| Automation **042** | `wfl3aiiK8vI2tz0HA`; view `viwm9OgwkPKI2bii3`; installed **v3.4** | Paste **v4.1** deferred until PKG-006R lock release |
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

### Tomorrow desktop quick start — first five actions

1. Open this packet and record the current `origin/master` SHA beside the evidence worksheet.
2. In Airtable Automations, open **010**, capture its installed version, ON/OFF state, trigger, dynamic input mapping, and recent run history; confirm it is **OFF**.
3. In **Submissions**, capture the `Reconciliation Needed? = 1` backlog count and IDs, including the controlled Submission `recY0o5tpqMfvlCCa` if it is present. Do not change records yet.
4. In `recY0o5tpqMfvlCCa`, capture both linked XP Event IDs and fields: preserve Submission Base `recacQfNbArf2ygT2`; leave Homework `recJGcfipFyKwiSC5` unchanged.
5. Save screenshots/exports of the baseline, then use the exact **010 v10.8** source path in A3. Do not open or change 041/042 until the PKG-006R lock-release checklist passes.

---

## Phase A — PKG-006R (Submission XP reconciliation)

**PKG-006R lock remains active.** Phase B (041 v5.0 / 042 v4.1 paste) is **deferred** until this phase's evidence is complete and Mike explicitly releases the lock.

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

### A4. Controlled multi-family proof (must pass before enabling 010)

| Action | Exact table / automation / state | Observe and require | Stop condition / evidence / rollback |
|---|---|---|---|
| Paste verification | **Automation 010 v10.8**, **OFF**; script action source: `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` | Script docblock and `SCRIPT.version` both read `v10.8`; trigger table is **Submissions**; trigger is `Reconciliation Needed? = 1`; input `recordId` is the dynamic triggering Submission record ID. | Stop if any value differs. Capture editor, trigger, mapping, and script-version screenshots. Restore the captured v10.7 script/trigger only if a paste error occurred; leave records unchanged. |
| Multi-family action | **Submissions** → `recY0o5tpqMfvlCCa`; run the 010 script action manually while 010 remains **OFF**. | `statusOut=success` or a documented safe `skipped_*`; `actionOut` does not report a foreign-family duplicate; `errorOut` empty. Submission remains linked to both `recacQfNbArf2ygT2` and `recJGcfipFyKwiSC5`. | Stop for error, link loss, clone, delete, deactivation, or mutation of Homework XP. Capture run ID and all outputs. Turn 010 OFF (it already is), restore captured script/trigger if needed, and never delete or clone an XP Event. |
| Submission Base identity | **XP Events** → `recacQfNbArf2ygT2` | Source Key remains exactly `SUBMISSION_XP|recY0o5tpqMfvlCCa`; ID is reused, not replaced; Enrollment, Week, WAS, Submission, Active?, XP Points, and ownership links are correct. | Stop for a second `SUBMISSION_XP` candidate, wrong owner/link, or a changed ID. Capture before/after field values; deactivate only the exact owned event if a wrong award needs containment—never delete or replace it. |
| Homework isolation | **XP Events** → `recJGcfipFyKwiSC5` | Source Key, Active?, points, and links remain unchanged. This event is a legitimate `HOMEWORK_XP` family member, not a Submission Base duplicate. | Stop for any change. Capture before/after screenshot; no XP Event delete, clone, or replacement is permitted. |

### A5. Backlog reconciliation, replay, withdrawal/restoration, and settlement

Work through the following in order. Keep 010 **OFF** for manual script-action proof. Turn 010 **ON** only after A4 and the manual backlog proof pass; capture the state change, then prove its native trigger once on an eligible row.

| Action | Exact table / automation / state / trigger | Observe and require | Stop condition / evidence / rollback |
|---|---|---|---|
| Backlog classification | **Submissions**; `Reconciliation Needed? = 1`; first inspect `rec58gdymfPKKeVRI` and `reckjvVwtsjJ9Czyl` if still eligible. | For every row, record current/last signature, canonical Base XP candidates, countability, Enrollment, Week, WAS, and classification (`expected pending`, `eligible missing-XP`, or `stuck/error`). | Stop if ownership is ambiguous, there are duplicate canonical keys, or an unrelated XP family is labelled duplicate. Capture the row list and before JSON; do not delete, merge, or create substitute XP Events manually. |
| Manual backlog proof | **010 v10.8**, initially **OFF**; script action `recordId` is the chosen Submission ID. | Each eligible missing-XP row creates or repairs exactly one `SUBMISSION_XP|{Submission ID}` event; `statusOut=success`, `errorOut` empty, and `Reconciliation Needed?` settles to numeric `0`. | Stop for formula timeout, partial write, duplicate event, wrong WAS/Week/Enrollment, or unsafe action output. Capture run ID/outputs and the event ID. Turn 010 OFF and preserve evidence if unsafe. |
| Native-trigger proof | **010 v10.8**, **ON only after manual proof**; **Submissions** when `Reconciliation Needed? = 1`, dynamic `recordId`. | A deliberately changed, approved controlled Submission naturally triggers 010; capture native run ID, `statusOut`, `actionOut`, `errorOut`, `debugStep`, same-event identity, and a settled `Reconciliation Needed? = 0`. | Stop for non-firing trigger, wrong mapping, or any unsafe write. Turn 010 OFF, restore the exact pre-test record state only through the same-event lifecycle, and preserve logs. |
| Replay | The same approved controlled **Submission** and **010 v10.8**. | Same Submission Base XP Event ID and Source Key; no second canonical candidate; unrelated linked families remain linked. | Stop for a new/replaced Base XP Event or altered foreign-family event. Capture before/after IDs and Source Key; turn 010 OFF if unsafe. |
| Withdrawal | The same controlled **Submission**; use only an approved reversible countability condition. | The same Base XP Event ID becomes inactive; no replacement or deletion; unrelated Homework XP remains unchanged. | Stop for uncertain reversibility, unsupported milestone/streak transition, or cross-family mutation. Capture run/output and pre/post values; restore only the original Submission condition. |
| Restoration | Restore the exact controlled Submission condition; run/retrigger **010 v10.8**. | The **same Base XP Event ID** reactivates with the same Source Key; no duplicate; `Reconciliation Needed? = 0`. | Stop for a new XP Event, stale latch, or mismatched links. Capture all IDs and outputs; turn 010 OFF on failure. |
| Audit and totals settlement | Run read-only `airtable/extension-scripts/audits/audit-counted-submission-xp-standings-reliability.js`; observe **Weekly Athlete Summary** and **Enrollments**. | Before/after audit JSONs are saved; WAS XP and Enrollment Lifetime XP settle to expected values; no duplicate WAS; downstream `Level Recalc Needed?` behavior is documented without beginning PKG-036. | Stop for unsettled formulas beyond the approved bound, wrong totals, duplicate WAS, or unexpected email/Make activity. Capture JSON filename and totals; do not manually alter XP, WAS, or progression fields. |
| Milestone/streak boundary | Observe existing 053/054 and 066/059 only; do not paste or reconfigure them. | If a controlled transition is observable, record it. If it is not, record the repository’s fail-closed boundary. | Stop rather than guessing a milestone/streak correction or changing its XP Event. This does not block 010’s own same-event proof, but blocks any claimed milestone/streak lifecycle proof. |

### A6. Required evidence (PKG-006R lock release)

PKG-006R does not close until Mike captures all of:

- Natural-trigger run IDs for **010 v10.8**
- Reconciliation backlog cleared or explained with per-record evidence
- Replay proof (same event ID, no duplicate key)
- Withdrawal and restoration proof (same event ID)
- Read-only audit JSON (before and after)
- Settled WAS/lifetime totals and Production leaderboard readback

### A7. PKG-006R stop conditions

Stop and preserve evidence for: duplicate Submission XP key, duplicate WAS, wrong owner, wrong Week/WAS, inactive Enrollment, future date, missing/ambiguous WAS, formula lag beyond bounded retry, partial failure, retry duplication, concurrent creation, unexpected email activity, or unexpected 077/Make daily-email dispatch.

### A8. PKG-006R rollback

1. Turn 010 OFF only if unsafe; preserve run history.
2. Wrong award: deactivate exact owned XP Event only — never delete or create replacement.
3. Rerun read-only audit; wait for rollup settlement.
4. If trigger behavior is unsafe: restore prior 010 script/trigger from capture; leave records intact.

---

## Coordination — lock release before PKG-036

**PKG-036 must not begin until:**

1. All Phase A evidence in A6 is captured and Mike signs off PKG-006R, **and**
2. Mike explicitly releases the progression lock by confirming:
   - 010 lifecycle proof is complete or safely paused with 010 OFF, and
   - 041/042 are OFF with no active observation window that would conflict.

**041 v5.0 and 042 v4.1 installation remain deferred** until this lock is released.

---

## Phase B — PKG-036 (Progression bidirectional reliability)

**Deferred until PKG-006R lock release.** Do not paste 041 v5.0 or 042 v4.1 before sign-off.

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
4. Paste **042 v4.1** into `wfl3aiiK8vI2tz0HA`:
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
| 042 v4.1 | `wfl3aiiK8vI2tz0HA` | Record enters view `viwm9OgwkPKI2bii3` | `recordId` = triggering Enrollment record ID |

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

### B5. Progression action matrix

| Action | Exact table / automation / state / trigger | Observe and require | Stop condition / evidence / rollback |
|---|---|---|---|
| Preflight | **Enrollments**, **Levels**, **Level Gate Rules**; read-only audit `airtable/extension-scripts/audits/audit-pkg-036-progression-integrity.js` | `Progression Last Queued Signature` and `Progression Last Reconciled Signature` exist as writable single-line text; 12 active Levels, 12 active school-year gate rules, one Program Instance per Enrollment; 043 remains absent. | Stop on missing/wrong field, nonunique/ambiguous ladder/rules, or package lock still active. Capture audit JSON and field IDs; no schema changes. |
| Paste while OFF | **041 v5.0** in `wflCRvaopntNPsc64`, **OFF**; source `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js`. **042 v4.1** in `wfl3aiiK8vI2tz0HA`, **OFF**; source `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`. | 041 trigger is the approved **15-minute** scheduled reconciliation with blank `recordId` scheduled mapping. 042 is **Enrollments** record-enters-view `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`), filters `Level Recalc Needed?` checked + `Active?` checked, dynamic `recordId` = triggering Enrollment ID. | Stop if a version, schedule, filter, mapping, or state differs. Capture both editor configurations and scripts. Restore captured scripts/triggers while OFF. |
| Enablement | **042 first, then 041**; 043 stays absent. | Record the exact ON transition and run IDs. Never enable/recreate 043; never change 010, XP Events, Video XP, Zoom XP, streak/milestone, or standings logic. | Stop for an unsafe queued backlog or unexpected scope. Turn **041 and 042 OFF**, restore captured scripts/triggers, and preserve logs. |
| Controlled progression | Approved **Enrollments** record `recwuMDL6dqIVfvqH` or another explicitly approved Schmidt row; 041 schedule and 042 view-entry trigger. | At each state record Current/Next Level, Gate Rule, Level Status, `Level Recalc Needed?`, queued/reconciled signatures, Lifetime XP, WAS XP, Enrollment Lifetime XP, and standings readback. Prove baseline/replay, within-level rise, threshold rise/fall, return to 0/restoration, gate pass/block, maximum level, retry queue preservation, and natural 041 → 042 runs. | Stop for stale queue after bounded retry, output churn on replay, wrong school-year rule, missing Program Instance, bad totals, or unsafe rollback. Capture every run ID/output and before/after state; restore exact isolated test values, keep XP Events untouched, then rerun audit. |

### B6. Required evidence (PKG-036)

- 041 → 042 natural-trigger run IDs and script outputs
- Upward and downward progression readbacks
- Retry-after-failure with queue preserved
- Settled formula/rollup observation
- Standings readback
- Final audit JSON

### B7. PKG-036 stop conditions

Stop for: active PKG-006R conflict; missing/ambiguous Levels or Gate Rules; missing or mis-typed reconciled-signature field; missing/ambiguous Enrollment Program Instance; unsafe rollback; any overlap with unsafe 010/101 state.

### B8. PKG-036 rollback

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
node --test tools/testing/tests/test_041_recalculation_coverage.mjs
node airtable/automations/shooting-challenge/lib/041-042-reconciled-signature-contract.test.js
node airtable/automations/shooting-challenge/lib/pkg-036-progression-reliability.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/042-school-year-gate-rules.test.js
node airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js
node --test tests/data-model/field-contracts.test.js
node tests/automation-ownership/test-contract-harness.mjs
node tests/automation-contracts/source-key-registry.test.js
node tests/airtable-runtime/active-automation-unload-compat.test.js
node --check airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js
node --check airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js
node --check airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js
node --test tests/deploy-checklists/pkg-006r-pkg-036-operator-packet.test.js
```

---

## Evidence worksheet — fill in during execution

Copy one row per controlled run. Attach the captured Airtable screenshots/exports and audit JSON; this worksheet is not a substitute for them.

| Phase / action | Date / time | Operator | Automation / version before → after | State before → after | Trigger / dynamic input mapping | Run ID | Source record ID | XP Event ID before → after | `actionOut` / `statusOut` / `errorOut` | `Reconciliation Needed?` before → after | Current / Last Signature | WAS XP before → after | Enrollment Lifetime XP before → after | Current / Next Level before → after | `Level Recalc Needed?` before → after | Queued / Reconciled Signature | Audit JSON filename | Rollback performed | PASS / FAIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 010 preflight |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 010 multi-family proof |  |  |  |  |  |  | `recY0o5tpqMfvlCCa` | `recacQfNbArf2ygT2` / `recJGcfipFyKwiSC5` |  |  |  |  |  |  |  |  |  |  |  |
| 010 backlog / replay |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 010 withdrawal / restoration |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PKG-006R final audit / lock release |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 041/042 preflight and paste |  |  |  |  |  |  |  | n/a |  | n/a | n/a |  |  |  |  |  |  |  |  |
| 041/042 progression proof |  |  |  |  |  |  | `recwuMDL6dqIVfvqH` or approved row | n/a |  | n/a | n/a |  |  |  |  |  |  |  |  |
| PKG-036 final audit / rollback decision |  |  |  |  |  |  |  | n/a |  | n/a | n/a |  |  |  |  |  |  |  |  |

### PKG-006R lock-release checklist

- [ ] 010 v10.8 version, OFF-before-paste state, Submissions trigger, and dynamic `recordId` mapping are captured and verified.
- [ ] `recY0o5tpqMfvlCCa` preserves both links; Base XP `recacQfNbArf2ygT2` is reused and Homework XP `recJGcfipFyKwiSC5` is unchanged.
- [ ] The reconciliation backlog is classified, including eligible rows `rec58gdymfPKKeVRI` and `reckjvVwtsjJ9Czyl` if still present.
- [ ] Eligible manual and native-trigger proof shows `statusOut`, `actionOut`, `errorOut`, no duplicate canonical Base XP event, and `Reconciliation Needed?` settling to `0`.
- [ ] Replay, withdrawal, and restoration reuse the same Submission Base XP Event ID; no XP Event is deleted, cloned, or replaced.
- [ ] Before/after counted-submission audit JSONs, settled WAS and Enrollment Lifetime XP totals, and any 041/042 observation evidence are saved.
- [ ] No unexpected email/Make dispatch, cross-family mutation, ambiguous ownership, or unaddressed stop condition occurred.
- [ ] Mike signs off and explicitly states: **“PKG-006R lock released for PKG-036.”**

### PKG-036 start criteria

Begin only when every PKG-006R checklist item passes and Mike has explicitly released the lock. Then verify 041/042 are OFF before paste, 043 is absent, the two signature fields are writable text, the ladder has 12 active Levels and 12 intended school-year gate rules, and the 041 schedule remains every 15 minutes. Enable 042 first and 041 second.

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

**PKG-006R closes** when backlog is reviewed, lifecycle proof is captured (A6), and Mike signs off. **PKG-036 begins** only after explicit lock release and Phase B preflight. **041 v5.0 / 042 v4.1 paste stays deferred** until then.
