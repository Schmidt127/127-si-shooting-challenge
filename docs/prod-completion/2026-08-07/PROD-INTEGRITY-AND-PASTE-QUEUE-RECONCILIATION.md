# PROD Integrity and Paste Queue Reconciliation — 2026-08-07

## Scope

This evidence package records direct PROD integrity work completed against the controlled Schmidt 2026-2027 testing enrollment and reconciles the Program Instance isolation paste queue against the Airtable automation inventory.

Controlling source remains `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`.

## Controlled PROD records

- Enrollment: `recCyFEPeATOVNlr9` — Schmidt — Testing - 2026-2027
- Program Instance: `rec5mEM0YPqPqq0hZ` — Shooting Challenge | 2026-2027
- Current Early Bird Week: `recWeVrSabnsYaHc2`
- Canonical Early Bird Weekly Athlete Summary: `recMMeJENu6Pg8l58`
- Controlled Perfect Week CASE-01 fixture summary: `recKebuZ79QFTwivA`

## Completed PROD integrity repairs

### 1. Program Homework Assignment Week repair

90 active Program Homework Assignment schedule rows tied to the current Program Instance were remapped from legacy 2025-2026 Week records to their matching 2026-2027 Week records.

Post-repair verification:

- 92 total Program Homework Assignment rows in the current controlled scope.
- 90 rows have non-empty Schedule Keys.
- Those 90 rows form the expected 9-week × 5-grade-band × 2-slot matrix.
- No duplicate non-empty Schedule Key was found.
- Exactly two rows remain intentionally weekless/keyless because they are controlled Perfect Week fixture assignments with linked completion evidence:
  - `reca5GM1JkROhXOiy` — HW1
  - `reccQhrgOK8e8Yngv` — HW2
- Do not attach those two fixture rows to a live Week without an explicit fixture-isolation migration.

### 2. Weekly Athlete Summary integrity

The controlled Schmidt enrollment currently has exactly two Weekly Athlete Summary records:

1. `recMMeJENu6Pg8l58` — canonical live Early Bird summary with Summary Key `ATH-recgqVstObQRzgXJF|2026-2027|2026-2027|Early Bird` and two linked submissions.
2. `recKebuZ79QFTwivA` — intentionally Week-less / Summary-Key-less Perfect Week fixture with seven fixture submissions and Perfect Week unlock evidence.

No duplicate live Summary Key was found.

### 3. Submission boundary audit

The current Schmidt enrollment has nine submissions:

- two canonical Early Bird submissions;
- seven controlled Perfect Week fixture submissions.

At the time of audit on 2026-08-07 America/Denver, the future-dated fixture rows for 2026-08-07 and 2026-08-08 were correctly marked future/non-countable and must not leak into live progress.

Historical submission `rec9yoDZ3DMIEhi3I` belongs to the 2025-2026 Schmidt enrollment and is already non-countable/future. Previously referenced `recuwq1GuCrDx5TcC` no longer exists.

`Submissions.Program Instance synced` (`fldm47Ar3rKitJ1KE`) is a direct link field and is blank on the nine current Schmidt submissions. It was not backfilled. Current Automation 005 v4.1 isolates through `Submission -> Enrollment.Program Instance -> Week.Program Instance`, so no dependency was established that would justify writing this legacy/direct-link field.

### 4. Level Gate Rule season alignment

All 12 active Level Gate Rules (Levels 1-12) formed one complete active rule set. Their rule-set/year labels were changed from `2025-2026` to `2026-2027`, and all were verified linked to the 2026-2027 Config record.

This repairs the data-layer season mismatch only. It does not repair Automation 043 stale-link/replay behavior.

### 5. Canonical Video Feedback writer

Airtable inventory and repository reconciliation agree:

- Automation 013 is the sole canonical Submission Asset -> Video Feedback create/link writer.
- Automation 112 is retired/off and must not be recreated.
- Remaining source-field / slot provenance and replay-safety work is tracked separately.

## Program Instance isolation paste queue — inventory reconciliation

The Airtable `Automations` table was reconciled against the controlling repository/master requirements. `Ran Through Cursor?` was cleared on all six queue records. Inventory `Status` was not changed where it may reflect the actual automation toggle; `Live` does not prove the stored or editor script is current.

| Automation | Airtable inventory record | Stored inventory code | Required repository/master target | Inventory disposition |
|---|---|---:|---:|---|
| 023 Assign Enrollment to Submission | `recFTk9CJM6J8sMrB` | v2.0 | v3.1 | Stale warning stamped; requires editor paste/verification and Schmidt test |
| 053 Rebuild/Upsert Streak Occurrences | `recgH5hQgJA9IfLQE` | v5.0 | v5.3 | Stale warning stamped; requires Program Instance-scoped editor paste/test |
| 066 Create Shot Milestone Unlocks | `rec0qiy0iXVqrU3c2` | v2.1 | v3.5 | Stale warning stamped; requires corrected createRecords + PI isolation + replay proof |
| 118 Schedule Weekly Summary Build | `recl5DLUTHPnsccls` | not pasted | v1.7 | Status remains Off; requires editor paste/input verification/controlled run |
| 119 Schedule Weekly Summary Send | `recGZKmAHjkU2LCs3` | not pasted | v1.7 | Status remains Off; requires editor paste/input verification/controlled run |
| 043 Set Level Gate Rule from Next Level | `recZWrVJTi2ovc3uM` | v2.0 | v2.1 | Data year repaired, but stale-link code defect remains; requires editor repair/test |

Required deployment/test order remains:

`023 v3.1 -> 053 v5.3 -> 066 v3.5 -> 118 v1.7 -> 119 v1.7 -> 043 v2.1 if Live`

## Important non-claims

- No Airtable automation editor code was changed by this evidence package.
- No automation is considered live-tested merely because the Airtable inventory Status says `Live`.
- 118 and 119 remain explicitly Off until editor paste/input verification and a controlled Schmidt test pass.
- The Perfect Week fixture summary and its linked completion/XP/achievement evidence remain preserved.

## Next execution gate

Cursor/live-editor work should execute the paste queue in the controlling order above, proving each automation against the controlled Schmidt enrollment before advancing the next item.

After those editor tests, consolidate this evidence into `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` and advance statuses only where the live evidence supports it.
