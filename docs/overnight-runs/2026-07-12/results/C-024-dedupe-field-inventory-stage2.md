# C-024 — Dedupe field and automation inventory (Stage 2)

**Date:** 2026-07-13  
**Worker:** A — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Base SHA:** `c59dca8`  
**Backlog:** C-024 (record-identity layer; complements C-023 file-hash layer)  
**Status:** **IN PROGRESS** — first deliverable written; sections filled incrementally

**Sources:** `airtable/schema/current/field-map.md`, `automation-trigger-map.md`, automation docblocks (007, 009, 010, 054, 058, 059, 065, 066, 101, 114, 116, 070a/b/c)

---

## Master field inventory

| Table | Field | Purpose | Writer | Reader | Current dedupe behavior | Gap | Recommended key |
|-------|-------|---------|--------|--------|-------------------------|-----|-----------------|
| Submissions | Duplicate Key | Stat-level duplicate detection | **007** (formula inputs) | **007** duplicate checker | Enrollment + activity date + shot stats composite | No file-byte awareness; same stats different intent passes | Keep stat key; cross-check `File Content Hash` on linked assets when present (C-023) |
| Submissions | XP Awarded | Submission XP idempotency flag | **010** | Audits, views | Checkbox set after XP create | Flag only; not a canonical key | `SUBMISSION\|{submissionId}` via **010** Source Key |
| Submission Assets | File Content Hash | Exact-byte identity | Lambda / Make writeback | C-023 duplicate lookup, audits | SHA-256 at upload; same-enrollment contextual match → review | Filename/title not used for dedupe | `{enrollmentId}\|{sha256}` review queue only — never block upload |
| Submission Assets | sourceAttachmentId (intake) | Skip re-copy same attachment | **009** | **009**, **020** | Skip if same attachment id on same submission | Re-upload same bytes with new attachment id passes | Complement with **File Content Hash** (C-023) |
| Submission Assets | Upload Status | Pipeline state / retry guard | **009**, **020**, **070a/b**, Lambda | **070c**, views, Make | Terminal `Uploaded` blocks re-upload via Lambda `already_uploaded()` | Manual status reset risky if canonical exists | Status + canonical URL + hash as composite terminal proof |
| Submission Assets | Send to Make Trigger | Orchestration retry latch | **070a/b** (clear on success) | **070c** (async verify) | Retained on failure; cleared on sync JSON success or 070c verify | Async path requires companion 070c | Do not clear until writeback verified |
| Homework Completions | *(completion identity)* | One row per enrollment + assignment | **067**, intake forms | **010**, **022**, views | Partial / manual duplicates (C-004) | Re-submits can create multiple rows | `HOMEWORK_COMPLETION\|{enrollmentId}\|{assignmentId}\|{weekId}` (target) |
| XP Events | Source Key | Canonical XP identity | **010**, **054**, **058**, **059**, **065**, **066**, **101**, **114**, **116** | All XP writers, audits, backfills | Script-specific patterns; recheck-before-create in modern scripts | Uneven on legacy paths / backfills | Document every pattern in C-024 contract; find-by-key before create |
| XP Events | XP Dedupe Key | Formula normalization | Formula (rollup) | Audits, views | Derived from Enrollment + XP Source + Event Identity | Weak if Source Key blank | Prefer **Source Key** as writer authority |
| XP Events | Active? | Soft-delete / duplicate suppression | **116**, repair scripts | Audits | Deactivate on confirmed duplicate | Reversible via Approved Reuse | Pair with Source Key — never hard-delete |
| Athlete Achievement Unlocks | Milestone Source Key | Shot milestone identity | **058**, **066** | **059**, audits (090F) | `SHOT_MILESTONE\|{enrollment}\|{milestone}` etc. | H-001 fixed false-positive audit groups | Milestone Source Key only for shot milestones |
| Athlete Achievement Unlocks | Source Key | Perfect week identity | **058** | **059** | `PERFECT_WEEK\|{enrollment}\|{week}` | — | Same pattern family |

---

## Section 1 — Submissions (007, 010)

*Filled next — writer matrix and recheck-before-create evidence from docblocks.*

## Section 2 — Submission Assets (009, 020, 070a/b/c, Lambda)

*Filled next.*

## Section 3 — Homework Completions

*Filled next.*

## Section 4 — XP Events

*Filled next.*

## Section 5 — Achievement Unlocks (058, 059, 066)

*Filled next.*

## Section 6 — Automation writer matrix

*Filled next.*

---

*Worker A · Stage 2 first deliverable · saved 2026-07-13*
