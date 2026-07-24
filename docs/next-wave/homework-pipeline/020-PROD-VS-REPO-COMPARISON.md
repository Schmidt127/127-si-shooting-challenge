# Automation 020 — PROD vs prior repo vs deleted 063

**Agent:** 11  
**Date:** 2026-07-24  
**Classification (exact one):** `PARTIALLY REPLACES 063`

Archive of PROD paste: `docs/overnight/homework-learning/020-PROD-v3.0.0-as-copied.js`  
Canonical repo file (already aligned to PROD in commit `444046e`):  
`airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`

Schema facts (confirmed):

- PROD `Submissions` has **no** `Grade Band` field
- `Enrollments.Grade Band` = linked-record
- `Homework Completions.Grade Band` = linked-record

---

## Versions

| Copy | Version | Last Updated |
|---|---|---|
| PROD (copied) | **v3.0.0** | 2026-07-14 |
| Prior repo | **v2.3** | 2026-06-28 |
| Deleted 063 (repo reference) | **v2.0** | 2026-05-23 |

PROD docblock declares: `Supersedes: separate 063 (copy Enrollment Grade Band → HC)`.

---

## Capability checklist (required questions)

| Question | Answer | Evidence |
|---|---|---|
| Creates Homework Completions | **Yes** | Create path when no match for Submission+Homework+slot |
| Links Submission Assets | **Yes** | Bidirectional asset ↔ HC link; merges multi-asset |
| Reads Submission → Enrollment | **Partial** | Reads Submission for HW name / WAS / dates; Enrollment for GB primarily from **asset** / HC link, not via Submission.Enrollment walk for GB |
| Reads Enrollment.Grade Band | **Yes** | `loadEnrollmentGradeBandIds` / `resolveGradeBandIds` fallback |
| Writes HC.Grade Band | **Yes** | Create + blank repair |
| Repairs existing blank Grade Bands | **Yes** | Already-linked + link-existing paths (`repairHomeworkGradeBandIfBlank`) |
| Only assigns on creation | **No** | Also blank-repairs on link / already-linked |
| Handles multiple files | **Yes** | Multi-asset merge onto one preferred HC; race recheck before create |
| Prevents duplicate Homework Completions | **Yes (best-effort)** | Match + pre-create recheck; prefers one of multiple matches instead of erroring |
| Supersedes 063 completely | **No** | See gaps below |

---

## Grade Band resolution (PROD v3.0.0)

Intended order in `resolveGradeBandIds`:

1. Submission.Grade Band (field **does not exist** on PROD → always empty via `safeFields`)
2. Enrollment.Grade Band
3. Write to HC.Grade Band (blank-only on repair)

Effective runtime on current PROD schema:

`Submission Asset → Enrollment (asset/HC) → Enrollment.Grade Band → HC.Grade Band`

Dead config still present: `CONFIG.submissions.gradeBand = "Grade Band"` (soft-fails; should be removed in a dedicated fix).

---

## Deleted 063 behavior vs PROD 020

| 063 capability | PROD 020 |
|---|---|
| Trigger: Homework Completions when Enrollment set & Grade Band empty | **Missing** — only runs when a Submission Asset enters 020 |
| Copy Enrollment GB → blank HC | **Yes** |
| Overwrite mismatched non-blank HC GB | **No** (blank-only) |
| Repair historical HCs with no new asset activity | **No** |

Prior repo **v2.3** only attempted GB on **create** from nonexistent Submission.Grade Band (no Enrollment fallback) → worse than PROD for current schema; did **not** prove 063 replacement.

---

## Behavior PROD has that prior v2.3 lacked

- Enrollments table + Enrollment GB fallback
- Blank GB repair on already-linked / link-existing
- `gradeBandActionOut`, `repaired_grade_band`
- Docblock supersession note for 063

## Behavior v2.3 had that PROD lacks

- GitHub SoT header wrapper only (no desirable linking behavior removed)

---

## Should PROD replace the repository file?

**Yes — already done** in commit `444046e` with history preserved (prior v2.3 remains in Git). Agent 11 did **not** re-edit the automation body; PROD v3.0.0 is the proven source.

---

## Classification

### `PARTIALLY REPLACES 063`

**063 deletion safety:** **Not fully safe** for historical / orphan blank-GB Homework Completions that never re-enter via a Submission Asset. **Forward-path safe** for asset-driven homework intake (create/link/already-linked blank repair).

**013 / 111 (confirmed):** Repository **013 v2.0** replaces **111** for Enrollment Grade Band create/repair on Video Feedback (including link/repair when GB differs). Separate from 063/020 homework path.
