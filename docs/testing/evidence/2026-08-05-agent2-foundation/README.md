# Overnight Agent 2 — Foundation evidence (2026-08-05)

PROD base: `appn84sqPw03zEbTT`  
Enrollment under test: `recCyFEPeATOVNlr9` (Testing Schmidt 2026–2027, Grade 3 → band 3-4)

## Results

| Package | Result | Key IDs |
|---------|--------|---------|
| Grade Band reassign (002) | **PASS** (~6s) | Band `reclWDQZzKbVBtdhG` |
| XP Date Resolved formula | **FIXED** | Field `fldvh9pv1oTIp24IJ`; SWITCH case Shooting Base |
| Shot milestones | **PASS** | 8 unlocks → 8 XP (310 pts); idempotent rerun 0 creates |
| Streaks | **PASS** (inventory) | 3 STREAK_XP; Current Streak 8 |
| Gate blocking | **PASS** | Level Status Gate Blocked; Sub 9/10, Vid 5/6 |
| Automation 066 checkbox | **BLOCKED** | `Run Shot Milestone Check?` stuck true; bypassed via unlock backfill |

## Files

- `FOUNDATION-PROBE.json`
- `XP-DATE-FORMULA-AUDIT.json` / `XP-DATE-RESOLVED-FORMULA-FIX.json`
- `002-GRADE-BAND-RETRIGGER.json`
- `STREAK-MILESTONE-PROBE.json` / `ENROLLMENT-XP-LINK-INVENTORY.json`
- `066-042-RETRIGGER.json` / `066-MILESTONE-DIAGNOSIS.json` / `066-BAND34-MILESTONES.json`
- `066-MILESTONE-BACKFILL.json`
- `LEGACY-GRADE-BAND-SAFETY.json`

## Tools

`tools/testing/agent2_*.mjs`
