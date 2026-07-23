# Current PROD Testing Baseline — 2026-07-23 (Overnight Agent 1)

**Base:** PROD `appn84sqPw03zEbTT` (active development, construction, and testing environment)
**Evidence date:** 2026-07-23 (read-only API probes, evening MT)
**Author:** Overnight Agent 1 — unattended testing/integrity run

This document supersedes stale statements in older docs (see "Stale claims corrected" below).
Controlling source of truth: `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` + confirmed facts from
the 2026-07-23 overnight assignment.

---

## 1. Current automation state (confirmed facts)

| Item | State |
|------|-------|
| Automation 115 | **Installed in PROD** — `115 - Engineering Test Framework - Run Testing Scenario Daily Submission` (repo v1.8) |
| 115 dry run | **PASS** (scenario `recPdyfYRFgDtpzQ8`, Daily Submission, mode `dry_run`, shot total 25) |
| 115 live run | **PASS** (mode `created`, Submission `recuuTBgstSTGg2E3`, shot total 25) |
| Deleted PROD automations | **043, 032, 033, 063, 111** |
| Replaced with newer DEV versions | **030, 020, 013** |
| Free PROD automation slots | ~4 |
| Weeks | Manually created/seeded in advance; manual Week naming is **by design**, not a defect |
| DEV-first | **No longer required**; PROD is the active construction/testing base |

## 2. Known record IDs (live-verified 2026-07-23 by read-only API probe)

| Record | ID | Verified live state |
|--------|----|---------------------|
| Schmidt Athlete | `recgqVstObQRzgXJF` | exists |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` | exists; linked from all current Submissions |
| Foundation Week | `recVDKiYATgzsfpmE` | covers 2026-07-23 |
| Testing Scenario seed | `recPdyfYRFgDtpzQ8` | `Last Run Status=Pass`, `Last Run At=2026-07-23T22:08:37Z`, `Linked Submission=recuuTBgstSTGg2E3`, `Run Test?` cleared |
| 115 live-run Submission | `recuuTBgstSTGg2E3` | created 2026-07-23T22:08:38Z; Week + Enrollment linked; 1 XP Event |
| Foundation manual Submission | `recaCcxDqtzFWjmyi` | created 21:19Z; 1 XP Event |
| Third 7/23 Submission | `rec6g1nth8PlSwA6z` | created 22:04Z (earlier live test); 1 XP Event |
| Schmidt WAS | `rechWp330MqSgRWzN` | Summary Key `ATH-recgqVstObQRzgXJF\|2025-2026\|recVDKiYATgzsfpmE`; Total Shots 75; Calculation Status Complete |
| Schmidt XP Events | `recOodD23MQrP1O9F`, `recOqzhV4kTdsfzMf`, `recrYV19IqolkoMwT` | one Submission Base XP (20) per Submission |
| Video XP Event | `recYQ10pOoFlApmjZ` | `VIDEO_SUBMISSION\|reccXspFIiNIPMPcm`, 1 XP, 2026-07-10 |
| Zoom recording XP Event | `recOceuW34jQz7suD` | `ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|reczeUT0AJUWMmEOb`, 30 XP, 2026-07-20 |
| Testing Scenarios table | `tblagI7Q5wXQm2XGS` | 24 fields; 1 scenario row |

## 3. Live pipeline evidence (post-reset, Schmidt)

Verified by full-table read-only pulls on 2026-07-23:

| Check | Result |
|-------|--------|
| One Submission Base XP Event per Submission | **PASS** — 0 Submissions with >1 linked XP Event (base-wide) |
| Source Key format Submission Base | `SUBMISSION_XP\|{submissionRecordId}` (observed on all 3 live events) |
| Blank Source Keys | **0** of 2,543 XP Events |
| Duplicate Source Keys | **0** |
| Duplicate `XP Dedupe Key Normalized` | **0** |
| WAS uniqueness for Schmidt (Enrollment, Week) | **PASS** — exactly 1 WAS despite 3 Submissions in the same week |
| WAS rollups | Total Shots This Week = 75 (3 × 25) — correct |
| Same-day duplicate Submissions | 3 Submissions share Activity Date 2026-07-23; all `Duplicate Review Status=Count It` (115 presets Count It by design); all three earned XP. Duplicate-day policy is a **scenario-design consideration**, not an idempotency failure. |

## 4. Known manual processes

- Weeks are seeded manually (primary field may require manual entry). Do not automate tonight.
- Testing views must be created in the Airtable UI (API cannot create/filter views) — see `TESTING-VIEWS-MIKE-ACTIONS.md`.
- Airtable automation install/paste/trigger edits are UI-only — recorded in `MIKE-ACTIONS.md` when needed.

## 5. Confirmed live pass (Automation 115)

- Dry run: scenario `recPdyfYRFgDtpzQ8`, type Daily Submission, result success, mode `dry_run`, shot total 25.
- Live run: same scenario, result success, mode `created`, Submission `recuuTBgstSTGg2E3`, shot total 25.
- Downstream (normal production automations, not 115): Week link (`recVDKiYATgzsfpmE`), WAS (`rechWp330MqSgRWzN`), one 20-point Submission Base XP Event (`recOodD23MQrP1O9F`).
- 115 wrote only: Submissions intake fields + Testing Scenarios result fields. No XP, no Week, no WAS writes. Confirmed by script audit (`AUTOMATION-115-AUDIT.md`) and by live field inspection.

## 6. Major defect found tonight — orphaned legacy records

The empty-base reset removed Athletes/Enrollments/Submissions/Homework Completions/Achievement
Unlocks but **left downstream tables un-wiped**. Verified counts (2026-07-23):

| Table | Total rows | Orphaned (no Enrollment/Submission link) |
|-------|-----------:|------------------------------------------:|
| XP Events | 2,543 | **2,538** (all created 2026-04-24 … 2026-07-05, legacy season) |
| Weekly Athlete Summary | 393 | **392** (link to Weeks only; Enrollment link empty) |
| Submission Assets | 280 | **278** |
| Video Feedback | 1 | 0 (Schmidt-linked, 2026-07-23) |
| Homework Completions | 0 | — |
| Athlete Achievement Unlocks | 0 | — |

Impact: orphan rows pollute testing views, full-table automation scans, rollups keyed on Week, and
any "count expected records" verification. They do **not** cause XP duplication (their Source Keys
reference deleted records and cannot collide with new keys).

Disposition: allowed to delete under current operating rules ("historical participant data does not
need to be preserved"), but bulk deletion of ~3,200 rows without a rollback path was **not**
executed unattended. A dry-run-first cleanup utility is provided:
`tools/testing/cleanup_orphan_legacy_rows.py` (requires explicit `CONFIRM_DELETE`). Decision logged
in `MIKE-ACTIONS.md`.

## 7. Remaining unproven areas (testing scope)

| Area | Status |
|------|--------|
| 115 Homework branch in PROD | Not live-tested after reset (needs homework file fixture + assignment link) |
| 115 Video branch in PROD | Not live-tested after reset (needs video attachment fixture) |
| Backdated submission → correct (older) Week assignment | Not tested post-reset (needs a second seeded Week; only Foundation Week `recVDKiYATgzsfpmE` + legacy weeks exist) |
| Duplicate-day policy (007a flag vs 115 `Count It` preset) | Behavior documented; product policy decision open |
| Homework / Video / Zoom / Streak / Milestone / Perfect Week / Weekly Threshold XP reruns | No post-reset live evidence (sources have no post-reset rows yet) |
| Weekly summary build/send (118/119) | Not installed / not tested |
| Achievement unlock dedupe post-reset | No post-reset unlock rows |

## 8. Stale claims corrected (do not re-propagate)

| Stale claim | Where it appears | Current truth |
|-------------|------------------|---------------|
| "115 not installed in PROD; paste required" | `docs/foundation-reset/FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md`, `MIKE-ACTION-INSTALL-115-PROD.md`, completion master SC-001 | 115 installed; dry + live PASS |
| "PROD at 50/50 automation limit" | `DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md`, completion master SC-001/SC-058/SC-059 | ~4 free slots after deletions |
| "Delete 112 first to free a slot" | reconciliation + completion master §9B | Capacity already freed via 043/032/033/063/111 deletions |
| "Do not delete 032/033/063/111" | reconciliation audit | They were deleted deliberately; do not reinstall |
| "Schmidt exclusion view filter needed" / "exclude Schmidt from leaderboard" | completion master SC-004, foundation evidence | **Superseded** — Schmidt must remain visible everywhere (standings, leaderboards, website, dashboards) |
| "Never install 115 in PROD" (C-020 rule) | old C-020 docs, 115 file header note "DEV only until promotion doc" | Superseded by SC-001/SC-137; 115 runs in PROD |
| "DEV-first mandatory" | doc 04 / constitution language | Superseded by completion master §1 operating rules |
| "Week creation should be automated" | various backlog notes | Weeks are manual by design; not a defect |

## 9. Evidence sources

- Read-only probes (this run): full-table pulls of XP Events, WAS, Submission Assets, Video
  Feedback, Homework Completions, Athlete Achievement Unlocks, Submissions, Weeks, Testing
  Scenarios. Summarized in `RESULTS.json`.
- Schema: `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/` (2026-07-23 15:22 export).
- Foundation pack: `docs/foundation-reset/FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md` (pre-115 state).
- Confirmed 115 install/dry/live facts: 2026-07-23 overnight assignment brief (Mike-attested).
