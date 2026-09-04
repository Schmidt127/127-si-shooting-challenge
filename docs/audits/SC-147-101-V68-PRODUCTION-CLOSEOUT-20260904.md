# SC-147 / Automation 101 v6.8 — Production closeout (2026-09-04)

**Backlog:** SC-147  
**Base:** ppn84sqPw03zEbTT  
**Automation:** 101 - Zoom / Attendance XP - Award Meeting XP (wfllWsq7qikhOujGl)  
**Result:** **COMPLETE / Live Tested in PROD**

## Version before / after this closeout session

| Layer | Before (attested 2026-09-04) | After |
|------|-------------------------------|-------|
| Production Airtable script body | **v6.8** (already Live; SC-147 recording path present) | **v6.8** unchanged — **no v6.7 paste** (would downgrade) |
| Automations table Name / Status / Code | Name matches 101; Status **Live**; Code = GitHub file-too-large link | unchanged |
| GitHub master script | **v6.7** (lagging Production) | synced to **v6.8** in this PR |

## Why not paste repo v6.7

MCP get_automation showed Production already runs **v6.8** with processRecordingCreditsForMeeting and Source Key ZOOM_RECORDING_CREDIT|*. Repo master still had the older **v6.7** 
unSc147RecordingHalfXpPhase shape from PR #338. Pasting v6.7 would remove Production v6.8 REC_PENDING latch guards. **No update_automation script replace performed.**

## MCP paste capability

Airtable MCP update_automation can replace draft graph/nodes including customScript.inputs.script, but live behavior changes only after Airtable UI **Update** on unpublished changes. This session did **not** push a draft replace because Production Live already matched the approved SC-147 behavior (v6.8). Recoverable backup retained under docs/audits/SC-147-101-PRODUCTION-SCRIPT-BACKUP-BEFORE-V67-20260904-073641.js (misnamed stamp; content is Production **v6.8**).

## Trigger preserved

- Table: Zoom Meetings (	blWcSHEm8vNNIxyB)
- Condition: Zoom XP Reconciliation Needed? (ldxpTxg5IJsfGzHU) equals **1**
- Script node: wacqTiuNqwfHpoxuj
- **No Automation 121.** Automation **117** not modified.

## Disposable proof matrix (VERIFY / Schmidt only)

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Live attendance full XP | PASS — 
ecKpZVNbttUqgrdh / ZOOM_ATTEND_BASE|recGJEtN9oWGTqcFZ|recZEwkkXTJanDlG6 / **60** XP / Active | original 2026-09-02 + re-attested 2026-09-04 |
| 2 | Recording half XP | PASS — 
ec9N4T9SD8XmllzB / ZOOM_RECORDING_CREDIT|recZEwkkXTJanDlG6|recMFP2x5LDqea9ax / **30** XP / Active / Attendees empty | same |
| 3 | Zero / ineligible (conflict / not approved) | Covered by offline contract suite | lib/sc-147-zoom-recording-credit.test.js |
| 4 | Duplicate / idempotent re-run | PASS — cleared Last signature on 
ecMFP2x5LDqea9ax; 101 settled Needed→0; still **exactly one** recording XP Event | 2026-09-04 |
| 5 | Retry / re-entry after Needed wake | PASS — recording re-ack path | 2026-09-04 |
| 6 | Missing exclusive WAS / polluted dual enrollment | Visible failure queue — live meeting stayed Needed=1 while Athlete2 was on Attendees with dual-linked WAS (length≠1) | documented then cleaned |
| 7 | Correct bucket / source date | Zoom Attendance bucket; Activity Date 2027-05-02 (recording) / 2027-05-04 (live) | XP Event fields |
| 8 | No duplicate XP Events | PASS — one recording key, one live key for Athlete1 | search 2026-09-04 |
| 9 | Eligible unprocessed appear in recon | PASS — Needed=1 while Athlete2 roster drift present; cleared after restore | 2026-09-04 |

## Cleanup performed (disposable only)

- Zoom Attendance 
ecyGpMJWvNR7YCtq Enrollment → Athlete1 only
- WAS 
ecNEeoot6gc41zcs Enrollment → Athlete1 only
- XP Events 
ec9N4T9SD8XmllzB / 
ecKpZVNbttUqgrdh Enrollment → Athlete1 only
- Live meeting 
ecGJEtN9oWGTqcFZ Attendees → Athlete1 only; Create XP Events disarmed
- Final Needed? = **0** on both VERIFY meetings

## Offline tests

- 
ode --test airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js — PASS (updated for v6.8)
- 
ode --test tests/automation-contracts/source-key-registry.test.js — PASS

## Related

- Prior proof: [docs/testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md](../testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md)
- JSON attestation: [docs/testing/evidence/SC-147-20260904/production-attestation.json](../testing/evidence/SC-147-20260904/production-attestation.json)
- Paste card: [docs/deploy-checklists/101-v6.8-paste-card.md](../deploy-checklists/101-v6.8-paste-card.md)
