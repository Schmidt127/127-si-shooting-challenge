# Weekly Athlete Summary Guarantee Audit (SC-035, SC-037)

| Field | Value |
|---|---|
| Date | 2026-07-23 (Agent 5 overnight — communications) |
| Base audited | PROD `appn84sqPw03zEbTT` (read-only probe + authorized cleanup) |
| Evidence | `docs/overnight/communications/results/live-probe-20260723_223805.json`, `orphan-was-*.json`, `prod-schema-was-weeks-enrollments.txt` |
| Tests | `tools/airtable/tests/test_agent5_was_guarantee_contract.py` (14 tests, green) |

## 1. Writers and creation paths (complete inventory)

| # | Script | Version | Creates WAS? | Match key | Empty week? | Race protection |
|---|--------|---------|--------------|-----------|-------------|-----------------|
| 031 | find-or-create WAS from submission | v3.1 | **Yes** (primary path) | `Summary Key` formula = `{Enrollment Key}\|{Week Key}` | No — counted submissions only | Throws on duplicate key; no re-query immediately before create |
| 101 | Zoom attendance XP | v5.5 | **Yes** (Zoom-only weeks) | Enrollment + Week record links | Zoom-only yes | Throws on multiple matches; no second-check before create |
| 118 | Schedule weekly build (repo-only, v1.2) | v1.2 | **Yes** (scheduled ensure) | Summary Key first, Enrollment+Week fallback | **Yes — the SC-035 guarantee** | Skips duplicates silently (`duplicateWasSkippedOut`) |
| 115 | Testing scenario runner | v1.8 | No (updates PW status on existing WAS) | — | — | — |
| backfill | `safe-backfills/backfill-missing-weekly-summaries-and-xp-links.js` | — | Repair only | Enrollment+Week ids | — | DRY_RUN + CONFIRM_WRITE; skips if ≥2 exist |
| 010/020/054/059/065/114 | XP/homework writers | — | No — link to existing WAS only | — | — | — |
| web | `web/lib/airtable/queries.ts` | — | Read-only, table reserved | — | — | — |

`Summary Key` live shape verified 2026-07-23: `ATH-recgqVstObQRzgXJF|2025-2026|recVDKiYATgzsfpmE` = `{Enrollment Key}|{Week Key}` (Enrollment Key itself contains a pipe). 031/118 lookups agree with this format.

## 2. Live uniqueness verification (PROD, 2026-07-23)

- Before cleanup: **393 WAS rows, 1 enrollment**. 392 rows had a Week link but an **empty Enrollment link** — orphans left when the empty-base reset deleted Enrollments but not their WAS rows. They violated the one-per-Enrollment×Week guarantee, made every 118/119 full-table scan process ~390 dead rows, and produced misleading grouped "duplicates" per week.
- Cleanup executed (authorized by master §1 rules 2 and 5): dry run first, then `CONFIRM_DELETE`. **392 orphans deleted**; key-field evidence committed; full rows remain in Airtable trash for the recovery window.
- After cleanup: **1 WAS row** — Schmidt `rechWp330MqSgRWzN` (Enrollment `recgP9qZYjAhE7NXm` × Week `recVDKiYATgzsfpmE`). Uniqueness holds: one Enrollment, one Week, one summary.
- Live 115 submission `recuuTBgstSTGg2E3` links to that WAS and to exactly one 20-point XP Event (`SUBMISSION_XP|recuuTBgstSTGg2E3`). No duplicate XP Source Keys anywhere in the base.

## 3. Coverage guarantee ("every active Enrollment/Week gets a summary")

- **Submission-driven weeks:** guaranteed by 031 at first counted submission.
- **Zoom-only weeks:** guaranteed by 101.
- **Homework-only and empty weeks:** guaranteed **only by 118**, which is **not installed in PROD yet**. Until 118 is pasted and scheduled, a week with no counted submission and no Zoom meeting produces no WAS. This is the single remaining gap for SC-035 → Mike action: install 118 (see MIKE-ACTIONS.md).
- 118 v1.2 (this run) fixes the defect that would have silently broken the guarantee: Weeks has **no `Week End Key` field**, so 118 fell back to parsing `End Date` (dateTime, Saturday 23:59 Denver = Sunday 05:59 UTC) with **UTC** date parts, yielding a Sunday key that never equals the prior-Saturday target → `skipped_no_target_week` every run. v1.2 converts to the America/Denver calendar date. Regression-tested against the real script source (`lib/118-119-week-key.test.js`, 16 tests).

## 4. Audited behaviors

| Behavior | Finding |
|---|---|
| Creation timing | Event-driven (031/101) at activity time; scheduled (118) Sunday 05:00 Denver for the just-ended week |
| Submission-triggered | 031 verified live: submission → WAS → chain (030 grade band → 032 goal → 033 homework → 034 prev-week helpers) |
| Scheduled creation | 118 repo-ready; dryRun default true; Live+!dryRun refused; requires PROD install |
| Homework links | 033 assigns curriculum by Week + Grade Band; completions linked by 020 |
| Video links | Video Feedback linked via Enrollment+Submission; note: live video XP event `recYQ10pOoFlApmjZ` has **no Week link** (see defect D3) |
| Zoom links | 101 Attendees-only; recording credit via Stage 17 orchestrator writes ZOOM_CREDIT XP |
| XP totals | `XP Earned This Week` rollup of linked XP Events — correctness depends on writers linking XP to the WAS/Week |
| Days logged / shots | Rollups from linked Submissions (see WAS-CALCULATION-AUDIT.md) |
| Current level | Not stored on WAS; `Level Number` formula from `Total XP After Week`; email reads Enrollment display |
| Perfect Week fields | 057 writes helper counts; `Perfect Week Eligible?` formula; 058 creates unlock with `PERFECT_WEEK\|{enrollment}\|{week}` key |
| Empty-week behavior | Record always created by 118; email policy is the open SC-035 decision (see EMPTY-WEEK-EMAIL-DECISION.md) |
| Backdated updates | Submissions carry `Activity Date Key`; 005 assigns Week by date range, so backdated submissions land in the correct week's WAS; contract-tested |
| Rerun safety | 031 skips already-linked; 101 find-path idempotent; 118 skips Sent? and duplicates; contract-tested |

## 5. Defects found

| ID | Severity | Defect | Status |
|----|----------|--------|--------|
| D1 | High | 392 orphaned WAS rows (empty Enrollment) breaking uniqueness | **Fixed live** (CONFIRM_DELETE, evidence committed) |
| D2 | High | 118/119 UTC week-end key mismatch → scheduler never finds target week | **Fixed in repo** (v1.2) — needs PROD paste |
| D3 | Medium | Video XP events created without a Week link (live example `recYQ10pOoFlApmjZ`, `VIDEO_SUBMISSION\|reccXspFIiNIPMPcm`) — excluded from `XP Earned This Week` rollup and from 072's enrollment+week XP matching unless linked from the summary | Open — writer is 114; needs a Week-link step or backfill; flagged in REPORT |
| D4 | Medium | Zoom XP event `recOceuW34jQz7suD` has `Active?` empty (not true) — 072 treats non-true as inactive and excludes it from the email XP detail | Open — confirm intended Active? semantics for ZOOM_CREDIT events |
| D5 | Low | 031/101/118 have no create-then-recheck; concurrent create race can produce duplicates (031 would throw on the *next* run) | Open — acceptable short-term; EMC design proposes a shared ensure-WAS helper |

## 6. Test coverage added (Package A)

`test_agent5_was_guarantee_contract.py`: first submission create; second submission same week reuse; rerun idempotent; duplicate-race flags without multiplying; orphan rows never satisfy lookup; missing links error; different week creates second row; backdated routing; Saturday/Sunday boundary; homework-only, Zoom-only, and empty weeks all still get a WAS. All green (see RESULTS.json).
