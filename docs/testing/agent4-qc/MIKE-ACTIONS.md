# Mike Actions — Agent 4 QC (precise UI only)

**Updated:** 2026-07-24  
**Branch:** `agent4/testing-qc-prod-safety`  
**Companion:** [`docs/next-wave/was-email/MIKE-ACTIONS.md`](../../next-wave/was-email/MIKE-ACTIONS.md)

Repo analysis is complete. Remaining items need one exact PROD UI check each.

## Do now (after merging Agent 4)

1. **Paste 074 v2.2** into PROD automation `074 - Email, Notifications, and External Handoffs - Send Weekly Summary Email Package to Make`  
   - File: `airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js`  
   - Paste from production docblock through end (skip GitHub header).  
   - Confirm docblock shows **Version: v2.2**.

2. **Confirm 074 automation input `sendMode`**  
   - Exact check: input is **`Live`** (preferred) **or blank with WAS `sendMode=Live`**.  
   - Fail if input is fixed **`Test`**.

3. **Confirm 074 outputs include** `statusOut`, `errorOut`, `debugStep` (map if Airtable requires declaring outputs).

## Keep verified (no change unless wrong)

| Check | Expected |
|-------|----------|
| 118 schedule | **OFF** |
| 119 schedule | **OFF** |
| 074 automation | **ON** |
| Make `Weekly Athlete Summary - Bulk Email - May 18` | **ON** |
| 072 `allowSchmidtInput` | **false** |
| 118/119 `dryRun` | **true** until Live season auth |
| 118/119 `includeSchmidt` | **false** for unattended |

## Optional one-field confirmations (only if status unclear)

4. On Schmidt WAS used for Live proof (`recu4X8m6rWlEWoNy` or successor): `Weekly Email Sent?` checked, `Make Send Status` = Sent, sent timestamp populated.  
5. Automation inventory UI string for **066** shows **v3.3** (repo already v3.3).

## Do not

- Enable 118/119 Sunday schedules without written Live-season authorization.  
- Force 074 `sendMode=Test` permanently.  
- Create a new Make email scenario.  
- Add Team Shot Tracker inactivity alerts to Shooting Challenge.
