# Audit Extension Scripts

Manual Airtable **extension scripts** for data integrity checks. Default mode is **dry-run** (report only, no writes).

## Strategy: audit first, backfill second, coverage last

This repo is moving from “app seems fine” to **provably complete data** for the current architecture. Early-season records may have:

- Old **Source Key** formats
- Missing links (Enrollment, Week, WAS, assets, XP)
- Blank **Asset Slot** on Homework Completions
- Fields populated under a previous design that are now unused

**Workflow:**

1. Run **audit** scripts → get counts + sample record IDs + recommended action  
2. Run matching **safe-backfill** with `DRY_RUN=true`, then `CONFIRM_WRITE=true` in batches  
3. Re-run audit until clean  
4. Run **audit-field-coverage-report** → fields still at 0% fill are legacy/unused candidates  

See [safe-backfills/README.md](../safe-backfills/README.md) for the full backfill run order.

---

## End-to-end pipeline (Submissions → finish)

| Stage | Automations | Audit script | Backfill script |
|-------|-------------|--------------|-----------------|
| **A. Submission intake** | 023, 005, 007, 006, 021 | `audit-submission-pipeline-integrity.js` | `backfill-submission-pipeline-links.js` *(planned)* |
| **B. Submission XP** | 010 | `audit-xp-vs-submissions.js` | `backfill-submission-xp-events.js` |
| **C. Weekly summary link** | 031, 032, 033, 030, 034 | `audit-submission-pipeline-integrity.js`, `audit-orphan-xp-events.js` | `backfill-missing-weekly-summaries-and-xp-links.js`, `backfill-xp-event-weekly-summary-links.js` |
| **D. Assets created** | 009, 021 | `audit-submission-pipeline-integrity.js` | *(manual / re-trigger 009)* |
| **E. Homework upload** | 020, 070a, 022, 063 | `audit-homework-completion-upload-edge-cases.js`, `audit-stuck-upload-processing.js` | `backfill-homework-completion-upload-status.js`, `backfill-homework-completion-upload-edge-cases.js` |
| **F. Homework XP + email** | 064, 065, 071 | `audit-homework-pipeline-integrity.js` *(planned)* | `backfill-homework-xp-from-reviewed.js` *(planned)* |
| **G. Video upload** | 013, 070b, 022, 111 | `audit-video-pipeline-integrity.js` *(planned)* | `repair-video-feedback-xp-link.js` |
| **H. Video XP + email** | 113, 114, 073 | *(planned)* | `repair-video-feedback-xp-link.js` |
| **I. Achievements / streaks** | 053–059, 066 | *(planned)* | *(planned)* |
| **J. Field cleanup discovery** | — | `audit-field-coverage-report.js` | — |

Run stages **A → J** in order when doing a full historical repair pass.

---

## Scripts (current)

| Script | Checks | Status |
|--------|--------|--------|
| `audit-submission-pipeline-integrity.js` | Counted submissions: Enrollment, Week, WAS, XP, assets, homework/video links | **Ready** |
| `audit-xp-vs-submissions.js` | Submission ↔ XP Event parity, Source Key, duplicates | **Ready** |
| `audit-field-coverage-report.js` | Fill % on canonical fields per table profile | **Ready** |
| `audit-orphan-xp-events.js` | XP Events missing Weekly Athlete Summary link | Ready |
| `audit-homework-completion-upload-edge-cases.js` | HW completions with 0 or many assets | Ready |
| `audit-stuck-upload-processing.js` | Assets stuck Processing / gate mismatches | Ready |
| `audit-homework-pipeline-integrity.js` | Reviewed homework → XP → email readiness | Planned |
| `audit-video-pipeline-integrity.js` | Video asset → VF → XP chain | Planned |
| `audit-weekly-summary-coverage.js` | WAS rows vs active enrollments by week | Planned |

---

## Script conventions

| Rule | Detail |
|------|--------|
| Default | Read-only — log issues, do not mutate |
| Output | JSON summary: counts, `issueCounts`, sample record IDs, `recommendedAction` |
| Scope | Prefer filtered scopes (`Count This Submission? = 1`, etc.) |
| Safety | Never delete in audit scripts |

---

## Recommended first full pass

```text
1. audit-submission-pipeline-integrity.js
2. audit-xp-vs-submissions.js
3. audit-orphan-xp-events.js
4. audit-homework-completion-upload-edge-cases.js
5. audit-stuck-upload-processing.js
   → run matching backfills (see safe-backfills README)
6. audit-field-coverage-report.js   ← shows what is still empty
```

---

## Running in Airtable

1. Copy script from GitHub into Scripting extension.  
2. Run with defaults (dry-run).  
3. Save console JSON output.  
4. Fix via [safe-backfills](../safe-backfills/) or manual correction.  
5. Re-run until counts are zero (or only accepted exceptions).  
6. Update `CHANGELOG.md` when a backfill pass completes.

## Related

- [Safe backfills](../safe-backfills/README.md)  
- [Weekly maintenance checklist](../../../docs/checklists/weekly-maintenance-checklist.md)  
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
