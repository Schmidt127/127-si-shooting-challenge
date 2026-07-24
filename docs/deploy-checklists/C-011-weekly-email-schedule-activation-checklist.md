# C-011 — Weekly email schedule activation checklist

**Updated:** 2026-07-24  
**Activation status:** **COMPLETE** — 118/119 schedules **ON** in PROD (verified). Older “remain OFF” gates below are **historical**.  
**Canonical architecture:** [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)  
**Install/ops runbook:** [WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md](../next-wave/was-email/WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md)

**Flow:** `118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback`

**Scripts:** 118 **v1.4** · 119 **v1.4** · 072 **v4.0** · 074 repo **v2.1** (UI cited v2.0)  
**Make:** `Weekly Athlete Summary - Bulk Email - May 18` / webhook `Weekly Athlete Summary - Email - May 18`

---

## Ownership (locked)

| Step | Owner |
|------|--------|
| Ensure WAS + arm Build | **118** |
| Build package + empty-week policy | **072** |
| Arm `Send to Make?` | **119** (does **not** post webhook) |
| POST Make webhook | **074** |
| Gmail + Live Sent? writeback | **Make** |

---

## Pre-activation gates

| # | Gate | Status 2026-07-24 |
|---|------|-------------------|
| 1.1 | Empty-week policy decided (`send_short`) | **PASS** |
| 1.2 | 072 v4.0 enforces policy | **PASS** (Schmidt) |
| 1.3 | 074 posts webhook; does not clear/set Sent? incorrectly | **PASS** (repo v2.1 design) |
| 1.4 | Make Bulk Email May 18 is the WAS sender (not “Updated”) | **PASS** |
| 1.5 | Schmidt Test E2E Check-In delivered | **PASS** |
| 1.6 | 118/119 schedules enabled after Mike Live auth | **PASS — ON** (historical gate was “remain OFF until auth”) |

---

## Schedule settings (when authorized)

| Automation | Schedule | Default inputs |
|------------|----------|----------------|
| **118** | Sunday 5:00 AM America/Denver | dryRun→false only when authorized; sendMode starts Test; includeSchmidt=false; emptyWeekPolicy=send_short |
| **119** | Sunday 10:00 AM America/Denver | dryRun→false only when authorized; includeSchmidt=false; emptyWeekPolicy=send_short |

**074 remains ON. Make Bulk Email remains ON.**

**074 production sendMode (verified 2026-07-24):** do **not** leave a fixed automation input `sendMode=Test`. Use **`Live`**, or leave blank and inherit WAS `sendMode` (WAS must be Live for production parents). Fixed Test kept Make on the Test branch (email OK, no Sent? writeback); Live completed writeback.

---

## Activation sequence (Mike only)

1. Confirm post-test safety: 072 `allowSchmidtInput=false`; 118/119 includeSchmidt=false; **074 sendMode=Live** (or blank + WAS Live).  
2. One more dryRun=true manual 118/119 run (counts only).  
3. Authorize `dryRun=false` with 118 `sendMode=Test` for a narrow window if needed (074 itself stays Live for writeback).  
4. Enable 118 schedule OFF→ON only after written auth.  
5. Enable 119 schedule OFF→ON only after written auth.  
6. 118 Live sendMode when dryRun=false still needs product policy authorization.

---

## Duplicate / resend checks

| Check | Expect |
|-------|--------|
| WAS already Sent? | 118 skips; 119 skips; 074 blocks duplicate |
| Re-run 119 after arm | Idempotent / no double webhook if Send already cleared |
| Re-run 074 after Sent? | Blocked |

---

## Known gap

Make **Test** branch delivers email but does **not** currently write Airtable `Weekly Email Sent?`. Live branch does writeback after Gmail success.
