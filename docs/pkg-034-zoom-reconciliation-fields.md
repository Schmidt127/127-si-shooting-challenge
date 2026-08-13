# PKG-034 — Zoom reconciliation field package

These are exact Production field instructions for Mike. Cursor did not create
or inspect Production fields. The package intentionally uses nine fields so
linked Enrollment, Week, and XP Event changes can wake the existing Automation
101 slot without scheduled polling or a new automation.

Create fields while Automation 101 is OFF. Create them in this order.

## 1. Source signatures

### Enrollments

`Zoom XP Enrollment Signature` — Formula, single-line text:

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|PI=" & ARRAYJOIN({Program Instance}) & "|SY=" & {School Year}
```

### Weeks

`Zoom XP Week Signature` — Formula, single-line text:

```text
RECORD_ID() & "|PI=" & ARRAYJOIN({Program Instance}) & "|SY=" & {School Year} & "|START=" & {Start Date} & "|END=" & {End Date}
```

### XP Events

`Zoom XP Event Signature` — Formula, single-line text:

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|KEY=" & {Source Key} & "|ENR=" & ARRAYJOIN({Enrollment}) & "|WEEK=" & ARRAYJOIN({Week}) & "|WAS=" & ARRAYJOIN({Weekly Athlete Summary}) & "|MEETING=" & ARRAYJOIN({Zoom Meeting}) & "|SOURCE=" & {XP Source} & "|BUCKET=" & {XP Bucket} & "|POINTS=" & {XP Points}
```

## 2. Zoom Meeting lookups

Create lookup fields on **Zoom Meetings**:

1. `Zoom XP Enrollment Signature - Lkp` — lookup through `Attendees` to
   `Enrollments.Zoom XP Enrollment Signature`.
2. `Zoom XP Week Signature - Lkp` — lookup through `Week` to
   `Weeks.Zoom XP Week Signature`.
3. `Zoom XP Event Signature - Lkp` — lookup through `XP Events` to
   `XP Events.Zoom XP Event Signature`.

These lookup fields are required even when they currently display blank. They
are the proven propagation path for linked-record-only transitions.

## 3. Reconciliation state on Zoom Meetings

Create in this order:

1. `Zoom XP Current Signature` — Formula, single-line text:

```text
RECORD_ID() & "|STATUS=" & {Meeting Status} & "|KEY=" & {Zoom Meeting Key} & "|CREATE=" & IF({Create XP Events},1,0) & "|ATTENDEES=" & ARRAYJOIN({Attendees}) & "|WEEK=" & ARRAYJOIN({Week}) & "|ENR_SIG=" & ARRAYJOIN({Zoom XP Enrollment Signature - Lkp}) & "|WEEK_SIG=" & ARRAYJOIN({Zoom XP Week Signature - Lkp}) & "|EVENT_SIG=" & ARRAYJOIN({Zoom XP Event Signature - Lkp})
```

2. `Last Zoom XP Reconciled Signature` — Single line text. Automation 101 v6.0
   is the sole writer.
3. `Zoom XP Reconciliation Needed?` — Formula returning numeric `1` or `0`:

```text
IF(AND({Zoom XP Current Signature},{Zoom XP Current Signature}!={Last Zoom XP Reconciled Signature}),1,0)
```

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
