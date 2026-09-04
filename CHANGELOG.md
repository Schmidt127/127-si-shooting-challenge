# Changelog

Notable changes to scripts, schema documentation, Make.com blueprints, audit tools, web app, and project docs.

**Sections:** group entries under `### Airtable`, `### Web`, or `### Make` in each release.

## [Unreleased]

### Lambda

#### Changed
- **FUT-009 COMPLETE / Live Tested (2026-09-04)** — `POST /fut009/rename` CodeOnly deploy on `127si-upload-asset`: writeback omits absent Formatted Upload Name; activity date resolves from SA `Date` / VF lookup / Storage Key folder. Disposable Schmidt rename + idempotent re-run + dual S3 object proof. Automation **120** Live. Audit: [`docs/audits/FUT-009-LAMBDA-STATUS-20260904.md`](./docs/audits/FUT-009-LAMBDA-STATUS-20260904.md).

### Make

#### Changed
- **FUT-003 status audit (2026-09-04)** — Paid PaymentIntent writeback remains validated / Make inactive until Mike activation; blueprint stub committed (`EXPORT_PENDING`). No live charges. Audit: [`docs/audits/FUT-003-STRIPE-STATUS-20260904.md`](./docs/audits/FUT-003-STRIPE-STATUS-20260904.md).

### Web

#### Changed
- **FUT-025 athlete profile indexing cutover (2026-09-04)** — Production `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true` enabled (with existing program indexing flag). Redeploy `dpl_4tbg25UzYPFruga1PzQthewWswNP` READY. Public profiles with Public Profile Enabled + slug are `index, follow`; `robots.txt` no longer Disallows `/shoot/athletes/`; sitemap still omits athlete URLs. Missing profiles stay noindex (`found:false` metadata hardened). Evidence: [`docs/audits/FUT-025-indexing-cutover-20260904.md`](./docs/audits/FUT-025-indexing-cutover-20260904.md).
- **SC-149 dual-deliverable closeout (2026-09-04)** — One backlog ID, two deliverables both **COMPLETE / Live Tested in PROD**: (1) Fairfield branding — Production Vercel env MATCH for `NEXT_PUBLIC_LANDING_URL` / `SITE_URL` / `BASE_PATH`; live HTML Fairfield; zero hoop hosts; no env change/redeploy required (`dpl_4WDcPGnGK8wet8pbBX5ZobqQwqWX` @ `824062a0`); (2) Family Dashboard public navigation — PR **#358** (`29904b45`) header/mobile/footer/parent/FAQ → `/shoot/dashboard/sign-in`. FAQ Playwright lock added. MRW-E02 **COMPLETE**. Evidence: [`docs/audits/SC-149-TRUTH-LEDGER-20260904.md`](./docs/audits/SC-149-TRUTH-LEDGER-20260904.md) · [`docs/audits/SC-149-INDEPENDENT-VERIFY-20260904.md`](./docs/audits/SC-149-INDEPENDENT-VERIFY-20260904.md) · [`docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`](./docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json). **SC-109 / SC-112 / SC-151 remain closed.**
- **SC-151 Family Dashboard Gmail access (2026-09-04)** — Removed incorrect `gmail.com` / `googlemail.com` domain block from parent magic-link validation. Registered parents may request dashboard access with the exact parent email on their enrollment, including personal Gmail. Sign-in copy no longer prohibits Gmail. Enrollment match, anti-enumeration, rate limits, and token/session controls unchanged. **SC-112 remains closed.** Audit: [`docs/audits/SC-151-family-dashboard-gmail-access-20260904.md`](./docs/audits/SC-151-family-dashboard-gmail-access-20260904.md).
- **SC-109 Game Manual Production attestation (2026-09-04)** — `/shoot/game-manual` Production verified: **Open game manual** → approved Adobe Publish Online URL (repo `GAME_MANUAL_PUBLISH_URL`; optional env override). Live XP rules + level ladder present; env var name not leaked. Smoke now requires the open link (no longer accepts legacy “coming soon”). Evidence [`docs/testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json`](./docs/testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json); checklist Promoted to Production.
- **Homework late-credit display (2026-09-03)** — Late submissions remain credit-eligible once satisfactory. Public homework labels no longer say “Late — no credit”; private dashboard marks late Submission Date with “Late · full credit if satisfactory.” Past-due unfinished assignments stay pending (still eligible when graded).

#### Added
- **SC-159 trigger redesign (2026-09-04)** - Nested OR not representable in Automation UI. Recommended formula field `059 Lifecycle Trigger?`; superseded OR checklist. **Live-tested closed** same day — see Airtable Changed entry. [`docs/audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md`](./docs/audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md).
- **SEO completion — catalog/detail structured data (2026-09-04)** — BreadcrumbList + CollectionPage/WebPage JSON-LD on public catalog and detail routes; FAQ graph breadcrumbs; mobile `themeColor` / `applicationName` / `formatDetection`; footer links for Shoutouts and Articles. Supersedes stale draft PR **#310**. Athlete indexing untouched (FUT-025 / Agent 2). Status: [`docs/audits/SEO-STATUS-20260904.md`](./docs/audits/SEO-STATUS-20260904.md).
- **SC-112 multi-child parent authentication (2026-09-03)** — Session `v:2` stores server-only `selectedEnrollmentId`. One active enrollment opens `/dashboard` directly; multiple enrollments use `/dashboard/select` with opaque HMAC selection keys via `POST /api/auth/select-enrollment`. Family switcher no longer uses `?enrollmentId=rec…`. Live Active? + parent-email re-check on every load/switch. Docs: `web/docs/athlete-auth-architecture.md`.
- **SC-149 Family Dashboard navigation (2026-09-03)** — Public “Family Dashboard” entry to `/shoot/dashboard/sign-in` (Next.js `basePath`-aware) in the program header (desktop/tablet), mobile menu, footer quick links, homepage parent section, and FAQ get-started section. Outline/secondary styling stays below primary Register and Leaderboard actions. Private `/shoot/dashboard` data remains auth-gated. No Airtable, automation, email, AWS, or env-var changes.

### Airtable

#### Changed
- **SC-160 — Asset intake decoupled from Submission.Week (2026-09-04)** — Automation **009 v1.3** creates Submission Assets without requiring Week (Enrollment + attachments + slot auth still required; multi-Week fail closed). Ready/Why Not Ready formulas drop Week gate (Mike paste after 009 publish). Week-hold note on parent when Week missing. Checklist: [`docs/deploy-checklists/SC-160-009-asset-intake-decouple.md`](./docs/deploy-checklists/SC-160-009-asset-intake-decouple.md). Audit: [`docs/audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md`](./docs/audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md). **Production paste pending.**
- **SC-159 COMPLETE / Live Tested (2026-09-04)** — Live formula `059 Lifecycle Trigger?` + Automation **059 v3.8** (matches-conditions formula=1 only). Disposable award/withdraw/restore/idempotency/Perfect Week/Error soak PASS; fixtures deleted. Nested OR checklist remains superseded. FUT-002 Batch 2 trash still gated on SC-160 asset-intake review. Evidence: [`docs/audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./docs/audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md).
- **SC-159 GitHub lifecycle prep (2026-09-04, historical)** — GitHub **059 v3.8** + Trigger Context / `lifecycleOut`; nested OR checklist later superseded by formula design. Live paste + soak closed same day under SC-159 COMPLETE entry above. Agent-3 proof: [`docs/audits/SF-08-059-LIFECYCLE-CLOSEOUT-20260904.md`](./docs/audits/SF-08-059-LIFECYCLE-CLOSEOUT-20260904.md).
- **SC-156 COMPLETE / Live Tested (2026-09-04)** — Production 070a **v4.7** published script-only (obsolete post-script Update clearing **Send to Make Trigger** removed). Skip/idempotency PASS; independent graph verify PASS. Evidence: [`docs/audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md`](./docs/audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md).
- **SC-153 COMPLETE / Live Tested (2026-09-04)** — Production 058 **v1.7** withdraw/restore/idempotency PASS (Coach Note QueryResult defect closed). Evidence: [`docs/audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md`](./docs/audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md).
- **SC-147 / Automation 101 v6.8 Production closeout (2026-09-04)** — Production already Live on **101 v6.8** with SC-147 recording half-XP (`processRecordingCreditsForMeeting`; Source Key `ZOOM_RECORDING_CREDIT|*`). **Did not paste repo v6.7** (would downgrade). GitHub script synced to Production v6.8. Disposable VERIFY re-attestation: recording XP `rec9N4T9SD8XmllzB` @ **30**; live `recKpZVNbttUqgrdh` @ **60**; idempotent recording re-run (Needed→0, no duplicate); dual-enrollment pollution cleaned on Schmidt VERIFY rows; both meetings Needed?=0. **No Automation 121.** 117 untouched. Evidence: [`docs/audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./docs/audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md) · [`docs/testing/evidence/SC-147-20260904/production-attestation.json`](./docs/testing/evidence/SC-147-20260904/production-attestation.json).
- **Homework late-credit policy (2026-09-03)** — **020 v3.9**, **065 v10.6**, **057 v2.3→2.4 Live**: late satisfactory homework earns full `HOMEWORK_XP|{hcId}` credit; timing status `late` is recorded for reporting; Perfect Week homework counts require on-time Submission Date (PHA Due Date → Week End Date fallback). Contract tests: `tests/automation-contracts/065-homework-late-credit-policy.test.js`. Operator checklist: [`docs/deploy-checklists/homework-late-credit-policy-020-057-065.md`](./docs/deploy-checklists/homework-late-credit-policy-020-057-065.md). **Production Automations Code PASTE-ALIGNED**; **disposable late-HW / Perfect Week exclusion live proof COMPLETE 2026-09-04** — [`docs/audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md`](./docs/audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md). **Do not paste from agents.**
- **Automation 003 v2.0 — COMPLETE / PRODUCTION-VERIFIED / DO-NOT-TOUCH (2026-09-03, SC-023)** — Documented Production grade-change Grade Band refresh (enabled; refresh-view conditions; dynamic `recordId`; disposable VERIFY Enrollment succeeded). **Keep active** — not an unused slot; initial assign remains **002**. No Production script/formula/behavior change this session. Offline regression: `tests/enrollment-intake/automation-003-grade-change-refresh.test.js`. Closeout: [`docs/prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./docs/prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md).

### Docs

#### Added
- **Final completion program closeout (2026-09-04)** — SF-07/SC-158 retire 006; SF-08/SC-159 059 v3.8 GitHub (Mike paste); FUT-001 late-credit live proof; FUT-009 Lambda Live; FUT-003 Make-gated; drafts #353/#335/#244 disposed; FUT-002 Batch 2 quarantine renames. [docs/audits/FINAL-COMPLETION-PROGRAM-CLOSEOUT-20260904.md](./docs/audits/FINAL-COMPLETION-PROGRAM-CLOSEOUT-20260904.md).
- **Functional-closeout coordinator wave (2026-09-04)** — Three parallel worktree agents (A1 backlog truth, A2 PR #340 forensic, A3 live risk verify). Wave-blocking P0 **NONE**; SC-154/155/157 remain closed; PR **#340** leave CLOSED superseded. Reports: [`docs/audits/COORD-WAVE-FUNCTIONAL-CLOSEOUT-20260904.md`](./docs/audits/COORD-WAVE-FUNCTIONAL-CLOSEOUT-20260904.md) · A1/A2/A3 COORD-WAVE audits. Superseded draft PRs **#234/#237/#238/#262/#307/#316** closed without merge.
- **SC-152–157 SF remediation wave closeout (2026-09-04)** — [`docs/audits/SC-152-157-COORDINATOR-WAVE-CLOSEOUT-20260904.md`](./docs/audits/SC-152-157-COORDINATOR-WAVE-CLOSEOUT-20260904.md). PR **#340** closed (SC-157).
- **SEO status 2026-09-04** — Authoritative SEO audit + PR #310 disposition: [`docs/audits/SEO-STATUS-20260904.md`](./docs/audits/SEO-STATUS-20260904.md).

#### Changed
- **SF-01/SF-02 corrected to required** — Not optional; tracked as SC-152/SC-153 with GitHub remediation merged PR **#406**.
- **FUT-025 Production cutover closeout (2026-09-04)** — Master Future Work List + deploy checklist marked COMPLETE / Live Tested after Production env enable + verify. Audit + evidence JSON committed.
- **SC-057 / SC-058 workflow reliability (2026-09-04)** — Live MCP attestation of **50** Production automations (triggers + selective Versions). Authoritative inventory [`docs/audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./docs/audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md); silent-failure remediation [`docs/audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md`](./docs/audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md); attestation [`docs/audits/SC-057-058-LIVE-ATTESTATION-20260904.md`](./docs/audits/SC-057-058-LIVE-ATTESTATION-20260904.md). SC-057 → Complete (no duplicate writers live); SC-058 → Live Tested in PROD. Residual SF-01/SF-02 remediations = **SC-152/SC-153**. Narrow test: `tests/automation-contracts/sc-057-058-workflow-reliability-attestation.test.js`. No 101 paste; no Season Sim; no field deletion.
- **SC-149 dual-deliverable closeout (2026-09-04)** — Living docs + checklist + MRW-E02 marked COMPLETE for Fairfield branding env and Family Dashboard public nav. Truth ledger + independent verify evidence committed. Env MATCH regression helper: `tools/testing/sc-149-vercel-env-match.mjs`.
- **SC-151 Production closeout (2026-09-04)** — PR **#389** merged `a00ef7a5`; Production `dpl_2mch4scL3c6bgHZgizDbsqPTywbW`. Smoke: `/shoot/dashboard/sign-in` shows registration-email instruction; personal-Gmail prohibition gone. **SC-112 remains closed.** [`docs/audits/SC-151-family-dashboard-gmail-access-20260904.md`](./docs/audits/SC-151-family-dashboard-gmail-access-20260904.md).
- **SC-112 finalization coord (Agent 4, 2026-09-03)** — Post-merge accuracy after **#381**/**#382**/**#383**: tip SHA **`9a68281e`**; magic-link **works**; multi-child **PARTIAL / NEEDS-MIKE**; Public On Web **MERGED** (#378); Email Live checklist **#377** MERGED; Season Sim **NOT authorized** with normal `NOW()`/`TODAY()`; 003/067 **COMPLETE + DO-NOT-TOUCH**; archived Remove/Archive-class Season Sim helpers to `tools/season_simulation/_archive/session-20260903/` (Required class preserved). [`docs/audits/SC-112-finalization-closeout-20260903.md`](./docs/audits/SC-112-finalization-closeout-20260903.md).
- **SC-112 finalization closeout (Agent 4, 2026-09-03)** — Evidence-backed status board + untracked Season Sim hygiene classification. Corrected stale tip SHA, homework late-credit paste status, Automation **067** Live **v3.5** DO-NOT-TOUCH, public awards pending **#378** (supersedes **#376**), Season Sim **NOT authorized** with normal `NOW()`/`TODAY()` formulas, communications **#50** CLOSED not merged. No Season Sim run; 003/067 untouched. [`docs/audits/SC-112-finalization-closeout-20260903.md`](./docs/audits/SC-112-finalization-closeout-20260903.md) · [`docs/audits/SC-112-untracked-hygiene-classification-20260903.md`](./docs/audits/SC-112-untracked-hygiene-classification-20260903.md).
- **Parent-email Live cutover audit (2026-09-03)** — Expanded operator checklist [`docs/deploy-checklists/parent-email-live-cutover-2026-09-02.md`](./docs/deploy-checklists/parent-email-live-cutover-2026-09-02.md) (10-section Mike packet: versions, inputs, test/Live modes, verification order, Hub/Resend checks, duplicate protection, rollback, Make/Gmail OFF, disposable recipient rule). New contract tests: `tests/email/parent-email-live-cutover-contract.test.mjs`. Stale version fixes: **073 v4.6**, **074 v3.5** in email tests; **071/072/073/074/076** rows in `AUTOMATION_VERSION_INVENTORY.md`. **078A v1.5** on branch PR **#350** (open, not merged); default `testMode` true until Mike sets Live inputs in Automations UI.
- **SC-SEASON-SIM-002 final controlled execute + restore (2026-09-02)** — Run `SEASON-SIM-2027-20260902T213135Z-athlete1` completed (writer complete after one idempotent resume). Verified cascade: 58 countable / 13,906 shots; Submission Base XP 58; streak XP + 17 Streak Occurrences; Zoom live 60 + recording 30; 6 WEEKLY handoffs Accepted/Hub sent to disposable allowlist only; Perfect Week Eligible=0 (expected). Restored Production formulas (`Activity Date Is Future?` NOW()-only; `Submitted Same Day?` / `Perfect Week Grace Eligible?` rollbacks). Registry + XP/email extras cleaned. No 101 / SC-147 / 117 / 121 changes.
- **SC-SEASON-SIM-002 Season Sim date gate (2026-09-02)** — **010 v10.13**, **114 v6.2**, **073 v4.6**: dual gate (`Season Sim Test Record?` + `Video Upload Note` contains `SEASON-SIM|`) uses `Season Sim Clock Now` as “today” for Activity Date eligibility; ordinary rows keep wall-clock Denver. Paste packet [`docs/deploy-checklists/SC-SEASON-SIM-002-automation-paste-010-114.md`](./docs/deploy-checklists/SC-SEASON-SIM-002-automation-paste-010-114.md). **Production paste pending.** No 101 / SC-147 / 117 / 121 changes.

### Tools

#### Changed
- **SC-SEASON-SIM-002 writer streak / PW / weekly arms (2026-09-02)** — Retains the orchestration that made final run `…T213135Z…` succeed (ran from **local** code ahead of `origin/master`; merge required before any future execute): (1) after formulas settle, Enrollment clear→restore streak arm for 053; (2) post-day Perfect Week Status `Skipped`→`Pending` requeue for 057 (REST plain strings, not `{name:…}`); (3) weekly Build arm after the day loop; (4) never write computed fields (`Submission Stat Mode`, `Reviewer File URL`, etc.). Idempotent resume preserved. Offline tests cover each arm. **No second Production execute in this closeout.**
- **SC-SEASON-SIM-002 full cascade fix (2026-09-02)** — Cleaned failed run `SEASON-SIM-2027-20260902T171918Z-athlete1` (121 registry + 11 XP + 2 handoffs; Attendees reverse). Writer: HC `Submission Date`, WAS Grade Band at create, disposable 2027 Zoom Meetings (registry-deletable), VF Grade Band + Feedback Posted? arm. Hub Test Allowlist row for `schmidt@fairfieldbasketballclub.com`. Offline tests 114 green; preflight/dry-run OK. **No new Production execute; no emails sent during fix.** Temporary formulas remain.
- **SC-SEASON-SIM-002 final readiness / same-day audit (2026-09-02)** — Audited live `Submitted At` (`CREATED_TIME()`), `Submitted Same Day?`, and `Perfect Week Grace Eligible?`: without temporary Season Sim gates, May–June 2027 sim rows fail same-day / Perfect Week when run before 2027. Added `same_day_contracts.py` paste/rollback packets, operator checklist, preflight `sufficient_for_same_day_perfect_week`, Week 9 zero-HW + Early Bird out-of-window scenario meta, expanded tests. **No live execute / no Production formula paste / no SC-147/101/117 changes.**
- **SC-SEASON-SIM-002 finish execute orchestration (2026-09-02)** — `run_execute` no longer aborts after Athlete create. Full idempotent orchestrator creates Athlete, Enrollment (PI + 2026-2027 SY + 9-12), WAS per window week, Submissions with Season Sim gates, Submission Assets, Homework Completions (18 PHAs), Video Feedback, disposable Live+Recording Zoom Meetings, Zoom Attendance (live Attendees vs recording quiz never Attendees). Email OFF by default (optional allowlist phase). Resume via run registry; pause on failure. Offline tests: 44. **No live execute / no Production writes / no formula changes.**
- **SC-SEASON-SIM-002 writer Season Sim gate fields (2026-09-02)** — Simulation Submissions from `build_intended_writes` now set `Season Sim Test Record?=true`, `Season Sim Clock Now` (write-day simulated now), `Season Sim Test Submitted At` (same-day vs backdated), and retain `Video Upload Note` `SEASON-SIM|<run_id>`. New `writer.py` + `test_writer.py`; preflight `EXECUTE_SETS_SEASON_SIM_GATES` flips so `sufficient_for_final_run` can pass when the live gate is active. **No execute / no Production writes / no formula changes.**
- **SC-SEASON-SIM-002 preflight detection fix (2026-09-02)** — PHA count no longer uses `first_link(Grade Band)` (missed all 18 multi-band Production rows where K-2 is first and 9-12 is later). Matches `grade_band_id in linked_ids`. Clock blockers are live meta inspection of `Activity Date Is Future?` (detects Season Sim gate vs NOW()-only) instead of a static NOW() warning. Offline tests cover multi-band match + formula inspect. **Read-only preflight only; no execute / no Airtable writes.**
- **SC-SEASON-SIM-002 full execute writer (2026-09-02)** — Replaced athlete-create stub with idempotent `writer.py`: Athlete, Enrollment (+ Program Instance / School Year), WAS, Submissions (2027 Activity Dates + Count It), Submission Assets, Homework Completions, Video Feedback, Zoom Attendance (Live vs Recording Quiz), live-only `Zoom Meetings.Attendees` patch. Resume via run registry dedupe keys; pause on failure; cleanup registry-scoped (+ reverse Attendees). Email off by default. Offline tests: `test_offline` + `test_writer` (55). **No Production write, paste, or live run.** Operator checklist unchanged for gated `Activity Date Is Future?` formula.
- **SC-SEASON-SIM-002 clock override readiness (2026-09-02)** — Gated simulation clock package so May–June 2027 Activity Dates can count on disposable VERIFY rows without weakening Production `NOW()` for normal athletes. Adds `clock_override.py`, `season_policy.py`, multi-gate CLI (`--simulation-id`, `--confirm-disposable`, `--confirm-cleanup`, `--acknowledge-clock-override`), evidence export, expanded offline tests, operator checklist [`docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md`](./docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md). Root blocker: live `Activity Date Is Future?` uses `NOW()` → `Count This Submission?=0`. `CREATED_TIME()` cannot be backdated. **No live simulation run; no SC-147 / 101 changes.**

### Airtable

#### Added
- **101 v6.7 — SC-147 Recorded Zoom half-XP extension (2026-09-02)** — Recording half-XP merged into `101-zoom-attendance-xp-award-meeting-xp.js` (no slot 121 — automation capacity full). Source Key `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`. **NOT Live** — Production paste packet [`docs/deploy-checklists/101-v6.7-sc-147-operator-packet.md`](./docs/deploy-checklists/101-v6.7-sc-147-operator-packet.md); OMNI reconciliation trigger review [`SC-147-omni-reconciliation-trigger-review.md`](./docs/deploy-checklists/SC-147-omni-reconciliation-trigger-review.md). PR **#338** merged `49098217`. Supersedes prior slot-121 plan; design artifact: `drafts/sc-147-slot-121-design-artifact-not-production.js`. **117 unchanged (email-only).** No DEV base — disposable Production verification only.
- **Post-FUT-030 live verify matrix (2026-09-02)** — `tools/testing/post-fut030-verify-matrix.mjs` for disposable MRW-F05/F06/F07 checks on empty base.

### Web

#### Added
- **SC-112 authenticated athlete dashboard (2026-09-03)** — Private family dashboard at `/shoot/dashboard` when `ATHLETE_AUTH_ENABLED=true`: live Airtable panels for enrollment, homework (secure reviewer links), video feedback, filterable XP activity, weekly progress, awards, and season overview. Session-scoped `athlete_session`; URL `enrollmentId` only when in session allowlist. Coming-soon placeholder when auth disabled.

#### Fixed
- **SC-112 public profile homework privacy (2026-09-03)** — Public athlete profiles no longer serialize coach feedback or Lambda reviewer file URLs (`?token=`). Public Airtable homework queries also stop requesting those private fields. Homework completion status and XP remain public; file links and coach notes stay on the authenticated family dashboard. Aligns with `web/docs/public-data-rules.md`.
- **SC-112 magic-link verify redirect (2026-09-03)** — Production `GET /shoot/api/auth/verify` returned 500 because Next.js route handlers require absolute redirect URLs; success and error paths now redirect to `/shoot/dashboard` and `/shoot/dashboard/sign-in` without leaking the token query param. Production token store fails closed without Upstash Redis (in-memory cannot share tokens across serverless invocations). Tests: `verify-route.test.ts`, `redirect-url.test.ts`, extended `auth.test.ts`.

#### Changed
- **SC-112 dashboard privacy gate (2026-09-03)** — `/dashboard` shows coming-soon copy only (no mock/live athlete data; `enrollmentId`/`slug` query params ignored). `/dashboard/preview` blocked in production unless `SITE_ACCESS_TOKEN` staff gate or local dev; visitor errors are parent-friendly with diagnostics server-side only. Tests: `dashboard-privacy.spec.ts`, updated production smoke.
- **FUT-008 video display filename (2026-09-01)** — Game Log and XP activity presentation use `web/lib/video-display-filename.ts` (mirror of `lib/video-display-filename/`). Exposes `videoDisplayFileName` plus raw `videoCustomFileName` / `videoOriginalFileName` on XP rows. No URL, S3, or playback changes.

### Airtable

#### Added
- **FUT-008 — Custom Video File Name display wiring (2026-09-01)** — Shared resolver at `lib/video-display-filename/` (custom → Video Asset File Name → "Video submission"; trims whitespace; treats em dash as blank). **072 v4.9.1** preserves `customVideoFileName` + `originalFileName` in weekly video payload and applies resolver to legacy video lines. **073 v4.5** adds `customVideoFileName`, `originalFileName`, and `displayFileName` to Video Feedback Hub payload. **074 v3.5** applies resolver to `videoFeedbackStatus` summary text. Display is independent of S3 rename completion. **No S3 key/URL, schema, XP, Perfect Week, or upload behavior changes.** Production paste pending for 072/073/074.
- **120 v1.0 — Automatic FUT-009 S3 video rename (2026-09-01)** — Automation **120** triggers when coach checks **Confirm S3 Video Rename** on Video Feedback; calls Lambda `POST /fut009/rename` (CopyObject + verified Airtable writeback). CLI remains recovery/backfill only. Paste packet: [`docs/deploy-checklists/120-v1.0-fut009-s3-video-rename-paste-packet.md`](./docs/deploy-checklists/120-v1.0-fut009-s3-video-rename-paste-packet.md). **Production paste pending.**
- **072 v4.9 / 074 v3.4 — Weekly summary `videosSubmittedThisWeek` payload (2026-09-01)** — Active Video Feedback rows for the official WAS Week now populate Hub field `videosSubmittedThisWeek` with Denver `activityDate` (YYYY-MM-DD) and display filename (Custom Video File Name → Video Asset File Name). Deterministic oldest-first sort; dedupe by VF record id; empty list when none. **Production paste pending.**

### Lambda

#### Added
- **FUT-009 — Automatic post-feedback S3 video rename (2026-09-01)** — Lambda route `POST /fut009/rename` (`upload_core/fut009_service.py`) reuses copy-on-write worker. Automation **120** is the normal Production path; CLI is recovery only. Old S3 objects retained. **No Production Lambda deploy yet.**
- **FUT-009 — Safe post-feedback S3 video rename worker (2026-09-01)** — Copy-on-write rename at `lambda/upload-asset/upload_core/fut009_rename.py` with Option D destination keys. Dual-prefix Storage Key validation aligns FUT-010 with grandfathered Gen B keys.
- **FUT-007 AWS media naming — Phase 3 prep (2026-09-01)** — `lambda/upload-asset/upload_core/fut007_basename.py` implements FUT-007 basename grammar (sanitize, category, custom segment, collision suffix) mirroring `lib/aws-media-naming/`. Integrated behind `USE_FUT007_BASENAME` env flag / `FUT007_BASENAME_ENABLED` constant (default **off**) in `storage_key.py`. Tests: `tests/test_fut007_basename.py` (28 pytest cases). **No Production deploy; flag not enabled.**

### Docs

#### Added
- **FUT-009 promotion checklist (2026-09-01)** — [`docs/deploy-checklists/FUT-009-aws-storage-rename.md`](./docs/deploy-checklists/FUT-009-aws-storage-rename.md): coach confirmation, CopyObject workflow, failure recovery, PKG-004 audit fields, controlled Production test steps.
- **Full parent/athlete email redesign — production closeout (2026-09-01)** — Communications Hub PR [#46](https://github.com/Schmidt127/communications/pull/46) merged (`ffa97bf`); SC PR [#334](https://github.com/Schmidt127/127-si-shooting-challenge/pull/334) merged (`bf40c9cf`). Vercel production deploy success at `communications-two-blue.vercel.app`. Post-deploy render verification pass for all four templates; live `testMode` ingest pending Mike credential check. Checklist: [`docs/deploy-checklists/sc-parent-athlete-email-redesign-2026-09-01.md`](./docs/deploy-checklists/sc-parent-athlete-email-redesign-2026-09-01.md). **Automations 071/076 not re-pasted.**
 — Async **12-decision** worksheet for Mike (config ownership, 2026–27 defaults, gates, Perfect Week + Zoom, web UX, email, intake, mid-season toggle, PKG-004 naming). Worksheet: [`docs/next-wave/config-selection/FUT-038-MIKE-DECISION-WORKSHEET.md`](./docs/next-wave/config-selection/FUT-038-MIKE-DECISION-WORKSHEET.md). Brief §11 pointer added. **No schema, automation, web, or email implementation.**
- **Email + SC-147 paste operator packets (2026-09-01)** — Operator docs: [`071-v4.3-homework-feedback-paste-packet.md`](./docs/deploy-checklists/071-v4.3-homework-feedback-paste-packet.md), [`076-v8.12-daily-submission-paste-packet.md`](./docs/deploy-checklists/076-v8.12-daily-submission-paste-packet.md), [`SC-147-zoom-recording-half-xp.md`](./docs/deploy-checklists/SC-147-zoom-recording-half-xp.md) (SC-147 design pending — **not** a Production automation), index [`EMAIL-PASTE-QUEUE-2026-09.md`](./docs/deploy-checklists/EMAIL-PASTE-QUEUE-2026-09.md). **071 v4.3** and **076 v8.12** **Production complete** (Mike, 2026-09-01). **SC-147** slot not assigned — do not paste.
- **FUT-039 Fillout copy pack + CSS polish (2026-09-01)** — Paste-ready confirmation copy for registration, daily, and edit forms; theme header strings; F-ATT-05 attestation table. Expanded CSS: field borders `#C4C4C4`, white inputs, 16px mobile inputs, secondary/back/skip buttons, Stripe-safe payment selectors. Copy pack: [`docs/next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md`](./docs/next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md). Checklist updated with paste order + copy-pack links. **Docs/CSS only — Mike pastes in Fillout UI.**
- **FUT-039 Fillout CSS — official selectors only (2026-09-01)** — Rewrote [`fillout-theme-sc-2026.css`](./docs/next-wave/fillout/fillout-theme-sc-2026.css) to use documented Fillout classes only; added [`FILLOUT-OFFICIAL-CSS-SELECTORS.md`](./docs/next-wave/fillout/FILLOUT-OFFICIAL-CSS-SELECTORS.md). Stripe payment styling via Theme editor / payment page settings, not undocumented classes.
- **FUT-006 MRW-F07 WE-06 writeback proof harness (2026-09-01)** — Extended MRW-F07 with read-only **WE-06** stage: `--verify-writeback` mode, `fetchWasWritebackFields` / contract diff helpers, offline tests `test_mrw_f07_was_writeback_contract.mjs`. Verifies Hub accept (`Hub Event ID` set, Sent? false) and Resend success (Sent?, timestamps, Status Sent, Error cleared) per `WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1`. Harness never PATCHes writeback fields. Docs: [`MRW-F07-POSITIVE-ARM-HARNESS.md`](./docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md); checklist cross-link in [`FUT-006-weekly-was-hub-writeback.md`](./docs/deploy-checklists/FUT-006-weekly-was-hub-writeback.md).
- **FUT-002 batch 2 field inventory audit (2026-09-01)** — Audit-only (no deletes): **303** batch-2 candidates from SNAPSHOT DATE **2026-08-31** inventory; **5** quarantine-ready text stubs (Athlete Achievement Unlocks + Shot Milestones + Video Feedback `XP Events copy` stubs; Weeks `Video Feedback` + `Submission Assets` text stubs). Operator packet: [`docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md`](./docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md). Queue: [`docs/audits/FUT-002-batch2-candidate-queue.md`](./docs/audits/FUT-002-batch2-candidate-queue.md). Tool: `tools/airtable/fut_002_batch2_candidates.py`. Mike UI delete pending.
- **FUT-009 AWS storage structure and corrected-video rename architecture brief (2026-09-01)** — Phase 2 only: current key inventory (Gen A/B/C), FUT-007 basename vs prefix relationship, folder layout options, copy-on-write rename workflow (Reviewer URL stability), headshot path placeholder (FUT-040), retention/lifecycle, Phase 3 slices, test matrix, PKG-004 gate, 12 open decisions. Brief: [`docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md`](./docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md). Cross-links in [`FUT-007-AWS-MEDIA-NAMING-SPEC.md`](./docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md) and [`FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md`](./docs/next-wave/s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md). **No bucket changes, Lambda deploy, S3 apply, or Airtable paste.**
- **FUT-006 Weekly Athlete Summary Hub → Resend source writeback (2026-09-01)** — Hub repo implements `source-writeback-weekly-summary.js` (WAS `Weekly Email Sent?`, `Sent At`, `Weekly Summary Sent At`, `Weekly Summary Email Status`, `Weekly Email Error`, `Hub Event ID`). **074/079 still do not write Sent?** Promotion checklist: [`docs/deploy-checklists/FUT-006-weekly-was-hub-writeback.md`](./docs/deploy-checklists/FUT-006-weekly-was-hub-writeback.md). Hub contract: `communications/docs/contracts/WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1.md`. **Built in repo — Hub deploy on merge.**
- **FUT-007 AWS media naming spec (2026-09-01)** — Phase 2 only: canonical basename grammar (`YYYYMMDD_{HW|VIDEO|HEADSHOT}_{Last}_{First}_{Custom}`), sanitization, collision handling, missing-field fallbacks, S3 key relationship, integration points, acceptance criteria + test matrix. Spec: [`docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md`](./docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md). Promotion checklist: [`docs/deploy-checklists/FUT-007-aws-media-naming.md`](./docs/deploy-checklists/FUT-007-aws-media-naming.md). Prep helpers: [`lib/aws-media-naming/`](./lib/aws-media-naming/). **No Lambda deploy, no S3 changes.**
- **FUT-040 automatic S3 migration architecture brief (2026-09-01)** — Phase 2 only: orchestrator vs FUT-010 worker, HW/video/headshot scope, pipeline stages, verification gates, status/audit field proposals, headshot source options, Lambda applicability, Phase 3 slices, test matrix, PKG-004 gate. Brief: [`docs/next-wave/s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md`](./docs/next-wave/s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md). Cross-link in [`FUT-010-intake-attachment-cleanup.md`](./docs/deploy-checklists/FUT-010-intake-attachment-cleanup.md). **No orchestration code, schema, AWS apply, or Airtable paste.**
- **FUT-039 Fillout branding — Mike decisions + Phase 3 checklist (2026-09-01)** — Locked 12 decisions (Option A shared theme, repo CSS, `web/public/brand/` logos, v1 trio, custom-domain edit URL `shoot-editsubmission`, per-form theme assignment, branding before FUT-003). Checklist: [`docs/deploy-checklists/FUT-039-fillout-branding.md`](./docs/deploy-checklists/FUT-039-fillout-branding.md). CSS stub: [`docs/next-wave/fillout/fillout-theme-sc-2026.css`](./docs/next-wave/fillout/fillout-theme-sc-2026.css). **Mike applies in Fillout UI — not live yet.**
- **FUT-038 global category on/off architecture brief (2026-09-01)** — Phase 2 only: config ownership options, consumer inventory, gate-adjustment algorithm, web UX choices, Homework on/off test matrix, Phase 3 slices, PKG-004 gate note. Brief: [`docs/next-wave/config-selection/FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md`](./docs/next-wave/config-selection/FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md). Updated [`CONFIG-CONSUMER-INVENTORY.md`](./docs/next-wave/config-selection/CONFIG-CONSUMER-INVENTORY.md) § G. **No schema, automation, web, or email implementation.**

### Airtable

#### Changed
- **FUT-041 + FUT-046 + FUT-047 email bundle (2026-09-01)** — PR **#321** merged `66f8c40b`;
  Communications Hub PR **#43** merged `504a3ed` (Hub live). Vercel Production `66f8c40b`.
  - **FUT-041** — **076 v8.12** + Hub daily submission **XP Earned** | **Extra Credit** columns.
  - **FUT-046** — Hub homework subject + **071 v4.3** payload (`assignmentTitle`, athlete first/last).
  - **FUT-047** — Hub homework feedback monitored contact copy (no automation paste).
  **Production complete (Mike, 2026-09-01):** **071 v4.3** and **076 v8.12** pasted Live. Paste queue empty — do not re-paste.

#### Added
- **SC-147 Recorded Zoom half-XP — repo prep only (2026-09-01, MRW-H10)** — Placeholder filename
  `147-zoom-recording-credit-award-half-xp.js` and offline tests in repo. **Not Live** — automation slot
  **not assigned**; **do not paste**. Design pending: [`docs/deploy-checklists/SC-147-zoom-recording-half-xp.md`](./docs/deploy-checklists/SC-147-zoom-recording-half-xp.md).
- **065 v10.5 XP points reconcile fix (2026-08-31)** — Ownership assert no longer requires existing `XP Points` to already equal `Total Homework XP Awarded`. Partial Extra Credit awards can reconcile when Base XP is written later (updates the same `HOMEWORK_XP|{hcId}` row + Awarded). **Mike Production paste + verify COMPLETE** — Parent Feedback Sent? checked and Sent On correct after run. Packet: [`docs/deploy-checklists/065-v10.5-points-reconcile-operator-packet.md`](./docs/deploy-checklists/065-v10.5-points-reconcile-operator-packet.md) · paste [`docs/deploy-checklists/065-v10.5-PASTE.txt`](./docs/deploy-checklists/065-v10.5-PASTE.txt).
- **FUT-032 Homework Hub → Resend source writeback (2026-08-31)** — Production Homework Completions gained Video-parity fields: `Parent Feedback Delivery Status`, `Delivery Error`, `Hub Event ID`, `Resend Message ID`. Hub writes `Parent Feedback Sent?` / `Sent On` after Resend (071 still does not). Checklist: [`docs/deploy-checklists/FUT-032-homework-hub-resend-writeback.md`](./docs/deploy-checklists/FUT-032-homework-hub-resend-writeback.md). **COMPLETE** — Mike verified Sent? + Sent On live 2026-08-31 (same session as **065 v10.5**).
- **FUT-002 Submission Assets XP text stubs deleted (2026-08-31)** — Mike UI-deleted unused single-line text fields `XP Events` (`fldwOklyDaW3nN2Kz`) and `XP Events copy` (`fld5Emwipb3UjAMz9`) on **Submission Assets**. Not real XP link fields; homework XP remains HC ↔ XP Events (065). Live verify: both IDs absent; SA **90** fields; base **1363** fields / **35** tables. Packet: [`docs/deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md`](./docs/deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md). Evidence: [`docs/testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](./docs/testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json).
- **FUT-030 transactional record reset COMPLETE (2026-08-31)** — Mike-authorized full wipe of athlete/enrollment/submission/XP/award-recipient/payment/comms transaction records (**959** deleted across 16 tables). **Record reset only** — 33 tables / field IDs unchanged. Preserved: Weeks (13, Early Bird + 1–9 + Post-Challenge), Config (4), Program Instance (3), Homework Library (76), XP Reward Rules (31), Achievements (15), Automations (49; **075** absent), curriculum catalogs. **PHA:** initially wiped then **18 active restored** same day (new RIDs; Due Date 2027-06-29) — [`docs/testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json`](./docs/testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json). No external sends. Evidence: [`docs/testing/evidence/transactional-reset-2026-08-31/`](./docs/testing/evidence/transactional-reset-2026-08-31/). Tool: `tools/airtable/transactional_record_reset.py` + `restore_pha_18.py`.
- **FUT-002 batch-1 field deletes COMPLETE (2026-08-31)** — Mike UI-deleted all five `ZZZ DELETE —` fields. Live verify: IDs absent, **0** ZZZ remaining, **1350** fields / 33 tables. Schema: `airtable/schema/snapshots/prod-20260831-fut002-batch1/`. Evidence: [`docs/testing/evidence/fut-002/batch1-live-verify.json`](./docs/testing/evidence/fut-002/batch1-live-verify.json). Docs closeout only after deletes — **no new `--apply`**, no new test records, no other field/automation changes. Later FUT-002 batches remain FUTURE.
- **PR #312 multi-asset homework closeout (2026-08-31)** — Merged to `master` (`f8a7365f`). Marks **SC-015** / **SC-016** / **MRW-F02** COMPLETE: live 020 multi-asset `--apply` → one HC; 065 dynamic `recordId` + trigger re-entry; exactly one `HOMEWORK_XP|rec8E94Jg7mpmuMW9` (35 XP, Awarded, Reconcile=0, no duplicate). **Do not repaste 065.** Paste queue empty for 010/020/022/057/065/072/073; **075** remains retired. Distinguish: live Airtable activity (field deletes + disposable multi-asset test) occurred earlier in the workstream; this docs package refreshes evidence only.
- **FUT-029 Hybrid Fillout Homework (design only, 2026-08-31)** — Long-term enhancement **MRW-H12**: Library 70→100+, optional Fillout answers + paper/photo/video, same HC/XP spine, preserve 18 PHA and 020/033/064/065/071. Requested as FUT-018 (ID already used for landing pages). Brief: [`docs/next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md`](./docs/next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md). **No forms, schema, or automation changes.**
- **MRW-F11 core workflow reliability (2026-08-30)** — Season calendar + homework/XP
  contracts (`lib/workflow-contracts/`), live Weeks/PHA audit harness
  (`tools/testing/sc-core-workflow.mjs`), offline tests, evidence under
  `docs/testing/core-workflow/`. Confirmed rules: Early Bird 2027-04-25…05-01 countable,
  Week 1 starts 2027-05-02, Week 9 no homework, 18 active PHA due 2027-06-29, Submission XP
  once per Count It submission (**MRW-I13 closed**). Deleted inactive orphan PHA
  `recpHX3stQ8YBVtLi`. No automation paste; 075 remains retired.
- **SC-MULTI-ASSET-HW live validation (2026-08-30 → closeout 2026-08-31)** — Disposable Testing3 Early Bird:
  two Submission Assets same HW1 slot → one HC via live **020** (identity + isolation +
  missing-PHA fail-safe PASS). **064** armed XP amounts. Live **065** required (1) dynamic
  `recordId` remap from hardcoded `reccYReUfSId2MH1S` and (2) **trigger re-entry** after remap
  for HC stuck at Reconcile=1. Exactly one `HOMEWORK_XP|rec8E94Jg7mpmuMW9` =
  `recwpzl8pkXecUqRK` (35 XP, Awarded, **no duplicate**). **Do not repaste 065.**
  Packet: [`docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](./docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md).
  Evidence: [`docs/testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json`](./docs/testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json);
  results: `docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`. Runbook:
  [`docs/testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](./docs/testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md).
  Harness: `tools/testing/sc-multi-asset-homework.mjs`.
- **SC-SEASON-SIM-002 preflight package (2026-08-30, PR #302)** — `tools/season_simulation/`
  with offline unittest (21), gated execute/cleanup, Agent 4 suite wiring. **No full season
  simulation run.** Live 057 verified correct — do not repaste.
- **FUT-002 live cleanup (2026-08-30, PR #303)** — Live inventory 1355 fields; quarantined 5
  obsolete fields (`ZZZ DELETE`); retargeted Submission Assets Asset Key. Physical deletes
  completed 2026-08-31 (see batch-1 COMPLETE entry above).
  Evidence: `docs/audits/field-inventory/`, `docs/audits/FUT-002-cleanup-session-2026-08-30.md`.

- **SC-147 Recorded Zoom half-XP repo prep (2026-08-30, MRW-H10)** — Offline conflict
  matrix + pure helpers (`lib/sc-147-zoom-recording-credit.js`), contract tests, and
  automation **DRAFT** `drafts/sc-147-zoom-recording-half-xp.js` (slot TBD — not Live).
  Covers `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}` idempotency, live **101**
  exclusivity, `ZOOM_RECORDING` XP Reward Rules contract, **117** email-only scope boundary,
  and Perfect Week recording-only exclusion. Design brief updated; wired into
  `run-agent4-suite.js`. No Production paste.
- **FUT-010 Production dry-run evidence (2026-08-30, MRW-C10)** — Read-only preflight,
  dry-run (`--limit 50`), and reconcile (`--limit 100`) against Production Submission Assets.
  Zero eligible rows; fail-closed verification blocked all candidates (legacy Storage Key format,
  missing Canonical URL). No `--confirm-delete` or attachment writes. Evidence:
  [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30.md`](./docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30.md);
  JSON previews under `tools/airtable/_preview/fut-010-*-2026-08-30.json`.
- **FUT-002 unused field inventory audit (2026-08-30, MRW-H01)** — Read-only scan of prod
  `prod-20260819` schema snapshot (1347 fields) + repo grep (automations, web, tools). Deliverables:
  [`docs/audits/FUT-002-unused-field-inventory-2026-08-30.md`](./docs/audits/FUT-002-unused-field-inventory-2026-08-30.md),
  [`docs/audits/fut-002-unused-field-inventory.json`](./docs/audits/fut-002-unused-field-inventory.json),
  `tools/airtable/fut_002_field_inventory.py`. Initial audit had **no field deletions**; batch-1
  UI deletes completed 2026-08-31 (see COMPLETE entry above).
- **MRW-F07 weekly email positive-arm harness (2026-08-30)** — Disposable E2E tooling for
  `118→072→119→074→079` chain verification: CLI
  `tools/testing/mrw-f07-weekly-email-positive-arm.mjs`, library, offline contracts, and operator doc
  [`docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md`](./docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md).
  Wired into `run-agent4-suite.js`.

### Web

#### Fixed
- **Homework catalog PHA duplicate resolution (2026-09-01)** — `/shoot/homework` failed when Early Bird
  retained four active Program Homework Assignment rows (duplicate HW1/HW2 slots after the 2026-08-31
  PHA restore). Added centralized `pha-repository` + field map, deterministic duplicate resolution
  (Program Instance PHA link order → completion count → record id), typed `loadHomeworkCatalog`
  results, structured server logging, and visitor-safe retry UI. **Operator follow-up:** deactivate
  stale Early Bird PHA rows `rechCXdubiA1RPFEj` and `rec4iQ2WS04Arq3tB` in Airtable when convenient.

#### Changed
- **SC-109 Game Manual Adobe Publish Online URL (2026-09-01)** — `/shoot/game-manual` now opens the approved
  Adobe Publish Online manual (`https://indd.adobe.com/view/f3dcc153-0837-461b-9e81-e3fa11558e84`) by default;
  `NEXT_PUBLIC_GAME_MANUAL_URL` remains an optional override. Config: `web/lib/game-manual/config.ts`.
- **FUT-043 consistent card design system (2026-09-01)** — Shared `--sc-card-*` tokens in `globals.css`, `components/ui/sc-card.tsx` helpers, and catalog panel alignment. Applied to athlete homework rows, dashboard XP activity, Game Log list shells, and dashboard achievement insets. Token doc: [`web/docs/sc-card-design-tokens.md`](./web/docs/sc-card-design-tokens.md). Hub mirror: `communications/emails/lib/card-tokens.js` (separate repo deploy). Checklist: [`docs/deploy-checklists/FUT-043-card-design-system.md`](./docs/deploy-checklists/FUT-043-card-design-system.md).
- **FUT-042 Coach feedback quotation styling (2026-09-01)** — Shared `CoachFeedbackQuote` on athlete
  profile homework cards (orange left border, light blue-gray background, italic smaller text; hidden
  when empty). Hub homework + video feedback emails use matching inner quotation block inside the
  existing Coach feedback InfoCard. Checklist:
  [`docs/deploy-checklists/FUT-042-coach-feedback-quotation.md`](./docs/deploy-checklists/FUT-042-coach-feedback-quotation.md).
- **FUT-046 Homework feedback email subject (2026-09-01)** — Communications Hub `HOMEWORK_FEEDBACK` subject:
  `Homework Feedback – First Name Last Name – Assignment Name`; `[TEST]` prefix when `testMode: true`.
  Pairs with **071 v4.3** payload fields. Hub repo: `communications` (`lib/template-candidate-renderer.js`, `lib/welcome-processor.js`).
- **FUT-031 + FUT-044 + FUT-045 web bundle (2026-09-01)** — PR **#319** merged `de21fa36`;
  Vercel Production deploy verified same day.
  - **FUT-044** — Athlete profile homework rows keep a single **View Submitted Homework**
    link (lambda reviewer URL); no redundant Submitted Work preview card.
  - **FUT-045** — Parent-facing homework labels prefer Homework Library `Assignment Title`
    over full-name fields (`resolvePublicAssignmentName`).
  - **FUT-031** — When Homework Completion `Extra Credit XP Awarded` > 0, Game Log shows a
    display-only date-row tagline (e.g. `2026-08-31 · Extra credit +125 XP`). One Homework
    XP Event total unchanged.
  **Prod verified (2026-09-01):** `/shoot/athletes/athlete1-schmidt` — extra credit taglines,
  View Submitted Homework CTAs, short assignment names live.
- **FUT-034 Jr. Referee Clinic naming (2026-09-01)** — Public brand guide uses **Jr. Referee Clinic** (never bare **Jr. Ref**). Merged PR **#317** (`9a8ae42b`). Landing hub naming shipped in `hoopchallenges-landing` PR **#16** (`a992fce`).
- **Gift card commitment + About the Coach public copy (2026-08-30)** — Mike-approved parent-facing
  wording: FAQ gift-card award commitment (`/shoot/faq`); homepage About the Coach section
  (`/shoot#about-the-coach`). Copy module `web/lib/seo/public-program-content.ts`; Vitest +
  Playwright coverage. No pricing, eligibility, nav, env, or backend changes.
  **Prod verified (2026-08-30):** merge `bd7856ea`; smoke **52/52**; copy live on production.
- **Final public-app readiness (2026-08-30)** — FAQ added to Playwright + HTTP smoke routes;
  public-route-readiness Vitest contracts; public-display loading label; footer exclusion tests
  for Dashboard/Display. Operator routes preserved; no env or business-rule changes.
  **Prod verified (2026-08-30):** merge `7332d2f3`; smoke **52/52**; indexing policy unchanged.
- **Public chrome cleanup (2026-08-30, PR #301 / #304)** — Hide demo Dashboard and gym Display
  from public `/shoot` nav/hub; FAQ Early Bird + privacy; CR-12 closed. Vitest 487/487; prod
  smoke 50/50.
- **Phase 4 safe public copy (2026-08-30, PR #298 / MRW-G09)** — Parent-facing FAQ,
  Zoom, levels, pricing, profile, tutorials, and footer wording clarified (CR-01–CR-11).
  No dates, pricing amounts, eligibility, Dashboard nav, homepage layout, coach SLA, or
  grades-band FAQ nuance. Merge `082edc7d`; Production Ready `dpl_2uQ1wPJferY189xkCFkg4D67JcFR`.
  Review: [`docs/copy-reviews/2026-08-30-phase4-public-pages.md`](./docs/copy-reviews/2026-08-30-phase4-public-pages.md).
- **MRW-E02 SC-149 production attestation (2026-08-30)** — Added read-only
  `tools/testing/sc-149-fairfield-attestation.mjs`; live production PASS with evidence
  [`docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json`](./docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json).
  Mike Vercel dashboard env confirmation still required per deploy checklist.
- **MRW-G08 CURRENT-TRUTH refresh (2026-08-30)** — Updated git SHA, merged PR ledger (#279–#293), vitest/smoke counts, FUT-016/017/025 and SC-149 status, open PR list, and pending Mike-only follow-ups.
- **SC-109 Game Manual URL cutover path (2026-08-30)** — Added Mike deploy checklist
  [`docs/deploy-checklists/SC-109-game-manual-url-verification.md`](./docs/deploy-checklists/SC-109-game-manual-url-verification.md)
  for `NEXT_PUBLIC_GAME_MANUAL_URL`. Production smoke now asserts configured vs
  coming-soon manual link state, blocks env-var leakage, and verifies live XP/level sections.
- **FUT-017 Zoom Meetings portfolio redesign (2026-08-30)** — Full catalog redesign at
  `/shoot/zoom-meetings`: feature banner, live vs recording orientation, week-grouped
  `AccentRail` cards with access badges and external join/recording links, graceful 410 cover
  fallback, and matching detail-page cover fallback. Data via `fetchZoomMeetingCatalog` unchanged.
- **MRW-E04 production smoke fix (2026-08-30)** — Updated home route heading assertion in
  `tests/helpers/smoke.ts` to match FUT-018 `HOME_HERO` copy (`Earn XP. Climb 12 Levels.`);
  `npm run test:smoke:prod` **50/50** against production.
- **Athlete profile SEO cutover path (FUT-025, 2026-08-30)** — Replaced hardcoded
  athlete indexing flag with fail-closed env gate `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING`
  (requires `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING`). Profiles stay `noindex` in production
  defaults; robots.txt `/athletes/` disallow lifts only after Mike cutover. Sitemap still
  excludes athlete slugs by design. Deploy checklist:
  [`docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md`](./docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md).
- **SC-149 / MRW-E02 — Fairfield branding URL audit closeout (2026-08-30)** — Confirmed
  `resolveLandingUrl` / `resolveSiteUrl`, header/footer/hub `LANDING_URL`, and metadata
  `SITE_URL` default to Fairfield Basketball Club; legacy `hoopchallenges.com` and
  `hooopchallenges.com` hosts rewrite at import time. Strengthened Vitest module-env
  coverage, HTTP smoke legacy-host guard, and deploy checklist
  [`docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md`](./docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md)
  for Mike Vercel Production attestation.
- **Public athlete profile privacy audit (FUT-025, 2026-08-28)** — Centralized
  `buildAthleteProfilePageMetadata`; profiles remain `noindex` per SC-115 while in-page
  display follows registration consent. Added allowlist/privacy vitest coverage and Playwright
  metadata guards.
- **Unified program footer (FUT-019, 2026-08-28)** — `SiteFooter` now includes registration
  CTAs, FAQ pointer, and public consent copy on every `ProductShell` page; footer config
  tests + cross-page Playwright coverage.
- **Homepage parent clarity (FUT-018, 2026-08-30)** — Rebased onto homepage redesign (#270);
  added “For parents and families” guidance section with FAQ/homework links (kept #270 hero CTAs).
- **Tutorials portfolio catalog (FUT-016, 2026-08-30)** — `/shoot/tutorials` redesign matching
  homework/levels quality: feature banner, media-delivery orientation, AccentRail cards,
  in-page vs external badges, keyboard focus rings; display-layer EXT-QA-003 cross-program
  de-emphasis; Vitest for `tutorial-presentation` helpers.
- **Tutorials & Zoom presentation (FUT-016/017 partial, 2026-08-28)** — Parent-facing catalog
  copy clarifying in-page vs external media and live/recording availability.

### Docs

#### Changed
- **Docs closeout reconcile (2026-08-30)** — `CURRENT-TRUTH.md` refreshed to `9f4a64b6` (PRs **#279–#293**); updated `MASTER_REMAINING_WORK_LIST.md` MRW-G08 SHA; FUT-010 dry-run status in Master Future Work List; Vercel Production deploy verified for `9f4a64b6`.

### Airtable

#### Changed
- **Retire legacy Enrollment welcome-email fields (repo + manual Airtable packet, 2026-08-29)** —
  Live welcome path is **078A → Email Handoff Queue → 079 → Hub → Resend**. Automation **075**
  is labeled **LEGACY / RETIRED** in GitHub (absent from live Automations; do not restore; not Zoom XP — that is **101**).
  Ops probe no longer arms `Welcome Email Ready?` / Enrollment Parent Email Subject/HTML.
  PR **#274** merged `1b15d37f` and Vercel Production deployed. Airtable: **all six** fields deleted
  (final verify 2026-08-29, including Parent Email HTML). Packet:
  [`docs/deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`](./docs/deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md).
  Protects `Run Shot Milestone Check?` and Public Missing Homework/Zoom/Streak.
- **058 v1.5 + 059 v3.7 — Perfect Week Unlocks field alignment (2026-08-29)** — Production
  Athlete Achievement Unlocks uses **`Milestone Source Key`** and **`Coach Note`** (not
  `Source Key` / `Notes`). 058 now writes those fields; fail-closed errors name
  `Milestone Source Key`; identity remains `PERFECT_WEEK|{enrollmentId}|{weekId}`.
  059 Perfect Week path prefers Milestone Source Key for XP Source Key. **SC-PW-E2E remains
  BLOCKED / NEEDS PRODUCTION VERIFICATION** until Mike pastes 058, runs WAS
  `recl3DmBh22ADPWWe`, and captures evidence JSON (058 unlock + 059 100 XP + dedupe).
  Do **not** run qualifying `--apply` until manual Airtable steps in MRW-A01 pass.
- **057 v2.2 (SC-034, 2026-08-27)** — Perfect Week video minimum is Config-only (fail-closed):
  year-aware lookup of Config field **`Perfect Week Video Minimum`** (`fldqRxjWGXcbUZUg3`,
  number, value 3); removed `legacyRequiredVideoCount: 3`. WAS formula uses lookup
  **`Config: Perfect Week Video Minimum`**. **Production** (Mike 2026-08-27): Config field renamed from typo;
  WAS lookup + formula updated; **057 v2.2** pasted to Production. Deploy:
  [`057-v2.1-perfect-week-config-video-minimum.md`](./docs/deploy-checklists/057-v2.1-perfect-week-config-video-minimum.md).
- **057 v2.1 (SC-034, 2026-08-27)** — Perfect Week video minimum Config path + date-key
  hardening (`addDaysToDateKey` avoids UTC ISO slice). Superseded by v2.2 config-only pass.

#### Added
- **FUT-010 intake attachment cleanup (2026-08-28)** — Post-upload worker to clear
  `Submission Assets.Airtable Attachment` after verified S3 writeback (homework + video).
  Shared helpers `lib/intake-attachment-cleanup/`; CLI `tools/airtable/fut_010_intake_attachment_cleanup.py`
  (dry-run default, reconcile, apply with `--confirm-delete`); extension
  `airtable/extension-scripts/safe-backfills/fut-010-clear-intake-attachments.js`.
  Production apply **not** executed — Mike dry-run + formula attestation required. Deploy:
  [`FUT-010-intake-attachment-cleanup.md`](./docs/deploy-checklists/FUT-010-intake-attachment-cleanup.md).
  **Scope:** Submission Assets intake attachments only; legacy Homework Completions attachments out of scope.

### Docs

#### Changed
- **MRW-F08 offline contract suite (2026-08-30)** — Reconciled `docs-canonical-header`
  drift for automations 057/058/041/042/076/101/118 in `docs/automation-index.md` and
  `airtable/schema/current/automation-trigger-map.md`; expanded `run-agent4-suite.js` with
  remaining `tests/automation-contracts/` coverage. No automation logic changes.

#### Added
- **SC-PW-E2E disposable Perfect Week harness (2026-08-27)** — `tools/testing/sc-pw-e2e.mjs`
  with library, contract tests, and operator doc
  [`docs/testing/perfect-week/SC-PW-E2E.md`](./docs/testing/perfect-week/SC-PW-E2E.md).
  Dry-run default; `--apply` / `--cleanup` gated. Covers qualifying, nonqualifying-video,
  and trigger-only cases (057→058→059).
- **Automation reliability audit pack (SC-034/056/057/058/139, 2026-08-27)** — Offline hardcode
  classifier (`tools/docs/audit-automation-hardcodes.mjs`), trigger inventory extract,
  I/O standard doc, forbidden-pattern contract tests. Artifacts under `docs/audits/`.

### Web

#### Added
- **National SEO foundation (FUT-020–024, 2026-08-26)** — National-first metadata, homepage
  messaging (youth basketball, grades 1–8, Educational Athletics, Fairfield MT context),
  `/shoot/faq` with FAQPage + Organization JSON-LD, unique per-page titles/descriptions,
  descriptive hub link labels, and feature-banner accessible names. Docs:
  [`web/docs/seo.md`](./web/docs/seo.md). Tests: `web/lib/seo/*.test.ts`,
  `web/tests/national-seo.spec.ts`, updated `search-indexing` and `feature-images` specs.
  **Partial:** Team Shot Tracker FAQ omitted (separate product policy in `public-surface.ts`).
  Merged to `master` 2026-08-27 (`94c018e`, `ee5d3fd`); production verified same day.

#### Changed
- **Homepage content hierarchy redesign (2026-08-28)** — `/shoot` homepage rewritten for
  clearer annual-program messaging: Earn XP / 12-level progression anchor, grades 1–12,
  May 1–June 30 challenge dates, 100% online worldwide participation, six-step how-it-works,
  XP earning categories, 12-level journey section, Educational Athletics philosophy, and
  registration CTA moved to page end. `program-facts.ts` grades updated to 1–12. No Airtable
  schema or XP logic changes.
- **Levels page redesign (FUT-015, 2026-08-26)** — `/shoot/levels` displays Levels 1–12 in
  numeric ascending order, adds a faint ladder-style hero background, clarifies the blue
  level badge as **Level** + Sort Order (replacing ambiguous `LV` placeholder), summarizes
  gate requirements from **`Public Gate Criteria`**, and adds terminology for current level,
  next level, and gates. Data via `fetchLevelLadder()` — no XP or gate-rule logic changes.
  Checklist: [`docs/deploy-checklists/FUT-015-levels-page-redesign.md`](./docs/deploy-checklists/FUT-015-levels-page-redesign.md).
- **Homework catalog redesign (FUT-014, 2026-08-26)** — `/shoot/homework` uses PHA-backed live
  Homework Library data with dynamic assignment count, newest week first, verified Brief
  Description from **`Homework Library.Brief Description - Display`** (`fldAnHr3uTuDN5bs9`),
  resource links (`URL`, `URL Additional`, `Docs`), keyboard-accessible card links, and
  Operator Notes removed from public cards. Commits `cdd2b97`, `4a26aa4`. Checklist:
  [`docs/deploy-checklists/FUT-014-homework-page-redesign.md`](./docs/deploy-checklists/FUT-014-homework-page-redesign.md).
- **XP Event Log display (2026-08-26)** — Athlete Game Log and dashboard XP ledger use a
  two-row layout: activity headline and XP on row 1, ISO date (`YYYY-MM-DD`) on row 2;
  middle column reserved empty. Headlines use linked data where available: Submission
  `Total Shots Counted`, Homework PHA `Assignment Title`, Video Feedback
  `Custom Video File Name`, Zoom Attendance linked meeting name. Same-date rows sort
  deterministically: milestones and weekly targets by percentage descending; Shot
  Submissions below later same-date accomplishments. **Display-only** — no XP
  calculations or Airtable XP logic changed. Commits `6625559`, `f225f04`, `68c3a45`,
  `3306379`. Tests: `game-log-presentation.test.ts`, `recent-activity-log.test.ts`,
  `xp-activity-table.test.ts`, `xp-activity-loader.test.ts`.

#### Fixed
- **Production smoke verification (2026-08-25)** — Cross-platform `test:smoke:prod` via
  `cross-env`; hydration-safe `openMobileNavPanel()` helper; client-only freshness
  “Last checked” line to prevent React #418 on athlete profiles during prod smoke.
- **Public homework catalog — PHA data source (2026-08-25)** — `/shoot/homework` reads active
  Program Homework Assignments for the Registering Shooting Challenge Program Instance and
  joins Homework Library content without a `Published?` gate (PHA is the schedule authority).
  Cards show week, due date, grade bands, and submission guidance. **FUT-014 (2026-08-26)**
  removed Operator Notes from public catalog cards and added resource links. Assignments
  sort by Homework Library `Order` descending within each week. Tests:
  `web/lib/airtable/homework-queries.test.ts`, `web/lib/data/homework.test.ts`,
  `web/tests/public-experience.spec.ts`.

#### Added
- **Athlete profile homework assignments (2026-08-24)** — Public athlete profiles list every
  active Program Homework Assignment for the Registering 2026–2027 scope and athlete grade band,
  joined to Homework Completions for status, XP, feedback, and due-date credit display (no
  hardcoded 18-item cap). Tests: `web/lib/data/public-athlete-homework.test.ts`.
- **Athlete profile level graphics (2026-08-24)** — Public athlete profiles show the
  Airtable Levels cover image beside the current level in the hero, performance snapshot,
  and progression panel, with brand-gradient placeholder fallback. Tests:
  `web/lib/levels/level-graphic.test.ts`, `web/lib/data/athlete-profile.test.ts`,
  `web/tests/athlete-profile.spec.ts`.

### Make

#### Changed
- **FUT-003 paid payment writeback (2026-08-26)** — Maia final report: paid-only Fillout →
  Make workflow validated in controlled Production test (`$2.00`, Payment Status `Paid`, one
  Payment Transactions row, one Enrollment link, duplicate protection pass). Scenario
  **inactive** at validation — ready for Mike activation. Free/zero-dollar architecture
  **deferred until November/December 2026**. Does not change Airtable XP logic. Checklist:
  [`docs/deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md`](./docs/deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md).

### Airtable

#### Changed
- **Duplicate detection — Activity Date - Time (2026-08-25)** — `Submissions.Duplicate Key`
  formula now includes hourly `Activity Date - Time` after the date segment (`NO_TIME` when
  blank). Activity Date stays date-only for XP/weeks/streaks/summaries/Perfect Week/homework/
  video/email/website. **115 v2.2** no longer presets `Duplicate Review Status = Count It`
  so **007** can review all eligible Submissions (007 script remains key-driven; no structural
  change). Offline mirror: `buildSubmissionDuplicateKey`. Deploy:
  [`docs/deploy-checklists/2026-08-25-duplicate-key-activity-date-time.md`](./docs/deploy-checklists/2026-08-25-duplicate-key-activity-date-time.md).
  Paste-ready: [`docs/deploy-checklists/115-v2.2-PASTE.txt`](./docs/deploy-checklists/115-v2.2-PASTE.txt).

#### Fixed
- **Secure video URL pipeline (2026-08-24)** — **022 v2.2** stops falling back to private
  `Canonical File URL` for Video Feedback parent links; **072 v4.8** and **073 v4.4** accept
  only validated Lambda viewer URLs in parent-facing payloads. Shared validator:
  `lib/secure-video-url.js`. Repair: `repair-missing-reviewer-access-tokens.js`,
  `tools/airtable/repair_missing_reviewer_tokens.py`. Deploy:
  [`022-v2.2-secure-video-url-pipeline.md`](./docs/deploy-checklists/022-v2.2-secure-video-url-pipeline.md).

#### Added
- **Master closeout (2026-08-24)** — Authoritative docs updated after Production verification of
  **065 v10.3** / **066 v3.9** dynamic triggering, historical audit artifact preservation
  (`recYIn2CHdvIaiYg6`, `rec1QYofvoDBHIsSS`, `recgP3pc7mXUccsdC`, plus protected WAS/queue rows),
  flexible HW1/HW2 follow-up plan (deferred), and master component list §0E.
  Closeout: `docs/deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md`,
  `docs/deploy-checklists/2026-08-24-historical-audit-artifacts.md`.
- **Master document reconciliation (2026-08-24)** — Authoritative docs updated after
  successful weekly-summary Production E2E: Perfect Week 48-hour grace + **057 v2.0**,
  **072 v4.7 / 074 v3.3 / 079 v2.5** live-tested, video-feedback parent email,
  duplicate/conflict protection, historical artifact preservation (`reczxTIpVI8ZJLex0`,
  `recoikFrli3m0xDRa`), disposable fixture cleanup status. **065/066** Production paste
  **live-tested 2026-08-24** (supersedes earlier "paste pending" note).
- **Weekly-summary E2E closeout documentation (2026-08-24)** — Production chain
  **072 v4.7 → 074 v3.3 → 079 v2.5 → Communications Hub → Resend** live-tested on
  disposable WAS fixture (Test Mode, allowlisted recipient). Reports:
  `docs/testing/autonomous-qa/WAS_EMAIL_QA_20260824_FINAL_REPORT.md`,
  `docs/deploy-checklists/2026-08-24-weekly-email-e2e-closeout.md`. Historical
  `reczxTIpVI8ZJLex0` / `recoikFrli3m0xDRa` documented as preserved evidence.
- **PKG-007 Video XP production proof orchestrator (2026-08-23)** —
  `tools/testing/pkg-007-video-xp-proof.mjs` runs disposable Testing3 lifecycle proof
  (`AUTONOMOUS_VIDEO_QA_*`): preflight, positive/replay/withdrawal/restoration, negative
  paths, reconciliation manifest. Certified run `AUTONOMOUS_VIDEO_QA_20260823_164549` PASS.
  Report: `docs/testing/autonomous-qa/PKG-007_VIDEO_XP_PROOF_FINAL_REPORT.md`.
- **Production QA paste bundles (2026-08-23)** — Complete paste-ready scripts:
  `docs/deploy-checklists/010-v10.12-PASTE.txt`, `057-v1.9-PASTE.txt`,
  `072-v4.3-PASTE.txt`. Operator guide:
  `docs/deploy-checklists/2026-08-23-production-qa-paste-bundle.md`.
  Regenerate: `python3 tools/airtable/extract_production_qa_paste_bundles.py`.

#### Changed
- **065 v10.3 / 066 v3.9 dynamic triggering recordId (2026-08-24)** — Scripts require
  `recordId` from `input.config()` only (no hardcoded record literals in executable
  logic). **Production live-tested 2026-08-24.** Deploy:
  `docs/deploy-checklists/065-066-v10.3-v3.9-dynamic-trigger-record.md`. Closeout:
  `docs/deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md`. Paste:
  `065-v10.3-PASTE.txt`, `066-v3.9-PASTE.txt`.
- **072 v4.7 / 074 v3.3 weekly email fixes (2026-08-24)** — Fix general shooting days
  writeback (`shootingDayKeys.size` bug caused `undefined` and email fallback to PW days);
  parent-friendly goal display capped at **150%+** (Weekly Threshold tier alignment);
  weekly video list with date, name, and secure `Video URL or Drive Link`; Submission
  fallback when VF Week lookup is blank. Deploy:
  `docs/deploy-checklists/072-v4.7-weekly-email-fixes-2026-08-24.md`. **E2E live-tested
  2026-08-24** — see `docs/deploy-checklists/2026-08-24-weekly-email-e2e-closeout.md`.
- **Regression tests (2026-08-24)** — `c011-weekly-email-schedule.test.js` expects **074 v3.3**;
  `test_072_weekly_xp_reconciliation.mjs` expects **072 v4.7**.
- **057 v2.0 Perfect Week grace-period automation (2026-08-23)** — Automation 057
  evaluates configurable submission grace hours (default 48 after end of Activity Date in
  America/Denver), prefers `Perfect Week Grace Eligible?` when present, and writes grace
  timing breakdown in daily detail. Paste checklist:
  `docs/deploy-checklists/057-v2.0-perfect-week-grace-period.md`. **Mike will manually add
  schema fields and paste scripts in Production tomorrow.**
- **Perfect Week 48-hour submission grace (2026-08-23)** — Repository contract
  `lib/was-email-contracts/perfect-week-submission-timing.js` mirrors Denver end-of-activity-day
  + configurable grace hours (default 48). Email **072 v4.6** labels Shooting Days Logged
  separately from Perfect Week Qualifying Days; **074** Hub payload carries both counts.
  Airtable formula paste plan (no prod schema change in repo):
  `docs/deploy-checklists/perfect-week-grace-period-2026-08-23.md`.
- **072 v4.5 / 074 v3.2 Perfect Week criteria (2026-08-23)** — Weekly email days logged
  uses Perfect Week Countable submissions + Activity Date against Achievements
  `PERFECT_WEEK` Trigger Threshold (not `Days Logged This Week` rollup). Criteria
  sourced from Achievements, XP Reward Rules, Automation 057 WAS writeback, and WAS
  formula fields (video, zoom, homework, eligibility). Shared contract:
  `lib/was-email-contracts/perfect-week-criteria.js`. Regression tests cover criteria
  changes for required days, video count, and zoom conditional rules.
- **072 v4.4 / 074 v3.2 weekly email metrics (2026-08-23)** — Canonical Denver date-key
  day count, weekly scoped shots/makes, goal completion %, shooting %, Video Feedback
  week list, and Zoom attendance in package build + Hub payload. Shared contract:
  `lib/was-email-contracts/weekly-summary-email-content.js`. 074 prefers 072 canonical
  payload fields over WAS rollups for days logged and goal display.
- **Perfect Week Testing XP repair (2026-08-23)** — Authorized PROD backfill for enrollment
  `rec93mAfo5jKqP3g5`: five `SUBMISSION_XP|{id}` events (010 contract), five shot-milestone
  XP events from Pending unlocks (059 contract). Homework `recbPYfZlM7aC9HWg` and three video
  rows skipped (not review-eligible / zero XP). Script:
  `tools/testing/repair_perfect_week_testing.mjs`. Evidence:
  `/opt/cursor/artifacts/POST-REPAIR-REPORT-rec93mAfo5jKqP3g5.md`.
- **072 v4.3 — WAS-linked XP reconciliation (2026-08-23)** — Weekly email build compares
  rollup to WAS-linked active XP only; surfaces unlinked canonical XP before misleading
  disagreement. Paste checklist:
  `docs/deploy-checklists/072-v4.3-was-linked-xp-reconciliation.md`. Offline:
  `node tools/testing/tests/test_072_weekly_xp_reconciliation.mjs`.
- **PKG-006R Video XP lock investigation (2026-08-23)** — PKG-006R/PKG-036
  locks complete; 113 v6.4 / 114 v6.1 already Live in Production. Stale
  coordination-hold language removed from Video XP packet and Completion Master.
  Remaining: PKG-007 lifecycle proof. Report:
  `docs/investigations/PKG-006R-VIDEO-XP-LOCK-INVESTIGATION-2026-08-23.md`.
  Readiness test updated for 073 Hub handoff error strings.
  `Count It` + extended poll fix in `autonomous-qa-run.mjs`. Four deleted repair XP rows
  not recreated; Xavier/Testing3/Curtis show expected FINDING. Stale-field check: no
  phantom links. Report: `docs/testing/autonomous-qa/AUTONOMOUS_QA_20260823_POST_XP_DELETION_REPORT.md`.
  idempotently (Xavier, Testing3×2, Curtis). Script:
  `tools/testing/repair_missing_submission_xp.mjs`.

### Web

#### Changed
- **Public athlete weekly activity (2026-08-24)** — Profile weekly summaries fetch Weeks
  `Start Date` / `End Date`, hide future weeks, and sort current/past weeks newest-first (up to 8).
  Tests: `web/lib/data/public-athlete-profile-weekly.test.ts`.
- **Autonomous QA continuation (2026-08-23)** — **072 v4.3** WAS-linked XP validation
  (fixes false disagreement on WAS `reczxTIpVI8ZJLex0`). Authorized
  `SUBMISSION_XP` repair for four Schmidt test submissions via
  `tools/testing/repair_missing_submission_xp.mjs`. Autonomous QA **25 PASS /
  0 FINDING**. Paste still needed: **010 v10.12**, **057 v1.9**, **072 v4.3**.
- **Production-readiness cleanup (2026-08-23)** — Reconciled `CURRENT-TRUTH.md`,
  `PROJECT_STATE.md`, and `AUTOMATION_VERSION_INVENTORY.md` for production-only
  operation (DEV base retired). Inventory:
  `docs/audits/2026-08-23-production-readiness-inventory.md`. Validation:
  29/29 agent4 suites, 260 web tests, typecheck, lint, build PASS.
- **Public athlete XP activity ledger (2026-08-23)** — Profile activity uses enrollment-scoped
  XP loader (up to 200 events), **XP Activity Date** for display, Load more pagination, and
  dashboard truncation notice (25 vs full ledger). Tests in `public-athlete-activity.test.ts`.
- **071 v4.2 + 073 v4.3 — Homework/Video Feedback parent email redesign (2026-08-22)** —
  Communications Hub branded React Email templates (`HOMEWORK_FEEDBACK`,
  `VIDEO_FEEDBACK`) aligned with Welcome and Weekly Athlete Summary. **071**
  payload adds `weekName`, `reviewStatus`, and canonical footer URLs; **073**
  adds `programName`, `reviewStatus`, and footer URLs. Paste checklists:
  `docs/deploy-checklists/homework-feedback-email-redesign-2026-08-22.md`,
  `docs/deploy-checklists/video-feedback-email-redesign-2026-08-22.md`. Offline:
  `node --test tests/email/homework-video-feedback-email.test.mjs` and
  `node tests/email/automation-071-073-source-safety.test.js`. Hub tests in
  `Schmidt127/communications`.
- **076 v8.11 — canonical homeworkPageUrl (2026-08-22)** — Payload always
  includes `https://www.fairfieldbasketballclub.com/shoot/homework`; homework
  items omit per-assignment library URLs. Paste with v8.10 checklist update.
  Adds `submissionStatMode`, structured `shootingDetails` (Detailed Shooting),
  level cover image URLs, and PHA grade-band filter parity with legacy homework
  (blank PHA grade band no longer excludes all-grade assignments). Paste:
  `docs/deploy-checklists/daily-submission-email-fix-2026-08-22.md`. Offline:
  `node --test tests/email/automation-076-offline.test.mjs` and
  `node tools/testing/tests/test_076_email_handoff_runtime.mjs`.
- **076 v8.9 + 058 v1.4 — goal settlement aligned with 057 v1.9 (2026-08-22)** —
  Settlement now compares WAS **Goal Shots Target** (season lookup) to Goal
  Record **Total Shot Target**. **Weekly Goal Shots Target** (`Goal/9`) is
  required separately for weekly math only. Fixes false fail-closed on settled
  weeks such as Curtis `recwofzVvYsAYMibR` (10,000 vs 1,111.11…). Paste:
  `docs/deploy-checklists/076-v8.9-goal-settlement-fix.md`. Offline:
  `node --test tests/email/automation-076-offline.test.mjs`,
  `node tools/testing/tests/test_076_email_handoff_runtime.mjs`, and
  `node tools/testing/tests/test_058_perfect_week_lifecycle_runtime.mjs`.
- **076 v8.8 + Daily Submission email redesign (2026-08-22)** — Communications
  Hub React Email template replaced (blue/orange branding, scoreboard recap,
  homework rows, XP page CTA, footer links). **076** payload adds
  `weekDateRange`, `shootingPercentage`, structured `homeworkItems`,
  `xpPageUrl`, and footer URLs. Paste checklist:
  `docs/deploy-checklists/daily-submission-email-redesign-2026-08-22.md`.
  Offline: `node --test tests/email/automation-076-offline.test.mjs` and
  `node tools/testing/tests/test_076_email_handoff_runtime.mjs`. Hub tests in
  `127si-communications-hub`.
- **010 v10.12 — formula/link settlement grace (2026-08-22)** — Temporary
  unsettled Enrollment, Week, WAS, Count This Submission?, or Total Shots
  Counted now returns `skipped_not_ready` without throwing, without latch
  acknowledgement, and without XP writes. Permanent ineligible and integrity
  failures keep v10.11 behavior. Recommended trigger adds settled-field gates.
  Paste checklist: `docs/deploy-checklists/010-v10.12-formula-settlement-grace.md`.
  Offline: `node --test tools/testing/tests/test_010_offline.mjs` and pipeline
  010 XP dedupe suites.
- **057 v1.9 — Perfect Week goal settlement uses season lookup (2026-08-21)** —
  Settlement now compares WAS **Goal Shots Target** to Goal Record **Total Shot
  Target**. **Weekly Goal Shots Target** (`Goal/9`) is used only for daily math.
  v1.7/v1.8 incorrectly required weekly === season total, which kept live WAS
  `reczxTIpVI8ZJLex0` in Error after a settled 12000 goal. Keeps v1.8 Mountain
  Time date keys. Paste + dynamic `recordId` mapping required (builder currently
  hardcodes the test WAS). Checklist:
  `docs/deploy-checklists/057-v1.9-goal-settlement-fix.md`. Offline:
  `node --test tools/testing/tests/test_057_runtime.mjs` and
  `node --test airtable/automations/shooting-challenge/lib/xp-date-normalization.test.js`.
- **Docs: final Production version reconciliation (2026-08-21)** — Authority docs
  now record Mike-verified live versions: **010 v10.11**, **041 v5.1**, **057 v1.7**,
  **058 v1.3**, **059 v3.6**, **101 v6.7**, **117 v2.1 Live**, **070a/070b v4.7**,
  **070c current live**, **020 v3.7**, **033 v4.4**, **064 Production-verified current
  live**, **065 v10.2**, **066 v3.8**. Midday Automations Code-column snapshots that
  showed **010 v10.10** / **101 v6.6** are labeled historical. Perfect Week remains
  calendar-blocked (Days Logged 5; Eligible false); order **057 → 058 → 059**. No
  Production Airtable writes from this documentation pass.
- **059 — Reason Debug version string aligned to SCRIPT v3.6 (2026-08-21)** —
  Cosmetic only (`Created by 059 v3.6`); no award logic change. Existing XP Events
  still show historical `v3.5` debug text until new awards.
  Production evidence on `recxtpMu4ONbdDD45`: Current Signature already included
  the full Attendees list and matched Last (Needed=0) after a lifecycle run while
  Meeting Status was **Scheduled**. Prior v6.6 treated non-Completed as
  ineligible withdrawal, deactivated Curtis’s owned event, and acknowledged the
  full roster without creating XP for new attendees. v6.7 awards only when
  **Completed**; Scheduled/In Progress **hold** rostered events; Cancelled /
  roster-remove / inactive Enrollment / School Year mismatch still deactivate.
  Offline: `node --test tests/zoom/automation-101-lifecycle-eligibility.test.js`.
  Paste Automation **101** only.
- **005 (v5.5) — PHA Homework Slot is authoritative for HW1/HW2 placement (2026-08-21)** —
  Wrong Fillout field placement no longer fatal. 005 still validates each selected
  PHA for Program Instance, Week, Active?, and exactly one Homework Assignment link,
  then stores official HW1/HW2 PHAs in `Homework Name 1` / `Homework Name 2` from
  `PHA.Homework Slot`. Supports single-field misplacement and swapped fields; fails
  closed on duplicate official slots or blank/invalid slots. Adds original/normalized
  PHA outputs plus `homeworkSlotNormalized` / message. Offline:
  `node --test tests/homework/automation-005-020-pha-direct.test.js`. Production
  paste pending Mike approval (do not change Production from agents).
- **Video Feedback parent-email writeback owner (2026-08-20)** — Communications Hub
  now owns VF `Parent Feedback Sent?` / `Sent On` / Delivery Status / Delivery Error /
  Hub Event ID / Resend Message ID after Resend outcomes. **073** / **079** unchanged
  (queue + Hub accept only). Docs: `docs/integrations/email-send-plane.md`,
  `airtable/schema/current/automation-trigger-map.md`. Hub contract:
  `communications` repo `docs/contracts/VIDEO_FEEDBACK_SOURCE_WRITEBACK_v1.md`.
  No Make/Gmail parent-email path.

#### Added
- **C-028 — Award Recipients Tremendous fields (2026-08-18)** — Production table `tblTyQXl8aEP93ubK`: Recipient Name/Email, Ready to Send?, Tremendous Environment/IDs/status/timestamps/error/response, Send to Tremendous?, Tremendous Test Record?. Existing Award Status / Award Amount / Gift Card Needed? / Award Recipient Unique Key reused. [field plan](./airtable/schema/current/C-028-award-recipients-tremendous-fields.md). [current state](./docs/integrations/tremendous-award-fulfillment.md).

#### Added
- **Manual test cards (2026-08-21)** — `docs/testing/manual-test-cards/` — operator cards for 010, 064/065, XP dedupe checklist, 041/042, Saturday Perfect Week (057→058→059), and 010 v10.10 vs v10.11 comparison (analysis only; no paste).

#### Changed
- **070a / 070b (v4.7) — GitHub synced from confirmed Production v4.7** — Replace
  `remoteFetchAsync` with `fetch` in both shared upload scripts. Source labeled
  Production v4.7 in script change history. Does not downgrade Production.
- **070b (v4.7) — Airtable Automation fetch for Make upload webhook** — (Production
  already on v4.7; this entry documents the fix.) Replace `remoteFetchAsync` with
  `fetch` (Automation “Run a script” global). Production failure was
  `remoteFetchAsync is not defined`. Preserve POST JSON payload, Accepted async →
  070c verify path, trigger retention on failure, and webhook URL sanitization in
  Upload Error / response previews.
- **005 (v5.4) / 010 (v10.11) — Date-only midnight UTC Activity Date keys** — Airtable
  date-only values stored as `YYYY-MM-DDT00:00:00.000Z` no longer shift to the previous
  America/Denver calendar day. Shared helper in `lib/v2-engine-contracts.js` matches.
  Formula docs: Activity Date Key uses UTC. Ported from PR #218 onto current master.
- **Homework cutover operator checklist (2026-08-19)** — [`HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md`](./docs/deploy-checklists/HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md); `START-HERE-PROD-PASTE.md` reconciled (020 **v3.6**, `Week Lkp` deleted); `KNOWN_ISSUES.md` and schema pointer files updated for PROD-only + `prod-20260819`.
- **Homework Library — `Lesson Key` deleted (2026-08-19)** — Mike removed the obsolete formula field in PROD. Content identity: `Record Id`. Schedule dedupe: PHA `Schedule Key`. Aligns with [`HOMEWORK-LIBRARY-FIELD-MATRIX.md`](./docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-FIELD-MATRIX.md) cutover step 6.
- **Submissions — `Week Lkp` deleted (2026-08-19)** — Mike removed the legacy lookup from Homework Name 1 → library week. Submission week authority remains **`Submissions.Week`** (Automation 005). Aligns with field-matrix step 10.
- **Schema refresh (2026-08-19)** — Read-only Metadata API export for **Production** (`prod-20260819/`, 32 tables, 126 views). Summary: `docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md`. Updated `PROJECT_STATE.md`, `airtable/schema/snapshots/README.md`, `airtable/schema/current/schema-notes.md`, and web data-map/view docs for homework table split (`Homework Library` + `Program Homework Assignments`). Production is the only live Shooting Challenge base.
- **071 (v4.1) — PHA Grade Band is metadata only** — Homework Feedback Hub
  handoff validates Program Instance + Week + Homework Assignment + Homework
  Slot. Removes `PHA Grade Band mismatch` rejection so multi-band PHAs
  (K-2…9-12) no longer block parent email. Requires a linked PHA. Athlete
  `canonicalGradeBandId` remains optional Hub payload metadata only (not a
  match key). Still Hub queue-only (no Make/Gmail/Resend).
- **020 (v3.6) — Document multi-band PHA scheduling** — Operational identity
  remains Program Instance + Week + Homework Assignment + Homework Slot.
  Clarifies that multi-band Grade Band never rejects a valid match (behavior
  unchanged from v3.5).
- **073 (v4.1) — Video parent link is VF field only** — Parent-facing URL is
  exclusively Video Feedback `Video URL or Drive Link` (written by 022). No
  Reviewer/Canonical File URL fallback on the parent-email path. Missing or
  non-http(s) URL fails closed.
- **079 (v2.4) — Airtable-compatible Hub fetch** — Replace `remoteFetchAsync`
  with `fetch` for Communications Hub ingress. Event Type contract unchanged
  (`ZOOM_RECORDING_APPROVAL` / Template Key `ZOOM_RECORDING_APPROVED`).
- **079 (v2.3) — Zoom Event Type / Template Key contract fix** — Email Handoff
  Queue Event Type is `ZOOM_RECORDING_APPROVAL`; Template Key remains
  `ZOOM_RECORDING_APPROVED`. Handoff Key prefix is
  `ZOOM_RECORDING_APPROVAL|ZOOM_ATTENDANCE|{ZA}`. Do not add
  `ZOOM_RECORDING_APPROVED` as an Event Type option. Automation name:
  `079 – Send to Communications Hub - NEW`.
- **117 (v2.1) — Align Zoom queue producer with Event Type contract** — Writes
  Event Type `ZOOM_RECORDING_APPROVAL` and Template Key `ZOOM_RECORDING_APPROVED`.
- **022 (v2.0) — Align GitHub with Production child upload writeback** — Video
  Feedback writeback prefers **Reviewer File URL**, falls back to **Canonical
  File URL**, updates the existing Video Feedback **Upload Status** (no duplicate
  field), writes Video URL or Drive Link / Video Asset File Name / Video Asset
  Uploaded At, and confirms **Writeback Complete?** when Uploaded. Idempotent;
  does not create child records. Offline contract:
  `node airtable/automations/shooting-challenge/lib/022-child-upload-writeback.test.js`.
  Production already live-tested v2.0 (2026-08-16); GitHub was still labeled
  v1.1 with Drive-first URL selection.

### Docs

#### Changed
- **Email send plane (2026-08-19)** — Mike: Make.com does not handle any Shooting Challenge emails. All of those emails go through Communications Hub → Resend. Historical Make/Gmail weekly and 117f packets are preserved and labeled historical. [email-send-plane.md](./docs/integrations/email-send-plane.md).
- **Automation 022 Production paste (2026-08-19)** — Mike confirmed Airtable shows **v2.1**. The 2026-08-16 controlled-path packet remains historical for that day’s **v2.0** evidence.
- **Automation 020 Production paste (2026-08-19)** — Mike confirmed Airtable shows **v3.6**. Earlier v3.5 install evidence remains historical.
- **Automation 070b Production paste (2026-08-19)** — Mike confirmed Airtable shows **v4.6**. Historical C-013 E2E remains **v4.4** (2026-07-11). Lambda season/Program Instance deploy not claimed from the Airtable version alone.
- **Automation 117 Production paste (2026-08-19)** — Mike pasted **v2.1** Hub handoff (`Create Zoom Recording Approval Communications Hub Handoff`). Email Handoff Queue only; not XP; not Make 117f; not Stage 17 orchestrator.
- **Automation 066 Production paste (2026-08-19)** — Mike confirmed Airtable shows **v3.8**. Earlier v3.3–v3.5 proofs remain historical.
- **Automation 010 Production paste (2026-08-19)** — Mike confirmed Airtable shows **v10.10**. PKG-006R **v10.9** proof remains historical.
- **Lambda upload season CodeOnly deploy (2026-08-19)** — Mike-requested. `127si-upload-asset` updated (CodeSha256 `lwbLiBzB4cfWdzVmIVo7Z78AkiowqPuV2NmUXb+PK2w=`); 139 unit tests OK. Season from Program Instance School Year - Linked. Rotate secrets exposed by AWS CLI env echo when ready.

### Web

#### Fixed
- **XP activity loader — enrollment filter (2026-08-23)** — `web/lib/data/xp-activity-loader.ts`
  now scopes XP Events by `Enrollment Record ID` (lookup of Enrollments.Record Id) instead of
  `FIND(recordId, ARRAYJOIN({Enrollment}))`, which returns athlete display names and always
  matched zero rows. Adds linked-record fallback with bounded chunking/cache, throws when linked
  XP Events cannot be resolved, and surfaces a warning instead of a silent empty table. Preview:
  `/shoot/dashboard/preview?enrollmentId=rec…`. Regression: `web/lib/data/xp-activity-loader.test.ts`.
- **XP activity date integrity (2026-08-23)** — Submission Base rows now use linked Submission
  `Activity Date` as the authoritative display date; `toAirtableDateKey` mirrors automation
  Denver/midnight-UTC rules so UTC instants cannot shift an athlete-visible day (e.g. 8/22 → 8/23).
  Excludes `Duplicate - Remove`, dedupes by Source Key, reports counted submissions missing XP
  Events, and adds `scripts/xp-activity-reconciliation-report.mjs` for enrollment reconciliation.

#### Changed
- **Shoot route aliases (2026-08-22)** — moved to landing hub
  (`127si-landing-page` / `hoopchallenges-landing` `web/next.config.ts`).
  Apex paths `/shooting`, `/shootingchallenge`, `/shootchallenge`, and
  `/challengeshooting` redirect to `/shoot` on the domain that serves
  fairfieldbasketballclub.com. Removed ineffective copies from this repo's
  `web/vercel.json`.
- **Tutorials and Shoutouts video + site-wide contrast (2026-08-18)** — Public `/shoot/tutorials` and `/shoutouts` use Tutorials & Assets `Link to Video` as the only catalog video URL. Blank links show a coming-soon state instead of a player. Google Drive / PDF / Adobe links open in a new tab. Site-wide `text-muted` now maps to readable foreground so body copy, nav, and footer meet contrast on light surfaces.
- **Tutorials → Tutorials & Assets cutover (2026-08-17)** — Public `/shoot/tutorials`,
  `/shoutouts`, and `/articles` read `Tutorials & Assets` (`tblDOTgsWfqPm18bw`)
  only. Field map uses `Type of Asset`, `Brief Descriptions`, `Display Image`,
  `Athlete Headshot`, and publish value `checked`. Page title is **Skills and
  Technique Tutorials**. Card/detail body text uses darker foreground contrast.
  Video embeds show Airtable or YouTube poster before click-to-play
  (`youtube-nocookie`). Deploy checklist:
  [`docs/deploy-checklists/tutorials-and-assets-web-cutover.md`](./docs/deploy-checklists/tutorials-and-assets-web-cutover.md).
- **Website-fix batch WEB-004 / WEB-008 / WEB-010 (2026-08-15)** — Replaced
  cartoon/AI feature imagery with brand typography banners, strengthened card
  text contrast, and surface Program Instance pricing on the program home page
  when available. Registration and program navigation stay available if
  standings fail closed. Recovers the blocked `3120c01` shoot patch.

#### Fixed
- **Public Airtable adapter REST-shape hardening (2026-08-15)** — Centralized
  linked-record, lookup-array, and select-object normalization for public
  `/shoot` adapters. Standings scope Program Instance and Current Level by
  record id, unwrap `Level Sort Order - For Softr` lookup arrays, share the
  Registering Program Instance resolver with scheduled homework, and add a
  permanent REST contract suite so display-name-versus-id mistakes fail before
  deploy. Config is still not consulted for public season selection.
- **Public standings Current Level id link (2026-08-15)** — Enrollment
  standings integrity now treats `Enrollments.Current Level` as a Level record
  id (live REST shape `["rec…"]`), looks it up in the active-level contract,
  and compares public display name, sort order, and XP threshold against that
  matched Level — not by comparing the raw link id to the display name.
- **Public standings Program Instance id scope (2026-08-15)** — Enrollment
  standings integrity now compares `Enrollments.Program Instance` to the
  Registering Program Instance record id (live REST shape
  `["rec…"]`), not the display name. Canonical name
  `Shooting Challenge | <School Year - Linked>` is still validated when
  selecting the season row.
- **Public standings / homework season selection (2026-08-15)** — Public
  leaderboard, home top-three, public display, and scheduled homework no longer
  require exactly one Config `Active School Year`. Season scope is resolved from
  the single `Program Instance - Sync` row matching
  `Program - Linked = Shooting Challenge` and `Status = Registering`, then
  validated against the canonical name `Shooting Challenge | <School Year -
  Linked>`. Multiple retained Config years remain valid. The `Web - Leaderboard`
  view stays the enrollment boundary; zero/multiple Registering instances,
  missing school year, invalid names, and missing views still fail closed.

### Docs

#### Changed
- **Completion-status reconciliation (2026-08-16)** — Updated
  `SHOOTING_CHALLENGE_COMPLETION_MASTER.md` §2A/§2C with current package status
  table, do-not-retest ledger, and still-open items. Marked PKG-038 Complete
  (053/054/066/059 Production proof), PKG-009 Weeks scaffold partially proven,
  PKG-034 base lifecycle partially proven, PKG-039 goal-link repair partially
  proven. Reconciled stale PKG-006R baseline table and automation-index hold
  notes. No Production Airtable, automation, or deployment changes.
  standings adapter now requires the `Web - Leaderboard` view instead of
  broadening to an unsafe table fallback, resolves the active Config School
  Year and canonical Program Instance before reading it, validates active
  Enrollment identity and settled level/XP/shots on every returned row, rejects
  duplicates and incomplete rows, paginates without a 200-row ceiling, and
  removes Airtable Enrollment IDs from the public model. Added a read-only
  integrity audit with executable fixture coverage and a Mike-only Production
  verification packet. Production Airtable, configuration, automation, email,
  deployment, and package locks remain untouched.
- **PKG-038 streak and shot-milestone corrected-history lifecycle (2026-08-13)** —
  053 v5.4 now rebuilds current canonical streak occurrences, deactivates
  unsupported topology, and re-arms exact restored occurrences; 054 v5.8
  deactivates/reactivates only exact-owned `STREAK_XP` events, rejects
  ambiguity, and rechecks before create. 066 v3.7 calculates milestone totals
  from `Count This Submission?` rows only and reconciles canonical unlock
  active state; 059 v3.6 reconciles exact `SHOT_MILESTONE` XP lifecycle while
  preserving Perfect Week behavior. The Stage I audit now reports lifecycle,
  ownership, backlink, WAS, prefix, and duplicate-key drift with executable
  read-only coverage. Production installation and proof remain blocked by
  PKG-006R and PKG-036; no Airtable change was made.
- **PKG-007 Video XP final readiness reconciliation (2026-08-13)** —
  Automation **114 v6.1** now includes `XP Events.Active?` in its exact-event
  lookup, so the actual selected-field Airtable runtime can deactivate the
  existing canonical event on inactive, unposted, or Do Not Award Video
  Feedback rather than silently treating its active state as blank. Added a
  mocked-runtime suite that executes committed 113/114 source through award,
  three-row award, replay, all three withdrawals, same-ID restoration,
  wrong-owner/duplicate fail-closed paths, last-chance concurrency recheck,
  and canonical WAS repair. The Production Schmidt packet now contains the
  source-snapshot field/type/ownership contract and explicit three-file proof.
  **No Production Airtable access, paste, trigger/configuration change, test
  record change, or XP Reward Rule change was made. All Production actions
  remain blocked until Mike releases PKG-006R and PKG-036 coordination locks.**
- **PKG-007 Production Homework XP closeout (2026-08-13)** — Mike supplied
  Production evidence for 020 v3.5, 064 v12.2, and 065 v10.1: 064/065 ON,
  071 OFF, and 063/068 absent or retired. The nine-field signature chain was
  installed; the historical initializer was correctly skipped because
  Homework Completions and XP Events were empty. Controlled Schmidt completion
  `rec3FDdZXlXjhcTj4` created 35 points in canonical event
  `recJGcfipFyKwiSC5`, automatically deactivated it on review withdrawal, and
  restored the same event on recheck with no duplicate. Evidence was supplied
  by Mike; Cursor did not access Airtable. This is not a claim that every
  Homework, progression, standings, or season path is proven. Daily-submission
  reversal remains a separate P0 item.
- **PKG-007 Homework XP reliability (2026-08-12)** — Automation 020 now fails closed on multiple canonical Homework Completion candidates. Retired 063 has an explicit runtime stop; 068 remains retired. Automation 064 v12.2 requires exactly one Enrollment/Homework/Week and re-arms Award Status Pending when existing Base XP must be restored. Automation 065 v10.1 owns exact `HOMEWORK_XP|<Homework Completion ID>` create/replay/correction, validates PHA-first ownership including canonical Item/Homework Slot, deactivates the canonical event when review, Enrollment, or PHA eligibility is withdrawn, and reuses/reactivates that same row. A documented nine-field formula/lookup signature chain automatically wakes the existing 065 slot for linked changes without polling. Multiple resubmissions remain a documented identity boundary: an existing event may retain one owned Submission; a new event with multiple candidate Submissions fails closed. Added authoritative read-only audit, offline lifecycle, and Production-only Schmidt packet. 071 email is unchanged/out of scope. No Production Airtable change or live proof is claimed.
- **Source-of-truth reconciliation (2026-08-10)** — Added the authority map,
  reconciled the Completion Master and CONTROL release metadata to merged
  PRs #137–#139, recorded the 2027 season policy and evidence boundaries, and
  marked superseded status packets as historical or planning-only. No live
  Airtable, Fillout, Make, Vercel, secret, deployment, or web implementation
  changes were made.

### Airtable

#### Fixed
- **Automation 010 v10.10 — Airtable date normalization (2026-08-16)** — `dateKey()` now
  handles Airtable `Date` objects, ISO datetimes, and `MM/DD/YYYY` local strings in
  `America/Denver`, matching 034/066 helpers. Fail-closed identity errors now list the
  specific eligibility predicates that failed instead of a generic canonical-identity
  message. v10.9 reconciliation / ownership behavior unchanged. Offline:
  `node --test tools/testing/tests/test_010_offline.mjs` ·
  `node --test tools/testing/tests/test_010_date_key.mjs` ·
  `node --test tests/pipeline/010-submission-base-multi-family.test.mjs`.
  No Production Airtable paste or XP Event writes from agents.

#### Changed
- **PKG-038 Production proof closeout (2026-08-16)** — Production proof passed for 053 v5.5, 054 v5.8, 066 v3.8, and 059 v3.6 with Early Bird counted. Charlie’s 3-day streak produced one 10-point streak XP event; the 3,000-shot 9–12 Starter milestone produced one 10-point shot-milestone XP event. Final audit v2.1 checked 10 unlocks, 5 streak occurrences, 39 XP events, and 3 weekly summaries with **issueTotal = 0**. Levels smoke test also passed: 041 queued one Enrollment and 042 assigned Current Level Beginner / Next Level Rookie Shooter. Resume after the first regular Week closes (expected May 8, 2027); do not change Early Bird dates.
- **PKG-038 achievement XP audit correction (2026-08-14)** — The read-only
  achievement XP pipeline audit is now v2.1 and derives a streak XP Event's
  expected `XP Source` from its linked Streak Occurrence → Achievement →
  `Achievement Name`, while continuing to require `XP Bucket = Streak`.
  Canonical-key, ownership, lifecycle, and WAS checks are unchanged.
- **PKG-038 Automation 066 Notes compatibility (2026-08-14)** — Automation
  066 is now v3.8 and treats `Athlete Achievement Unlocks.Notes` as optional.
  Missing Notes no longer blocks shot-milestone eligibility, source-key
  dedupe, withdrawal/restoration, or the 059 XP handoff. No Airtable change
  was made.
- **PKG-038 first-create streak handoff (2026-08-14)** — Automation 053 is
  now v5.5: new positive/restored Streak Occurrences are created without
  `Source Status = Ready for XP`, then receive that status in a separate
  record update so the native “when record is updated” 054 trigger can create
  the first exact-owned `STREAK_XP` Event. Replay and withdrawal/restoration
  preserve canonical occurrence and XP Event IDs. No Airtable change was made.
- **PKG-039 WAS and weekly-goal reliability (2026-08-13)** — Automation 031
  remains the sole create-capable Weekly Athlete Summary (WAS) owner. 101
  **v6.3** and
  118 now resolve only one existing canonical WAS; 118 filters excluded and
  inactive enrollments before strict validation. 032, 057, 058, and 076 require
  an exact active `Program Instance + Grade Band` goal with an explicitly
  numeric, settled target; zero remains valid only when that configuration is
  unique. Added the Mike-operated Production/Production field, link, paste, settlement,
  stop-condition, and rollback packet. No Airtable, email, Make, or Production
  action occurred from this repository change.
- **PKG-006R-HF-001 Automation 010 v10.8 (2026-08-13)** — Production blocker: 010 v10.7 failed on Submission `recY0o5tpqMfvlCCa` when a legitimate `HOMEWORK_XP` event was also linked. v10.8 scopes duplicate detection to Submission Base identity (`SUBMISSION_XP|{Submission ID}` and approved legacy Submission Base markers), ignores unrelated XP families, appends the Submission XP link without unlinking Homework or other events, and preserves reconciliation latch / withdrawal / restoration behavior. Added offline regression `tests/pipeline/010-submission-base-multi-family.test.mjs`. **010 is OFF in Production; paste v10.8 before re-enable.** No Production Airtable access from agents.
- **PKG-006R daily submission XP reconciliation (2026-08-13)** — Superseded baseline correction: Automation **010 v10.7** was turned **OFF** after the HF-001 multi-family lookup failure; paste and prove v10.8 before re-enabling. All 12 reconciliation fields verified installed. Lifecycle proof (backlog review, replay, withdrawal/restoration, natural-trigger runs, settled totals) remains pending. Automation **077** deleted from Airtable (retired Make/Gmail slot); GitHub source archived. `Enrollments.Progression Last Reconciled Signature` created. **041 v5.0 / 042 v4.1 paste deferred** until PKG-006R lock release. Unified operator packet: [`PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md`](./docs/deploy-checklists/PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md).
- **PKG-034 Production installation closeout (2026-08-13)** — Mike supplied
  authoritative Production evidence for Automation 101 v6.1 in
  `appn84sqPw03zEbTT`: all nine reconciliation fields exist, the sole trigger
  is `Zoom XP Reconciliation Needed? = 1` with dynamic `recordId`, and 101 is
  ON. The read-only audit checked two post-cleanup meetings and 16 XP Events
  with no Zoom XP Events, unsupported recording XP Events, duplicate rules,
  ownership, backlink, or lifecycle errors; the two missing-enrollment
  warnings are the intentionally empty future rosters. Introduction
  (`recMFP2x5LDqea9ax`) and Motivation (`recb9EjQIJVzaRpZa`) both reached
  `Needed = 0` with `reconciled_empty_roster_no_award` and no XP Event.
  Mike manually deleted two unused 2025–2026 meetings
  (`rec3ToANr5pcs2SRG`, `reczeUT0AJUWMmEOb`). This documents installation and
  empty-roster acknowledgement only; live-attendee XP, withdrawal, bonuses,
  progression, standings, and recording XP remain unproven/pending. Cursor
  did not access or modify Production.
- **PKG-034-HF-002 Automation 101 v6.1 (2026-08-13)** — Empty-roster
  reconciliation now accepts a valid unchanged Current Signature when no
  owned event data changes, writes that exact signature to Last Zoom XP
  Reconciled Signature, keeps Create XP Events false, and verifies
  Reconciliation Needed? returns to numeric 0. Exact active owned events are
  soft-deactivated before bounded formula settlement; inactive events are
  acknowledged without replacement. Duplicate and wrong-owner events fail
  closed with IDs. XP Award Status `Error` remains optional; available
  Production choices are `Pending` and `Awarded`. No Airtable, Production,
  Automation 010/041/042, schema, email, or deployment change was made.
- **PKG-036 progression configuration and bidirectional recalculation reliability (2026-08-13)** — Repository-ready Automation **041 v5.0** remains queue-only and fingerprints each Enrollment's relevant current/next ladder, XP/gate inputs, lifecycle, Program Instance, and assignment outputs without churning unrelated future configuration. Automation **042 v4.1** waits for settled formula/rollup inputs, validates the active ladder and complete year-scoped gate configuration, requires exactly one Enrollment Program Instance, rechecks configuration during the write window, verifies all assignment outputs before acknowledgement, preserves the queue on errors, and records a post-success reconciliation signature using the same relevant-ladder scope as 041. Added a read-only progression integrity audit, executable offline harness, and Production-only promotion packet. **No Production Airtable schema, automation, trigger, XP Event, email, 010, Homework, Video, 101, or 043 change has been made.**
- **PKG-034 Zoom live-attendance lifecycle reliability (2026-08-13)** —
  Automation 101 v6.0 now owns formula-backed positive, withdrawal, and
  restoration reconciliation for live attendance XP, including cumulative
  bonuses, exact ownership guards, same-event restoration, and bounded
  formula settlement. Added the read-only lifecycle audit, offline contracts,
  nine-field Production schema contract, and Schmidt-only Production packet.
  **Repository-ready only: no Production Airtable schema, automation, or
  trigger change has been made; recording XP remains deferred.**
- **PKG-007 Video Feedback XP lifecycle reliability (2026-08-12)** — Automation **113 v6.4** now requires exactly one Video Feedback Enrollment and Submission, matching Submission Enrollment, and exactly one active exact `Rule Key = VIDEO_SUBMISSION` rule before arming; legacy display-name matching and ambiguous rules fail closed, while one correctly owned inactive event can be re-armed. Automation **114 v6.1** matches only exact Video Feedback/source-key identity, deactivates the exact active event when Video Feedback is inactive, unposted, or Do Not Award, and reactivates that same record on restoration—never deletes or creates a replacement. The read-only Stage H audit now verifies exact ownership, lifecycle drift, duplicate events, and canonical WAS linkage. Offline lifecycle coverage added; Production installation/proof remains Mike-only and pending.
- **Automation 079 v2.0 — shared WELCOME and DAILY_SUBMISSION Hub dispatcher (2026-08-12)** — Adds the authoritative GitHub source for the shared dispatcher, preserving WELCOME validation/retry/replay behavior while accepting only exact `DAILY_SUBMISSION|SUBMISSIONS|<Submission Record ID>` keys whose suffix matches `Source Record ID`. It forwards stored event/template/source/recipient/payload/test-mode values without rebuilding email content; unknown events and invalid keys fail before sending. No Production Airtable or live Hub change was made.
- **Automation 076 v8.5 — Airtable single-select queue writes (2026-08-12)** — Writes `Event Type` and queue `Status` using Airtable-compatible `{ name: ... }` objects, including `DAILY_SUBMISSION`, `Draft`, `Ready`, and `Needs Review`. Preserves the v8.4 cleaned-recipient source correction and all queue/replay/readiness behavior. No Production Airtable change was made.
- **Automation 076 v8.4 — cleaned Enrollment recipient source (2026-08-12)** — Uses `Enrollments.Parent Email - Cleaned` as the required authoritative parent recipient and `Enrollments.Athlete Email - Cleaned` when applicable. Raw parent email is no longer a fallback; valid recipients are normalized and deduplicated case-insensitively. Queue identity, payload, replay protection, readiness clearing, and no-direct-send behavior remain unchanged. No Production Airtable change was made.
- **Automation 076 v8.3 — correct Production Program Instance table reference (2026-08-12)** — Changes only the configured Program Instance table from `Program Instance - Synced` to the verified Production table `Program Instance - Sync`; the Submission field `Program Instance - Synced` remains unchanged. Queue staging, deterministic replay protection, readiness guards, pending XP, and no-direct-send behavior are unchanged. Offline coverage proves the exact table name, missing-table fail-closed behavior, queue creation, and deterministic replay. No Production Airtable change was made.
- **Automation 031 v4.0 — restore authoritative Weekly Athlete Summary creation (2026-08-12)** — Restores 031's approved normal-athlete-activity find-or-create ownership when no fully valid canonical Weekly Athlete Summary exists. It creates only after a zero pre-query, writes Enrollment/Week and optional Complete status, never writes formula Summary Key, requeries after creation, and fails closed with created/conflicting IDs on residual concurrency. Formula-backed v3.9 readiness, Automation 010 XP ownership, and 076 v8.2 remain unchanged. No Production Airtable change was made.
- **Automation 031 v3.9 + Automation 076 v8.2 — authoritative shooting-mode readiness (2026-08-12)** — Both automations accept only formula-evaluated `Simple Total` or `Detailed Shooting` after trim/case normalization. 031 preserves formula-backed count readiness and final-validation ordering; 076 preserves deterministic queue staging/replay and clears the writable readiness checkbox only after successful queue create/reuse. No schema, formula, Production Airtable, Automation 010, 077, Make, Gmail, Hub, or email change was made. Production replacement remains pending; the permanent `recordId` mapping is dynamic and `rec58gdymfPKKeVRI` is temporary manual-test-only.
- **Automation 031 v3.8 — formula-backed stat-mode readiness hotfix (2026-08-12)** — Treats both `Count This Submission?` and `Submission Stat Mode` as required formula/read-only readiness inputs, normalizes their evaluated values safely, and preserves `Build Daily Email Now?` as the strictly required writable checkbox output. Permanent `recordId` mapping remains dynamic; `rec58gdymfPKKeVRI` is temporary manual-test-only evidence. No schema, formula, Production Airtable, Automation 076, Automation 077, Make, Gmail, or email change was made.
- **Automation 031 v3.7 — formula-backed counted-readiness hotfix (2026-08-12)** — Treats the existing `Count This Submission?` formula as a required read-only readiness input and preserves `isChecked()` handling for evaluated `true`/`1` values. `Submission Stat Mode` remains a `singleSelect`; `Build Daily Email Now?` remains a writable checkbox and is checked only after final summary validation. No schema, formula, Production Airtable, Automation 076, Automation 077, Make, Gmail, or email change was made. Promotion checklist: [`PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./docs/deploy-checklists/PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md).
- **Automation 031 v3.6 — controlled daily-email readiness ownership (2026-08-12)** — Independently validates counted/stat-mode readiness and checks `Build Daily Email Now?` only after canonical Weekly Athlete Summary linkage, eligible XP-link repair, and final summary validation succeed. Automation 010 remains the Submission Base XP owner; Automation 076 consumes and clears the readiness signal. No Production Airtable change has been made.
- **Automation 076 v8.1 — Daily Submission Communications Hub handoff (2026-08-12)** — Consumes the `Build Daily Email Now?` signal checked only by Automation 031 after counted/stat-mode validation, canonical summary linkage, eligible XP-link repair, and final summary validation; stages a new queue row as `Draft`, rechecks exact-key matches, marks concurrent/conflicting rows `Needs Review`, and promotes one row to `Ready`. Automation 079 remains the shared dispatcher, 077 remains OFF pending controlled Production proof, and no Production change has been made. Promotion checklist: [`PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md`](./docs/deploy-checklists/PKG-006-DAILY-SUBMISSION-HUB-HANDOFF.md).
- **Automation 001 v5.4 + Automation 042 v3.4 Production promotion (2026-08-12)** — Installed under the immediate initial-level assignment package in Production base `appn84sqPw03zEbTT`, with the existing 001 registration trigger, 042 view-entry trigger, dynamic Enrollment `recordId` mappings, and `042 - Needs Level Assignment` filters (`Level Recalc Needed?` checked and `Active?` checked) preserved. Controlled registration for `RADON Schmidt` / Enrollment `recqOR0A3RGjFjI3u` (`2026-2027`, Program Instance `Shooting Challenge | 2026-2027`, Grade Band `5-6`) completed at zero XP: Current Level `Beginner`, Next Level `Rookie Shooter`, Level Gate Rule `Level 2 Gate`, Level Status `Assigned`; 001 checked the recalculation request and 042 cleared it before the next scheduled 041 scan. Welcome email was received once with no manual recalculation intervention. Automation 041 remains v4.0 scheduled with optional `recordId` blank as the reconciliation safety net; Automation 043 remains retired/not deployed. **The next scheduled 041 idempotency observation remains pending.** Promotion evidence: [`PKG-014-immediate-initial-level-assignment-production-deploy.md`](./docs/deploy-checklists/PKG-014-immediate-initial-level-assignment-production-deploy.md).
- **Automation 115 v2.1 — controlled enrollment allowlist, PHA-first Homework, and trigger guard (2026-08-10)** — Retains `recgP9qZYjAhE7NXm`, adds `recCyFEPeATOVNlr9`, fails closed for every other enrollment, and refuses execution when `Run Test?` is unchecked. Controlled PROD Homework proof passed: scenario `recXjRRg8n0NodziZ` produced `rec7e5X7QaVDZLpiL` and `recbbO685zSEuyzM9` from two explicit requests. Each explicit request intentionally creates one new Submission; 115 is not an idempotent Submission processor. Offline: `node --test tools/testing/tests/test_115_offline.mjs` (updated focused coverage).
- **Automation 067 v3.4 — linked Homework Completion fail-closed (2026-08-10)** — When a Final Reflection Quiz Submission already links a Homework Completion, validate Enrollment + Week + Homework Library + PHA exactly (**exactly one link** per identity field); populate blank PHA on legacy exact matches only; fail closed on mismatch, multiple links, or duplicate Enrollment+Week+Library matches (before and after concurrency recheck). `findCompletionMatch()` ignores ambiguous multi-link completions. Controlled PROD proof passed: quiz `recAO1S9TdZHupl7t` created/reused Homework Completion `reckpeVV9G3M13j5U`, including idempotency. This does not claim Homework XP or full downstream completion. Offline: `node --test tests/homework/automation-067-pha-direct.test.js` (**21 tests**). Promotion: [`pha-first-homework-package-promotion.md`](./docs/deploy-checklists/pha-first-homework-package-promotion.md).
- **Automations 005 v5.3 + 020 v3.5 + 067 v3.4 + 115 v2.0 — PHA-first homework package (2026-08-10)** — `Submissions.Homework Name 1/2` are **Program Homework Assignment record IDs** (not Homework Library IDs). **005** loads each PHA directly, validates PI + Week + Slot + Active + exactly one `Homework Assignment` link, outputs `homework1PhaId` / `homework1LibraryId` (and HW2 equivalents). **020** writes `HC.Homework` = library ID and `HC.Program Homework Assignment` = PHA ID with enrollment idempotency. **067** resolves HW17 PI-first from active PHA rows, writes PHA to parent Submission and both IDs on Homework Completion; **v3.4** adds linked-HC validation and duplicate guards. **115** ETF Homework scenarios require Testing Scenarios.Homework Assignment = PHA RID; fail closed on library-only links. **009** unchanged. Grade Band is not scheduling identity. Offline: `node --test tests/homework/automation-005-020-pha-direct.test.js` · `node --test tests/homework/automation-067-pha-direct.test.js` · `node --test tools/testing/tests/test_115_offline.mjs` · `node --test tools/testing/tests/test_homework_architecture_offline.mjs`. Docs: [`HOMEWORK-FILLOUT-INTEGRATION.md`](./docs/prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md) · [`HOMEWORK-LIBRARY-ARCHITECTURE-DEPENDENCY-REPORT.md`](./docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-ARCHITECTURE-DEPENDENCY-REPORT.md) · [`pha-first-homework-package-promotion.md`](./docs/deploy-checklists/pha-first-homework-package-promotion.md). **PROD paste pending** (005 → 020 → 067 → 115). Legacy library-linked Submissions require controlled backfill — no runtime fallback.
- **Homework Library architecture cleanup (2026-08-09)** — `FBC Curriculum - SYNC` → **Homework Library** (content-only); **Program Homework Assignments** sole scheduling authority; JIT PHA only (no 90-row seed). **005 v5.1** (Activity Date Week + strict PHA validate), **033 v4.1** (PHA-only, exact PI required), **067 v3.1** (HW17 Week from PHA HW1 slot). Obsolete `seed_pha_from_curriculum.mjs` fail-fast. Docs: [`HOMEWORK-LIBRARY-ARCHITECTURE-DEPENDENCY-REPORT.md`](./docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-ARCHITECTURE-DEPENDENCY-REPORT.md) · [`HOMEWORK-LIBRARY-FIELD-MATRIX.md`](./docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-FIELD-MATRIX.md) · [`HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md`](./docs/prod-completion/2026-08-09/HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md) · [`HOMEWORK-FILLOUT-INTEGRATION.md`](./docs/prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md). **Superseded for 005/020 intake by v5.3/v3.5 above.**
- **Automation 042 v3.3 school-year-aware gate-rule selection (2026-08-08)** — Reads Enrollment `School Year` and Level Gate Rules `School Year / Rule Set`; prefers an exact active-year rule, permits only explicit shared/default fallback, ignores inactive candidates, and fails closed on duplicate/malformed/prior-year-only candidates. Offline tests cover selection, fallback, duplicate rejection, inactive handling, and replay determinism. **Production paste and controlled Schmidt proof pending.** [`042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`](./airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js) · [`Issue #97 deploy checklist`](./docs/deploy-checklists/97-automation-042-school-year-gate-rule-selection.md)
- **Automation 031 v3.5 malformed-candidate resilience repair (2026-08-07)** — Validate Submission `Enrollment + Week + Program Instance + canonical Summary Key`, ignore and log malformed unrelated candidates, fail closed when zero or multiple fully valid candidates exist, never create a summary, remove the source Submission from a stale summary, and repair only non-Submission-Base `XP Events -> Weekly Athlete Summary` links. Automation 010 exclusively owns Submission Base events identified by the structured `XP Source` option ID `selZw4nOkwMJCgGyR`. Offline: `node --test tools/testing/tests/test_031_offline.mjs` (**PASS**). **Airtable paste unconfirmed; no controlled PROD live test performed.** [`031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`](./airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js) · [`AUTOMATION-031-PASTE-AND-TEST-PACKET.md`](./docs/prod-completion/2026-08-07/AUTOMATION-031-PASTE-AND-TEST-PACKET.md).
- **Automation 023 v3.1 (2026-08-06)** — Derive Program Instance from `Submission.Week → Weeks.Program Instance` before the single-active-Enrollment fallback. Match priority: existing valid Enrollment → Fillout Enrollment Id → native Submission PI → Week PI → School Year → safe fallback only when no PI/Year context. Live PROD v3.0 test was **PARTIAL** (`single-active-enrollment-safe-fallback`); Week path **NOT YET VALIDATED**. Do **not** paste/start 053 until Week-derived path PASSes. Offline: `node --test tools/testing/tests/test_023_offline.mjs`. [`023-…js`](./airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js) · Paste: [`2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md`](./docs/deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md).
- **Automation 010 v10.6 replay-safety repair (2026-08-07)** — Validate Submission `Enrollment + Week + Program Instance + canonical Summary Key`, repair Submission and Submission Base XP Event links only after full validation, and fail closed without partial writes. Offline: `node --test tools/testing/tests/test_010_offline.mjs` (**PASS**). **Airtable paste unconfirmed; no controlled PROD live test performed.** [`010-submission-intake-create-xp-event.js`](./airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js) · [`AUTOMATION-010-XP-WRITER-RECONCILIATION.md`](./docs/prod-completion/2026-08-07/AUTOMATION-010-XP-WRITER-RECONCILIATION.md).
- **Program Instance isolation package (2026-08-06)** — Scope Enrollment/Week matching and Week date helpers by Program Instance so multi-year Active records cannot collide. **005 v4.1** (Activity Date fallback: Enrollment → PI → Weeks) — **PROD pasted + Live Tested PASS** on `recElDBcFvuE6jWwc` → Early Bird `recWeVrSabnsYaHc2`. **023 v3.1** (Week→PI; replaces v3.0), **053 5.3**, **066 v3.5**, **118/119 v1.7**, **043 v2.1** — repository updated; remaining PROD paste order 023→053→066→118→119→043-if-Live. Package: [`PROGRAM-INSTANCE-ISOLATION-PACKAGE.md`](./docs/prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md) · Paste: [`2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md`](./docs/deploy-checklists/2026-08-06-PROGRAM-INSTANCE-ISOLATION-PASTE.md).
- **Repository finalization 2026-08-06** — Merged PR **#88** (Automation **066 v3.4** fields contract). Closed PR **#87** as superseded by post-merge overnight summary. Operator-attested: **033 v3.3 pasted**, **059 trigger corrected**. Remaining Mike pastes: **066 v3.4**, **020 v3.2.0**. Checklist: [`2026-08-06-FINAL-AIRTABLE-PASTE-AND-VERIFY.md`](./docs/deploy-checklists/2026-08-06-FINAL-AIRTABLE-PASTE-AND-VERIFY.md). Report: [`2026-08-06-REPOSITORY-DEPLOYMENT-FINAL-RECONCILIATION.md`](./docs/overnight/2026-08-06-REPOSITORY-DEPLOYMENT-FINAL-RECONCILIATION.md).
- **Automation 066 v3.4 (2026-08-06)** — Fix live `createRecordsAsync` failure: callers pushed raw unlock field maps; multi-create path required `{ fields: {...} }`. Defensive `createRecordsInBatches` accepts either shape and always sends Airtable-wrapped records; diagnostic JSON log; offline regression `lib/066-create-records-batch.test.js`. **Natural path not Live Tested** until Mike pastes entire script and reruns on `recCyFEPeATOVNlr9` (expect existing unlocks linked/skipped — no duplicate milestone XP). [`066-…js`](./airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js).

#### Added
- **Communications Hub WELCOME email integration docs (2026-08-08)** — Documented live-proven Automation 079 handoff to Communications Hub; queue contract is Event Type, Template Key, Handoff Key, Source Table/ID, Recipients JSON, Payload JSON (`athleteName`, `programName`, `message`), and **Test Mode?** — **not** subject, HTML, plain-text, or `sendMode` (Hub renders from `templateKey: WELCOME`). Make.com welcome send remains **OFF**. [`docs/communications-hub/WELCOME-EMAIL-INTEGRATION.md`](./docs/communications-hub/WELCOME-EMAIL-INTEGRATION.md) · [`WELCOME-EMAIL-ACTIVATION-CHECKLIST.md`](./docs/deploy-checklists/WELCOME-EMAIL-ACTIVATION-CHECKLIST.md) · [`WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md`](./docs/deploy-checklists/WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md) · Completion Master §9M.
- **GitHub Issue #116 full production-readiness audit (2026-08-08)** — Added the dated truth table, ranked blockers, shortest execution path, exact Airtable/Make UI-only action packet, stale-queue removals, and evidence boundaries. Repository contract assertions now track current 031/118/119 versions; no UI-only state is represented as installed or live-tested.
- **Overnight Agent 2 foundation package (2026-08-05)** — Live PROD: Grade Band reassign on `recCyFEPeATOVNlr9` (002 → **3-4**); fixed `XP Date Resolved` SWITCH (`Submission Base`→`Shooting Base`); Schmidt streak inventory; 8 Shot Milestone unlocks→059 XP (310 pts, idempotent); Gate Blocked proof (Sub 9/10, Vid 5/6). Evidence: [`docs/testing/evidence/2026-08-05-agent2-foundation/`](./docs/testing/evidence/2026-08-05-agent2-foundation/). Tools: `tools/testing/agent2_*.mjs`. SC-023/027/029/048/060/061/075/076/079 → Live Tested *(unlock/XP via backfill — 066 natural path later failed live and is not natural-path Live Tested)*.
- **Active automation unloadData compat pack (2026-08-05)** — Hardened bare `QueryResult.unloadData()` cleanup across **deployed** active scripts **031, 035, 042, 057, 114, 118, 119** using `unloadQuerySafe` + `finally` (same pattern as 001/002). Earlier drafts incorrectly listed repository Stage 17 orchestrator/117a/117c as PROD paste targets — corrected in the Automation 117 ownership reconcile (those paths are design alternatives; live PROD 117 is email-only with no unloadData). Offline: `node tests/airtable-runtime/active-automation-unload-compat.test.js`. **Built in Repository — PROD paste + live tests still required for the seven paste targets.** [`active-automation-unloadData-compat.md`](./docs/deploy-checklists/active-automation-unloadData-compat.md).
- **Automation 002 v8.2 unloadData runtime fix (2026-08-05)** — Guard `gradeBandQuery.unloadData()` behind `typeof … === "function"` via `unloadQuerySafe` + `finally`. **Live Tested in PROD** — Agent 2 cleared Grade Band on `recCyFEPeATOVNlr9` and 002 reassigned **3-4** within ~6s. Offline: `node tests/enrollment-intake/automation-002-unload-compat.test.js`. [`002-…js`](./airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js) · [`002-unloadData-runtime-fix.md`](./docs/deploy-checklists/002-unloadData-runtime-fix.md).
- **Automation 001 v5.2 unloadData runtime fix (2026-08-05)** — Guard `queryResult.unloadData()` behind `typeof … === "function"` via `unloadQuerySafe` so missing Airtable Scripting APIs cannot fail enrollment after a successful athlete match/update. Triggered by PROD enrollment `recQP4N5acTdK40uZ` (Testing Schmidt 2026–27). **Built in Repository — PROD paste + live rerun still required.** Offline: `node tests/enrollment-intake/automation-001-unload-compat.test.js`. [`001-…js`](./airtable/automations/shooting-challenge/001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js).
- **SC-009 / SC-101 PROD closeout (2026-08-05)** — Mike pasted **070a v4.5** into PROD; operator-attested Schmidt image rerun (Make→Lambda→Airtable writeback). SC-009 + SC-101 → **Complete**; SC-095 → Live Tested. Credential rotation deferred until go-live. Evidence closeout section in [`docs/testing/evidence/2026-08-04-sc-009-photo-homework/`](./docs/testing/evidence/2026-08-04-sc-009-photo-homework/).
- **SC-003 Testing Views short-name aliases (2026-08-05)** — Accept PROD section `02 TESTING` short view names; `--require-installed` PASS; SC-003 → Live Tested. PR #71.
- **SC-009 photo homework E2E (2026-08-04)** — Live PROD Schmidt PNG+JPG path: 009/020 → Lambda `homework_completion` → private S3 writeback → Reviewer File URL → coach satisfactory → one Homework XP. Evidence: [`docs/testing/evidence/2026-08-04-sc-009-photo-homework/`](./docs/testing/evidence/2026-08-04-sc-009-photo-homework/). Deploy notes: [`SC-009-photo-homework-prod.md`](./docs/deploy-checklists/SC-009-photo-homework-prod.md).
- **SC-007 / SC-008 reliability proof packs (2026-08-04)** — Offline idempotency + failure-path suites (`tools/testing/sc-007-008/`); `evaluateFinalUploadSuccessContract`; PROD Schmidt evidence (XP inventory, upload contract on `recaXBfjeeu3bcm0t`, private S3 403, reviewer 302). Runbook: [`SC-007-008-RELIABILITY-RUNBOOK.md`](./docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md). Evidence: [`docs/testing/evidence/2026-08-04-sc-007-008-reliability/`](./docs/testing/evidence/2026-08-04-sc-007-008-reliability/).
- **SC-150 private reviewer file links (2026-08-04)** — Lambda `127si-upload-asset` gains `GET /file/{recordId}?token=` → short-lived S3 presigned redirect; upload success writes/preserves `Reviewer Access Token` and read-back verifies `Upload Status=Uploaded`. S3 stays private; clickable field is `Reviewer File URL` (formula). **Complete** — PROD `-CodeOnly` deploy `2026-08-04T23:57:36Z`; Interface open PASS on `recaXBfjeeu3bcm0t`. Credential rotation deferred until go-live (Mike 2026-08-05). [`SC-150-prod-reviewer-file-links.md`](./docs/deploy-checklists/SC-150-prod-reviewer-file-links.md) · `lambda/upload-asset/`.
- **Agent 1 repository completion hardening (2026-07-27)** — Offline contract helpers (`normalizeLinkedRecordIds`, `detectDuplicateActiveRewardRuleKeys`, `classifyWeeklyEmailWebhookResponse`, `planHomeworkMultiAssetCompletion`); Agent 1 hardening tests; scenario fixtures **SCN-030–043**; scenario catalog validator; completion-master integrity linter; truth + content audits. **No PROD paste. Statuses not promoted to Installed / Live Tested / Complete.** [`REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md`](./docs/audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md) · [`tools/testing/check-completion-master-integrity.js`](./tools/testing/check-completion-master-integrity.js).
- **035 Weekly Threshold XP writer v1.1 (2026-07-25)** — SC-049 / XP-D1 rebuild follow-through: Source Key `WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}` plus semantic Enrollment+Week+XP Source dedupe for unknown legacy keys; skip inactive enrollments; Grade Band link-ID preference; targeted Source Key recheck (no per-create full-table scan). Offline contracts + Agent 4 suite + deploy checklist + Schmidt live-proof pack. **Ready for PROD Paste — not installed / not live-tested.** [`035-…js`](./airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js) · [`035-weekly-threshold-xp-v1.1.md`](./docs/deploy-checklists/035-weekly-threshold-xp-v1.1.md) · [`SCHMIDT-LIVE-PROOF-PR43-THRESHOLD-057.md`](./docs/testing/SCHMIDT-LIVE-PROOF-PR43-THRESHOLD-057.md).
- **035 Weekly Threshold XP writer v1.0 (2026-07-25)** — Initial rebuild (superseded by v1.1 for paste). [`035-weekly-threshold-xp-v1.0.md`](./docs/deploy-checklists/035-weekly-threshold-xp-v1.0.md).
- **Testing scenario fixtures SCN-021–026 (2026-07-25)** — HW / Video / Zoom / Weekly Threshold catalog rows for SC-002; SCN-025/026 exact Mike steps. [`docs/testing/scenarios/`](./docs/testing/scenarios/).
- **SC-041 Weekly Email Retry SOP (2026-07-25)** — Contract helpers for 074 webhook success/failure field plans + operator retry decision matrix; offline tests assert 074 never clears `Send to Make?` on webhook failure and never writes Sent?; **SCN-029** fixture + SOP (renumbered to avoid quiz SCN-027/028). **Built in Repository** — Schmidt live failure→recovery still open. [`WEEKLY-EMAIL-RETRY-SOP.md`](./docs/next-wave/was-email/WEEKLY-EMAIL-RETRY-SOP.md) · [`scn-029-…json`](./docs/testing/scenarios/scn-029-weekly-email-retry-after-make-failure.json).

#### Changed
- **Overnight Agent 4 ops / launch readiness (2026-08-05)** — Offline Automation **117** email-to-Make handoff suite **7/7 PASS**; read-only email readiness + automation inventory drift audits (0 emails sent); RCC sanitized PROD export + CLI; executable runbooks (117 go-live, next-season reset/startup, RCC OMNI views, SC-041 retry). Evidence: [`docs/testing/evidence/2026-08-05-agent4-ops/`](./docs/testing/evidence/2026-08-05-agent4-ops/). **No live Gmail claims.**
- **PROD: Perfect Week 058→059 chain (Agent 3, 2026-08-05)** — CASE-01 unlock `recALZFQNL3XicEOX` + XP `recMdcI5lN8gJ6830` (100, Source Key `PERFECT_WEEK|{enr}|{week}`); idempotent. **059 auto-fire blocked** by Shot Milestone trigger filter — UI fix runbook [`059-perfect-week-trigger-coverage.md`](./docs/deploy-checklists/059-perfect-week-trigger-coverage.md). Achievements Perfect Week + Shot Milestone `Visible?`=true. SC-028/SC-077 → Live Tested (not Complete). Evidence: [`docs/testing/evidence/2026-08-05-agent3-perfect-week/`](./docs/testing/evidence/2026-08-05-agent3-perfect-week/).
- **Overnight Agent 1 — MVP homework / PHA / SC-016 (2026-08-05)** — PROD PHA operator model (descriptions, Operator Status, Operator Notes, Completions Count); seeded **92** active schedule rows from curriculum Week links × grade bands; **033 v3.3** + **020 v3.2.0** in repo (paste pending); SC-016 duplicate consolidation (4 extras deleted) + enrollment-scoped identity; CASE-01 Perfect Week homework realigned **2/2**. Evidence: [`docs/testing/evidence/2026-08-05-agent1-homework/`](./docs/testing/evidence/2026-08-05-agent1-homework/). Operator guide: [`program-homework-assignments-operator-guide.md`](./docs/deploy-checklists/program-homework-assignments-operator-guide.md).
- **PROD: Program Homework Assignments MVP (2026-08-05)** — Additive junction table `Program Homework Assignments` (`tblhA3maf7xOa8EUS`) schedules reusable `FBC Curriculum - SYNC` by Program Instance + Week + Grade Band + Slot without editing library Week links. HC gains `Program Homework Assignment` link. Repo: **033 v3.3** (PHA-first + legacy fallback), **020 v3.2.0** (enrollment identity + PHA link). Perfect Week CASE-01 homework proof: assigned/satisfactory **2/2**. **033/020 PROD paste still required.** Separate from Perfect Week PR #81. [`program-homework-assignments-mvp.md`](./docs/deploy-checklists/program-homework-assignments-mvp.md) · [`program-homework-assignments-operator-guide.md`](./docs/deploy-checklists/program-homework-assignments-operator-guide.md).
- **PROD: Perfect Week gated test timestamp path (2026-08-05)** — Tightly gated fixture mechanism (not athlete-facing): `Submitted Same Day?` may use `Perfect Week Test Submitted At` only when Enrollment is exactly `recCyFEPeATOVNlr9` **and** `Perfect Week Test Record?` is checked **and** Test Submitted At is populated; otherwise unchanged `Submitted At` (`CREATED_TIME()`) vs Activity Date. Added Enrollment RID lookup; CASE-01 seven-day fixtures created today; dependency audit + rollback docs; verifier security gates. **057 logic unchanged.** Automation 057 still Pending on CASE-01 WAS until Mike Run/Test. Do **not** mark Perfect Week Complete. [`PERFECT-WEEK-FIXTURE-METHOD.md`](./docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md) · [`PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md`](./docs/testing/perfect-week/PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md).
- **Docs: Perfect Week fixture method = live same-day calendar (2026-08-05)** — PROD pilot `recxbwkZpSJZ5eiqA` proved historical Activity Dates get `Submitted Same Day?=0` / Countable=0 because `Submitted At`=`CREATED_TIME()`. `Perfect Week Test Override?` is inert (no formula / not read by 057). Automation 057 has no test-mode path. Revised Omni prompt, fixture spec, expected results, verifier, and runbook for Batch A (immediate) + Batch B (Sun 2026-08-09→Sat 2026-08-15). **No 057 logic change.** [`PERFECT-WEEK-FIXTURE-METHOD.md`](./docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md).
- **Docs: Automation 057 v1.5 Perfect Week admin correction + PROD fixtures (2026-08-05)** — PROD 057 confirmed **v1.5** (enabled/running); repository script matches. Do **not** downgrade to v1.4. SC-021 → Installed in PROD; SC-028/077/091 remain Installed (verification open — not Complete). Added deterministic fixture package + Omni prompt + read-only verifier. [`057-perfect-week-v1.5-live-verification.md`](./docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md) · [`docs/testing/perfect-week/`](./docs/testing/perfect-week/) · `tools/testing/verify_perfect_week_fixtures.mjs`.
- **Docs closeout: Automation 071 v3.5 + SC-003 Complete (2026-08-05)** — Operator-attested PROD 071 live path on HC `recH71jEgjxzLup6F` (Reviewer File URL → Make → Gmail → Sent? by Make; no duplicate). SC-017 → **Complete**; SC-003 → **Complete** (testing views verifier 10/10). SC-045 remains Installed (homework email proven; video/welcome/117f still open). Dashboard recount. *(Historical next-package note to paste 057 v1.4 is superseded — PROD is on v1.5.)* [`071-homework-feedback-email-closeout.md`](./docs/deploy-checklists/071-homework-feedback-email-closeout.md) · [`NEXT-PACKAGE-AFTER-071-SC003.md`](./docs/prod-completion/2026-08-05/NEXT-PACKAGE-AFTER-071-SC003.md).
- **Automation 071 v3.5 Reviewer File URL parent email (2026-08-05)** — Homework feedback email resolves parent-facing asset links as **`Reviewer File URL` → Google Drive View URL → Google Drive File URL** (AWS/Lambda primary; Drive historical fallback). Display label: Original File Name → Asset Label → “View submitted homework”. Does not use Canonical/S3 keys; does not mark Parent Feedback Sent? (Make-owned after Gmail). Unblocks PROD HC `recH71jEgjxzLup6F`. **Complete** after operator-attested PROD paste + live send 2026-08-05 (see closeout above). Offline: `node tests/homework/automation-071-reviewer-file-url.test.js`. Runbook: [`071-homework-feedback-email-closeout.md`](./docs/deploy-checklists/071-homework-feedback-email-closeout.md).
- **Automation 117 ownership reconcile (2026-08-05)** — PROD Automation **117** is `Send Recording Approval Email to Make` only (`117-zoom-send-recording-approval-email-to-make.js` v1.1). Stage 17 orchestrator + modular 117a–e moved to `_design-alternatives/stage17-modular-reference/`. Corrected unloadData paste pack so operators never paste the orchestrator over PROD 117. Make id **117f** remains payload-only (no Airtable slot). Offline: `node tests/zoom/automation-117-recording-approval-email.test.js`. Runbook: [`117-zoom-recording-approval-email.md`](./docs/deploy-checklists/117-zoom-recording-approval-email.md).
- **070a v4.5 (2026-08-04 / paste 2026-08-05)** — Skip already-uploaded when Canonical File URL or Uploaded+Storage Key present (keep Drive legacy skip). **Pasted into PROD Airtable 2026-08-05 (Mike).** [`070a-…js`](./airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js).
- **PROD formula gates (2026-08-04)** — `Writeback Complete?` uses Canonical/S3 fields (not Google Drive); HC `Upload Ready?` accepts linked assets uploaded (plus Fillout quiz / legacy attachment). Helpers: `tools/airtable/fix_asset_writeback_complete_formula.py`, `fix_homework_upload_ready_formula.py`.
- **classifyWeeklyEmailWebhookResponse null-status fix (2026-08-04)** — Missing/`null` HTTP status no longer coerces via `Number(null)===0` into a non-retryable fake status; stays retryable `unknown_status` (SC-008). [`v2-engine-contracts.js`](./airtable/automations/shooting-challenge/lib/v2-engine-contracts.js).
- **035 Weekly Threshold XP writer v1.2 (2026-08-03)** — Preserve full v1.1 implementation; fix percent compare to use Airtable raw ratio directly (`1` = 100%, `83.7` = 8,370%). Removes incorrect `raw > 3 ? raw / 100` heuristic. Schmidt PROD: WAS `rechWp330MqSgRWzN` first-award **3 created**, duplicate rerun **0 created / 3 skipped**. Automation remains **OFF** pending merged-source reconciliation. [`035-…js`](./airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js) · [`035-weekly-threshold-xp-v1.2.md`](./docs/deploy-checklists/035-weekly-threshold-xp-v1.2.md) · [`2026-08-03-035-v1.2-schmidt-live-proof.md`](./docs/testing/evidence/2026-08-03-035-v1.2-schmidt-live-proof.md).
- **057 Perfect Week date keys v1.4 (2026-07-25)** — Canonical implementation in PR #43: `getDateKeyFromDateOnly` uses America/Denver via Intl (no UTC ISO slice). Deploy checklist + Denver/DST offline boundary tests. **Ready for PROD Paste** (MIKE-ACTIONS #2). SC-021. [`057-perfect-week-denver-v1.4.md`](./docs/deploy-checklists/057-perfect-week-denver-v1.4.md).
- **PROD completion pack (2026-07-25)** — **067** headers/docs aligned to approved Option B attachment-less path; PROD install + Schmidt protocol at [`067-OPTION-B-PROD-INSTALL.md`](./docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md); quiz fixtures SCN-027/028; public `/shoot` smoke evidence + 057 paste runbook (points at PR #43 code) + Airtable API access blocker under [`docs/prod-completion/2026-07-25/`](./docs/prod-completion/2026-07-25/). Live Schmidt mutation tests still require env PAT.
- **118 v1.5 season Live arming (2026-07-24)** — **118** no longer hardcodes WAS `sendMode=Test` or refuses `sendMode=Live` when `dryRun=false`; still refuses Live+`includeSchmidt`. **119 v1.5** is repo version/doc/CONFIG alignment only (no arming-logic change) — paste **118** for Live season; 119 paste optional. PROD schedules verified **ON**. See [`MIKE-ACTIONS.md`](./docs/next-wave/data-model/MIKE-ACTIONS.md).
- **Agent 2 data-model continuation (2026-07-24)** — Week Key vs Week Code vs Week Name separated; Make Live owns Sent? + Make Send Status + **Weekly Summary Sent At**; WAS creators / levels / HC identity / Fillout checklist docs. Pack: [`docs/next-wave/data-model/`](./docs/next-wave/data-model/).
- **Stale version expectations closed (2026-07-24)** — Offline gate now expects **066 v3.3** (was v3.2); Stage 17 ETF source guard expects **115 SCRIPT v1.9** (PROD may still run pasted v1.8). PROJECT_STATE H-002 / standards rows updated to v3.3.

#### Added
- **Season Launch Control System (2026-07-24)** — Extends Challenge-Year engine with fail-closed launch lifecycle (`Web Validated`; Softr Obsolete / Not Used), launch CLI, season export validators, week import package, automation hard-code audit, Fillout/Make/`/shoot` packages, Season Launch dashboard view specs, dry-run admin scripts, Schmidt test + go-live/rollback. Season findings call canonical RCC `buildIssue` — does not vendor a second RCC tree. Preserves `118→072→119→074→Make Bulk Email May 18` and **118/119 ON**. Status: **Built in Repository**. Docs: [`SEASON-LAUNCH-CONTROL.md`](./docs/challenge-year/SEASON-LAUNCH-CONTROL.md).
- **Softr reclassified Obsolete (2026-07-24)** — Softr is Not Used for Shooting Challenge. Active front end is `/shoot` ([`WEB-SEASON-ACTIVATION.md`](./docs/challenge-year/WEB-SEASON-ACTIVATION.md)). SC-114 → Superseded.
- **Reliability Command Center (2026-07-24)** — Repository workflow-health framework (SC-147): normalized health statuses, shared helpers (`lib/reliability-command-center/`), offline audit CLI + dry-run repair preview (`tools/reliability-command-center/`), synthetic fixtures/tests, Airtable view/Interface **specification** (not installed), MVP production install packet using existing PROD fields (`Weekly Summary Sent At` + `Weekly Email Sent At`). Aligned with go-live: **118/119 ON**, 072/074 ON, 074 Live writeback. Complements Agent 1+2 reliability audit docs (does not replace them). Completion master total **147**. Status: **Built / Tested** (repo); views/Interface **Designed** — not Installed / not Live Tested. Docs: [`docs/reliability-command-center/`](./docs/reliability-command-center/README.md) · [`MVP-PRODUCTION-RELEASE.md`](./docs/reliability-command-center/MVP-PRODUCTION-RELEASE.md).
- **Agent 5 lead reconciliation (2026-07-24)** — Integrated Agent 4 QC suite (`c3bbd96`); reconciled Agents 1–4 vs go-live; discrepancy table; weekly-email operational record; cleaned TODO/backlog/next wave; corrected remaining stale OFF claims in Agent 4 QC + MIKE-ACTIONS-NEXT. No Airtable/Make mutations. [`agent5-lead-reconciliation-2026-07-24/`](./docs/next-wave/agent5-lead-reconciliation-2026-07-24/).
- **Agent 4 QC + Live/Test sendMode regression (2026-07-24)** — Offline suite/docs for weekly-email Live writeback ownership, XP dedupe matrix, Perfect Week edges. [`docs/testing/agent4-qc/`](./docs/testing/agent4-qc/) · `tools/testing/run-agent4-suite.js`.
- **Go-live integration + promotion lead (2026-07-24)** — Merged accepted agent branches; corrected stale **118/119 OFF** claims to verified **ON**; updated completion master + architecture + ownership; go-live readiness report. No Airtable UI mutations from agent. [`GO-LIVE-READINESS-2026-07-24.md`](./docs/next-wave/go-live/GO-LIVE-READINESS-2026-07-24.md).
- **Agent 1+2 reliability + data-model audit (2026-07-24)** — Docs/tests only: automation trust bands, input/dedupe/ownership audits, ranked repairs, table/field map refresh, Mike actions. No Airtable/Make mutations. [`reliability-audit-2026-07-24/REPORT.md`](./docs/next-wave/reliability-audit-2026-07-24/REPORT.md). Stale OFF schedule claims corrected in go-live integration.

#### Changed
- **074 PROD sendMode Live + Make writeback verified (2026-07-24)** — Fixed automation input `sendMode=Test` forced Make’s Test branch (email OK, no Sent? writeback). After **`sendMode=Live`**, Live writeback PASS: `Weekly Email Sent?` checked, `Make Send Status=Sent`, **`Weekly Summary Sent At`** populated. **PROD rule:** 074 must use `sendMode=Live` or blank (inherit WAS `sendMode`) — never fixed Test. Docs + 074 docblock note; SC-040 → Live Tested. Architecture: [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](./docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md).
- **Weekly WAS email chain verified in PROD (2026-07-24)** — Final flow documented as `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail`. Empty-week **`send_short`** enforced in **072 v4.0** (`built_short_empty_week`); **119** arms Send only; **074** posts webhook; Make owns Live Sent? writeback. **118/119 schedules ON** (Sun 5:00 / 10:00 AM Denver; verified-prod); 072+074+Make **ON**.
- **072 v4.0 empty-week policy enforcement (2026-07-24)** — SC-035 `send_short` builds a concise no-activity reminder; `send_normal` keeps the full empty-week report; `suppress` leaves packages not send-ready. Non-empty weeks still get the full summary. **118 v1.5** required for Live season arming; **119 v1.5** docs/CONFIG only (default `send_short` unchanged). No webhook/email from 072.

### Web

#### Changed
- **Program Instance isolation for website queries (2026-08-06)** — Optional `AIRTABLE_ACTIVE_SCHOOL_YEAR` scopes leaderboard fallback + public profile Enrollment selection; leaderboard fields include `Program Instance Name Only`. Prefer Web views already filtered to the active season. [`web/lib/airtable/queries.ts`](./web/lib/airtable/queries.ts).

#### Added
- **Public athlete profiles / SC-111 (2026-08-04)** — `/shoot/athletes/[slug]` loads allowlisted public Enrollment data when `Public Profile Enabled` + `Public Profile Slug` match active standings rules; duplicate enabled slugs fail closed to not-found. Sitewide `AthleteProfileLink` on homepage standings, leaderboard, and public display. Privacy allowlist excludes contact/payment/internal IDs. Playwright `athlete-profile.spec.ts` + evidence under `docs/testing/evidence/athlete-profiles-2026-08-04/`.

#### Changed
- **Official landing domain → Fairfield Basketball Club (2026-08-04)** — Production defaults, logo/header/footer home links, metadata `SITE_URL`, and `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` examples now use `https://www.fairfieldbasketballclub.com` (Shooting Challenge remains `/shoot`). `resolveLandingUrl` / `resolveSiteUrl` rewrite legacy `hoopchallenges.com` / `hooopchallenges.com` and malformed/missing env values to the Fairfield origin. Vitest + Playwright coverage for logo/footer links, env normalization, `/shoot` path integrity, and internal nav not bouncing to the landing site. Historical docs/evidence that still mention Hoop Challenges are left as archives unless they describe active config. **SC-149.**

#### Added
- **Mobile usability + accessibility package / SC-148 (2026-08-04)** — Focused `/shoot` improvements without redesign: accessible mobile nav dialog (Escape, focus return, registration CTAs pinned), skip-to-content, 44px tap targets, overflow protection (narrow — not hiding tables/leaderboards), stronger focus rings, footer/back text-link distinction, clearer loading/empty/error states, how-it-works `h3` order. Playwright `mobile-a11y.spec.ts` covers 375/768/1440. No Airtable/XP/business-rule changes.
- **Production smoke package (2026-08-04)** — Playwright `tests/production-smoke.spec.ts` + helpers, HTTP smoke `scripts/http-smoke.mjs`, npm scripts (`test:smoke`, `test:smoke:prod`, `test:smoke:http*`), and runbook [`docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`](./docs/testing/PRODUCTION-SMOKE-RUNBOOK.md). Read-only coverage for `/shoot` routes, Fillout/landing URLs, assets, basePath duplication, console errors, mobile/desktop, and 404 behavior. **SC-118** — Built in Repository; smoke suite successfully executed against current PROD.
- **Homepage registration gateway (2026-08-03)** — Public `/shoot` home adds a registration section directly below the hero (before “Why it works”) with branded Fillout CTAs: Player Registration (`…/shoot-playerregistration`) and Daily Submissions (`…/shoot-dailysubmissions`). Canonical links in `web/lib/registration.ts`; reusable `RegistrationGateway` component; Vitest + Playwright coverage for URLs, CTA labels, `target=_blank` / `rel=noopener noreferrer`, accessible new-tab labels, and section placement. No Airtable/XP/auth/dashboard changes.

#### Fixed
- **Detail not-found pages missing h1 (2026-07-27)** — After dual-h1 empty-state fix, DetailPageShell not-found views used `h2` with no page `h1`. `EmptyState` now supports `titleAs="h1"` for missing homework/levels/tutorials/zoom/articles/shoutouts detail routes.
- **Browser QA hardening (2026-07-25)** — Favicon/metadata now emit `/shoot/favicon.*` (was root `/favicon.png` 404); Airtable long-text Markdown (`**bold**`, italics, safe links) renders in `RichContent`; expired Airtable cover URLs (HTTP 410) fall back via `SafeExternalImage` on Zoom/Homework/Levels; empty/error states use `h2` (no dual `h1`); `resolveLandingUrl()` corrects live typo `hooopchallenges.com` → `www.hoopchallenges.com` (still fix Vercel `NEXT_PUBLIC_LANDING_URL`); default season label no longer hardcodes 2025–26; Playwright nav landmark assertion tightened. Report + external tickets: [`docs/browser-qa/BROWSER-QA-REPORT-2026-07-25.md`](./docs/browser-qa/BROWSER-QA-REPORT-2026-07-25.md).

#### Added
- **Public `/shoot` Playwright hardening suite (2026-07-27)** — Tablet overflow, keyboard focus-visible, reduced motion, hub landing links, `target=_blank` noopener, favicon/metadata, demo label, empty catalog resilience (`web/tests/public-hardening.spec.ts`). No Vercel env mutations.

#### Changed
- **Unified public page design system (2026-07-23)** — Remaining `/shoot` pages now share the approved home-page shell (`PageHero`, `ProgramPage`, `SiteSection`, `CtaLink`, restrained catalog surfaces). Competitive energy on Leaderboard, Achievements, Public Display, and Athlete Profile; calmer instructional styling on Homework, Tutorials, Articles, and Game Manual; balanced treatment on Dashboard, Levels, Zoom Meetings, Shoutouts, and Admin. Data wiring, routes, and Airtable queries unchanged. Loading states added for articles, shoutouts, public-display, and game-manual.

### Airtable

#### Added
- **Production Automation Reconciliation + Capacity Plan (2026-07-23)** — Docs-only audit: matrix, classifications, and staged ≤50 plan. Confirms **030 does not absorb 032/033**; **063/111/070c** not safe to remove; safest first PROD slot free is delete **112** then install **115**. No Airtable automation mutations. [`Production-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md`](./docs/foundation-reset/Production-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md).
- **Foundation Reset Pack (2026-07-23)** — PROD schema snapshots `prod-foundation-reset-20260723/` + `…-post-ts/`; Testing Scenarios table created (`tblagI7Q5wXQm2XGS`); Schmidt enrollment `recgP9qZYjAhE7NXm` set `Active?=true`; foundation Week + scenario seeded; live Fillout-shaped Submission proved Week→XP→WAS (`recaCcxDqtzFWjmyi` / `recOqzhV4kTdsfzMf` / `rechWp330MqSgRWzN`). Automation **115** paste still required. Evidence: [`docs/foundation-reset/`](./docs/foundation-reset/README.md).
- **Repo blocker closure pass (2026-07-16)** — Contract helpers/tests for Enrollment `Active?` / Progress Processing guards (C-010), weekly-summary build/send + automatic resend prevention (C-011 / 072–074), and HW17/009 attachment-slot mapping + quiz dedupe (C-009). Release validator now enforces launch-scope version headers, duplicate automation numbers, contradictory status docs (066/059/043/112/070b–c), C-019 Testing-view documentation rules, and launch-test evidence packages. Docs reconciled: **066 v3.2** paste status, **070b v4.4 / 070c v1.1** wording, **059** created-trigger recommendation, **043** retire, **112 OFF**. No live Airtable changes.

### Docs

#### Added
- **C-025 PROD 117f approval-email workflow (2026-07-20)** — Documentation for Airtable Automation **117** → Make `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1` (Data Store `C025_117f_PROD_SendKeys`; four-part send key). Includes overview, module map, input variables, test results, rollback, go-live checklist, and 400/422/502 troubleshooting. Status: **tested / built — not claimed fully live**. [workflow](./docs/deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md).
- **Production Lambda upload service (2026-07-08)** — `lambda/upload-asset/` (`127si-production-shooting-challenge-asset-upload`): handler + `upload_core` ported from SDK proof; H2 handler PASS on `recLAk8TA4lfbA6eu` (`allPass=true`). AWS deploy pending admin IAM. [DEPLOY.md](./lambda/upload-asset/DEPLOY.md), [C-013-sdk-hybrid-runtime.md](./docs/deploy-checklists/C-013-sdk-hybrid-runtime.md).
- **C-013 controlled confirm-write recheck + Make migration plan (2026-07-08)** — SDK re-PUT on `recBBi80bYuxXifVj` with `schmidt-mike` slug; C-023 duplicate fields written. [checkpoint](./docs/deploy-checklists/C-013-wave7-asset-storage-checklist.md#2026-07-08--controlled-production-confirm-write-recheck-c-013--c-023) · [Make migration plan](./docs/deploy-checklists/C-013-make-upload-migration-plan.md).
- **C-013 Production Lambda minimal contract (2026-07-08)** — [C-013-production-lambda-upload-plan.md](./docs/deploy-checklists/C-013-production-lambda-upload-plan.md#minimal-production-contract--review-2026-07-08).

#### Changed
- **C-013 PROD closeout complete (2026-07-11)** — Video upload workflow PASS on Schmidt asset `recGQ8EjAMz3bEBiW`: 070b v4.4 `Accepted` async handoff → Lambda writeback → 070c v1.1 idempotent verify. Updated PROJECT_STATE, backlog, close-out considerations, promotion plan, runbook, infrastructure readiness, and [closeout doc](./docs/deploy-checklists/C-013-prod-closeout-2026-07-11.md). Historical v4.2 UI package marked superseded. — Automation **116** live on Production (script `992677d`); S5A–S5L **12/12 PASS**; live Confirmed Duplicate + Approved Reuse reversal PASS on XP `recx2MvUh2WP0tbjO` (Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2` — deactivated/`Duplicate - Remove` then reactivated/`Unique`; audit markers `[C-023-S5]`; no duplicate XP row). Retired obsolete automation **008** (slot-neutral). Production paste not started.
- **C-023 H3 matrix complete (2026-07-10)** — H3f cross-enrollment PASS on `recQcpLCsYFrYYH7w` (second Production enrollment `recKPxp0RlPhCLwDp`); informational-only cross-enrollment review, no reuse flag, no block. Matrix **16/16**. Harness: `--enrollment` arg + checkbox null-coercion fix in `tools/airtable/c013_prod_h3_matrix_run.py`. [Evidence](./docs/deploy-checklists/C-023-production-h3-duplicate-bytes-test.md#2026-07-10--h3f-cross-enrollment-reuse-matrix-close).
- **Production Lambda homework upload route (2026-07-10)** — `127si-upload-asset` accepts `homework_completion` / **070a** (`Homework Completions` destination) with same claim, S3, hash, and C-023 review protections as video. `ALLOW_ROUTE_KEYS` includes `homework_completion`. H3e PASS on `rec1PzA7th0qJbsN4`. 38 unit tests PASS.
- **Production Lambda `X-Upload-Secret` auth (2026-07-08)** — `upload_core/auth.py` validates `UPLOAD_WEBHOOK_SECRET`; 401 on missing/invalid header; no Airtable write on unauthorized. Tests: `lambda/upload-asset/tests/test_auth.py`.
- **Production Lambda deploy/test prep (2026-07-08)** — `127si-upload-asset` code-only deploy flags, Function URL invoke helper, [deploy-and-url-test plan](./docs/deploy-checklists/C-013-production-lambda-deploy-and-url-test.md). No AWS deploy in commit.

### Make

#### Added
- **C-028 Tremendous sandbox send (2026-08-19)** — v2-style sandbox send **validated** (Get a Record, parent/guardian email, safety filters, external ID, success/failure write-back); reward email received. Production Tremendous API still pending approval. Make scenario remains **OFF**. v1 blueprint preserved as historical. v2 blueprint is the current implementation snapshot, not production-live. Never commit an API key. [current state](./docs/integrations/tremendous-award-fulfillment.md) · [v2 snapshot](./make/blueprints/awards-send-tremendous-sandbox-reward-v2.json) · [v1 historical](./make/blueprints/awards-send-tremendous-sandbox-reward-v1.json).
- **C-025 117f Production Make package (2026-07-20)** — Sanitized blueprint `c025-117f-zoom-recording-approval-email-production-v1.template.json`, offline simulator/tests (`make/lib/c025-117f-make-scenario*.js`), deployment checklist + Agent 2 handoff. Scenario stays **OFF**; no webhook URL in git. [contract](./docs/deploy-checklists/C-025-117f-production-make-scenario-contract.md).

#### Changed
- **C-013 PROD upload route manual smoke PASS (2026-07-11)** — `Shooting Challenge - GAME - Upload Engine - Lambda - v1` passed upload (`actionOut=uploaded`, independent Airtable probe `allPass=true`), idempotency (`skipped_already_uploaded`, key/hash unchanged), and structured invalid-route handling (`error_invalid_route`). Sanitized blueprint documents `handleErrors=false` / complete Lambda JSON response behavior. **070b remains OFF**; exposed upload secret rotation + one Airtable-triggered Schmidt test remain.
- **C-013 PROD Make smoke runner probe parsing (2026-07-11)** — `c013_prod_make_smoke_run.py` now reads `submissionAsset.writebackVerification` from `_probe_c013_asset_storage_fields.py` (was incorrectly keyed as `recordProbe`, causing false `make_upload` FAIL). Upload pass requires webhook Lambda JSON **and** independent Airtable probe `allPass=true`. Invalid-route diagnostics document expected `Upload Status=Error` writeback.
- **C-013 upload runtime decision (2026-07-08)** — **SDK / hybrid interim** locked; Make S3 parked; Lambda deferred. Next: C-020 **H2** + C-023 duplicate on SDK. [C-013-sdk-hybrid-runtime.md](./docs/deploy-checklists/C-013-sdk-hybrid-runtime.md).
- **C-013/C-023 Production SDK proof PASS (2026-07-08)** — `c013_prod_s3_upload_proof.py` live run on `recBBi80bYuxXifVj`: S3 upload + full Airtable writeback including SHA-256 hash; probe `allPass=true`.

### Airtable

#### Changed
- **C-025 117f approval-email contract v1.2.0 (2026-07-20)** — 117f owns Make webhook POST (`ZOOM_REC_EMAIL|…`); stamps Send Key / Sent At only after HTTP 2xx; skips conflict/disabled/blank webhook. Orchestrator 117 Section F → `deferred_to_117f` (no competing send-key stamps). Offline Stage 17 + Make simulator tests PASS. Do not install/enable 117f or populate webhook until Production Make M1–M5 PASS.
- **C-025 Stage 17 COMPLETE in PROD (2026-07-20)** — Automations **117 v1.1.1**, **057 v1.3**, and **042 v3.1** enabled and verified. **101** unchanged. **117 `webhookUrl` blank** (approval email deferred). **115** not installed. Preconflict rollup `ARRAYJOIN(ARRAYUNIQUE(values), "\n")`; recording Conflict=1 / Approved=0; XP `recOceuW34jQz7suD` inactive. Closeout: [C-025-stage17-prod-live-2026-07-20.md](./docs/deploy-checklists/C-025-stage17-prod-live-2026-07-20.md). Rollback: [C-025-stage17-rollback-plan.md](./docs/deploy-checklists/C-025-stage17-rollback-plan.md).
- **115 v1.8 (2026-07-18)** — C025 Phase A waits for WAS `Perfect Week Automation Status=Ready` (057’s real done write) instead of ZA `Perfect Week Credit Applied?`. v1.7 Queue re-entry retained. Production paste: [C-025-stage17-115-etf-v1.8-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.8-PASTE.txt). Do not paste to PROD.
- **115 v1.7 (2026-07-18)** — C025 Phase A forces Automation 057 condition re-match: WAS `Perfect Week Automation Status` **Skipped → Pending** on `recvtukGFL7u74Tme` (formula `Perfect Week Calculation Queue?` is 1 for both Ready and Pending, so Ready→Pending never re-fires). Production paste: [C-025-stage17-115-etf-v1.7-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.7-PASTE.txt). Do not paste to PROD.
- **115 v1.6 (2026-07-18)** — C025 Phase B forces Automation 042 view re-entry: `Level Recalc Needed?` checked→unchecked→checked (or unchecked→checked) on Enrollment `recgP9qZYjAhE7NXm`. Resume skips when Gate Applied. Query budget still ≤22. Production paste: [C-025-stage17-115-etf-v1.6-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.6-PASTE.txt). Do not paste to PROD.
- **115 v1.5 (2026-07-18)** — C025 Stage 17 ETF runner stays under Airtable’s 30-query quota: exact-record polls only (max 5×057 + 5×042), `MAX_QUERY_BUDGET=22`, resume-safe Applied? skips, timeout → Blocked + clear `Run Test?`. Daily/Homework/Video unchanged. Production paste: [C-025-stage17-115-etf-v1.5-PASTE.txt](./docs/deploy-checklists/C-025-stage17-115-etf-v1.5-PASTE.txt). Do not paste to PROD.
- **070b v4.4 (2026-07-11)** — Remove invalid `setTimeout` polling (Airtable scripts cannot use timers). Make HTTP 2xx body `Accepted` returns `statusOut=pending`, `actionOut=lambda_upload_accepted_async`, `makeResponseMode=accepted_async`; retains `Send to Make Trigger` for companion **070c**. Immediate Lambda JSON path unchanged (`uploaded`, `skipped_already_uploaded`, structured errors).
- **070b v4.3 (2026-07-11)** — Superseded same day; polling design invalid in Airtable automation scripting.

#### Added
- **070c v1.1 (2026-07-11)** — Idempotent writeback verification: trigger state no longer fails verification. Full writeback + trigger checked → `async_upload_verified_trigger_cleared`; full writeback + trigger already cleared → `async_upload_already_verified`; failure only on missing writeback fields.
- **070c v1.0 (2026-07-11)** — Initial async verify companion (superseded same day by v1.1 false-failure on already-cleared trigger).
- **C-013 PROD readiness audit sync (2026-07-11)** — Reconciled stale BLOCKED/NOT_READY statuses in infrastructure readiness JSON and related deployment docs with verified PROD Lambda + Make manual route PASS. Invalid-route contract documented as expected Upload Status=`Error` with canonical/hash preserved.
- **Automation 116 (v1.0.1) — C-023 Stage 5 duplicate consequences (2026-07-10)** — `116-submission-assets-apply-asset-reuse-decision-consequences.js` (`992677d`) **Production deployed and validated** on `appn84sqPw03zEbTT`. Trigger: Submission Assets · when record updated · `Asset Reuse Decision` · input `recordId`. Live PASS: asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` (`applied_confirmed_duplicate` then `restored_approved_reuse`; same XP Event; `Duplicate Status` `Duplicate - Remove` → `Unique`; `[C-023-S5]` audit entries). S5A–S5L **12/12 PASS**. Replaced retired automation **008** — **automation count unchanged (~49)**. [Stage 5 report](./docs/deploy-checklists/C-023-production-stage5-duplicate-consequences.md).
- **Automation 115 (v1.3) — C-020 Test Intake harness (2026-07-07)** — `115-engineering-test-framework-run-testing-scenario-daily-submission.js`: **Daily Submission** (v1.0), **Homework** (v1.1), **Video** (v1.3). Production Tests A–D PASS on `appn84sqPw03zEbTT`. Video reads **Testing Scenarios.Intake Attachments** → writes **Submissions.Video Upload**; Homework uses same intake field → **HW Sub 1**. No test flags on pipeline tables. Production not pasted. See [C-020 checklist](./docs/deploy-checklists/C-020-testing-scenarios-script-checklist.md).
- **Phase 2B engineering docs (2026-07-06)** — [ENGINEERING_CONSTITUTION.md](./docs/ENGINEERING_CONSTITUTION.md); permanent SCRIPT+CONFIG header in [v2/06](./docs/v2/06-automation-standards.md); [phase-2b-engineering-review-2026-07-06.md](./docs/phase-2b-engineering-review-2026-07-06.md). No script or Airtable changes.
- **Schema snapshots (2026-07-06)** — Production (`prod-20260706/`, 29 tables, 118 views) and Production (`prod-20260706/`, 30 tables, 120 views). Production includes **Testing Scenarios** (C-020). Session handoff: `docs/SESSION_HANDOFF-2026-07-06.md`.
- **Season close-out award tooling (`tools/airtable/`)** — Read-only scripts and `_preview/` reports: `compare_award_recipients_snapshot.py` (June 29 CSV vs live Award Recipients), `audit_goal_conquer_reconciliation.py`, `audit_awards_catalog_and_connections.py`, `audit_final_awards.py`, `preview_final_email.py`, `generate_final_awards_email.py`. Documents award-link cleanup workflow and old→new catalog name map in [tools/airtable/README.md](./tools/airtable/README.md).
- **June 29 Award Recipients snapshot** — `Award Recipients-Grid view from June 29 FINAL.csv` (fulfillment truth before catalog rename); internal crossmatch report in `tools/airtable/_preview/june29-snapshot-crossmatch-report.md`.
- **Final Pre-Close audits (090A–090G)** — Read-only extension scripts scoped to Active? enrollments: submission XP, homework XP, streaks/milestones, video/zoom XP, unlock workflow (Week 9), weekly email (072/074), enrollment XP rollup. See `airtable/extension-scripts/audits/README.md`.
- **Final Pre-Close backfill stubs** — `repair-final-090f-unlock-week-from-source.js`; `repair-final-090g-build-final-challenge-summary-email.js` upgraded to **v2.0** one-page season recap HTML (days, HW done/missed, streaks, milestones, videos, zoom, awards, requirement counters).
- **`repair-final-090e-xp-rollup-duplicate-status.js`** — Clears false `Duplicate - Remove` on XP Events (or deactivates true duplicates) so `Lifetime XP Earned` rollup matches 090E computed totals.
- **`067` (v1.0)** — Homework — Link or Create Completion from Reflection Quiz. Bridges the Fillout Homework 17 test (`Final Reflection Quiz Submissions`) into a normal `Homework Completion` (native dedupe `Enrollment | Week | Homework`, `Source System = Fillout`, `Completion Status = Submitted` / `Review Status = Ready for Review`). No special pipeline; XP stays gated behind normal coach review + `064`/`065`. Trigger table: `Final Reflection Quiz Submissions`.
- **`audit-homework17-reflection-quiz-pipeline.js`** — Read-only audit of HW17 quiz intake: already-linked, safe/no/multiple Enrollment, HW17 + Week resolution, would-create vs would-update, duplicate-risk, needs-review, and an exact create/update preview.
- **`backfill-homework17-completions-from-reflection-quiz.js`** — One-time backfill mirroring `067` (DRY_RUN + CONFIRM_WRITE gates, BATCH_LIMIT). Never creates/modifies XP Events.

#### Changed
- **Automation 066 (v3.2) — Production deployment (2026-07-06)** — Pasted `066-achievements-and-milestones-create-shot-milestone-unlocks.js` v3.2 to Production (`appn84sqPw03zEbTT`) from GitHub `36a2e95`. Replaces v2.1. **Denver-safe Week resolution** for shot milestone unlocks (005/034 date-key pattern; fixes UTC boundary mis-mapping). Production verified before paste (Easton Hill idempotency + clean-create; Week write; no duplicate Milestone Source Key). **Monitor first natural Production run:** console `"version": "v3.2"`, Week populated on new unlocks, no duplicate `SHOT_MILESTONE|…` key, `Run Shot Milestone Check?` cleared on success/skip.
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
- **066 v3.1 Production deploy checklist** — [docs/deploy-checklists/066-v3.1-production-deploy.md](./docs/deploy-checklists/066-v3.1-production-deploy.md) (H-002 / V2-015 gate).
- **V2-015 Production base** — [production-base-setup.md](./docs/production-base-setup.md) runbook; production-only automation deploy; `web/.env.local.example`; prod/production env patterns in `.env.example` and `tools/airtable/.env.example`.

#### Changed
- **production-only delivery pipeline** — permanent rule + canonical diagram in [v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md); Wave 2A classification active in [V2-014](./docs/v2-014-automation-modernization-roadmap.md).
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
