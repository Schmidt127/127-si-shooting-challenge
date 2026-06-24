# Changelog

Notable changes to scripts, schema documentation, Make.com blueprints, audit tools, and project docs.

## [Unreleased]

### Added
- **`audit-xp-linkage-coverage.js`** — Classifies XP Events by source/bucket and explains expected missing Submission links.
- **`audit-achievement-xp-pipeline-integrity.js`** — Stage I read-only parity for awarded unlocks (059) and streaks (054).
- **`docs/airtable/stage-j-legacy-cleanup.md`** — Stage J runbook, legacy field list, and perfection-pass order.

### Changed
- **`audit-field-coverage-report.js` (v1.1)** — Fix WAS field names (`Submissions`, `Weekly Email Sent?`); add video asset, video feedback, achievement unlock, and streak occurrence profiles; add Achievement Unlock / Streak Occurrence on XP Events.
- **`audit-orphan-xp-events.js` (v1.1)** — Sample-limited output, `issueTotal`, XP Source/Bucket on findings, missing enrollment/week bucket.
- **Extension script READMEs** — Stage H backfill marked ready; Stage I/J audit map updated.

### Added
- **`dedupe-homework-xp-events.js`** — Safe-delete duplicate Homework XP Events when legacy `HOMEWORK_COMPLETION|` and canonical `HOMEWORK_XP|` both exist (dry-run default, `CONFIRM_DELETE` gate).
- **`audit-video-pipeline-integrity.js`** — Read-only parity check for video Submission Assets vs Video Feedback (013/022/111): missing links, duplicates, key drift, upload writeback, Grade Band, orphans.
- **`backfill-video-pipeline-links.js`** — Batch create/repair Video Feedback links mirroring 013 + 022 (legacy key migration, upload writeback; dry-run default).
- **`audit-video-xp-pipeline-integrity.js`** — Read-only parity check for posted Video Feedback vs `VIDEO_SUBMISSION|` XP Events (114 logic).
- **`audit-homework-pipeline-integrity.js`** — Read-only parity check for reviewed Homework Completions vs `HOMEWORK_XP|` XP Events (missing, duplicate, Source Key, points, Award Status, WAS link).
- **`backfill-homework-xp-from-reviewed.js`** — Batch create/repair Homework XP Events mirroring Automation 065 (dry-run default, `CONFIRM_WRITE` gate).
- **`backfill-homework-completion-was-links.js`** — Links Homework Completions to Weekly Athlete Summary when missing (020 resolution order).
- **`backfill-homework-completion-orphan-resolve.js`** — Repair orphan homework rows (link assets) or archive when no upload file exists.
- **`backfill-submission-pipeline-links.js`** — Slot inference fallbacks from linked assets, open HW1/HW2, and multi-row Char33 submissions.
- **`backfill-submission-xp-events.js`** — Batch create/repair Submission Base XP Events when Automation 010 trigger cannot re-run (mirrors 010 logic, dry-run default).
- **`audit-submission-pipeline-integrity.js`** — End-to-end read-only check from counted Submissions through WAS, XP, assets, and homework/video links.
- **`audit-xp-vs-submissions.js`** — Submission ↔ XP Event parity (missing, duplicate, Source Key drift, Award Status gaps).
- **`audit-field-coverage-report.js`** — Fill-rate report on canonical pipeline fields to surface legacy/unused fields after backfills.
- **Extension script READMEs** — Full pipeline audit/backfill map and recommended run order (Submissions → end).

### Changed
- **`audit-homework-pipeline-integrity.js` (v1.1)** — Strict homework XP matching (canonical/legacy Source Key + explicit link only); primary XP picker for mismatch samples.
- **`backfill-homework-xp-from-reviewed.js` (v1.3)** — Legacy key repair, `repair_xp_points`, `fullySynced` includes XP points; dedupe prerequisite messaging.
- **`backfill-homework-completion-orphan-resolve.js`** — Reset `TARGET_HOMEWORK_IDS` to `null` for full-base scans after Allie/Tracen/Fox live fixes.
- **Upload pipeline** — Standardized Make send gate to **`Pending Link`** across 009/013/020/070a/070b; documented ladder in `make/documentation/upload-asset-engine.md`.
- **070a (v2.2)** — Requires `Pending Link` before send (matches 070b).
- **013 (v2.0), 020 (v2.2)** — Rewritten to production script standard: `main()` wrapper, CONFIG.version, standard outputs, docblock metadata (`Date Written` preserved, `Last Updated: 2026-06-21`). **020 v2.2** syncs Homework Completion upload writeback when asset is already linked or at link time.
- **070a (v2.2)** — Production docblock/GitHub header aligned to automation script standard.

### Added
- **022 (v1.1)** — Syncs Homework Completion and Video Feedback upload writeback from Submission Assets after Make updates (Uploaded / Processing / Error); uses schema validation, `selectRecordAsync`, and 114-style single-select writes.
- **`backfill-homework-completion-upload-status.js`** — Safe-backfill extension for historical Homework Completions stuck at Pending while linked assets are Uploaded.
- **`audit-homework-completion-upload-edge-cases.js`** — Read-only audit for Homework Completions with zero or multiple linked Submission Assets.
- **`backfill-homework-completion-upload-edge-cases.js`** — Multi-file HW1/HW2 uploads keep all Submission Asset links; derives homework Upload Status from all linked assets.
- **`audit-stuck-upload-processing.js`** — Read-only extension audit for Processing-without-Drive and Ready gate mismatches.
- **`audit-orphan-xp-events.js`** — Read-only audit for XP Events missing Weekly Athlete Summary links.
- **`dedupe-zoom-meeting-xp-events.js`** — Safe-backfill extension script to find and remove duplicate Zoom Meeting XP Events (dry-run default).
- **`upload-asset-engine-error-handling.md`** — Make scenario guide for Error writeback and fresh attachment URL fetch.

### Fixed
- **071 (v3.3)** — Skip gracefully when Parent Feedback Sent? is already checked instead of throwing (prevents automation errors after upload backfill updates re-trigger already-emailed homework rows).
- **101 (v5.4)** — Creates Weekly Athlete Summary when missing before Zoom XP award so zoom-only weeks no longer produce orphan XP Events.
- **010 (v10.4)** — Adds Weekly Athlete Summary repair pass after XP Event create/update.
- **031 (v3.1)** — After find/create summary, links orphan XP Events for the same Enrollment + Week.
- **072** — Build Weekly Summary Email Package no longer auto-checks `Send to Make?` after building email HTML; send is now manual.
- **010, 114, 101, 065, 054, 059** — XP Event create/update scripts now link `XP Events → Weekly Athlete Summary` using source-record link when available, with Enrollment + Week lookup fallback.
- **114 (v5.8)** — Video XP matching hardened with tiered lookup and submission/week conflict guards so a Video Feedback record cannot steal or reuse the wrong XP Event.
- **101 (v5.3)** — Zoom attendance supplemental re-runs no longer duplicate base XP when recording watchers are added after the original award; dedupe uses Source Key plus Zoom Meeting + Enrollment fallback.

### Changed
- **010** — Rewritten to production script standard (v10.3): `async function main()`, schema validation inside `main()`, required outputs, and final JSON console log.
- **114** — Rewritten to production script standard (v5.8): runtime state inside `main()`, try/catch inside `main()`, `await main()` runner; Weekly Athlete Summary linking hardened with schema validation and repair pass.
- **101** — Supplemental award mode (v5.3): `main()` wrapper, dual XP Event indexes, safe re-run for late recording watchers without resetting XP Award Status.
- **065** — Rewritten to production script standard (v9.2): runtime inside `main()`, `assertRequiredSchema()`, Weekly Athlete Summary schema validation and repair pass, standard outputs.
- **054** — Rewritten to production script standard (v5.4): module CONFIG/helpers, `assertRequiredSchema()`, Weekly Athlete Summary repair pass, standard outputs.
- **059** — Rewritten to production script standard (v3.5): module CONFIG/helpers, `assertRequiredSchema()`, Weekly Athlete Summary repair on create/duplicate paths, standard outputs.

## 2026-06-20

- Created repository documentation scaffold: `README.md`, `CHANGELOG.md`, and `SYSTEM_OVERVIEW.md`.
