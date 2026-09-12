# Source-of-truth reconciliation — 2026-09-12

**Scope:** Documentation / deployment / automation inventory alignment only.  
**Did not:** Execute season simulation · mutate Production Airtable data · reopen automation scripts from stale docs.

## Verified identity

| System | Value |
|--------|--------|
| SC GitHub | `Schmidt127/127si-shooting-challenge` |
| SC `origin/master` tip | **`94429042`** (PR **#521** SEO footer polish) |
| SC Production Vercel | **`dpl_6h8wT3nFtuxGveW8DaoN34CWCVyA`** @ `94429042` — READY |
| SC public URL | https://www.fairfieldbasketballclub.com/shoot |
| SC Production Airtable | **`appn84sqPw03zEbTT`** |
| Retired DEV base | **`appTetnuCZlCZdTCT`** — **NEVER use** |
| Curriculum Hub GitHub | `Schmidt127/127si-curriculum-hub` |
| Hub `origin/main` tip | **`cb2c815`** (PR **#37** audit baseline cleanup) |
| Hub Production base | **`appnrW8pPpzq8Nhov`** |
| Hub hostname | https://homework.fairfieldbasketballclub.com |
| Hub structured-enabled | **52** (disposable Crow deleted; no 53-lesson baseline) |

## Feature completion snapshot (SC)

Documented as complete / live-tested where prior evidence already exists; this pass does not re-prove them:

| Area | Status |
|------|--------|
| Submission XP (**010**) | Complete / Live Tested (v10.14) |
| Homework Completions + Homework XP (**020 / 064 / 065**) | Complete / Live Tested |
| Streaks (**053–056 / 054**) | Complete / Live Tested |
| Shot milestones (**066**) | Complete / Live Tested (incl. Goal Met Date) |
| Perfect Week (**057→058→059**) | Complete / Live Tested |
| Levels / gates (**041 / 042**; **043** retired) | Complete / Live Tested |
| Zoom XP (**101** live + recording half-XP) | Complete / Live Tested |
| Video feedback XP (**113 / 114**) | Complete / Live Tested (controlled proof) |
| Weekly summaries + Hub email plane (**031 / 072 / 074 / 079** + producers) | Complete path; Tier 1 producer paste queue may still be pending Mike |
| Website `/shoot` | Live on Production @ `94429042` |
| Curriculum Hub handoff / structured homework | Hub Production verified; SC ingress live |
| Season simulation **infrastructure** (SC-SEASON-SIM-002) | Package complete / closed |
| Season simulation **execution** (SC-SEASON-SIM-001) | **READY — NOT EXECUTED** |

## Live Airtable automations (MCP 2026-09-12)

Base `appn84sqPw03zEbTT` — **50** automations total · **48 deployed** · **2 undeployed**.

### Deployed (ON)

001, 002, 003, 007a, 010, 013, 020, 021, 022, 023, 030, 031, 032, 033, 034, 035, 041, 042, 053, 054, 055, 056, 057, 058, 059, 064, 065, 066, 067, 070a, 070b, 070c, 071, 072, 073, 074, 076, 078, 078A, 079, 101, 113, 114, 116, 117, 118, 119, 120

### Undeployed (present, OFF — confirm in Airtable UI; do not paste from docs alone)

| # | Name | Note |
|---|------|------|
| **005** | Assign Week to Submission — Homework First | MCP `deploymentStatus=undeployed`, no `deployedVersion` |
| **009** | Create Submission Assets from Submission | MCP `deploymentStatus=undeployed`, no `deployedVersion` |

Historical SC-160 Live Tested evidence for **009** remains in audits. This reconciliation **documents** current MCP state only — it does **not** authorize script edits or re-enablement.

### Legacy / absent from live base (do not restore)

| # | Disposition |
|---|-------------|
| **006** | LEGACY RETIRED — absent |
| **007** | Replaced by live **007a** |
| **008 / 012** | Deleted historically |
| **043** | Retired — absent |
| **063** | Retired — absent |
| **068** | Retired / keep OFF — absent |
| **075** | LEGACY RETIRED — absent |
| **077** | Deleted from Production — absent |
| **111** | Deleted — absent |
| **112** | Must stay OFF — absent |
| **115** | ETF — absent from this live inventory |

## Required before project close

1. **SC-SEASON-SIM-001** three-athlete season simulation **execution** + reconciliation (requires exact owner authorization phrase).  
2. Do **not** treat SC-SEASON-SIM-002 infrastructure as executed success.

## Optional / deferred (not close blockers)

- SMS / Twilio
- Additional Curriculum lessons beyond the verified 52
- Cosmetic / polish
- Orchestration / agent improvements
- Enhancements (FUT-029 deferred, FUT-048 deferred, optional AUT pastes, etc.)
- Curriculum Hub / private SEO / Homework lifecycle — **COMPLETE**; reopen only for Production defects

## Open PRs

- SC: **none** (as of this audit)
- Hub: **none** after PR **#37** merge
