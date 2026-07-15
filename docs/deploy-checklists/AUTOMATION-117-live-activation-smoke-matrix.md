# Automation 117 — Live activation smoke matrix (DEV)

**Status:** READY_FOR_MIKE_ACTIVATION · do **not** enable until Mike UI gate  
**Offline:** `python tools/airtable/phase_117_activation_smoke_plan.py` → **22/22 PASS** (S29)  
**Unit:** `test_c025_117_contracts` + `test_c025_117_orchestrator` → **34/34 PASS** (S29)  
**Script:** `117-zoom-recording-credit-orchestrator.js` **v1.0.1**

---

## Fixture (verify before edits)

| Item | Value |
|------|--------|
| Primary ZA | `recHkB9aER3vCvBsL` (Schmidt Recording Quiz) — re-GET before first edit |
| Enrollment | Linked + Enrollment RID populated |
| Meeting | Linked + Zoom Meeting RID populated |
| Method | `Recording Quiz` |
| webhookUrl | **blank** |
| 101 | Do **not** re-check `Create XP Events` after Attendees link |

---

## Matrix L01–L20

| ID | Case | Drive | Expect |
|----|------|-------|--------|
| L01 | Needs Review normalize | Clear Review Status | Needs Review; blank webhook |
| L02 | Already normalized | Re-run / edit notes | `skipped_already_normalized` |
| L03 | Duplicate pair | Older reviewed sibling same Enroll+Meeting | `skipped_duplicate_pair` |
| L04 | Missing links | Detach Enrollment or Meeting | `skipped_missing_links` |
| L05 | XP create / Satisfactory | Set Satisfactory | Approved + Key + Amount; one `ZOOM_CREDIT` XP |
| L06 | XP exists | Re-trigger | `skipped_exists` |
| L07 | XP update amount | Config % changes Amount | `updated` points |
| L08 | XP deactivate / conflict | Force Conflict or Needs Correction path | `deactivated_on_conflict`; Active?=false |
| L09 | XP reactivate | Clear conflict + Satisfactory | Active?=true updated |
| L10 | Gate credit | Gate Earned=1 | Enrollment on Attendees + Gate Applied? |
| L11 | Gate idempotent | Re-run | `skipped_already_applied` |
| L12 | Perfect Week | PW Effective=1 | Attendees + PW Applied? |
| L13 | PW idempotent | Re-run | `skipped_already_applied` |
| L14 | Needs Correction | Satisfactory → Needs Correction | sat cleared; XP deactivated if conflict/unapproved |
| L15 | Formula timing | After Satisfactory write | Approved formulas; second run if first C skipped |
| L16 | 101 key check | Query XP Events | `ZOOM_CREDIT` present; **no** new `ZOOM_ATTEND_BASE` from this test |
| L17 | 101 no supplemental | — | Do **not** check Create XP Events after gate link |
| L18 | No-email blank webhook | Step F | `actionFOut=skipped_no_webhook`; never `sent` |
| L19 | Email disabled | Effective email false | `skipped_disabled` (webhook still blank) |
| L20 | Restore | Soft-void XP; clear flags | Leave **117 OFF** or blank webhook |

### Repeated edits / recursive safety

| ID | Case | Expect |
|----|------|--------|
| R1 | Edit Review Status repeatedly after stable | Steps skip when already match; no duplicate XP |
| R2 | Orchestrator writes that re-match trigger | Self-gates prevent infinite award loops |

---

## Safety (every live run)

- webhookUrl blank · no Folder 07 enable · no PROD · no real email · 117 state changes only when Mike chooses step 5 of activation sheet
