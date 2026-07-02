# Changelog

Notable changes to scripts, schema documentation, Make.com blueprints, audit tools, web app, and project docs.

**Sections:** group entries under `### Airtable`, `### Web`, or `### Make` in each release.

## [Unreleased]

### Airtable

#### Added
- **Season close-out award tooling (`tools/airtable/`)** — Read-only scripts and `_preview/` reports: `compare_award_recipients_snapshot.py` (June 29 CSV vs live Award Recipients), `audit_goal_conquer_reconciliation.py`, `audit_awards_catalog_and_connections.py`, `audit_final_awards.py`, `preview_final_email.py`, `generate_final_awards_email.py`. Documents award-link cleanup workflow and old→new catalog name map in [tools/airtable/README.md](./tools/airtable/README.md).
- **June 29 Award Recipients snapshot** — `Award Recipients-Grid view from June 29 FINAL.csv` (fulfillment truth before catalog rename); internal crossmatch report in `tools/airtable/_preview/june29-snapshot-crossmatch-report.md`.
- **Final Pre-Close audits (090A–090G)** — Read-only extension scripts scoped to Active? enrollments: submission XP, homework XP, streaks/milestones, video/zoom XP, unlock workflow (Week 9), weekly email (072/074), enrollment XP rollup. See `airtable/extension-scripts/audits/README.md`.
- **Final Pre-Close backfill stubs** — `repair-final-090f-unlock-week-from-source.js`; `repair-final-090g-build-final-challenge-summary-email.js` upgraded to **v2.0** one-page season recap HTML (days, HW done/missed, streaks, milestones, videos, zoom, awards, requirement counters).
- **`repair-final-090e-xp-rollup-duplicate-status.js`** — Clears false `Duplicate - Remove` on XP Events (or deactivates true duplicates) so `Lifetime XP Earned` rollup matches 090E computed totals.
- **`067` (v1.0)** — Homework — Link or Create Completion from Reflection Quiz. Bridges the Fillout Homework 17 test (`Final Reflection Quiz Submissions`) into a normal `Homework Completion` (native dedupe `Enrollment | Week | Homework`, `Source System = Fillout`, `Completion Status = Submitted` / `Review Status = Ready for Review`). No special pipeline; XP stays gated behind normal coach review + `064`/`065`. Trigger table: `Final Reflection Quiz Submissions`.
- **`audit-homework17-reflection-quiz-pipeline.js`** — Read-only audit of HW17 quiz intake: already-linked, safe/no/multiple Enrollment, HW17 + Week resolution, would-create vs would-update, duplicate-risk, needs-review, and an exact create/update preview.
- **`backfill-homework17-completions-from-reflection-quiz.js`** — One-time backfill mirroring `067` (DRY_RUN + CONFIRM_WRITE gates, BATCH_LIMIT). Never creates/modifies XP Events.

#### Changed
- **Award Recipients historical cleanup (2026-07-02)** — Re-linked wrong **Award** fields on ~115 rows using June 29 snapshot; removed duplicate homework Week 8 rows. Comparison report clean (0 wrong links / 0 manual / 0 dupes). Goal Met / Conquered Goal reconciliation clean (14/14). See [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md).
- **`repair-final-090g-build-final-challenge-summary-email.js` (v2.0.1)** — Fix enrollment query: flatten `fullNameCandidates` / `currentLevelCandidates` into `selectRecordsAsync` fields (was throwing "Full Athlete Name isn't in this record").
- **Views policy** — Document that Airtable views are not exported (expected); see `airtable/schema/snapshots/README.md`, `tools/airtable/README.md`.
- **Schema snapshot** — Fresh export `20260628_130208` (29 tables; field-level diff vs `20260628_082345`: none). Updated `manifest_appn84sqPw03zEbTT_latest.json`.

### Docs

#### Changed
- **`web/docs/airtable-data-map.md`** — View names aligned with `queries.ts` (`Web - Achievements`, publish flags, Vercel env vars, health check).
- **`docs/PROJECT_STATE.md`** — Latest snapshot id, base UI name, production Airtable status, env var checklist.
- **`web/docs/airtable-views.md`** — Health check documents `tokenValid` and correct env var name.

### Web

#### Added
- **Overview hub** — all 10 program pages linked from `/shoot` (articles, zoom, achievements, game manual, display, etc.).
- **Achievements page** — live Airtable catalog (`Active?` + `Visible?`) with rarity-styled badge grid.
- **Public display page** — gym/lobby fullscreen leaderboard view (top 10 + podium).

### Airtable

#### Changed
- **`020` (v2.3)** — Homework Completion race guard: re-query before create when 009 creates multiple same-slot assets; prefer existing row when duplicate matches found instead of erroring.

### Web

#### Added
- **Leaderboard UI overhaul** — Trophy/crown icons, athlete headshots in full rankings table, podium glow, tiebreaker legend (Level → XP → Shots), live stats cards.
- **Program hub home page** — Brand hero, top-3 live preview from Airtable, icon cards for Leaderboard, Homework, Tutorials, Shoutouts, Levels.
- **`components/icons/shoot-icons.tsx`** — Shared SVG icons for catalog and leaderboard pages.

#### Changed
- **Homework, Tutorials, Shoutouts, Levels** — Section hero icons, play/megaphone overlays on media cards, homework ambient theme.

### Docs

#### Added
- **`docs/PROJECT_STATE.md`** — Live ops snapshot (bases, audit status, Vercel, Softr, Make).
- **`AGENTS.md`** — AI assistant entry point and hard constraints.
- **`.cursor/rules/monorepo.mdc`** — Repo scope and session startup for Cursor.
- **`.cursorignore`** — Exclude node_modules, .next, large schema JSON exports.
- **`docs/automation-index.md`** — Full index of 46 production automations by domain.
- **`web/docs/site-hierarchy.md`** — Canonical `/shoot` routes, nav, legacy route notes.
- **`web/docs/airtable-views.md`** — Views and fallback filters from `queries.ts`.

#### Changed
- **Legacy web routes** — Removed leftover `referee-clinics/` stub; component back-links use `/` instead of `/shooting-challenge`.
- **`web/docs/site-hierarchy.md`**, **`known-issues.md`**, **`page-plan.md`**, **`brand-guide.md`** — Reflect single `(program)/` route tree.
- **`airtable/automations/shooting-challenge/README.md`** — Points to automation index (removed placeholder `submission-xp.js`).
- **`docs/README.md`** — PROJECT_STATE, AGENTS, automation-index links; fixed broken STRUCTURE.md reference.
- **`docs/known-issues.md`**, **`docs/checklists/weekly-maintenance-checklist.md`**, **`web/docs/page-plan.md`** — Aligned with `/shoot` rebuild.

### JR Ref / Airtable

#### Added
- Program infrastructure for **JR Referee Clinics** — docs (`docs/jr-ref/`), schema paths (`airtable/schema/jr-ref/`), automations folder, extension-scripts, `tools/airtable/jr-ref/export_schema.py`.
- Cursor rule `.cursor/rules/jr-referee-clinics.mdc`.
- Web docs under `web/docs/jr-ref/` (data map, roadmap, public rules, cursor instructions).

### Airtable

#### Changed
- **`audit-video-and-homework-attachment-linkage.js` (v1.2)** — Upload/linkage issues only (10 issue types); removed `MULTIPLE_SUBMISSIONS_SAME_WEEK`, Drive-dupe, and duplicate-submission noise; added `HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS`, `ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED`, `TARGET_AND_ASSET_DRIVE_FILE_MISMATCH`; output limited to Brayden Elders + issue summary + recommendations.
- **`audit-video-and-homework-attachment-linkage.js` (v1.1)** — Suppress expected Asset↔Video Feedback Drive ID/URL pairs; flag only same-table or 3+ record dupes; add `MULTIPLE_SUBMISSIONS_SAME_WEEK` (Enrollment + Week); clearer cleanup recommendations.
- **`070a` / `070b` (v4.1)** — Homework `routeKey` corrected to `homework_completion`; routing derived from Upload Destination; duplicate Drive file stops as Uploaded; shared minimal payload unchanged.
- **`070a` / `070b` (v4.0)** — Shared minimal Make Upload Engine webhook payload; sends webhook before Processing; requires input `automationNumber` (`070a` or `070b`); removed duplicate attachment/homework/video ID fields from payload.

#### Added
- **`audit-make-upload-engine-test-submission.js`** — Stage A–I dry-run trace for Fillout/Make upload test submissions (homework + video).
- **`audit-orphan-asset-homework-submission-repair-planner.js`** — Dry-run planner for orphan Submission Assets and Homework Completions missing Submission link; proposes safe parent matches.
- **`repair-orphan-asset-submission-links.js`** — Links `Submission - Linked` on orphan assets (SAFE + fallback + Nora manual overrides); writes only that field.
- **`repair-audit-010-linkage-drive-writeback-and-hw-credit.js`** — Ryder/Maizee/Clara homework Drive writeback + HOMEWORK_XP credit after linkage-full drift.
- **`audit-video-and-homework-attachment-linkage.js`** — Read-only audit for video/homework Submission Assets, Video Feedback, and Homework Completions linkage, Google Drive duplicates, parent-feedback vs grading-queue conflicts, and Brayden/Elders focus section.
- **`audit-pending-shot-milestone-unlocks.js`** — Diagnoses Pending unlocks stuck when XP is linked but Awarded status missing (059 partial runs).
- **`backfill-shot-milestone-unlock-mark-awarded.js`** — Repairs Pending shot-milestone unlocks with linked XP (059 `existing_linked_xp_event` parity).
- **`audit-legacy-cleanup-candidates.js`** — Inventories LEGACY/ZZZ fields and orphan Streak Length unlock rows.
- **`archive-legacy-streak-unlock-records.js`** — Deletes legacy streak unlock rows (no XP; superseded by 053/054).
- **`audit-xp-linkage-coverage.js`** — Classifies XP Events by source/bucket and explains expected missing Submission links.
- **`audit-achievement-xp-pipeline-integrity.js`** — Stage I read-only parity for awarded unlocks (059) and streaks (054).
- **`docs/airtable/stage-j-legacy-cleanup.md`** — Stage J runbook, legacy field list, and perfection-pass order.

#### Changed
- **`audit-legacy-cleanup-candidates.js` (v1.1)** — Reports documented manual field deletes and `manualFieldsStillPresent` count.
- **`docs/airtable/stage-j-legacy-cleanup.md`** — Full A–J pipeline status; Stage I shot-milestone repair complete; Submissions legacy fields in Phase 3.
- **`059` docblock** — Recommended trigger (no `Ready for 059 XP?` formula); stuck-row repair script reference.
- **`docs/airtable/stage-j-legacy-cleanup.md`** — Full legacy cleanup runbook (unlock archive + manual field/table delete).
- **`audit-field-coverage-report.js` (v1.1)** — Fix WAS field names (`Submissions`, `Weekly Email Sent?`); add video asset, video feedback, achievement unlock, and streak occurrence profiles; add Achievement Unlock / Streak Occurrence on XP Events.
- **`audit-orphan-xp-events.js` (v1.1)** — Sample-limited output, `issueTotal`, XP Source/Bucket on findings, missing enrollment/week bucket.
- **Extension script READMEs** — Stage H backfill marked ready; Stage I/J audit map updated.

#### Added
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

#### Changed
- **`audit-homework-pipeline-integrity.js` (v1.1)** — Strict homework XP matching (canonical/legacy Source Key + explicit link only); primary XP picker for mismatch samples.
- **`backfill-homework-xp-from-reviewed.js` (v1.3)** — Legacy key repair, `repair_xp_points`, `fullySynced` includes XP points; dedupe prerequisite messaging.
- **`backfill-homework-completion-orphan-resolve.js`** — Reset `TARGET_HOMEWORK_IDS` to `null` for full-base scans after Allie/Tracen/Fox live fixes.
- **Upload pipeline** — Standardized Make send gate to **`Pending Link`** across 009/013/020/070a/070b; documented ladder in `make/documentation/upload-asset-engine.md`.
- **070a (v2.2)** — Requires `Pending Link` before send (matches 070b).
- **013 (v2.0), 020 (v2.2)** — Rewritten to production script standard: `main()` wrapper, CONFIG.version, standard outputs, docblock metadata (`Date Written` preserved, `Last Updated: 2026-06-21`). **020 v2.2** syncs Homework Completion upload writeback when asset is already linked or at link time.
- **070a (v2.2)** — Production docblock/GitHub header aligned to automation script standard.

#### Added
- **022 (v1.1)** — Syncs Homework Completion and Video Feedback upload writeback from Submission Assets after Make updates (Uploaded / Processing / Error); uses schema validation, `selectRecordAsync`, and 114-style single-select writes.
- **`backfill-homework-completion-upload-status.js`** — Safe-backfill extension for historical Homework Completions stuck at Pending while linked assets are Uploaded.
- **`audit-homework-completion-upload-edge-cases.js`** — Read-only audit for Homework Completions with zero or multiple linked Submission Assets.
- **`backfill-homework-completion-upload-edge-cases.js`** — Multi-file HW1/HW2 uploads keep all Submission Asset links; derives homework Upload Status from all linked assets.
- **`audit-stuck-upload-processing.js`** — Read-only extension audit for Processing-without-Drive and Ready gate mismatches.
- **`audit-orphan-xp-events.js`** — Read-only audit for XP Events missing Weekly Athlete Summary links.
- **`dedupe-zoom-meeting-xp-events.js`** — Safe-backfill extension script to find and remove duplicate Zoom Meeting XP Events (dry-run default).
- **`upload-asset-engine-error-handling.md`** — Make scenario guide for Error writeback and fresh attachment URL fetch.

#### Fixed
- **071 (v3.3)** — Skip gracefully when Parent Feedback Sent? is already checked instead of throwing (prevents automation errors after upload backfill updates re-trigger already-emailed homework rows).
- **101 (v5.4)** — Creates Weekly Athlete Summary when missing before Zoom XP award so zoom-only weeks no longer produce orphan XP Events.
- **010 (v10.4)** — Adds Weekly Athlete Summary repair pass after XP Event create/update.
- **031 (v3.1)** — After find/create summary, links orphan XP Events for the same Enrollment + Week.
- **072** — Build Weekly Summary Email Package no longer auto-checks `Send to Make?` after building email HTML; send is now manual.
- **010, 114, 101, 065, 054, 059** — XP Event create/update scripts now link `XP Events → Weekly Athlete Summary` using source-record link when available, with Enrollment + Week lookup fallback.
- **114 (v5.8)** — Video XP matching hardened with tiered lookup and submission/week conflict guards so a Video Feedback record cannot steal or reuse the wrong XP Event.
- **101 (v5.3)** — Zoom attendance supplemental re-runs no longer duplicate base XP when recording watchers are added after the original award; dedupe uses Source Key plus Zoom Meeting + Enrollment fallback.

#### Changed
- **010** — Rewritten to production script standard (v10.3): `async function main()`, schema validation inside `main()`, required outputs, and final JSON console log.
- **114** — Rewritten to production script standard (v5.8): runtime state inside `main()`, try/catch inside `main()`, `await main()` runner; Weekly Athlete Summary linking hardened with schema validation and repair pass.
- **101** — Supplemental award mode (v5.3): `main()` wrapper, dual XP Event indexes, safe re-run for late recording watchers without resetting XP Award Status.
- **065** — Rewritten to production script standard (v9.2): runtime inside `main()`, `assertRequiredSchema()`, Weekly Athlete Summary schema validation and repair pass, standard outputs.
- **054** — Rewritten to production script standard (v5.4): module CONFIG/helpers, `assertRequiredSchema()`, Weekly Athlete Summary repair pass, standard outputs.
- **059** — Rewritten to production script standard (v3.5): module CONFIG/helpers, `assertRequiredSchema()`, Weekly Athlete Summary repair on create/duplicate paths, standard outputs.

### Web

#### Changed
- **`docs/README.md`** — Central documentation index for the monorepo.
- **Root `README.md`** — Updated layout tree, Hoop Challenges naming note, links to doc index.
- **`cursor/rules.md`** — Pointer to canonical `.cursor/rules/` (no duplicate conventions).
- **`web/docs/page-plan.md`** — Aligned with `site-hierarchy.md`; removed stale scaffold routes.
- **`web/docs/site-hierarchy.md`** — Documented legacy `/leaderboard` redirect.
- **`safe-backfills/README.md`** — Pipeline table synced with audits (Stages A–J); added `dedupe-homework-xp-events.js`.

## 2026-06-20

- Created repository documentation scaffold: `README.md`, `CHANGELOG.md`, and `SYSTEM_OVERVIEW.md`.
