# Automation 115 Audit — Engineering Test Framework (v1.8)

**Audited file:** `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`
**Audit date:** 2026-07-23 (Overnight Agent 1)
**PROD status:** Installed; dry-run PASS + live-run PASS 2026-07-23 (Submission `recuuTBgstSTGg2E3`)

---

## 1. Identity

| Item | Value |
|------|-------|
| Version | v1.8 (2026-07-18) |
| Original written | 2026-07-06 |
| Automation name | `115 - Engineering Test Framework - Run Testing Scenario Daily Submission` |
| Folder | 12 - Engineering Test Framework |
| Trigger | Testing Scenarios → `Run Test?` is checked |
| Required input | `recordId` (validated: non-empty, `rec` prefix) |

## 2. Inputs

- `input.config().recordId` — triggering Testing Scenarios record.
- Testing Scenarios fields read: `Test Intake Name`, `Scenario Type`, `Related Enrollment`,
  `Submission Date`, `Shot Total`, `Homework Assignment`, `Intake Attachments`,
  `Video Feedback Focus`, `Video Feedback Question`, `Scenario Requirements`, `Run Test?`,
  `Dry Run?`, `Linked Submission`, `Actual Result`, `Pass/Fail Notes`.
- Enrollments read: `Athlete` (intake), plus level fields (C025 branch only).

## 3. Tables touched

| Table | Read | Write | Notes |
|-------|------|-------|-------|
| Testing Scenarios | yes | yes | result/metadata fields only |
| Enrollments | yes | C025 only: `Level Recalc Needed?` toggle | intake never writes Enrollments |
| Submissions | no | create only (intake branches) | production-shaped intake fields |
| Weekly Athlete Summary | C025 only | C025 only: `Perfect Week Automation Status`, `Perfect Week Automation Error` (trigger re-arm) | |
| Zoom Attendance | C025 only | C025 only: `Perfect Week Credit Applied?`/`Gate Credit Applied?` reset when `resetFixtures` | |
| Zoom Meetings | C025 read only | **never** (hard `refuseAttendeesWrite` guard) | |

## 4. Fields written

- **Testing Scenarios:** `Linked Submission` (intake success), `Last Run Status`, `Last Run At`,
  `Actual Result`, `Pass/Fail Notes`, `Run Test?` (cleared).
- **Submissions (Daily):** `Enrollment`, `Athlete`, `Activity Date`, `Shot Total`,
  `Duplicate Review Status` = `Count It`.
- **Submissions (Homework):** `Enrollment`, `Athlete`, `Activity Date`, `Homework Name 1`, `HW Sub 1`.
- **Submissions (Video):** `Enrollment`, `Athlete`, `Activity Date`, `Video Feedback Focus`,
  `Video Feedback Note`, `Video Upload`.
- Never writes: Week, Submission Assets, Homework Completions, Video Feedback, XP Events, WAS calc
  fields, computed fields, `Zoom Meetings.Attendees`.

## 5. Scenario types supported

| Scenario Type | Branch | Status |
|---------------|--------|--------|
| Daily Submission | intake create | live PASS in PROD 2026-07-23 |
| Homework | intake create (1–3 files, one assignment) | not live-tested in PROD post-reset |
| Video / Three Video Upload | intake create (1–3 attachments) | not live-tested in PROD post-reset |
| Other / Perfect Week + `C025_STAGE17_DOWNSTREAM` marker | Stage 17 downstream verifier (057/042 re-trigger + verify) | DEV-proven; PROD fixture IDs in CONFIG are DEV records (see defects) |
| Anything else | `skipped_wrong_scenario`, Last Run Status `Blocked` | verified in code |

## 6. Dry-run behavior

`Dry Run?` checked → builds a full preview payload (JSON in `Actual Result`), **no Submission
created**, `Run Test?` cleared, Last Run Status `Pass`, notes explain how to run live. Verified
live in PROD (dry-run PASS evidence).

## 7. Live-create behavior

Creates exactly one production-shaped Submission per run, links it back to the scenario
(`Linked Submission`), writes summary lines to `Actual Result`, clears `Run Test?`. Downstream
pipeline (005 Week link → 010 XP → 031 WAS) runs from normal production triggers — confirmed live:
Submission `recuuTBgstSTGg2E3` → Week `recVDKiYATgzsfpmE`, XP `recOodD23MQrP1O9F` (20), WAS
`rechWp330MqSgRWzN`.

## 8. Duplicate / rerun behavior

- 115 has **no scenario-level duplicate guard**: re-checking `Run Test?` on the same scenario
  creates another Submission with the same Activity Date. This is intentional (rerun packs test
  downstream idempotency), but operators must know each live rerun adds a Submission **that earns
  XP** because 115 presets `Duplicate Review Status = Count It`, which bypasses the duplicate-day
  review flow.
- `Linked Submission` is overwritten with the newest Submission on each run (history is preserved
  only in Airtable field history + the Submissions table itself).
- Rerun safety of downstream XP is delegated to 010's Source Key dedupe (one XP per Submission) —
  live-verified base-wide (0 duplicate Source Keys, 0 Submissions with >1 XP Event).

## 9. Error handling

- Skip paths (`skipped_*`, `blocked_*`): outputs set, scenario updated, `Run Test?` cleared, no throw.
- Intake hard errors (schema missing, enrollment missing athlete, create failure): outer catch sets
  `statusOut=error` and **rethrows**; `Run Test?` stays checked for triage (documented design).
- C025 branch always clears `Run Test?` (pass, fail, timeout, budget, exception).
- Query budget (C025): max 22 selects, capped polls (5×057 + 5×042), resume-safe.

## 10. Status outputs

`statusOut` (success|skipped|error), `actionOut` (created | dry_run | blocked_* | skipped_* |
c025_* | error), `errorOut`, `debugStep`, `testingScenarioIdOut`, `createdSubmissionIdOut`,
`scenarioTypeOut`, `createdRecordSummaryOut`. All via `setOutputSafe`. Final `console.log` JSON.

## 11. XP / summary behavior

- **Does not award XP directly** — verified: no `XP Events` table reference anywhere in the script.
- **Does not create/modify WAS rows** — only toggles `Perfect Week Automation Status` on a named
  fixture WAS in the C025 branch to re-arm 057's trigger (orchestration, not a second pipeline).
- Relies on normal production automations for Week/XP/WAS/asset/feedback fan-out. Confirmed live.

## 12. Cleanup behavior

None — created Submissions persist (intentional: they exercise the production pipeline). Cleanup is
operator-driven. C025 branch clears `Level Recalc Needed?` if it left it set.

## 13. Defects / risks found

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 115-D1 | Low | GitHub header + docblock still say "DEV only until promotion doc + Mike approval" and "070b OFF on DEV" — stale now that 115 is installed and passing in PROD under SC-001 | **Fixed tonight** (header note updated; logic untouched) |
| 115-D2 | Medium | C025 fixture IDs in CONFIG (`weekId rec7fCckt1zj9CbmP`, `zoomAttendanceId reciRsLuiJGYcea3U`, `zoomMeetingId recwnEKJAW8hxPSNL`, `wasId recvtukGFL7u74Tme`) are DEV records; running the C025 branch in PROD without `Scenario Requirements` JSON overrides will fail record lookups (safe fail: `skipped_missing_input`) | Documented; override via Scenario Requirements JSON when needed. Not changed (values are correct for DEV; PROD fixtures do not exist yet) |
| 115-D3 | Low-Med | Daily branch presets `Duplicate Review Status = Count It`, so intentional duplicate-day scenarios never enter the duplicate review flow; a "duplicate daily submission" test therefore tests XP-per-submission, not the duplicate-day policy | Documented in scenario catalog (SCN-005); product decision logged in MIKE-ACTIONS |
| 115-D4 | Info | Rerun overwrites `Linked Submission` (single link) — prior run's Submission ID only recoverable from Submissions table | Documented; acceptable |
| 115-D5 | Info | `skipped_wrong_scenario` message says "v1.4 supports…" (stale version string in message only) | **Fixed tonight** (message text corrected) |

## 14. Test coverage added tonight

Offline harness `tools/testing/tests/test_115_offline.mjs` runs the **actual production script**
(the real `.js` file, evaluated with mocked `base`/`input`/`output`) through: dry run, live create,
invalid scenario type, missing recordId, bad recordId prefix, missing enrollment, missing
Submission Date, non-allowlisted enrollment, zero/missing Shot Total, and rerun (two consecutive
live runs → two Submissions, `Linked Submission` points at newest). See `tools/testing/README.md`
for how to run.
