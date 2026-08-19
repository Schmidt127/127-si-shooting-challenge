# Schmidt Live-Proof Pack — PR #43 (035 v1.1 + 057 v1.4)

**Enrollment:** Schmidt `recgP9qZYjAhE7NXm`
**Athlete:** `recgqVstObQRzgXJF`
**Must remain:** `Active?` = true; public visibility unchanged
**Date:** 2026-07-25
**Repo status:** Ready for PROD Paste — do not mark Complete until this pack passes

---

## Preflight (before any paste)

1. Automations search: `Threshold`, `Weekly Threshold`, `035`.
2. For every match that creates Weekly Threshold XP and is **not** the new 035: record name + ON/OFF → turn **OFF** if ON.
3. XP Events filter: `XP Bucket` = `Weekly Threshold` OR `XP Source` contains `Weekly Threshold`.
   - Copy any Source Key shapes that are **not** `WEEKLY_THRESHOLD|rec…|rec…|{100|125|150}`.
   - If none exist → note “no legacy rows found”.
4. Confirm active XP Reward Rules: `WEEKLY_THRESHOLD_100_*`, `_125_*`, `_150_*` for Schmidt’s Grade Band.

---

## Test 1 — Weekly Threshold first award

| Step | Exact action |
|------|----------------|
| 1 | Table `Weekly Athlete Summary` → open Schmidt WAS for target week (example seed WAS `rechWp330MqSgRWzN` only if it is the intended week; otherwise pick current week WAS). |
| 2 | Confirm field `Enrollment` = Schmidt `recgP9qZYjAhE7NXm`. |
| 3 | Confirm `Goal Completion %` ≥ `1` (100%). If not, seed counted Submissions until formula reaches ≥ 1. |
| 4 | Confirm `Enrollments.Active?` = checked for Schmidt. |
| 5 | If `Threshold XP Status` = `Processed`, set `Requeue Threshold XP` = checked. |
| 6 | Confirm formula `Threshold XP Ready?` = `1`. |
| 7 | Paste **035 v1.1** per `docs/deploy-checklists/035-weekly-threshold-xp-v1.1.md` (start **OFF**). |
| 8 | Run script Test with input `recordId` = that WAS record id. |

**Expected**

| Field / output | Value |
|----------------|-------|
| `statusOut` | `success` |
| `actionOut` | `created` |
| XP Events created | 1–3 rows (100 / 125 / 150 as met) |
| `Source Key` | `WEEKLY_THRESHOLD\|recgP9qZYjAhE7NXm\|{weekId}\|{100\|125\|150}` |
| `XP Bucket` | `Weekly Threshold` |
| `XP Source` | `Weekly Threshold 100` (etc.) |
| `XP Points` | 10 / 20 / 30 from rules (not invented) |
| `XP Activity Date` | Week End Date (Saturday) for linked Week |
| WAS `Threshold XP Status` | `Processed` |
| WAS `Requeue Threshold XP` | unchecked |

**Pass evidence:** screenshot/log of outputs + XP Event Source Keys.

---

## Test 2 — Weekly Threshold idempotency

| Step | Exact action |
|------|----------------|
| 1 | Same WAS as Test 1. |
| 2 | Set `Requeue Threshold XP` = checked (Ready should become 1). |
| 3 | Run 035 again with same `recordId`. |

**Expected**

| Check | Value |
|-------|-------|
| New XP Events for same Source Keys | **0** |
| `actionOut` | `skipped_existing` (or `created` only if a newly met higher tier) |
| Script log | plans show `skip_existing` / `skipVia` for prior tiers |

**Cleanup if needed:** leave Status = Processed; uncheck Requeue.

---

## Test 3 — Legacy-key compatibility

| Step | Exact action |
|------|----------------|
| 1 | From Preflight step 3: if a legacy Source Key exists for Schmidt + same week + XP Source `Weekly Threshold 100`, note it. |
| 2 | If **no** legacy row exists: create **one controlled** XP Event manually (Production preferred; PROD only if Mike approves): Enrollment=Schmidt, Week=same, XP Bucket=`Weekly Threshold`, XP Source=`Weekly Threshold 100`, Source Key=`LEGACY_THRESHOLD_TEST\|recgP9qZYjAhE7NXm\|{weekId}` (intentionally non-canonical). |
| 3 | Ensure Goal Completion ≥ 100%; Requeue; run 035. |

**Expected:** No second award for 100% tier (`skipVia` = `xp_source_label`). Higher unmet tiers may still create.

**If historical shape cannot be established in PROD:** stop after Preflight documentation; do not invent mass backfill. Semantic guard is the bridge.

**Cleanup:** delete the controlled LEGACY test XP Event if created.

---

## Test 4 — Perfect Week Denver boundary

| Step | Exact action |
|------|----------------|
| 1 | Paste **057 v1.4** per `docs/deploy-checklists/057-perfect-week-denver-v1.4.md`. |
| 2 | Ensure a Schmidt Submission in the target week has a timestamp where UTC day ≠ Denver day (example ISO `2026-07-24T03:00:00.000Z` → Denver `2026-07-23`). |
| 3 | Run 057 with `recordId` = Schmidt WAS. |

**Expected:** Daily check uses Denver `2026-07-23` (not UTC `2026-07-24`). Detail fields list the Denver date key.

---

## Test 5 — Perfect Week regression

| Case | Setup | Expected |
|------|-------|----------|
| Pass | 7 distinct Denver days Sun–Sat, daily min met, ≥3 videos, homework 100%, Zoom only if meeting exists | Daily/Video/Homework/Zoom mets true; eligibility helpers ready for unlock path |
| Fail bulk | 1,500 shots on one day only | Daily requirement **not** met |
| Fail six days | 6 of 7 days | Daily **not** met |
| Fail videos | 2 videos | Video **not** met |
| Fail Zoom | Meeting exists, no live/recording credit | Zoom **not** met |
| Pass no Zoom | No Zoom Meeting for week | Zoom does **not** block |

Rerun 057 twice → helper fields stable (idempotent calculation).

---

## Test 6 — Fixtures SCN-021 through SCN-026 (order)

| Order | Fixture | Automation | Cleanup |
|-------|---------|------------|---------|
| 1 | SCN-021 homework satisfactory XP | 065 (after HC Score path) | Optional deactivate test XP |
| 2 | SCN-022 homework duplicate prevent | Re-run 065 | None if skip |
| 3 | SCN-023 video feedback XP | 114 | Optional deactivate |
| 4 | SCN-024 Zoom attendance XP | 101 / 117 path as fixture states | None |
| 5 | SCN-025 weekly threshold XP | **035** (Tests 1) | Optional |
| 6 | SCN-026 weekly threshold duplicate | **035** (Test 2) | None |

Exact field values: see `docs/testing/scenarios/scn-021-*.json` … `scn-026-*.json`.

---

## Stopping conditions

- Stop and leave 035 **OFF** if duplicate Weekly Threshold XP appears for the same enrollment+week+tier.
- Stop if 035 writes formula fields or invents XP amounts.
- Stop if 057 daily keys follow UTC for evening timestamps after v1.4 paste.
- Do **not** enable mass requeue of historical WAS until Preflight Source Key inspection is recorded.

## Status language after pack

| Item | After paste only | After this pack passes |
|------|------------------|------------------------|
| SC-049 / 035 | Pasted in PROD | Live-Tested → then Complete |
| SC-021 / 057 | Pasted in PROD | Live-Tested (Denver proof) |
| SC-002 fixtures | — | Live-executed (partial OK per fixture) |
