# PKG-036 — Progression configuration and bidirectional recalculation reliability

**Status:** **Complete — Production installation and controlled natural-trigger proof passed 2026-08-15.**
**Unified sequence:** Use [`PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md`](./PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md) as the single current operator source. Do not start until PKG-006R lock is released.
**Backlog:** PKG-036
**Production base:** `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)
**Environment exception:** Mike authorized this package's Production-only path;
DEV validation was skipped for this package. Offline tests are not Production
proof.

> **Completion record — 2026-08-15:** Automation 041 v5.0 and Automation 042 v4.1.2 were installed and enabled after preflight. A controlled Charlie Enrollment manual adjustment 0 → 1 → 0 caused 041 to queue exactly one Enrollment on each change; 042 automatically processed and cleared the queue, restoring the 0-XP Beginner state. The read-only audit returned 12 active Levels, 12 active Gate Rules, 3 active Enrollments, and zero findings. Automation 043 remains absent.

## Current Production orientation (Mike-supplied 2026-08-13)

- Automation 010: **v10.7 installed and OFF** after HF-001. Paste and prove
  v10.8 before re-enabling; inspect run history and reconciliation backlog
  before record changes. The unified packet is authoritative.
- Automation 041: deployed; `wflCRvaopntNPsc64`; cron trigger every 15 minutes; installed script is v4.0. **v5.0 paste deferred** until PKG-006R lock release.
- Automation 042: deployed; `wfl3aiiK8vI2tz0HA`; `Enrollments` record-enters-view trigger on view `viwm9OgwkPKI2bii3`; installed script is v3.4. **v4.1 paste deferred** until PKG-006R lock release.
- Automation 043: absent from the Production automation inventory. It must not be recreated.
- Automation 077: **deleted** from Airtable (retired Make/Gmail path); GitHub source archived only.
- Active Levels: **12**; thresholds unique and span 0 through 2200 XP.
- Active school-year Gate Rules: **12** — one rule per Level (Level 1–12). School Year / Rule Set is the approved scope. Mike operates one Program Instance per school year.
- Production `Level Gate Rules` has no `Program Instance` link field. Gate selection is school-year/rule-set scoped; each Enrollment must have exactly one Program Instance.
- `Enrollments.Progression Last Queued Signature` (`fldw2p0bfT54vk6ag`, single-line text): present and unchanged.
- `Enrollments.Progression Last Reconciled Signature`: **created** — verify writable single-line text and record field ID (not interchangeable with `Last Reconciled Signature` on another table).
- PKG-006R reconciliation fields (12): **installed and verified** — verify names/types; do not recreate.

## Repository changes

| Artifact | Version / path | Ownership |
|---|---|---|
| Automation 041 | v5.0 — `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js` | Queue/request only |
| Automation 042 | v4.1 — `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Sole writer of progression assignment fields |
| Read-only audit | `airtable/extension-scripts/audits/audit-pkg-036-progression-integrity.js` | Audit only; no writes |
| Offline harness | `airtable/automations/shooting-challenge/lib/pkg-036-progression-reliability.test.js` | Repository evidence only |

## Required Production schema

**Verify** (do not create) these fields before pasting scripts after PKG-006R lock release:

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

**Deferred until PKG-006R lock release.** Do not paste 041 v5.0 or 042 v4.1.2 before Mike signs off Phase A evidence.
**Detail appendix only:** Execute the unified packet's Phase B rather than this
duplicated sequence if any wording differs.

1. Confirm PKG-006R lifecycle proof is complete and the progression lock is explicitly released.
2. Preserve the current 041/042 scripts, trigger configuration, enablement, and recent run history in the Airtable UI.
3. Turn 041 and 042 OFF. Do not alter Automation 010, 101, or any XP pipeline.
4. **Verify** `Enrollments.Progression Last Reconciled Signature` is writable single-line text. Record field ID. Do not recreate.
5. Paste the committed 041 v5.0 script into automation `wflCRvaopntNPsc64` and preserve the **15-minute** cron trigger. Leave optional `recordId` blank for the scheduled path.
6. Paste the committed 042 v4.1.2 script into automation `wfl3aiiK8vI2tz0HA` and preserve the dynamic `recordId` mapping from the triggering Enrollment record.
7. Preserve the existing 042 view filter: `Level Recalc Needed?` checked and `Active?` checked.
8. Confirm 043 remains absent/OFF.
9. Keep 041 and 042 OFF while saving, then run controlled manual actions on one approved Schmidt Enrollment.
10. Enable 042 first, then 041 after preflight succeeds; 042 must be enabled before 041.
11. After enablement, re-run the read-only PKG-036 audit and preserve the JSON output.

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
