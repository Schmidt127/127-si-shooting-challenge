# PKG-014 / PKG-016 — Immediate Initial Level Assignment Promotion

**Status:** GitHub implementation ready; DEV validation and Production promotion pending Mike approval  
**Backlog:** `PKG-014` implementation with `PKG-016` trigger/version verification  
**Scripts:** Automation 001 v5.4, Automation 041 v4.0, Automation 042 v3.4  
**Date:** 2026-08-12

## Change and safety boundary

Automation 001 now checks `Level Recalc Needed?` only after a canonical Enrollment has:

- passed identity and same-year duplicate protection;
- a linked Athlete;
- a valid consecutive `School Year` in `YYYY-YYYY` form; and
- `Active? = true`.

Automation 001 does not write progression outputs or `Progression Last Queued Signature`.
Duplicate-blocked, inactive, missing-data, invalid-school-year, skipped, and error paths do not
request recalculation.

Automation 042 v3.4 requires `Active?`. It checks that value after loading the Enrollment and
before writing `Level Status = Processing`. An inactive direct invocation clears only a stale
`Level Recalc Needed?` request, returns `skipped_inactive`, emits console/output evidence, and
preserves `Current Level`, `Next Level`, `Level Gate Rule`, and `Level Status`.

Automation 042 remains the sole writer of progression outputs. Automation 041 remains scheduled
reconciliation and signature maintenance. Automation 043 remains retired and must not be created.

## Offline evidence

Run from the repository root:

```text
node tests/enrollment-intake/automation-001-unload-compat.test.js
node tools/testing/tests/test_041_recalculation_coverage.mjs
node airtable/automations/shooting-challenge/lib/042-school-year-gate-rules.test.js
node tests/progression/immediate-initial-level-assignment.test.js
node tests/airtable-runtime/active-automation-unload-compat.test.js
git diff --check
```

The progression fixture explicitly requires exactly one active Level with cumulative XP threshold
`0`. This is the safe zero-XP starting configuration requirement. Production configuration must
have one and only one such lowest active Level; this package does not change Level records or XP
economics.

## DEV validation — required before Production

Use DEV base `appTetnuCZlCZdTCT` only.

1. Paste the committed Automation 001 v5.4 source into the existing DEV Automation 001.
   Preserve the registration trigger and dynamic Enrollment `recordId`.
2. Paste the committed Automation 042 v3.4 source into the existing DEV Automation 042.
   Preserve the “when record enters view” trigger and dynamic triggering-record `recordId`.
3. Confirm the DEV view `042 - Needs Level Assignment` has both filters:
   - `Level Recalc Needed?` is checked;
   - `Active?` is checked.
4. Confirm DEV Levels has exactly one active row with `XP Required (Cumulative) = 0`.
   Record that row and confirm the next active Level and its school-year Gate Rule.
5. Confirm DEV Automation 041 remains v4.0, scheduled, with optional `recordId` blank for the
   scheduled path. It may establish/update its signature but must not write progression outputs.
6. Register one brand-new unique test athlete for a valid school year. Confirm:
   - 001 links the canonical Enrollment and sets `Active? = true`;
   - Grade Band assignment still occurs normally;
   - `Level Recalc Needed?` becomes checked immediately;
   - 042 runs without waiting for 041;
   - at zero XP, 042 assigns the lowest active Level, the next active Level, and that next
     Level’s school-year Gate Rule;
   - `Level Status = Assigned`, `Lifetime XP Total = 0`, and the queue checkbox is cleared;
   - the welcome email remains one-time.
7. Use the existing duplicate evidence and offline fixture for the negative duplicate proof.
   Do not create an unnecessary duplicate. Never manually trigger 042 on an inactive DEV record
   solely to prove this case; if a named DEV check is approved, verify only that a direct
   inactive invocation clears the stale request and preserves historical progression fields.
8. Run the next scheduled 041 reconciliation. Confirm it is idempotent: it may retain/update its
   signature, but it does not cause repeated queue churn or incorrect progression.
9. Record DEV record IDs, automation run IDs/outputs, timestamps, and the exact versions.

## Production promotion — Mike executes only after DEV proof

Production base: `appn84sqPw03zEbTT`.

1. Confirm Production Automation 041:
   - version `v4.0`;
   - scheduled trigger ON;
   - optional `recordId` blank;
   - no script change is required unless repository/DEV validation proves otherwise.
2. Update the existing Production view `042 - Needs Level Assignment`:
   - `Level Recalc Needed?` is checked;
   - `Active?` is checked.
   Do not rely on the view alone; v3.4 retains the code guard.
3. Replace the body of the existing Production Automation 042 with the merged v3.4 source.
   Preserve the existing trigger, dynamic triggering-record `recordId`, and automation identity.
   Do not create another automation.
4. Replace the body of the existing Production Automation 001 with the merged v5.4 source.
   Preserve the registration trigger, dynamic Enrollment `recordId`, and welcome-email path.
   Do not create another automation.
5. Confirm Automations 001 and 042 are ON. Confirm Automation 043 remains retired/not deployed.
6. Run one controlled test with one brand-new unique athlete:
   - registration succeeds;
   - canonical Enrollment becomes active and linked;
   - Grade Band assigns normally;
   - 001 checks `Level Recalc Needed?` immediately;
   - 042 runs without waiting for 041;
   - `Current Level = Beginner`;
   - `Next Level = Rookie Shooter`;
   - `Level Gate Rule = Level 2 Gate`;
   - `Level Status = Assigned`;
   - `Lifetime XP Total = 0`;
   - `Level Recalc Needed?` is cleared;
   - welcome email is sent once.
7. Negative proof: use offline evidence plus the existing blocked duplicate to confirm inactive
   rows are excluded from the view. Do not create another duplicate solely for this proof and do
   not manually invoke 042 on an inactive Production record.
8. Confirm the next scheduled 041 run is idempotent and does not change the correct assignment.
9. Record Production automation versions, view state, record IDs, run outputs, timestamps, and
   the operator performing each step. Update `CHANGELOG.md` after Mike completes the promotion.

## Rollback

If the controlled test fails, turn off the new 001/042 versions, restore the prior committed
Production script bodies (001 v5.3 and 042 v3.3), and leave the view filters unchanged unless
the prior trigger behavior requires restoration. Do not delete records, erase historical
progression fields, recreate 043, alter Levels/Gate Rules/XP economics, or change welcome-email
recipients. Preserve all run evidence and report the first failing step.
