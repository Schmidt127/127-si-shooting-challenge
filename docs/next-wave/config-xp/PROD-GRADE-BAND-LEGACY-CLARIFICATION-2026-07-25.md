# PROD Grade Band Legacy Clarification

| Field | Value |
|---|---|
| Date | 2026-07-25 |
| Base | `appn84sqPw03zEbTT` |
| Table | `Grade Bands` (`tblOhHrIqpjcsk2WG`) |
| Completion item | SC-023 |
| Package type | Low-risk record-level clarification |

## Dependency review

The Grade Bands table is shared by Enrollments, XP Reward Rules, Video Feedback, Weekly Athlete Summary, Homework Completions, curriculum, and target-shot configuration. No field names, formulas, links, active flags, grade boundaries, sort orders, or schema were changed.

Before the write, the two legacy rows were confirmed inactive and had no current links in the inspected relationship fields:

- `recg6zvMxWsFSn7sf` — `Grades 1–2`, overlapping active `K-2`
- `recOGisMZRWgk445o` — `Grades 9–10`, overlapping active `9-12`

## PROD change

Only the existing `Notes` field was updated on the two inactive legacy records.

Each note now states that the row is a legacy inactive band, must not be reactivated, overlaps the active canonical band, and had no current links at the time of review.

## Validation

Post-write readback confirmed:

- Active canonical bands remain unchanged: `K-2`, `3-4`, `5-6`, `7-8`, `9-12`.
- Both legacy rows remain inactive.
- Min Grade, Max Grade, Sort Order, and all relationships remain unchanged.
- No tables, fields, formulas, automations, emails, or external systems were changed.

## Status interpretation

This closes the legacy-band clarity portion of SC-023. SC-023 remains **Installed in PROD**, not Live Tested or Complete, because the supervised milestone/OMNI validation is still open.

## Completion-master patch

Update SC-023 evidence/remaining-work text to note:

- Legacy overlapping bands are inactive and explicitly labeled `do not reactivate` in PROD on 2026-07-25.
- Remaining work is the supervised milestone/OMNI validation only.
- Add this evidence file.

No dashboard count changes are required.