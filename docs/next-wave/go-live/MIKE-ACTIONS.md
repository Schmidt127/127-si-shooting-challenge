# Mike actions — go-live continuation (2026-07-24)

**Canonical queue:** [`PROD-INSTALL-AND-LIVE-TEST-QUEUE-2026-07-24.md`](./PROD-INSTALL-AND-LIVE-TEST-QUEUE-2026-07-24.md)  
**Architecture:** [`../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)

Do **not** disable 118/119 based on older OFF docs.

Evidence: **verified_prod** · **repo_evidence** · **unverified**

---

## P0 — exact UI checks (minimal)

| # | Action | Where | Done when |
|---|--------|-------|-----------|
| M1 | Confirm **074** `sendMode` / `sendModeInput` is **Live** (or blank + WAS Live), not fixed **Test** | Airtable Automations → 074 → Script inputs | Written OK |
| M2 | Confirm **118** schedule **ON** Sun **5:00 AM** America/Denver | Automations → 118 | Toggle ON |
| M3 | Confirm **119** schedule **ON** Sun **10:00 AM** America/Denver | Automations → 119 | Toggle ON |
| M4 | Confirm **118** season inputs: `dryRun=false`, `sendMode=Live`, `includeSchmidt=false` | 118 → Script inputs | All three match |
| M5 | Confirm **119** season input: `dryRun=false` | 119 → Script inputs | dryRun false |
| M6 | Confirm Make **`Weekly Athlete Summary - Bulk Email - May 18`** is **ON** | Make.com | Scenario ON |

**Why M4/M5 (repo_evidence):** **118 v1.5** allows Live arming and writes WAS `sendMode` from input. Script defaults remain `dryRun=true` / `sendMode=Test` for safe paste. If PROD still has those defaults, Sunday schedules run but arm nothing (or arm Test-only WAS). **119** with `dryRun=true` only counts — no Send arm.

---

## P0 — paste if version drift

| # | Action | Repo source | Notes |
|---|--------|-------------|-------|
| M7 | Paste **118 v1.5** if PROD header is still v1.4 (or older) | `airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` | Skip GitHub header; keep schedule **ON**; set M4 inputs after paste |

**Defect fixed in v1.5 (repo_evidence):** v1.4 refused `sendMode=Live` when `dryRun=false` and hardcoded WAS `sendMode=Test`. That blocked season Live parent Sundays even with schedules ON.

---

## P1 — attestations

| # | Action | Done when |
|---|--------|-----------|
| M8 | **112 OFF** | Written attest |
| M9 | **063 / 111** deleted or OFF | Written attest |
| M10 | **117 XOR 117c** (exactly one ON for Zoom credit XP) | Written attest |
| M11 | Version spot-check: 020 v3.0.0, 054 v5.6, 066 v3.3, 072 v4.0, 074 v2.1, **118 v1.5**, 119 v1.4 | Match repo |
| M12 | First live Sunday monitor: 118 → 072 → 119 → 074 → Make Sent? | Notes in handoff |

---

## Explicit non-actions

1. Do **not** turn 118/119 OFF because an older audit said so.  
2. Do **not** force 074 `sendMode=Test` permanently.  
3. Do **not** set `includeSchmidt=true` with `sendMode=Live` on 118.  
4. Do **not** create a second Make weekly-email scenario.
