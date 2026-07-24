# Automation 042 — Config Selection Audit

Agent 10 · 2026-07-24 · **Read-only audit. Do not paste or change PROD.**

Script: `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` (v3.1)

## Verdict

**042 does not read the Config table.** Zoom configuration flags are not selected inside 042.

The Config ambiguity risk for 042 is **indirect**:

1. Stage 17 stamps Zoom Attendance flags (`Zoom Gate Credit Earned?`, approval, conflict) using Effective Config values that ultimately come from linked Global/Program Config rows.
2. 042’s `computeEffectiveZoomAttendanceCount` unions live `Zoom Meetings.Attendees` with ZA recording credits that already have `Zoom Gate Credit Earned?` truthy (plus approved, non-conflict, not Needs Correction).
3. 042 never re-checks `Recording Gives Full Zoom Gate Credit?` (or year) against the Enrollment’s school year.

So: **wrong Config year linkage upstream → wrong gate Zoom count in 042 → wrong Gate Blocked / advancement.**

## What 042 actually reads

| Source | Fields | Year-aware? |
|---|---|---|
| Enrollments | Lifetime XP, totals, streak, level fields | Enrollment has School Year / Program Instance — **unused for Config** |
| Levels | XP Required, Active? | N/A |
| Level Gate Rules | Minimums including Minimum Zoom Meetings | Gate rule set, not Config table |
| Zoom Meetings | Attendees (live) | No Config |
| Zoom Attendance | Attendance Method, Zoom Credit Approved?, Zoom Credit Conflict?, Zoom Gate Credit Earned?, Gate Credit Applied?, Review Status | Flags presuppose Config policy |

## Zoom configuration flags — ownership map

| Flag (Config) | Who applies it | 042 relationship |
|---|---|---|
| Recording Gives Full Zoom Gate Credit? | Stage 17 / Effective Config → ZA `Zoom Gate Credit Earned?` | 042 trusts stamped `gateEarned` |
| Recording Makeup Counts for Perfect Week? | Stage 17 / 117e / Perfect Week path | Not used by 042 |
| Zoom Recording XP Percent of Live | 117c XP amount | Not used by 042 |
| Recording Approval Email * | 117f | Not used by 042 |
| Recording Quiz Requires Coach Approval? | Stage 17 review gate | Indirect: unapproved ZA excluded via `approved` / review status |

## Ambiguity assessment

| Question | Answer |
|---|---|
| Does 042 call `getTable("Config")`? | No |
| Does 042 use `records[0]` on Config? | No |
| Can 042 pick the wrong year Config itself? | No — it never selects Config |
| Can wrong-year Config still break 042? | **Yes** — via ZA gate-credit stamps and meeting Global/Program Config links |
| Is collapsing Config rows the fix? | **No** — keep four year rows; make Stage 17 / linkage year-aware |

## Implementation-ready patch proposal (repo only — not PROD)

Owned proposal file:

`docs/next-wave/config-selection/proposals/042-year-aware-zoom-gate-guard.PROPOSED.js`

Recommended adoption (phased; see runbook):

1. **Do not** rewrite 042’s level math.
2. Add an optional **dry-run / debug** preflight:
   - Read Enrollment `School Year` (and Program Instance school year when present).
   - Resolve Config via `lib/config-selection` hierarchy.
   - If Enrollment year resolves but Zoom Meetings linked Global/Program Config `Active School Year` ≠ resolved year → set `configYearMismatchOut=true`, log structured debug, **fail closed or continue with warning** based on input flag `configYearMismatchMode` (`error` \| `warn`).
3. Optionally, when Config for the enrollment year has `Recording Gives Full Zoom Gate Credit? === false`, **do not count** recording ZA credits even if `Zoom Gate Credit Earned?` is stale-true (defense in depth). Default this behind `enforceConfigGateCreditFlag=true` input for dry-run first.

### Minimal patch sketch (conceptual)

```javascript
// After loading enrollmentRecord — PROPOSED only
const enrollmentYear = getText(enrollmentRecord, enrollmentsTable, "School Year");
const resolve = resolveConfig({
  configRows: /* load Config Active School Year + Recording Gives Full Zoom Gate Credit? */,
  enrollmentSchoolYear: enrollmentYear,
  programInstanceSchoolYear: /* optional PI linked year */,
  explicitConfigRecordId: inputConfig.configRecordId, // optional override
});
if (!resolve.ok) {
  // fail closed when enforceYearAwareConfig=true (input)
  throw new Error(`042 config resolve: ${resolve.error.code} — ${resolve.error.message}`);
}
setOutputSafe("configRecordIdOut", resolve.configRecordId);
setOutputSafe("configSchoolYearOut", resolve.schoolYearKey);
// Pass resolve.config into computeEffectiveZoomAttendanceCount when enforcing gate flag
```

## PROD paste status

**None.** No production script change in this wave. Paste only after DEV dry-run per `CONFIG-ROLLOUT-RUNBOOK.md`.
