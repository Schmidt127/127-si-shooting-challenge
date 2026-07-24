# Changelog

Notable changes to scripts, schema documentation, Make.com blueprints, audit tools, web app, and project docs.

**Sections:** group entries under `### Airtable`, `### Web`, or `### Make` in each release.

## [Unreleased]

### Airtable

#### Added
- **Season Launch Control System (2026-07-24)** — Extends Challenge-Year engine with fail-closed launch lifecycle (`Web Validated`; Softr Obsolete / Not Used), launch CLI, season export validators, week import package, automation hard-code audit, Fillout/Make/`/shoot` packages, Season Launch dashboard view specs, dry-run admin scripts, Schmidt test + go-live/rollback checklists. Season findings optionally map to RCC `buildIssue` when RCC is present on master (PR #40) — **this PR does not vendor RCC**. Preserves `118→072→119→074→Make Bulk Email May 18` and **118/119 ON**. Status: **Built in Repository**. Docs: [`SEASON-LAUNCH-CONTROL.md`](./docs/challenge-year/SEASON-LAUNCH-CONTROL.md). Install: [`season-launch-control-installation-packet.md`](./docs/deploy-checklists/season-launch-control-installation-packet.md).
- **Softr reclassified Obsolete (2026-07-24)** — Softr is Not Used for Shooting Challenge. Active front end is `/shoot` ([`WEB-SEASON-ACTIVATION.md`](./docs/challenge-year/WEB-SEASON-ACTIVATION.md)). Historical Softr docs retained as Historical Reference Only. SC-114 → Superseded.
- **Go-live integration + promotion lead (2026-07-24)** — Merged accepted agent branches; corrected stale **118/119 OFF** claims to verified **ON**; updated completion master + architecture + ownership; go-live readiness report. No Airtable UI mutations from agent. [`GO-LIVE-READINESS-2026-07-24.md`](./docs/next-wave/go-live/GO-LIVE-READINESS-2026-07-24.md).
- **Agent 1+2 reliability + data-model audit (2026-07-24)** — Docs/tests only: automation trust bands, input/dedupe/ownership audits, ranked repairs, table/field map refresh, Mike actions. No Airtable/Make mutations. [`reliability-audit-2026-07-24/REPORT.md`](./docs/next-wave/reliability-audit-2026-07-24/REPORT.md). Stale OFF schedule claims corrected in go-live integration.

#### Changed
- **074 PROD sendMode Live + Make writeback verified (2026-07-24)** — Fixed automation input `sendMode=Test` forced Make’s Test branch (email OK, no Sent? writeback). After **`sendMode=Live`**, Live writeback PASS: `Weekly Email Sent?` checked, `Make Send Status=Sent`, sent timestamp populated. **PROD rule:** 074 must use `sendMode=Live` or blank (inherit WAS `sendMode`) — never fixed Test. Docs + 074 docblock note; SC-040 → Live Tested. Architecture: [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](./docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md).
- **Weekly WAS email chain verified in PROD (2026-07-24)** — Final flow documented as `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail`. Empty-week **`send_short`** enforced in **072 v4.0** (`built_short_empty_week`); **119** arms Send only; **074** posts webhook; Make owns Live Sent? writeback. **118/119 schedules ON** (Sun 5:00 / 10:00 AM Denver); 072+074+Make **ON**.
- **072 v4.0 empty-week policy enforcement (2026-07-24)** — SC-035 `send_short` builds a concise no-activity reminder; `send_normal` keeps the full empty-week report; `suppress` leaves packages not send-ready. Non-empty weeks still get the full summary. 118/119 **v1.4** (default `send_short`). No webhook/email from 072.

### Web

#### Changed
- **Unified public page design system (2026-07-23)** — Remaining `/shoot` pages now share the approved home-page shell (`PageHero`, `ProgramPage`, `SiteSection`, `CtaLink`, restrained catalog surfaces). Competitive energy on Leaderboard, Achievements, Public Display, and Athlete Profile; calmer instructional styling on Homework, Tutorials, Articles, and Game Manual; balanced treatment on Dashboard, Levels, Zoom Meetings, Shoutouts, and Admin. Data wiring, routes, and Airtable queries unchanged. Loading states added for articles, shoutouts, public-display, and game-manual.

### Airtable

#### Added
- **DEV↔PROD Automation Reconciliation + Capacity Plan (2026-07-23)** — Docs-only audit: matrix, classifications, and staged ≤50 plan. Confirms **030 does not absorb 032/033**; **063/111/070c** not safe to remove; safest first PROD slot free is delete **112** then install **115**. No Airtable automation mutations. [`DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md`](./docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md).
- **Foundation Reset Pack (2026-07-23)** — PROD schema snapshots `prod-foundation-reset-20260723/` + `…-post-ts/`; Testing Scenarios table created (`tblagI7Q5wXQm2XGS`); Schmidt enrollment `recgP9qZYjAhE7NXm` set `Active?=true`; foundation Week + scenario seeded; live Fillout-shaped Submission proved Week→XP→WAS (`recaCcxDqtzFWjmyi` / `recOqzhV4kTdsfzMf` / `rechWp330MqSgRWzN`). Automation **115** paste still required. Evidence: [`docs/foundation-reset/`](./docs/foundation-reset/README.md).
- **Repo blocker closure pass (2026-07-16)** — Contract helpers/tests for Enrollment `Active?` / Progress Processing guards (C-010), weekly-summary build/send + automatic resend prevention (C-011 / 072–074), and HW17/009 attachment-slot mapping + quiz dedupe (C-009). Release validator now enforces launch-scope version headers, duplicate automation numbers, contradictory status docs (066/059/043/112/070b–c), C-019 Testing-view documentation rules, and launch-test evidence packages. Docs reconciled: **066 v3.2** paste status, **070b v4.4 / 070c v1.1** wording, **059** created-trigger recommendation, **043** retire, **112 OFF**. No live Airtable changes.

### Docs

#### Added
- **C-025 PROD 117f approval-email workflow (2026-07-20)** — Documentation for Airtable Automation **117** → Make `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1` (Data Store `C025_117f_PROD_SendKeys`; four-part send key). Includes overview, module map, input variables, test results, rollback, go-live checklist, and 400/422/502 troubleshooting. Status: **tested / built — not claimed fully live**. [workflow](./docs/deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md).
- **DEV Lambda upload service (2026-07-08)** — `lambda/upload-asset/` (`127si-dev-shooting-challenge-asset-upload`): handler + `upload_core` ported from SDK proof; H2 handler PASS on `recLAk8TA4lfbA6eu` (`allPass=true`). AWS deploy pending admin IAM. [DEPLOY.md](./lambda/upload-asset/DEPLOY.md), [C-013-sdk-hybrid-runtime.md](./docs/deploy-checklists/C-013-sdk-hybrid-runtime.md).
- **C-013 controlled confirm-write recheck + Make migration plan (2026-07-08)** — SDK re-PUT on `recBBi80bYuxXifVj` with `schmidt-mike` slug; C-023 duplicate fields written. [checkpoint](./docs/deploy-checklists/C-013-wave7-asset-storage-checklist.md#2026-07-08--controlled-dev-confirm-write-recheck-c-013--c-023) · [Make migration plan](./docs/deploy-checklists/C-013-make-upload-migration-plan.md).
- **C-013 DEV Lambda minimal contract (2026-07-08)** — [C-013-dev-lambda-upload-plan.md](./docs/deploy-checklists/C-013-dev-lambda-upload-plan.md#minimal-dev-contract--review-2026-07-08).

#### Changed
- **C-013 PROD closeout complete (2026-07-11)** — Video upload workflow PASS on Schmidt asset `recGQ8EjAMz3bEBiW`: 070b v4.4 `Accepted` async handoff → Lambda writeback → 070c v1.1 idempotent verify. Updated PROJECT_STATE, backlog, close-out considerations, promotion plan, runbook, infrastructure readiness, and [closeout doc](./docs/deploy-checklists/C-013-prod-closeout-2026-07-11.md). Historical v4.2 UI package marked superseded. — Automation **116** live on DEV (script `992677d`); S5A–S5L **12/12 PASS**; live Confirmed Duplicate + Approved Reuse reversal PASS on XP `recx2MvUh2WP0tbjO` (Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2` — deactivated/`Duplicate - Remove` then reactivated/`Unique`; audit markers `[C-023-S5]`; no duplicate XP row). Retired obsolete automation **008** (slot-neutral). Production paste not started.
- **C-023 H3 matrix complete (2026-07-10)** — H3f cross-enrollment PASS on `recQcpLCsYFrYYH7w` (second DEV enrollment `recKPxp0RlPhCLwDp`); informational-only cross-enrollment review, no reuse flag, no block. Matrix **16/16**. Harness: `--enrollment` arg + checkbox null-coercion fix in `tools/airtable/c013_dev_h3_matrix_run.py`. [Evidence](./docs/deploy-checklists/C-023-dev-h3-duplicate-bytes-test.md#2026-07-10--h3f-cross-enrollment-reuse-matrix-close).
- **DEV Lambda homework upload route (2026-07-10)** — `127si-upload-asset-dev` accepts `homework_completion` / **070a** (`Homework Completions` destination) with same claim, S3, hash, and C-023 review protections as video. `ALLOW_ROUTE_KEYS` includes `homework_completion`. H3e PASS on `rec1PzA7th0qJbsN4`. 38 unit tests PASS.
- **DEV Lambda `X-Upload-Secret` auth (2026-07-08)** — `upload_core/auth.py` validates `UPLOAD_WEBHOOK_SECRET`; 401 on missing/invalid header; no Airtable write on unauthorized. Tests: `lambda/upload-asset/tests/test_auth.py`.
- **DEV Lambda deploy/test prep (2026-07-08)** — `127si-upload-asset-dev` code-only deploy flags, Function URL invoke helper, [deploy-and-url-test plan](./docs/deploy-checklists/C-013-dev-lambda-deploy-and-url-test.md). No AWS deploy in commit.

### Make

#### Added
- **C-025 117f DEV Make package (2026-07-20)** — Sanitized blueprint `c025-117f-zoom-recording-approval-email-dev-v1.template.json`, offline simulator/tests (`make/lib/c025-117f-make-scenario*.js`), deployment checklist + Agent 2 handoff. Scenario stays **OFF**; no webhook URL in git. [contract](./docs/deploy-checklists/C-025-117f-dev-make-scenario-contract.md).

#### Changed
- **C-013 PROD upload route manual smoke PASS (2026-07-11)** — `Shooting Challenge - GAME - Upload Engine - Lambda - v1` passed upload (`actionOut=uploaded`, independent Airtable probe `allPass=true`), idempotency (`skipped_already_uploaded`, key/hash unchanged), and structured invalid-route handling (`error_invalid_route`). Sanitized blueprint documents `handleErrors=false` / complete Lambda JSON response behavior. **070b remains OFF**; exposed upload secret rotation + one Airtable-triggered Schmidt test remain.
- **C-013 PROD Make smoke runner probe parsing (2026-07-11)** — `c013_prod_make_smoke_run.py` now reads `submissionAsset.writebackVerification` from `_probe_c013_asset_storage_fields.py` (was incorrectly keyed as `recordProbe`, causing false `make_upload` FAIL). Upload pass requires webhook Lambda JSON **and** independent Airtable probe `allPass=true`. Invalid-route diagnostics document expected `Upload Status=Error` writeback.
- **C-013 upload runtime decision (2026-07-08)** — **SDK / hybrid interim** locked; Make S3 parked; Lambda deferred. Next: C-020 **H2** + C-023 duplicate on SDK. [C-013-sdk-hybrid-runtime.md](./docs/deploy-checklists/C-013-sdk-hybrid-runtime.md).
- **C-013/C-023 DEV SDK proof PASS (2026-07-08)** — `c013_dev_s3_upload_proof.py` live run on `recBBi80bYuxXifVj`: S3 upload + full Airtable writeback including SHA-256 hash; probe `allPass=true`.

### Airtable

#### Changed
- **C-025 117f approval-email contract v1.2.0 (2026-07-20)** — 117f owns Make webhook POST (`ZOOM_REC_EMAIL|…`); stamps Send Key / Sent At only after HTTP 2xx; skips conflict/disabled/blank webhook. Orchestrator 117 Section F → `deferred_to_117f` (no competing send-key stamps). Offline Stage 17 + Make simulator tests PASS. Do not install/enable 117f or populate webhook until DEV Make M1–M5 PASS.
- **C-025 Stage 17 COMPLETE in PROD (2026-07-20)** — Automations **117 v1.1.1**, **057 v1.3**, and **042 v3.1** enabled and verified. **101** unchanged. **117 `webhookUrl` blank** (approval email deferred). **115** not installed. Preconflict rollup `ARRAYJOIN(ARRAYUNIQUE(values), "\n")`; recording Conflict=1 / Approved=0; XP `recOceuW34jQz7suD` inactive. Closeout: [C-025-stage17-prod-live-2026-07-20.md](./docs/deploy-checklists/C-025-stage17-prod-live-2026-07-20.md). Rollback: [C-025-stage17-rollback-plan.md](./docs/deploy-checklists/C-025-stage17-rollback-plan.md).
- **115 v1.8 (2026-07-18)** — C025 Phase A waits for WAS `Perfect Week Automation Status=Ready` (057’s real done write) instead of ZA `Perfect Week Credit Applied?`. v1.7 Queue re-entry retained. DEV paste: [C-025-stage17-115-etf-v1.8-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.8-PASTE.txt). Do not paste to PROD.
- **115 v1.7 (2026-07-18)** — C025 Phase A forces Automation 057 condition re-match: WAS `Perfect Week Automation Status` **Skipped → Pending** on `recvtukGFL7u74Tme` (formula `Perfect Week Calculation Queue?` is 1 for both Ready and Pending, so Ready→Pending never re-fires). DEV paste: [C-025-stage17-115-etf-v1.7-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.7-PASTE.txt). Do not paste to PROD.
- **115 v1.6 (2026-07-18)** — C025 Phase B forces Automation 042 view re-entry: `Level Recalc Needed?` checked→unchecked→checked (or unchecked→checked) on Enrollment `recgP9qZYjAhE7NXm`. Resume skips when Gate Applied. Query budget still ≤22. DEV paste: [C-025-stage17-115-etf-v1.6-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.6-PASTE.txt). Do not paste to PROD.
- **115 v1.5 (2026-07-18)** — C025 Stage 17 ETF runner stays under Airtable’s 30-query quota: exact-record polls only (max 5×057 + 5×042), `MAX_QUERY_BUDGET=22`, resume-safe Applied? skips, timeout → Blocked + clear `Run Test?`. Daily/Homework/Video unchanged. DEV paste: [C-025-stage17-115-etf-v1.5-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.5-PASTE.txt). Do not paste to PROD.
- **070b v4.4 (2026-07-11)** — Remove invalid `setTimeout` polling (Airtable scripts cannot use timers). Make HTTP 2xx body `Accepted` returns `statusOut=pending`, `actionOut=lambda_upload_accepted_async`, `makeResponseMode=accepted_async`; retains `Send to Make Trigger` for companion **070c**. Immediate Lambda JSON path unchanged (`uploaded`, `skipped_already_uploaded`, structured errors).
- **070b v4.3 (2026-07-11)** — Superseded same day; polling design invalid in Airtable automation scripting.

#### Added
- **070c v1.1 (2026-07-11)** — Idempotent writeback verification: trigger state no longer fails verification. Full writeback + trigger checked → `async_upload_verified_trigger_cleared`; full writeback + trigger already cleared → `async_upload_already_verified`; failure only on missing writeback fields.
- **070c v1.0 (2026-07-11)** — Initial async verify companion (superseded same day by v1.1 false-failure on already-cleared trigger).
- **C-013 PROD readiness audit sync (2026-07-11)** — Reconciled stale BLOCKED/NOT_READY statuses in infrastructure readiness JSON and related deployment docs with verified PROD Lambda + Make manual route PASS. Invalid-route contract documented as expected Upload Status=`Error` with canonical/hash preserved.
- **Automation 116 (v1.0.1) — C-023 Stage 5 duplicate consequences (2026-07-10)** — `116-submission-assets-apply-asset-reuse-decision-consequences.js` (`992677d`) **DEV deployed and validated** on `appTetnuCZlCZdTCT`. Trigger: Submission Assets · when record updated · `Asset Reuse Decision` · input `recordId`. Live PASS: asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` (`applied_confirmed_duplicate` then `restored_approved_reuse`; same XP Event; `Duplicate Status` `Duplicate - Remove` → `Unique`; `[C-023-S5]` audit entries). S5A–S5L **12/12 PASS**. Replaced retired automation **008** — **automation count unchanged (~49)**. [Stage 5 report](./docs/deploy-checklists/C-023-dev-stage5-duplicate-consequences.md).
- **Automation 115 (v1.3) — C-020 Test Intake harness (2026-07-07)** — `115-engineering-test-framework-run-testing-scenario-daily-submission.js`: **Daily Submission** (v1.0), **Homework** (v1.1), **Video** (v1.3). DEV Tests A–D PASS on `appTetnuCZlCZdTCT`. Video reads **Testing Scenarios.Intake Attachments** → writes **Submissions.Video Upload**; Homework uses same intake field → **HW Sub 1**. No test flags on pipeline tables. Production not pasted. See [C-020 checklist](./docs/deploy-checklists/C-020-testing-scenarios-script-checklist.md).
- **Phase 2B engineering docs (2026-07-06)** — [ENGINEERING_CONSTITUTION.md](./docs/ENGINEERING_CONSTITUTION.md); permanent SCRIPT+CONFIG header in [v2/06](./docs/v2/06-automation-standards.md); [phase-2b-engineering-review-2026-07-06.md](./docs/phase-2b-engineering-review-2026-07-06.md). No script or Airtable changes.
- **Schema snapshots (2026-07-06)** — Production (`prod-20260706/`, 29 tables, 118 views) and DEV (`dev-20260706/`, 30 tables, 120 views). DEV includes **Testing Scenarios** (C-020). Session handoff: `docs/SESSION_HANDOFF-2026-07-06.md`.
- **Season close-out award tooling (`tools/airtable/`)** — Read-only scripts and `_preview/` reports: `compare_award_recipients_snapshot.py` (June 29 CSV vs live Award Recipients), `audit_goal_conquer_reconciliation.py`, `audit_awards_catalog_and_connections.py`, `audit_final_awards.py`, `preview_final_email.py`, `generate_final_awards_email.py`. Documents award-link cleanup workflow and old→new catalog name map in [tools/airtable/README.md](./tools/airtable/README.md).
- **June 29 Award Recipients snapshot** — `Award Recipients-Grid view from June 29 FINAL.csv` (fulfillment truth before catalog rename); internal crossmatch report in `tools/airtable/_preview/june29-snapshot-crossmatch-report.md`.
- **Final Pre-Close audits (090A–090G)** — Read-only extension scripts scoped to Active? enrollments: submission XP, homework XP, streaks/milestones, video/zoom XP, unlock workflow (Week 9), weekly email (072/074), enrollment XP rollup. See `airtable/extension-scripts/audits/README.md`.
- **Final Pre-Close backfill stubs** — `repair-final-090f-unlock-week-from-source.js`; `repair-final-090g-build-final-challenge-summary-email.js` upgraded to **v2.0** one-page season recap HTML (days, HW done/missed, streaks, milestones, videos, zoom, awards, requirement counters).
- **`repair-final-090e-xp-rollup-duplicate-status.js`** — Clears false `Duplicate - Remove` on XP Events (or deactivates true duplicates) so `Lifetime XP Earned` rollup matches 090E computed totals.
- **`067` (v1.0)** — Homework — Link or Create Completion from Reflection Quiz. Bridges the Fillout Homework 17 test (`Final Reflection Quiz Submissions`) into a normal `Homework Completion` (native dedupe `Enrollment | Week | Homework`, `Source System = Fillout`, `Completion Status = Submitted` / `Review Status = Ready for Review`). No special pipeline; XP stays gated behind normal coach review + `064`/`065`. Trigger table: `Final Reflection Quiz Submissions`.
- **`audit-homework17-reflection-quiz-pipeline.js`** — Read-only audit of HW17 quiz intake: already-linked, safe/no/multiple Enrollment, HW17 + Week resolution, would-create vs would-update, duplicate-risk, needs-review, and an exact create/update preview.
- **`backfill-homework17-completions-from-reflection-quiz.js`** — One-time backfill mirroring `067` (DRY_RUN + CONFIRM_WRITE gates, BATCH_LIMIT). Never creates/modifies XP Events.

#### Changed
- **Automation 066 (v3.2) — Production deployment (2026-07-06)** — Pasted `066-achievements-and-milestones-create-shot-milestone-unlocks.js` v3.2 to Production (`appn84sqPw03zEbTT`) from GitHub `36a2e95`. Replaces v2.1. **Denver-safe Week resolution** for shot milestone unlocks (005/034 date-key pattern; fixes UTC boundary mis-mapping). DEV verified before paste (Easton Hill idempotency + clean-create; Week write; no duplicate Milestone Source Key). **Monitor first natural Production run:** console `"version": "v3.2"`, Week populated on new unlocks, no duplicate `SHOT_MILESTONE|…` key, `Run Shot Milestone Check?` cleared on success/skip.
- **Award Recipients historical cleanup (2026-07-02)** — Re-linked wrong **Award** fields on ~115 rows using June 29 snapshot; removed duplicate homework Week 8 rows. Comparison report clean (0 wrong links / 0 manual / 0 dupes). Goal Met / Conquered Goal reconciliation clean (14/14). See [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md).
- **`repair-final-090g-build-final-challenge-summary-email.js` (v2.0.2)** — Individual final email **longest streak** now counts the longest consecutive calendar run of **counted submission days** (same dates as shooting days), not the enrollment `Longest Streak Days` rollup / XP milestone length. Adds a “Longest consecutive shooting run” line in Streaks section. `preview_final_email.py` aligned.
- **`preview_final_email.py` (final-summary-2026-07-03-v2)** — Individual final email polish: correction note at top; exclude junk coach feedback; light typo cleanup; clearer logged-shooting-days wording when count exceeds 61-day window; homework includes incomplete rows; Riley HTML is the template reference.
- **`stage_final_emails_to_was.py`** — Stages approved final-summary HTML onto each athlete’s **latest** Weekly Athlete Summary (same fields as automation **072**). Dry-run by default; `--confirm-write` to update Airtable. Skips enrollments with **Total Shots Counted ≤ 50**.
- **`arm_final_emails_send.py`** — Arms staged final summaries by checking **Send to Make?** (triggers automation **074**). Dry-run by default; `--confirm-arm` to write.
- **Final summary email send (2026-07-03)** — **65** staged (v2 HTML), **53** sent via **074**; **12** blocked on prior `Weekly Email Sent?`; **26** skipped (≤ 50 shots).
- **`repair-final-090g-build-final-challenge-summary-email.js` (v2.0.3)** — Same **> 50 shots** gate for final email candidates.
- **Close-out extension audits** — `audit-final-award-recipients-closeout.js` (+ `.source.js`), goal/conquer, awards catalog quick, cart summary; `generate_june29_snapshot_data.py` to rebuild embedded snapshot.
- **`docs/post-close-hygiene-2025-26.md`** — Post-season backlog (unlock dedupe, automation 066, catalog scope).
- **Views policy** — Document that Airtable views are not exported (expected); see `airtable/schema/snapshots/README.md`, `tools/airtable/README.md`.
- **Schema snapshot** — Fresh export `20260628_130208` (29 tables; field-level diff vs `20260628_082345`: none). Updated `manifest_appn84sqPw03zEbTT_latest.json`.

### Docs

#### Added
- **066 v3.1 DEV deploy checklist** — [docs/deploy-checklists/066-v3.1-dev-deploy.md](./docs/deploy-checklists/066-v3.1-dev-deploy.md) (H-002 / V2-015 gate).
- **V2-015 Development base** — [development-base-setup.md](./docs/development-base-setup.md) runbook; dev-first automation deploy; `web/.env.local.example`; prod/dev env patterns in `.env.example` and `tools/airtable/.env.example`.

#### Changed
- **DEV-first delivery pipeline** — permanent rule + canonical diagram in [v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md); Wave 2A classification active in [V2-014](./docs/v2-014-automation-modernization-roadmap.md).
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
