# PKG-034 — Zoom Live-Attendance XP Lifecycle Reliability

**Status:** Production installation closeout documented; behavioral live-attendance proof remains pending
**Base:** `origin/master` `1b2c3d14bcf055d80954cfe91fd176b1b44ca426`
**Production access:** None by Cursor
**Scope:** Live attendance only. Recording XP is explicitly excluded.

## Architecture and ownership

| Surface | Current/proposed owner | Evidence and boundary |
|---|---|---|
| Zoom meeting roster | Zoom Meetings.`Attendees` | Live attendance identity; recording paths must not write it |
| Live attendance XP | Automation 101 | Repository source `101-zoom-attendance-xp-award-meeting-xp.js` |
| Recording approval handoff | Automation 117 | Email/Make handoff only; not an XP writer |
| Recording XP | None deployed in this package | 117c and Stage 17 files are design alternatives |
| Weekly Athlete Summary | 031 primary creator; 118 scheduled ensure; 101 no longer creates a side WAS in the lifecycle path | Positive XP requires exactly one existing canonical WAS |
| XP Events | 101 for live Zoom families | 101 is the only writer changed by PKG-034 |
| Lifetime XP | Existing rollup/formula chain | Must settle after XP Event state changes |
| Progression | 041 queues; 042 writes levels | PKG-034 does not write either automation’s owned outputs |
| Standings | Existing readback | Verify after Lifetime XP and progression settle |

## Canonical live source keys

```text
ZOOM_ATTEND_BASE|{Zoom Meeting Key}|{Enrollment Record ID}
ZOOM_ATTEND_BONUS_2|{Enrollment Record ID}
ZOOM_ATTEND_BONUS_3|{Enrollment Record ID}
```

The first family is meeting-specific. The bonus families remain the existing
Automation 101 families. No display-name fallback is permitted for rule
identity, and `ZOOM_CREDIT|...` / `ZOOM_RECORDING|...` are not live keys.

Bonus 2 and Bonus 3 are cumulative thresholds, not mutually exclusive states.
Automation 101 orders qualifying completed meetings for the same Enrollment,
Program Instance, School Year, and lifecycle scope by meeting date, then
Zoom Meeting Key, then Airtable record ID. Bonus 2 is anchored to the second
qualifying meeting; Bonus 3 is anchored to the third. Counts above three keep
both lower-threshold events active. A downward transition deactivates only an
event whose threshold is no longer supported, and restoration reuses that
event's ID after exact ownership validation.

## Proven defects corrected

1. Historical Production correction: Automation 101 was upgraded from v5.5 to
   v6.1. The canonical repository source is now v6.3; current installation
   remains a separate Airtable attestation.
2. Live reconciliation is driven by numeric `Zoom XP Reconciliation Needed? = 1`.
3. Enrollment, Program Instance, School Year, Week, Meeting identity, and WAS
   are validated before positive creation/reactivation.
4. Singular ownership links fail closed; the Attendees roster remains plural.
5. Existing canonical events are matched by exact Source Key plus exact
   Enrollment, Week, and Zoom Meeting links.
6. Duplicate canonical events and wrong-owner/steal attempts fail closed.
7. A last-chance exact-key recheck runs immediately before create.
8. Withdrawal and inactive Enrollment deactivate an exactly owned event without
   requiring a WAS.
9. Restoration reactivates the same event ID.
10. Formula settlement is reread after writes. A changed signature is required
    when an owned event write should change the event-signature lookup, while a
    valid unchanged signature is accepted when reconciliation makes no data
    change. Automation 101 writes the exact current signature to the
    acknowledgement field, then rereads the formula and requires
    `Reconciliation Needed?` to be numeric zero before completing.
11. Empty-roster reconciliation creates no XP Event; duplicate and wrong-owner
    canonical events fail closed with exact record IDs.
12. Partial writeback warnings are returned; XP Events are never deleted.

## Trigger configuration

Use `When record matches conditions` on **Zoom Meetings**:

```text
Zoom XP Reconciliation Needed? = 1
```

Input variable:

```text
recordId = Airtable record ID from the triggering Zoom Meetings record
```

Do not retain the former trigger as the primary condition
(`Create XP Events` checked plus Completed). The formula-backed signature is
the transition observer for roster, Enrollment, Week, Program Instance, School
Year, and XP Event backlink changes.

## Production installation evidence — 2026-08-13

Mike supplied historical evidence that all nine reconciliation fields are
installed in `appn84sqPw03zEbTT`, Automation 101 v6.1 was ON, and the trigger is
`When record matches conditions` on `Zoom Meetings` with the sole condition
`Zoom XP Reconciliation Needed? = 1` and dynamic `recordId`. There are no
`Create XP Events`, `Attendees`, or `Completed` trigger conditions.

The current canonical repository source is Automation 101 v6.3. The historical
v6.1 evidence does not prove that v6.3 is installed in Airtable.

The final read-only audit checked 2 meetings and 16 XP Events with 0 Zoom XP
Events, 0 unsupported recording XP Events, and 0 duplicate/rule/ownership/
backlink/lifecycle errors. Two `missing_enrollment_links` warnings correspond
to the intentionally empty future rosters. Introduction
`recMFP2x5LDqea9ax` and Motivation `recb9EjQIJVzaRpZa` both reached Needed = 0
with `reconciled_empty_roster_no_award` and no XP Event. Mike manually deleted
`rec3ToANr5pcs2SRG` and `reczeUT0AJUWMmEOb` before the audit; Cursor did not
perform or reverse that deletion.

This is installation and empty-roster proof only. Live-attendee Base XP,
replay/deduplication, bonuses, withdrawal/restoration, inactive Enrollment
correction, WAS/lifetime XP, progression, standings, and recording XP remain
unproven and pending. Offline tests are not Production proof.

## Recording-XP dependency

PKG-034 does not choose recording XP policy, writer, source key, amount,
rounding, mutual exclusion, gate/Perfect Week treatment, approval, withdrawal,
or restoration. Those remain a separate Mike decision and package.
