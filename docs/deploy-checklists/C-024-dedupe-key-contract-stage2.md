# C-024 — Dedupe key contract (Stage 2)

**Date:** 2026-07-13  
**Worker:** D — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-d-s2-c024-dedupe-contract`  
**Base SHA:** `c59dca8`  
**Owner rules:** [v2-change-backlog.md § Owner business decisions](../../v2-change-backlog.md#owner-business-decisions--approved-2026-07-13)  
**Status:** **COMPLETE**

**C-023 vs C-024:** C-023 = file bytes (SHA-256, Needs Review, never block/delete). C-024 = record identity (Source Key / dedupe keys). Never conflate filename with either layer.

---

## 1. Canonical key patterns

| Record type | Descriptive key name | Exact key format | Source fields | Create behavior | Rerun behavior |
|-------------|---------------------|------------------|---------------|-----------------|----------------|
| Submission XP | Submission XP Source Key | `SUBMISSION\|{submissionRecordId}` | Submission `rec…` | **010** queries Source Key before create | Skip if exists; never second XP row |
| Homework XP | Homework XP Source Key | `HOMEWORK_XP\|{homeworkCompletionId}` | HC `rec…` | **065** / homework chain recheck | Skip if exists; one Homework XP per completion (owner #2) |
| Video feedback XP | Video submission XP | `VIDEO_SUBMISSION\|{videoFeedbackId}` | VF `rec…` | **114** recheck Source Key | Skip; **116** deactivates duplicate XP same key |
| Shot milestone unlock | Milestone Source Key | `SHOT_MILESTONE\|{enrollmentId}\|{milestoneRuleId}` | Enrollment, milestone | **066** idempotent unlock create | Skip if unlock exists |
| Perfect week unlock | Perfect week unlock key | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | Enrollment, week | **058** guard by Source Key | Skip if key exists |
| Perfect week XP | Perfect week XP | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | From unlock row | **059** match existing Source Key | Skip if XP exists |
| Streak XP | Streak occurrence | `STREAK\|{streakOccurrenceKey}` | Streak rollup key | **054** | Skip if key exists |
| Zoom live XP | Zoom live attendance | `ZOOM_LIVE\|{meetingId}\|{enrollmentId}` | Meeting, enrollment | **101** attendee link | Skip; supplemental re-run guarded |
| Zoom recording XP | Zoom recording watch | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` | Meeting, enrollment | Future attestation path | Mutually exclusive with live (owner #9) |
| Level gate XP | Level gate cleared | `LEVEL_GATE\|{enrollmentId}\|{gateRuleId}` | Enrollment, gate | **065** | Recheck Source Key |
| Homework completion | Official completion key | `HC\|{enrollmentId}\|{assignmentId}\|{weekId}` | Enrollment, assignment, week | Intake / **067** target | One official row; resubmissions link (owner #2) |
| Submission stat review | Duplicate Key (formula) | enrollment + date + stats composite | **007** formula inputs | Flag identical stats — no auto-delete (owner #3) | Notify owner; no duplicate daily XP |
| Asset bytes | File content hash | SHA-256 hex | Lambda writeback | C-023 Needs Review | New S3 object always; no reuse |

---

## 2. Automation writer inventory

| Script | Writes | Recheck-before-create | Source Key / dedupe |
|--------|--------|----------------------|---------------------|
| **007** | Submission duplicate flags | Formula-based stat key | Duplicate Key — flag only |
| **009** | Submission Assets intake | Skip same `sourceAttachmentId` | Attachment id + C-023 hash |
| **010** | XP Events (submission) | **Yes** — Source Key query | `SUBMISSION\|{id}` |
| **054** | XP Events (streak) | **Yes** | `STREAK\|{occurrenceKey}` |
| **058** | Achievement Unlocks (perfect week) | **Yes** | `PERFECT_WEEK\|{enrollment}\|{week}` |
| **059** | XP Events (from unlock) | **Yes** — Source Key match | Unlock-derived key |
| **065** | XP Events (homework satisfactory) | **Yes** | `HOMEWORK_XP\|{hcId}` |
| **066** | Achievement Unlocks (milestones) | **Yes** | `SHOT_MILESTONE\|…` |
| **101** | XP Events (zoom live) | **Yes** | `ZOOM_LIVE\|…` |
| **114** | XP Events (video feedback) | **Yes** | `VIDEO_SUBMISSION\|{vfId}` |
| **116** | XP deactivate/restore (reuse) | **Yes** — same Source Key row | `VIDEO_SUBMISSION\|…` / `HOMEWORK_XP\|…` |
| **070a/b/c** | Upload orchestration | Lambda `already_uploaded()` | Terminal upload fields — not Source Key |

---

## 3. Backfill rerun standard (owner #4)

Every repair/backfill extension:

1. **Dry-run default** — report only unless `CONFIRM_WRITE`.
2. **find-by-key** — query by canonical Source Key or completion key.
3. **skip if exists** — record already correct → no write.
4. **create if missing** — only absent rows.
5. **Never** duplicate XP, assets, completions, achievements, or communications.

---

## 4. Achievement duplicate rule (owner #5)

- Keep **earliest valid** unlock row.
- Mark later duplicates for **review**.
- **Do not** award duplicate XP (**059** must skip when Source Key exists).

---

## 5. Enrollment fields (owner #6 — design only)

| Field | Controls |
|-------|----------|
| `Active?` | Visibility + communications |
| `Progress Processing Enabled?` | Progress calculations continue when hidden |

**No schema implementation in Stage 2.**

---

*Worker D · C-024 contract · COMPLETE*
