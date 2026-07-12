# Controlled DEV verification prep — 070a homework upload

**Status:** **NOT READY TO RUN** — waiting on **create DEV Make scenario** (#8 Phase 0) + credentials (#9) + Airtable paste (#17)  
**Environment:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Do not run. Do not touch `recGQ8EjAMz3bEBiW`. Do **not** edit Make PROD GAME upload scenario.

---

## Gates (all required before live verify)

| # | Gate | Status |
|---|------|--------|
| G1 | Worker A publishes `worker-a-t1-070a-airtable.md` + branch/PR | **PASS** (PR #18, merged) |
| G2 | Lead reviews/merges Worker A into `overnight/lead-integration` | **PASS** (LEAD-004) |
| G3 | 070a script pasted to **DEV** Airtable (automation may stay **OFF**) | **OPEN** (#17 / MA-006) |
| G4a | **Create** Make DEV scenario `Shooting Challenge - DEV - Upload Engine - Lambda - v1` with new DEV webhook | **OPEN** (#8 Phase 0 / [create checklist](../deploy-checklists/C-013-create-dev-make-upload-scenario.md)) — Mike 2026-07-12: DEV scenario **missing**; only PROD GAME exists |
| G4b | DEV Module 2 includes `070a` + `homework_completion` (on **DEV** scenario only) | **OPEN** (part of Phase 0 create) |
| G5 | DEV credentials in ops env (#9 / MA-002); `MAKE_DEV_UPLOAD_WEBHOOK_URL` ≠ PROD webhook | **OPEN** |
| G6 | Offline integration suite green on lead tip | **PASS** (LEAD-003 + LEAD-004 post-A) |

---

## Exact steps (when gates clear)

1. Confirm lead tip includes Worker A + B + C.
2. Confirm `070a` remains **OFF** in Airtable until step 7.
3. Pick a **disposable DEV homework** Submission Asset (Schmidt/testing enrollment only). Record id: `rec________`.
4. Preflight:
   ```bash
   cd tools/airtable
   python c013_dev_h1_homework_smoke.py preflight
   python c070a_dev_smoke_run.py live-preflight --asset-id rec________
   ```
5. Make Run once / webhook:
   ```bash
   python c013_dev_make_homework_webhook_post.py rec________
   ```
6. Probe writeback fields (Upload Status, Canonical URL, Storage Key, SHA-256, Writeback Complete?, Upload Error blank).
7. Optional Airtable-triggered path: arm **Send to Make Trigger** on the DEV asset with 070a **ON** in DEV only — after webhook smoke PASS.
8. Record evidence in overnight log + worker results. Leave PROD untouched.

---

## Pass criteria

- `routeKey=homework_completion`, `automationNumber=070a`
- Upload Status **Uploaded** (or verified skip if already uploaded)
- Canonical File URL + Storage Key + File Content Hash + Algorithm SHA-256 + Uploaded At
- Upload Error blank; Writeback Complete?
- No writes to PROD; evidence record `recGQ8EjAMz3bEBiW` never reset

---

## Rollback / hold

- If any failure: leave 070a **OFF**; retain Upload Error; do not clear trigger on unverified failure (070b pattern).
- Do not promote to PROD from this overnight cycle without separate approval.
