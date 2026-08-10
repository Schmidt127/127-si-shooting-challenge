# PKG-003 Controlled-Proof Specification

**Workstream:** PKG-003 proof-gap design only  
**Baseline:** `origin/master` `080e78c0e3ecf2f790ee6e9a2b9f550a692c5e7b`  
**Environment:** Mike-owned controlled check only; no live test was performed for this report  
**Owner:** Mike executes named Airtable / Fillout / Make checks; Lead records matrix evidence

## 1. Evidence contract

Every result must be labeled with exactly one evidence class:

| Class | What it proves | What it does not prove |
|---|---|---|
| **Offline test** | Repository contract, fixture, parser, or dedupe behavior | Any installed or live-system behavior |
| **Controlled automation action** | One installed Airtable script action and its record-level outputs | That the natural trigger, upstream form, downstream automation, Make, or Gmail path fired |
| **Natural trigger** | The real source event caused the installed trigger chain | Production readiness, unless the run is in the named production environment and all downstream proof is captured |
| **Production proof** | Mike-authorized live run with current IDs, run history, outputs, downstream records, replay result, and recipient/writeback evidence | Any path not explicitly exercised |

Do not promote “offline PASS,” a manual **Test** button, a 115-created Submission, a historical record ID, or a repository script header to live proof. Do not use the Completion Master or CONTROL as the evidence artifact; the Lead adds distinct matrix evidence after Mike returns IDs and screenshots/exports.

## 2. Minimum controlled dataset

Use one fresh, isolated Schmidt test path and resolve current records immediately before execution. Known identities are references, not assumptions:

- Athlete: Schmidt `recgqVstObQRzgXJF`.
- Current controlled enrollment used by the latest 2026-08-10 package: `recCyFEPeATOVNlr9`; the season-launch test plan also retains `recgP9qZYjAhE7NXm`. Mike must select the current intended enrollment and record the choice.
- One current Program Instance, Config, Week 0, Week 1, and a completed ended Week for the target year.
- One active PHA for each homework slot (HW1/HW2), each linked to a current Homework Library record. Fillout-shaped submissions must carry **PHA IDs**, never Library IDs.
- One fresh Testing Scenario, one fresh Submission per intentional request, one attached asset for file paths, one written/quiz path, one Video Feedback row, one satisfactory Homework Completion, one Zoom Meeting + Attendance, one target WAS, and one ops-only recipient.
- Current active Level and Level Gate Rule for the enrollment’s School Year.
- For Perfect Week: a dedicated `PWTEST|...` Week/WAS and the required seven countable dates, three videos, and downstream unlock/XP allowance. Do not check `Perfect Week Test Override?`; it is ignored.

Preserve all returned record IDs and do not delete shared PHA, Library, Enrollment, Week, WAS, or XP records during the check. Keep Schmidt-only recipients; no mass send.

## 3. Remaining-path proof cards

### A. Natural Fillout-shaped intake and homework types

**Purpose:** prove the participant-shaped input, PHA validation, Week assignment, asset provenance, completion identity, and replay behavior.

1. Confirm current Fillout form mappings and season defaults in the UI. Record form URL/ID, hidden School Year/Program Instance/Config values, Enrollment mapping, Activity Date, and HW1/HW2 mappings. Keep daily intake closed until the season gates pass.
2. Submit one controlled enrollment through the natural enrollment form, if a new-year enrollment is required. Verify Athlete, School Year, Program Instance, Grade Band, and Active?; no duplicate Athlete or enrollment.
3. Submit a **natural Fillout-shaped** daily record (or C-020 scenario only if the form is unavailable) with Activity Date in the target Week and PHA IDs in HW1/HW2. Let `023 → 005 → 009 → 020` settle naturally; do not manually run downstream scripts.
4. Repeat with each minimum homework type, as separate fresh records: photo/image, PDF/document, video, written/reflection, and attachment-less final quiz. For N attachments, expect N Submission Assets but one Homework Completion per assignment identity. The quiz path must create no placeholder PDF/Submission Asset.
5. For one completion, perform coach review → Satisfactory → `064/065`; verify exactly one `HOMEWORK_XP|{completionId}`. Re-run the review/XP trigger and verify no second XP Event.
6. For one PHA mismatch/stale choice, verify fail-closed behavior: no incorrect Week/HC/asset ownership and an actionable error. Do not “repair” by changing 005/020 logic.

**Pass evidence:** form mapping capture; source Submission ID; Enrollment/PHA/Week IDs; asset IDs/count; one HC ID; review and XP IDs/source key; outputs/run history; replay counts; mismatch result. This card does not prove Make/S3 or parent email unless those are separately exercised.

### B. Video, feedback, and XP

**Purpose:** separate upload/writeback, posted feedback, and XP credit.

1. Use a fresh video submission through the approved intake/upload path. Verify Make/Lambda writeback: `Upload Status=Uploaded`, Canonical URL private, Reviewer File URL populated, error blank, and trigger cleared.
2. Create or link one Video Feedback row to that submission/WAS, set the installed trigger state to Ready for XP, and let the natural feedback path settle.
3. Verify `114` creates exactly one `VIDEO_SUBMISSION|{videoFeedbackId}` XP Event; replay produces no duplicate. Confirm `071/073` feedback email behavior only if a separate Schmidt/ops recipient send is authorized.
4. Confirm video does not also award homework XP or a second video credit through another writer.

**Pass evidence:** asset/writeback IDs and final contract fields; VF ID/status; XP ID/source key/amount; replay result; email send/writeback evidence only if actually sent. Offline 114 tests and historical C-013 proof remain supporting evidence, not this fresh proof.

### C. Weekly email positive send

**Purpose:** prove the currently installed positive path, not only 118/119 no-target fail-safe behavior.

1. Use a current ended Saturday Week and one active, non-Schmidt controlled enrollment with an ops/test recipient. Keep `includeSchmidt=false` unless Mike explicitly authorizes the Schmidt recipient.
2. Run or naturally allow `118` to arm one eligible WAS. Verify `build_armed`, correct Enrollment×Week Summary Key, no duplicate WAS, and `Build Weekly Email Now?`.
3. Let `072` build the package. Verify `Weekly Email Ready?`, subject, recipients, HTML/text, payload `eventId = WEEKLY_EMAIL|{enrollmentId}|{weekId}`, and `Send to Make?` remains false until send arm.
4. Let `119` arm exactly one ready unsent package, then let `074` post to the approved Make workflow. Verify Make/Gmail sends to the test recipient, writes `Weekly Email Sent?`, `Weekly Email Sent At`, and status fields.
5. Replay `119/074` with unchanged data. Expect skip/already-sent and no second Gmail message or writeback. Separately, if failure proof is authorized, use a temporary invalid webhook and verify `Send to Make?` remains checked and error is visible; restore the webhook before retry.

**Pass evidence:** 118/119 outputs and run history; WAS/Summary/package IDs; payload eventId; Make execution and Gmail test evidence; Airtable writeback; replay/dedupe evidence. The historical empty-week `send_short` pass does not prove this positive send.

### D. Zoom

**Live attendance:** create one current Zoom Meeting and one matching Schmidt Zoom Attendance through the natural attendance path. Verify `101` awards exactly one `ZOOM_ATTEND_BASE|{meetingId}|{enrollmentId}` event, updates the intended attendance/count fields, and replays without duplicate XP. Confirm 042/057 consumers see the correct year and enrollment.

**Recording approval:** use a separate meeting/attendance, mark the recording path Satisfactory, and exercise only canonical Airtable `117` → Make `117f`. Expect `sent` first, `already_sent` on replay, using `ZOOM_REC_EMAIL|...`; verify no XP Event and no competing Airtable 117a/117b/117c automation. Recording credit (`ZOOM_CREDIT`) is not proven by this email card and has no deployed writer under 117.

**Pass evidence:** meeting/attendance IDs, 101 output and XP key, counts, replay result; 117/117f payload/status, Make/Gmail ops evidence, no-XP check. Offline Stage 17 tests do not prove live attendance or email.

### E. Perfect Week

Use the existing controlled method, not a new 057 mode:

1. Confirm 057 v1.5 and its trigger/action mapping. Use a dedicated `PWTEST` Week/WAS and the CASE-01 seven-date dataset (or the gated Schmidt fixture only when Mike follows its explicit gates).
2. Verify all seven submissions are countable on distinct Denver dates, required shots meet the configured daily minimum, three matching videos exist, homework is satisfactory (or zero assigned by policy), and Zoom requirement is met.
3. Run the intended 057 action with `recordId` bound to the WAS; trigger-only testing is insufficient. Verify helper fields, Status Ready, Eligible formula, and correct Enrollment/Week.
4. Verify 058 creates one unlock and 059 creates one `PERFECT_WEEK|{enrollmentId}|{weekId}` XP Event for 100 points. Replay 057/058/059 and confirm no duplicate unlock/XP.
5. Run negative controls as time permits: six days, adjacent-week date, wrong enrollment attendance, fewer than three videos, and duplicate dates. A calendar-incomplete case is BLOCKED, not FAIL.

**Pass evidence:** fixture manifest, seven Submission IDs, WAS/Week/Enrollment IDs, helper values, unlock/XP IDs/source key, trigger history, replay and negative-case outcomes. Existing CASE-01 eligibility/unlock/XP evidence is historical supporting evidence; 059’s current UI trigger coverage still needs current proof.

### F. Levels

1. Choose a fresh/current-year controlled Enrollment and record its School Year. Confirm one active intended Level Gate Rule for that rule set; reject stale, duplicate, inactive, or cross-year candidates.
2. Create the minimum controlled input that causes recalculation, then allow `041 → 042` to settle naturally. Verify 041 detects/queues and 042 alone writes Current Level, Next Level, Level Gate Rule, Level Status, and clears `Level Recalc Needed?`.
3. Capture one blocked result with unmet requirements and one clear/advance result after the minimum requirement is met. Verify correct level/rule-set selection and no mutation of a prior-year enrollment.
4. Replay unchanged data and verify no unexpected status/link churn and no duplicate XP/unlock.

**Pass evidence:** Enrollment/School Year, selected rule ID, 041/042 run outputs, before/after progression fields, gate debug, XP/unlock counts, replay. The 2026-2027 042 v3.3 controlled proof is a completed regression reference, not proof for a new 2027 enrollment.

### G. 2027 Weeks activation and Fillout reopening

The authoritative policy is Challenge Window **2027-05-01 through 2027-06-30**, Early Bird **2027-04-25 through 2027-05-01**, Week 1 starts **2027-05-02**; Week count is not fixed and Weeks are manually maintained.

1. Mike resolves/creates exactly one target Config and records the current Config, Program Instance, and launch status. Keep the prior Config/Weeks for history; no schema changes without authorization.
2. Generate the 2027 week package, review CSV/Week End Key map, manually import Weeks, and export current records. Validate Week 0, contiguous Sunday–Saturday regular weeks, Post-Challenge, Program Instance links, no gaps/overlaps, and no unintended active Early Bird fixture. The current today-based Early Bird fixture must be shortened or replaced before launch.
3. Run `validate-export`, `launch-preflight`, `activation-preview`, and `audit-automations`. Advance only through `Test Ready`; do not flip Live from a test-mode state.
4. Update Enrollment and daily-submission Fillout forms with current hidden/default values; submit one Schmidt-controlled enrollment and one Week 1 daily record. Verify natural intake, 005 Week assignment, and year-scoped XP/HC/WAS/level outputs.
5. Verify Make/email settings with no mass recipients, complete the Schmidt season-launch cards, run a dry rollback preview, and obtain Mike’s written Approved for Live decision. Only then may Mike reopen public Fillout intake and record activation evidence.

**Pass evidence:** generated package and export; validator/preflight/preview outputs; Config/PI/Week IDs; UI attestations for Fillout; controlled enrollment/submission chain; automation audit; Make safety; approval and rollback preview. Repository CLI output alone is not activation proof.

## 4. Tonight’s minimum execution order

1. **Preflight/read-only:** current IDs, installed versions/triggers, Fillout mappings, 2027 Config/Weeks export, recipient safety, and Make mode. Stop on ambiguity.
2. **Foundation:** one natural Fillout-shaped enrollment/submission with PHA HW1/HW2; capture `023 → 005 → 009 → 020`, then one satisfactory completion → `064/065`.
3. **Media:** one video upload/writeback → feedback → `114` XP; one replay.
4. **Progression:** one Zoom attendance → `101`; one current-year level recalculation → `041/042`.
5. **Weekly email:** one ended Week positive `118 → 072 → 119 → 074 → Make/Gmail` test-recipient send, then replay/dedupe. Do not send to families.
6. **Perfect Week:** execute CASE-01 only if the seven-date fixture is already ready; otherwise record BLOCKED and do not backdate normal submissions.
7. **Season gate:** validate 2027 Weeks/config and Fillout mappings; leave Fillout closed and season not Live until all required outputs and Mike approval exist.
8. **Evidence handoff:** return a compact card per path with IDs, version/trigger, natural-vs-manual action, outputs, downstream records, replay result, recipient evidence, and unresolved blockers. Lead—not this report—updates the Active Execution Matrix.

## Sources consulted

- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (Active Execution rows SC-001–SC-091, SC-032/035/071–091; current 2026-08-10 overlay).
- `docs/agent-runs/CONTROL.json`, `docs/agent-runs/04-RESEARCH.md`.
- `docs/prod-completion/2026-08-10/SCV2-APP-BASE-CLOSEOUT-001.md`.
- `docs/prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md` and `HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md`.
- `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-SPEC.md`, `PERFECT-WEEK-EXPECTED-RESULTS.md`, and `docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md`.
- `docs/deploy-checklists/117-zoom-recording-approval-email.md`.
- `docs/challenge-year/SEASON-LAUNCH-CONTROL.md`, `FILLOUT-SEASON-ACTIVATION.md`, `SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md`, and `docs/deploy-checklists/NEXT-SEASON-RESET-STARTUP.md`.
- Offline suites referenced by `docs/v2/V2_LAUNCH_SMOKE_TESTS.md` and `docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md`.

