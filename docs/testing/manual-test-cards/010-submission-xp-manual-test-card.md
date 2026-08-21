# Manual test card — Automation 010 (Submission Base XP)

| Field | Value |
|-------|--------|
| Automation | **010** — Submission Intake and Asset Creation — Create XP Event from Submission |
| Production script | **v10.10** (Mike 2026-08-19) |
| GitHub script | **v10.11** (midnight-UTC date keys — paste pending; see comparison card) |
| Base | PROD `appn84sqPw03zEbTT` |
| Owner automation | 010 only — do not create XP Events by hand |

## Purpose

Confirm that Automation 010 reconciles one Submission’s canonical **Submission Base XP Event**, writes the expected script outputs, clears `Reconciliation Needed?`, and remains duplicate-safe on replay.

## Preconditions (check before each run)

1. Automation **010** is **Live** in the Automations UI.
2. Open the target **Submission** record first and confirm:
   - `Count This Submission?` is checked
   - `Total Shots Counted` > 0
   - Exactly one **Enrollment**, one **Week**, and one canonical **Weekly Athlete Summary** (or a resolvable WAS pair)
   - `Activity Date` is on or before today and falls inside the linked Week’s date range
   - Enrollment **Active?** is checked
3. Note the current values of:
   - `Reconciliation Needed?`
   - `Last Reconciled Signature`
   - Linked **XP Events** (count and IDs)
   - `XP Award Status`

## How to run (same steps for each Submission below)

1. Open **Automations** → **010** → open the **Run a script** action (do not rely on the trigger test alone).
2. Set the script input variable:
   - **Name:** `recordId`
   - **Value:** the Submission record ID from the table below (copy the `rec…` ID exactly)
3. Run the script step and wait for completion.
4. Capture the script action outputs (or automation run log JSON).

### What `recordId` means

Enter the **Submission** record ID (`rec…`), not the Enrollment, Week, WAS, or XP Event ID. The script loads that Submission and reconciles its owned event using Source Key `SUBMISSION_XP|{that same Submission ID}`.

## Test sequence

Run in this order. Wait for formulas to settle between runs before confirming field states.

| Step | Submission record ID | Notes |
|------|----------------------|--------|
| 1 | `recv8a0SieH75Zzgu` | First proof |
| 2 | `rec8Qrt5dn0denguA` | Second proof |
| 3 | `recaxgOnpULYSSvXs` | Third proof |

## Expected success output (eligible Submission)

When the Submission is eligible and reconciliation succeeds, expect script outputs similar to:

| Output | Expected |
|--------|----------|
| `statusOut` | `success` |
| `actionOut` | One of `created`, `reactivated_same_event`, or `repaired_same_event` |
| `errorOut` | empty |
| `reconciliationAcknowledged` | `true` |
| `sourceKey` | `SUBMISSION_XP\|{Submission record ID you entered}` |
| `submissionId` | Same Submission ID |
| `xpEventId` | One XP Event record ID |
| `debugStep` | Reaches settlement / acknowledgement |

If the Submission was already reconciled and nothing changed, you may see `skipped` / `skipped_already_reconciled` — that is acceptable **only** when the Submission was already in a good state before the run.

## Confirm `SUBMISSION_XP|{Submission ID}` was created (or correctly owned)

1. Open **XP Events** and filter or search **Source Key** = `SUBMISSION_XP|{Submission ID}` (use the exact Submission ID from the run).
2. Expect **exactly one** row with that Source Key for a successful eligible run.
3. On that XP Event, confirm:
   - **Active?** = checked (for an eligible counted submission)
   - **Submission** link points to the tested Submission
   - **Enrollment**, **Week**, and **Weekly Athlete Summary** match the Submission’s canonical links
   - **XP Points** matches the active **SHOOTING_BASE** reward rule amount
4. On the **Submission** record, confirm the same XP Event appears in **XP Events** and `XP Award Status` reflects an awarded/reconciled state.

**Do not** create or duplicate XP Events manually. If Source Key is missing or duplicated, stop and capture screenshots — do not “fix” by hand.

## Confirm `Reconciliation Needed?` clears

1. After the run completes, refresh the Submission record.
2. `Reconciliation Needed?` should read **unchecked / 0** once formulas settle (may take a short refresh cycle).
3. `Last Reconciled Signature` should update to match the current reconciliation signature chain.
4. Script output `reconciliationAcknowledged` = `true` is the in-run proof; the field clearing is the post-formula confirmation.

If `Reconciliation Needed?` stays checked after a claimed success, treat the run as **FAIL** even if partial writes occurred.

## Duplicate-safety checks (run after each successful step)

1. **Immediate replay:** Run the same `recordId` again through the **Run a script** action.
   - Expect `statusOut` = `skipped` or `success` with `actionOut` = `skipped_already_reconciled`, `repaired_same_event`, or `reactivated_same_event` — **not** a second canonical Source Key.
2. **XP Events table:** Re-query Source Key `SUBMISSION_XP|{Submission ID}`.
   - Count must remain **1**.
3. **Submission → XP Events link:** Must not gain a second unrelated Submission Base event.
4. **Downstream flag:** Enrollment `Run Shot Milestone Check?` may be set true after success — that is expected once; repeated identical replays should not spam duplicate milestone work.

## Failure signals (stop and capture evidence)

| Signal | Meaning |
|--------|---------|
| `statusOut` = `error` | Script failed closed — read `errorOut` and `debugStep` |
| `actionOut` starts with `blocked_` | Ownership / ambiguity / formula lag — no silent fix |
| Multiple `SUBMISSION_XP\|…` rows | Duplicate safety broken — do not continue |
| Manual XP Event created | Invalidates test — revert only through approved repair paths |

## Out of scope

- Milestone, streak, homework, video, Zoom, Perfect Week, or weekly threshold XP (other automations own those families).
- Pasting GitHub **v10.11** from this card (see [010 v10.10 vs v10.11](./010-v10.10-vs-v10.11-comparison.md)).
