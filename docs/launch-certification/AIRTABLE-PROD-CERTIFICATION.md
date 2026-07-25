# Launch Certification — Airtable PROD

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Base:** PROD `appn84sqPw03zEbTT` — `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`  
**Sources:** `docs/PROJECT_STATE.md`, `docs/automation-index.md`, go-live / WAS packets  
**Evidence labels:** **verified_prod** (prior) · **repo_evidence** · **BLOCKED — Mike UI reconfirm** (not re-verified this session)

> Anything not reconfirmed in Airtable Automations UI this session is **BLOCKED / requires Mike UI**. Do not invent Live Tested.

## Base identity

| Item | Value | Evidence |
|------|-------|----------|
| Production base ID | `appn84sqPw03zEbTT` | PROJECT_STATE |
| DEV base ID | `appTetnuCZlCZdTCT` | PROJECT_STATE |
| Role | Live season system of record | PROJECT_STATE |

## Weekly email — locked PROD truth (do not restore OFF)

| Item | Expected state | Evidence | This session |
|------|----------------|----------|--------------|
| **072** | **ON** | verified_prod 2026-07-24 | **BLOCKED** — Mike reconfirm ON |
| **074** | **ON**; `sendMode=Live` (or blank + WAS Live); never fixed Test | verified_prod | **BLOCKED** — Mike reconfirm Live |
| **118** | **ON**; Sun **5:00 AM** America/Denver; **v1.5**; `dryRun=false`; `sendMode=Live`; `includeSchmidt=false`; empty-week path via 072 `send_short` | verified_prod + repo 118 v1.5 on master (`de6449d`) | **BLOCKED** — Mike reconfirm schedule + inputs |
| **119** | **ON**; Sun **10:00 AM** America/Denver; `dryRun=false` | verified_prod | **BLOCKED** — Mike reconfirm |
| Flow | `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback` | verified_prod | Prior PASS; not re-run |
| Live writeback | `Weekly Email Sent?` / `Make Send Status=Sent` / timestamp | verified_prod | Prior PASS |

Architecture: [`docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)  
Index: [`docs/automation-index.md`](../automation-index.md)

## Intentionally OFF / expected OFF

| Automation | State | Notes |
|------------|-------|-------|
| **070a** | PROD intentionally **OFF** | Homework upload deferred; keep OFF ([v2/AUTOMATION_070A_LAUNCH_DECISION.md](../v2/AUTOMATION_070A_LAUNCH_DECISION.md)) |
| **112** | **OFF** expected | Legacy Video Feedback creator; **013** owns create (OW-D1) |
| Daily submission Fillout | **OFF** | C-008 contest intake closed |

## Other PROD installs (repo-documented; Mike spot-check if drift)

| Area | Repo / prior truth | This session |
|------|-------------------|--------------|
| **066** v3.3 shot milestones | Installed in PROD 2026-07-24 | **BLOCKED** — natural/OMNI Live Tested still open |
| **054** v5.6 streak XP | Installed in PROD | **BLOCKED** — supervised live not done |
| **070b** v4.4 / **070c** v1.1 video upload | PROD E2E PASS historically (C-013) | **BLOCKED** — not re-run this session |
| **117 / 057 / 042** Zoom Stage 17 | COMPLETE 2026-07-20; Conflict PASS; webhook blank | Prior PASS; email deferred |
| **115** ETF | Live + rerun PASS 2026-07-23/24 | Prior PASS |
| **020** homework completion | Installed; needs re-proof | **BLOCKED** |
| **063 / 111** | Deleted / OFF expected | **BLOCKED** — Mike attest |
| **117 XOR 117c** | Exactly one ON for `ZOOM_CREDIT` | **BLOCKED** — Mike attest |
| Schema snapshots | Dated `prod-20260706` / stash dumps | Stale hand maps; refresh separate |

## Soft / non-blocking for season start

| Item | State |
|------|-------|
| Softr | Obsolete / Not Used / Historical Reference Only |
| SC-147 RCC Interface views | Designed / Built in Repository — **not installed** |
| SC-032 Season Launch engine | Built in Repository — not live-installed |
| Broad “Installed but not tested” bucket | Large — Schmidt re-proof queue remains |

## Mike UI reconfirm steps (exact)

See minimal list in [MIKE-ACTIONS.md](./MIKE-ACTIONS.md). High-level:

1. Automations → 072 / 074 / 118 / 119 toggles **ON**.  
2. 118 schedule Sun 5:00 AM Denver; inputs `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`.  
3. 119 schedule Sun 10:00 AM Denver; `dryRun=false`.  
4. 074 `sendMode` Live (not fixed Test).  
5. Confirm 070a OFF; 112 OFF.  
6. Optional version headers: 118 v1.5, 072 v4.0, 074 v2.1, 066 v3.3, 054 v5.6, 020 v3.0.0.

## Explicit non-actions

1. Do **not** turn 118/119 OFF because older docs said so.  
2. Do **not** enable 070a or 112 for launch.  
3. Do **not** paste scripts from agents without Mike approval.  
4. Do **not** treat Softr as a gate.