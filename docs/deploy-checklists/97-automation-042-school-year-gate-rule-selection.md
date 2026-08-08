# Issue #97 — Automation 042 School-Year Gate-Rule Selection

Status: **Repository implemented; DEV/PROD install and Schmidt live proof pending**

## Change

Automation 042 v3.3 now:

1. Reads `Enrollments.School Year`.
2. Reads `Level Gate Rules.School Year / Rule Set`.
3. Selects one active exact-year rule per linked Level.
4. Uses only an explicitly shared/default rule (`Shared`, `Default`, `All Years`, or blank) when no exact-year rule exists.
5. Ignores inactive rules.
6. Fails closed on duplicate applicable rules, malformed active rule years, missing enrollment year, or prior-year-only candidates.
7. Remains the sole writer of `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status`, and `Level Recalc Needed?`.

The committed source is:

`airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`

## Repository evidence

Run from the repository root:

```powershell
node --check "airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js"
node "airtable/automations/shooting-challenge/lib/042-school-year-gate-rules.test.js"
node "airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js"
node "airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js"
```

Required offline cases are covered by
`lib/042-school-year-gate-rules.test.js`: same-year selection, prior-year-only rejection, shared fallback, duplicate same-year rejection, inactive same-year handling, and deterministic replay/no link churn.

## DEV install and test — Mike/authorized operator

Do not paste into Production first.

1. Confirm DEV base: `appTetnuCZlCZdTCT`.
2. Paste the exact committed Automation 042 v3.3 source into the Automation 042 editor.
3. Confirm trigger remains `Enrollments` → `When record enters view` → `042 - Needs Level Assignment`.
4. Confirm input variable `recordId` maps to the triggering Enrollment record ID.
5. Confirm the editor exposes these fields without schema changes:
   - `Enrollments.School Year`
   - `Level Gate Rules.School Year / Rule Set`
6. Run a DEV enrollment with a same-year rule and verify the selected `Level Gate Rule`.
7. Run a DEV enrollment with only a prior-year rule and verify the run errors / sets `Level Status = Error`; it must not link the prior-year rule.
8. Run a DEV enrollment with a single `Shared`/`Default` rule and verify fallback.
9. Add two active same-year candidates in DEV only and verify fail-closed error.
10. Deactivate the same-year candidate and verify it is ignored.
11. Replay the same enrollment and verify the five owned links/status fields do not churn.

Record the editor version, trigger/input mapping, run output, and affected record IDs before promotion.

## PROD install and controlled Schmidt proof — Mike/authorized operator

Only after DEV passes and Mike approves promotion:

1. Confirm the current PROD rule inventory has one active intended rule per Level for `2026-2027`; do not create parallel rows during the test.
2. Paste the exact committed v3.3 source into the PROD Automation 042 editor.
3. Capture the editor version/checksum, trigger, view, and `recordId` mapping.
4. Use only controlled Schmidt Enrollment `recCyFEPeATOVNlr9`.
5. Set or verify `Level Recalc Needed?` for that enrollment through the approved controlled procedure.
6. Trigger 042 and capture:
   - run status and structured output;
   - `School Year = 2026-2027`;
   - selected `Level Gate Rule` is the `2026-2027` rule for the computed Next Level;
   - `Current Level`, `Next Level`, `Level Status`, and recalc flag;
   - no changes to unrelated records.
7. Replay the same controlled record and verify no link churn, duplicate rules, duplicate XP, or duplicate side effects.
8. If the run fails, restore the prior committed script in the editor and record the rollback; do not close issue #97.

The PROD live proof is not satisfied by repository tests or by a pasted script alone. It requires the actual editor installation plus the controlled Schmidt first-run and replay evidence.

## Rollback

If validation fails, restore the prior committed Automation 042 v3.2 source in the same editor, preserve the failure evidence, and leave issue #97 open. Do not repair the wrong-year link by hand as a substitute for verifying the writer.
