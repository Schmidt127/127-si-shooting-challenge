# PROD installation and live-test queue — 2026-07-24

**Authority:** Go-Live Integration Lead  
**Base:** PROD `appn84sqPw03zEbTT`  
**Canonical completion master:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)

Evidence labels: **verified_prod** · **repo_evidence** · **inferred** · **unverified**

---

## A — Already complete (do not undo)

| # | Item | Evidence | State |
|---|------|----------|-------|
| A1 | Weekly email flow `118→072→119→074→Make Bulk Email May 18→Gmail→writeback` | verified_prod | Keep |
| A2 | **072 ON**, **074 ON**, **118 ON**, **119 ON**, Make Bulk Email **ON** | verified_prod | Keep |
| A3 | 118 Sun **5:00 AM** Denver; 119 Sun **10:00 AM** Denver | verified_prod | Keep |
| A4 | **074 sendMode=Live** (or blank + WAS Live) — never fixed Test | verified_prod | Keep |
| A5 | Live send + `Weekly Email Sent?` + `Make Send Status=Sent` + timestamp | verified_prod | Keep |
| A6 | Empty-week **`send_short`** in **072 v4.0** | verified_prod | Keep |

---

## B — Mike UI confirmations (no code paste)

Do these in Airtable / Make UI. Agent cannot complete them without Mike.

| # | Pri | Action | Exact steps | Done when |
|---|-----|--------|-------------|-----------|
| B1 | P0 | Confirm 074 sendMode still Live | Airtable → Automations → **074** → Script inputs → `sendMode` / `sendModeInput` is **Live** or blank (WAS Live). Not fixed **Test**. | Screenshot or written OK |
| B2 | P0 | Confirm 118/119 schedule toggles ON | Automations → **118** schedule enabled Sun 5:00 AM Denver; **119** enabled Sun 10:00 AM Denver | Both show ON |
| B2b | P0 | Confirm 118/119 season dryRun/sendMode | **118:** `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`. **119:** `dryRun=false`. (Defaults alone = schedule runs but arms nothing / Test-only WAS.) | Written OK |
| B3 | P0 | Confirm Make scenario ON | Make → `Weekly Athlete Summary - Bulk Email - May 18` → ON (not “Updated”) | Scenario ON |
| B4 | P1 | Attest **112 OFF** | Automations list → 112 disabled | Written attest |
| B5 | P1 | Attest **063 / 111** | Confirm deleted or OFF; resolve inventory conflict | Written attest |
| B6 | P1 | Attest **117 XOR 117c** | Exactly one ON for `ZOOM_CREDIT\|` XP writer | Written attest |
| B7 | P1 | Version header spot-check | Open scripts: 020 v3.0.0, 054 v5.6, 066 v3.3, 072 v4.0, 074 v2.1, **118 v1.5**, 119 v1.4 | Match repo |
| B8 | P1 | Re-export Automations operator table | Include 115–119 / 070c / 116 / 117 | Snapshot in repo later |
| B9 | P1 | First Sunday watch | After next Sun: 118 counts → 072 builds → 119 arms → 074 webhooks → Make Sent? | Notes in handoff |

---

## C — Safe repo-side promotions (no live UI mutation by agent)

| # | Pri | Item | Repo action | PROD UI needed? |
|---|-----|------|-------------|-----------------|
| C1 | P1 | Stale OFF docs corrected | Merged in go-live integration | No |
| C2 | P1 | sendMode contract helper + tests | `lib/was-email-contracts/send-mode.js` + tests | No |
| C3 | P2 | Completion master dashboard | Updated SC-031/035/038/039/045 | No |
| C4 | P2 | Reliability audit stale correction | `STALE-CLAIM-CORRECTION.md` | No |

---

## D — Install / paste queue (only if UI drift found)

Paste only when B7 shows drift. Prefer repair over new automations.

| # | Pri | Script | Repo file | Notes |
|---|-----|--------|-----------|-------|
| D1 | P1 | 072 | `072-…-build-weekly-summary-email-package.js` v4.0 | Empty-week owner |
| D2 | P1 | 074 | `074-…-send-weekly-summary-email-package-to-make.js` v2.1 | Webhook only; sendMode Live |
| D3 | P0 | 118 | `118-…-schedule-weekly-summary-email-build.js` **v1.5** | Paste if PROD still v1.4; then set season inputs (B2b); schedule must stay ON |
| D4 | P1 | 119 | `119-…-schedule-weekly-summary-email-send.js` v1.4 | Arms Send only |
| D5 | P1 | 054 | `054-…-streak-xp-event.js` v5.6 | If header drift |
| D6 | P1 | 066 | `066-…-shot-milestone-unlocks.js` v3.3 | If header drift |
| D7 | P1 | 020 | `020-…-homework-completion.js` v3.0.0 | If header drift |

**Paste rule:** GitHub first → skip GitHub header → paste into Airtable → leave existing ON/OFF schedule state unless Mike authorizes change.

---

## E — Live-test queue (Schmidt `recgP9qZYjAhE7NXm`)

| # | Pri | Path | Goal | Status |
|---|-----|------|------|--------|
| E1 | P0 | Weekly email empty week | `send_short` + writeback | **PASS** verified_prod |
| E2 | P0 | Submission → Week → XP → WAS | 115 / Fillout-shaped | Partial / re-run as needed |
| E3 | P0 | Homework photo/PDF → HC → XP → 071 | SC-009/010/017 | Installed, needs re-proof |
| E4 | P0 | Video asset → 013/070b/070c → 114 | SC-011/133 | Installed, needs re-proof |
| E5 | P1 | Streak 054 v5.6 | Supervised 3-day | Installed, not Live Tested |
| E6 | P1 | Milestone 066 v3.3 | Natural run | Installed, not Live Tested |
| E7 | P1 | Zoom recording 117 path | Conflict + XP exclusivity | Stage 17 PASS; 117f email deferred |
| E8 | P2 | Welcome / other 071–077 templates | Individual template proof | Open |

---

## F — Explicit non-actions

1. Do **not** disable 118/119 because older docs said OFF.  
2. Do **not** force 074 `sendMode=Test` permanently.  
3. Do **not** create a new Make weekly email scenario.  
4. Do **not** add Team Shot Tracker 3/7/10-day inactivity alerts.  
5. Do **not** delete fields/tables without migration approval.  
6. Do **not** create new automations merely to avoid fixing an existing one.
