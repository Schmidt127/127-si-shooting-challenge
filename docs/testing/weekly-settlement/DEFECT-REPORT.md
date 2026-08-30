# Weekly settlement defect report — 2026-08-29/30

**Harness:** SC-WEEKLY-SETTLEMENT-E2E  
**Base:** Production `appn84sqPw03zEbTT` (disposable fixtures only)  
**Authority:** Live apply evidence under `docs/testing/evidence/sc-weekly-settlement/`

## Summary

Weekly settlement **fail-closed Perfect Week matrix** and **WAS linkage** verified live. Perfect Week **award** path remains proven by existing SC-PW-E2E MCP evidence (do not re-apply). Three documentation-drift items found for “coach summary queue” wording. Two harness fixture bugs were found and fixed in-repo. No authorized production automation paste required.

## Defects

### DEF-WS-001 — “Coach Summary Queue” does not exist

| Field | Value |
|-------|--------|
| Classification | Documentation drift |
| Claim | Coach Summary Queue records / Frequency / Send Day |
| Actual | No table named Coach Summary Queue. Prep/send path is WAS package fields → Email Handoff Queue → 074/079 → Communications Hub |
| Fix | Documented in harness `DOCUMENTED_GAPS`; map tests to Email Handoff Queue + 118/119 schedule |
| Repo change | Docs + harness only |

### DEF-WS-002 — “Grade Submitted” field missing

| Field | Value |
|-------|--------|
| Classification | Documentation drift |
| Claim | Grade Submitted present on coach/weekly queue |
| Actual | No such field on WAS or Email Handoff Queue |
| Closest | Homework Completions / Video Feedback Satisfactory? + coach feedback readiness |
| Fix | Document drift; do not invent field |

### DEF-WS-003 — Frequency / Send Day on coach queue

| Field | Value |
|-------|--------|
| Classification | Documentation drift |
| Claim | Frequency and Send Day logic on coach summary queue |
| Actual | Weekly cadence owned by Automation **118** (Sun 5:00 AM Denver build) and **119** send schedule |
| Fix | Document mapping |

### DEF-WS-004 — WAS Grade Band race before 057

| Field | Value |
|-------|--------|
| Classification | Repository/code defect (test harness) |
| Symptom | 057 Error: `Grade Bands=0, Goal Records=1` when Pending armed before Grade Band link settled |
| Actual | WAS `Grade Band` is writable; harness now sets it explicitly + short settle delay |
| Fix | Applied in `sc-weekly-settlement-lib.mjs` |
| Production impact | Real athletes usually have Grade Band via enrollment/automation 032 path; harness race only |

### DEF-WS-005 — Live Zoom attendance fixture path

| Field | Value |
|-------|--------|
| Classification | Documentation drift + harness fixture bug (fixed) |
| Symptom | Creating Zoom Attendance Live row did not increment Perfect Week Zoom Attendance Count |
| Actual | Automation **057** counts live attendance from **Zoom Meetings.Attendees** (Enrollment links); Zoom Attendance table is for Recording Quiz credit |
| Fix | Harness sets `Attendees` on Zoom Meetings for WS-06 |
| Production impact | None if operators already use Attendees; clarify in fixture docs |

### DEF-WS-006 — Submission Stat Mode is computed

| Field | Value |
|-------|--------|
| Classification | Documentation drift / harness compatibility |
| Symptom | Writing `Submission Stat Mode` returns 422 computed-field error |
| Actual | Field is computed in live Production |
| Fix | Weekly settlement harness omits the field |
| Note | Local WIP `sc-pw-e2e-lib.mjs` still references it — **left untouched** per WIP rule; track separately |

### DEF-WS-007 — Weeks delete forbidden for PAT

| Field | Value |
|-------|--------|
| Classification | External-system limitation |
| Symptom | DELETE Weeks → 403 |
| Mitigation | Cleanup archives WSTEST Weeks (`Active?=false`, rename `WSTEST\|ARCHIVED\|…`) |
| Product decision | Weeks remain protected configuration |

## Non-defects (verified OK)

| Area | Result |
|------|--------|
| WAS Enrollment + Week linkage | Pass |
| Sunday–Saturday week windows | Pass |
| Fail-closed PW (missing day / low shots / videos / zoom miss) | Pass — no unlock/XP |
| No Zoom meeting → zoom met | Pass |
| Inactive disposable enrollment | Pass (created Active?=false) |
| Backdated gated submissions | Pass |
| Fully successful eligibility | Pass live (`receZH9vivRtg8bhv`) |
| Zoom required + Attendees | Pass live (`recDdwVugk8RSWd3K`) |
| Perfect Week award 058/059 | Pass via cite `recl3DmBh22ADPWWe` / unlock `recJ5umer4J4FHTOz` / XP `reczehlzkA8fjiQh0` |
| No email sent during harness | Pass (`Weekly Email Sent?` / `Send to Make?` unset) |
| Handoff structural compatibility 072/074/079 | Pass (offline contract) |

## Authorized fixes applied

- Weekly settlement harness + contracts + docs only  
- No live automation paste  
- No Automation 075 restore  
- Season simulation packages not executed
