# C-013 — Create DEV Make Upload Engine scenario (before #8 Module 2 work)

**Date:** 2026-07-12  
**Overnight:** Blocks Issue [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8) / MA-001  
**Status:** **REQUIRED GATE** — Mike confirmed 2026-07-12: there is **no** separate DEV upload scenario in Make  
**Blueprint:** [upload-asset-engine-lambda-dev-v1.template.json](../../make/blueprints/upload-asset-engine-lambda-dev-v1.template.json)  
**Parent runbook:** [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md)

---

## Confirmed inventory (Mike 2026-07-12)

| Item | Value |
|------|--------|
| **Only live upload scenario found** | `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| **Webhook label** | `C-013 PROD S3 Upload Webhook` |
| **Mike action** | **Did not edit it** (correct) |
| **Separate DEV scenario** | **Missing** — must be created before homework Module 2 work |

Historical docs that assumed `Shooting Challenge - DEV - Upload Engine - Lambda - v1` already existed are **stale** until this checklist is completed.

---

## Hard stops

1. **Do not open or edit** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`.
2. **Do not** change, re-label, or re-point the webhook labeled **`C-013 PROD S3 Upload Webhook`**.
3. **Do not** paste the PROD webhook URL into Airtable DEV, `.env` as `MAKE_DEV_*`, or any 070a input.
4. **Do not** point a new DEV scenario at PROD Airtable (`appn84sqPw03zEbTT`) or PROD Lambda.
5. Scheduling stays **OFF**; use **Run once** only until smoke PASS + approval.
6. Airtable **070a** remains **OFF**.

---

## Goal

Create a **new** Make scenario for DEV only:

**Name:** `Shooting Challenge - DEV - Upload Engine - Lambda - v1`

```text
Custom webhook (NEW — DEV only)
  → Router: 070b/video_feedback AND 070a/homework_completion
  → HTTP POST → DEV Lambda Function URL + DEV X-Upload-Secret
  → Webhook response = complete Lambda JSON (preferred for manual smoke)
```

Then store the **new** webhook URL as `MAKE_DEV_UPLOAD_WEBHOOK_URL` (local ops only).

---

## Phase 0 — Create DEV scenario (do this first)

Preferred method: **Clone structure from the repo blueprint**, not by mutating PROD.

| # | Action | Done |
|---|--------|------|
| 0.1 | In Make, create a **new** scenario (do **not** open PROD for editing). | ☐ |
| 0.2 | Name it exactly: **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`**. | ☐ |
| 0.3 | Build modules from blueprint reference (or carefully **duplicate** PROD scenario **into a new scenario**, then immediately re-point every secret/URL to **DEV** — see Phase 0a). | ☐ |
| 0.4 | Module 1: **new** Custom webhook — label it e.g. `C-013 DEV S3 Upload Webhook` (must **not** reuse PROD webhook). | ☐ |
| 0.5 | Module 2 Router — include **both** filters from day one: | ☐ |
| | • `automationNumber=070b` **AND** `routeKey=video_feedback` | |
| | • `automationNumber=070a` **AND** `routeKey=homework_completion` | |
| 0.6 | Module 3 HTTP POST → **DEV** Lambda Function URL (`127si-upload-asset-dev`) + header `X-Upload-Secret` = **DEV** secret only. | ☐ |
| 0.7 | Module 4/5: 2xx vs error; webhook response maps **complete Lambda JSON** (preferred for DEV smoke). | ☐ |
| 0.8 | Scenario variables: `LAMBDA_FUNCTION_URL_DEV`, `UPLOAD_WEBHOOK_SECRET_DEV` only — never PROD values. | ☐ |
| 0.9 | Save; scheduling **OFF**. | ☐ |
| 0.10 | Copy the **new** webhook URL to local `tools/airtable/.env` as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — **never commit**. | ☐ |
| 0.11 | Confirm PROD scenario + `C-013 PROD S3 Upload Webhook` are **unchanged**. | ☐ |

### Phase 0a — If duplicating PROD as a starting point

Only if Make “clone/copy scenario” is easier than building from the blueprint:

1. **Copy** `Shooting Challenge - GAME - Upload Engine - Lambda - v1` to a **new** scenario.
2. Immediately rename the copy to `Shooting Challenge - DEV - Upload Engine - Lambda - v1`.
3. **Create a new Custom webhook** for the copy (or detach and replace Module 1) so it does **not** share `C-013 PROD S3 Upload Webhook`.
4. Replace Lambda URL + upload secret with **DEV** values only.
5. Add homework router branch (`070a` + `homework_completion`) if missing.
6. Leave the original PROD scenario untouched (Mike already verified he did not edit it).

---

## Phase 1 — Issue #8 remainder (only after Phase 0)

| # | Action | Done |
|---|--------|------|
| 1.1 | Confirm Module 2 homework branch exists on the **DEV** scenario only. | ☐ |
| 1.2 | Confirm DEV Lambda `ALLOW_ROUTE_KEYS=video_feedback,homework_completion`. | ☐ |
| 1.3 | Run once + `python tools/airtable/c013_dev_make_homework_webhook_post.py <devHomeworkAssetId>`. | ☐ |
| 1.4 | Probe writeback `allPass=true` on DEV asset. | ☐ |
| 1.5 | Comment on #8: `RESOLVED — DEV scenario created; Module 2 homework wired; Run once ready` | ☐ |

**Do not start Phase 1 against the PROD GAME scenario.**

---

## Verify when done

- New scenario name visible in Make: `Shooting Challenge - DEV - Upload Engine - Lambda - v1`
- New webhook label distinct from `C-013 PROD S3 Upload Webhook`
- `MAKE_DEV_UPLOAD_WEBHOOK_URL` points at the **DEV** webhook only
- PROD GAME scenario unmodified
- Then continue #9 credentials / #11 live smoke / #17 Airtable paste as already queued

---

## Related

- Manual action: `docs/overnight-runs/manual-actions-2026-07-11.md` → **MA-001**
- GitHub: [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8)
- Overnight queue: `docs/overnight-runs/queue.json`
