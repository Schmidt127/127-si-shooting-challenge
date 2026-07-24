# Mike Actions — Next (consolidated)

> **SUPERSEDED for weekly-email schedule/sendMode actions (2026-07-24).**  
> Use [`../go-live/MIKE-ACTIONS.md`](../go-live/MIKE-ACTIONS.md).  
> **118/119 schedules are ON** (verified_prod). Do not keep them OFF. Repo **118 = v1.5**.

**Date:** 2026-07-24 (historical packet; weekly-email rows below are stale)  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Schmidt Enrollment:** `recgP9qZYjAhE7NXm` · Athlete `recgqVstObQRzgXJF`

**Decisions:** SC-035 = `send_short`; SC-014 = Option B.  
**PROD installs:** 054 v5.6 · 066 v3.3 · **072 v4.0** · **118 v1.5 / 119 v1.4**.  
**Weekly email:** Live path **PASS**; schedules **ON** — see go-live MIKE-ACTIONS.

Canonical: `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`

---

## P0 — Blocking

### 1. Automation UI attestation (remaining rows)

**Packet:** `docs/next-wave/automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`  
Partial PROD findings already recorded (112/117c/063/111 absent; 117 email-only; 020 v3.0.0). Finish 013/031/101/118/119/Threshold hunt.

### 2. Zoom credit XP writer (if/when reinstalled)

PROD Automation **117** is approval-email v1.1 (not XP); **117c** absent. If XP orchestrator returns, keep exactly one mint path.

### 3. Keep four Config year rows (do not collapse)

Adopt `docs/next-wave/config-selection/`.

### 4. Empty-week email — DONE / VERIFIED

`send_short` enforced in **072 v4.0**; Schmidt Check-In delivered.

### 5. Weekly email schedules — safety hold

| Piece | State |
|-------|--------|
| 072 | `allowSchmidtInput=false` |
| 118 / 119 | `dryRun=true`, `includeSchmidt=false`, schedules **OFF** |
| 074 | **ON** |
| Make Bulk Email May 18 | **ON** |

**Do not enable Sunday Live schedules without written auth.**  
**119 arms Send only; 074 posts webhook.**

### 6. Quiz path — DECIDED Option B

No Quiz Result PDF; use 067 attachment-less path; Schmidt live test still open under SC-013.

---

## P0 — Pastes / follow-ups

### 7. 054 / 066 — DONE (Installed)

Live streak/milestone proofs still open.

### 8. Video XP 1-vs-25 discrepancy

Still open (`recYQ10pOoFlApmjZ`).

---

## P1 — Controlled live tests (Schmidt)

| # | Path | Notes |
|---|------|-------|
| 9–11 | HW / Video / Zoom live | As before |
| 12 | Zoom recording XP | If XP automation present — not PROD 117 email slot |
| 13 | Weekly email | **PASS** empty-week `send_short` Test path |
| 14 | Streak / milestone | After 054/066 — still needed |
| 17 | Final Reflection Option B | Still needed |

---

## Do not

- Collapse Config year rows  
- Treat 119 as Make webhook sender  
- Create a new Make WAS email scenario  
- Enable 118/119 Live schedules without auth  
- Create Quiz Result PDF / fake attachments  
