# C-024 — `audit-dedupe-key-coverage.js` requirements (Stage 2 spec)

**Date:** 2026-07-12  
**Worker:** D — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-d-s2-c024-dedupe-contract`  
**Base SHA:** `c59dca8`  
**Parent contract:** [C-024-dedupe-key-contract-stage2.md](./C-024-dedupe-key-contract-stage2.md)  
**Implementation target:** Stage 3 — `airtable/extension-scripts/audits/audit-dedupe-key-coverage.js`  
**Mode:** Dry-run only in v1.0

---

## Purpose

The planned audit proves **dedupe key coverage** across all C-024 layers: every automation-created row has the expected key, duplicate keys are surfaced immediately, and legacy gaps are reported with severity.

It complements, but does not replace:

- `audit-xp-vs-submissions.js`
- `audit-submission-asset-pipeline-duplicate-xp.js`
- `audit-achievement-xp-pipeline-integrity.js`
- `audit-c023-stage5-duplicate-consequences.js`

---

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `filterEnrollmentId` | string (`rec…`) | No | Limit checks to one enrollment. |
| `filterTable` | string | No | `submissions`, `assets`, `homework`, `xp`, `achievements`, or `all` (default). |
| `includeLegacy` | boolean | No | Default `true`; report unknown or legacy key formats. |
| `sampleLimit` | number | No | Max sample IDs per finding; default 25. |

No `CONFIRM_WRITE` in v1.0. The script is read-only.

---

## Tables and fields loaded

| Table | Minimum fields |
|-------|----------------|
| **Submissions** | `Duplicate Key`, `Duplicate Review Status`, `Count This Submission?`, `Enrollment`, `XP Events`, `Submission Key` |
| **Submission Assets** | `Source Attachment ID`, `Submission - Linked`, `File Content Hash`, `Upload Status`, `Potential Asset Reuse?`, `Asset Reuse Decision`, `Homework Completions`, `Video Feedback` |
| **Homework Completions** | `Homework Completion Key`, `Enrollment`, `Homework`, `Week`, `XP Events`, `Award Status`, `Satisfactory?`, `Review Complete` |
| **XP Events** | `Source Key`, `XP Dedupe Key`, `XP Dedupe Key Normalized`, `XP Source`, `XP Bucket`, `Enrollment`, `Submission`, `Homework Completion`, `Video Feedback`, `Streak Occurrence`, `Achievement Unlock`, `Active?` |
| **Athlete Achievement Unlocks** | `Source Key`, `Milestone Source Key`, `Enrollment`, `Week`, `Achievement`, `Shot Milestone`, `XP Events`, `XP Award Status` |
| **Streak Occurrences** | `Enrollment`, `Achievement`, `Streak End Date`, `XP Events`, `Source Status` |
| **Video Feedback** | `Submission`, `Enrollment`, `XP Events`, `Award Status`, `Do Not Award XP?` |
| **Zoom Meetings** | `Zoom Meeting Key`, `Attendees`, `Week` |

Large queries should be processed section-by-section and released when possible.

---

## Severity scale

| Level | Meaning |
|-------|---------|
| **critical** | Duplicate ledger row or active double-award risk; fix before season. |
| **high** | Missing key on eligible row or key/source mismatch; likely automation or backfill gap. |
| **medium** | Integrity drift, legacy format, or C-023 review queue item; schedule repair. |
| **low** | Informational edge that should be reviewed but does not block launch alone. |
| **info** | Summary statistics only. |

---

## Check catalog (22 checks)

Each check emits `checkId`, `severity`, `layer`, `count`, `sampleRecordIds`, and `recommendedAction`.

### Submissions (007)

| ID | Check | Logic | Severity |
|----|-------|-------|----------|
| **S01** | `duplicate_key_blank_on_counted` | `Count This Submission?` = 1 and `Duplicate Key` blank | high |
| **S02** | `duplicate_key_collision_count_it` | Same `Duplicate Key`, multiple Submissions with `Duplicate Review Status` = Count It | critical |
| **S03** | `needs_review_stale` | `Duplicate Review Status` = Needs Review and `Count This Submission?` = 1 | medium |

### Submission Assets (009 + C-023)

| ID | Check | Logic | Severity |
|----|-------|-------|----------|
| **A01** | `source_attachment_id_blank` | Asset has upload pipeline state but `Source Attachment ID` blank | high |
| **A02** | `source_attachment_id_duplicate_same_submission` | Same `Submission - Linked` + same `Source Attachment ID`, count > 1 | critical |
| **A03** | `file_hash_blank_uploaded` | `Upload Status` = Uploaded and `File Content Hash` blank | medium |
| **A04** | `file_hash_duplicate_same_enrollment` | Same `File Content Hash` + same enrollment across multiple Uploaded assets without confirmed duplicate resolution | medium |

### Homework Completions (065)

| ID | Check | Logic | Severity |
|----|-------|-------|----------|
| **H01** | `completion_key_blank_reviewed` | Reviewed + satisfactory row has blank `Homework Completion Key` | high |
| **H02** | `completion_key_duplicate` | Same nonblank `Homework Completion Key`, count > 1 | critical |
| **H03** | `reviewed_no_xp_key_eligible` | Awarded homework has linked XP whose `Source Key` is not `HOMEWORK_XP|{completionId}` | high |

### XP Events

| ID | Check | Logic | Severity |
|----|-------|-------|----------|
| **X01** | `source_key_blank` | Automation-managed XP source has blank `Source Key` | high |
| **X02** | `source_key_duplicate` | Same nonblank `Source Key`, count > 1 | critical |
| **X03** | `submission_xp_key_mismatch` | Submission Base XP key is not `SUBMISSION_XP|{submissionId}` | high |
| **X04** | `submission_dedupe_key_mismatch` | Submission Base `XP Dedupe Key` is not `{enrollmentId}|{submissionId}|Submission Base` | medium |
| **X05** | `homework_xp_key_mismatch` | Homework XP key is not `HOMEWORK_XP|{completionId}` | high |
| **X06** | `video_xp_key_mismatch` | Video XP key is not `VIDEO_SUBMISSION|{videoFeedbackId}` | high |
| **X07** | `streak_xp_key_mismatch` | Streak XP key does not match `STREAK_XP|{enrollment}|{achievement}|{streakEndDateKey}` | high |
| **X08** | `zoom_base_key_mismatch` | Zoom base attendance key does not match `ZOOM_ATTEND_BASE|{meetingKey}|{enrollment}` | high |
| **X09** | `achievement_xp_key_mismatch` | Achievement XP key does not match `PERFECT_WEEK|…` or `SHOT_MILESTONE|…` contract pattern | high |
| **X10** | `legacy_or_unknown_prefix` | Nonblank Source Key prefix is not in the 14-pattern C-024 contract | medium |

### Achievement unlocks (058, 066)

| ID | Check | Logic | Severity |
|----|-------|-------|----------|
| **U01** | `perfect_week_unlock_key_duplicate` | Same `PERFECT_WEEK|{enrollment}|{week}` unlock Source Key, count > 1 | critical |
| **U02** | `shot_milestone_source_key_duplicate` | Same `Milestone Source Key` = `SHOT_MILESTONE|{enrollment}|{milestone}`, count > 1 | critical |
| **U03** | `unlock_awarded_missing_xp` | Awarded Perfect Week or Shot Milestone unlock has empty `XP Events` | high |
| **U04** | `unlock_key_format_invalid` | Unlock key field does not match **058** or **066** prefixes | medium |

---

## Required outputs

| Output | Type | Description |
|--------|------|-------------|
| `statusOut` | string | `success` or `error` |
| `actionOut` | string | `audited` |
| `errorOut` | string | Error message or empty |
| `debugStep` | string | Last major section reached |
| `findingsOut` | JSON string | Array of finding objects |
| `summaryOut` | JSON string | Counts by severity and check ID |
| `checksRun` | number | 22 |
| `criticalCount` | number | Critical finding count |
| `highCount` | number | High finding count |
| `mediumCount` | number | Medium finding count |

### Finding object shape

```json
{
  "checkId": "X02",
  "severity": "critical",
  "layer": "xp",
  "title": "source_key_duplicate",
  "count": 2,
  "sampleRecordIds": ["recAAA", "recBBB"],
  "sampleSourceKeys": ["HOMEWORK_XP|recHW1"],
  "recommendedAction": "Run targeted XP dedupe repair dry-run; manual merge review required.",
  "contractRef": "C-024-dedupe-key-contract-stage2.md — pattern 7"
}
```

Final `console.log(JSON.stringify(...))` must include `audit`, `version`, `checksRun`, severity counts, and up to five top findings.

---

## Implementation notes for Stage 3

1. Build a single `EXPECTED_PREFIXES` registry from the C-024 contract.
2. Use **054** date-key behavior for streak end dates.
3. Count all duplicate Source Keys in **X02**; also emit active duplicate count when more than one duplicate XP row is active.
4. Apply `filterEnrollmentId` consistently across linked tables.
5. Use in-memory indexes (`Map`) for Source Key, Duplicate Key, Source Attachment ID, Completion Key, and Milestone Source Key.
6. Do not call `createRecordAsync` or `updateRecordAsync` in v1.0.
7. Add a README row under a future “Dedupe key coverage” stage when implemented.

---

## Acceptance criteria for Stage 3 implementer

| Criterion | Target |
|-----------|--------|
| All checks implemented | 22 check IDs return findings or zero-count summary |
| Dry-run only | No writes |
| Pattern validation | Uses only C-024 contract prefixes and dimensions |
| Outputs | `findingsOut` and `summaryOut` are parseable JSON |
| DEV run | Critical/high counts documented in Stage 3 result |
| C-023 cross-link | Asset hash checks **A03** / **A04** align with C-023 policy |

---

## Suggested run order

1. Run `audit-dedupe-key-coverage.js`.
2. Run `audit-c023-stage5-duplicate-consequences.js`.
3. Run targeted safe-backfills in dry-run mode.
4. Rerun until `criticalCount = 0` before launch gate **V2-011**.

---

*Worker D · C-024 Stage 2 · 22 audit checks*
