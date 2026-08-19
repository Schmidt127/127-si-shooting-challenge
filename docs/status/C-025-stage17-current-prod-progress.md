# C-025 Stage 17 — Current PROD progress

> **Email + 117 overlay 2026-08-19:** Parent emails = Communications Hub → **Resend** ([email-send-plane.md](../integrations/email-send-plane.md)). Make 117f = historical. **PROD Automation 117 (Mike paste) = v2.1 Hub Email Handoff Queue create** — not XP, not Make send, not Stage 17 orchestrator.
>
> **UPDATED 2026-08-05 — Automation 117 ownership (credit vs email slot):**
> The Stage 17 credit **orchestrator** is a repository **design alternative**, not the live Automation 117 slot.
> See [`C-025-117-numbering.md`](../deploy-checklists/C-025-117-numbering.md).
> Historical Stage 17 credit live evidence (2026-07-20) remains useful for recording-credit behavior, but **do not** treat the orchestrator filename as the current PROD Automation 117 paste target.
>
> **Identifiers:**
> - **117f** = historical Make Gmail workflow identifier. Retired for email.
> - Stage 17 orchestrator / 117a–e = `_design-alternatives/stage17-modular-reference/` — **not installed**.
> - Live Zoom XP remains **101**. Gate / Perfect Week Applied? remain **042** / **057**.

**Date written:** 2026-07-18  
**Last updated:** 2026-08-19 (117 v2.1 Hub handoff confirmed)  
**Preserves prior readiness date:** 2026-07-18 ([C-025-stage17-prod-readiness-status.md](./C-025-stage17-prod-readiness-status.md))  
**PROD:** `appn84sqPw03zEbTT` · **DEV:** `appTetnuCZlCZdTCT`

---

## Current verdict

# Automation 117 = Hub email handoff v2.1; Stage 17 credit scripts are design alternatives

Historical Stage 17 recording-credit enablement evidence: [C-025-stage17-prod-live-2026-07-20.md](../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) (do not re-paste orchestrator into slot 117).

**Live automation posture (overlay 2026-08-19):**

| Automation / input | State |
|--------------------|--------|
| 101 | **ON** — live Zoom meeting XP (exact version still UI-confirm if needed) |
| 117 | **v2.1** — creates Email Handoff Queue for Hub; **079** → Resend; **not** credit orchestrator; **not** Make 117f |
| 117a–e | **Not installed** (design alternatives only) |
| 057 | **ON** historically (Perfect Week Applied?) — confirm live version separately |
| 042 | **ON** historically (Gate Applied?) — confirm live version separately |
| Approval email Make **117f** | **Historical** only |
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
