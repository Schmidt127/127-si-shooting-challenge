# PKG-034 — Production-only Schmidt test packet

**Owner:** Mike
**Agent boundary:** Cursor performed no Airtable access. This packet contains
repository-only promotion and controlled-test instructions; Mike owns all
Development and Production Airtable actions. Cursor has not created or
modified fields,
pasted scripts, changed the Automation 101 trigger/state, sent email, deployed,
or merged.
**Important:** This packet is controlled Production work because no Production
Airtable environment is available. Offline repository tests are not
Production proof.

## Production installation closeout — 2026-08-13

Mike supplied the authoritative Production evidence for base
`127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`
(`appn84sqPw03zEbTT`). Cursor did not access Airtable or perform the
Production changes.

- Historical Production evidence (2026-08-13): Automation 101 v6.1 was
  installed and **ON**. The canonical repository source is now v6.3; the
  current installed version remains unverified.
- Trigger: `When record matches conditions` on `Zoom Meetings`, sole
  condition `Zoom XP Reconciliation Needed? = 1`.
- `recordId` maps to the dynamic triggering Zoom Meeting record ID.
- There is no `Create XP Events`, `Attendees`, or `Completed` trigger
  condition.
- All nine reconciliation fields are installed; exact field IDs are recorded
  in [`pkg-034-zoom-reconciliation-fields.md`](../pkg-034-zoom-reconciliation-fields.md).
- Active exact reward rules are `ZOOM_ATTEND_BASE` = 60 XP,
  `ZOOM_ATTEND_BONUS_2` = 30 XP, and `ZOOM_ATTEND_BONUS_3` = 40 XP.
- Mike manually deleted unused 2025–2026 meetings
  `rec3ToANr5pcs2SRG` and `reczeUT0AJUWMmEOb`. Cursor did not perform,
  restore, or further modify those records.
- The final read-only audit checked 2 meetings and 16 XP Events: 0 Zoom XP
  Events, 0 unsupported recording XP Events, and 0 duplicate/rule/ownership/
  backlink/lifecycle errors. The 2 `missing_enrollment_links` warnings are
  the intentionally empty future rosters.

Baseline acknowledgements:

- Introduction `recMFP2x5LDqea9ax` / Week `rec2Rewxt21z7dI9f`: successful
  `reconciled_empty_roster_no_award`, no XP Event, Needed = `0`.
- Motivation `recb9EjQIJVzaRpZa` / Week `recW3irij491AIPrl`: successful
  `reconciled_empty_roster_no_award`, no XP Event, Needed = `0`.

This closeout records installation and safe empty-roster acknowledgement
only. It does not prove live-attendee XP, replay/deduplication, bonuses,
withdrawal/restoration, inactive Enrollment correction, WAS/lifetime XP,
041→042 progression, standings, or recording XP.

## Historical preflight — completed by Mike; do not repeat

- [x] Export or capture the current Production schema for Zoom Meetings,
      Enrollments, Weeks, XP Reward Rules, XP Events, and Weekly Athlete Summary.
- [x] Attest the currently pasted Automation 101 version and trigger.
- [x] Attest Automation 117 is the email/Make handoff and is not an XP writer.
- [x] Attest 101, 041, and 042 ownership; do not change 041/042 scripts.
- [x] Confirm active exact Rule Keys and amounts:
      `ZOOM_ATTEND_BASE`, `ZOOM_ATTEND_BONUS_2`, `ZOOM_ATTEND_BONUS_3`.
- [x] Confirm no duplicate active exact Rule Key rows.
- [x] Turn Automation 101 OFF before field creation.
- [x] Keep Communications Hub/email automations out of the test path.

Record live IDs dynamically; never reuse the historical fixture blindly:

```text
Schmidt Enrollment RID: __________________
Zoom Meeting RID: _______________________
Zoom Meeting Key: _______________________
Week RID: _______________________________
Program Instance RID: ___________________
School Year: ____________________________
WAS RID: ________________________________
XP Event RID: ___________________________
```

## Historical install order (completed; do not repeat)

1. With 101 OFF, create the nine fields in
   `docs/pkg-034-zoom-reconciliation-fields.md`.
2. Wait for formula/lookup settlement.
3. Run the read-only audit
   `audit-zoom-live-attendance-xp-lifecycle.js`.
4. Resolve every duplicate canonical key, wrong owner, zero/multiple WAS,
   wrong PI/SY, inactive Enrollment, and backlink issue before initialization.
5. Initialize accepted historical signatures using the separately reviewed
   initializer; require Needed = numeric 0.
6. For any future controlled paste, use the canonical repository Automation 101
   v6.3 source after the current installed version and trigger are re-attested.
7. Configure `When record matches conditions` on Zoom Meetings:
   `Zoom XP Reconciliation Needed? = 1`.
8. Map `recordId` to the triggering Zoom Meetings record ID.
9. Enable 101 only after the audit and initialization gates pass.

Automation 101 `XP Award Status` choices available for this package are
`Pending` and `Awarded`. Do not add an `Error` single-select option. The
script treats `Error` as optional and preserves the original exception if
error-status writeback is unavailable.

For an empty roster, v6.1 must acknowledge a valid nonblank Current Signature
even when it equals the starting signature, write that exact value to Last
Zoom XP Reconciled Signature, keep Create XP Events unchecked, create no XP
Event, and verify Reconciliation Needed? is numeric `0`. Duplicate or
wrong-owner canonical events remain fail-closed and must report their exact
record IDs.

Do not add a scheduled poll, new automation slot, or recording-XP step.

## Controlled live-only test

Use a dedicated Completed meeting with exactly one Schmidt Enrollment in
`Attendees`, exactly one Week, a matching Program Instance and School Year,
and no recording-credit row for that Enrollment + Meeting.

1. Capture the pre-state of Lifetime XP, current level, next level, gate
   status, standings row, WAS, and matching live Source Key.
2. Set the meeting to the controlled live-only state.
3. Wait for `Zoom XP Reconciliation Needed? = 1`, then capture the 101 run.
4. Expected base key:

```text
ZOOM_ATTEND_BASE|{Zoom Meeting Key}|{Schmidt Enrollment RID}
```

5. Verify exactly one active XP Event, the exact Enrollment/Week/Meeting/WAS
   links, the active `ZOOM_ATTEND_BASE` rule amount, `Zoom Attendance` bucket,
   and `Airtable Automation 101` owner.
6. Verify the run reread a fresh signature and Needed returned to numeric 0.
7. Confirm no `ZOOM_CREDIT|...`, `ZOOM_RECORDING|...`, email, or
   Communications Hub action occurred.
8. Capture Lifetime XP → 041 queue → 042 result → standings readback after
   formulas settle.

## Withdrawal and same-event restoration

1. Remove Schmidt from `Attendees` or make the Enrollment inactive.
2. Wait for Needed = 1 and capture the 101 run.
3. Verify the same XP Event RID is inactive; no XP Event is deleted.
4. Restore the exact Attendees link and active Enrollment.
5. Verify the same XP Event RID is reactivated, not replaced.
6. Verify Lifetime XP, 041/042, and standings settle correctly.

## Replay and duplicate-import check

- Replay the settled meeting transition. Expected: same canonical event ID,
  no second event.
- Replay the import or re-run the trigger. Expected: no duplicate exact key.
- If any duplicate appears, stop and turn 101 OFF.

## Stop conditions

Stop immediately and leave 101 OFF if:

- Any duplicate canonical Source Key exists.
- A wrong-owner event would be updated or stolen.
- Multiple Enrollment, Week, Program Instance, School Year, or WAS ownership
  is observed.
- Formula settlement does not reach Needed = 0 in the same run.
- A partial writeback warning is returned.
- An XP Event is deleted or replaced.
- Recording XP, email, or Communications Hub activity occurs.
- Lifetime XP or progression remains stale after the documented settling wait.

## Rollback

1. Turn Automation 101 OFF.
2. Do not delete XP Events.
3. Preserve run output, record IDs, signatures, and screenshots.
4. Restore the prior committed Automation 101 only if Mike accepts the old
   trigger and missing lifecycle behavior.
5. Leave the nine fields in place unless a separately approved schema rollback
   is performed.
6. Re-run the read-only audit and record the final automation state.
