# Mike activation sheet — Automation 117 (orchestrator)

**Status:** READY_FOR_MIKE_ACTIVATION  
**Date:** 2026-07-15 · S29 re-verify  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Do not:** enable until Mike reaches the UI gate · configure a real webhook · touch PROD · change Folder 07 · send parent email

Authority docs:
- [AUTOMATION-117-trigger-design.md](./AUTOMATION-117-trigger-design.md)
- [AUTOMATION-117-interaction-map.md](./AUTOMATION-117-interaction-map.md)
- [AUTOMATION-117-live-activation-smoke-matrix.md](./AUTOMATION-117-live-activation-smoke-matrix.md)
- Offline suite: `python tools/airtable/phase_117_activation_smoke_plan.py` (**22/22 PASS** S29)
- Unit: `test_c025_117_*` (**34/34 PASS** S29)

---

## Exact Airtable settings

| Item | Value |
|------|--------|
| **Exact automation name** | `117 - Zoom Recording Credit - Orchestrator` |
| **Folder** | `17 - Zoom Recording Credit` |
| **Full Windows source path** | `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\117-zoom-recording-credit-orchestrator.js` |
| **GitHub version** | **v1.0.1** |
| **Paste boundary** | Skip GitHub header lines **1–7**; paste from `/************************************************************` through EOF |
| **Trigger type** | **When record matches conditions** |
| **Trigger table** | **Zoom Attendance** |
| **Trigger conditions (AND)** | 1. `Attendance Method` **is** `Recording Quiz`<br>2. `Enrollment` **is not empty**<br>3. `Zoom Meeting` **is not empty** |
| **Watched fields** | None required (broad matches-conditions) |
| **Do not paste** | 117a–117f as six separate automations |

### Inputs

| Input | Source | Activation value |
|-------|--------|------------------|
| `recordId` | Zoom Attendance record id from trigger | Required |
| `webhookUrl` | Static input (optional) | **Leave blank** |

### Outputs to map (at minimum)

`statusOut`, `errorOut`, `debugStep`, `actionOut`, `actionAOut`…`actionFOut`, `zoomAttendanceId`, `enrollmentRid`, `zoomMeetingRid`, `xpEventId`, `xpPoints`, `correctionCount`, `sendKey`

---

## OFF / ON order

| Step | Action | State |
|------|--------|-------|
| 0 | Confirm offline suite PASS | Repo only |
| 1 | Confirm script pasted = GitHub v1.0.1 (recheck-before-create present) | Automation **OFF** |
| 2 | Wire trigger + inputs as above; `webhookUrl` blank | **OFF** |
| 3 | Map outputs | **OFF** |
| 4 | Snapshot Schmidt fixture field values | **OFF** |
| 5 | **Mike decides** to turn **ON** for DEV smoke | **ON** (webhook still blank) |
| 6 | Run L01–L20 sequence (smoke plan `--list-live`) | **ON**, no email |
| 7 | Restore fixture; optionally turn **OFF** again | Safe park |

**Never** turn ON with a production/Make webhook for this package.

---

## Safe no-email settings (mandatory for first ON)

1. `webhookUrl` = **empty**
2. Do not enable Folder 07 / parent notification automations for this test
3. Expected step F: `skipped_no_webhook` (or `skipped_disabled` / `skipped_config_missing`)
4. `actionFOut` must never be `sent`
5. Do not re-check Zoom Meetings `Create XP Events` after gate/PW Attendees link (prevents 101 full-base stacking)

---

## Fixture

| Item | Hint |
|------|------|
| Primary ZA | `recHkB9aER3vCvBsL` (Schmidt Recording Quiz) — **verify still valid** before edits |
| Enrollment | Must be linked + Enrollment RID populated |
| Meeting | Must be linked + Zoom Meeting RID populated |
| Method | `Recording Quiz` |

---

## Test sequence (short)

1. Clear Review Status → expect A `normalized`
2. Set Review Status = Satisfactory → B `marked_satisfactory`; formulas Approved/Key/Amount
3. Expect C `created` (or second run if formula lag) → one `ZOOM_CREDIT|…` XP Event
4. Re-trigger → C `skipped_exists`
5. If Gate Earned → D link + Applied; re-run `skipped_already_applied`
6. If PW Effective → E likewise
7. Confirm F `skipped_no_webhook`
8. Needs Correction path → sat clear / XP deactivate as formulas dictate
9. Soft-void XP (`Active?=false`); restore applied flags / Attendees / review fields

Full 20 live cases: `python tools/airtable/phase_117_activation_smoke_plan.py --list-live`

---

## Expected outputs (happy / skip-safe)

| Path | `statusOut` | Notable `action*Out` |
|------|-------------|----------------------|
| Fresh normalize only | success or skipped | A=`normalized`; C–F soft skips |
| Full Satisfactory + Approved + blank webhook | success | C=`created`; D/E as flags; F=`skipped_no_webhook` |
| Re-run stable | skipped | all `skipped_*` |
| Conflict | success or skipped | C=`deactivated_on_conflict` |
| Live Method | does not fire | — |

---

## Rollback

| Layer | Action |
|-------|--------|
| Automation | Turn **OFF**; leave webhook blank |
| XP Event | Soft-void: `Active? = false` — **do not delete** |
| Gate / PW | Uncheck `Gate Credit Applied?` / `Perfect Week Credit Applied?`; remove Enrollment from Meeting Attendees **only if both flags were for this test and both false after** |
| Email stamps | Clear `Recording Approval Email Send Key` / `Sent At` if ever stamped |
| Review | Restore Review Status / Satisfactory / Correction Count to pre-test snapshot |
| PROD | N/A — never touched |

---

## Stop lines (hard)

- No PROD paste of 117  
- No real/parent email  
- No Folder 07 enable for this wave  
- No 101 Create XP Events supplemental on the fixture meeting during 117 smoke  
- Re-paste GitHub **v1.0.1** before first ON if DEV still has older paste without recheck
