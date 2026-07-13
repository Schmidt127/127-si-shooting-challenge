# C-024 — Dedupe key engine contract (Stage 2)

**Date:** 2026-07-12  
**Worker:** D — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-d-s2-c024-dedupe-contract`  
**Base SHA:** `c59dca8`  
**Authorization:** [LEAD-STAGE2-AUTHORIZED.md](../overnight-runs/2026-07-12/LEAD-STAGE2-AUTHORIZED.md)  
**Status:** Stage 2 repo documentation — **no PROD**, no automation edits  
**Related:** [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md), [C-023-lambda-duplicate-hash-contract.md](../../make/documentation/C-023-lambda-duplicate-hash-contract.md)

---

## Purpose

C-024 defines **record-identity** dedupe: one canonical key per source activity so automations and backfills can recheck before create and reruns stay safe.

C-023 defines **file-byte** dedupe: SHA-256 on uploaded bytes, flag-only review, never block upload or reuse S3 objects.

| Concern | Owner | Key field(s) | Question answered |
|---------|-------|--------------|-------------------|
| Same stats / same attachment slot | C-024 | `Duplicate Key`, `Source Attachment ID`, `Homework Completion Key` | Did we already create this row? |
| Same file bytes | C-023 | `File Content Hash` | Did another asset already store these bytes? |
| Same XP / unlock ledger row | C-024 | `Source Key`, `Milestone Source Key`, `XP Dedupe Key` | Did we already award this activity? |

**Rule:** Hash match does not replace Source Key. A duplicate-bytes asset may still earn XP until **116** applies a confirmed-duplicate consequence. Byte layer and identity layer are complementary.

---

## Layer model

```text
Submissions (007 Duplicate Key)
    └── Submission Assets (009 Source Attachment ID + C-023 File Content Hash)
            ├── Homework Completions (Homework Completion Key — 065)
            │       └── XP Events HOMEWORK_XP|… (065, 116)
            └── Video Feedback → XP Events VIDEO_SUBMISSION|… (114, 116)

Submissions (counted) → XP Events SUBMISSION_XP|… (010)
Streak Occurrences → XP Events STREAK_XP|… (054)
Athlete Achievement Unlocks PERFECT_WEEK|… / SHOT_MILESTONE|… (058, 066)
    └── XP Events PERFECT_WEEK|… / SHOT_MILESTONE|… (059)
Zoom Meetings → XP Events ZOOM_ATTEND_* (101)
```

---

## Canonical patterns (14)

Every pattern below is cited from an automation docblock, script section, or CONFIG block in this repo. Do not invent keys outside this table.

| # | Layer | Canonical pattern / field | Writer | Recheck behavior | Evidence |
|---|-------|---------------------------|--------|------------------|----------|
| 1 | Submissions | `Submissions.Duplicate Key` formula | **007** | Finds other Submissions with same key; excludes current record; sets duplicate review status | **007** PURPOSE: reads `Duplicate Key` and finds other Submissions with the same key. |
| 2 | Submission Assets | `Submission Assets.Source Attachment ID` | **009** | Loads existing assets for the submission; skips create when same source attachment ID already exists | **009** section: “Load existing assets to prevent duplicates.” |
| 3 | File bytes | `Submission Assets.File Content Hash` SHA-256 | C-023 Lambda | Global hash lookup among Uploaded assets; flag-only review; upload continues | C-023 Lambda contract: SHA-256 detection; duplicate bytes are flag-only. |
| 4 | Homework Completions | `Homework Completion Key` | Schema formula; **065** requires | **065** throws if blank before XP award | **065** CONFIG `completionKey: "Homework Completion Key"` and guard for missing key. |
| 5 | XP Events | `SUBMISSION_XP|{submissionId}` | **010** | Finds existing daily shooting XP using duplicate-safe checks; repairs when found | **010** CONFIG `sourceKeyPrefix: "SUBMISSION_XP|"`; PURPOSE says existing XP is found before create. |
| 6 | XP Events | `{enrollmentId}|{submissionId}|Submission Base` (`XP Dedupe Key`) | **010** | Secondary match alongside Source Key and submission link | **010** `buildSubmissionDedupeKey`; XP Source = `Submission Base`. |
| 7 | XP Events | `HOMEWORK_XP|{homeworkCompletionId}` | **065** | Finds existing XP by Source Key; links and marks Awarded | **065** CONFIG `sourceKeyPrefix: "HOMEWORK_XP|"`; result text “Existing XP Event found by Source Key.” |
| 8 | XP Events | `VIDEO_SUBMISSION|{videoFeedbackRecordId}` | **114** | Match order: linked XP, Source Key, safe contextual match; refuses steal risk | **114** IMPORTANT DESIGN RULE: “Source Key must remain: VIDEO_SUBMISSION|recordId.” |
| 9 | XP Events | `STREAK_XP|{enrollmentId}|{achievementId}|{streakEndDateKey}` | **054** | Source Key match repairs existing streak XP | **054** PURPOSE lists `STREAK_XP|Enrollment ID|Achievement ID|Streak End Date`. |
| 10 | XP Events | `ZOOM_ATTEND_BASE|{zoomMeetingKey}|{enrollmentId}` | **101** | Source Key index supports supplemental reruns without double base XP | **101** PURPOSE says stable Source Keys; CONFIG `basePrefix: "ZOOM_ATTEND_BASE"`. |
| 11 | XP Events | `ZOOM_ATTEND_BONUS_2|{enrollmentId}` | **101** | One-time bonus keyed per enrollment | **101** CONFIG `bonus2Prefix: "ZOOM_ATTEND_BONUS_2"`. |
| 12 | XP Events | `ZOOM_ATTEND_BONUS_3|{enrollmentId}` | **101** | One-time bonus keyed per enrollment | **101** CONFIG `bonus3Prefix: "ZOOM_ATTEND_BONUS_3"`. |
| 13 | Athlete Achievement Unlocks | `PERFECT_WEEK|{enrollmentId}|{weekId}` | **058** | Queries unlocks by Source Key; skips create if match exists | **058** section “Duplicate Protection by Source Key.” |
| 14 | Athlete Achievement Unlocks / XP Events | `SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}` | **066** creates unlock; **059** creates XP | Milestone Source Key prevents duplicate unlock; **059** uses same pattern or fallback key for XP | **066** DESIGN RULE lists exact pattern; **059** has `buildShotMilestoneSourceKey`. |

**Achievement note:** **059** also uses `PERFECT_WEEK|{enrollmentId}|{weekId}` for Perfect Week XP via `buildPerfectWeekSourceKey`, falling back to the unlock Source Key. That is the same canonical prefix and dimensions as pattern 13, carried from unlock to XP.

**116 alignment:** **116** does not define a new key. It reads `VIDEO_SUBMISSION|` and `HOMEWORK_XP|` to apply C-023 duplicate consequences idempotently to existing activity XP rows.

---

## Recheck-before-create standard

All automation writers and future backfills in C-024 scope must follow this sequence:

1. Build canonical key from source record ID(s), not from display names or filenames alone.
2. Query or index existing rows by that key and any documented secondary key.
3. If exactly one match exists, repair or update in place.
4. If multiple matches exist, return an error and require manual review.
5. If no match exists, create one row and write the Source Key on create.
6. Missing prerequisites are skipped; conflict or record-stealing risk is an error.

**116 idempotency evidence:** The **116** docblock requires “One activity source → at most one XP Event” and says re-selecting the same reuse decision makes no additional changes.

---

## Safe backfill rerun standard

| Rule | Requirement |
|------|-------------|
| Default mode | Dry-run (`DRY_RUN=true` or no `CONFIRM_WRITE`) — report only. |
| Create path | `find-by-key → skip if exists → create if missing`. |
| Update path | Skip field writes when the value already matches. |
| XP creates | Never create without Source Key guard matching the automation prefix. |
| Deletes | No record/S3 deletion in C-024 scope, aligning with C-023 no-delete policy. |
| Partial failure | Rerun must not create double XP, duplicate assets, duplicate unlocks, or duplicate emails. |
| Audit markers | C-023 consequence rows use `[C-023-S5]` in XP debug text; backfills must preserve it. |

**Rerun verdict:** After a failed batch, rerun the same script with the same filters. Created counts should drop to zero; skipped-existing or updated counts may rise. Any net-new duplicate indicates a key guard bug.

---

## Relationship to C-023 file-hash layer

| Scenario | C-023 byte layer | C-024 identity layer |
|----------|------------------|----------------------|
| Same PDF re-uploaded with new attachment ID | New asset row still uploads; hash may flag `Potential Asset Reuse?` | **009** sees a new attachment ID; **065** / **114** still enforce one XP row per activity source. |
| Same submission stats re-submitted | Not a file-byte concern | **007** flags `Duplicate Key` collision. |
| Confirmed duplicate asset | **116** applies consequence after human review | Same `VIDEO_SUBMISSION|` or `HOMEWORK_XP|` XP row is deactivated/reactivated; no second XP row. |
| Lambda retry on same record | `skipped_already_uploaded`; no second S3 object | Same Submission Asset record; no new identity row. |

---

## Writer matrix

| Automation | Table(s) written | Canonical key role |
|------------|------------------|--------------------|
| **007** | Submissions status only | Reads `Duplicate Key`. |
| **009** | Submission Assets | Writes / checks `Source Attachment ID`. |
| **010** | XP Events | `SUBMISSION_XP|{submissionId}` plus `XP Dedupe Key`. |
| **054** | XP Events | `STREAK_XP|…`. |
| **058** | Athlete Achievement Unlocks | `PERFECT_WEEK|…`. |
| **059** | XP Events | `PERFECT_WEEK|…` / `SHOT_MILESTONE|…`. |
| **065** | XP Events | `HOMEWORK_XP|{homeworkCompletionId}`. |
| **066** | Athlete Achievement Unlocks | `Milestone Source Key` = `SHOT_MILESTONE|…`. |
| **101** | XP Events | `ZOOM_ATTEND_BASE|…`, `ZOOM_ATTEND_BONUS_2|…`, `ZOOM_ATTEND_BONUS_3|…`. |
| **114** | XP Events | `VIDEO_SUBMISSION|{videoFeedbackId}`. |
| **116** | Video Feedback, Homework, XP Events consequences | Reads `VIDEO_SUBMISSION|` and `HOMEWORK_XP|`. |

---

## Open items outside Worker D scope

- **C-025:** Recording-watch Zoom path needs a distinct future Source Key prefix from live attendance. **101** does not define that path today.
- **C-009 / 067:** HW17 attachment-less quiz path needs an approved schema and key contract before implementation.
- **Legacy Source Keys:** Old rows may not match current prefixes. The audit spec reports them; it does not auto-delete or auto-merge.

---

*Worker D · C-024 Stage 2 · 14 canonical patterns*
