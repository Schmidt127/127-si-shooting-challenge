# Mike Actions — Next (consolidated)

**Date:** 2026-07-24 (Agent 5 reconciliation)  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Schmidt Enrollment:** `recgP9qZYjAhE7NXm` · Athlete `recgqVstObQRzgXJF`

**Decisions done:** SC-035 = `send_short`; SC-014 = Option B.  
**Weekly email (verified_prod):** `118→072→119→074→Make Bulk Email May 18→Gmail→writeback`  
**074 sendMode=Live** + Live writeback PASS · **118/119 schedules ON** (Sun 5:00 / 10:00 AM Denver)

Canonical architecture: [`../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)  
Agent 5 package: [`../agent5-lead-reconciliation-2026-07-24/`](../agent5-lead-reconciliation-2026-07-24/)  
Go-live pack: [`../go-live/GO-LIVE-READINESS-2026-07-24.md`](../go-live/GO-LIVE-READINESS-2026-07-24.md)

> **Historical:** Older rows in this file that said “schedules OFF / do not enable” are **superseded**. Do not disable 118/119 based on stale packets.

---

## Exact UI verifications still needed (minimal)

### 1. Confirm 074 sendMode still Live (P0)

**Where:** Airtable → Automation **074** → Script inputs  
**Expect:** `sendMode` / `sendModeInput` = **Live**, or blank with WAS `sendMode=Live`  
**Must not:** fixed `Test`  
**Proof:** note/screenshot + one WAS with Sent?/Make Send Status=Sent/timestamp after a Live send

### 2. Confirm 118 / 119 still ON with intended dryRun (P0)

**Where:** Automations **118** and **119** schedule toggles + inputs  
**Expect:** Schedules **ON**; confirm whether `dryRun` is still `true` (safe) or already `false` (season Live)  
**Proof:** toggle state + dryRun values written here or in chat

### 3. Confirm Make sender scenario ON (P0)

**Where:** Make.com  
**Expect:** `Weekly Athlete Summary - Bulk Email - May 18` **ON** (not `Weekly Athlete Summary Updated` for send)  
**Proof:** scenario ON + last Live run shows Airtable writeback

### 4. Attest 112 OFF + 117 XOR 117c (P0)

**Where:** Automations list  
**Expect:** **112 OFF**; exactly one `ZOOM_CREDIT|` XP creator if/when Zoom XP path is live  
**Proof:** filled row in [`../automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`](../automation-ownership/AUTOMATION-ATTESTATION-PACKET.md)

### 5. Attest script headers (P1)

Confirm UI headers match: **020 v3.0.0**, **054 v5.6**, **066 v3.3**, **072 v4.0**, **074 v2.1**, **118/119 v1.4**

### 6. First Sunday watch (P0 ops)

After next Sunday 5 AM / 10 AM Denver: 118 counts → 072 builds → 119 arms → 074→Make→Sent?  
Abort only if mass non-Schmidt sends appear.

---

## Done — do not reopen

| Item | State |
|------|--------|
| Empty-week `send_short` | Verified in 072 v4.0 |
| 074 Live writeback | Verified |
| 118/119 schedule activation | **ON** (verified_prod) |
| SC-014 Option B | Decided |
| 054 v5.6 / 066 v3.3 paste | Installed (live proofs still open) |
| Config year collapse | **Do not** |

---

## Do not

- Force 074 to Test in PROD  
- Disable 118/119 because an old doc said OFF  
- Create a new Make WAS email scenario  
- Reinstall full 063/111  
- Add Team Shot Tracker 3/7/10-day inactivity alerts  
- Collapse Config year rows  
