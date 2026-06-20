# Audit Extension Scripts

Manual Airtable **extension scripts** for data integrity checks. Default mode is **dry-run** (report only, no writes).

## Purpose

Youth basketball shooting challenge data spans Submissions, XP Events, Homework, and Weekly Summaries. Audits detect:

- Submissions without matching XP Events (or duplicate XP for one submission)
- XP Events with invalid or missing athlete links
- Homework marked complete without XP or with duplicate awards
- Weekly summaries sent twice or missing for active athletes
- Streak / total XP mismatches vs XP Event rollups

## Script Conventions

| Rule | Detail |
|------|--------|
| Default | `DRY_RUN = true` — log issues, do not mutate |
| Output | Summary table: count, sample record IDs, recommended action |
| Scope | Filter by view or date range when possible |
| Safety | Never delete records in audit scripts; flag for manual review |

## Planned Scripts

| Script file | Checks |
|-------------|--------|
| `audit-xp-vs-submissions.js` | Submission ↔ XP Event parity |
| `audit-homework-xp.js` | Homework completion vs XP Events |
| `audit-weekly-summaries.js` | Email sent flags vs expected active athletes |
| `audit-athlete-rollups.js` | Total XP vs sum of XP Events |

## Running in Airtable

1. Build or update extension in Airtable (Scripting extension).
2. Copy script from this repo after GitHub review.
3. Run with dry-run enabled; export log or screenshot results.
4. Fix data via [safe-backfills](../safe-backfills/) or manual correction.
5. Re-run audit until clean.

## Workflow with GitHub & ChatGPT

1. Propose new audit in Cursor → commit to this folder.
2. Use ChatGPT to review logic for false positives and performance (batch `selectRecordsAsync` wisely).
3. Deploy to Airtable extension; document in `CHANGELOG.md`.

## Related

- [Weekly maintenance checklist](../../../docs/checklists/weekly-maintenance-checklist.md)
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
