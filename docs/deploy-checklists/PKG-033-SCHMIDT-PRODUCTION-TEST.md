# PKG-033 — Schmidt Core Reliability Production Test

**Status:** Test specification only — not executed  
**Owner:** Mike performs Production actions; Cursor records repository evidence  
**Scope:** Registration, first participation, WAS, Zoom, progression, standings  
**Out of scope:** Homework/Video implementation, email appearance, website appearance, deployments, schema changes, and daily-submission reversal work

## Non-negotiable controls

- Do not run until Mike has reviewed the live trigger/version and schema
  preconditions.
- Use one named Schmidt test Enrollment and one covered Week.
- Capture before-state IDs and values before each stage.
- Keep Communications Hub, Make, Gmail, and all email actions disabled or
  explicitly isolated to an approved test recipient.
- Never delete XP Events. Withdrawal means deactivate; restoration means
  reactivate the same event.
- Stop on duplicate/ambiguous Enrollment, Week, WAS, XP Reward Rule, or Zoom
  ownership. Do not choose the first linked record.
- This packet does not authorize a Production change or claim a pass.

## Controlled journey

| # | Preconditions and source | Expected owner/version | Expected result and evidence | Stop / rollback |
|---:|---|---|---|---|
| 1 | Mike identifies Schmidt Athlete, parent identity, one intended Program Instance, School Year, and one existing/new Enrollment | `001` current live version; no new row if canonical Enrollment exists | Record IDs, active state, School Year, Program Instance, Enrollment Key, duplicate candidates, and parent-cleaned email captured | Stop on multiple active canonical candidates or wrong season; do not merge/delete |
| 2 | Canonical active Enrollment has valid grade/year and no unsafe duplicate | `001` → `041` → `042`; `043` remains retired | At zero XP, one initial assignment: Current Level, Next Level, Level Gate Rule, Level Status, queue transition, timestamps | Stop if 042 cannot settle or 043 is required; restore source state per Mike’s rollback |
| 3 | One valid Activity Date covered by exactly one Week in the same Program Instance | `023` then `005`; versions/triggers attested by Mike | Submission Enrollment and Week links, duplicate/count status, no cross-year link | Stop on no/multiple Week; leave the controlled row isolated for Mike cleanup |
| 4 | Counted first Submission with eligible shots and no outbound send | `010` and `031`; current live versions | One `SUBMISSION_XP|<Submission RID>` event, exact Enrollment/Week/WAS, one canonical WAS, settled shots/makes/goal/XP | Stop on missing/duplicate WAS or wrong owner; no manual replacement |
| 5 | Re-run the same source only after recording first-state evidence | Same owners; no new source record | Same WAS and XP Event IDs; no total change; repaired backlinks only when exact ownership is proven | Stop if a second event/summary appears; deactivate nothing during this step |
| 6 | Existing approved Homework and Video package checkpoints are available | Existing PR #166 / #165 paths only | Record dependency evidence without changing 020/064/065/067 or 013/113/114 in PKG-033 | Stop and hand back to the owning package if either dependency is not ready |
| 7 | One qualifying live Zoom Attendance, exact meeting/week/enrollment, unique reward rules | `101` current live version | One live attendance event/source key, exact WAS, settled weekly/lifetime XP, no unexpected Attendees rewrite | Stop on multiple attendees/enrollments/rules or wrong Week; preserve event |
| 8 | If supported by approved product policy, one recording participation for the same meeting | Current approved Stage 17 path; `117` email handoff remains separate | Record whether live+recording are exclusive or both allowed; recording event uses exact attendance/meeting/enrollment/WAS identity | Stop if policy is not decided; do not paste alternatives 117a–e |
| 9 | Withdraw approval/eligibility on the controlled Zoom source | Current lifecycle owner | Canonical XP Event becomes inactive; no deletion/recreation; WAS and lifetime totals settle downward | Stop if a replacement event appears; restore prior state |
| 10 | Restore the same approval/eligibility | Same lifecycle owner | Same XP Event reactivates, same source key and record ID, totals settle upward once | Stop on duplicate or progression churn |
| 11 | After all XP rollups settle, inspect Enrollment progression inputs | `041` current live version | Signature changes once, queue is set once, upward/downward recalculation is requested | Stop if rollups are stale; wait for documented settling boundary |
| 12 | Process the pending active Enrollment | `042` current live version; `043` must remain off/retired | Correct Current/Next Level, gate rule by school year/rule set, status, queue clear; no inactive Enrollment write | Stop on duplicate rule or wrong-year gate; fail closed |
| 13 | Read public standings/leaderboard after settled values | Web read-only consumer; no deployment | Schmidt appears only if current view/filters permit; inactive/test/prior-year rows excluded; deterministic tie order verified | Stop on test leakage or wrong season; no public-data repair in this packet |
| 14 | Run authoritative read-only audits after the journey | Existing audit scripts plus PKG-033 audits | Zero unexplained duplicate canonical keys, wrong links, orphan XP, unsettled totals, or progression mismatch | Stop and produce an evidence ledger; do not repair Production from an audit |

## Exact evidence to capture

For every stage, capture:

- timestamp and operator;
- automation name/version/trigger as displayed in Airtable;
- source record ID and all created/reused IDs;
- Enrollment, Program Instance, School Year, Week, WAS, XP Event, Zoom
  Attendance, and Zoom Meeting IDs;
- source key, active/approval status, and before/after totals;
- formula/rollup settling timestamps;
- screenshots or exports of stop-condition fields;
- whether email, Make, Gmail, or webhook actions were disabled;
- rollback decision and cleanup owner.

## Read-only audit order after the test

1. Registration/enrollment duplicate and Program Instance audit.
2. WAS identity, duplicate, backlink, and total audit.
3. XP source-key, exact owner, active-state, Week/WAS, and lifetime-rollup
   audit.
4. Progression queue/signature/output/gate-rule audit.
5. Standings view/filter/tie and test-record leakage audit.
6. Preserve all evidence with a statement that the packet is controlled
   Production evidence only if Mike actually ran every step and recorded the
   result.

## Rollback

- Do not delete records or XP Events.
- Disable or uncheck only the explicitly approved test trigger/input after
  recording its final state.
- For an incorrectly awarded XP event, use the owning lifecycle path to
  deactivate the same event; never create a replacement negative event unless
  the approved business rule explicitly requires one.
- If a new Enrollment or Submission was created by mistake, leave it
  untouched until Mike selects the documented safe cleanup owner.
- If any outbound message is sent unexpectedly, stop the journey, preserve the
  Make/Gmail evidence, and do not retry.

## Pass criteria

The journey passes only when every stage has recorded evidence, all expected
IDs and source keys are stable on replay, withdrawals/restorations reuse the
same XP Event, progression reflects settled values in both directions, and
standings show the correct scoped deterministic result. Offline tests and
repository source review alone cannot satisfy this packet.
