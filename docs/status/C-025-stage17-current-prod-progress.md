# C-025 Stage 17 — Current PROD progress

> **✅ AUTHORITATIVE CURRENT-STATE DOCUMENT for C-025 Stage 17 Zoom Attendance + the Zoom Recording Approval Email workflow.** Older STOP / BLOCKED / DEV-phase documents are historical and link back here. If any other document conflicts with this one, this document (plus its two linked evidence docs) wins.
>
> **Automation vs Make identifier — keep distinct:**
> - **Automation 117** = the Airtable automation (`117 - Zoom Recording Credit - Orchestrator`, v1.1.1) — recording credit; **ON** in PROD.
> - **117a–117f** = workflow components / identifiers. **117f** is the **Make** workflow identifier for the recording approval email (Make scenario `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1`). There is **no separate Airtable "Automation 117f"** driving PROD — the Airtable sender is Automation **117** (`117 — Zoom — Send Recording Approval Email to Make`, script **v1.1**, which writes **no** Airtable records; Make owns send/dedupe).
> - **Canonical send key (four-part):** `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`. Older DEV docs used a three-part key and/or a `ZOOM_REC_APPROVAL` prefix — both are **superseded**.
> - **Make does not write back to Airtable** (no XP Events, no `Attendees`, no Send Key / Sent At). Duplicate protection is the Make **Data Store** `C025_117f_PROD_SendKeys` (first send → `sent`; duplicate → `already_sent`).
> - **Live claim guard:** the approval email is **tested / built — not documented as fully live** until both Automation 117 (email handoff) and the Make scenario are confirmed permanently enabled in-repo. See the [go-live checklist](../deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md#7-remaining-go-live-checklist).

**Date written:** 2026-07-18  
**Last updated:** 2026-07-20 (**COMPLETE** — Stage 17 credit; approval-email Make path tested, not claimed fully live)  
**Preserves prior readiness date:** 2026-07-18 ([C-025-stage17-prod-readiness-status.md](./C-025-stage17-prod-readiness-status.md))  
**PROD:** `appn84sqPw03zEbTT` · **DEV:** `appTetnuCZlCZdTCT`

---

## Current verdict

# COMPLETE — Stage 17 recording credit verified in PROD

Enablement + conflict exclusivity verified. Evidence: [C-025-stage17-prod-live-2026-07-20.md](../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md)

**Live automation posture:**

| Automation / input | State |
|--------------------|--------|
| 101 | **Unchanged** live path |
| 117 (credit) | **ON** (v1.1.1) |
| 057 | **ON** (v1.3) |
| 042 | **ON** (v3.1) |
| 115 | **Not installed** |
| Approval email (Make 117f) | **Built + controlled tests PASS** — not documented as fully live; see [PROD 117f workflow](../deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md) |
---

## Confirmed complete

- Schema + formulas (incl. Effective Recording XP % Program Config link gate)
- Preconflict rollup: `ARRAYJOIN(ARRAYUNIQUE(values), "\n")` — both `|LIVE` and `|REC` retained
- 117 create + idempotency PASS (`recfqsgM7zDobxsPf` → `recOceuW34jQz7suD`)
- Conflict exclusivity PASS — recording ZA Conflict=1, Approved=0; XP `recOceuW34jQz7suD` inactive
- Permanent enable **117 → 057 → 042** (Mike)

## Approval email follow-on (C-025 / 117f)

- Make scenario: `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1`
- Data Store: `C025_117f_PROD_SendKeys`
- Controlled tests: direct webhook `sent` · DS write · duplicate `already_sent` · Airtable 117 → Make · Airtable duplicate `already_sent`
- **Not claimed fully live** until [go-live checklist](../deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md#7-remaining-go-live-checklist) is completed in-repo

## Immediate rollback

Only on [escalation triggers](../deploy-checklists/C-025-stage17-rollback-plan.md) — first turn OFF offending Stage 17 automation(s).

## Historical docs (do not delete)

| Document | Role |
|----------|------|
| [prod-readiness-status](./C-025-stage17-prod-readiness-status.md) | Pre-migration BLOCKED snapshot |
| [117 verification](../deploy-checklists/C-025-stage17-prod-117-verification-2026-07-20.md) | Create + idempotency PASS |
| [final rollout checklist](../deploy-checklists/C-025-stage17-prod-final-rollout-checklist.md) | Enable sequence |
| [prod-live](../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) | **Authoritative COMPLETE record** (credit) |
| [PROD 117f approval email](../deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md) | Approval-email Make path — tested; not claimed fully live |
