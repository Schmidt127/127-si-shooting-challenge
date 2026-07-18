# C-025 Stage 17 — Production release packet

**Status:** **BLOCKED — SCHEMA MIGRATION REQUIRED**  
**Date:** 2026-07-18  
**DEV:** `appTetnuCZlCZdTCT` (one-click ETF **Pass** — do not treat as PROD-ready)  
**PROD:** `appn84sqPw03zEbTT` (untouched)  
**Companion:** [C-025-stage17-prod-schema-gap-analysis.md](./C-025-stage17-prod-schema-gap-analysis.md) · [C-025-stage17-prod-readiness-status.md](../status/C-025-stage17-prod-readiness-status.md)

---

## Gate summary

| Gate | State |
|------|--------|
| DEV one-click `C025_STAGE17_DOWNSTREAM` | **PASS** (`recEuHFTjBftoJGMc`, **11/22** queries, 057+042 fired, Run Test? cleared) |
| Repo / DEV 115 alignment | **Open** — commit **115 v1.8** (working tree) before packaging PROD |
| PROD Zoom Attendance table | **Missing** |
| Curated schema blockers | **125 missing** + **1 incompatible** select option |
| PROD automation paste | **Forbidden** until re-audit curated blockers = 0 |

**Do not paste 115 to PROD.** ETF remains DEV-only.

---

## Paste bodies (after schema clear)

| Automation | Version | Paste file | Initial PROD state |
|------------|---------|------------|--------------------|
| **117** Orchestrator | v1.1.1 | `C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt` | **OFF** |
| **057** Perfect Week | 1.3 | `C-025-stage17-057-perfect-week-v1.3-PASTE.txt` | **OFF** until smoke |
| **042** Level gates | 3.1 | `C-025-stage17-042-level-gates-v3.1-PASTE.txt` | **OFF** until smoke |
| **101** | unchanged | — | Stay ON / unmodified |

---

## Exact Production migration sequence

### A — Actions safe while automations remain OFF

1. **Repository backup** — Confirm feature branch committed with 117/057/042 paste bodies + **115 v1.8** (DEV align). Tag or note tip SHA.  
2. **Airtable schema export / screenshots** — Export PROD base meta (or run read-only `_c025_stage17_prod_readiness_audit.py`) before changes.  
3. **Existing PROD script backups** — UI copy current 057 / 042 / 101 script text into dated files under `docs/deploy-checklists/rollback/` (Mike).  
4. **Required table creation** — OMNI: create **Zoom Attendance**.  
5. **Required field creation** — OMNI: ZA fields/selects/formulas/lookups to match DEV; Zoom Meetings Stage 17 support (no `ZZZ` archives); Config Stage 17 recording fields; Enrollments ↔ ZA link.  
6. **Required select-option additions** — XP Events → XP Source → **`Zoom Meeting Recording Quiz`**.  
7. **Required views** — Recreate `Zoom Recording Quiz - Past Deadline` (and default Grid).  
8. **XP Reward Rule** — Confirm `ZOOM_ATTEND_BASE` = **60** active; **do not change**. Set Config **Zoom Recording XP Percent of Live = 50**.  
9. **Optional data backfill** — **Skip** for prospective go-live (default).  
10. **Read-only re-audit** — curated missing = **0** for automation blockers; formula amount **30** verified.

### B — Automation install (still OFF; Mike approval)

11. **Paste 117 v1.1.1** — OFF; map `recordId`; blank webhook unless approved.  
12. **Paste 057 v1.3** — preserve Queue?=1 trigger; OFF until smoke.  
13. **Paste 042 v3.1** — preserve view `042` / Level Recalc trigger; OFF until smoke.  
14. **Initial OFF states** — 117/057/042 OFF; 101 ON unchanged.

### C — Could generate XP or affect live athletes (Mike approval)

15. **Controlled smoke-test records** — designated test athlete + meeting only (§ Smoke).  
16. **Verification** — S0–S6 pass criteria.  
17. **Gradual enablement** — 057 → 042 → 117 with monitoring windows.  
18. **Monitoring** — Attendees unchanged; no unexpected `ZOOM_ATTEND_BASE` from recording; Source Keys unique.  
19. **Final signoff** — CHANGELOG + readiness status update + Mike signoff.

---

## Smoke-test plan (do not execute here)

Isolated PROD test athlete / enrollment + one Zoom Meeting. Automations off except the one under test.

| ID | Verify |
|----|--------|
| S0 | Schema re-audit; ZA formulas → key + amount **30** |
| S1 | Eligible recording → **one** XP Event: 30 XP, Bucket `Zoom Attendance`, Source `Zoom Meeting Recording Quiz`, Source Key `ZOOM_CREDIT|…`, correct Enrollment / Meeting (/ ZA if linked), correct XP Activity Date |
| S2 | Duplicate 117 run → **no second** event |
| S3 | Live Attendees present → live wins; recording soft-void / skipped; live XP untouched |
| S4 | Recording never writes **Attendees** |
| S5 | 057 counts recording for Perfect Week; Applied? as designed; Attendees unchanged |
| S6 | 042 counts recording for gates; Gate Applied?; Attendees unchanged |
| S7 | Soft-void incorrect test XP (`Active? = false`) — **no delete** |
| S8 | No email / Make / Softr / unrelated automation side effects |

---

## Rollback plan

| Item | Rollback |
|------|----------|
| **117** | Keep OFF or delete automation; soft-void stray `ZOOM_CREDIT|…` |
| **057 / 042** | Re-paste prior PROD script from UI backup; leave OFF if unstable |
| **New fields / table / views / select options** | Prefer **leave in place empty** over destructive delete after data exists |
| **XP Reward Rule** | Do not delete `ZOOM_ATTEND_BASE`; revert Config % only if needed |
| **Test ZA / XP** | Soft-void XP; archive/clear Applied? on test ZA |
| **Valid historical XP** | **Never delete** |

Schema that should remain even if scripts roll back: Zoom Attendance table shell + XP Source option (harmless if unused) — Mike may decide later cleanup.

---

## Stop conditions

- Curated schema blockers > 0  
- Any Attendees write from recording path  
- New live `ZOOM_ATTEND_BASE` XP from recording-only test  
- Historical live XP deleted or bulk-deactivated  
- `ZOOM_ATTEND_BASE` amount changed without approval  
- 117 enabled before smoke Pass  
- Make / Gmail / Softr used as part of this package  

---

## Mike approval checklist (do not tick until authorized)

- [ ] Commit 115 v1.8 / align DEV paste  
- [ ] Approve PROD schema migration plan  
- [ ] OMNI schema + Config 50% + XP Source option  
- [ ] Re-audit blockers = 0  
- [ ] PROD script UI backups saved  
- [ ] Paste 117/057/042 OFF  
- [ ] Smoke Pass on isolated fixture  
- [ ] Gradual enable approval  
- [ ] CHANGELOG + close-out  

---

## Safety

PROD and DEV Airtable were **not modified** by this packet authoring. No merge to `master`.
