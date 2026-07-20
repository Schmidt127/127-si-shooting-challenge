# C-025 Stage 17 — Automation inputs and trigger checklist

**Status:** Repository readiness package — PROD schema still blocked (Zoom Attendance missing). Automations remain OFF. Do not install 115 in PROD.

**CONFIRMED:** Input names and explicit conditions below come from the repository script headers. **ASSUMPTION:** Where a modular 117 script header says “see design package” rather than naming exact conditions, configure the narrowest eligible Recording Quiz condition and document the final Airtable UI condition before enabling.

## Inputs

| Automation | Required inputs | Optional inputs | Output contract |
|---|---|---|---|
| 101 v5.5 | `recordId`: triggering Zoom Meetings record ID | None | `statusOut`, `actionOut`, `errorOut`, `debugStep` |
| 117 v1.1.1 | `recordId`: triggering Zoom Attendance record ID | `webhookUrl`: blank disables email (required for PROD smoke); `dryRun`: opt-in truthy ⇒ read/calculate/log intended writes with **no Airtable writes** (absent/blank/false = live mode) | `statusOut`, `errorOut`, `debugStep`, `actionOut`, `xpEventId`, `xpPoints`, `sourceKeyOut`, gate/PW/email actions, `attendeesWriteAttempted`, `dryRunOut`, `intendedWritesOut` |
| 117a v1.1.0 | `recordId`: ZA record ID | None | `statusOut`, `errorOut`, `debugStep`, `actionOut` |
| 117b v1.1.0 | `recordId`: ZA record ID | None | `statusOut`, `errorOut`, `debugStep`, `actionOut` |
| 117c v1.1.0 | `recordId`: ZA record ID | None | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `xpEventId`, `xpPoints`, `sourceKeyOut` |
| 117d v1.2.0 | `recordId`: ZA record ID | None | Standard status/action/error/debug outputs; observation only |
| 117e v1.2.0 | `recordId`: ZA record ID | None | Standard status/action/error/debug outputs; observation only |
| 117f v1.1.0 | `recordId`: ZA record ID | None | Standard status/action/error/debug outputs |
| 057 v1.3 | `recordId`: WAS record ID | None | Script updates WAS status/error helper fields; confirm automation output mapping in Airtable UI if needed |
| 042 v3.1 | `recordId`: Enrollment record ID | None | `statusOut`, `messageOut`, Enrollment/lifetime XP/current/next/gate outputs |
| 115 v1.8 — DEV only | `recordId`: Testing Scenarios record ID | Scenario data lives in Testing Scenarios; do not add PROD inputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, testing scenario/submission/scenario type outputs |

## Trigger and filter checklist

| Automation | Table / trigger type | Exact confirmed conditions | Setup check |
|---|---|---|---|
| 101 | `Zoom Meetings` / when record matches conditions | `Create XP Events` checked; `Attendees` nonempty; `Week` nonempty; `Zoom Meeting Key` nonempty; `Meeting Status=Completed` | `recordId` points to trigger record; keep script/header CONFIG aligned; preserve live path. |
| 117 | `Zoom Attendance` / when record matches conditions | `Attendance Method=Recording Quiz`; `Enrollment` nonempty; `Zoom Meeting` nonempty | Keep OFF through schema work; blank webhook for smoke. |
| 117a | `Zoom Attendance` / header does not specify condition | **ASSUMPTION:** Recording Quiz row with Enrollment + Meeting present | Do not use alongside 117 orchestrator. |
| 117b | `Zoom Attendance` / header does not specify condition | **ASSUMPTION:** Recording Quiz review status changed/reviewed | Do not use alongside 117 orchestrator. |
| 117c | `Zoom Attendance` / when record matches conditions | `Zoom Credit Approved?` true and `Zoom XP Amount > 0` | Must preserve source-key idempotency and soft-void behavior. |
| 117d | `Zoom Attendance` / optional diagnostic | **ASSUMPTION:** eligible Recording Quiz gate-credit row | Observation-only; 042 sets Applied?. |
| 117e | `Zoom Attendance` / optional diagnostic | **ASSUMPTION:** eligible Recording Quiz PW-credit row | Observation-only; 057 sets Applied?. |
| 117f | `Zoom Attendance` / header does not specify condition | **ASSUMPTION:** satisfactory, approved, non-conflicting Recording Quiz | Disabled/blank webhook must skip; do not test real delivery in PROD. |
| 057 | `Weekly Athlete Summary` / current queue condition | `Perfect Week Calculation Queue? = 1` | Confirm status transition genuinely re-matches condition; Ready → Pending alone may not re-fire. |
| 042 | `Enrollments` / when record enters view | View `042 - Needs Level Assignment`; filter `Level Recalc Needed?` checked | Confirm leave/re-enter behavior, not merely writing checked again. |
| 115 | `Testing Scenarios` / when record matches conditions | `Run Test?` checked | DEV only; PROD table is absent. |

## Field-readiness checklist

| Area | Required before Stage 17 enablement |
|---|---|
| Zoom Attendance | Method, Enrollment, Zoom Meeting, RIDs, review/satisfactory, credit key/approval/conflict/amount, gate/PW flags, email key/sent fields. |
| XP Events | `Source Key`, `XP Points`, `XP Bucket`, `XP Source`, `Active?`, reasons, `XP Activity Date`, Enrollment, Zoom Meeting; select option `Zoom Meeting Recording Quiz`. |
| Zoom Meetings | Existing live fields remain; Stage 17 support/formulas and inverse ZA link are complete; recording path never writes `Attendees`. |
| Config | Recording percent is 50; path, gate, PW, deadline, and email controls reflect approved intent. |
| Enrollment / WAS | ZA inverse link, level-recalc trigger surface, and PW queue surface available. |

## Dedupe and ownership checks

| Concern | Required result |
|---|---|
| Recording XP | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}`; one ledger row; soft-void incorrect new rows. |
| Live XP | `ZOOM_ATTEND_BASE\|{meetingKey}\|{enrollmentId}`; 60 points; preserve history. |
| Approval email | `ZOOM_REC_APPROVAL\|{enrollmentRID}\|{meetingRID}`; blank webhook skips. |
| Live/recording same meeting | Conflict formula suppresses recording approval; live wins; no duplicate count or XP. |
| Applied flags | 042 only writes Gate Applied; 057 only writes PW Applied; 117/117d/117e do not claim consumption. |

Related: [readiness map](./C-025-stage17-automation-readiness.md), [enable order](./C-025-stage17-automation-enable-order.md), [117 packet](./C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt), [057 packet](./C-025-stage17-057-perfect-week-v1.3-PASTE.txt), [042 packet](./C-025-stage17-042-level-gates-v3.1-PASTE.txt), [115 packet — DEV only](./C-025-stage17-115-etf-v1.8-PASTE.txt).
