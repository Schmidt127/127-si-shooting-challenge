# C-025 Stage 17 — PROD batch deploy report

**Date:** 2026-07-20  
**Stage 17 status:** **COMPLETE** (superseding — verification PASS; 117 / 057 / 042 ON)  
**Branch:** `feature/c025-stage17-zoom-attendance` @ `8c06b07` (+ live PROD schema beyond tip)  
**PROD:** `appn84sqPw03zEbTT`  
**Evidence:** `tools/airtable/_preview/c025_stage17_prod_batch_deploy.json`, `…_config_set.json`, `…_batch_followup.json`  
**Authoritative closeout:** [prod-live](../deploy-checklists/C-025-stage17-prod-live-2026-07-20.md)

## Safety (at batch time)

| Guard | Status |
|-------|--------|
| Automations enabled | **No** (at batch time) |
| 115 installed | **No** |
| Historical XP rewritten | **No** |
| Synthetic PROD smoke records | **Not created** at batch time (smoke fixtures authorized later) |

## Schema completed this batch

All critical ZA lookups + 10 ZA formulas + ZM preconflict rollup created/validated. Primary Config `recq14M5hEv3TIGEj` set to Stage 17 defaults. XP Bucket OK; XP Source Recording Quiz option **manual**. prefersSingle on ZA links **manual**. Automations paste **UI-only (API 403)**.

## Ready for controlled enablement? (historical — batch time)

**Not yet** at batch write time — remaining Mike UI items then: XP Source option, prefersSingle on ZA Enrollment/Zoom Meeting, bulk-link meetings to Config, paste 117/057/042 OFF, then authorize smoke fixtures.

**Superseded:** Stage 17 is now **COMPLETE** with enablement + conflict verification PASS.

## Exact next action (historical)

In Airtable UI: add XP Events → XP Source choice **`Zoom Meeting Recording Quiz`**, then bulk-link Zoom Meetings **Global Config** / **Program Config** to `recq14M5hEv3TIGEj`.
