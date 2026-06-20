# Submission → XP Flow

End-to-end path from an athlete **shooting submission** to an **XP Event** and updated athlete stats.

## Overview

```
Athlete submits stats
    → Submission record (Airtable form / coach entry)
    → Automation: shooting-challenge script
    → XP Event created (ledger)
    → Athlete rollups / streak updated
    → (Optional) Make webhook for notifications
```

## Step-by-Step

### 1. Submission Created

| Item | Detail |
|------|--------|
| Table | Submissions |
| Required fields | Athlete, Makes, Attempts, Submission Date, Challenge Type |
| Source | Athlete form, coach manual entry, import |

### 2. Automation Trigger

| Item | Detail |
|------|--------|
| Trigger | Record created (or updated when stats finalized) |
| Script | [airtable/automations/shooting-challenge/](../../airtable/automations/shooting-challenge/) |
| Pre-checks | Athlete enrollment active; attempts > 0; XP not already awarded |

### 3. XP Calculation

Rules live in script and/or Config table (document in shooting-challenge README):

- Base XP from makes or percentage tiers
- Challenge-type multipliers
- Daily caps or bonus rules (if any)

### 4. XP Event Created

| Field | Value |
|-------|-------|
| Athlete | Link to submission athlete |
| Points | Calculated XP |
| Event Type | `Submission` |
| Source Record | Link to submission |
| Dedupe Key | e.g. `sub-{submissionRecordId}` |

Set submission `{XP Awarded}` = true after successful create.

### 5. Derived Athlete Updates

- Total XP via rollup from XP Events
- Current level via lookup/formula
- Streak via last submission date logic ([formulas README](../../airtable/formulas/README.md))

### 6. Optional Make Webhook

If configured, payload includes `eventId`, athlete, points, challenge type for parent/coach notifications. See [make/test-payloads/](../../make/test-payloads/).

## Failure Modes

| Symptom | Likely cause | Recovery |
|---------|--------------|----------|
| Submission, no XP Event | Automation off / script error | Fix automation; run safe backfill |
| Double XP | Missing dedupe key | Audit script; manual adjustment XP Event |
| Wrong XP amount | Rule change mid-week | Adjustment XP Event; document in CHANGELOG |

## Verification

1. Test athlete submission in sandbox view
2. Audit: [audit-xp-vs-submissions](../../airtable/extension-scripts/audits/README.md)
3. Confirm rollup matches sum of XP Events

## Related

- [field-map.md](../../airtable/schema/current/field-map.md)
- [Emergency recovery](../recovery/emergency-recovery.md)
