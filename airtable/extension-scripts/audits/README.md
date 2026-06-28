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
| **A. Submission intake** | 023, 005, 007, 006, 021 | `audit-submission-pipeline-integrity.js` | `backfill-submission-pipeline-links.js` |
| **B. Submission XP** | 010 | `audit-xp-vs-submissions.js` | `backfill-submission-xp-events.js` |
| **C. Weekly summary link** | 031, 032, 033, 030, 034 | `audit-submission-pipeline-integrity.js`, `audit-orphan-xp-events.js` | `backfill-missing-weekly-summaries-and-xp-links.js`, `backfill-xp-event-weekly-summary-links.js` |
| **D. Assets created** | 009, 021 | `audit-submission-pipeline-integrity.js` | *(manual / re-trigger 009)* |
| **E. Homework upload** | 020, 070a, 022, 063 | `audit-homework-completion-upload-edge-cases.js`, `audit-stuck-upload-processing.js` | `backfill-homework-completion-upload-status.js`, `backfill-homework-completion-upload-edge-cases.js` |
| **F. Homework XP + email** | 064, 065, 071 | `audit-homework-pipeline-integrity.js`, `audit-submission-asset-pipeline-duplicate-xp.js` | `backfill-homework-xp-from-reviewed.js`, `dedupe-homework-xp-events.js` |
| **G. Video upload** | 013, 070b, 022, 111 | `audit-video-pipeline-integrity.js` | `backfill-video-pipeline-links.js` |
| **H. Video XP + email** | 113, 114, 073 | `audit-video-xp-pipeline-integrity.js`, `audit-submission-asset-pipeline-duplicate-xp.js` | `backfill-video-xp-from-posted-feedback.js`, `repair-video-feedback-xp-link.js` |
| **I. Achievements / streaks** | 053–059, 066 | `audit-achievement-xp-pipeline-integrity.js`, `audit-pending-shot-milestone-unlocks.js` | `backfill-legacy-streak-xp-week-and-was.js`, `backfill-legacy-streak-xp-source-keys.js`, `backfill-shot-milestone-xp-week-and-was.js`, `backfill-shot-milestone-unlock-mark-awarded.js` |
| **J. Field cleanup discovery** | — | `audit-field-coverage-report.js`, `audit-xp-linkage-coverage.js`, `audit-legacy-cleanup-candidates.js` | `archive-legacy-streak-unlock-records.js` + manual field delete |

Run stages **A → J** in order when doing a full historical repair pass.

---

## Scripts (current)

| Script | Checks | Status |
|--------|--------|--------|
| `audit-submission-pipeline-integrity.js` | Counted submissions: Enrollment, Week, WAS, XP, assets, homework/video links | **Ready** |
| `audit-xp-vs-submissions.js` | Submission ↔ XP Event parity, Source Key, duplicates | **Ready** |
| `audit-field-coverage-report.js` | Fill % on canonical fields per table profile (v1.1: video + achievement profiles) | **Ready** |
| `audit-xp-linkage-coverage.js` | XP Events classified by source type and link completeness | **Ready** |
| `audit-orphan-xp-events.js` | XP Events missing Weekly Athlete Summary link (v1.1 samples) | **Ready** |
| `audit-homework-completion-upload-edge-cases.js` | HW completions with 0 or many assets | Ready |
| `audit-stuck-upload-processing.js` | Assets stuck Processing / gate mismatches | Ready |
| `audit-make-upload-engine-test-submission.js` | **Fillout test trace:** Schmist/Testing submission through 009→070→022 + submission XP (stage pass/fail/wait) | **Ready** |
| `audit-video-and-homework-attachment-linkage.js` | Video/homework upload linkage + writeback drift only (v1.2); Brayden Elders focus section | **Ready** |
| `audit-orphan-asset-homework-submission-repair-planner.js` | Dry-run planner: orphan Submission Assets + Homework Completions missing Submission link; proposes safe parent matches | **Ready** |
| `audit-submission-asset-pipeline-duplicate-xp.js` | Submission Assets → homework/video → XP Events duplicate XP (Source Key + chain) | **Ready** |

**Repair:** `repair-audit-linkage-full.js` in [safe-backfills](../safe-backfills/README.md#linkage-audit-repair-v12); orphan asset links → `repair-orphan-asset-submission-links.js` after `audit-orphan-asset-homework-submission-repair-planner.js`
| `audit-homework-pipeline-integrity.js` | Reviewed homework → XP parity, Award Status, WAS on XP | **Ready** |
| `audit-video-pipeline-integrity.js` | Video asset → Video Feedback chain (013/022/111 parity) | **Ready** |
| `audit-video-xp-pipeline-integrity.js` | Posted Video Feedback → VIDEO_SUBMISSION XP parity (114 logic) | **Ready** |
| `audit-achievement-xp-pipeline-integrity.js` | Awarded unlocks (059) + streaks (054) → XP parity | **Ready** |
| `audit-pending-shot-milestone-unlocks.js` | Why 059/view misses Pending shot-milestone unlocks | **Ready** |
| `audit-legacy-cleanup-candidates.js` | LEGACY/ZZZ fields + orphan streak unlock inventory | **Ready** |

---

## Script conventions

| Rule | Detail |
|------|--------|
| Default | Read-only — log issues, do not mutate |
| Output | JSON summary: counts, `issueCounts`, sample record IDs, `recommendedAction` |
| Scope | Prefer filtered scopes (`Count This Submission? = 1`, etc.) |
| Safety | Never delete in audit scripts |

---

## Recommended perfection pass (after Stages A–H backfills)

```text
1. audit-field-coverage-report.js        (v1.1)
2. audit-xp-linkage-coverage.js
3. audit-orphan-xp-events.js             (v1.1)
4. audit-achievement-xp-pipeline-integrity.js
   → run matching backfills if issueTotal > 0
```

Full doc: [docs/airtable/stage-j-legacy-cleanup.md](../../../docs/airtable/stage-j-legacy-cleanup.md)

## Recommended first full pass (historical repair)

```text
1. audit-submission-pipeline-integrity.js
2. audit-xp-vs-submissions.js
3. audit-orphan-xp-events.js
4. audit-homework-completion-upload-edge-cases.js
5. audit-stuck-upload-processing.js
   → run matching backfills (see safe-backfills README)
6. audit-field-coverage-report.js   ← shows what is still empty
7. audit-video-pipeline-integrity.js ← Stage G baseline before video backfills
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
- [Documentation index](../../../docs/README.md)  
- [Weekly maintenance checklist](../../../docs/checklists/weekly-maintenance-checklist.md)  
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
