# Production QA — Paste bundle (010 v10.12 · 057 v1.9 · 072 v4.3)

**Date:** 2026-08-23  
**Branch / source of truth:** `master`  
**Production base:** `appn84sqPw03zEbTT`  
**Operator:** Mike only — agents do **not** paste into Airtable.

## Quick reference

| # | Version | Paste file | Source script | Checklist |
|---|---------|------------|---------------|-----------|
| **010** | v10.12 | [`010-v10.12-PASTE.txt`](./010-v10.12-PASTE.txt) | `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` | [`010-v10.12-formula-settlement-grace.md`](./010-v10.12-formula-settlement-grace.md) |
| **057** | 1.9 | [`057-v1.9-PASTE.txt`](./057-v1.9-PASTE.txt) | `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | [`057-v1.9-goal-settlement-fix.md`](./057-v1.9-goal-settlement-fix.md) |
| **072** | v4.3 | [`072-v4.3-PASTE.txt`](./072-v4.3-PASTE.txt) | `airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` | [`072-v4.3-was-linked-xp-reconciliation.md`](./072-v4.3-was-linked-xp-reconciliation.md) |

**Regenerate paste files after script edits:**

```bash
python3 tools/airtable/extract_production_qa_paste_bundles.py
node tools/testing/tests/test_paste_bundle_integrity.mjs
```

---

## Logic change summary

### 010 v10.12 (settlement grace)

| Area | Change |
|------|--------|
| **New** | `skipped_not_ready` when Enrollment, Week, WAS, `Count This Submission?`, or `Total Shots Counted` are temporarily unsettled |
| **Preserved** | Exactly one `SUBMISSION_XP\|{submissionId}`; reuse active XP; idempotent replay; fail-closed integrity; America/Denver Activity Date |
| **Unchanged** | XP amount from `SHOOTING_BASE` rule; bucket `Shooting Base`; milestone/streak ownership stays 066/059 |

### 057 v1.9 (goal settlement)

| Area | Change |
|------|--------|
| **Fixed** | Settlement compares WAS **Goal Shots Target** (season lookup) to Goal Record **Total Shot Target** — not weekly `Goal/9` |
| **Preserved** | Seven distinct Sunday–Saturday Denver days; daily 1/7 goal math; video ≥3; conditional Zoom; 100% homework; idempotent helper writes |
| **Unchanged** | Does not create unlock or XP (058/059 own award); formula-owned **Perfect Week Eligible?** |

### 072 v4.3 (WAS-linked XP)

| Area | Change |
|------|--------|
| **Fixed** | Weekly XP validation uses **WAS-linked** active XP only; detects **Unlinked canonical XP** before misleading rollup disagreement |
| **Preserved** | No email send; PHA-first homework; empty-week policy; 074 Hub handoff ownership; Denver date formatting |
| **Case** | WAS `reczxTIpVI8ZJLex0` — false `summary=1025, active canonical XP=1260` when milestone XP not yet on WAS |

---

## Automation 010 v10.12

### Airtable configuration

| Item | Value |
|------|--------|
| **Automation name** | `010 - Submission Intake and Asset Creation - Create XP Event from Submission` |
| **Trigger table** | Submissions |
| **Trigger type** | When record matches conditions |
| **Conditions (AND)** | Reconciliation Needed? = 1 · Enrollment not empty · Week not empty · Weekly Athlete Summary not empty · Count This Submission? = 1 · Total Shots Counted > 0 |
| **Input** | `recordId` = triggering Submission **Record ID** (dynamic) |

### Expected success logs

```json
{"automation":"010 - Submission Intake and Asset Creation - Create XP Event from Submission","version":"v10.12","statusOut":"success","actionOut":"created","submissionId":"rec...","sourceKey":"SUBMISSION_XP|rec...","debugStep":"..."}
```

```json
{"statusOut":"success","actionOut":"repaired_same_event","reconciliationAcknowledged":true}
```

### Expected failure / skip logs

| actionOut | Meaning |
|-----------|---------|
| `skipped_not_ready` | Formula/link fields not settled yet — **no error email**, no XP write |
| `skipped_ineligible` | Counted submission rules fail after settlement |
| `skipped_already_reconciled` | Signature already matches |
| `error` | Integrity failure — `errorOut` includes submission ID and step |

### Test procedure

1. Paste [`010-v10.12-PASTE.txt`](./010-v10.12-PASTE.txt) into Run a script; confirm `SCRIPT.version = "v10.12"`.
2. Update trigger conditions per table above.
3. Create disposable counted submission → wait for formulas → one `SUBMISSION_XP|{id}`.
4. Re-run → same XP Event reused, no duplicate.
5. Optional: early trigger before Week settles → `skipped_not_ready`, no error email.

### Rollback

Re-paste prior v10.10/v10.11 body from Airtable revision history. Restore trigger with only `Reconciliation Needed? = 1` if stricter gate causes missed runs.

### Offline tests

```bash
node --test tools/testing/tests/test_010_offline.mjs
node --test tools/testing/tests/test_010_date_key.mjs
node tools/testing/tests/test_paste_bundle_integrity.mjs
```

---

## Automation 057 v1.9

### Airtable configuration

| Item | Value |
|------|--------|
| **Automation name** | `057 - Achievements and Milestones - Calculate Perfect Week Eligibility` |
| **Automation ID** | `wflVRPhgunsosFjWS` |
| **Trigger table** | Weekly Athlete Summary |
| **Trigger** | Confirm in Automations UI (queue / helper arm — do not trust stale Automations table metadata) |
| **Input** | `recordId` = triggering WAS **Record ID** (dynamic — **never** hardcode `reczxTIpVI8ZJLex0`) |
| **Safe test WAS** | `reczxTIpVI8ZJLex0` (manual Test override only) |

### Expected success logs

```json
{"automation":"057","version":"1.9","recordId":"rec...","action":"ready","status":"Ready"}
```

Helpers populated: `Perfect Week Automation Status` = Ready, `Perfect Week Automation Error` blank.

### Expected failure logs

| Status / field | Meaning |
|----------------|---------|
| `Perfect Week Automation Status` = Error | Read `Perfect Week Automation Error` for goal, daily, video, zoom, or homework gate |
| `Needs Review` | Goal lookup not settled to authoritative Target Goal Shots |
| Daily Fail | Fewer than seven distinct official week days with qualifying submissions |

### Test procedure

1. Paste [`057-v1.9-PASTE.txt`](./057-v1.9-PASTE.txt); confirm **Version: 1.9**.
2. Fix `recordId` input mapping to dynamic triggering WAS.
3. Test → `recordId = reczxTIpVI8ZJLex0` → Status **Ready**, no false goal-settlement error.
4. Re-run Test — idempotent helper refresh, **no** unlock/XP (do not run 058/059 until Eligible?=1).
5. Confirm `Perfect Week Daily Check Status` reflects actual day count.

### Rollback

Re-paste v1.8 from Airtable revision history or git parent of v1.9 commit.

### Offline tests

```bash
node --test tools/testing/tests/test_057_runtime.mjs
node --test airtable/automations/shooting-challenge/lib/xp-date-normalization.test.js
node tools/testing/tests/test_paste_bundle_integrity.mjs
```

---

## Automation 072 v4.3

### Airtable configuration

| Item | Value |
|------|--------|
| **Automation name** | `072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package` |
| **Trigger table** | Weekly Athlete Summary |
| **Trigger** | `Build Weekly Email Now?` is checked |
| **Input** | `recordId` = triggering WAS Record ID |
| **Optional inputs** | `emptyWeekPolicy` (default `send_short`), `sendMode` / `sendModeInput` (default `test`) |

### Expected success logs

```json
{"automation":"072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package","version":"v4.3","statusOut":"success","actionOut":"built_normal","weekXp":1260,"activeXpCount":40}
```

WAS fields: `Weekly Email Ready?` = true, `Build Weekly Email Now?` = false, `Weekly Email Error` cleared.

### Expected failure logs

| Error text | Meaning |
|------------|---------|
| `Unlinked canonical XP: N active XP Event(s) (+X XP)...` | Enrollment+week XP exists but not linked on WAS — reconcile links first |
| `Weekly XP disagreement: summary rollup=X, WAS-linked active XP=Y` | True rollup mismatch after linkage settled |
| `Weekly shots disagreement` | Submission scan ≠ WAS shots rollup |

### Test procedure

1. Paste [`072-v4.3-PASTE.txt`](./072-v4.3-PASTE.txt); confirm `SCRIPT.version = "v4.3"`.
2. On WAS `reczxTIpVI8ZJLex0`: confirm `XP Earned This Week` = 1260, 40 linked XP Events.
3. Check `Build Weekly Email Now?` → success, package fields populated.
4. Re-arm and rerun → idempotent package rebuild (074 owns send).
5. Negative: disposable WAS with orphan XP → `Unlinked canonical XP` (not misleading disagreement).

### Rollback

Re-paste v4.2 from git history before v4.3 merge (`c8f9c056` parent).

### Offline tests

```bash
node tools/testing/tests/test_072_weekly_xp_reconciliation.mjs
node --test airtable/automations/shooting-challenge/lib/072-074-email-helpers.test.js
node --test tests/email/automation-072-076-canonical-reporting.test.js
node --test tests/was-email-contracts/handoff-ownership.test.js
node tools/testing/tests/test_paste_bundle_integrity.mjs
```

---

## Regression test matrix (repository)

| Scenario | Covered by |
|----------|------------|
| Replay / idempotency | `test_010_offline.mjs`, `test_057_runtime.mjs`, `test_072_weekly_xp_reconciliation.mjs` |
| Duplicate prevention | `test_010_offline.mjs`, `agent4-xp-dedupe-matrix.test.js` |
| Delayed formula settlement | `test_010_offline.mjs` (`skipped_not_ready`) |
| Backdated activity dates | `test_010_date_key.mjs`, `xp-date-normalization.test.js` |
| Missing linked records | `test_010_offline.mjs`, `automation-072-076-canonical-reporting.test.js` |
| Inactive XP Events | `072-074-email-helpers.test.js`, `test_072_weekly_xp_reconciliation.mjs` |
| Duplicate XP Events | `agent4-xp-dedupe-matrix.test.js`, `test_010_offline.mjs` |
| Perfect Week boundary dates | `test_057_runtime.mjs`, `xp-date-normalization.test.js` |
| Weekly XP false disagreement (reczxTIpVI8ZJLex0 class) | `test_072_weekly_xp_reconciliation.mjs` |
| True weekly XP disagreement | `test_072_weekly_xp_reconciliation.mjs` (rollup ≠ linked sum) |
| Paste bundle integrity | `test_paste_bundle_integrity.mjs` |

---

## MANUAL AIRTABLE ACTION REQUIRED

Mike must:

1. Open each Production automation (**010**, **057**, **072**) in the Airtable Automations UI.
2. Copy the **entire** contents of the matching `*-PASTE.txt` file (production docblock through final line).
3. Paste into the **Run a script** action, replacing all existing script text.
4. Confirm version headers and `SCRIPT` / `version` metadata match the table above.
5. Confirm **dynamic** `recordId` input mapping (especially 057 — remove any hardcoded WAS test ID).
6. Save each automation (keep Live).
7. Run the documented test procedure for each script before continuing weekly email or Perfect Week award work.

**Agents have not installed these scripts in Production.** Repository preparation only.
