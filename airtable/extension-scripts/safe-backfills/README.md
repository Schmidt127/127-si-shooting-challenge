# Safe Backfill Extension Scripts

Controlled Airtable extension scripts to **repair or backfill** data after audits or schema changes. Always ship with dry-run mode and explicit write gates.

## Purpose

The challenge started before the current architecture was complete. Backfills bring historical rows up to the **same field standards** production automations use today—without bulk destructive edits.

After audit + backfill passes, run `audit-field-coverage-report.js` to see which fields are still empty (legacy/unused candidates).

## Safety rules

1. **Dry-run first** — Every script defaults to reporting planned changes only.  
2. **Explicit confirm flag** — e.g. `CONFIRM_WRITE = false` must be set true manually for writes.  
3. **Batch limits** — Cap records per run (typically 50); re-run until `remainingCount` is 0.  
4. **Dedupe keys** — Use same keys as production automations (`SUBMISSION_XP|`, `HOMEWORK_XP|`, etc.).  
5. **No deletes** — Backfills create or update; deletions are manual with recovery doc.  
6. **Log everything** — Record IDs and before/after in script output.

---

## Full pipeline run order (Submissions → end)

Run **audits** before and after each stage. Only enable writes when dry-run sample looks correct.

| Order | Backfill | Fixes | Prerequisite audit |
|-------|----------|-------|-------------------|
| 1 | `backfill-submission-pipeline-links.js` | WAS links, HW Asset Slot, asset links + upload sync | `audit-submission-pipeline-integrity.js` |
| 2 | `backfill-missing-weekly-summaries-and-xp-links.js` | Create missing WAS + link XP | `audit-orphan-xp-events.js` |
| 3 | `backfill-xp-event-weekly-summary-links.js` | Link XP → WAS when summary exists | `audit-orphan-xp-events.js` |
| 4 | `backfill-submission-xp-events.js` | Missing submission XP (010 logic) | `audit-xp-vs-submissions.js` |
| 5 | `backfill-homework-completion-upload-edge-cases.js` | Asset links, multi-file sync, slots | `audit-homework-completion-upload-edge-cases.js` |
| 6 | `backfill-homework-completion-upload-status.js` | Upload status writeback from assets | `audit-stuck-upload-processing.js` |
| 7 | `backfill-homework-xp-from-reviewed.js` *(planned)* | XP for reviewed homework missing events | `audit-homework-pipeline-integrity.js` *(planned)* |
| 8 | `repair-video-feedback-xp-link.js` | Video Feedback ↔ XP Event repair | Manual / video audit |
| 9 | `dedupe-zoom-meeting-xp-events.js` | Duplicate Zoom XP | Manual review |

Finish with **`audit-field-coverage-report.js`** to identify unused fields.

---

## Scripts (current)

| Script file | Use case | Status |
|-------------|----------|--------|
| `backfill-homework-completion-upload-status.js` | HW Pending while asset Uploaded | Ready |
| `backfill-homework-completion-upload-edge-cases.js` | Multi-file HW, missing links | Ready |
| `backfill-missing-weekly-summaries-and-xp-links.js` | No WAS for enrollment+week | Ready |
| `backfill-xp-event-weekly-summary-links.js` | XP missing WAS link | Ready |
| `repair-video-feedback-xp-link.js` | Wrong video XP link | Ready |
| `dedupe-zoom-meeting-xp-events.js` | Duplicate Zoom XP | Ready |
| `backfill-submission-pipeline-links.js` | WAS links, HW slots, asset links | **Ready** |
| `backfill-submission-xp-events.js` | Missing 010 XP events | **Ready** |
| `backfill-homework-xp-from-reviewed.js` | Missing 065 XP events | **Planned** |
| `backfill-video-pipeline-links.js` | 013-style VF links | **Planned** |

---

## Runbook

1. Run relevant **audit** script; save output.  
2. Run matching **backfill** with `DRY_RUN = true`; verify planned changes.  
3. Set `CONFIRM_WRITE = true` on a batch.  
4. Re-run audit until clean.  
5. Run `audit-field-coverage-report.js`.  
6. Update `CHANGELOG.md` with date, scope, and record counts.

## When not to use backfills

- Widespread logic bugs in live automations — **fix automation first**, then backfill.  
- Suspected duplicate Make emails — fix scenario idempotency before resetting send flags.  
- Orphan completions with no file anywhere — link or archive manually (see upload edge audit).

## Related

- [Audits](../audits/README.md)  
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)  
- [Homework flow](../../../docs/data-flow/homework-flow.md)
