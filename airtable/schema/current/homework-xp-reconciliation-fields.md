# Homework XP automatic reconciliation fields

PKG-007 adds the following computed signature chain so linked Enrollment, Program Homework Assignment (PHA), and XP Event changes can wake the existing Automation 065 slot. Create fields in this order. Formula field references are shown by name for safe Airtable UI entry.

## Source signatures

1. **Enrollments → `Homework XP Enrollment Signature`** (`fldiK2yAyNk2LFSgY`) — formula, single-line text:

```text
RECORD_ID() & "|" & IF({Active?}, "ACTIVE", "INACTIVE") & "|PI=" & ARRAYJOIN({Program Instance})
```

2. **Program Homework Assignments → `Homework XP PHA Signature`** (`fld49nopTelauF5d2`) — formula, single-line text:

```text
RECORD_ID() & "|" & IF({Active?}, "ACTIVE", "INACTIVE") & "|HW=" & ARRAYJOIN({Homework Assignment}) & "|PI=" & ARRAYJOIN({Program Instance}) & "|WEEK=" & ARRAYJOIN({Week}) & "|SLOT=" & {Homework Slot}
```

3. **XP Events → `Homework XP Event Signature`** (`fldDDgmXynjnMLWAg`) — formula, single-line text:

```text
RECORD_ID() & "|" & IF({Active?}, "ACTIVE", "INACTIVE") & "|KEY=" & {Source Key} & "|HC=" & ARRAYJOIN({Homework Completion}) & "|ENR=" & ARRAYJOIN({Enrollment}) & "|SUB=" & ARRAYJOIN({Submission}) & "|WEEK=" & ARRAYJOIN({Week}) & "|WAS=" & ARRAYJOIN({Weekly Athlete Summary}) & "|SOURCE=" & {XP Source} & "|BUCKET=" & {XP Bucket} & "|POINTS=" & {XP Points}
```

## Homework Completion helpers

4. `Homework XP Enrollment Signature - Lkp` (`fldLsp9LpWsuKkoq9`) — lookup through `Enrollment` to `Homework XP Enrollment Signature`.
5. `Homework XP PHA Signature - Lkp` (`fldTLYHIvjqJKT7IP`) — lookup through `Program Homework Assignment` to `Homework XP PHA Signature`.
6. `Homework XP Event Signature - Lkp` (`fldbbuLny0aBTNQJk`) — lookup through `XP Events` to `Homework XP Event Signature`.
7. `Homework XP Current Signature` (`fldZVNIZGkCQJg0ri`) — formula, single-line text:

```text
RECORD_ID() & "|SAT=" & IF({Satisfactory?},1,0) & "|REVIEW=" & IF({Review Complete},1,0) & "|FEEDBACK=" & IF({Coach Feedback},1,0) & "|XP=" & {Total Homework XP Awarded} & "|ENR=" & ARRAYJOIN({Homework XP Enrollment Signature - Lkp}) & "|PHA=" & ARRAYJOIN({Homework XP PHA Signature - Lkp}) & "|HW=" & ARRAYJOIN({Homework}) & "|WEEK=" & ARRAYJOIN({Week}) & "|SLOT=" & {Item Slot} & "|SUB=" & ARRAYJOIN({Submissions - Linked}) & "|EVENT=" & ARRAYJOIN({Homework XP Event Signature - Lkp})
```

8. `Last Homework XP Reconciled Signature` (`fldNEGMouVy1slkUz`) — writable single-line text. Automation 065 is the sole writer.
9. `Homework XP Reconciliation Needed?` (`fldNfgScUEeClwGUg`) — formula, numeric 1/0:

```text
IF(AND({Homework XP Current Signature}, {Homework XP Current Signature} != {Last Homework XP Reconciled Signature}), 1, 0)
```

Nine fields are the minimum honest package: three source formulas expose linked changes, three HC lookups propagate them, and three HC state fields compare/acknowledge work. Direct HC fields are used in the current signature instead of additional helpers. `Item Slot` is canonical assignment identity; `Asset Slot` remains routing-only.

## Trigger and behavior

Automation 065 uses `When record matches conditions` on Homework Completions: `Homework XP Reconciliation Needed? = 1`. Input `recordId` is the triggering record's Airtable record ID. No view, scheduled polling, or new automation slot is required. The bounded formula rereads inside one 065 execution are short consistency checks after writes, not scheduled polling and not another automation.

For Production installation, keep 065 OFF while creating fields. Run the authoritative audit and resolve every ownership/duplicate/active-state issue. Then run `initialize-homework-xp-reconciliation-signatures.js` dry, review its candidate IDs, explicitly set `CONFIRM_WRITE = true`, run once, and restore it to false. Require every existing row to evaluate Needed = 0 before enabling 065. This prevents field creation from treating all historical rows as new work and does not disguise known audit failures.

065 validates exact identity from actual links, not signature text. Before any create, repair, or reactivation, it requires exactly one canonical Weekly Athlete Summary for the exact Enrollment + Week. Zero or multiple candidates block positive XP and leave reconciliation unacknowledged; multiple candidates are reported with their record IDs. An ineligible correction still deactivates an exact owned event even when WAS is missing or ambiguous. When exactly one canonical WAS exists, a blank or wrong event WAS is repaired on that same event ID.

After changing the XP Event and HC business fields, 065 performs a bounded short reload loop until the current signature proves the expected active/inactive XP state, acknowledges that fresh value, and verifies Needed returns to 0 in the same run. If Airtable formulas do not settle within the bound, it preserves the event and run evidence, throws without acknowledging, and leaves Needed = 1. Mike should wait briefly for formula settlement and manually rerun the same Homework Completion through 065 once. Ownership/duplicate/schema errors are likewise never acknowledged.

If formula settlement times out, preserve the run output and records, wait for Airtable formulas to finish, then manually rerun that same Homework Completion through 065 once. Do not edit Last Reconciled Signature manually and do not create a replacement XP Event.

## Truth table

| Current state | Existing canonical event | Needed | 065 result |
|---|---:|---:|---|
| Eligible, exactly one canonical WAS, valid ownership | none | 1 | Create once, acknowledge |
| Eligible, exactly one canonical WAS, valid ownership | inactive | 1 | Reactivate same ID, acknowledge |
| Eligible, exactly one canonical WAS, active | 1 after any source change | Replay/repair same event, acknowledge |
| Review withdrawn | active | 1 | Deactivate same ID, acknowledge |
| Enrollment/PHA inactive or mismatched | active | 1 | Validate event ownership, deactivate same ID, acknowledge |
| Eligible, zero or multiple canonical WAS | any | 1 | Block positive award/reactivation; do not acknowledge |
| Enrollment/PHA invalid | none | 1 | Fail closed; do not acknowledge |
| Duplicate/stolen event | any | 1 | Fail closed; do not acknowledge |
| Current signature equals last reconciled | any | 0 | Automation does not run |
