# Mike UI gate — Automation 117 (v2.0 pilot · package 1)

## 1. Current project / phase / step
- Project: 127 SI Shooting Challenge
- Phase / package: Delivery System v2.0 pilot · Automation 117 DEV paste
- Step: **1 of 2** for 117 (step 2 = optional first ON smoke — separate sheet later)
- Actual tip SHA: use `git rev-parse HEAD` on Lead (CONTROL is lagging pointer only)
- Base: **DEV** `appTetnuCZlCZdTCT` only

## 2. Why this action is required
117 orchestrator source is ready in GitHub (v1.0.1). DEV must receive the pasted script and safe trigger/inputs while remaining OFF so later no-send smoke can run without email risk. This is **validation package 1** under Delivery System v2.0 (v2.0 already governs the full remaining V2 rebuild; the pilot only validates process health).

## 3. One exact UI action
Paste script **v1.0.1** into automation **117 - Zoom Recording Credit - Orchestrator**, wire trigger + inputs per §5, and leave the automation **OFF**.

## 4. Exact full Windows path
`C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\117-zoom-recording-credit-orchestrator.js`

Lead verification (2026-07-15):
- [x] `Test-Path` = True
- [x] File SHA256: `D484327A9F4E13BCA3908F728B695F4C66705AD63776FC68D30247758B4AADAB`
- [x] Docblock version: **v1.0.1**

## 5. Exact Airtable configuration
| Item | Value |
|------|--------|
| Table (trigger) | **Zoom Attendance** |
| Automation exact name | `117 - Zoom Recording Credit - Orchestrator` |
| Folder | `17 - Zoom Recording Credit` |
| Trigger type | **When record matches conditions** |
| Trigger conditions (AND) | 1. `Attendance Method` **is** `Recording Quiz` · 2. `Enrollment` **is not empty** · 3. `Zoom Meeting` **is not empty** |
| Inputs | `recordId` = triggering Zoom Attendance record · `webhookUrl` = **leave blank** |
| Outputs to map (min) | `statusOut`, `errorOut`, `debugStep`, `actionOut`, `actionAOut`…`actionFOut`, `zoomAttendanceId`, `enrollmentRid`, `zoomMeetingRid`, `xpEventId`, `xpPoints`, `correctionCount`, `sendKey` |
| Initial ON/OFF | **OFF** (do not turn ON in this gate) |
| Paste boundary | Skip GitHub header lines **1–7**; paste from `/************************************************************` through EOF |
| Do not paste | 117a–117f as six separate automations |

## 6. What must not change
PROD · archive · Folder 07 · real Make/webhook URL · parent email paths · turning 117 **ON** · other automations’ ON/OFF · capacity deletes · Airtable registry table (not in pilot)

## 7. Expected result
- Script saved as v1.0.1 body in DEV 117  
- Trigger + blank `webhookUrl` configured  
- Automation remains **OFF**  
- Capacity unchanged (already occupying slot)  
- Ready for later separate ON / L01–L20 smoke when Mike authorizes  

## 8. Rollback action
Leave OFF. If bad paste: re-paste prior body from Git history / prior known-good paste, or clear script and stop. Do not enable. Do not touch PROD.

## 9. Exact message Mike sends back to Cursor
`117 paste UI complete`

---

## Agent checklist (not for Mike)
- [x] Paths verified on Lead tip
- [x] Offline suite cited: `phase_117_activation_smoke_plan.py` 22/22 · unit 34/34 (S29)
- [ ] After reply: update `docs/delivery/DEPLOYMENT-REGISTRY.json` paste claim
- [ ] Do not start ON smoke until Mike authorizes that gate
- Detail reference (optional): `AUTOMATION-117-mike-activation-sheet.md` — **this nine-field sheet wins** if conflict
