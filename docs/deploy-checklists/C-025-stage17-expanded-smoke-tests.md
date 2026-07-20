# C-025 Stage 17 — Expanded smoke tests

**Status:** Repository readiness package — PROD schema still blocked (Zoom Attendance missing). Automations remain OFF. Do not install 115 in PROD.

This expands [C-025-stage17-prod-smoke-test.md](./C-025-stage17-prod-smoke-test.md). Execute only after its schema gate and only with synthetic `recTest*` records from [test fixtures](../testing/C-025-stage17-test-fixtures.json). **CONFIRMED:** 115 is not a PROD test runner.

## Shared preconditions and cleanup

| Item | Required state |
|---|---|
| Fixture | Dedicated test athlete, Enrollment, Zoom Meeting, ZA, XP Event, and WAS; never use a historical athlete. |
| Safety | 117/057/042 OFF except the single case under test; 101 remains unchanged/live only; 115 absent. |
| Config | Recording path enabled for fixture, percent 50, base rule 60, giving recording amount 30. |
| Email | `webhookUrl` blank; no real email delivery. |
| Cleanup | Turn tested automation OFF; clear synthetic trigger fields; soft-void only bad synthetic `ZOOM_CREDIT|…`; preserve all historical/live ledger rows. |

## S0–S8

| ID | Preconditions and exact synthetic record state | Run / expected script output | Expected writes | Required non-writes / cleanup / rollback |
|---|---|---|---|---|
| S0 Schema sanity | `recTestZARecordingApproved` links `recTestEnrollment` + `recTestZoomMeeting`; no live attendee. | No automation. Formula resolves key `ZOOM_CREDIT\|recTestEnrollment\|recTestZoomMeeting` and amount `30`. | None. | No Attendees change. Stop and return to schema work if fields/selects/formulas fail. |
| S1 Recording creation | S0 plus Method `Recording Quiz`, review `Satisfactory`, satisfactory true, approved true, conflict false. | 117 single-record test: `statusOut=success`, `sourceKeyOut` recording key, `xpPoints=30`, `attendeesWriteAttempted=false`. | One active XP Event: bucket `Zoom Attendance`, source `Zoom Meeting Recording Quiz`, date `XP Activity Date`. | No `Zoom Meetings.Attendees`, no Gate/PW Applied flags. Disable 117 after run. |
| S2 Live control | `recTestZoomMeetingLive` has `recTestEnrollment` in Attendees, completed, Week/key, `Create XP Events` checked; no recording ZA. | 101 produces `created` or equivalent success. | Exactly one active 60 XP live key `ZOOM_ATTEND_BASE\|recTestMeetingKeyLive\|recTestEnrollment`. | No recording XP. Clear test trigger only after output capture; do not change 101. |
| S3 Recording XP | Recording-only fixture; Enrollment absent from meeting Attendees; S1 predicate true. | Briefly enable 117; expect one 30 XP recording key and success/action create. | One active recording XP only. | Attendees remains unchanged; 117 OFF afterward. Soft-void synthetic record only if wrong. |
| S4 Conflict: live wins | Same Enrollment + Meeting represented by live Attendees and approved recording ZA. | 117 returns skipped/soft-void path; conflict formula is true. | Existing live 60 XP remains active; any recording XP is inactive. | No second live key, no Attendees mutation, no historical XP change. Roll back only synthetic recording XP via `Active?=false`. |
| S5 Retry dedupe | S3 already has active recording XP with exact source key. | Re-run 117. Expect `skipped`/exists action; no new XP ID. | None. | XP Event count for recording key stays one; do not delete the existing synthetic row. |
| S6 Perfect Week | Recording-only qualifying ZA: approved/non-conflicting, effective PW true, not Needs Correction; WAS `recTestWAS` enters `Perfect Week Calculation Queue?=1`. | Briefly enable 057; expect WAS completion/status `Ready` after normal queue execution. | WAS Zoom attendance reflects one meeting; 057 sets ZA `Perfect Week Credit Applied?` only if actually counted. | No Attendees write; no double count where live exists; 057 OFF afterward. Clear synthetic queue/revert test-only status. |
| S7 Gate | Recording-only qualifying ZA: approved/non-conflicting, `Zoom Gate Credit Earned?=true`, not Needs Correction; Enrollment enters view 042 by leaving/re-entering `Level Recalc Needed?`. | Briefly enable 042; expected assigned/gate-blocked output per fixture thresholds. | Updated Enrollment level/status/recalc field; 042 sets ZA `Gate Credit Applied?` only if counted. | No Attendees write; no double count where live exists; 042 OFF afterward. Restore only synthetic trigger/status fields. |
| S8 Totals/history | Complete S1–S7 review with live and recording fixtures. | Read-only compare keys/counts/history. | None beyond prior cases. | `Total Zoom Attendances` retains live Attendees semantics; recording did not inflate Attendees; never delete/rewrite historical live XP. |

## Negative cases

| Case | Fixture mutation | Expected result | Cleanup / rollback |
|---|---|---|---|
| N1 Recording path disabled | Set effective recording path disabled on synthetic Config/meeting. | No recording XP; 117 skips/ineligible. | Revert synthetic Config/override only; do not alter global production config without authorization. |
| N2 After deadline | Set recording submission after effective deadline. | Credit is not approved; no active recording XP. | Restore fixture timestamp/override only. |
| N3 Needs Correction | ZA review `Needs Correction`; satisfactory false. | No active recording XP; 057/042 do not count it; flags remain untouched. | Retain row for evidence or delete only if it is an approved disposable synthetic record; preferred safe rollback is no ledger write. |
| N4 Duplicate XP | Precreate synthetic active XP with exact `ZOOM_CREDIT|…` key. | 117 recheck skips; does not create a second key. | Keep legitimate fixture row; soft-void only a wrong extra synthetic row. |
| N5 Live/recording conflict | Add same Enrollment to meeting Attendees while approved ZA exists. | Live key wins; recording approval resolves false/conflict true or recording XP becomes inactive. | Remove only synthetic live Attendee link if it was solely the test; preserve live control evidence. |
| N6 Email webhook failure | Use a deliberately invalid/non-delivering test endpoint **only in DEV**. In PROD keep webhook blank. | 117/117f reports email error/skip without changing XP, Attendees, gate, or PW records. | Do not retry delivery in PROD; clear only synthetic sent/error state as appropriate. |

## Pass / stop matrix

| Pass requires | Immediate stop condition |
|---|---|
| 30-point recording XP, 60-point live XP, source-key idempotency, live-wins conflict, and correct Applied? ownership. | Recording writes Attendees; duplicate active XP; historical live XP changed; wrong amount; automations left ON; email side effect in PROD. |

Log every case using [rollback plan](./C-025-stage17-rollback-plan.md); expected fixture snapshots are in [expected results](../testing/C-025-stage17-expected-results.json).
