# Phase D rollback — 072 + 074 (Weekly Summary Email)

**Date:** 2026-07-14  
**Purpose:** Pre-consolidation GitHub copies for safe restore.  
**Package status:** `READY_FOR_AUTHORIZATION` (repo prep only — not executed in Airtable).

## Files

| File | Restores |
|------|----------|
| `072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` | Separate 072 build-only (v3.7) |
| `074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js` | Separate 074 Make send (v2.0) |

## Surviving number (forward path)

- **Survive 072** (v4.0.0 combined BUILD → optional SEND)
- **Library-stub 074**; retire UI slot only after smoke PASS

## Restore procedure (critical test failure)

1. Turn OFF combined 072 (if pasted).
2. Re-paste rollback **072** into automation 072 (build-only).
3. Re-create / re-paste **074** from rollback into a separate automation.
4. Restore triggers:
   - **072:** `Build Weekly Email Now?` checked; Sent unchecked; Enrollment/Week present
   - **074:** Ready checked; `Send to Make?` checked; Sent unchecked; Subject/Recipients/HTML present
5. Leave both OFF until Mike re-authorizes sends.
6. Do **not** touch 117, other Folder 07 OFF scripts, or PROD.

## Hard constraints

- No real parent/family email during rollback verification unless Mike explicitly authorizes.
- Blank webhook remains the DEV safe no-send path on the combined script.
