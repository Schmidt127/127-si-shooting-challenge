# C-013 — Create DEV Make Upload Engine scenario (before #8)

**Date:** 2026-07-12  
**Overnight:** Blocks Issue [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8) / MA-001  
**Status:** **IN PROGRESS** — Mike cloned PROD; live shape is **3 modules, no Router**  
**Parent runbook:** [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md)

---

## Confirmed inventory (Mike 2026-07-12)

| Item | Value |
|------|--------|
| **PROD scenario (do not edit)** | `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| **PROD webhook label** | `C-013 PROD S3 Upload Webhook` |
| **DEV clone (current)** | `Shooting Challenge - DEV - Upload Engine - Lambda - v1 (copy)` |
| **Live module shape** | **3 modules only** — Custom webhook → HTTP POST → Webhook response (**no Router**) |

Older repo blueprints that show Routers are **not** your live scenario. Ignore “Module 2 Router” language for this clone.

---

## Hard stops

1. **Do not edit** the original PROD GAME scenario.
2. **Do not** leave the DEV clone attached to `C-013 PROD S3 Upload Webhook`.
3. **Do not** paste the PROD webhook URL into Airtable DEV / `MAKE_DEV_*`.
4. **Do not** keep PROD Lambda URL + PROD upload secret on the DEV clone.
5. Scheduling **OFF**; Airtable **070a** remains **OFF**.
6. Never commit webhook URLs or upload secrets to GitHub.

---

## Your live modules (from export)

| Make id | What it is | Status in clone |
|--------:|------------|-----------------|
| **15** | Custom webhook | **WRONG** — still labeled `C-013 PROD S3 Upload Webhook` |
| **14** | HTTP POST to Lambda | **LIKELY STILL PROD** URL + secret until you replace with DEV |
| **16** | Webhook response | **OK** — body `{{14.data}}`, status 200 |

```text
15 Custom webhook  →  14 HTTP POST Lambda  →  16 Webhook response ({{14.data}})
```

Homework vs video is decided by **Lambda** from the JSON (`routeKey` / `automationNumber` + `ALLOW_ROUTE_KEYS`).  
**You do not need a Router module.**

---

## Phase 0 — Fix the clone (do this now)

| # | Action | Done |
|---|--------|------|
| 0.1 | Keep working in the **copy**, not the PROD GAME scenario. Optional: rename to `Shooting Challenge - DEV - Upload Engine - Lambda - v1`. | ☐ |
| 0.2 | Open module **15**. Create / select a **new** Custom webhook. Label it e.g. **`C-013 DEV S3 Upload Webhook`**. | ☐ |
| 0.3 | Confirm module 15 no longer shows `C-013 PROD S3 Upload Webhook`. | ☐ |
| 0.4 | Open module **14**. Set URL = **DEV** Function URL for Lambda `127si-upload-asset-dev` (from your local ops notes). | ☐ |
| 0.5 | On module **14**, set `X-Upload-Secret` = **DEV** secret only (replace the value copied from PROD). | ☐ |
| 0.6 | Leave the JSON body mapping as-is (it already forwards `automationNumber`, `routeKey`, record ids, etc.). | ☐ |
| 0.7 | Leave module **16** as `body = {{14.data}}`, status `200`. | ☐ |
| 0.8 | Scheduling **OFF**. Save. | ☐ |
| 0.9 | Copy the **new DEV** webhook URL into local `tools/airtable/.env` as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — never commit. | ☐ |
| 0.10 | Confirm PROD GAME scenario + `C-013 PROD S3 Upload Webhook` unchanged. | ☐ |
| 0.11 | Confirm DEV Lambda env includes `ALLOW_ROUTE_KEYS=video_feedback,homework_completion`. | ☐ |

---

## Phase 1 — Smoke (only after Phase 0)

| # | Action | Done |
|---|--------|------|
| 1.1 | Run once with homework payload (`automationNumber=070a`, `routeKey=homework_completion`) on a **DEV** asset. | ☐ |
| 1.2 | Or: `python tools/airtable/c013_dev_make_homework_webhook_post.py <devHomeworkAssetId>` | ☐ |
| 1.3 | Probe writeback `allPass=true` on that DEV asset. | ☐ |
| 1.4 | On #8 comment: `RESOLVED — DEV scenario fixed; new DEV webhook; HTTP→DEV Lambda; Run once ready` | ☐ |

---

## Verify when done

- Module 15 webhook label is **DEV**, not PROD
- Module 14 points at **DEV** Lambda + **DEV** secret
- Module 16 still returns full Lambda JSON
- No Router required
- PROD GAME scenario untouched

---

## Related

- Manual action: `docs/overnight-runs/manual-actions-2026-07-11.md` → **MA-001**
- GitHub: [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8)
