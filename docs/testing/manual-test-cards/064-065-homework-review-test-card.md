# Homework review / test card — Automations 064 and 065

| Field | Value |
|-------|--------|
| Automations | **064** (prepare base XP) → **065** (create/reconcile XP Event) |
| Base | PROD `appn84sqPw03zEbTT` |
| Test records | HW1 `recpuUEXGlVve9tRN` · HW2 `recRqpUYx9FOucIup` |
| XP owner | **065** only — never create Homework XP Events manually |

## Purpose

Confirm that coach review fields correctly arm the homework XP pipeline: **064** writes base/total XP amounts and sets **Award Status = Pending**; **065** creates or reconciles exactly one canonical XP Event per Homework Completion.

## Required review fields (you set these on each Homework Completion)

Complete all three before expecting 064/065 to award XP:

| Field | Required value | Why |
|-------|----------------|-----|
| **Coach Feedback** | Non-empty text | 064 fails closed if blank |
| **Satisfactory?** | Checked | Review approved |
| **Review Complete** | Checked | Coach review finished |

Also confirm before testing:

- **Enrollment** linked (exactly one)
- **Homework** / PHA identity resolvable
- **Week** linked
- **Submission Date** populated
- Enrollment **Active?** checked
- Canonical **Weekly Athlete Summary** exists for positive award (065 requires exactly one WAS for create/reactivate)

## Test sequence

### HW1 — `recpuUEXGlVve9tRN`

1. Open Homework Completion `recpuUEXGlVve9tRN`.
2. Set **Coach Feedback**, **Satisfactory?**, and **Review Complete** as above.
3. Save and allow automations to run (064 then 065), or run their script steps with `recordId` = `recpuUEXGlVve9tRN` if testing manually.
4. Record outputs and field states (section below).
5. Run duplicate-safety replay (section below).

### HW2 — `recRqpUYx9FOucIup`

Repeat the same steps for `recRqpUYx9FOucIup`.

## Expected 064 results

After review fields are complete, **064** should:

| Field / output | Expected |
|----------------|----------|
| **Base XP Awarded** | Populated from active **HOMEWORK_COMPLETION** XP Reward Rule |
| **Total Homework XP Awarded** | Reflects base (+ extra credit if applicable) |
| **Award Status** | `Pending` (arms 065) |
| **Automation Error** | Cleared / empty on success |
| Enrollment **Run Shot Milestone Check?** | Re-armed true |

064 **does not** create XP Events. If **Base XP Awarded** is already populated from a prior run, 064 may retain it and reset **Award Status** to `Pending` so 065 can safely reconcile.

## Expected 065 results

When **Homework XP Reconciliation Needed?** = 1 (driven by signature/review state), **065** should:

| Output / field | Expected |
|----------------|----------|
| `statusOut` | `success` (or controlled `skipped` if already reconciled) |
| `actionOut` | `created_or_reactivated` or `reused_after_recheck` on replay |
| `sourceKeyOut` / XP Event **Source Key** | `HOMEWORK_XP\|{Homework Completion ID}` |
| XP Events link on HC | Exactly one owned event for that Source Key |
| XP Event **Active?** | Checked when review remains satisfactory |
| **Award Status** on HC | Moves to awarded/reconciled state after success |
| **Last Homework XP Reconciled Signature** | Updates after formula settle |
| **Homework XP Reconciliation Needed?** | Clears to 0 after success |

Confirm on the XP Event:

- **Enrollment**, **Week**, **Homework Completion**, and **Weekly Athlete Summary** ownership match the HC
- **XP Points** = **Total Homework XP Awarded** on the HC
- No second row with the same Source Key

## Duplicate-safety checks

Run after each HW success:

1. **Replay 065** with the same `recordId`.
   - Must not create a second `HOMEWORK_XP|{HC ID}` event.
   - Expect `reused_after_recheck` or equivalent skip/repair action.
2. **Search XP Events** for Source Key `HOMEWORK_XP|recpuUEXGlVve9tRN` (then HW2).
   - Exactly **one** row each.
3. **Toggle review off (optional negative test):** Uncheck **Satisfactory?** or clear **Review Complete** only on a disposable test HC — expect 065 to deactivate/reconcile owned event without creating a duplicate. Do not use this destructive step on production athlete rows unless Mike approves.
4. **Do not** manually create Homework XP Events or edit Source Key.

## Failure signals

| Signal | Action |
|--------|--------|
| 064 error / **Automation Error** populated | Fix review fields and links first |
| 065 `statusOut` = `error` | Read `errorOut`; often WAS ambiguity or PHA identity |
| Two `HOMEWORK_XP\|…` rows | Stop — duplicate safety failure |
| Positive award with zero WAS | Fail closed by design |

## Out of scope

- Homework Completion create/link (**020** / **067**)
- Parent feedback email (**071** → Hub)
- Homework asset upload (**070a** — PROD OFF by design)
- Automation **063** (retired)
