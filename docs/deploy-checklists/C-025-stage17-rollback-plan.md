# C-025 Stage 17 — Rollback plan

**Status:** Repository readiness package — PROD schema still blocked (Zoom Attendance missing). Automations remain OFF. Do not install 115 in PROD.

**CONFIRMED safety invariant:** Preserve legitimate history. Never delete ledger rows or rewrite historical live `ZOOM_ATTEND_BASE|…` XP. Correct only an erroneous, newly created synthetic/recording entry by soft-voiding its `Active?` value.

## Immediate response

1. Turn OFF the automation that just ran; do not enable another Stage 17 automation to compensate.
2. Record affected automation/version, timestamp, fixture IDs, outputs, and observed writes.
3. Identify test-created records using the `recTest*` fixture IDs, Source Key, operator notes, and run time.
4. Preserve production history and evidence. Apply the smallest reversible correction only to synthetic/new recording data.
5. Stop enablement, restore the saved prior script only when necessary, and rerun the relevant smoke case after root cause review.

## Per-automation rollback

| Automation | First containment | Reversible correction | Do not do |
|---|---|---|---|
| 101 v5.5 | If its live control test fails, stop Stage 17 work; leave script unchanged unless a separate approved 101 incident requires action. | Clear only the synthetic `Create XP Events` trigger after evidence capture; soft-void only an erroneous new synthetic event if authorized. | Do not remove legitimate Attendees or alter historical live XP. |
| 117 v1.1.1 | Turn OFF immediately. | Set incorrect new `ZOOM_CREDIT|…` XP `Active?=false`; restore only synthetic ZA review/trigger values. | Do not write/remove Attendees, modify live key rows, or set Applied? flags manually as a substitute for downstream counting. |
| 117a/117b/117c | Turn OFF the modular member. | Normalize only test-row review/satisfactory fields; soft-void wrong new recording XP from 117c. | Do not run alongside 117 orchestrator or delete ledger rows. |
| 117d/117e | Turn OFF. | Usually no data correction: v1.2.0 is observation-only. Escalate unexpected writes as a defect. | Do not set Gate/PW Applied? manually. |
| 117f | Turn OFF; disable webhook/config. | Clear only synthetic unsent/sent state when documented and appropriate. | Do not retry or send real email from PROD test fixtures. |
| 057 v1.3 | Turn OFF. | Restore only synthetic WAS trigger/status and synthetic ZA `Perfect Week Credit Applied?` if 057 set it incorrectly for the test. | Do not alter live Attendees, legitimate PW state, or historical XP. |
| 042 v3.1 | Turn OFF. | Restore only synthetic Enrollment level/recalc state and synthetic ZA `Gate Credit Applied?` if incorrectly consumed. | Do not alter live Attendees, legitimate level history, or historical XP. |
| 115 v1.8 | N/A — it must never be installed in PROD. | Escalate as a deployment violation; no automated cleanup. | Do not create `Testing Scenarios` or synthetic submissions in PROD to make it work. |

## Data triage

| Record category | Action |
|---|---|
| Historical live XP (`ZOOM_ATTEND_BASE|…`) | Preserve exactly; no deactivate, delete, point/date/source rewrite, or re-key. |
| Legitimate existing recording XP | Preserve; investigate only with an approved incident plan. |
| Wrong new recording XP from smoke | Mark `Active?=false`; retain reason/debug/audit evidence. |
| Synthetic ZA / meeting / enrollment / WAS | Identify explicitly by test IDs and delete only when their creation was authorized and no legitimate linkage exists; otherwise retain/mark test. |
| Synthetic Attendees link | Remove only the isolated test link after capturing the live-control result. |
| Applied flags | Clear only a demonstrably erroneous synthetic test flag and rerun its owner automation; never use manual changes as normal processing. |
| New schema | Do not delete a populated table as rollback. Leave automation OFF and preserve empty/isolated schema pending approved remediation. |

## Deployment log template

| Date/time (timezone) | Operator | Automation | Version | Test record | Result | Errors | Rollback required | Notes |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD HH:MM America/Denver |  |  |  | `recTest…` | Pass / Fail / Skipped |  | Yes / No |  |

## Escalation triggers

| Event | Required action |
|---|---|
| Recording path writes `Zoom Meetings.Attendees` | Turn OFF 117/modular path; stop promotion; do not attempt compensating XP writes. |
| Two active XP rows for one recording key or live/recording conflict | Turn OFF actor; preserve rows; soft-void only wrong new recording entry after review. |
| Historical live XP changed/deactivated/deleted | Stop all work and escalate immediately; do not self-repair history. |
| 057/042 count both live and recording for one meeting | Turn OFF owning automation; restore only synthetic state; fix/retest in DEV. |
| 115 proposed/installed in PROD | Stop; do not create missing table or test data; escalate as a hard boundary violation. |

Related: [enable order](./C-025-stage17-automation-enable-order.md), [expanded smoke tests](./C-025-stage17-expanded-smoke-tests.md), [production smoke baseline](./C-025-stage17-prod-smoke-test.md), [schema gap analysis](./C-025-stage17-prod-schema-gap-analysis.md).
