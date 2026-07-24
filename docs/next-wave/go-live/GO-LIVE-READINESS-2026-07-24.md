# Go-live readiness — Shooting Challenge (2026-07-24)

**Integration branch:** `integration/go-live-promotion-2026-07-24`  
**Starting master:** `a8f3b001bc6ee8e6b8a2fa0dfeaaf23cc9669716`  
**Scope:** Shooting Challenge only (no Team Shot Tracker inactivity alerts)

## Ready today (verified_prod)

| Area | State |
|------|--------|
| Weekly email chain | `118→072→119→074→Make Bulk Email May 18→Gmail→writeback` |
| 072 / 074 / Make | **ON** |
| 118 / 119 schedules | **ON** (Sun 5:00 / 10:00 AM America/Denver) |
| 074 sendMode | **Live** (never fixed Test) |
| Empty-week policy | `send_short` enforced in 072 v4.0 |
| Live writeback | Sent? / Make Send Status=Sent / timestamp **PASS** |
| Schmidt enrollment | `recgP9qZYjAhE7NXm` Active |

## Installed but unproven (large bucket)

Most core intake/XP/achievement paths remain **Installed in PROD** pending Schmidt re-test after empty-base reset. See completion master §3 (“Installed but not tested”).

## Built but not installed

Learning Activities schema (SC-018/019), some Config resolver adoption, challenge-year engine (if not yet merged), Tutorials orphan cleanup tooling.

## Blocked / decision needed

| Item | Question |
|------|----------|
| 117 XOR 117c | Which automation is the sole `ZOOM_CREDIT|` XP writer? |
| 063/111 | Deleted vs Live inventory conflict — UI attest |
| Weekly Threshold XP | Implement writer or mark Not Needed? |
| 020 vs 067 HC identity | Product rule if still open |

## P0 launch blockers

1. None on weekly email path if schedules stay ON and 074 stays Live.  
2. **Do not** re-disable 118/119 based on stale docs.  
3. Broad parent email risk if non-Schmidt enrollments exist without safe filters — confirm base still controlled-test population before first Sunday.

## P1 reliability

- Automations operator table incomplete (115–119 missing from 2026-07-23 export)  
- WAS create race 031/101/118 (monitor, don’t disable 118)  
- 112 must stay OFF  
- Script version attestation drift  

## First-week monitoring

1. Sunday 5 AM: 118 run counts, WAS created/armed  
2. 072 build success / empty-week short packages  
3. Sunday 10 AM: 119 arm counts  
4. 074 webhook success; Make Live Sent? writebacks  
5. Duplicate WAS / XP Source Key spot checks  

## Rollback

| Component | Rollback |
|-----------|----------|
| 118/119 | Turn schedule OFF in Airtable UI (last resort) |
| 074 | Set sendMode=Test only for controlled Mike tests — not permanent |
| Make | Pause Bulk Email May 18 scenario |
| Bad script paste | Re-paste prior version from GitHub tag/commit |

## Intentionally deferred

- Full 146-item Schmidt re-test matrix  
- Learning Activities Airtable schema create  
- Tutorials & Assets orphan delete  
- Challenge-year rollover live execution (engine may be repo-only until authorized)
