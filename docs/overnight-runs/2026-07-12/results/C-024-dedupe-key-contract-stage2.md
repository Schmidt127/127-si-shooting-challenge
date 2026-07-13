# C-024 — Dedupe key contract (Stage 2)

**Date:** 2026-07-13  
**Worker:** D — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-d-s2-c024-dedupe-contract`  
**Base SHA:** `c59dca8`  
**Backlog:** C-024 — rock-solid dedupe keys + safe backfill reruns  
**Status:** **IN PROGRESS** — first table saved; full inventory continues

**Relationship to C-023:** C-023 = **file bytes** (SHA-256, `Potential Asset Reuse?`). C-024 = **record identity** (Source Key / dedupe keys). Complementary — never conflate filename with either layer.

---

## Canonical key patterns (initial inventory)

Patterns cited from automation docblocks. Expand in Section 2 after full docblock pass.

| Record type | Descriptive key name | Exact key format | Source fields | Create behavior | Rerun behavior |
|-------------|---------------------|------------------|---------------|-----------------|----------------|
| Submission XP | Submission XP Source Key | `SUBMISSION\|{submissionRecordId}` | Submission record id | **010** recheck Source Key before create | Skip if key exists |
| Homework XP | Homework XP Source Key | `HOMEWORK_XP\|{homeworkCompletionId}` | Homework Completion id | **010** / homework pipeline | Skip if key exists |
| Video feedback XP | Video submission XP | `VIDEO_SUBMISSION\|{videoFeedbackId}` | Video Feedback record id | **114** recheck before create | Skip; **116** may deactivate duplicate XP |
| Shot milestone unlock | Milestone Source Key | `SHOT_MILESTONE\|{enrollmentId}\|{milestoneId}` | Enrollment, milestone rule | **066** idempotent create | Skip if unlock exists |
| Perfect week unlock | Perfect week key | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | Enrollment, week | **058** duplicate guard by Source Key | Skip if key exists |
| Perfect week XP | Perfect week XP | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | From unlock | **059** matches existing Source Key | Skip if XP exists |
| Streak XP | Streak occurrence | `STREAK\|{streakOccurrenceKey}` | Streak rollup key | **054** | Skip if key exists |
| Zoom live XP | Zoom attendance | `ZOOM_LIVE\|{meetingId}\|{enrollmentId}` | Meeting, enrollment | **101** attendee link | Supplemental re-run guarded |
| Gate / level XP | Level gate | `LEVEL_GATE\|{enrollmentId}\|{gateId}` | Enrollment, gate rule | **065** | Recheck Source Key |
| Asset reuse consequence | Video/homework reuse XP | `VIDEO_SUBMISSION\|{vfId}` / `HOMEWORK_XP\|{hcId}` | VF or HC id | **116** on Confirmed Duplicate | Deactivate same row by Source Key; reversal reactivates |
| Submission stat duplicate | Duplicate Key (formula) | Composite enrollment+date+stats | **007** inputs | Flag only — not Source Key | N/A — review queue |
| Submission asset bytes | File content hash | SHA-256 hex | Lambda writeback | C-023 review — not C-024 Source Key | New S3 object always; flag reuse |

---

## Section 2 — Full automation writer inventory

*007, 009, 010, 054, 058, 059, 065, 066, 101, 114, 116 — docblock citations next.*

## Section 3 — Backfill rerun standard

*find-by-key → skip if exists → create if missing.*

## Section 4 — Audit script cross-reference

*See `C-024-audit-dedupe-key-coverage-requirements.md` (next deliverable).*

---

*Worker D · Stage 2 first deliverable · saved 2026-07-13*
