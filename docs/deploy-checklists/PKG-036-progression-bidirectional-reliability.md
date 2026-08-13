# PKG-036 — Progression configuration and bidirectional recalculation reliability

**Status:** Draft — repository implementation complete; Production installation and natural-trigger proof pending  
**Backlog:** PKG-036  
**Production base:** `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)  
**Environment exception:** Mike authorized this package's Production-only path because no DEV Airtable exists. Offline tests are not Production proof.

## Current Production orientation (read-only, 2026-08-13)

- Automation 041: deployed; `wflCRvaopntNPsc64`; cron trigger every 15 minutes, started `2026-08-08T16:00:00Z`; installed script is v4.0.
- Automation 042: deployed; `wfl3aiiK8vI2tz0HA`; `Enrollments` record-enters-view trigger on view `viwm9OgwkPKI2bii3`; installed script is v3.4.
- Automation 043: absent from the Production automation inventory. It must not be recreated.
- Active Levels: 12; thresholds are unique and span 0 through 2200 XP; active names, thresholds, and sort order were read successfully.
- Active 2026–2027 Gate Rules: 12; one observed rule per Level, with Level 1 disabled and Levels 2–12 enabled.
- Production `Level Gate Rules` has no `Program Instance` link field. Gate selection is therefore school-year/rule-set scoped only; the target 042 requires exactly one Program Instance on each Enrollment and must stop if that link is blank or ambiguous. Multi-program same-year gate isolation requires a separately approved schema change.
- Active Schmidt orientation records observed: `recCrNNAdVmQ4Y8fL`, `reclc46bQM8Wx0qWP`, and `recwuMDL6dqIVfvqH`.
- Existing queued-signature field: `Enrollments.Progression Last Queued Signature` (`fldw2p0bfT54vk6ag`, single-line text).
- Missing target field: `Enrollments.Progression Last Reconciled Signature` (not present in Production; do not confuse it with `Last Reconciled Signature` on another table).
- No Production records were modified during orientation.

## Repository changes

| Artifact | Version / path | Ownership |
|---|---|---|
| Automation 041 | v5.0 — `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js` | Queue/request only |
| Automation 042 | v4.0 — `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Sole writer of progression assignment fields |
| Read-only audit | `airtable/extension-scripts/audits/audit-pkg-036-progression-integrity.js` | Audit only; no writes |
| Offline harness | `airtable/automations/shooting-challenge/lib/pkg-036-progression-reliability.test.js` | Repository evidence only |

## Required Production schema

Create this field on `Enrollments` before pasting the scripts:

| Field | Type | Writable | Purpose |
|---|---|---|---|
| `Progression Last Reconciled Signature` | Single line text | Yes | Written only by 042 after verified assignment; 041 uses it to detect stale/missing acknowledgement |

The existing field `Progression Last Queued Signature` remains owned by 041. Do not rename, delete, or convert either field.

The target 041 v5.0 configuration fingerprint is scoped to the Enrollment's
current/next ladder and all thresholds up to the next active level. An edit to
an unrelated future Level or Gate Rule therefore does not queue an unaffected
Enrollment, while a changed threshold, active state, gate rule, lifecycle,
Program Instance, or assignment output in that Enrollment's relevant ladder
does.

## Installation order

1. Confirm PKG-034 is no longer testing Production progression. It is currently merged; recheck live coordination before execution.
2. Preserve the current 041/042 scripts, trigger configuration, enablement, and recent run history in the Airtable UI.
3. Turn 041 and 042 OFF. Do not alter Automation 010, 101, or any XP pipeline.
4. Create `Enrollments.Progression Last Reconciled Signature` as a writable single-line text field. Do not add a formula, lookup, or rollup. Confirm the newly created field ID in the operator log.
5. Wait for the field to settle and verify the field name/type.
6. Paste the committed 041 v5.0 script into automation `wflCRvaopntNPsc64` and configure its existing 15-minute cron trigger. Leave the optional `recordId` input blank for the scheduled path.
7. Paste the committed 042 v4.0 script into automation `wfl3aiiK8vI2tz0HA` and preserve the dynamic `recordId` mapping from the triggering Enrollment record.
8. Preserve the existing 042 view filter: `Level Recalc Needed?` checked and `Active?` checked.
9. Confirm 043 remains absent/OFF.
10. Keep 041 and 042 OFF while saving, then run controlled manual actions on one approved Schmidt Enrollment.
11. Enable 042, then 041 after preflight succeeds; 042 must be enabled before 041.
12. Run the read-only PKG-036 audit and preserve the JSON output.

## Controlled Schmidt proof

Use only an agent-created or explicitly approved Schmidt Enrollment. Capture the exact before/after record IDs and run IDs.

- Baseline readback: Lifetime XP, Current Level, Next Level, Level Status, Level Gate Rule, queue checkbox, queued signature, reconciled signature.
- Replay with identical state: no assignment churn and no new queue after the next 041 scan.
- Increase within a level.
- Increase across a threshold.
- Decrease below that threshold.
- Restore the prior XP.
- Return to 0 XP where safe.
- Force an exact retryable 042 error without changing XP Events; verify queue remains checked and the next run repairs the row.
- Verify a maximum-level result has no Next Level or Level Gate Rule.
- If a reversible isolated configuration test is available, change one Level threshold or Gate Rule, verify only affected active Enrollments queue, restore the exact original value, and re-run the audit.
- Read standings after each settled progression change. Do not change standings views or website code in this package.

## Acceptance evidence

Production proof must include:

- 041 → 042 natural-trigger run IDs and outputs.
- Upward and downward progression readbacks.
- Retry after failure with queue preserved.
- Configuration-change propagation and unrelated-enrollment non-change, if safely testable.
- Maximum-level readback.
- Settled formula/rollup observation.
- Standings readback.
- Final audit JSON.

Offline evidence currently passes:

```powershell
node airtable/automations/shooting-challenge/lib/pkg-036-progression-reliability.test.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/042-school-year-gate-rules.test.js
node airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js
```

## Rollback

If any controlled test fails: turn 041/042 OFF; preserve run logs; restore the saved scripts/triggers; restore the exact original configuration values; leave XP Events untouched; re-run the read-only audit; and do not manually guess progression fields. The new signature field may remain empty if the installation is rolled back before script enablement.

## Explicit non-scope

- No XP Event create/update/deactivate/delete.
- No email, Communications Hub, Make, Automation 010, Homework, Video XP, or Automation 101 changes.
- No Automation 043 restoration.
- No public website or standings implementation change.
