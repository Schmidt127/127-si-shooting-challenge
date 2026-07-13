# C-024 — audit-dedupe-key-coverage requirements (Stage 2)

**Date:** 2026-07-13  
**Worker:** D  
**Planned script:** `airtable/extension-scripts/audits/audit-dedupe-key-coverage.js`  
**Mode:** Dry-run only (no writes without `CONFIRM_WRITE`)  
**Status:** **COMPLETE** — implement in Stage 3

---

## 1. Scope tables

| Table | Checks |
|-------|--------|
| **Submissions** | Duplicate Key collisions; identical stat rows flagged not deleted |
| **Submission Assets** | Terminal upload without hash; duplicate Source Key on XP link |
| **Homework Completions** | Multiple official rows same enrollment+assignment+week |
| **XP Events** | Duplicate Source Key with `Active?` true; orphan keys |
| **Athlete Achievement Unlocks** | Duplicate Milestone Source Key / Source Key; later duplicate unlocks |
| **Video Feedback** | Multiple XP per VF Source Key |

---

## 2. Check catalog

| ID | Severity | Check | Pass criteria |
|----|----------|-------|---------------|
| DK-01 | **error** | Duplicate active XP Source Key | ≤1 active XP per Source Key |
| DK-02 | **error** | Homework XP without completion key alignment | `HOMEWORK_XP\|{hcId}` matches linked HC |
| DK-03 | **warn** | Multiple HC rows same enrollment+assignment+week | Flag extras; recommend resubmission link |
| DK-04 | **warn** | Identical Submission Duplicate Key same day | Flag for owner review; neither auto-deleted |
| DK-05 | **error** | Achievement duplicate XP | Second unlock same key without review flag |
| DK-06 | **info** | XP Event missing Source Key | Writer path undocumented |
| DK-07 | **warn** | C-023 hash match without Needs Review | Review fields empty on contextual match |
| DK-08 | **error** | Zoom live + recording XP same meeting+enrollment | Mutually exclusive keys |

---

## 3. Dry-run output

```json
{
  "audit": "audit-dedupe-key-coverage",
  "version": "0.1.0",
  "mode": "dry-run",
  "summary": { "error": 0, "warn": 0, "info": 0 },
  "samples": [{ "checkId": "DK-01", "severity": "error", "recordId": "rec…", "sourceKey": "…" }]
}
```

---

## 4. Implementation gate

- Stage 3 extension script only.
- No PROD run without Mike approval.
- Align with [C-024-dedupe-key-contract-stage2.md](./C-024-dedupe-key-contract-stage2.md).

---

*Worker D · audit requirements · COMPLETE*
