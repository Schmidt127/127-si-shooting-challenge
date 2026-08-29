# FUT-001 — Homework assignment identity + deadline (Production paste)

**Backlog:** FUT-001 / SC-016  
**GitHub automations:** **020 v3.8**, **065 v10.4**  
**Branch:** `fix/fut-001-homework-assignment-identity`  
**Status:** Repository complete + offline tests green — **Mike Production paste required** (no Airtable changes in this PR)

## What changed

| Layer | Change |
|---|---|
| **020 v3.8** | Match Homework Completion by **Enrollment + PHA record id** (not upload slot). Accept alternate HW1/HW2 upload when assignment identity is unambiguous. Normalize HC Item/Asset Slot to PHA official slot. Enforce due date; late submissions get **Notes** (HC retained for coach review). |
| **065 v10.4** | Remove PHA↔HC slot mismatch gate. Block positive XP when submission date is after **PHA Due Date** (fallback **Week End Date**). XP dedupe unchanged: `HOMEWORK_XP\|{hcId}`. |
| **Contracts** | `lib/homework-contracts/assignment-identity.js`, mirrors in `lib/v2-engine-contracts.js` |

## Identity fields (authoritative)

| Purpose | Field / key |
|---|---|
| Parent selection | `Submissions.Homework Name 1/2` → **Program Homework Assignment** record id |
| Schedule content | `PHA.Homework Assignment` → **Homework Library** record id |
| HC dedupe | **Enrollment** + **Program Homework Assignment** |
| XP dedupe | `HOMEWORK_XP\|{Homework Completion record id}` (unchanged) |
| Due date | `PHA.Due Date` → fallback `Weeks.End Date` |

HW1/HW2 labels are **routing metadata only** — not assignment identity.

## Airtable fields — no new schema required

Existing fields used:

- `Program Homework Assignments.Due Date`
- `Weeks.End Date`
- `Homework Completions.Notes` (late explanation)
- `Homework Completions.Submission Date` (deadline compare in 065)

### Optional future field (not created in this task)

A dedicated **`Credit Eligible?`** or **`Submission Timing Status`** single-select on Homework Completions would improve parent/coach interfaces. Until Mike adds it, late status is carried in **Notes** + 065 ineligible reconciliation.

## Mike paste checklist (Production)

Paste **after** this PR is merged to `master` (or from this branch tip). Skip the GitHub-only header above the production docblock.

### Automation 020 — Link or Create Homework Completion

1. Open Production automation **020**.
2. Open the **Run a script** action.
3. Replace the script body with `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js` from the production docblock (`/************************************************************`) through EOF.
4. Confirm header shows **Version: v3.8** and `SCRIPT.version = "v3.8"`.
5. Confirm input: `recordId` = triggering **Submission Assets** record ID (dynamic).
6. Optional outputs to map if used in run history: `creditEligible`, `timingStatus`, `dueDateKey`, `officialSlot`, `uploadSlot`, `alternateUploadSlot`, `assignmentIdentityMethod`.
7. Save / keep **Live**.

### Automation 065 — Create or Reconcile Homework XP Event

1. Open Production automation **065**.
2. Open the **Run a script** action.
3. Replace with `airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js` from production docblock through EOF.
4. Confirm **Version: v10.4** / `SCRIPT.version = "v10.4"`.
5. Confirm input: `recordId` = triggering **Homework Completion** record ID (dynamic).
6. Save / keep **Live**.

### Disposable verification (Schmidt / test enrollments only)

1. Submit the same PHA via the **other** upload slot → one HC; `officialSlot` matches PHA; `alternateUploadSlot` true when applicable.
2. On-time submission → coach can mark Satisfactory → **one** `HOMEWORK_XP|{hcId}` XP Event.
3. Late submission (activity date after PHA Due Date) → HC created with Notes; Satisfactory path awards **no** positive XP (065 ineligible).
4. Second upload / re-submit for same Enrollment+PHA → same HC; no second XP Event.
5. Update `CHANGELOG.md` under `### Airtable` after paste.

## Verification commands (GitHub)

```bash
node --test tests/homework-contracts/run-all.js
node --test tests/homework/automation-005-020-pha-direct.test.js
node tests/homework/automation-020-sc016-identity.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node tests/homework/pha-grade-band-metadata-contract.test.js
node --test tests/automation-contracts/065-066-trigger-record.test.js
```

Optional web due-date surface (already shipped separately):

```bash
cd web && npm run test:e2e -- tests/homework-due-date.spec.ts
```

## Out of scope (unchanged)

- Fillout form layout (still HW Sub 1/2 + Homework Name 1/2)
- **005** slot normalization (moves misplaced PHA IDs between name fields)
- **067** quiz path (Enrollment+Week+Homework dedupe)
- Video Feedback / daily shooting submissions
- Production Airtable paste (Mike)
