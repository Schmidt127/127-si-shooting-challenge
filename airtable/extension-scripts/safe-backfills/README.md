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
| 5b | `backfill-homework-completion-was-links.js` | Homework → Weekly Athlete Summary Link | `audit-field-coverage-report.js` |
| 5c | `backfill-homework-completion-orphan-resolve.js` | Link repair or archive no-upload orphans | `audit-homework-completion-upload-edge-cases.js` |
| 6 | `backfill-homework-completion-upload-status.js` | Upload status writeback from assets | `audit-stuck-upload-processing.js` |
| 7 | `backfill-homework-xp-from-reviewed.js` | XP for reviewed homework missing events | `audit-homework-pipeline-integrity.js` |
| 7b | `dedupe-homework-xp-events.js` | Remove duplicate HW XP (legacy + canonical keys) | `audit-homework-pipeline-integrity.js` |
| 7c | `backfill-homework17-completions-from-reflection-quiz.js` | Link/create Homework Completion from HW17 Fillout test rows (no XP writes) | `audit-homework17-reflection-quiz-pipeline.js` |
| 8 | `backfill-video-pipeline-links.js` | 013-style VF create/link + 022 upload sync | `audit-video-pipeline-integrity.js` |
| 9 | `backfill-video-xp-from-posted-feedback.js` | Missing/repair Video XP (114 logic) | `audit-video-xp-pipeline-integrity.js` |
| 10 | `repair-video-feedback-xp-link.js` | Video Feedback ↔ wrong XP Event repair | `audit-video-xp-pipeline-integrity.js` |
| 11 | `backfill-legacy-streak-xp-week-and-was.js` | Legacy STREAK_OCCURRENCE XP → Week + WAS + key | `audit-achievement-xp-pipeline-integrity.js` |
| 12 | `backfill-legacy-streak-xp-source-keys.js` | STREAK_OCC* → STREAK_XP\| canonical keys | `audit-achievement-xp-pipeline-integrity.js` |
| 13 | `backfill-shot-milestone-xp-week-and-was.js` | Shot Milestone XP → Week + WAS from unlock | `audit-achievement-xp-pipeline-integrity.js` |
| 14 | `backfill-shot-milestone-unlock-mark-awarded.js` | Pending unlocks with XP already linked → Awarded | `audit-pending-shot-milestone-unlocks.js` |
| 15 | `dedupe-zoom-meeting-xp-events.js` | Duplicate Zoom XP | Manual / zoom audit |
| 16 | `archive-legacy-streak-unlock-records.js` | Delete orphan Streak Length unlock rows | `audit-legacy-cleanup-candidates.js` |

Finish with **`audit-field-coverage-report.js`** to identify unused fields.

---

## Scripts (current)

| Script file | Use case | Status |
|-------------|----------|--------|
| `backfill-homework-completion-upload-status.js` | HW Pending while asset Uploaded | Ready |
| `backfill-homework-completion-upload-edge-cases.js` | Multi-file HW, missing links | Ready |
| `backfill-homework-completion-was-links.js` | HW missing WAS link | **Ready** |
| `backfill-homework17-completions-from-reflection-quiz.js` | HW17 Fillout test → Homework Completion (link/create, no XP) | **Ready** |
| `backfill-homework-completion-orphan-resolve.js` | Orphan HW link or archive | **Ready** |
| `backfill-missing-weekly-summaries-and-xp-links.js` | No WAS for enrollment+week | Ready |
| `backfill-xp-event-weekly-summary-links.js` | XP missing WAS link | Ready |
| `repair-video-feedback-xp-link.js` | Wrong video XP link | Ready |
| `dedupe-zoom-meeting-xp-events.js` | Duplicate Zoom XP | Ready |
| `backfill-submission-pipeline-links.js` | WAS links, HW slots, asset links | **Ready** |
| `backfill-submission-xp-events.js` | Missing 010 XP events | **Ready** |
| `backfill-homework-xp-from-reviewed.js` | Missing 065 XP events | **Ready** |
| `dedupe-homework-xp-events.js` | Duplicate Homework XP Events | **Ready** |
| `backfill-video-pipeline-links.js` | 013-style VF create/link + 022 upload sync | **Ready** |
| `backfill-video-xp-from-posted-feedback.js` | Missing/repair Video XP (114 logic) | **Ready** |
| `backfill-legacy-streak-xp-week-and-was.js` | Legacy streak XP Week/WAS + STREAK_XP key | **Ready** |
| `backfill-legacy-streak-xp-source-keys.js` | STREAK_OCC* → STREAK_XP\| source keys only | **Ready** |
| `backfill-shot-milestone-xp-week-and-was.js` | Shot Milestone XP Week/WAS from unlock | **Ready** |
| `backfill-shot-milestone-unlock-mark-awarded.js` | 059 repair: Pending + XP linked → Awarded | **Ready** |
| `archive-legacy-streak-unlock-records.js` | Delete orphan Streak Length unlock rows | **Ready** |
| `repair-audit-linkage-full.js` | All v1.2 linkage audit issues (multi-asset HW, send trigger, VF flags, orphans) | **Ready** |
| `repair-orphan-asset-submission-links.js` | Orphan Submission Assets → Submission - Linked (planner follow-up) | **Ready** |
| `repair-audit-010-linkage-drive-writeback-and-hw-credit.js` | Ryder/Maizee/Clara HW Drive writeback + XP credit after linkage-full | **Ready** |
| `repair-audit-001` … `009` | Single-record targeted repairs (use linkage-full for batch) | **Ready** |
| `repair-final-090f-unlock-week-from-source.js` | Final close: fill empty Week on unlocks from milestone activity date | **Stub — DRY_RUN** |
| `repair-final-090g-build-final-challenge-summary-email.js` | Final close: build final summary package per family (no send) | **Stub — DRY_RUN** |

### Linkage audit repair (v1.2)

After `audit-video-and-homework-attachment-linkage.js`:

1. Run `repair-audit-linkage-full.js` with `DRY_RUN = true`
2. Review `plannedActions` and `manualReview` rows
3. Set `CONFIRM_WRITE = true`, `DRY_RUN = false`; re-run until `remainingCount` is 0
4. Re-run audit

Use `repair-audit-001` … `009` only for one-off spot fixes with explicit record IDs.

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

- [Audits](../audits/README.md) — Stages A–J pipeline map  
- [Documentation index](../../../docs/README.md)  
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)  
- [Homework flow](../../../docs/data-flow/homework-flow.md)
