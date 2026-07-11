# C-013 / C-023 — Production promotion plan

**Status:** **PROD Lambda + Make manual route PASS (2026-07-11)** · repository closeout complete · secret rotation + Airtable-triggered 070b Schmidt test pending · **070b OFF**
**Backlog:** C-013 (AWS S3 canonical URLs) · C-023 (file content hash dedup)  
**DEV base:** `appTetnuCZlCZdTCT`  
**Production base:** `appn84sqPw03zEbTT` — Lambda deployed + smoke PASS; Make scenario not built in UI  
**Make build:** [C-013-prod-make-build-2026-07-11.md](./C-013-prod-make-build-2026-07-11.md) · [070b UI verification](./C-013-prod-070b-ui-verification-2026-07-11.md) · [script paste v4.2](./C-013-prod-070b-script-paste-v4.2.txt)  
**Make deployment:** [C-013-prod-make-deployment-2026-07-11.md](./C-013-prod-make-deployment-2026-07-11.md) · [make smoke result](../audits/C-013-prod-make-smoke-result-2026-07-11.md)  
**Readiness audit:** [C-013-prod-infrastructure-readiness-2026-07-11.md](../audits/C-013-prod-infrastructure-readiness-2026-07-11.md) · [smoke test](./C-013-prod-smoke-test-2026-07-11.md)

**This document does not authorize Production deployment.** Committing this plan to GitHub records promotion steps only. **Separate explicit Mike approval** is required before any Production Airtable, Make, AWS, or secret change.

**Rule:** [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required) · Template: [`_PROMOTION-STEPS-TEMPLATE.md`](./_PROMOTION-STEPS-TEMPLATE.md)

**Parents:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) · [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) · [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) · [C-013-dev-make-lambda-scenario-prep.md](./C-013-dev-make-lambda-scenario-prep.md)

---

## 1. Purpose and scope

### Purpose

Define the **official Production promotion path** for Wave 7 asset storage after DEV proof of:

```text
Airtable 070b → Make → authenticated Lambda Function URL → S3 → Airtable canonical URL + SHA-256 hash writeback
```

### In scope (future Production session — not this close-out)

- Production schema verification (read-only first)
- Production Lambda deploy + isolated smoke
- Production Make Lambda scenario (no **Amazon S3 Upload** module)
- One controlled **070b** enable test on Production
- Post-promote `CHANGELOG.md` and backlog update

### Out of scope (explicit exclusions — see §12)

- **070a** homework route (deferred — separate H1 gate)
- Formula/view cutover to **Canonical File URL**
- Attachment clearing after upload (later approved slice)
- Web `/shoot` changes
- Bulk historical migration / backfill
- **C-023 H3** duplicate-bytes validation (remains **next DEV test** before final Production cutover decision)
- Make **Amazon S3 Upload** module (remains **parked** unless architecture reopens)

### Design note — attachments

The **proven DEV design retains Airtable Attachment** after upload. Attachment clearing is **not** part of this promotion slice.

---

## 2. Current DEV evidence

All evidence is **DEV only**. Proof artifacts are local (`_preview/`, `tools/airtable/_preview/`) — **not in GitHub**.

| Gate | Asset | Result | Date |
|------|-------|--------|------|
| SDK + hash writeback | `recBBi80bYuxXifVj` | `allPass=true` | 2026-07-08 |
| C-020 H2 harness | `recL9r4a7navUxEhg` | Lambda/SDK path proven | 2026-07-08 |
| Lambda Function URL B0–B4 | `rec9Pk14BJjFuNpf7` | HTTP 200 · `actionOut=uploaded` | 2026-07-09 |
| **C-013-SEC** rotation | DEV PAT + webhook secret | Rotated · verify PASS | 2026-07-09 |
| Make manual webhook (**070b OFF**) | `recthL2wrTha5nWHL` | `allPass=true` | 2026-07-10 |
| **070b hybrid controlled test** | **`recF86pJTIMFoEypJ`** | **`allPass=true`** end-to-end | 2026-07-09 |
| Close-out re-probe (read-only) | **`recF86pJTIMFoEypJ`** | **`allPass=true`** | 2026-07-10 |
| C-023 duplicate lookup (SDK/Lambda) | B4 + SDK assets | Flag-only PASS | 2026-07-09 |

**DEV components:** Lambda `127si-upload-asset-dev` · region `us-east-2` · bucket `shooting-challenge-assets` · Make `Shooting Challenge - DEV - Upload Engine - Lambda - v1` · **070a OFF** · **070b OFF** (post controlled test).

**Not counted as PASS:** Accidental 070b Test on `recIYFnfmsPcy7iop` (stuck **Processing** — Lambda never ran). **Do not repair** as part of promotion planning.

**Open before Production cutover:** **C-023 H3** — duplicate-bytes validation on a fresh DEV hybrid run under separate approval.

---

## 3. Production prerequisites

| # | Prerequisite | Owner | Done |
|---|--------------|-------|------|
| 1 | This promotion plan reviewed by **Mike** | Mike | [ ] |
| 2 | Phase 2 / backlog approval for Production execution | ChatGPT + Mike | [ ] |
| 3 | DEV video hybrid path proven (`recF86pJTIMFoEypJ`) | Cursor | [x] |
| 4 | **C-023 H3** completed or explicitly dispositioned for cutover | Mike | [ ] |
| 5 | GitHub source current (`lambda/upload-asset/`, **070b** v4.2, `deploy-prod.ps1`) | Cursor | [x] |
| 6 | Production schema parity (§5) | Mike / OMNI | [x] |
| 7 | Production Lambda isolated PASS (§6) — **070b OFF** | Mike / AWS | [x] |
| 8 | Production Make manual webhook PASS (§7) — **070b OFF** | Mike / Make | [x] |
| 9 | Production secrets issued (§4) — not in GitHub | Mike | [x] (rotation required before activation) |
| 10 | Rollback plan (§9) understood | Mike | [ ] |

**First Production slice:** **Video / 070b only.** **070a OFF.**

---

## 4. Secrets and credential handling

**Never commit:** Airtable PAT, `UPLOAD_WEBHOOK_SECRET`, Make webhook URLs, AWS keys, Lambda env exports, complete Function URL auth details.

| Secret | Production requirement |
|--------|------------------------|
| Airtable PAT | **New** Production token — `appn84sqPw03zEbTT` only |
| `UPLOAD_WEBHOOK_SECRET` | **New** value — never reuse DEV |
| Lambda `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` — reject DEV base |
| Make `X-Upload-Secret` | Scenario variable matching Production Lambda |
| Make webhook URL | **New** Production hook — ops notes only |
| AWS | Lambda **IAM role** only — no long-term keys in env |

**Rotation:** After any exposure, rotate immediately. Reference pattern: `tools/airtable/c013_dev_rotate_secrets.py` (DEV only — adapt for Production ops notes).

---

## 5. Production Airtable — schema and automation

**Base:** `appn84sqPw03zEbTT`

### Schema audit (read-only, pre-promote)

```powershell
cd tools/airtable
$env:BASE_ID='appn84sqPw03zEbTT'
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/prod-pre-c013-YYYYMMDD
```

### Required Submission Assets fields (C-013 / C-023)

Canonical File URL · Storage Key · File Content Hash · File Hash Algorithm (SHA-256) · File Size Bytes · File MIME Type · Uploaded At · Upload Status · Upload Error · Send to Make Trigger · Writeback Complete? · Ready to Send to Make? · Duplicate File Status · Duplicate Match Record · Airtable Attachment (retained).

### Automations (GitHub source of truth)

| Automation | State today | Promotion gate |
|------------|-------------|----------------|
| **070b** | **OFF** | Paste v4.2 script only after §8 G6 approval |
| **070a** | **OFF** | **Out of first slice** |

**No formula/view cutover** to Canonical URL in first slice.

---

## 6. Production Lambda — responsibilities and checks

| Role | Owner |
|------|--------|
| Deploy `lambda/upload-asset/` to Production function | Mike / AWS |
| Configure env (`S3_BUCKET`, `ALLOW_ROUTE_KEYS`, `AIRTABLE_BASE_ID`, `UPLOAD_WEBHOOK_SECRET`) | Mike / AWS |
| Function URL + resource policy for Make | Mike / AWS |
| Code review / GitHub tag | Cursor |

**Proposed function:** `127si-upload-asset` · `us-east-2` · handler `handler.lambda_handler`

| Check | Expected |
|-------|----------|
| Base guard rejects DEV | Yes |
| Isolated smoke (`actionOut=uploaded`) | Before **070b** enable |
| CloudWatch `/aws/lambda/127si-upload-asset` | No secrets in logs |

**Reference:** [`lambda/upload-asset/deploy-prod.ps1`](../../lambda/upload-asset/deploy-prod.ps1) · [`deploy.ps1`](../../lambda/upload-asset/deploy.ps1) (DEV) · [PROD smoke test](./C-013-prod-smoke-test-2026-07-11.md) · [DEV URL test](./C-013-dev-lambda-deploy-and-url-test.md)

---

## 7. Production Make — responsibilities and requirements

| Role | Owner |
|------|--------|
| Build Lambda scenario (no S3 module) | Mike / Make |
| Store webhook URL + `X-Upload-Secret` in ops | Mike |
| Manual webhook PASS before **070b** | Mike |
| Export redacted blueprint to `make/blueprints/` | Cursor (after Mike build) |

**Proposed name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`

**Module chain:** Webhook → Router (`070b` + `video_feedback`) → HTTP POST Lambda → 2xx router → Webhook response **200 only on Lambda success**.

**Lesson from DEV:** Webhook response must **not** return 200 if HTTP→Lambda did not succeed (see `recIYFnfmsPcy7iop` false positive).

---

## 8. Promotion sequence

Execute **in order** in a future approved session:

| Phase | Action | 070b | 070a |
|-------|--------|------|------|
| **P0** | Approve this plan + **C-023 H3** disposition | OFF | OFF |
| **P1** | Production schema read-only audit (§5) | OFF | OFF |
| **P2** | Issue Production secrets (§4) | OFF | OFF |
| **P3** | Deploy Production Lambda + isolated smoke (§6) | OFF | OFF |
| **P4** | Build Production Make scenario + manual webhook PASS (§7) | **DONE** | OFF |
| **P5** | Paste Production webhook into **070b** `makeWebhookUrl` — automation **OFF** | OFF | OFF |
| **P6** | **Mike explicit approval** for one controlled enable | — | — |
| **P7** | One controlled **070b** test asset | ON → **OFF** | OFF |
| **P8** | Probe `allPass=true` · local artifact (not committed) | OFF | OFF |
| **P9** | `CHANGELOG.md` + backlog close-out | OFF | OFF |

---

## 9. Rollback plan

| Symptom | Action |
|---------|--------|
| Wrong records processed | **070b OFF** · **070a OFF** |
| Runaway Make | Disable Production scenario |
| Lambda failure | Reserved concurrency **0** or remove URL policy |
| Secret leak | Rotate PAT + webhook secret + Make variable |
| Bad writeback | No bulk delete — safe-backfill / audit playbook |

**Order:** Automations OFF → Make OFF → revert webhook input → Lambda throttle → document incident.

Rollback does **not** auto-delete S3 objects or clear canonical fields.

---

## 10. Validation — pass / fail criteria

### Pass (match DEV `recF86pJTIMFoEypJ`)

- Upload Status = **Uploaded**
- Canonical File URL + Storage Key populated
- File Content Hash (SHA-256) + Uploaded At populated
- Upload Error blank · **Airtable Attachment retained**
- Writeback Complete? = **1**
- Probe **`allPass=true`**
- Lambda `actionOut=uploaded` in Make/CloudWatch

### Fail — stop and rollback

- Stuck **Processing** with blank canonical/hash
- `error_unauthorized` or Lambda never invoked (Make false positive)
- Wrong enrollment scope processed
- **070a** fired on homework asset

---

## 11. Production observability and post-deploy checks

| Check | Where |
|-------|--------|
| Lambda structured logs (`statusOut`, `actionOut`, `allPass`) | CloudWatch `/aws/lambda/127si-upload-asset` |
| Make module-level HTTP status + body | Make execution history |
| Airtable writeback | `_probe_c013_asset_storage_fields.py` (read-only, Production base) |
| No secrets in logs | Manual spot-check after first prod run |
| S3 object exists at Storage Key | AWS console or read-only HEAD (ops) |

**Post-deploy (first 24h):** Monitor Make error rate; confirm **070b OFF** after single-asset test; no stale **Send to Make Trigger** on Uploaded assets.

---

## 12. Hard stops, approval gates, and explicit exclusions

### Approval gates

| Gate | Rule | Who |
|------|------|-----|
| **G0** | Promotion plan in GitHub | Cursor |
| **G1** | Mike approves plan for execution | Mike |
| **G2** | **C-023 H3** resolved or dispositioned | Mike |
| **G3** | Production schema verified | Mike / OMNI |
| **G4** | Production Lambda isolated PASS | Mike |
| **G5** | Production Make manual PASS | **PASS** |
| **G6** | Explicit approval for one **070b** enable | Mike |
| **G7** | Post-test **070b OFF** + probe saved locally | Mike |
| **G8** | `CHANGELOG.md` after Production PASS | Cursor |

### Hard stops (permanent until separate approval)

- **No Production changes** from documentation-only commits
- **070a OFF** · **070b OFF** until G6
- **No secrets** in GitHub or committed artifacts
- **No** Make Amazon S3 Upload module
- **No** formula/view cutover in first slice
- **No** web deployment for C-013 in first slice
- **No** attachment clearing in first slice
- **Do not repair** `recIYFnfmsPcy7iop` as part of promotion
- **Do not mark C-013 operationally done** until secret rotation + one Airtable-triggered Schmidt test pass
- Attachment retirement/hash-dedup expansion belongs to **C-023**, not this C-013 closeout

### Responsibility matrix

| Layer | GitHub | Mike / ops |
|-------|--------|------------|
| **Lambda code** | `lambda/upload-asset/` | AWS deploy + env |
| **070b script** | `070b-…-send-video-asset-payload-to-make.js` | Airtable paste when approved |
| **Make scenario** | Redacted blueprint export | Build + webhook URL + secret variable |
| **Airtable schema** | Schema snapshots + docs | OMNI / UI field creation if gap |
| **Probes / audits** | `tools/airtable/_probe_*.py` | Run read-only verification |
| **Secrets** | `.env.example` placeholders only | PAT, webhook secret, Make vars |

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | DEV controlled hybrid PASS |
| [C-013-make-upload-migration-plan.md](./C-013-make-upload-migration-plan.md) | Legacy migration phases |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 slices |
| [v2-change-backlog.md](../v2-change-backlog.md) | C-013 / C-023 status |

---

## Close-out

- [x] Lambda + Make manual PROD route smoke PASS
- [x] Sanitized blueprint + tests + runbooks committed
- [x] `CHANGELOG.md`, `PROJECT_STATE.md`, backlog, close-out docs updated
- [ ] Rotate exposed upload secret (AWS Lambda + Make header + local env), then re-smoke
- [ ] Verify/paste 070b v4.2 and create isolation view (automation OFF)
- [ ] Mike approves one Airtable-triggered Schmidt test
- [ ] Test passes; 070b and Make left in Mike-approved final state

**Repository closeout:** complete.
**Operational C-013 definition of done:** pending the unchecked items above.
