# Deploy Checklist — 035 Weekly Threshold XP v1.1

**SC items:** SC-049 (XP-D1), SC-022
**Script:** `airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js`
**Version:** **v1.1** (supersedes v1.0 checklist)
**Date:** 2026-07-25
**Status:** Ready for PROD Paste — not installed / not live-tested

> **Superseded for current status by v1.2** (`docs/deploy-checklists/035-weekly-threshold-xp-v1.2.md`). Keep this file as historical paste instructions for the v1.1 body.

## Base / folder

| Item | Value |
|------|-------|
| Airtable base | Shooting Challenge **PROD** (not Production for this paste — Mike only) |
| Automation folder | `03 - Weekly Summary and Goal Logic` |
| Automation name | `035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events` |
| Script version in paste | **v1.1** |
| Start state | **OFF** until Schmidt Test 1 passes |

## Trigger (exact)

| Item | Value |
|------|-------|
| Trigger type | When record matches conditions |
| Trigger table | `Weekly Athlete Summary` |
| Condition | Field `Threshold XP Ready?` **is equal to** `1` |
| Notes | `Threshold XP Ready?` is a formula — do not write it from the script |

## Input variables (exact)

| Variable name | Type | Mapping |
|---------------|------|---------|
| `recordId` | Text / Record ID | Airtable record ID of the **triggering Weekly Athlete Summary** |

Script fails with clear error if `recordId` is empty or does not start with `rec`.

## Output variables (map all)

| Output | Required |
|--------|----------|
| `statusOut` | Yes (`success` \| `skipped` \| `error`) |
| `actionOut` | Yes (`created` \| `skipped_*` \| `error`) |
| `errorOut` | Yes |
| `debugStep` | Yes |
| `createdCountOut` | Optional |
| `skippedExistingCountOut` | Optional |
| `sourceKeysOut` | Optional |
| `weekEndKeyOut` | Optional |
| `bandCodeOut` | Optional |

## Tables / fields read

| Table | Fields |
|-------|--------|
| Weekly Athlete Summary | `Enrollment`, `Week`, `Grade Band`, `Goal Completion %`, `Threshold XP Status`, `Threshold XP Processed At`, `Threshold XP Error Message`, `Requeue Threshold XP` |
| Enrollments | `Active?`, `Grade Band` |
| Weeks | `End Date`, `Week End Key` |
| XP Reward Rules | `Rule Key`, `XP Amount`, `Active?`, `XP Source Label`, `Grade Band` |
| XP Events | `Source Key`, `Enrollment`, `Week`, `XP Source`, `XP Bucket` |

## Tables / fields written

| Table | Fields (writable only) |
|-------|------------------------|
| XP Events | `Source Key`, `Enrollment`, `Week`, `Weekly Athlete Summary`, `XP Points`, `XP Bucket`, `XP Source`, `Active?`, `XP Reason Public`, `XP Reason Debug`, `XP Activity Date`, `XP Activity Date Source` (if option exists), `Awarded By` |
| Weekly Athlete Summary | `Threshold XP Status` → `Processed` (or `Error`), `Threshold XP Processed At`, `Requeue Threshold XP` → `false`, `Threshold XP Error Message` |

**Never write:** `Goal Completion %`, `Threshold XP Ready?`, or any formula/rollup/lookup.

## Contract summary

| Topic | Contract |
|-------|----------|
| Eligibility | Goal Completion % ≥ 100% (ratio or whole percent); tiers 100 / 125 / 150 independently |
| Enrollment | `Active?` = false → `skipped_inactive_enrollment` (blank Active? does not skip) |
| XP amount | Active XP Reward Rules `WEEKLY_THRESHOLD_{100\|125\|150}_{K2\|34\|56\|78\|912}` — do not invent |
| XP Bucket | `Weekly Threshold` |
| XP Source | `Weekly Threshold 100` / `125` / `150` |
| Activity date | Week `End Date` / `Week End Key` → America/Denver `YYYY-MM-DD` → noon UTC write |
| Source Key | `WEEKLY_THRESHOLD\|{enrollmentId}\|{weekId}\|{percent}` |
| Dedupe | Exact Source Key **or** same Enrollment+Week+XP Source label (legacy-key bridge) |
| Idempotency | Rerun / requeue must create **zero** additional events for already-awarded tiers |

## Pre-paste Mike actions (literal)

1. Open **Automations** in PROD.
2. Search names containing: `Threshold`, `Weekly Threshold`, `035`.
3. For **each** match that is not this new 035:
   - Record: Automation name, ON/OFF, trigger table, last modified.
   - If ON and it creates XP Events for Weekly Threshold → **turn OFF** before paste.
4. Competing candidates historically flagged in ownership docs (confirm UI):
   - Any unnamed/legacy “Threshold XP” automation still ON
   - Dual writer risk noted under SC-046 / Field Writer Audit (“Threshold missing” → now 035)
5. Open **XP Reward Rules** → filter `Rule Key` contains `WEEKLY_THRESHOLD` → confirm Active? for Schmidt’s grade band (100/125/150).
6. Open **XP Events** → filter `XP Bucket` = `Weekly Threshold` **OR** `XP Source` contains `Weekly Threshold`:
   - Export/copy Source Key values for Schmidt (and any non-empty rows).
   - If any Source Key is **not** `WEEKLY_THRESHOLD|rec…|rec…|{100\|125\|150}`, note the shape in the Schmidt pack before mass requeue (semantic label dedupe should still block duplicates).

## Install steps (literal)

1. Automations → **Create automation** (or open empty slot).
2. Name: `035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events`.
3. Folder: `03 - Weekly Summary and Goal Logic`.
4. Trigger: When a record matches conditions → table `Weekly Athlete Summary` → condition `Threshold XP Ready?` is `1`.
5. Add action: **Run a script**.
6. Paste from GitHub file **production docblock through end** (skip the top GitHub header comment block that ends before `/************************************************************`).
7. Configure input: `recordId` ← triggering record ID.
8. Map outputs listed above.
9. **Save**. Leave automation **OFF**.
10. Do **not** enable until Schmidt Test 1 + Test 2 pass.

## Controlled first test (OFF → Test action)

1. Enrollment: Schmidt (confirm `Active?` = checked).
2. Find Schmidt WAS for a week with `Goal Completion %` ≥ `1` (100%).
3. If `Threshold XP Status` = `Processed`, check `Requeue Threshold XP` = true (Ready formula should become 1).
4. On the automation, use **Test** / run with that WAS `recordId`.
5. Expect:
   - `statusOut` = `success`
   - `actionOut` = `created` (first award) or `skipped_existing` (if already awarded)
   - XP Event(s) with Source Key `WEEKLY_THRESHOLD|{SchmidtEnrollmentId}|{weekId}|100` (+125/150 if met)
   - `XP Points` = 10 / 20 / 30 from rules
   - `XP Bucket` = Weekly Threshold
   - `XP Activity Date` = that week’s Saturday end date
   - WAS `Threshold XP Status` = Processed; `Requeue Threshold XP` = unchecked
6. Re-run same record → `createdCountOut` = 0; no new XP Event rows.

## Activation criteria

Turn **ON** only after:

- Competing Threshold automations OFF (attested)
- Test 1 create + Test 2 idempotency pass on Schmidt
- No unexpected XP Source / Bucket values

## Rollback

1. Turn automation **035** OFF.
2. Do **not** delete XP Events without Mike approval.
3. Restore prior script body from git tag/commit before v1.1 if a previous paste existed (this writer is new — usually none).
4. If Status stuck on Error: clear `Threshold XP Error Message`, set Status blank or Pending per ops SOP, leave Ready formula to requeue only after fix.

## Related

- Schmidt live-proof pack: `docs/testing/SCHMIDT-LIVE-PROOF-PR43-THRESHOLD-057.md`
- Registry: `docs/next-wave/automation-ownership/xp-source-key-registry.json`
- Contracts: `airtable/automations/shooting-challenge/lib/v2-engine-contracts.js`
- Also paste: `057` v1.4 — see `docs/deploy-checklists/057-perfect-week-denver-v1.4.md`
