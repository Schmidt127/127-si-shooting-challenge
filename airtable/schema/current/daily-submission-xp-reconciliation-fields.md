# Daily Submission XP reconciliation fields

**Package:** PKG-006R  
**Status:** Approved Phase 3 schema contract; not installed by this repository-only package.  
**Owner:** Mike creates and verifies fields in the approved base. Field IDs are intentionally omitted until a real schema export exists.

Create the fields in this exact order. Do not enable Automation 010 until the complete chain exists and existing rows have been audited.

## 1. Source signatures

1. **Enrollments → `Reconciliation Source Signature`** — formula, single-line text:

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|PI=" & ARRAYJOIN({Program Instance}) & "|YEAR=" & {School Year}
```

2. **Weeks → `Reconciliation Source Signature`** — formula, single-line text:

```text
RECORD_ID() & "|PI=" & ARRAYJOIN({Program Instance}) & "|START=" & {Start Date} & "|END=" & {End Date}
```

3. **XP Events → `Reconciliation Source Signature`** — formula, single-line text:

```text
RECORD_ID() & "|ACTIVE=" & IF({Active?},1,0) & "|KEY=" & {Source Key} & "|SUB=" & ARRAYJOIN({Submission}) & "|ENR=" & ARRAYJOIN({Enrollment}) & "|WEEK=" & ARRAYJOIN({Week}) & "|WAS=" & ARRAYJOIN({Weekly Athlete Summary}) & "|SOURCE=" & {XP Source} & "|BUCKET=" & {XP Bucket} & "|POINTS=" & {XP Points}
```

These formulas are observability inputs, not uniqueness constraints. Airtable does not provide atomic uniqueness for `Source Key` or Enrollment + Week WAS creation.

## 2. Submission lookup propagation

Create these lookup fields on **Submissions**, in order, through the linked `Enrollment`, `Week`, and `XP Events` fields:

4. `Reconciliation Enrollment Signature - Lkp` → Enrollment.`Reconciliation Source Signature`
5. `Reconciliation Week Signature - Lkp` → Week.`Reconciliation Source Signature`
6. `Reconciliation XP Event Signatures - Lkp` → XP Events.`Reconciliation Source Signature`
7. `Reconciliation XP Event Source Keys - Lkp` → XP Events.`Source Key`
8. `Reconciliation XP Event Submission IDs - Lkp` → XP Events.`Submission`
9. `Reconciliation XP Event Enrollment IDs - Lkp` → XP Events.`Enrollment`

The three XP Event lookups expose linked-event cardinality and ownership. Automation 010 must still validate actual record links and exact counts; signature text is not an ownership proof.

## 3. Submission state and latch

10. **`Current Reconciliation Signature`** — formula, single-line text:

```text
RECORD_ID() & "|COUNT=" & IF({Count This Submission?},1,0) & "|MODE=" & {Submission Stat Mode} & "|DUP=" & {Duplicate Review Status} & "|VALID=" & {Detailed Stats Valid?} & "|FUTURE=" & {Activity Date Is Future?} & "|SHOTS=" & {Total Shots Counted} & "|DATE=" & {Activity Date} & "|ENR=" & ARRAYJOIN({Reconciliation Enrollment Signature - Lkp}) & "|WEEK=" & ARRAYJOIN({Reconciliation Week Signature - Lkp}) & "|WAS=" & ARRAYJOIN({Weekly Athlete Summary}) & "|XP_SIG=" & ARRAYJOIN({Reconciliation XP Event Signatures - Lkp}) & "|XP_KEYS=" & ARRAYJOIN({Reconciliation XP Event Source Keys - Lkp}) & "|XP_SUBS=" & ARRAYJOIN({Reconciliation XP Event Submission IDs - Lkp}) & "|XP_ENRS=" & ARRAYJOIN({Reconciliation XP Event Enrollment IDs - Lkp})
```

11. **`Last Reconciled Signature`** — writable single-line text. Automation 010 is the sole writer.

12. **`Reconciliation Needed?`** — formula, numeric `1` or `0`:

```text
IF(AND({Current Reconciliation Signature},{Current Reconciliation Signature}!={Last Reconciled Signature}),1,0)
```

## Trigger and execution contract

Automation **010** owns the dynamic `recordId` trigger on Submissions when `Reconciliation Needed? = 1`. It handles both positive creation/restoration and correction/withdrawal branches, rechecks the exact canonical key before creation, fails closed on zero/multiple links or wrong ownership, and acknowledges the latch only after bounded formula settlement. A settlement timeout leaves the latch pending for retry.

On withdrawal, deactivate only the exact owned XP Event; never delete it. On restoration, reactivate that same event ID and `Source Key`. Milestone and streak owners remain independent; 041/042 remain progression owners and are not XP writers. No email or Make action is part of this contract.
