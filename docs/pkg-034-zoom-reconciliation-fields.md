# PKG-034 — Zoom reconciliation field package

These are the exact Production field record for PKG-034. Mike supplied the
Production evidence; Cursor did not access Airtable and did not create or
modify fields.
The package intentionally uses nine fields so
linked Enrollment, Week, and XP Event changes can wake the existing Automation
101 slot without scheduled polling or a new automation.

Create fields while Automation 101 is OFF. Create them in this order.

## 1. Source signatures

### Enrollments

`Zoom XP Enrollment Signature` — Formula, single-line text.
Production field ID: `fldB8RiYgX9AiIW3r`

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|PI=" & ARRAYJOIN({Program Instance}) & "|SY=" & {School Year}
```

### Weeks

`Zoom XP Week Signature` — Formula, single-line text.
Production field ID: `fldDJt0kzxARn8vnz`

```text
RECORD_ID() & "|PI=" & ARRAYJOIN({Program Instance}) & "|START=" & {Start Date} & "|END=" & {End Date}
```

Production `Weeks` has no native `School Year` field. The exact School Year
check is therefore performed by Automation 101 through the Week's single
`Program Instance` link to `Program Instance - Sync`.`School Year - Linked`,
matched against the Enrollment's `School Year`. The Zoom Meeting signature
still includes the linked Enrollment signature, so Enrollment-side School Year
or Program Instance changes remain observable without inventing a second Week
lookup field.

### XP Events

`Zoom XP Event Signature` — Formula, single-line text.
Production field ID: `fldu792fQmBVtU9vI`

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|KEY=" & {Source Key} & "|ENR=" & ARRAYJOIN({Enrollment}) & "|WEEK=" & ARRAYJOIN({Week}) & "|WAS=" & ARRAYJOIN({Weekly Athlete Summary}) & "|MEETING=" & ARRAYJOIN({Zoom Meeting}) & "|SOURCE=" & {XP Source} & "|BUCKET=" & {XP Bucket} & "|POINTS=" & {XP Points}
```

## 2. Zoom Meeting lookups

Create lookup fields on **Zoom Meetings**:

1. `Zoom XP Enrollment Signature - Lkp` — lookup through `Attendees` to
   `Enrollments.Zoom XP Enrollment Signature`. Production field ID:
   `fldttxtBTbGOfAUIB`
2. `Zoom XP Week Signature - Lkp` — lookup through `Week` to
   `Weeks.Zoom XP Week Signature`. Production field ID:
   `fldCSb6OtPz0prBmK`
3. `Zoom XP Event Signature - Lkp` — lookup through `XP Events` to
   `XP Events.Zoom XP Event Signature`. Production field ID:
   `fldxDQKJySP95xU1N`

These lookup fields are required even when they currently display blank. They
are the proven propagation path for linked-record-only transitions.

## 3. Reconciliation state on Zoom Meetings

Create in this order:

1. `Zoom XP Current Signature` — Formula, single-line text. Production field
   ID: `fldR6F73pNOboBQSL`

```text
RECORD_ID() & "|STATUS=" & {Meeting Status} & "|KEY=" & {Zoom Meeting Key} & "|CREATE=" & IF({Create XP Events},1,0) & "|ATTENDEES=" & ARRAYJOIN({Attendees}) & "|WEEK=" & ARRAYJOIN({Week}) & "|ENR_SIG=" & ARRAYJOIN({Zoom XP Enrollment Signature - Lkp}) & "|WEEK_SIG=" & ARRAYJOIN({Zoom XP Week Signature - Lkp}) & "|EVENT_SIG=" & ARRAYJOIN({Zoom XP Event Signature - Lkp})
```

2. `Last Zoom XP Reconciled Signature` — Writable single-line text. Production
   field ID: `fldN8ObYVWOwptoIF`. Automation 101 is the sole writer; the
   historical 2026-08-13 installed evidence names v6.1, while the canonical
   repository source is v6.3.
3. `Zoom XP Reconciliation Needed?` — Formula returning numeric `1` or `0`.
   Production field ID: `fldxpTxg5IJsfGzHU`

```text
IF(AND({Zoom XP Current Signature},{Zoom XP Current Signature}!={Last Zoom XP Reconciled Signature}),1,0)
```

## Production installation closeout — 2026-08-13

Mike supplied evidence that all nine fields are installed in
`127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`
(`appn84sqPw03zEbTT`). Two intentionally unused 2025–2026 Zoom Meeting rows
were manually deleted by Mike before the final read-only audit:
`rec3ToANr5pcs2SRG` and `reczeUT0AJUWMmEOb`. Cursor did not perform or
attempt to reverse that deletion.

The final audit checked two remaining future meetings and 16 XP Events:
zero Zoom XP Events, zero unsupported recording XP Events, and zero
duplicate/reward-rule/ownership/backlink/lifecycle errors. The two
`missing_enrollment_links` warnings correspond to the intentionally empty
future rosters. Introduction (`recMFP2x5LDqea9ax`) and Motivation
(`recb9EjQIJVzaRpZa`) both reached numeric `Zoom XP Reconciliation Needed? = 0`
with action `reconciled_empty_roster_no_award` and no XP Event created.

This proves installation and empty-roster acknowledgement only. Live-attendee
XP, replay/deduplication, bonuses, withdrawal/restoration, inactive Enrollment
correction, WAS/lifetime XP, progression, standings, and recording XP remain
pending.

## Historical initialization

Do not initialize by hand. With 101 OFF, Mike must first run the PKG-034
read-only audit, resolve duplicate/ownership errors, and confirm formulas have
settled. Then initialize `Last Zoom XP Reconciled Signature` only for
historical Zoom Meeting rows whose current state is intentionally accepted,
using a controlled, separately reviewed initializer. Every initialized row must
evaluate `Zoom XP Reconciliation Needed? = 0` before 101 is enabled.

## Rollback

1. Turn Automation 101 OFF.
2. Preserve the nine fields and their values for evidence unless Mike
   explicitly approves schema removal.
3. Restore the prior committed Automation 101 v5.5 only if the former trigger
   and behavior are intentionally accepted.
4. Do not delete XP Events or clear reconciliation signatures as a repair.
