# C-024 — Dedupe field and automation inventory (Stage 2)

**Date:** 2026-07-13  
**Worker:** A — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Owner rules:** [v2-change-backlog.md § Owner business decisions](../../v2-change-backlog.md#owner-business-decisions--approved-2026-07-13)  
**Status:** **COMPLETE**

---

## Master field inventory

| Table | Field | Purpose | Writer | Reader | Current dedupe behavior | Gap | Recommended key |
|-------|-------|---------|--------|--------|-------------------------|-----|-----------------|
| Submissions | Duplicate Key | Stat duplicate detection | Formula / **007** | **007**, audits | Enrollment + date + shot stats | Identical stats pass silently | Flag identical amounts; notify owner; no auto-delete (owner #3) |
| Submissions | XP Awarded | XP idempotency flag | **010** | Audits | Checkbox after XP | Not a canonical key | `SUBMISSION\|{submissionId}` |
| Submission Assets | File Content Hash | Byte identity | Lambda | C-023, audits | SHA-256; contextual match → review | Filename not used | Allow upload; Needs Review; no double award (owner #1) |
| Submission Assets | Upload Status | Pipeline terminal | **009**, Lambda, **070a/b** | **070c**, views | `Uploaded` + canonical → skip re-upload | Manual reset risk | Composite terminal proof |
| Submission Assets | Send to Make Trigger | Retry latch | **070a/b**, **070c** | Make | Retained on failure | Async needs 070c | Clear only after verified writeback |
| Homework Completions | Completion identity | One official row | Intake, **067** | **065**, **022** | Multiple rows on re-submit (C-004) | No resubmission link model | One per enrollment+assignment+week; resubmissions link (owner #2) |
| Homework Completions | Satisfactory? | XP gate | Coach / **065** | **065** | Manual | — | Homework XP once per completion |
| XP Events | Source Key | Canonical XP identity | **010**, **054**, **058**, **059**, **065**, **066**, **101**, **114**, **116** | Audits, backfills | Recheck in modern scripts | Legacy uneven | find-by-key before every create |
| XP Events | Active? | Soft-delete duplicate XP | **116** | Audits | Deactivate duplicate | Reversible | Pair with Source Key |
| XP Events | XP Dedupe Key | Formula normalize | Formula | Audits | Derived | Weak if Source Key blank | Prefer Source Key authority |
| Athlete Achievement Unlocks | Milestone Source Key | Shot milestone | **066**, **058** | **059**, 090F | Per-milestone key | — | Earliest valid; flag later (owner #5) |
| Enrollments | Active? | Visibility + comms | Manual | Web, emails, audits | Leaderboard exclude | Does not stop all XP paths | Owner #6 design |
| Enrollments | Progress Processing Enabled? | Progress calcs | *(not in base yet)* | Automations | — | Field not implemented | Owner #6 design — queued |

---

## Section 1 — Submissions (**007**, **010**)

**007** flags stat-level duplicates via `Duplicate Key`. **Owner #3:** identical Activity Date + all shooting amounts → flag + notify; legitimate when any meaningful value differs; no auto-delete; no duplicate daily XP.

**010** creates submission XP with `SUBMISSION\|{submissionRecordId}` — recheck Source Key before create.

---

## Section 2 — Submission Assets (**009**, **020**, **070a/b/c**, Lambda)

**009** skips re-copy when same attachment id on same submission. **C-023/owner #1:** hash match → Needs Review; upload continues; new S3 object; no double award.

**070a** sync JSON clears trigger on success; **070b/070c** async path retains until verified.

---

## Section 3 — Homework Completions

**Owner #2:** one official Homework Completion per athlete + assignment + week. Later files = resubmissions linked to existing completion; file history preserved; Homework XP awarded once (**065** / `HOMEWORK_XP\|{hcId}`).

**067** today creates rows without asset pipeline — blocked pending Learning Activities architecture (not Stage 2).

---

## Section 4 — XP Events

All writers must use documented Source Key patterns (see Worker D contract). Backfills: skip correct, create missing only (owner #4).

---

## Section 5 — Achievement Unlocks (**058**, **059**, **066**)

**Owner #5:** keep earliest valid unlock; flag later duplicates for review; no duplicate XP from **059**.

---

## Section 6 — Automation writer matrix

| Script | Table | Dedupe mechanism |
|--------|-------|------------------|
| 007 | Submissions | Duplicate Key flag |
| 009 | Submission Assets | sourceAttachmentId skip |
| 010 | XP Events | Source Key recheck |
| 054 | XP Events | STREAK key |
| 058 | Unlocks | PERFECT_WEEK key |
| 059 | XP Events | Source Key match |
| 065 | XP Events | HOMEWORK_XP key |
| 066 | Unlocks | SHOT_MILESTONE key |
| 101 | XP Events | ZOOM_LIVE key |
| 114 | XP Events | VIDEO_SUBMISSION key |
| 116 | XP Events | Deactivate by Source Key |
| 070a/b/c | Submission Assets | Lambda already_uploaded |

---

*Worker A · inventory · COMPLETE*
