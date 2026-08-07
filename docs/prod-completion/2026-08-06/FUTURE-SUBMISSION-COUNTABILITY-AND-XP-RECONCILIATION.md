# Future Submission Countability and XP Reconciliation

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Submission countability defect

`Submissions.Count This Submission?` previously validated duplicate status and shooting-stat shape, but did not fail closed when:

- `Activity Date Is Future? = 1`; or
- `Week` was empty.

A PROD audit found 10 future-dated submissions contributing counted shots.

The formula was repaired directly in PROD to return zero when Activity Date is future, Week is missing, or duplicate status is Exclude It / Needs Review. Existing Simple Total and Detailed Shooting validity behavior was preserved.

## Verification

- Future/no-Week Submission `recuwq1GuCrDx5TcC` recalculated to zero and was deleted after confirming it had no XP, asset, homework, video, or testing-scenario dependencies.
- Future Week-assigned submissions `rec2f3SDemsJSkeIO` and `recbsbSR5UXhFOdjo` now return Count This Submission = 0.
- Valid past Week-assigned controls `recA1YgNKTJ1LgTwF` and `recVLL0vDAX6WniCA` remain countable.
- Weekly Summary shot rollups use `Total Shots Counted`; future historical fixture summaries recalculated to zero shots.

## XP retired

### Future-submission XP

Seven active XP Events tied to future-dated source submissions were retired:

- `recOodD23MQrP1O9F`
- `recOqzhV4kTdsfzMf`
- `recQxiwjLOvQ8BzSB`
- `recYQ10pOoFlApmjZ`
- `recffMjiomQwV0VR4`
- `recovVbiZynRUtDwF`
- `recrYV19IqolkoMwT`

### Eligibility-loss and missing-source XP

The following were also retired:

- Threshold XP `recE0wfNVGzV97amx`, `rechDW1PCbgXJV1Nv`, `recZZBu9W6puKiRch` after their source summary recalculated to zero counted shots.
- Submission XP `recPdp5afnI70f2hd` tied to a future Post Challenge submission.
- Submission XP `recwbm3TnabOgB6ni` whose source key references missing Submission `recQGFTQGx1HX7SVF`.
- Perfect Week XP `recMdcI5lN8gJ6830`, dated 2026-08-09 and referencing deleted test Week `reci5GdxEC57vfoS3`.

All retired records now have computed Active XP Points = 0.

## Enrollment totals after cleanup

- Active Schmidt 2026-2027 Enrollment `recCyFEPeATOVNlr9`: 18,576 counted shots; 608 Lifetime XP.
- Historical Schmidt 2025-2026 Enrollment `recgP9qZYjAhE7NXm`: 886 counted shots; 590 Lifetime XP.

## Automation findings

### Automation 010

Automation 010 requires `Count This Submission? = 1`; the shared formula repair now blocks future submissions from receiving Submission Base XP through this path.

### Automations 113 and 114

Automations 113/114 do not adequately validate the linked Submission before preparing or awarding Video Feedback XP. Airtable inventory records were marked with confirmed-defect warnings and Cursor verification was cleared.

GitHub issue #101 defines the repair and tests.

### Threshold and Perfect Week reconciliation

Existing awards remain active when eligibility later falls. GitHub issue #102 defines required retirement/reactivation and replay-safe reconciliation behavior.

## Completion status

No automation completion status should advance from this cleanup alone. Formula behavior is repaired and live-verified, but issues #101 and #102 require repository implementation, Airtable editor installation, trigger verification, and controlled tests.
