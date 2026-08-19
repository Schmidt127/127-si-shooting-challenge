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
| `repair-final-090e-xp-rollup-duplicate-status.js` | Final close: clear false Duplicate - Remove on XP Events blocking Lifetime XP Earned rollup | **Ready** |
| `repair-kimm-lyle-restore-excluded-submissions.js` | Close-out: Lyle Kimm — Count It on two excluded duplicate submissions (+340 shots) | **Ready** |
| `repair-final-090f-unlock-week-from-source.js` | Final close: fill empty Week on unlocks from milestone activity date | **Stub — DRY_RUN** |
| `repair-final-090g-build-final-challenge-summary-email.js` | Final close: one-page season recap email (days, HW, streaks, milestones, videos, awards) | **Ready — DRY_RUN** |
| `migrate-tutorials-into-tutorials-and-assets.js` | **C-026 preview:** Tutorials → Tutorials & Assets; creates unmatched only; overlaps → Tutorial Migration Review; never deletes/merges | **Ready — DRY_RUN** |
| `merge-three-tutorials-possible-matches.js` | **C-026 possible matches:** merge 3 named Tutorials rows into Tutorials & Assets; Parent Motivation keeps authoritative target video | **Ready — previewOnly default** |

### Merge three possible matches (PROD)

**Script:** `merge-three-tutorials-possible-matches.js` (v1.1)
**Titles:** Work Hard, It Pays · Refs Get it Right - NBA · Parent Motivation - Habits & Struggles

- Matches by exact normalized Name on `Tutorials` → `Tutorials & Assets`
- Never deletes/creates; never touches other rows
- Fills missing target fields only; appends differing descriptions; merges missing attachments
- Unresolved video conflict → skip that row
- **Parent Motivation:** keep target video (`…1x2ZIjLZ0zNl23UYCQiUuXzmgybidWZUL…`); continue other merges; append resolved note to existing Tutorial Migration Review `Notes` only
- Sets `Legacy Tutorials Record ID` + `Migration Status` = `Migrated - Review Needed`
- Prints full preview and **all-three-ready** before any confirm
- `CONFIG.previewOnly = true` by default (stops after preview)

```text
1. Paste into Scripting extension on PROD (appn84sqPw03zEbTT)
2. Run with previewOnly=true — confirm console shows ALL THREE RECORDS ARE READY
3. Set previewOnly=false, re-run, type CONFIRM MERGE to write
```

### Tutorials → Tutorials & Assets (C-026 reverse-direction preview)

**Decision conflict:** Backlog C-026 still recommends keep `Tutorials` (web-canonical). This script implements Mike's requested reverse preview (`Tutorials` source → `Tutorials & Assets` keep). Do not retire `Tutorials` or repoint `/shoot` until Mike approves the review report and updates C-026.

**Live Production (2026-08-17):** both tables have **32** rows; **0** link fields on either table; target primary `Name` may carry a BOM; missing `Legacy Tutorials Record ID`, `Migration Status`, and table `Tutorial Migration Review`.

**Prerequisites (create in Airtable UI / OMNI before write mode):**

1. On **Tutorials & Assets**:
   - `Legacy Tutorials Record ID` (single line text)
   - `Migration Status` (single select or text; include `Migrated - Review Needed`)
2. New table **Tutorial Migration Review** with fields:
   - Source Tutorials Record ID, Target Tutorials and Assets Record ID, Match Classification, Confidence Score, Match Reasons, Conflicting Fields, Source Name, Target Name, Source Video Link, Target Video Link, Source Attachments, Target Attachments, Linked Asset Summary, Review Decision, Reviewed?, Final Action, Notes

**Run:**

```text
1. node airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.test.js
2. Paste script into Scripting extension (Production)
3. Run DRY_RUN=true — save JSON (schema + classifications)
4. Review HIGH / POSSIBLE rows in console (and later in Tutorial Migration Review)
5. After prerequisites exist: DRY_RUN=false, CONFIRM_WRITE=true (batch 25)
6. Re-run until NO_MATCH_CREATE remaining is 0
```

Offline tests: `migrate-tutorials-into-tutorials-and-assets.test.js`
Compat tests: `migrate-tutorials-into-tutorials-and-assets.compat.test.js`

```bash
node airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.test.js
node airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.compat.test.js
```

**v1.2 notes:** Multi-select → `[{name}]`; single-select → `{name}` with option validation (missing options → Notes, not hard fail); mutations throttled to ≤15/sec with rate-limit retry; runtime locked to PROD base `appn84sqPw03zEbTT` + table IDs. Last dry-run baseline: **28** high / **3** possible / **1** create (`Shooting Challenge Information Poster`).

**v1.1 notes:** `unloadData` is guarded; primary Name writes use field ID `fldduBizp8qAnAMJW` (BOM-safe, no duplicate Name); WRITE aborts on preflight if legacy/migration/report schema is missing.

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
