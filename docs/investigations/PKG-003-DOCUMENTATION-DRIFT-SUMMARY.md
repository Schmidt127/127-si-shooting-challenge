# PKG-003 — Documentation and Contract Drift Summary

**Status:** Repository-only reconciliation
**Baseline:** `origin/master` `6e0b3ad36dbadb0b211c750695bafcb9262c73e1`
**Scope:** Active package/operator documentation, automation index, trigger map,
and source-header contract coverage. No Airtable or runtime changes.

## Canonical source versions

| Automation | Canonical repository version |
|---|---:|
| 031 | v4.1 |
| 032 | v3.4 |
| 057 | v1.7 |
| 058 | v1.3 |
| 076 | v8.6 |
| 079 | v2.0 |
| 101 | v6.3 |
| 118 | v2.0 |

## Reconciled drift

- Added canonical versions to the corresponding current rows in
  `docs/automation-index.md` and
  `airtable/schema/current/automation-trigger-map.md`.
- Added the missing 079 Communications Hub and 118 weekly-scheduler rows to the
  trigger map.
- Corrected the active Automation 101 documentation boundary: v6.3 is the
  canonical repository source; v6.1 remains preserved as dated historical
  installed evidence and is not current installation proof.
- Updated PKG-034 and PKG-037 operator instructions so a future run
  re-attests the installed version before using v6.3.

## Contract guard

`tests/automation-contracts/docs-canonical-header.test.js` reads the canonical
source headers for 031, 032, 057, 058, 076, 079, 101, and 118 and requires both
the automation index and trigger map to state the same version. It does not
inspect or modify Airtable state.

## Evidence boundary

The reconciliation does not upgrade any installed-version claim. Airtable UI
or exported automation evidence remains authoritative for current installation,
trigger, ON/OFF state, and run history.
