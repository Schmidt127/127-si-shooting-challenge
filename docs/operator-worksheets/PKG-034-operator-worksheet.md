# PKG-034 — Live Zoom Attendance Operator Worksheet

**Status:** Draft companion worksheet; live-attendance proof only
**Canonical packet:** [PKG-034 Zoom live-attendance packet](../deploy-checklists/PKG-034-ZOOM-LIVE-ATTENDANCE-PRODUCTION-PACKET.md)
**Recording boundary:** Recording XP, recording approval email, Communications Hub, and Make are out of scope.

## Preflight

- [ ] Repository SHA: `________________`
- [ ] Base / environment / operator / timestamp: `________________`
- [ ] Dedicated Completed Zoom Meeting RID / Meeting Key / Week RID: `________________`
- [ ] Exactly one athlete Enrollment in `Attendees`; exactly one Week; matching Program Instance and School Year.
- [ ] One canonical Weekly Athlete Summary for Enrollment + Week; no recording-credit row for this athlete/meeting.
- [ ] Active exact rules captured: `ZOOM_ATTEND_BASE` = `____` XP; `ZOOM_ATTEND_BONUS_2` = `____`; `ZOOM_ATTEND_BONUS_3` = `____`.
- [ ] No duplicate active exact Rule Key; no wrong-owner XP Event.

## Installed Automation 101 proof

- [ ] **Automation 101 v6.3** installed version captured from Airtable UI/export.
- [ ] State captured: `ON / OFF`; trigger table: `Zoom Meetings`; trigger: `When record matches conditions`.
- [ ] Sole trigger condition captured exactly: `Zoom XP Reconciliation Needed? = 1`.
- [ ] Dynamic input `recordId` maps to the triggering Zoom Meeting RID.
- [ ] No `Create XP Events`, `Attendees`, or `Completed` trigger condition.
- [ ] Run ID / statusOut / actionOut / debugStep / errorOut: `________________`.
- [ ] Nine reconciliation fields exist and formulas have settled; writable field is `Last Zoom XP Reconciled Signature`.
- [ ] Historical packet references to 101 v6.1 are marked superseded by this current-source v6.3 attestation.

## One-athlete live attendance

- [ ] Baseline captured: WAS XP, Enrollment Lifetime XP, Current Level/Next Level/Gate/Status, standings row, existing Zoom Source Keys and XP Events.
- [ ] Natural roster/meeting transition produced `Needed=1`; capture field transition and run history.
- [ ] Exactly one active base Event with key `ZOOM_ATTEND_BASE|{Zoom Meeting Key}|{Enrollment RID}`.
- [ ] Event links exact Meeting, Enrollment, Week, and canonical WAS; rule, bucket, points, owner, and activity date match.
- [ ] `Last Zoom XP Reconciled Signature` acknowledged; `Needed=0`.
- [ ] No `ZOOM_CREDIT|...`, `ZOOM_RECORDING|...`, recording-credit Event, email, Make, or Communications Hub action.
- [ ] Replay/retrigger produces the same Event RID and no duplicate.

## Withdrawal and restoration

- [ ] Remove athlete from `Attendees` **or** make Enrollment inactive; capture natural trigger and run ID.
- [ ] Same base Event RID becomes inactive; Event is not deleted or replaced.
- [ ] WAS/Lifetime XP/progression/standings settle downward.
- [ ] Restore exact `Attendees` link and active Enrollment; capture natural trigger and run ID.
- [ ] Same base Event RID reactivates; no replacement or duplicate.
- [ ] WAS/Lifetime XP/progression/standings settle upward.

## Stop conditions

- [ ] Stop and leave 101 OFF for duplicate key, wrong-owner/steal attempt, multiple links, partial writeback, `Needed` not zero, stale settlement, recording XP, email, Make, or Communications Hub activity.
- [ ] Preserve screenshots, run output, RIDs, signatures, and read-only audit JSON.
