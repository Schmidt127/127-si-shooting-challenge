# Automation 003 — Production verification closeout (SC-023)

**Status:** COMPLETE / PRODUCTION-VERIFIED  
**Version:** v2.0  
**Date:** 2026-09-03  
**Backlog:** [SC-023](../127-SI-MASTER-FUTURE-WORK-LIST.md) — Grade Bands as linked source of truth  
**Script:** `airtable/automations/shooting-challenge/003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js`

---

## Evidence boundary (read first)

| Layer | What it proves | What it does **not** prove |
|-------|----------------|----------------------------|
| **Offline code coverage** | Matching, skip/error paths, intended writes via `tests/enrollment-intake/automation-003-grade-change-refresh.test.js` | Live Airtable Run History |
| **Production test verification** | Mike-attested disposable VERIFY Enrollment grade-correction path succeeded | Exhaustive matrix of every grade/band pair |
| **Airtable automation configuration verification** | Enabled; refresh-view conditions; dynamic `recordId` mapping (Mike-attested) | Formula source text (unchanged; not edited this session) |

This closeout documents verification already completed in Production. It does **not** change Production automation behavior, formulas, or related automations.

---

## Verified Production behavior

1. Automation **003** is **enabled** (keep active).
2. Trigger view conditions:
   - Grade Band is not empty
   - Grade is not empty
   - Athlete is not empty
   - Grade Band Refresh Needed = 1
3. Input mapping is **dynamic**: `recordId` = triggering Enrollment record ID.
4. When an Enrollment’s Grade is corrected:
   - Grade Band Refresh Needed becomes **1** (existing formula)
   - Automation 003 runs
   - Correct Grade Band is selected from the Grade Bands table (Min/Max + Active?)
   - Writes: Grade Band (Auto Assign), Last Grade Used for Grade Band, Grade Band Status, Grade Band Assignment Status, Grade Band link
   - Grade Band Refresh Needed returns to **0** via the existing formula (script never writes that formula field)
5. Disposable **VERIFY** Enrollment used for the test (no real family records changed).
6. Test **succeeded**; final status **Assigned**; Grade Band matched corrected Grade.
7. No production formulas, unrelated automations, real family records, or unrelated tables were changed during verification.

---

## Ownership split

| Concern | Owner |
|---------|--------|
| Initial Grade Band assignment (blank Grade Band) | Automation **002** |
| Grade-change correction / refresh | Automation **003** (this slot) |

**Retirement decision:** Keep **003** active. It is a legitimate production safeguard, not an unused automation slot.

---

## Repository regression

```powershell
node tests/enrollment-intake/automation-003-grade-change-refresh.test.js
```

Offline tests cover: correct band selection, Min/Max matching, inactive ignored, multiple/no match fail-safe, missing Grade skip, missing Athlete fail, blank Grade Band skip (002 owns initial), refresh=0 preserve, no formula write, intended fields only, malformed/missing `recordId`, trigger model (correction → flag 1 → Assigned), final band matches corrected Grade.

---

## Related docs

- [`docs/automation-index.md`](../automation-index.md) — Enrollment intake 001–003
- [`docs/AUTOMATION_VERSION_INVENTORY.md`](../AUTOMATION_VERSION_INVENTORY.md) — row 003
- [`docs/CURRENT-TRUTH.md`](../CURRENT-TRUTH.md) — § Airtable automation versions
- [`docs/online-agents/enrollment-season/CURRENT-ENROLLMENT-PIPELINE.md`](../online-agents/enrollment-season/CURRENT-ENROLLMENT-PIPELINE.md) — Stage 3
