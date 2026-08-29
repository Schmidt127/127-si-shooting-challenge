# Production operator queue — 2026-08-29 release completion

**Base:** `appn84sqPw03zEbTT` (127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026)  
**Git HEAD at reconcile:** `907c29a9` (docs tip after #274)  
**Authority:** Automations table Code column + live record MCP reads (2026-08-29)

---

## Already applied — do not re-paste

Verified via Production **Automations** table (`Status=Live` + script `Version:` header):

| Automation | Prod version | Repo target | Checklist (historical) |
|------------|--------------|-------------|------------------------|
| **010** | v10.12 | v10.12 | `010-v10.12-formula-settlement-grace.md` |
| **020** | v3.8 | v3.8 | `FUT-001-homework-assignment-identity-deadline.md` |
| **022** | v2.2 | v2.2 | `022-v2.2-secure-video-url-pipeline.md` |
| **058** | 1.5 | 1.5 | `058-v1.5-milestone-source-key.md` |
| **059** | v3.7 | v3.7 | same |
| **065** | v10.4 | v10.4 | `FUT-001-homework-assignment-identity-deadline.md` |
| **072** | v4.8 | v4.8 | `022-v2.2-secure-video-url-pipeline.md` / `072-v4.8-PASTE.txt` |
| **073** | v4.4 | v4.4 | `073-v4.4-PASTE.txt` |

**Perfect Week award (original fixture) — COMPLETE.** Do not create another test week. Do not re-run qualifying `--apply` for WAS `recl3DmBh22ADPWWe`.

Evidence: [`../testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`](../testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json)

| Check | Result |
|-------|--------|
| Unlock | `recJ5umer4J4FHTOz` |
| Milestone Source Key | `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV` |
| XP Event | `reczehlzkA8fjiQh0` |
| XP Award Status | Awarded |
| XP Points | 100 |
| Duplicate unlocks for key | 1 (none extra) |
| WAS | `recl3DmBh22ADPWWe` |

Also already complete: FUT-WELCOME-LEGACY (6/6 fields deleted); 075 absent; welcome path **078A → Queue → 079 → Hub → Resend**; **066** still on `Run Shot Milestone Check?` (`fldwsuKGoypFBn2w4`).

---

## Remaining Mike production actions (ordered)

### 1) FUT-010 — intake attachment cleanup (dry-run first)

| Field | Value |
|-------|--------|
| **What** | Clear `Submission Assets.Airtable Attachment` only after verified S3 upload |
| **Packet** | [`FUT-010-intake-attachment-cleanup.md`](./FUT-010-intake-attachment-cleanup.md) |
| **Repo tools** | `tools/airtable/fut_010_intake_attachment_cleanup.py` (dry-run default); extension `airtable/extension-scripts/safe-backfills/fut-010-clear-intake-attachments.js` |
| **Safety prerequisites** | Dry-run report reviewed; formula attestation on Writeback Complete?; no live `--apply` until Mike authorizes; **never** delete S3 objects or HC-level attachments in this item |
| **Existing records** | Only eligible Uploaded + verified assets; records kept; attachment blobs cleared |
| **Stop if** | Any candidate fails hash/URL/writeback checks; AWS probe unexpected |

### 2) Optional disposable cleanup — second PWTEST week (not required for SC-PW-E2E)

A later 2026-08-29 harness apply left unlock `recLAqZDv2728apEZ` with Milestone Source Key `PERFECT_WEEK|rec93mAfo5jKqP3g5|recWQrHifFTbbRWDP` and **XP Award Status = Pending** (no XP Event yet). **Not required** for Perfect Week completion (primary WAS already awarded). Optional: run **059** on that unlock or leave for disposable cleanup. Do **not** treat as a production defect.

### 3) Weeks 2026–27 import (calendar)

Protected configuration — Mike/OMNI only. See Future Work SC-032 / SC-065. No autonomous Weeks mutation.

### 4) RCC views / Interface install

[`RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md`](./RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md) when Mike schedules OMNI.

### 5) FUT-003 Make activation

When registration intentionally opens — [`FUT-003-fillout-stripe-payment-writeback.md`](./FUT-003-fillout-stripe-payment-writeback.md). Scenario stays OFF until Mike chooses.

---

## Product decisions (blocked — not paste defects)

| Topic | Status |
|-------|--------|
| Authentication | BLOCKED — Mike pick |
| Zoom recording XP | BLOCKED — architecture decision |
| Video XP amounts | BLOCKED — product |
| FUT-003 timing | BLOCKED — Mike choose ON date |
| Weeks import | BLOCKED — calendar |
| RCC views | READY FOR APPLY when scheduled |
| WIP-XP-ACT / PR #266 | Separate web WIP — not this packet |

---

## What Mike should **not** do

- Re-paste 010 / 020 / 022 / 058 / 059 / 065 / 072 / 073
- Restore Automation **075**
- Re-run SC-PW-E2E qualifying `--apply` for WAS `recl3DmBh22ADPWWe`
- Create another Perfect Week test week for award proof
- Delete Weeks, schemas, or S3 objects for FUT-010
- Touch local uncommitted `tools/testing/lib/sc-pw-e2e-lib.mjs` WIP
