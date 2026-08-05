# C-025 Stage 17 — Current PROD progress

> **UPDATED 2026-08-05 — Automation 117 ownership reconcile.**  
> Authoritative PROD Automation **117** is **only** `117 — Zoom — Send Recording Approval Email to Make` (script **v1.1**).  
> The Stage 17 credit **orchestrator** is a repository **design alternative**, not the live Automation 117 slot.  
> See [`C-025-117-numbering.md`](../deploy-checklists/C-025-117-numbering.md) and [`117-zoom-recording-approval-email.md`](../deploy-checklists/117-zoom-recording-approval-email.md).  
> Historical Stage 17 credit live evidence (2026-07-20) remains useful for recording-credit behavior, but **do not** treat the orchestrator filename as the current PROD Automation 117 paste target.
>
> **Automation vs Make identifier — keep distinct:**
> - **Automation 117** = Airtable email handoff → Make (`117-zoom-send-recording-approval-email-to-make.js` v1.1). Writes **no** Airtable records.
> - **117f** = Make workflow identifier only (`automationNumber` in the payload). Not an Airtable slot.
> - Stage 17 orchestrator / 117a–e = `_design-alternatives/stage17-modular-reference/` — **not installed** (automation-count limit).
> - **Canonical send key (four-part):** `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`.
> - **Make does not write back to Airtable** (no XP Events, no `Attendees`). Duplicate protection is the Make **Data Store** `C025_117f_PROD_SendKeys` (`sent` / `already_sent`).
> - Live Zoom XP remains **101**. Gate / Perfect Week Applied? remain **042** / **057**.

**Date written:** 2026-07-18  
**Last updated:** 2026-08-05 (117 ownership reconcile)  
**Preserves prior readiness date:** 2026-07-18 ([C-025-stage17-prod-readiness-status.md](./C-025-stage17-prod-readiness-status.md))  
**PROD:** `appn84sqPw03zEbTT` · **DEV:** `appTetnuCZlCZdTCT`

---

## Current verdict

# Automation 117 = email handoff; Stage 17 credit scripts are design alternatives

Historical Stage 17 recording-credit enablement evidence: [C-025-stage17-prod-live-2026-07-20.md](../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) (do not re-paste orchestrator into slot 117).

**Live automation posture (2026-08-05):**

| Automation / input | State |
|--------------------|--------|
| 101 | **ON** — live Zoom meeting XP |
| 117 | **ON** — recording approval email → Make (**v1.1**); **not** credit orchestrator |
| 117a–e | **Not installed** (design alternatives only) |
| 057 | **ON** (Perfect Week Applied?) |
| 042 | **ON** (Gate Applied?) |
| Approval email Make **117f** | Controlled tests PASS — go-live checklist may still apply |
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
